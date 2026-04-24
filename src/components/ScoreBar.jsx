import React from 'react';

const ScoreBar = ({ label, score, color }) => {
  const rounded = Math.round(Number(score) || 0);
  const clamped = Math.min(100, Math.max(0, rounded));
  return (
    <div className="space-y-2 min-w-0">
      <div className="flex justify-between items-end gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] truncate">{String(label)}</span>
        <span className={`font-mono text-xs font-bold glow-text ${color} whitespace-nowrap`}>{clamped}/100</span>
      </div>
      <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden border border-slate-700/50">
        <div className={`h-full ${color.replace('text-', 'bg-')} shadow-[0_0_10px_currentColor] transition-all duration-700`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
};

export default ScoreBar;