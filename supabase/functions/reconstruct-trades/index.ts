import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cryptographic hash function using SHA-256 in Deno
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
    // 1. Establish Supabase Authentication
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

    // 2. Fetch all raw fills pending reconstruction
    const { data: fills, error: fillsError } = await adminClient
      .from("raw_broker_fills")
      .select("*")
      .eq("user_id", user.id)
      .eq("reconstruction_status", "PENDING")
      .order("fill_timestamp", { ascending: true });

    if (fillsError) {
      return new Response(JSON.stringify({ error: "Failed to fetch raw fills: " + fillsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fills || fills.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No fills pending reconstruction." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch live USD→INR rate for currency conversion
    let usdToInr = 92.87;
    try {
      const rateRes = await fetch("https://open.er-api.com/v6/latest/USD");
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        usdToInr = rateData.rates?.INR || 92.87;
        console.log(`💱 Live exchange rate resolved: USD/INR = ${usdToInr}`);
      }
    } catch (err) {
      console.warn("⚠️ Failed to fetch live rate, using fallback 92.87:", err.message);
    }

    // 3. Group fills by symbol
    const fillsBySymbol: Record<string, typeof fills> = {};
    for (const fill of fills) {
      if (!fillsBySymbol[fill.symbol]) {
        fillsBySymbol[fill.symbol] = [];
      }
      fillsBySymbol[fill.symbol].push(fill);
    }

    let reconstructedCount = 0;
    const reconstructedRecords = [];

    // 4. Trace fills chronologically to reconstruct positions
    for (const [symbol, symbolFills] of Object.entries(fillsBySymbol)) {
      let positionQty = 0;
      let runningCost = 0;
      let runningRevenue = 0;
      let totalFees = 0;
      let firstFillTime: string | null = null;
      let lastFillTime: string | null = null;
      let direction: "LONG" | "SHORT" | null = null;
      let currentFillsList: typeof fills = [];
      let totalPositionVolume = 0; // Cumulative quantity of entry executions
      let fillCurrency = "USD"; // Track the currency of fills for conversion decisions

      for (const fill of symbolFills) {
        // Safe timestamp parsing helper
        const parseTimestampToISO = (ts: any) => {
          if (!ts) return new Date().toISOString();
          const strTs = String(ts);
          if (/^\d{16}$/.test(strTs)) {
            return new Date(parseInt(strTs, 10) / 1000).toISOString();
          }
          const parsed = new Date(ts);
          return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
        };

        // Check for gap (e.g. > 60 hours) to auto-close previous position
        if (positionQty !== 0 && firstFillTime) {
          const lastTime = lastFillTime || firstFillTime;
          const currentTs = new Date(parseTimestampToISO(fill.fill_timestamp)).getTime();
          const prevTs = new Date(parseTimestampToISO(lastTime)).getTime();
          
          if (currentTs - prevTs > 60 * 60 * 60 * 1000) {
            console.warn(`⚠️ Gap > 60h detected for ${symbol}. Auto-closing open position of ${positionQty} units.`);
            
            const lastFill = currentFillsList[currentFillsList.length - 1];
            const mockQty = Math.abs(positionQty);
            const mockPrice = parseFloat(lastFill.price.toString());
            
            runningRevenue += mockQty * mockPrice;
            lastFillTime = parseTimestampToISO(lastTime);
            
            const firstFill = currentFillsList[0];
            const contractVal = parseFloat(
              firstFill.raw_payload?.product?.contract_value || 
              firstFill.raw_payload?.meta_data?.product?.contract_value || 
              firstFill.raw_payload?.meta?.product?.contract_value || 
              "1"
            );

            const grossPnlUsd = (direction === "LONG"
              ? (runningRevenue - runningCost)
              : (runningCost - runningRevenue)) * contractVal;
            const netPnlUsd = grossPnlUsd - totalFees;
            
            const isMockInrNative = (fill.fee_currency || "USD").toUpperCase() === "INR";
            const grossPnl = isMockInrNative ? grossPnlUsd : grossPnlUsd * usdToInr;
            const netPnl = isMockInrNative ? netPnlUsd : netPnlUsd * usdToInr;
            const totalFeesInr = isMockInrNative ? totalFees : totalFees * usdToInr;
            const entryPriceAvg = runningCost / totalPositionVolume;
            const exitPriceAvg = runningRevenue / totalPositionVolume;

            const fingerString = `${symbol}-${direction}-${totalPositionVolume.toFixed(6)}-${firstFillTime}-${netPnlUsd.toFixed(4)}`;
            const tradeHash = await cryptoSha256(fingerString);

            const reconstructedRecord = {
              user_id: user.id,
              broker_id: lastFill.broker_id,
              trade_hash: tradeHash,
              symbol,
              direction,
              entry_price_avg: entryPriceAvg,
              exit_price_avg: exitPriceAvg,
              quantity: totalPositionVolume,
              gross_pnl: grossPnl,
              net_pnl: netPnl,
              total_fees: totalFeesInr,
              entry_time: firstFillTime,
              exit_time: lastFillTime,
              fills_count: currentFillsList.length,
              review_status: "PENDING",
              reconstruction_metadata: {
                fill_ids: currentFillsList.map((f) => f.id),
                broker_fill_ids: currentFillsList.map((f) => f.broker_fill_id),
                generated_fingerprint: fingerString,
                auto_closed: true,
                usd_gross_pnl: grossPnlUsd,
                usd_net_pnl: netPnlUsd,
                usd_total_fees: totalFees,
                conversion_rate: usdToInr
              }
            };

            const { data: inserted, error: insertError } = await adminClient
              .from("reconstructed_trades")
              .upsert(reconstructedRecord, { onConflict: "trade_hash" })
              .select();

            if (!insertError && inserted && inserted.length > 0) {
              reconstructedCount++;
              reconstructedRecords.push(inserted[0]);

              const fillIdsToUpdate = currentFillsList.map((f) => f.id);
              await adminClient
                .from("raw_broker_fills")
                .update({ reconstruction_status: "RECONSTRUCTED" })
                .in("id", fillIdsToUpdate);
            }
            
            // Reset tracking variables
            positionQty = 0;
            runningCost = 0;
            runningRevenue = 0;
            totalFees = 0;
            firstFillTime = null;
            lastFillTime = null;
            direction = null;
            currentFillsList = [];
            totalPositionVolume = 0;
            fillCurrency = "USD";
          }
        }

        const qty = parseFloat(fill.quantity.toString());
        const price = parseFloat(fill.price.toString());
        const fee = parseFloat((fill.fees || 0).toString());
        const side = fill.side.toLowerCase();

        totalFees += fee;

        if (positionQty === 0) {
          // New position starting
          direction = side === "buy" ? "LONG" : "SHORT";
          firstFillTime = fill.fill_timestamp;
          totalPositionVolume = 0;
          runningCost = 0;
          runningRevenue = 0;
        }

        currentFillsList.push(fill);
        fillCurrency = fill.fee_currency || "USD"; // Capture actual fill currency

        if (direction === "LONG") {
          if (side === "buy") {
            positionQty += qty;
            runningCost += qty * price;
            totalPositionVolume += qty;
          } else {
            positionQty -= qty;
            runningRevenue += qty * price;
          }
        } else { // SHORT
          if (side === "sell") {
            positionQty += qty;
            runningCost += qty * price;
            totalPositionVolume += qty;
          } else {
            positionQty -= qty;
            runningRevenue += qty * price;
          }
        }

        // Floating point buffer correction (near zero)
        if (Math.abs(positionQty) < 0.000001) {
          positionQty = 0;
          lastFillTime = fill.fill_timestamp;

          // Detect contract value multiplier from the first fill of this position
          const firstFill = currentFillsList[0];
          const contractVal = parseFloat(
            firstFill.raw_payload?.product?.contract_value || 
            firstFill.raw_payload?.meta_data?.product?.contract_value || 
            firstFill.raw_payload?.meta?.product?.contract_value || 
            "1"
          );

          // Position is now fully closed - Compile the Reconstructed Trade (with scaled multiplier)
          const grossPnlUsd = (direction === "LONG" 
            ? (runningRevenue - runningCost)
            : (runningCost - runningRevenue)) * contractVal;
          const netPnlUsd = grossPnlUsd - totalFees;
          const entryPriceAvg = runningCost / totalPositionVolume;
          const exitPriceAvg = runningRevenue / totalPositionVolume;

          // Detect if fills are in INR (Dhan) or USD (Delta) — skip conversion for INR-native fills
          const isInrNative = fillCurrency.toUpperCase() === "INR";

          // Convert USD values to INR (only for USD-native brokers like Delta)
          const grossPnl = isInrNative ? grossPnlUsd : grossPnlUsd * usdToInr;
          const netPnl = isInrNative ? netPnlUsd : netPnlUsd * usdToInr;
          const totalFeesInr = isInrNative ? totalFees : totalFees * usdToInr;

          // Fingerprint hash mapping: symbol-direction-quantity-entryTime-netPnlUsd
          const fingerString = `${symbol}-${direction}-${totalPositionVolume.toFixed(6)}-${firstFillTime}-${netPnlUsd.toFixed(4)}`;
          const tradeHash = await cryptoSha256(fingerString);

          const reconstructedRecord = {
            user_id: user.id,
            broker_id: fill.broker_id,
            trade_hash: tradeHash,
            symbol,
            direction,
            entry_price_avg: entryPriceAvg,
            exit_price_avg: exitPriceAvg,
            quantity: totalPositionVolume,
            gross_pnl: grossPnl,
            net_pnl: netPnl,
            total_fees: totalFeesInr,
            entry_time: firstFillTime,
            exit_time: lastFillTime,
            fills_count: currentFillsList.length,
            review_status: "PENDING",
            reconstruction_metadata: {
              fill_ids: currentFillsList.map((f) => f.id),
              broker_fill_ids: currentFillsList.map((f) => f.broker_fill_id),
              generated_fingerprint: fingerString,
              usd_gross_pnl: grossPnlUsd,
              usd_net_pnl: netPnlUsd,
              usd_total_fees: totalFees,
              conversion_rate: usdToInr
            },
          };

          // Save reconstructed trade
          const { data: inserted, error: insertError } = await adminClient
            .from("reconstructed_trades")
            .upsert(reconstructedRecord, { onConflict: "trade_hash" })
            .select();

          if (insertError) {
            console.error("Failed to insert reconstructed trade:", insertError.message);
          } else if (inserted && inserted.length > 0) {
            reconstructedCount++;
            reconstructedRecords.push(inserted[0]);

            // Mark these fills as processed in database
            const fillIdsToUpdate = currentFillsList.map((f) => f.id);
            await adminClient
              .from("raw_broker_fills")
              .update({ reconstruction_status: "RECONSTRUCTED" })
              .in("id", fillIdsToUpdate);
          }

          // Reset position tracking for next loops
          positionQty = 0;
          runningCost = 0;
          runningRevenue = 0;
          totalFees = 0;
          firstFillTime = null;
          lastFillTime = null;
          direction = null;
          currentFillsList = [];
          totalPositionVolume = 0;
          fillCurrency = "USD";
        }
      }
    }

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
    console.error("Reconstruction Engine crash:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
