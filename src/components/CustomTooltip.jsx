import React from 'react';
import { formatCurrency } from '../utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const uniqueKeys = new Set();
    const filteredPayload = payload.filter(p => {
        if (!uniqueKeys.has(p.dataKey)) {
            uniqueKeys.add(p.dataKey);
            return true;
        }
        return false;
    });

    const item = filteredPayload.find(p => p.dataKey === 'pl' || p.dataKey === 'Equity' || p.dataKey === 'winRate') || filteredPayload[0];
    const isCurrency = item.dataKey === 'pl' || item.dataKey === 'Equity';
    const hasWinRate = item.payload && item.payload.winRate !== undefined;

    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md z-50">
        <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">{String(label)}</p>
        <div className="space-y-1">
          <p className={`text-sm font-black ${Number(item.value) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isCurrency ? formatCurrency(item.value) : `${String(item.value)}% Success`}
          </p>
          {hasWinRate && item.dataKey === 'pl' && (
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              Win Rate: {String(item.payload.winRate)}%
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;