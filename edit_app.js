const fs = require('fs');

try {
    const filePath = 'src/App.jsx';
    let content = fs.readFileSync(filePath, 'utf8');

    // Add Import
    if (!content.includes("import ReviewTab from './components/Journal/ReviewTab';")) {
        content = content.replace(
            "import { exchangeRateService } from './services/exchangeRateService';",
            "import ReviewTab from './components/Journal/ReviewTab';\nimport { exchangeRateService } from './services/exchangeRateService';"
        );
    }

    // Add Tab Definition
    if (!content.includes("id: 'review'")) {
        content = content.replace(
            "{ id: 'audit', label: 'Audit', icon: ShieldCheck },",
            "{ id: 'audit', label: 'Audit', icon: ShieldCheck },\n                      { id: 'review', label: 'Review', icon: LayoutDashboard },"
        );
    }

    // Add Rendering Block
    if (!content.includes("activeTab === 'review'")) {
        const navEndTag = '</nav>';
        const navEndIndex = content.indexOf(navEndTag);
        if (navEndIndex !== -1) {
            const insertionPoint = navEndIndex + navEndTag.length;
            const reviewRender = `\n\n                  {activeTab === 'review' && (\n                    <ReviewTab \n                      trades={processedData.trades || []} \n                      snapshots={rawTrades.length > 0 ? (processedData.snapshots || []) : []} \n                      notes={notes || []}\n                      filters={{\n                        year: selectedYear,\n                        month: selectedMonth,\n                        day: selectedDay,\n                        category: selectedCategory,\n                        asset: selectedAsset,\n                        preset: datePreset,\n                        start: startDate,\n                        end: endDate\n                      }}\n                    />\n                  )}`;
            content = content.slice(0, insertionPoint) + reviewRender + content.slice(insertionPoint);
        }
    }

    fs.writeFileSync(filePath, content);
    console.log("Successfully updated App.jsx");
} catch (e) {
    console.error(e);
    process.exit(1);
}
