const fs = require('fs');

const filePath = 'src/App.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Review button to Nav if not already there
if (!content.includes("id: 'review'")) {
    content = content.replace(
        "{ id: 'audit', label: 'Audit', icon: ShieldCheck },",
        "{ id: 'audit', label: 'Audit', icon: ShieldCheck },\n                      { id: 'review', label: 'Review', icon: LayoutDashboard },"
    );
}

// 2. Add ReviewTab render block if not already there
if (!content.includes("activeTab === 'review'")) {
    const navEnd = '</nav>';
    const navIndex = content.indexOf(navEnd);
    if (navIndex !== -1) {
        const insertion = `\n\n                  {activeTab === 'review' && (\n                    <ReviewTab \n                      trades={trades} \n                      snapshots={snapshots} \n                      notes={filteredNotes} \n                    />\n                  )}`;
        content = content.slice(0, navIndex + navEnd.length) + insertion + content.slice(navIndex + navEnd.length);
    }
}

// 3. Fix possibly mangled text from previous attempt
content = content.replace('Trader<span className="text-indigo-500"> Terminal</span>', 'Trader<span className="text-indigo-500"> Dashboard</span>');

fs.writeFileSync(filePath, content);
console.log("App.jsx final patch applied successfully");
