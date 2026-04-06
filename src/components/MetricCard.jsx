import React from 'react';

const MetricCard = ({ title, value, subValue, icon, trend, colorClass, size = "normal" }) => {
  const Icon = icon;

  // Neon glowing color mapping
  const glowBorder = trend === 'up' ? 'hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(0,230,118,0.3)]' :
    trend === 'down' ? 'hover:border-rose-400/50 hover:shadow-[0_0_15px_rgba(255,8,68,0.3)]' :
      'hover:border-indigo-400/50 hover:shadow-[0_0_15px_rgba(127,0,255,0.3)]';

  const textGlow = trend === 'up' ? 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]' :
    trend === 'down' ? 'text-[#ff0844] drop-shadow-[0_0_8px_rgba(255,8,68,0.6)]' :
      colorClass ? `${colorClass} glow-text` : 'text-white';

  return (
    <div className={`modern-glass rounded-[20px] p-4 group transition-all duration-500 ease-out relative overflow-hidden ${glowBorder}`}>
      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none" />
      <div className="flex justify-between items-start mb-1 relative z-10">
        <div>
          <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">{String(title)}</p>
          <h3 className={`font-mono font-black mt-1 tracking-tighter transition-all duration-500 ${textGlow} ${size === 'large' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
            {String(value)}
          </h3>
        </div>
        <div className={`p-2 rounded-xl relative overflow-hidden shadow-inner ${trend === 'up' ? 'bg-[#10b981]/10' : trend === 'down' ? 'bg-[#f43f5e]/10' : 'init-glass-icon'}`}>
          <Icon size={size === 'large' ? 18 : 16} className={`relative z-10 ${trend === 'up' ? 'text-[#10b981]' : trend === 'down' ? 'text-[#f43f5e]' : 'text-indigo-400'}`} />
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