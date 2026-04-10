/**
 * DB_FIELDS: The single source of truth for column names in Supabase.
 * These match your database EXACTLY (including spaces and spelling).
 */
export const DB_FIELDS = {
  // Trade Columns
  date: 'Date',
  market: 'Market',
  isWin: 'W/L',
  winFlag: 'Win Flag',
  pl: 'P/L',
  rr: 'Taken RR',
  reason: 'Reson For Trade',
  learning: 'Learning ',
  strategy: 'Strategy',
  setups: 'Setups align with trade',
  lossReason: 'LOSS REASON ',
  emotions: 'Emotions',
  positionSize: 'Position Size(Lots)',
  tradeQuality: 'Trade Quality',
  tradeStatus: 'Trade Status',
  positionType: 'Position Type',
  direction: 'Direction',
  tradeMode: 'Trade mode (Buying/Selling)',
  chartScreenshotUrl: 'Chart Screenshot',

  // Snapshot Columns
  dateAdded: 'Date Added',
  snapshotImage: 'Image',
  snapshotTags: 'Tags',
  noOfTrades: 'No of trades',
  rulesFollowed: 'Rules Followed',
  emotionsInControl: 'Emotions in Control ',
  snapshotSetup: 'Setup',
  progress: 'Progress',

  // Note Columns
  noteDate: 'Date',
  noteContent: 'Note',
  noteCategory: 'Select',
  notePinned: 'Pin',
  noteSource: 'Source ',
  noteVotes: 'Votes',

  // Goal Columns
  goalStart: 'startDate',
  goalEnd: 'endDate',
  goalAmount: 'amount',
  goalStatus: 'status'
};

/**
 * [COMPATIBILITY MAPS]
 * These are used for legacy support during writes.
 */
export const TRADE_SCHEMA_MAP = {
  date: DB_FIELDS.date,
  market: DB_FIELDS.market,
  isWin: DB_FIELDS.isWin,
  winFlag: DB_FIELDS.winFlag,
  pl: DB_FIELDS.pl,
  rr: DB_FIELDS.rr,
  reason: DB_FIELDS.reason,
  learning: DB_FIELDS.learning,
  strategy: DB_FIELDS.strategy,
  setups: DB_FIELDS.setups,
  lossReason: DB_FIELDS.lossReason,
  emotions: DB_FIELDS.emotions,
  positionSize: DB_FIELDS.positionSize,
  tradeQuality: DB_FIELDS.tradeQuality,
  tradeStatus: DB_FIELDS.tradeStatus,
  positionType: DB_FIELDS.positionType,
  direction: DB_FIELDS.direction,
  tradeMode: DB_FIELDS.tradeMode,
  chartScreenshotUrl: DB_FIELDS.chartScreenshotUrl
};

export const SNAPSHOT_SCHEMA_MAP = {
  date: DB_FIELDS.dateAdded,
  imageUrl: DB_FIELDS.snapshotImage,
  tags: DB_FIELDS.snapshotTags,
  noOfTrades: DB_FIELDS.noOfTrades,
  rulesFollowed: DB_FIELDS.rulesFollowed,
  emotionsInControl: DB_FIELDS.emotionsInControl,
  setup: DB_FIELDS.snapshotSetup,
  progress: DB_FIELDS.progress
};

export const NOTE_SCHEMA_MAP = {
  date: DB_FIELDS.noteDate,
  content: DB_FIELDS.noteContent,
  category: DB_FIELDS.noteCategory,
  isPinned: DB_FIELDS.notePinned,
  source: DB_FIELDS.noteSource,
  votes: DB_FIELDS.noteVotes,
};

export const GOAL_SCHEMA_MAP = {
  startDate: DB_FIELDS.goalStart,
  endDate: DB_FIELDS.goalEnd,
  amount: DB_FIELDS.goalAmount,
  status: DB_FIELDS.goalStatus
};
