import { supabase } from '../../lib/supabase';
import { DB_FIELDS } from '../../constants/fieldMappings';
import { encryptCredential } from './deltaService';
import { runTradeReconstruction } from './tradeReconstructionService';

/**
 * Connects or updates a broker credential safely by encrypting keys in-browser.
 * For Dhan: apiKey = access token, apiSecret = '' (unused), clientId = Dhan Client ID.
 * For Delta: apiKey = API Key, apiSecret = API Secret, clientId = null.
 */
export async function connectBroker(userId, brokerName, apiKey, apiSecret = '', clientId = null) {
  if (!userId || !brokerName || !apiKey) {
    throw new Error('User ID, broker name, and API key/token are required.');
  }

  // Retrieve client encryption key from environment (fallback if not loaded yet)
  const encryptionKey = import.meta.env.VITE_GEMINI_API_KEY || 'default_dev_key_antigravity_33';
  
  const encryptedKey = await encryptCredential(apiKey, encryptionKey);
  const encryptedSecret = apiSecret ? await encryptCredential(apiSecret, encryptionKey) : '';

  // Check if connection already exists to do a patch update
  const { data: existing, error: checkErr } = await supabase
    .from('brokers')
    .select('id')
    .eq('user_id', userId)
    .eq('broker_name', brokerName);

  if (checkErr) throw checkErr;

  const payload = {
    api_key_encrypted: encryptedKey,
    api_secret_encrypted: encryptedSecret,
    status: 'ACTIVE'
  };
  // Save Dhan Client ID permanently when provided
  if (clientId) {
    payload.client_id = clientId;
  }

  if (existing && existing.length > 0) {
    // Update existing connection credentials
    const { data, error } = await supabase
      .from('brokers')
      .update(payload)
      .eq('id', existing[0].id)
      .select();

    if (error) throw error;
    return data[0];
  } else {
    // Insert new connection record
    const { data, error } = await supabase
      .from('brokers')
      .insert({
        user_id: userId,
        broker_name: brokerName,
        ...payload
      })
      .select();

    if (error) throw error;
    return data[0];
  }
}

/**
 * Fetches all registered brokers for a user.
 */
