import React from 'react';
import { formatCurrency } from '../utils';

const DonutCenter = ({ value, label = "NET P&L" }) => (
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 flex flex-col items-center justify-center w-full">
    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{String(label)}</p>
    <p className={`text-sm md:text-xl font-black tracking-tighter leading-none ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {formatCurrency(value)}
    </p>
  </div>
);

export default DonutCenter;