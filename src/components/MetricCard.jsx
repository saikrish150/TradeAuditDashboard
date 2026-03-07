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
    <div className={`glass-panel rounded-2xl p-4 shadow-lg group transition-all duration-500 ease-out ${glowBorder}`}>
      <div className="flex justify-between items-start mb-2 relative">
        <div className="z-10 relative">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">{String(title)}</p>
          <h3 className={`font-mono font-bold mt-1 tracking-tighter transition-all duration-300 ${textGlow} ${size === 'large' ? 'text-2xl md:text-4xl' : 'text-xl md:text-2xl'}`}>
            {String(value)}
          </h3>
        </div>
        <div className={`p-2 rounded-xl relative overflow-hidden ${trend === 'up' ? 'bg-[#00e676]/10' : trend === 'down' ? 'bg-[#ff0844]/10' : 'bg-indigo-500/10'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <Icon size={size === 'large' ? 20 : 16} className={`relative z-10 md:w-auto md:h-auto ${trend === 'up' ? 'text-[#00e676]' : trend === 'down' ? 'text-[#ff0844]' : 'text-indigo-400'}`} />
        </div>
      </div>
      {subValue && (
        <div className="text-slate-500 text-[10px] font-bold uppercase border-t border-slate-700/50 pt-2 mt-2 tracking-widest relative z-10">
          {String(subValue)}
        </div>
      )}
    </div>
  );
};

export default MetricCard;