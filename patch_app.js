const fs = require('fs');

const filePath = 'src/App.jsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find insertion point for tab list
// We saw line 787 has 'audit'
const auditLineIndex = lines.findIndex(l => l.includes("id: 'audit'") && l.includes("label: 'Audit'"));
if (auditLineIndex !== -1 && !lines.some(l => l.includes("id: 'review'"))) {
    lines.splice(auditLineIndex + 1, 0, "                      { id: 'review', label: 'Review', icon: LayoutDashboard },");
}

// Find insertion point for render block
// We want to insert after </nav> near line 800
const navEndIndex = lines.findIndex((l, i) => i > 780 && l.includes('</nav>'));
if (navEndIndex !== -1 && !lines.some(l => l.includes("activeTab === 'review'"))) {
    const renderBlock = [
        "",
        "                  {activeTab === 'review' && (",
        "                    <ReviewTab ",
        "                      trades={processedData.trades || []} ",
        "                      snapshots={rawTrades.length > 0 ? (processedData.snapshots || []) : []} ",
        "                      notes={notes || []}",
        "                    />",
        "                  )}"
    ];
    lines.splice(navEndIndex + 1, 0, ...renderBlock);
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log("App.jsx patched successfully using line numbers");
