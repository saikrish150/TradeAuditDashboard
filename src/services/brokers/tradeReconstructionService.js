import { supabase } from '../../lib/supabase';
import { exchangeRateService } from '../exchangeRateService';

/**
 * Triggers position reconstruction by invoking the correct Edge Function.
 * Routes to reconstruct-dhan-trades for Indian brokers, reconstruct-trades for crypto.
 * Falls back to in-browser FIFO reconstruction if the Edge Function fails.
 */
export async function runTradeReconstruction(userId, brokerName = '') {
  const isDhan = brokerName.includes('Dhan');
  const functionName = isDhan ? 'reconstruct-dhan-trades' : 'reconstruct-trades';

  try {
    console.log(`🔄 Invoking edge function ${functionName}...`);
    const session = (await supabase.auth.getSession()).data?.session;
    const token = session?.access_token;

    const { data, error } = await supabase.functions.invoke(functionName, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined
      }
    });
    
    if (error) throw error;
    return data;
  } catch (edgeError) {
    console.warn(`⚠️ Edge Function ${functionName} failed, initiating browser-based self-healing fallback:`, edgeError.message);
    return await runClientSideReconstruction(userId);
  }
}

/**
 * High-fidelity client-side reconstruction algorithm (matching the Edge Function exactly).
 * Ensures flawless trades assembly even under serverless connection drops.
 */
