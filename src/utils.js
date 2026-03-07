export const MONTH_MAP = {
  'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
  'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11,
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

export const COLORS = {
  emerald: '#00e676', // Neon Green
  rose: '#ff0844',    // Neon Red
  indigo: '#7f00ff',  // Deep Purple
  amber: '#f5d020',   // Luminous Gold
  slate: '#64748b',   // Steel
  purple: '#e100ff',  // Deep Magenta
  blue: '#00c6ff',    // Cyan Glow
  white: '#ffffff',
  psychPalette: ['#7f00ff', '#e100ff', '#ff0844', '#f5d020', '#00c6ff', '#00f2fe', '#8b5cf6'],
  qualityPalette: ['#00e676', '#a855f7', '#7f00ff', '#f5d020', '#e100ff', '#ff0844']
};

export const cleanCurrency = (val) => {
  if (!val) return 0;
  let s = val.toString().replace(/[₹\s,"]/g, '');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};

export const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num) || !isFinite(num)) return "₹0";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

export const parseCSV = (text) => {
  const result = [];
  const rows = text.split(/\r?\n/);
  rows.forEach(row => {
    if (!row.trim()) return;
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cells.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else current += char;
    }
    cells.push(current.trim().replace(/^"|"$/g, ''));
    result.push(cells);
  });
  return result;
};

export const getMarketCategory = (market) => {
  if (!market) return 'Other';
  const m = String(market).toUpperCase();
  if (['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'RELIANCE', 'SBIN', 'INDIAN'].some(i => m.includes(i))) return 'Indian';
  return 'Other';
};