export const JOURNAL_COLUMNS = [
  { key: 'market', label: 'market', type: 'cat', sticky: true },
  { key: 'date', label: 'date', type: 'date' },
  { key: 'isWin', label: 'isWin', type: 'cat' },
  { key: 'pl', label: 'pl', type: 'num' },
  { key: 'rr', label: 'Taken RR', type: 'text' },
  { key: 'direction', label: 'direction', type: 'cat' },
  { key: 'emotion', label: 'emotions', type: 'array' },
  { key: 'reason', label: 'lossReason', type: 'array' },
  { key: 'reasonForTrade', label: 'TradeReason', type: 'cat' },
  { key: 'learning', label: 'learning', type: 'text' },
  { key: 'lots', label: 'positionSize', type: 'num' },
  { key: 'positionType', label: 'positionType', type: 'cat' },
  { key: 'setups', label: 'setups', type: 'array' },
  { key: 'quality', label: 'tradeQuality', type: 'cat' },
  { key: 'status', label: 'tradeStatus', type: 'cat' },
  { key: 'tradeMode', label: 'tradeMode', type: 'cat' },
  { key: 'chartScreenshotUrl', label: 'Screenshot', type: 'text' }
];

export const SNAPSHOT_COLUMNS = [
  { key: 'date', label: 'Snapshot Date', type: 'date', sticky: true },
  { key: 'visual', label: 'Visual Artifact', type: 'image' },
  { key: 'volume', label: 'Execution Volume', type: 'num', align: 'center' },
  { key: 'compliance', label: 'Compliance Matrix', type: 'custom', align: 'center' },
  { key: 'metadata', label: 'Metadata / Tags', type: 'array' }
];

export const NOTES_COLUMNS = [
  { key: 'date', label: 'Entry Date', type: 'date', sticky: true },
  { key: 'isPinned', label: 'Status', type: 'cat', align: 'center' },
  { key: 'category', label: 'Category', type: 'cat' },
  { key: 'content', label: 'Content Preview', type: 'text' }
];
