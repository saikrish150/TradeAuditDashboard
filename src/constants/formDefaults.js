import { DB_FIELDS } from './fieldMappings';

const getLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDatetime = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

export const formatToGMT530 = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString; // Fallback if already formatted

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${month} ${day}, ${year} ${hours}:${minutes} (GMT+5:30)`;
};

export const DEFAULT_TRADE_FORM = {
  date: getLocalDatetime(),
  market: '',
  direction: 'LONG',
  isWin: 'WIN',
  pl: '',
  rr: '',
  screenshot: null,
  reason: '',
  learning: '',
  setups: [],
  lossReason: [],
  emotions: 'Calm',
  positionSize: '',
  tradeQuality: 'A',
  tradeStatus: 'StopLoss',
  positionType: 'Intraday',
  tradeMode: 'Buying',
  tradeTime: '',
  brokerage: '',
  chartScreenshotUrl: ''
};

export const mapTradeToForm = (editingTrade) => {
  if (!editingTrade) return DEFAULT_TRADE_FORM;

  const getSmartVal = (key) => {
    const dbKey = DB_FIELDS[key] || key;
    return editingTrade[dbKey] !== undefined ? editingTrade[dbKey] : (editingTrade[key] !== undefined ? editingTrade[key] : '');
  };

  const rawDate = editingTrade.jsDate || editingTrade[DB_FIELDS.date] || editingTrade.date || editingTrade.entry_time;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const formattedDate = parsedDate && !isNaN(parsedDate.getTime()) ? getLocalDatetime(parsedDate) : getLocalDatetime();

  // Robust P&L extraction across all schema representations
  const rawPl = editingTrade[DB_FIELDS.pl] ?? editingTrade['P/L'] ?? editingTrade.pl ?? editingTrade.net_pnl ?? editingTrade.gross_pnl ?? '';
  const pl = (rawPl !== '' && rawPl !== null && rawPl !== undefined) ? String(rawPl) : '';

  // Robust Brokerage / Fees extraction across all schema representations
  const rawFees = editingTrade[DB_FIELDS.fees] ?? editingTrade['fees'] ?? editingTrade.fees ?? editingTrade.brokerage ?? editingTrade.total_fees ?? '';
  const brokerage = (rawFees !== '' && rawFees !== null && rawFees !== undefined) ? String(rawFees) : '';

  // Outcome W/L
  const winRaw = editingTrade.isWin ?? editingTrade[DB_FIELDS.isWin] ?? editingTrade['W/L'];
  let isWin = 'WIN';
  if (winRaw !== undefined && winRaw !== null) {
    isWin = (winRaw === true || String(winRaw).toUpperCase() === 'WIN') ? 'WIN' : 'LOSS';
  } else if (pl !== '') {
    isWin = parseFloat(pl) >= 0 ? 'WIN' : 'LOSS';
  }

  // Direction
  const dirRaw = String(getSmartVal('direction') || editingTrade.direction || 'LONG').toUpperCase();
  const direction = dirRaw.includes('LONG') ? 'LONG' : (dirRaw.includes('SHORT') ? 'SHORT' : 'OBSERVE');

  return {
    date: formattedDate,
    market: getSmartVal('market') || editingTrade.market || editingTrade.symbol || '',
    direction,
    isWin,
    pl,
    rr: getSmartVal('rr') || editingTrade.rr || '',
    screenshot: null,
    reason: getSmartVal('reason') || editingTrade.reason || '',
    learning: getSmartVal('learning') || editingTrade.learning || '',
    setups: Array.isArray(editingTrade.setups) ? editingTrade.setups : (editingTrade[DB_FIELDS.setups] ? String(editingTrade[DB_FIELDS.setups]).split(',').map(s => s.trim()) : (editingTrade.setups ? String(editingTrade.setups).split(',').map(s => s.trim()) : [])),
    lossReason: Array.isArray(editingTrade.lossReason) ? editingTrade.lossReason : (editingTrade[DB_FIELDS.lossReason] ? String(editingTrade[DB_FIELDS.lossReason]).split(',').map(s => s.trim()) : (editingTrade.lossReason ? String(editingTrade.lossReason).split(',').map(s => s.trim()) : [])),
    emotions: getSmartVal('emotions') || getSmartVal('emotion') || editingTrade.emotions || 'Calm',
    positionSize: getSmartVal('positionSize') || getSmartVal('lots') || (editingTrade.positionSize !== undefined ? String(editingTrade.positionSize) : (editingTrade.quantity !== undefined ? String(editingTrade.quantity) : '')),
    tradeQuality: getSmartVal('tradeQuality') || getSmartVal('quality') || editingTrade.tradeQuality || 'A',
    tradeStatus: (() => {
      const validStatuses = ['Target++', 'Target', 'Partial', 'StopLoss', 'Neutral'];
      const explicit = getSmartVal('tradeStatus') || editingTrade[DB_FIELDS.tradeStatus] || editingTrade.tradeStatus;
      if (explicit && validStatuses.includes(explicit)) {
        return explicit;
      }
      const numPl = parseFloat(pl);
      return (!isNaN(numPl) && numPl >= 0) ? 'Target' : 'StopLoss';
    })(),
    positionType: getSmartVal('positionType') || editingTrade.positionType || 'Intraday',
    tradeMode: getSmartVal('tradeMode') || editingTrade.tradeMode || 'Buying',
    tradeTime: getSmartVal('tradeTime') || editingTrade.tradeTime || '',
    brokerage,
    chartScreenshotUrl: getSmartVal('chartScreenshotUrl') || editingTrade.chartScreenshotUrl || ''
  };
};

export const DEFAULT_SNAPSHOT_FORM = {
  date: getLocalDate(),
  image: null,
  imageUrl: '',
  tags: [],
  noOfTrades: '',
  rulesFollowed: true,
  emotionsInControl: true,
  snapshotSetup: true,
  progress: ''
};

export const mapSnapshotToForm = (editingSnapshot) => {
  const d = (editingSnapshot.jsDate || new Date(editingSnapshot.date || editingSnapshot['Date Added']));
  const dateStr = isNaN(d.getTime()) ? getLocalDate() : getLocalDate(d);

  return {
    ...editingSnapshot,
    date: dateStr,
    image: null,
    imageUrl: editingSnapshot['Image'] || editingSnapshot.imageUrl || editingSnapshot.snapshotImage || '',
    tags: Array.isArray(editingSnapshot.tags) ? editingSnapshot.tags : (editingSnapshot['Tags'] ? String(editingSnapshot['Tags']).split(',').map(s => s.trim()) : (editingSnapshot.tags ? String(editingSnapshot.tags).split(',').map(s => s.trim()) : [])),
    noOfTrades: editingSnapshot['No of trades'] || editingSnapshot.noOfTrades || '',
    rulesFollowed: !!(editingSnapshot.rulesFollowed === 'Yes' || editingSnapshot.rulesFollowed === 'true' || editingSnapshot.rulesFollowed === true || editingSnapshot.rulesFollowedBool),
    emotionsInControl: !!(editingSnapshot.emotionsInControl === 'Yes' || editingSnapshot.emotionsInControl === 'true' || editingSnapshot.emotionsInControl === true || editingSnapshot.emotionsInControlBool),
    snapshotSetup: !!(editingSnapshot.setup === 'Yes' || editingSnapshot.setup === 'true' || editingSnapshot.setup === true || editingSnapshot.setupFollowedBool),
    progress: editingSnapshot.progress || ''
  };
};

export const DEFAULT_NOTE_FORM = {
  date: getLocalDate(),
  content: '',
  category: 'Observation\'s',
  isPinned: false
};

export const mapNoteToForm = (editingNote) => {
  const d = (editingNote.jsDate || new Date(editingNote.date || editingNote['Date']));
  const dateStr = isNaN(d.getTime()) ? getLocalDate() : getLocalDate(d);

  return {
    ...editingNote,
    date: dateStr,
    content: editingNote['Note'] || editingNote.content || '',
    category: editingNote['Select'] || editingNote.category || '',
    isPinned: editingNote['Pin'] === 'Yes' || editingNote['Pin'] === 'true' || editingNote.isPinned === true || editingNote.pinned === true,
    source: editingNote['Source '] || editingNote.source || ''
  };
};
