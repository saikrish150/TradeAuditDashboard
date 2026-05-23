/**
 * Maps raw Delta Exchange India API execution payloads to standard frontend fill definitions.
 * This acts as a translation layer in case data formats shift on the exchange side.
 */
export function normalizeDeltaFill(fill) {
  if (!fill) return null;

  return {
    fillId: String(fill.id || fill.broker_fill_id || ''),
    orderId: String(fill.order_id || fill.broker_order_id || ''),
    symbol: String(fill.symbol || ''),
    side: String(fill.side || '').toLowerCase() === 'buy' ? 'buy' : 'sell',
    quantity: parseFloat(fill.size || fill.quantity || 0),
    price: parseFloat(fill.price || 0),
    fees: parseFloat(fill.fee || fill.fees || 0),
    feeCurrency: String(fill.fee_currency || fill.feeCurrency || 'USDT'),
    timestamp: fill.created_at || fill.fill_timestamp || new Date().toISOString(),
    raw: fill.raw_payload || fill
  };
}

/**
 * Maps list of raw fills.
 */
export function normalizeDeltaFills(fills = []) {
  return fills.map(normalizeDeltaFill).filter(Boolean);
}
