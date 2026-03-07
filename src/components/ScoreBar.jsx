import React from 'react';

const ScoreBar = ({ label, score, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{String(label)}</span>
      <span className={`font-mono text-xs font-bold glow-text ${color}`}>{String(score)}/100</span>
    </div>
    <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden border border-slate-700/50">
      <div className={`h-full ${color.replace('text-', 'bg-')} shadow-[0_0_10px_currentColor]`} style={{ width: `${score}%` }} />
    </div>
  </div>
);

export default ScoreBar;