/**
 * "Zero-Opinion" CSV Utility
 * Converts raw JSON data exactly as it is without any whitelisting or normalization.
 */
export const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    console.warn("[Export] No data provided for CSV generation");
    return;
  }

  // 1. Chronological Sorting (Detecting Raw Date Columns)
  const sortedData = [...data].sort((a, b) => {
    const dateKey = Object.keys(a).find(k => k === 'Date' || k === 'Date Added' || k === 'date');
    if (dateKey && a[dateKey] && b[dateKey]) {
      const dateA = new Date(a[dateKey]);
      const dateB = new Date(b[dateKey]);
      if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
    }
    return 0;
  });

  // 2. Discover Headers directly from the first object's keys (Raw Database State)
  const headers = Object.keys(sortedData[0]).filter(key => typeof sortedData[0][key] !== 'function');

  const csvRows = [];
  
  // 3. Add Header Row
  csvRows.push(headers.join(','));

  // 4. Process Data Rows
  for (const row of sortedData) {
    const values = headers.map(header => {
      let val = row[header];

      // Handle null/undefined
      if (val === null || val === undefined) return '""';

      // 4. Simple Serialization (As It Is)
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }

      // 5. Robust CSV Escaping
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    
    csvRows.push(values.join(','));
  }

  // 6. Generate Blob with UTF-8 BOM
  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_RAW_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
