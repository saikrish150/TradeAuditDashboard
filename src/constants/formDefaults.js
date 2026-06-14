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
  const getSmartVal = (key) => {
    const dbKey = DB_FIELDS[key] || key;
    return editingTrade[dbKey] || editingTrade[key] || '';
  };

  return {
    date: editingTrade.jsDate ? getLocalDatetime(new Date(editingTrade.jsDate)) : getLocalDatetime(),
    market: getSmartVal('market'),
    direction: (getSmartVal('direction') || 'LONG').toUpperCase().includes('LONG') ? 'LONG' : (String(getSmartVal('direction')).toUpperCase().includes('SHORT') ? 'SHORT' : 'OBSERVE'),
    isWin: (editingTrade.isWin === true || String(getSmartVal('isWin')).toUpperCase() === 'WIN') ? 'WIN' : 'LOSS',
    pl: editingTrade.pl?.toString() || '',
    rr: getSmartVal('rr'),
    screenshot: null,
    reason: getSmartVal('reason'),
    learning: getSmartVal('learning'),
    setups: Array.isArray(editingTrade.setups) ? editingTrade.setups : (editingTrade[DB_FIELDS.setups] ? String(editingTrade[DB_FIELDS.setups]).split(',').map(s => s.trim()) : []),
    lossReason: Array.isArray(editingTrade.lossReason) ? editingTrade.lossReason : (editingTrade[DB_FIELDS.lossReason] ? String(editingTrade[DB_FIELDS.lossReason]).split(',').map(s => s.trim()) : []),
    emotions: getSmartVal('emotion') || 'Calm',
    positionSize: getSmartVal('lots') || getSmartVal('positionSize') || '',
    tradeQuality: getSmartVal('quality') || 'A',
    tradeStatus: getSmartVal('status') || 'Neutral',
    positionType: getSmartVal('positionType') || 'Intraday',
    tradeMode: getSmartVal('tradeMode') || 'Buying',
    tradeTime: getSmartVal('tradeTime') || '',
    brokerage: getSmartVal('brokerage') || '',
    chartScreenshotUrl: getSmartVal('chartScreenshotUrl')
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
