import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cryptographic decryption helper (same as sync-delta-trades)
async function decryptText(encryptedText: string, secretKey: string): Promise<string> {
  try {
    const [ivHex, dataHex] = encryptedText.split(":");
    if (!ivHex || !dataHex) return encryptedText;

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const encryptedData = new Uint8Array(dataHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

    const rawKey = new TextEncoder().encode(secretKey.padEnd(32, "0").substring(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Decryption failed, treating as plaintext fallback:", err.message);
    return encryptedText;
  }
}

// Format date as YYYY-MM-DD for Dhan API
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
    const encryptionKey = Deno.env.get("BROKER_ENCRYPTION_KEY") || "default_dev_key_antigravity_33";

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

    // 2. Fetch Dhan broker connection
    const { broker_id } = await req.json();
    if (!broker_id) {
      return new Response(JSON.stringify({ error: "broker_id parameter required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: broker, error: brokerError } = await adminClient
      .from("brokers")
      .select("*")
      .eq("id", broker_id)
      .eq("user_id", user.id)
      .single();

    if (brokerError || !broker) {
      return new Response(JSON.stringify({ error: "Broker connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt access token (stored in api_key_encrypted for Dhan)
    const accessToken = await decryptText(broker.api_key_encrypted, encryptionKey);
    const dhanClientId = broker.client_id;

    if (!accessToken || !dhanClientId) {
      return new Response(JSON.stringify({ error: "Dhan credentials incomplete. Please reconnect with Client ID and Access Token." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Initialize Sync Session
    const { data: syncSession, error: sessionError } = await adminClient
      .from("broker_sync_sessions")
      .insert({
        user_id: user.id,
        broker_id: broker.id,
        status: "RUNNING",
        total_records: 0,
        imported_records: 0,
        duplicate_records: 0,
        failed_records: 0,
      })
      .select()
      .single();

    if (sessionError) {
      return new Response(JSON.stringify({ error: "Failed to initialize sync session: " + sessionError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Contact DhanHQ API — Fetch today's trades + paginated 7-day history
    const dhanBaseUrl = "https://api.dhan.co";
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const fromDate = formatDate(sevenDaysAgo);
    const toDate = formatDate(now);

    let allTrades: any[] = [];

    // 4A. Fetch TODAY's trade book (GET /v2/trades — current day only)
    console.log(`📡 Fetching today's trade book from Dhan...`);
    try {
      const todayResponse = await fetch(`${dhanBaseUrl}/v2/trades`, {
        method: "GET",
        headers: {
          "access-token": accessToken,
          "Accept": "application/json",
        },
      });

      if (todayResponse.status === 401 || todayResponse.status === 403) {
        const errText = await todayResponse.text();
        console.error(`🔒 Dhan token expired or invalid: ${todayResponse.status}`);
        await adminClient
          .from("broker_sync_sessions")
          .update({
            status: "FAILED",
            sync_completed_at: new Date().toISOString(),
            error_logs: JSON.stringify([{ time: new Date().toISOString(), error: `TOKEN_EXPIRED: ${errText}` }]),
          })
          .eq("id", syncSession.id);

        return new Response(JSON.stringify({ 
          error: "TOKEN_EXPIRED", 
          message: "Your Dhan access token has expired. Please paste a fresh token from web.dhan.co → My Profile → DhanHQ Trading APIs." 
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (todayResponse.ok) {
        const todayTrades = await todayResponse.json();
        if (Array.isArray(todayTrades) && todayTrades.length > 0) {
          allTrades = allTrades.concat(todayTrades);
          console.log(`✅ Today's trade book: ${todayTrades.length} trades fetched.`);
        } else {
          console.log(`📭 Today's trade book: 0 trades (market closed or no trades today).`);
        }
      } else {
        console.warn(`⚠️ Today's trade book fetch failed (${todayResponse.status}), continuing with history...`);
      }
    } catch (todayErr) {
      console.warn(`⚠️ Today's trade book fetch error: ${todayErr.message}, continuing with history...`);
    }

    // 4B. Fetch 30-day historical trades (paginated)
    let pageNum = 0;
    const MAX_PAGES = 5;

    console.log(`📡 Starting 7-day Dhan F&O trade history fetch...`);
    console.log(`📅 Time window: ${fromDate} → ${toDate}`);

    while (pageNum < MAX_PAGES) {
      const fetchUrl = `${dhanBaseUrl}/v2/trades/${fromDate}/${toDate}/${pageNum}`;
      console.log(`📄 Page ${pageNum}: ${fetchUrl}`);

      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: {
          "access-token": accessToken,
          "Accept": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        // Already handled above for today's fetch; if we reach here, token expired mid-pagination
        console.error(`🔒 Token expired during history pagination.`);
        break;
      }

      if (!response.ok) {
        const errText = await response.text();
        if (pageNum === 0 && allTrades.length === 0) {
          await adminClient
            .from("broker_sync_sessions")
            .update({
              status: "FAILED",
              sync_completed_at: new Date().toISOString(),
              error_logs: JSON.stringify([{ time: new Date().toISOString(), error: `Dhan API responded with ${response.status}: ${errText}` }]),
            })
            .eq("id", syncSession.id);

          return new Response(JSON.stringify({ error: `Dhan API Error (${response.status}): ${errText}` }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.warn(`⚠️ Page ${pageNum} failed (${response.status}), stopping pagination with ${allTrades.length} trades collected.`);
        break;
      }

      const pageTrades = await response.json();
      
      if (!Array.isArray(pageTrades) || pageTrades.length === 0) {
        console.log(`🏁 Pagination complete at page ${pageNum}: no more trades.`);
        break;
      }

      allTrades = allTrades.concat(pageTrades);
      console.log(`✅ Page ${pageNum}: ${pageTrades.length} trades (total so far: ${allTrades.length})`);

      pageNum++;
    }

    console.log(`✅ Retrieved ${allTrades.length} total trades from Dhan (today + 7-day history).`);

    // In-memory deduplication: Dhan's Today's Trade Book endpoint returns exchangeTradeId = "0",
    // while the Historical endpoint returns the real exchangeTradeId. If we fetch both in the same run, we get duplicates.
    const cleanTradesMap = new Map<string, any>();
    for (const trade of allTrades) {
      const orderId = trade.orderId || "";
      const price = parseFloat(trade.tradedPrice || 0);
      const qty = parseFloat(trade.tradedQuantity || 0);
      const side = (trade.transactionType || "BUY").toUpperCase();
      const exchangeTradeId = trade.exchangeTradeId || "0";
      
      const key = `${orderId}_${price}_${qty}_${side}`;
      const existing = cleanTradesMap.get(key);
      if (existing) {
        const existingId = existing.exchangeTradeId || "0";
        if (existingId === "0" && exchangeTradeId !== "0") {
          cleanTradesMap.set(key, trade);
        }
      } else {
        cleanTradesMap.set(key, trade);
      }
    }
    const deduplicatedTrades = Array.from(cleanTradesMap.values());
    console.log(`🧹 In-memory deduplication: Reduced trades from ${allTrades.length} to ${deduplicatedTrades.length}`);



    // 5. Map Dhan trades → raw_broker_fills schema (SEPARATE Indian mapping)
    let imported = 0;
    let duplicates = 0;
    const errorsList: any[] = [];

    const fillsToInsert = deduplicatedTrades.map((trade: any) => {
      // Dhan-specific symbol extraction
      const symbol = trade.tradingSymbol || trade.customSymbol || `SECURITY_${trade.securityId || 'UNKNOWN'}`;

      // ALWAYS calculate fees using high-fidelity Indian regulatory rates for consistency and accuracy.
      // (Dhan's Today's Trade Book omits STT, and their historical API returns null/0 breakdown fields).
      const qty = parseFloat(trade.tradedQuantity || 0);
      const price = parseFloat(trade.tradedPrice || 0);
      const premiumValue = qty * price; // Total premium value
      const side = (trade.transactionType || "BUY").toUpperCase();
      const instrument = trade.raw_payload?.instrument || trade.instrument || "";
      const isOption = instrument.includes("OPT") || 
                       symbol.includes("CALL") || 
                       symbol.includes("PUT") || 
                       trade.drvOptionType || 
                       symbol.endsWith("PE") || 
                       symbol.endsWith("CE") ||
                       symbol.includes("-PE") ||
                       symbol.includes("-CE");

      // Indian F&O Charges (2026 rates):
      // 1. Brokerage: Dhan charges flat ₹20 per executed order (approximated here per fill)
      const brokerage = 20;

      // 2. STT: 0.125% on sell-side premium for options, 0.02% or 0.05% on sell-side for futures
      let stt = 0;
      if (side === "SELL") {
        stt = isOption ? premiumValue * 0.00125 : premiumValue * 0.0002;
      }

      // 3. Exchange Transaction Charges: ~0.0355% on premium (both sides)
      const exchangeCharges = premiumValue * 0.000355;

      // 4. SEBI Turnover Fee: ₹10 per crore (0.0001%)
      const sebiCharges = premiumValue * 0.000001;

      // 5. Stamp Duty: 0.003% on buy-side for options
      let stampDuty = 0;
      if (side === "BUY") {
        stampDuty = premiumValue * 0.00003;
      }

      // 6. GST: 18% on (Brokerage + Exchange Charges + SEBI Charges)
      const gst = (brokerage + exchangeCharges + sebiCharges) * 0.18;

      let totalFees = brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst;
      totalFees = Math.round(totalFees * 100) / 100; // Round to 2 decimal places

      console.log(`💰 Calculated fees for ${symbol} ${side} qty=${qty} price=${price}: ₹${totalFees.toFixed(2)} (STT=₹${stt.toFixed(2)}, Brkg=₹${brokerage}, Exch=₹${exchangeCharges.toFixed(2)}, GST=₹${gst.toFixed(2)})`);

      // Parse Dhan exchangeTime format: "YYYY-MM-DD HH:mm:ss"
      let fillTimestamp = trade.exchangeTime;
      if (fillTimestamp && fillTimestamp !== "NA") {
        // Convert to ISO format
        fillTimestamp = new Date(fillTimestamp.replace(" ", "T") + "+05:30").toISOString();
      } else {
        fillTimestamp = new Date().toISOString();
      }

      // Compound unique ID: exchangeTradeId alone is NOT unique for Dhan (partial fills share it)
      const uniqueFillId = `${trade.exchangeTradeId || 'NA'}_${trade.orderId || 'NA'}_${trade.transactionType || 'NA'}_${trade.tradedPrice || 0}_${trade.tradedQuantity || 0}`;

      return {
        user_id: user.id,
        broker_id: broker.id,
        sync_session_id: syncSession.id,
        broker_fill_id: uniqueFillId,
        broker_order_id: (trade.orderId || "").toString(),
        symbol,
        side: (trade.transactionType || "BUY").toLowerCase(),
        quantity: parseFloat(trade.tradedQuantity || 0),
        price: parseFloat(trade.tradedPrice || 0),
        fees: totalFees,
        fee_currency: "INR",
        fill_timestamp: fillTimestamp,
        raw_payload: trade,
        normalized_status: "PENDING",
        duplicate_status: "NEW",
        reconstruction_status: "PENDING",
      };
    });

    // 6. BATCH insert fills into raw_broker_fills (optimized: single DB call instead of N sequential calls)
    console.log(`⚡ Batch inserting ${fillsToInsert.length} fills...`);
    
    // 6A. Bulk insert — skip duplicates on conflict
    const BATCH_SIZE = 50;
    for (let i = 0; i < fillsToInsert.length; i += BATCH_SIZE) {
      const batch = fillsToInsert.slice(i, i + BATCH_SIZE);
      
      const { data: insertedBatch, error: batchError } = await adminClient
        .from("raw_broker_fills")
        .insert(batch)
        .select("id");

      if (batchError) {
        if (batchError.code === "23505") {
          // Batch had duplicates — fall back to individual inserts for this batch only
          for (const record of batch) {
            const { data, error } = await adminClient
              .from("raw_broker_fills")
              .insert(record)
              .select("id");

            if (error) {
              if (error.code === "23505") {
                duplicates++;
              } else {
                errorsList.push({ fill_id: record.broker_fill_id, message: error.message });
              }
            } else if (data && data.length > 0) {
              imported++;
            }
          }
        } else {
          console.error("Batch insert error:", batchError.message);
          errorsList.push({ batch_start: i, message: batchError.message });
        }
      } else {
        imported += insertedBatch?.length || batch.length;
      }
    }

    console.log(`✅ Insert complete: ${imported} new, ${duplicates} duplicates, ${errorsList.length} errors`);

    // 6C. Database-level promotion of temporary "0_" fills to real exchange fills
    console.log(`🧹 Running database promotion function to clean up any temporary "0_" fills...`);
    const { error: promoError } = await adminClient.rpc("promote_dhan_fills");
    if (promoError) {
      console.error(`❌ promote_dhan_fills RPC failed: ${promoError.message}`);
    } else {
      console.log(`✨ promote_dhan_fills RPC completed successfully.`);
    }

    // 7. Complete session
    const finalSessionStatus = errorsList.length > 0 && imported === 0 ? "FAILED" : "COMPLETED";
    const { data: finalSession } = await adminClient
      .from("broker_sync_sessions")
      .update({
        status: finalSessionStatus,
        sync_completed_at: new Date().toISOString(),
        total_records: allTrades.length,
        imported_records: imported,
        duplicate_records: duplicates,
        failed_records: errorsList.length,
        error_logs: JSON.stringify(errorsList),
      })
      .eq("id", syncSession.id)
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        session: finalSession,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Dhan sync endpoint crash:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
