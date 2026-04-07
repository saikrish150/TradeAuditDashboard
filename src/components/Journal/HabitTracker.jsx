import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Smile, Target, TrendingUp } from 'lucide-react';

const HabitTracker = ({ snapshots = [] }) => {
  // Calculate Streak (Consecutive days where rules were followed and emotions controlled)
  const streak = snapshots.filter(s => s.rulesFollowed && s.emotionsInControl).length;
  
  // Calculate Consistency % (Last 30 snapshots)
  const last30 = snapshots.slice(0, 30);
  const ruleFollowRate = Math.round((last30.filter(s => s.rulesFollowed).length / (last30.length || 1)) * 100);
  const emotionRate = Math.round((last30.filter(s => s.emotionsInControl).length / (last30.length || 1)) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="journal-glass rounded-2xl p-8 border-journal-gold/20 mb-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-col lg:flex-row items-center gap-12">
        {/* Streak Circle */}
        <div className="flex flex-col items-center justify-center gap-4 text-center min-w-[180px]">
          <div className="w-28 h-28 rounded-full border-4 border-journal-gold/10 flex items-center justify-center relative bg-journal-gold/5">
            <Flame size={56} className="text-journal-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
            <div className="absolute -bottom-2 bg-journal-gold text-journal-bg px-4 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tighter shadow-lg">
              {streak} DAY STREAK
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Consistency Engine</h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Discipline creates freedom</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Rule Compliance</p>
              <p className="text-2xl font-black text-white italic">{ruleFollowRate}%</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Smile size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Emotional Control</p>
              <p className="text-2xl font-black text-white italic">{emotionRate}%</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4 hidden lg:flex">
            <div className="p-3 rounded-xl bg-journal-gold/10 border border-journal-gold/20 text-journal-gold">
              <Target size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Session Sharpness</p>
              <p className="text-2xl font-black text-white italic">High</p>
            </div>
          </div>
        </div>

        {/* Heatmap Layout (Simplified) */}
        <div className="flex-1 hidden xl:flex flex-col gap-3">
           <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest text-right mr-1">Activity Log</p>
           <div className="flex items-center justify-end gap-1.5 flex-wrap">
             {Array.from({ length: 24 }).map((_, i) => {
               const daySnap = snapshots[i];
               const isActive = daySnap && daySnap.rulesFollowed && daySnap.emotionsInControl;
               return (
                 <div 
                   key={i} 
                   className={`w-3.5 h-3.5 rounded-sm transition-all duration-500 ${
                     isActive ? 'bg-journal-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'bg-white/[0.05]'
                   }`} 
                 />
               );
             })}
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HabitTracker;
