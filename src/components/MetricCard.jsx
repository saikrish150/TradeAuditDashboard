import React from 'react';

const MetricCard = ({ title, value, subValue, icon, trend, colorClass, size = "normal" }) => {
  const Icon = icon;

  // Premium trading color mapping
  const glowBorder = trend === 'up' ? 'hover:border-journal-green/50 hover:green-glow' :
    trend === 'down' ? 'hover:border-journal-red/50 hover:red-glow' :
      'hover:border-journal-gold/40 hover:gold-glow';

  const textGlow = trend === 'up' ? 'text-journal-green drop-shadow-[0_0_12px_rgba(46,204,113,0.4)]' :
    trend === 'down' ? 'text-journal-red drop-shadow-[0_0_12px_rgba(230,57,70,0.4)]' :
      colorClass ? `${colorClass} glow-text` : 'text-white';

  return (
    <div className={`modern-glass rounded-[24px] p-5 group transition-all duration-500 ease-out relative overflow-hidden ${glowBorder}`}>
      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none" />
      <div className="flex justify-between items-start mb-1 relative z-10">
        <div>
          <p className="text-journal-text-secondary text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">{String(title)}</p>
          <h3 className={`font-mono font-black mt-1 tracking-tighter transition-all duration-500 ${textGlow} ${size === 'large' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
            {String(value)}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl relative overflow-hidden ${trend === 'up' ? 'bg-journal-green/10' : trend === 'down' ? 'bg-journal-red/10' : 'bg-journal-gold/10'}`}>
          <Icon size={size === 'large' ? 18 : 16} className={`relative z-10 ${trend === 'up' ? 'text-journal-green' : trend === 'down' ? 'text-journal-red' : 'text-journal-gold'}`} />
        </div>
      </div>
      {subValue && (
        <div className="text-slate-500 text-[9px] font-black uppercase border-t border-white/5 pt-2 mt-2 tracking-widest relative z-10">
          {String(subValue)}
        </div>
      )}
    </div>
  );
};

export default MetricCard;