export async function runClientSideReconstruction(userId) {
  if (!userId) throw new Error('User ID is required for reconstruction.');

  // 0. Fetch live USD→INR exchange rate for P&L conversion
  const usdToInr = await exchangeRateService.getUsdToInrRate();
  console.log(`💱 USD→INR rate for P&L conversion: ${usdToInr}`);

  // 1. Fetch all unresolved raw fills chronologically
  const { data: fills, error: fetchErr } = await supabase
    .from('raw_broker_fills')
    .select('*')
    .eq('user_id', userId)
    .eq('reconstruction_status', 'PENDING')
    .order('fill_timestamp', { ascending: true });

  if (fetchErr) throw fetchErr;
  if (!fills || fills.length === 0) {
    return { success: true, count: 0, trades: [], fallbackUsed: true };
  }

  // 2. Group by symbol
  const fillsBySymbol = {};
  for (const fill of fills) {
    if (!fillsBySymbol[fill.symbol]) {
      fillsBySymbol[fill.symbol] = [];
    }
    fillsBySymbol[fill.symbol].push(fill);
  }

  let reconstructedCount = 0;
  const reconstructedRecords = [];

  // 3. FIFO / Average Price position tracking
  
  const parseTimestampToISO = (ts) => {
    if (!ts) return new Date().toISOString();
    const strTs = String(ts);
    if (/^\d{16}$/.test(strTs)) {
      return new Date(parseInt(strTs, 10) / 1000).toISOString();
    }
    const parsed = new Date(ts);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  };

  for (const [symbol, symbolFills] of Object.entries(fillsBySymbol)) {
    let positionQty = 0;
    let runningCost = 0;
    let runningRevenue = 0;
    let totalFees = 0;
    let firstFillTime = null;
    let lastFillTime = null;
    let direction = null;
    let currentFillsList = [];
    let totalPositionVolume = 0;

    for (const fill of symbolFills) {
      // Check for gap (e.g. > 60 hours) to auto-close previous position
      if (positionQty !== 0 && firstFillTime) {
        const lastTime = lastFillTime || firstFillTime;
        const currentTs = new Date(parseTimestampToISO(fill.fill_timestamp)).getTime();
        const prevTs = new Date(parseTimestampToISO(lastTime)).getTime();
        
        if (currentTs - prevTs > 60 * 60 * 60 * 1000) {
          console.warn(`⚠️ Gap > 60h detected for ${symbol}. Auto-closing open position of ${positionQty} units.`);
          
          const lastFill = currentFillsList[currentFillsList.length - 1];
          const mockQty = Math.abs(positionQty);
          const mockPrice = lastFill.price;
          
          runningRevenue += mockQty * mockPrice;
          lastFillTime = parseTimestampToISO(lastTime);
          
          const firstFill = currentFillsList[0];
          const contractVal = parseFloat(
            firstFill.raw_payload?.product?.contract_value || 
            firstFill.raw_payload?.meta_data?.product?.contract_value || 
            firstFill.raw_payload?.meta?.product?.contract_value || 
            '1'
          );

          const grossPnlUsd = (direction === 'LONG'
            ? (runningRevenue - runningCost)
            : (runningCost - runningRevenue)) * contractVal;
          const netPnlUsd = grossPnlUsd - totalFees;
          
          const grossPnl = grossPnlUsd * usdToInr;
          const netPnl = netPnlUsd * usdToInr;
          const totalFeesInr = totalFees * usdToInr;
          const entryPriceAvg = runningCost / totalPositionVolume;
          const exitPriceAvg = runningRevenue / totalPositionVolume;

          const fingerString = `${symbol}-${direction}-${totalPositionVolume.toFixed(6)}-${firstFillTime}-${netPnlUsd.toFixed(4)}`;
          const msgBuffer = new TextEncoder().encode(fingerString);
          const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
          const tradeHash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          const reconstructedRecord = {
            user_id: userId,
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
            review_status: 'PENDING',
            reconstruction_metadata: {
              fill_ids: currentFillsList.map((f) => f.id),
              broker_fill_ids: currentFillsList.map((f) => f.broker_fill_id),
              generated_fingerprint: fingerString,
              compiled_locally: true,
              auto_closed: true
            }
          };

          const { data: inserted, error: insertError } = await supabase
            .from('reconstructed_trades')
            .insert(reconstructedRecord)
            .select();

          if (!insertError && inserted && inserted.length > 0) {
            reconstructedCount++;
            reconstructedRecords.push(inserted[0]);

            const fillIdsToUpdate = currentFillsList.map((f) => f.id);
            await supabase
              .from('raw_broker_fills')
              .update({ reconstruction_status: 'RECONSTRUCTED' })
              .in('id', fillIdsToUpdate);
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
        }
      }

      const qty = parseFloat(fill.quantity);
      const price = parseFloat(fill.price);
      const fee = parseFloat(fill.fees || 0);
      const side = fill.side.toLowerCase();

      totalFees += fee;

      if (positionQty === 0) {
        direction = side === 'buy' ? 'LONG' : 'SHORT';
        firstFillTime = parseTimestampToISO(fill.fill_timestamp);
        totalPositionVolume = 0;
        runningCost = 0;
        runningRevenue = 0;
      }

      currentFillsList.push(fill);

      if (direction === 'LONG') {
        if (side === 'buy') {
          positionQty += qty;
          runningCost += qty * price;
          totalPositionVolume += qty;
        } else {
          positionQty -= qty;
          runningRevenue += qty * price;
        }
      } else { // SHORT
        if (side === 'sell') {
          positionQty += qty;
          runningCost += qty * price;
          totalPositionVolume += qty;
        } else {
          positionQty -= qty;
          runningRevenue += qty * price;
        }
      }

      // Buffer correction
      if (Math.abs(positionQty) < 0.000001) {
        positionQty = 0;
        lastFillTime = parseTimestampToISO(fill.fill_timestamp);

        // Detect contract value multiplier from the first fill of this position
        const firstFill = currentFillsList[0];
        const contractVal = parseFloat(
          firstFill.raw_payload?.product?.contract_value || 
          firstFill.raw_payload?.meta_data?.product?.contract_value || 
          firstFill.raw_payload?.meta?.product?.contract_value || 
          '1'
        );

        const grossPnlUsd = (direction === 'LONG'
          ? (runningRevenue - runningCost)
          : (runningCost - runningRevenue)) * contractVal;
        const netPnlUsd = grossPnlUsd - totalFees;
        
        // Convert USD values to INR for journal consistency
        const grossPnl = grossPnlUsd * usdToInr;
        const netPnl = netPnlUsd * usdToInr;
        const totalFeesInr = totalFees * usdToInr;
        const entryPriceAvg = runningCost / totalPositionVolume;
        const exitPriceAvg = runningRevenue / totalPositionVolume;

        console.log(`📊 ${symbol} ${direction}: USD P&L = $${netPnlUsd.toFixed(2)} → INR P&L = ₹${netPnl.toFixed(2)} (rate: ${usdToInr})`);

        // Deterministic Hash generator (using standard browser Crypto Web API)
        const fingerString = `${symbol}-${direction}-${totalPositionVolume.toFixed(6)}-${firstFillTime}-${netPnlUsd.toFixed(4)}`;
        
        // Inline synchronous hash calculation helper using SHA-256 for local execution
        const msgBuffer = new TextEncoder().encode(fingerString);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
        const tradeHash = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        const reconstructedRecord = {
          user_id: userId,
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
          review_status: 'PENDING',
          reconstruction_metadata: {
            fill_ids: currentFillsList.map((f) => f.id),
            broker_fill_ids: currentFillsList.map((f) => f.broker_fill_id),
            generated_fingerprint: fingerString,
            compiled_locally: true
          }
        };

        // Insert into database
        const { data: inserted, error: insertError } = await supabase
          .from('reconstructed_trades')
          .insert(reconstructedRecord)
          .select();

        if (!insertError && inserted && inserted.length > 0) {
          reconstructedCount++;
          reconstructedRecords.push(inserted[0]);

          // Update raw fills to mark processed
          const fillIdsToUpdate = currentFillsList.map((f) => f.id);
          await supabase
            .from('raw_broker_fills')
            .update({ reconstruction_status: 'RECONSTRUCTED' })
            .in('id', fillIdsToUpdate);
        } else if (insertError) {
          console.error('Failed to insert local reconstructed trade:', insertError.message);
        }

        // Reset
        positionQty = 0;
        runningCost = 0;
        runningRevenue = 0;
        totalFees = 0;
        firstFillTime = null;
        lastFillTime = null;
        direction = null;
        currentFillsList = [];
        totalPositionVolume = 0;
      }
    }
  }

  return {
    success: true,
    count: reconstructedCount,
    trades: reconstructedRecords,
    fallbackUsed: true
  };
}
