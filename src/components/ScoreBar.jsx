import React from 'react';

const ScoreBar = ({ label, score, color }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-end">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{String(label)}</span>
      <span className={`text-xs font-black ${color}`}>{String(score)}/100</span>
    </div>
    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
      <div className={`h-full ${color.replace('text', 'bg')}`} style={{ width: `${score}%` }} />
    </div>
  </div>
);

export default ScoreBar;