export const MARKET_OPTIONS = [
  'NIFTY', 'GOLD', 'BTC', 'ETH'
];

export const TRADE_STATUS_OPTIONS = [
  'Target++', 'Target', 'Parctial', 'StopLoss', 'Netural'
];

export const EMOTION_OPTIONS = [
  'Clam', 'Revenge', 'Frustration', 'Impatient', 'FOMO', 'Greed', 'Fear'
];

export const SETUP_OPTIONS = [
  'Retest', 'B.O.S', 'Price Action', 'Consolidation breakout',
  'Trend Line', 'Random', 'Imp level S/R',
  'Strong trend trading', 'other', 'Previous Day closing setup', 'Sideways',
];

export const LOSS_REASON_OPTIONS = [
  'All Rules Followed', 'OVER TRADING', 'Against the Trend',
  'Early entry without confirmations', 'Rules Not Followed',
  'WRONG ANALYSIS', 'Early Exit', 'Not A+ Setup', 'Learning',
  'Against the trend', 'NO SETUP', 'GREED'
];

export const OUTCOME_OPTIONS = [
  { value: 'WIN', label: 'WIN' },
  { value: 'LOSS', label: 'LOSS' },
  { value: 'Neutral', label: 'Neutral' },

];

export const DIRECTION_OPTIONS = ['LONG', 'SHORT', 'Side ways'];

export const POSITION_TYPE_OPTIONS = ['Intraday', 'Swing'];

export const TRADE_MODE_OPTIONS = ['Buying', 'Selling'];

export const TRADE_QUALITY_OPTIONS = ['A++', 'A', 'Bad'];

export const COMPLIANCE_OPTIONS = [
  { key: 'rulesFollowed', label: 'All Rules Followed', shortLabel: 'Rules' },
  { key: 'emotionsInControl', label: 'Emotions in Control', shortLabel: 'EQ' },
  { key: 'snapshotSetup', label: 'Taken only setup', shortLabel: 'System' }
];

export const SNAPSHOT_TAG_OPTIONS = [
  'Sideways', 'Trending', 'traping', 'volatile'];

export const NOTE_CATEGORY_OPTIONS = [
  "Observation's", 'Important Learnings', 'Most Repeated Mistakes'
];
