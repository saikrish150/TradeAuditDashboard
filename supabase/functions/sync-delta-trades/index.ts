import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cryptographic decryption helper for API secrets
async function decryptText(encryptedText: string, secretKey: string): Promise<string> {
  try {
    // Basic server-side decryption logic (matching front-end encryption)
    // In production, Deno's standard Crypto Web API can be used for AES-GCM decryption
    const [ivHex, dataHex] = encryptedText.split(":");
    if (!ivHex || !dataHex) return encryptedText; // Fallback if plain

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
    return encryptedText; // Fallback to raw if encryption wasn't applied correctly
  }
}

// Generate HMAC-SHA256 signature for Delta Exchange API authentication
async function generateDeltaSignature(
  secret: string,
  method: string,
  path: string,
  query: string,
  timestamp: number,
  payload: string
): Promise<string> {
  const preHash = `${method}${timestamp}${path}${query}${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(preHash);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

    // Client connection for user identity
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

    // Admin connection for privileged database actions
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Fetch specific broker connection
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

    // Decrypt credentials
    const apiKey = await decryptText(broker.api_key_encrypted, encryptionKey);
    const apiSecret = await decryptText(broker.api_secret_encrypted, encryptionKey);

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

    // 4. Contact Delta Exchange India API — Paginated 30-day fetch
    const method = "GET";
    const basePath = "/v2/fills";
    const payload = "";
    const deltaBaseUrl = Deno.env.get("DELTA_API_URL") || "https://api.india.delta.exchange";

    // Calculate 30-day window in epoch microseconds (Delta uses microseconds)
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const startTimeMicro = thirtyDaysAgo * 1000; // Convert ms to microseconds

    let allFills: any[] = [];
    let afterCursor: string | null = null;
    let pageNum = 0;
    const MAX_PAGES = 40; // Safety limit: 40 pages × 50 = 2000 fills max

    console.log(`📡 Starting 30-day paginated fill fetch from Delta Exchange India...`);
    console.log(`📅 Time window: ${new Date(thirtyDaysAgo).toISOString()} → ${new Date(now).toISOString()}`);

    // Pagination loop
    while (pageNum < MAX_PAGES) {
      pageNum++;

      // Build query string with start_time, page_size, and optional after cursor
      let queryParams = `start_time=${startTimeMicro}&page_size=50`;
      if (afterCursor) {
        queryParams += `&after=${afterCursor}`;
      }
      const query = `?${queryParams}`;

      // Generate fresh timestamp and signature for each page request
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await generateDeltaSignature(apiSecret, method, basePath, query, timestamp, payload);

      const fetchUrl = `${deltaBaseUrl}${basePath}${query}`;
      console.log(`📄 Page ${pageNum}: ${fetchUrl}`);

      const response = await fetch(fetchUrl, {
        method,
        headers: {
          "api-key": apiKey,
          "signature": signature,
          "timestamp": timestamp.toString(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        // If first page fails, mark session as failed
        if (pageNum === 1) {
          await adminClient
            .from("broker_sync_sessions")
            .update({
              status: "FAILED",
              sync_completed_at: new Date().toISOString(),
              error_logs: JSON.stringify([{ time: new Date().toISOString(), error: `Delta API responded with ${response.status}: ${errText}` }]),
            })
            .eq("id", syncSession.id);

          return new Response(JSON.stringify({ error: `Delta API Error (${response.status}): ${errText}` }), {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // If later page fails, stop paginating but process what we have
        console.warn(`⚠️ Page ${pageNum} failed (${response.status}), stopping pagination with ${allFills.length} fills collected.`);
        break;
      }

      const resData = await response.json();
      const pageFills = resData.result || [];
      allFills = allFills.concat(pageFills);
      console.log(`✅ Page ${pageNum}: ${pageFills.length} fills (total so far: ${allFills.length})`);

      // Check for next page cursor
      const nextCursor = resData.meta?.after;
      if (!nextCursor || pageFills.length < 50) {
        // No more pages or last page was partial
        console.log(`🏁 Pagination complete: ${allFills.length} total fills across ${pageNum} pages.`);
        break;
      }
      afterCursor = nextCursor;
    }

    const fills = allFills;
    console.log(`✅ Retrieved ${fills.length} raw fills from Delta (30-day window).`);
    
    // Debug: Log the first fill's complete structure to identify field names
    if (fills.length > 0) {
      console.log(`🔍 First fill raw keys: ${Object.keys(fills[0]).join(', ')}`);
      console.log(`🔍 First fill sample:`, JSON.stringify(fills[0], null, 2));
    }

    // 5. Store immutable raw fills using ON CONFLICT logic (bulk insert)
    let imported = 0;
    let duplicates = 0;
    const errorsList = [];

    const fillsToInsert = fills.map((fill: any) => {
      // Delta India uses various field names for the trading symbol
      const symbol = fill.symbol 
        || fill.product_symbol 
        || fill.product?.symbol 
        || fill.meta_data?.product_symbol
        || fill.meta?.product_symbol
        || `PRODUCT_${fill.product_id || 'UNKNOWN'}`;
      
      const quantity = parseFloat(fill.size || fill.quantity || fill.contracts || 0);

      return {
        user_id: user.id,
        broker_id: broker.id,
        sync_session_id: syncSession.id,
        broker_fill_id: fill.id.toString(),
        broker_order_id: (fill.order_id || "").toString(),
        symbol,
        side: (fill.side || fill.buyer_role || "buy").toLowerCase(),
        quantity,
        price: parseFloat(fill.fill_price || fill.price || 0),
        fees: parseFloat(fill.fee || fill.commission || 0),
        fee_currency: fill.fee_currency || fill.settling_asset?.symbol || "USDT",
        fill_timestamp: fill.created_at || fill.timestamp || new Date().toISOString(),
        raw_payload: fill,
        normalized_status: "PENDING",
        duplicate_status: "NEW",
        reconstruction_status: "PENDING",
      };
    });

    // We do sequential/batch updates or UPSERT with counts by doing inserts in chunks
    // Supabase JS allows `upsert` with returning metadata. To calculate duplicates, we'll try to find ones that are new.
    // An elegant SQL/RPC way is to use raw insert or check existence beforehand.
    for (const record of fillsToInsert) {
      try {
        const { data, error } = await adminClient
          .from("raw_broker_fills")
          .insert(record)
          .select();

        if (error) {
          // Unique key violation code in PG is '23505'
          if (error.code === "23505") {
            duplicates++;
          } else {
            console.error("Insertion error for fill id:", record.broker_fill_id, error.message);
            errorsList.push({ fill_id: record.broker_fill_id, message: error.message });
          }
        } else if (data && data.length > 0) {
          imported++;
        }
      } catch (err) {
        errorsList.push({ fill_id: record.broker_fill_id, message: err.message });
      }
    }

    // 6. Complete session updates
    const finalSessionStatus = errorsList.length > 0 && imported === 0 ? "FAILED" : "COMPLETED";
    const { data: finalSession, error: updateError } = await adminClient
      .from("broker_sync_sessions")
      .update({
        status: finalSessionStatus,
        sync_completed_at: new Date().toISOString(),
        total_records: fills.length,
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
    console.error("Sync endpoint crash:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
