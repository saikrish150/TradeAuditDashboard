import React from 'react';

const MetricCard = ({ title, value, subValue, icon, trend, colorClass, size="normal" }) => {
  const Icon = icon;
  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg group hover:border-slate-600 transition-all duration-300`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{String(title)}</p>
          <h3 className={`font-black mt-1 tracking-tighter ${colorClass || (trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white')} ${size === 'large' ? 'text-3xl' : 'text-xl'}`}>
            {String(value)}
          </h3>
        </div>
        <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-emerald-500/10' : trend === 'down' ? 'bg-rose-500/10' : 'bg-slate-800'}`}>
          <Icon size={size === 'large' ? 24 : 18} className={trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-400' : 'text-slate-500'} />
        </div>
      </div>
      {subValue && <div className="text-slate-600 text-[10px] font-bold uppercase border-t border-slate-800/50 pt-2 mt-2">{String(subValue)}</div>}
    </div>
  );
};

export default MetricCard;