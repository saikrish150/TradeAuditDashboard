import React from 'react';
import { formatCurrency } from '../utils';

const DonutCenter = ({ value, label = "NET P&L" }) => (
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 flex flex-col items-center justify-center w-full">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">{String(label)}</p>
    <p className={`font-mono text-xl md:text-3xl font-bold tracking-tighter leading-none ${value >= 0 ? 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]' : 'text-[#ff0844] drop-shadow-[0_0_8px_rgba(255,8,68,0.6)]'}`}>
      {formatCurrency(value)}
    </p>
  </div>
);

export default DonutCenter;