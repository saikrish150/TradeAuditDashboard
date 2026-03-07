import React from 'react';

const SectionHeader = ({ icon, title, sub, color = "text-[#00c6ff]" }) => {
  const Icon = icon;
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className={`p-3 glass-panel rounded-2xl relative overflow-hidden ${color}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        <Icon size={22} className="relative z-10 drop-shadow-[0_0_8px_currentColor]" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white leading-tight uppercase tracking-widest">{String(title)}</h2>
        {sub && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{String(sub)}</p>}
      </div>
    </div>
  );
};

export default SectionHeader;