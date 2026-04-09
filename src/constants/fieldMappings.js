/**
 * FIELD_ALIASES: A centralized registry of all known database field names.
 * This handles variations from different data sources (Notion, CSVs, Manual Entry).
 * Used primarily for READING and NORMALIZING data for the UI.
 */
export const FIELD_ALIASES = {
  pl: ['pl', 'P/L', 'P & L', 'Profit/Loss', 'Net P&L', 'Amount', 'Profit'],
  rr: ['rr', 'Taken RR', 'TakenRR', 'RR', 'rr_ratio'],
  lots: ['lots', 'positionSize', 'Position Size(Lots)', 'Quantity'],
  reason: ['reasonForTrade', 'Reson For Trade', 'logic', 'reason', 'TradeReason'],
  learning: ['learning', 'Learning ', 'Lesson'],
  emotion: ['emotion', 'emotions', 'Emotions', 'Psychology'],
  quality: ['quality', 'tradeQuality', 'Trade Quality', 'Grade'],
  status: ['status', 'tradeStatus', 'Trade Status'],
  market: ['market', 'Market', 'Symbol', 'Ticker'],
  direction: ['direction', 'Direction', 'Type'],
  isWin: ['isWin', 'W/L', 'Result', 'Outcome'],
  setup: ['setup', 'setups', 'Setup', 'Strategy'],
  lossReason: ['lossReason', 'lossReasons', 'LOSS REASON '],
  date: [
    'date', 'Date', 'fullDate', 'Date Added', 
    'Created time', 'Last edited time', 'Trade Date', 
    'Execution Time', 'Timestamp', 'Created At', 'createdAt'
  ],
  positionType: ['positionType', 'Position Type', 'Trade Type'],
  tradeMode: ['tradeMode', 'Trade Mode', 'Trading Mode', 'Trade mode (Buying/Selling)'],
  chartScreenshotUrl: ['chartScreenshotUrl', 'screenshotUrl', 'Chart Screenshot', 'Screenshot', 'ImageUrl', 'url', 'Image'],
  noOfTrades: ['noOfTrades', 'No of trades', 'Execution Volume', 'Volume', 'tradesCount'],
  rulesFollowed: ['rulesFollowed', 'Rules Followed', 'Compliance', 'isCompliant'],
  emotionsInControl: ['emotionsInControl', 'Emotions in Control ', 'Psychology Status'],
  progress: ['progress', 'Progress', 'Daily Progress'],
  content: ['content', 'Note', 'Content', 'Description'],
  category: ['category', 'Select', 'Category', 'type'],
  source: ['source', 'Source ', 'Link', 'Reference']
};

/**
 * TRADE_SCHEMA_MAP: Defines the "Strict Schema" for WRITE operations.
 * Maps UI form keys to the intended final Database column names.
 */
export const TRADE_SCHEMA_MAP = {
  date: 'date',
  market: 'market',
  direction: 'direction',
  isWin: 'isWin',
  pl: 'pl',
  rr: 'rr',
  reason: 'reasonForTrade',
  learning: 'learning',
  setups: 'setups',
  lossReasons: 'lossReasons',
  emotions: 'emotion',
  positionSize: 'positionSize',
  tradeQuality: 'tradeQuality',
  tradeStatus: 'tradeStatus',
  positionType: 'positionType',
  tradeMode: 'tradeMode',
  chartScreenshotUrl: 'chartScreenshotUrls' // Saved as array in DB
};

/**
 * SNAPSHOT_SCHEMA_MAP: Standard schema for Daily Performance Snapshots
 */
export const SNAPSHOT_SCHEMA_MAP = {
  date: 'date',
  imageUrl: 'imageUrl',
  tags: 'tags',
  noOfTrades: 'noOfTrades',
  rulesFollowed: 'rulesFollowed',
  emotionsInControl: 'emotionsInControl',
  setupFollowed: 'setupFollowed',
  setup: 'setup',
  progress: 'progress'
};

/**
 * NOTE_SCHEMA_MAP: Standard schema for Psychology entries
 */
export const NOTE_SCHEMA_MAP = {
  date: 'date',
  content: 'content',
  category: 'category',
  isPinned: 'isPinned',
  source: 'source',
  createdAt: 'createdAt',
  lastEditedAt: 'lastEditedAt'
};

/**
 * GOAL_SCHEMA_MAP: Standard schema for Objective tracking
 */
export const GOAL_SCHEMA_MAP = {
  startDate: 'startDate',
  endDate: 'endDate',
  amount: 'amount',
  status: 'status'
};