export async function fetchUserBrokers(userId) {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

/**
 * Triggers the entire sequential sync pipeline:
 * 1. Sync raw fills from exchange.
 * 2. Run reconstruction engine (net fills into trades).
 * 3. Flag exact/potential duplicates.
 */
export async function triggerFullBrokerSync(userId, brokerId, brokerName = '') {
  if (!userId || !brokerId) throw new Error('Missing parameter identities.');

  console.log(`🚀 Initiating full sync pipeline for broker: ${brokerId} (${brokerName})`);

  // Determine which Edge Function to call based on broker name
  const isDhan = brokerName.includes('Dhan');
  const edgeFunctionName = isDhan ? 'sync-dhan-trades' : 'sync-delta-trades';

  // Step A: Fetch fills from broker API (direct fetch to Edge Function)
  let syncResult;
  try {
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse.data?.session;
    const token = session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log(`🔄 Syncing via ${edgeFunctionName}: session token status =`, token ? 'FOUND (Ready)' : 'NOT FOUND (Anonymous)');
    console.log('🔑 Using apikey prefix:', anonKey?.substring(0, 16) + '...');

    const response = await fetch(`${supabaseUrl}/functions/v1/${edgeFunctionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey
      },
      body: JSON.stringify({ broker_id: brokerId })
    });

    const responseBody = await response.text();
    console.log(`📡 ${edgeFunctionName} response: ${response.status}`, responseBody);

    if (!response.ok) {
      // Parse for TOKEN_EXPIRED error from Dhan
      let parsed;
      try { parsed = JSON.parse(responseBody); } catch { parsed = { error: responseBody }; }
      if (parsed.error === 'TOKEN_EXPIRED') {
        throw new Error('TOKEN_EXPIRED: ' + (parsed.message || 'Your Dhan access token has expired.'));
      }
      throw new Error(`Edge Function returned ${response.status}: ${responseBody}`);
    }
    syncResult = JSON.parse(responseBody);
  } catch (err) {
    console.warn(`⚠️ ${edgeFunctionName} Edge function failed/not-deployed:`, err.message);
    syncResult = { success: false, error: err.message };
    // Re-throw TOKEN_EXPIRED so the UI can catch it
    if (err.message.includes('TOKEN_EXPIRED')) throw err;
  }

  // Step B: Run trade reconstruction (routes to broker-specific Edge Function)
  const reconResult = await runTradeReconstruction(userId, brokerName);

  // Step C: Scan duplicates (Bypassed & disabled per design request to save database resources)
  const duplicateResult = { success: true, exact_duplicates: 0, potential_duplicates: 0 };

  return {
    syncResult,
    reconResult,
    duplicateResult,
    success: true
  };
}

/**
 * Approves a reconstructed trade: Maps and inserts it directly into the primary 'trades' table.
 */
export async function approveReconstructedTrade(userId, rTrade) {
  if (!userId || !rTrade) throw new Error('Missing parameters.');

  const isWin = parseFloat(rTrade.net_pnl) >= 0;

  // Match incoming broker symbol against standard market option keywords
  // Ordered by longest/most specific match to prevent false positives (e.g. matching 'BANKNIFTY' to 'NIFTY')
  const marketOptions = ['BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'NIFTY', 'BTC', 'ETH', 'GOLD'];
  const rawSymbol = String(rTrade.symbol).toUpperCase();
  let matchedMarket = rawSymbol;
  
  // Dynamic mapping: PAX Gold (PAXG) maps directly to GOLD
  if (rawSymbol.includes('PAXG')) {
    matchedMarket = 'GOLD';
  } else {
    for (const option of marketOptions) {
      if (rawSymbol.includes(option)) {
        matchedMarket = option;
        break;
      }
    }
  }

  // Compile trade schema using literal-notion headers from DB_FIELDS
  const tradePayload = {
    user_id: userId,
    [DB_FIELDS.date]: new Date(rTrade.entry_time).toISOString(),
    [DB_FIELDS.market]: matchedMarket,
    [DB_FIELDS.isWin]: isWin ? 'WIN' : 'LOSS',
    [DB_FIELDS.winFlag]: isWin ? 1 : 0,
    [DB_FIELDS.pl]: parseFloat(rTrade.net_pnl),
    [DB_FIELDS.rr]: null, // Default to null for manual review grading
    [DB_FIELDS.reason]: null, // Default to null for manual review grading
    [DB_FIELDS.learning]: null, // Default to null for manual review grading
    [DB_FIELDS.strategy]: null, // Default to null for manual review grading
    [DB_FIELDS.setups]: null, // Default to null for manual review grading
    [DB_FIELDS.lossReason]: null, // Default to null for manual review grading
    [DB_FIELDS.emotions]: null, // Default to null for manual review grading
    [DB_FIELDS.positionSize]: parseFloat(rTrade.quantity),
    [DB_FIELDS.tradeQuality]: null, // Default to null for manual review grading
    [DB_FIELDS.tradeStatus]: null, // Default to null for manual review grading
    [DB_FIELDS.positionType]: null, // Default to null for manual review grading
    [DB_FIELDS.direction]: String(rTrade.direction),
    [DB_FIELDS.tradeMode]: 'Buying',
    trade_source: 'BROKER',
    broker_id: rTrade.broker_id,
    linked_reconstructed_trade_id: rTrade.id,
    trade_hash: rTrade.trade_hash,
    import_batch_id: crypto.randomUUID(),
    fees: parseFloat(rTrade.total_fees || 0),
    entry_price: parseFloat(rTrade.entry_price_avg || 0),
    exit_price: parseFloat(rTrade.exit_price_avg || 0)
  };

  // Insert into trades table
  const { data: newTrade, error: insertError } = await supabase
    .from('trades')
    .insert(tradePayload)
    .select();

  if (insertError) throw insertError;

  // Update status on reconstructed trade buffer
  const { error: updateError } = await supabase
    .from('reconstructed_trades')
    .update({ review_status: 'APPROVED' })
    .eq('id', rTrade.id);

  if (updateError) console.error('Failed to update reconstructed trade review status:', updateError.message);

  return newTrade ? newTrade[0] : null;
}

/**
 * Rejects a reconstructed trade: marks review_status as REJECTED to archive it.
 */
export async function rejectReconstructedTrade(rTradeId) {
  const { data, error } = await supabase
    .from('reconstructed_trades')
    .update({ review_status: 'REJECTED' })
    .eq('id', rTradeId)
    .select();

  if (error) throw error;
  return data;
}


