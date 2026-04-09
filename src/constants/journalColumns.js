export const JOURNAL_COLUMNS = [
  { key: 'date', label: 'Date', type: 'date', sticky: true },
  { key: 'market', label: 'Market', type: 'cat' },
  { key: 'isWin', label: 'W/L', type: 'cat' },
  { key: 'pl', label: 'P/L', type: 'num' },
  { key: 'direction', label: 'Direction', type: 'cat' },
  { key: 'reason', label: 'Reson For Trade', type: 'cat' },
  { key: 'lossReason', label: 'LOSS REASON ', type: 'array' },
  { key: 'learning', label: 'Learning ', type: 'text' },
  { key: 'setups', label: 'Setups align with trade', type: 'array' },
  { key: 'emotions', label: 'Emotions', type: 'array' },
  { key: 'chartScreenshotUrl', label: 'Chart Screenshot', type: 'text' },
  { key: 'rr', label: 'Taken RR', type: 'text' },
  { key: 'positionType', label: 'Position Type', type: 'cat' },
  { key: 'tradeQuality', label: 'Trade Quality', type: 'cat' },
  { key: 'tradeStatus', label: 'Trade Status', type: 'cat' },
  { key: 'tradeMode', label: 'Trade mode (Buying/Selling)', type: 'cat' }
];

export const SNAPSHOT_COLUMNS = [
  { key: 'date', label: 'Date Added', type: 'date', sticky: true },
  { key: 'imageUrl', label: 'Image', type: 'image' },
  { key: 'noOfTrades', label: 'No of trades', type: 'num' },
  { key: 'tags', label: 'Tags', type: 'array' },
  { key: 'emotionsInControl', label: 'Emotions in Control ', type: 'cat' },
  { key: 'rulesFollowed', label: 'Rules Followed', type: 'cat' },
  { key: 'setup', label: 'Setup Followed', type: 'cat' },
  { key: 'progress', label: 'Progress', type: 'text' }
];

export const NOTES_COLUMNS = [
  { key: 'date', label: 'Date', type: 'date', sticky: true },
  { key: 'pinned', label: 'Pin', type: 'cat' },
  { key: 'content', label: 'Note', type: 'text' },
  { key: 'category', label: 'Tags', type: 'cat' }
];
