import React from 'react';

const SectionHeader = ({ icon, title, sub, color = "text-journal-gold" }) => {
  const Icon = icon;
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className={`p-3 bg-transparent border border-journal-gold/20 rounded-2xl relative overflow-hidden gold-glow ${color}`}>
        <Icon size={22} className="relative z-10 drop-shadow-[0_0_15px_currentColor]" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white leading-tight uppercase tracking-widest">{String(title)}</h2>
        {sub && <p className="text-[10px] text-journal-text-secondary font-bold uppercase tracking-[0.2em] mt-1">{String(sub)}</p>}
      </div>
    </div>
  );
};

export default SectionHeader;