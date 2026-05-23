import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cryptographic hash for trade fingerprint
async function cryptoSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch ALL Dhan broker IDs for this user
    const { data: dhanBrokers } = await adminClient
      .from("brokers")
      .select("id")
      .eq("user_id", user.id)
      .ilike("broker_name", "%Dhan%");

    if (!dhanBrokers || dhanBrokers.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No Dhan brokers found." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dhanBrokerIds = dhanBrokers.map(b => b.id);
    console.log(`🏦 Found ${dhanBrokerIds.length} Dhan broker(s): ${dhanBrokerIds.join(', ')}`);

    // 2. Fetch all PENDING raw fills for Dhan brokers
    const { data: fills, error: fillsError } = await adminClient
      .from("raw_broker_fills")
      .select("*")
      .eq("user_id", user.id)
      .in("broker_id", dhanBrokerIds)
      .eq("reconstruction_status", "PENDING")
      .order("fill_timestamp", { ascending: true });

    if (fillsError) {
      return new Response(JSON.stringify({ error: "Failed to fetch Dhan fills: " + fillsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📊 Found ${fills?.length || 0} PENDING Dhan fills for reconstruction.`);

    if (!fills || fills.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No Dhan fills pending reconstruction." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    // 3. Group fills by securityId (most reliable for F&O) falling back to symbol
    const fillsByInstrument: Record<string, typeof fills> = {};
    for (const fill of fills) {
      // Use securityId for grouping (unique per instrument), fall back to symbol
      const groupKey = fill.raw_payload?.securityId?.toString() || fill.symbol;
      if (!fillsByInstrument[groupKey]) {
        fillsByInstrument[groupKey] = [];
      }
      fillsByInstrument[groupKey].push(fill);
    }



    // 4. Reconstruct closed positions using FIFO netting (Indian F&O — INR native, no conversion needed)
    let reconstructedCount = 0;
    const reconstructedRecords: any[] = [];

    for (const [instrumentKey, instrumentFills] of Object.entries(fillsByInstrument)) {
      const displaySymbol = (instrumentFills as any[])[0].symbol;
      let positionQty = 0;
      let runningCost = 0;
      let runningRevenue = 0;
      let totalFees = 0;
      let firstFillTime: string | null = null;
      let lastFillTime: string | null = null;
      let contractDirection: "LONG_CONTRACT" | "SHORT_CONTRACT" | null = null;
      let currentFillsList: any[] = [];
      let totalPositionVolume = 0;

      for (const fill of instrumentFills as any[]) {
        const qty = parseFloat(fill.quantity.toString());
        const price = parseFloat(fill.price.toString());
        const fee = parseFloat((fill.fees || 0).toString());
        const side = fill.side.toLowerCase();

        totalFees += fee;

        if (positionQty === 0) {
          contractDirection = side === "buy" ? "LONG_CONTRACT" : "SHORT_CONTRACT";
          firstFillTime = fill.fill_timestamp;
          totalPositionVolume = 0;
          runningCost = 0;
          runningRevenue = 0;
        }

        currentFillsList.push(fill);

        if (contractDirection === "LONG_CONTRACT") {
          if (side === "buy") {
            positionQty += qty;
            runningCost += qty * price;
            totalPositionVolume += qty;
          } else {
            positionQty -= qty;
            runningRevenue += qty * price;
          }
        } else {
          if (side === "sell") {
            positionQty += qty;
            runningCost += qty * price;
            totalPositionVolume += qty;
          } else {
            positionQty -= qty;
            runningRevenue += qty * price;
          }
        }

        // Check if position is fully closed (with floating point tolerance)
        if (Math.abs(positionQty) < 0.01) {
          positionQty = 0;
          lastFillTime = fill.fill_timestamp;

          const grossPnl = contractDirection === "LONG_CONTRACT"
            ? (runningRevenue - runningCost)
            : (runningCost - runningRevenue);
          const netPnl = grossPnl - totalFees;
          const entryPriceAvg = totalPositionVolume > 0 ? runningCost / totalPositionVolume : 0;
          const exitPriceAvg = totalPositionVolume > 0 ? runningRevenue / totalPositionVolume : 0;

          // Determine clean Market direction for Options (Call/Put) and Futures
          const symbolUpper = displaySymbol.toUpperCase();
          const optionType = (fill.raw_payload?.drvOptionType || "").toUpperCase();
          const isPut = symbolUpper.includes("PUT") || symbolUpper.includes(" PE") || symbolUpper.endsWith("PE") || optionType === "PUT" || optionType === "PE";
          
          let marketDirection: "LONG" | "SHORT" = "LONG";
          if (isPut) {
            // For Puts: standard contract LONG (Buy PE) is Bearish/SHORT, contract SHORT (Sell PE) is Bullish/LONG
            marketDirection = contractDirection === "LONG_CONTRACT" ? "SHORT" : "LONG";
          } else {
            // For Calls/Futures: standard contract LONG is Bullish/LONG, contract SHORT is Bearish/SHORT
            marketDirection = contractDirection === "LONG_CONTRACT" ? "LONG" : "SHORT";
          }

          const fingerString = `${displaySymbol}-${marketDirection}-${totalPositionVolume.toFixed(2)}-${firstFillTime}-${netPnl.toFixed(2)}`;
          const tradeHash = await cryptoSha256(fingerString);

          console.log(`✅ CLOSED POSITION: ${displaySymbol} (${isPut ? "PUT" : "CALL/FUT"}) contract=${contractDirection} direction=${marketDirection} qty=${totalPositionVolume} entry=${entryPriceAvg.toFixed(2)} exit=${exitPriceAvg.toFixed(2)} P&L=₹${netPnl.toFixed(2)}`);

          const reconstructedRecord = {
            user_id: user.id,
            broker_id: fill.broker_id,
            trade_hash: tradeHash,
            symbol: displaySymbol,
            direction: marketDirection,
            entry_price_avg: entryPriceAvg,
            exit_price_avg: exitPriceAvg,
            quantity: totalPositionVolume,
            gross_pnl: grossPnl,
            net_pnl: netPnl,
            total_fees: totalFees,
            entry_time: firstFillTime,
            exit_time: lastFillTime,
            fills_count: currentFillsList.length,
            review_status: "PENDING",
            reconstruction_metadata: {
              fill_ids: currentFillsList.map((f: any) => f.id),
              broker_fill_ids: currentFillsList.map((f: any) => f.broker_fill_id),
              generated_fingerprint: fingerString,
              currency: "INR",
              gross_pnl_inr: grossPnl,
              net_pnl_inr: netPnl,
              total_fees_inr: totalFees,
              security_id: instrumentKey,
              product_type: fill.raw_payload?.productType || "UNKNOWN",
              exchange_segment: fill.raw_payload?.exchangeSegment || "UNKNOWN",
              contract_direction: contractDirection,
              is_put_option: isPut
            },
          };

          const { data: inserted, error: insertError } = await adminClient
            .from("reconstructed_trades")
            .upsert(reconstructedRecord, { onConflict: "trade_hash" })
            .select();

          if (insertError) {
            console.error(`❌ Failed to insert reconstructed trade: ${insertError.message}`);
          } else if (inserted && inserted.length > 0) {
            reconstructedCount++;
            reconstructedRecords.push(inserted[0]);

            // Mark fills as processed
            const fillIdsToUpdate = currentFillsList.map((f: any) => f.id);
            await adminClient
              .from("raw_broker_fills")
              .update({ reconstruction_status: "RECONSTRUCTED" })
              .in("id", fillIdsToUpdate);
          }

          // Reset for next position
          positionQty = 0;
          runningCost = 0;
          runningRevenue = 0;
          totalFees = 0;
          firstFillTime = null;
          lastFillTime = null;
          contractDirection = null;
          currentFillsList = [];
          totalPositionVolume = 0;
        }
      }

      // Log unclosed positions
      if (positionQty !== 0) {
        console.warn(`⚠️ UNCLOSED POSITION: ${displaySymbol} ${contractDirection} remaining qty=${positionQty} (${currentFillsList.length} fills)`);
      }
    }

    console.log(`🎯 Reconstruction complete: ${reconstructedCount} closed trades from ${fills.length} fills.`);

    return new Response(
      JSON.stringify({
        success: true,
        count: reconstructedCount,
        trades: reconstructedRecords,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Dhan Reconstruction Engine crash:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
