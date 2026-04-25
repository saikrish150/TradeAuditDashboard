export const MONTH_MAP = {
  'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
  'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11,
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Sept': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

export const COLORS = {
  emerald: '#2ECC71', // Premium Green
  rose: '#E63946',    // Deep Red
  gold: '#D4AF37',    // Official Gold
  bg: '#0A0A0A',      // Pure Dark
  secondary: '#141414',
  card: '#1C1C1C',
  white: '#ffffff',
  psychPalette: ['#D4AF37', '#E63946', '#2ECC71', '#1C1C1C', '#B8B8B8', '#6B6B6B'],
  qualityPalette: ['#2ECC71', '#E63946', '#D4AF37', '#B8B8B8', '#6B6B6B']
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