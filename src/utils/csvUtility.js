/**
 * Advanced Utility to convert JSON collections to CSV format with "Zero Data Loss" logic.
 * Scans the entire dataset for unique headers and serializes complex objects/arrays.
 */

export const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    console.warn("[Export] No data provided for CSV generation");
    return;
  }

  // 1. Discover all unique headers across the entire dataset
  const headerSet = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      // Exclude large binary/heavy objects if necessary, but keep all metadata
      if (typeof item[key] !== 'function') {
        headerSet.add(key);
      }
    });
  });

  // Convert Set to Array and sort for consistency
  const allHeaders = Array.from(headerSet).sort();
  
  // Optional: Move ID to the front for better organization
  const sortedHeaders = [
    'id', 
    ...allHeaders.filter(h => h !== 'id' && h !== 'jsDate')
  ];

  console.log(`[Export] Generating CSV with ${sortedHeaders.length} columns for ${data.length} records.`);

  const csvRows = [];
  
  // 2. Add Header Row
  csvRows.push(sortedHeaders.join(','));

  // 3. Process Data Rows
  for (const row of data) {
    const values = sortedHeaders.map(header => {
      let val = row[header];

      // Handle null/undefined
      if (val === null || val === undefined) return '""';

      // 4. Handle Complex Types (Zero Loss Logic)
      if (val instanceof Date) {
        val = val.toISOString();
      } else if (Array.isArray(val)) {
        // Flatten arrays (like screenshots or setups) into a semicolon-separated string
        val = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('; ');
      } else if (typeof val === 'object') {
        // Stringify nested objects (like metadata or tags)
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }

      // 5. Robust CSV Escaping
      // Escape double quotes by doubling them, and wrap the entire string in double quotes
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    
    csvRows.push(values.join(','));
  }

  // 6. Generate Blob with UTF-8 BOM (for Excel compatibility with special characters)
  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
