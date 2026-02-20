import React from 'react';

const SectionHeader = ({ icon, title, sub, color = "text-indigo-400" }) => {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`p-2 bg-slate-800 rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white leading-tight uppercase tracking-tighter">{String(title)}</h2>
        {sub && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{String(sub)}</p>}
      </div>
    </div>
  );
};

export default SectionHeader;