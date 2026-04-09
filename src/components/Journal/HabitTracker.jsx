import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ShieldCheck, Smile, Target, TrendingUp, Trophy, Zap, Activity, ChevronDown } from 'lucide-react';

const MetricCard = ({ icon: Icon, label, value, colorClass, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className="p-5 rounded-[2rem] journal-glass border-white/5 relative overflow-hidden group hover:border-journal-gold/20 transition-all duration-500"
  >
    <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.split(' ')[0]}`} />
    <div className="flex flex-col gap-3 relative z-10">
      <div className={`p-3 rounded-2xl w-fit ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="space-y-0.5">
        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white italic tracking-tighter">{value}%</p>
      </div>
    </div>
  </motion.div>
);

const HabitTracker = ({ snapshots = [] }) => {
  const [timeframe, setTimeframe] = useState(4); // default 4 weeks

  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => {
      const dateA = a.jsDate || new Date(a.date);
      const dateB = b.jsDate || new Date(b.date);
      return dateB - dateA;
    });
  }, [snapshots]);

  // Calculate Streak
  const streak = useMemo(() => {
    let currentStreak = 0;
    for (const s of sortedSnapshots) {
      if (s.rulesFollowedBool && s.emotionsInControlBool && s.setupFollowedBool) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [sortedSnapshots]);

  // Filtered Stats based on timeframe
  const filteredStats = useMemo(() => {
    const days = timeframe * 7;
    const now = new Date();
    const cutoff = new Date(now.setDate(now.getDate() - days));
    
    const recent = sortedSnapshots.filter(s => {
      const d = s.jsDate || new Date(s.date);
      return d >= cutoff;
    });
    const denominator = recent.length || 1;

    return {
      ruleRate: Math.round((recent.filter(s => s.rulesFollowedBool).length / denominator) * 100),
      emotionRate: Math.round((recent.filter(s => s.emotionsInControlBool).length / denominator) * 100),
      setupRate: Math.round((recent.filter(s => s.setupFollowedBool).length / denominator) * 100),
      count: recent.length
    };
  }, [sortedSnapshots, timeframe]);

  // Discipline Rank based on Global Consistency
  const averageAllTime = useMemo(() => {
    if (!sortedSnapshots.length) return 0;
    const rules = sortedSnapshots.filter(s => s.rulesFollowedBool).length;
    const emotions = sortedSnapshots.filter(s => s.emotionsInControlBool).length;
    const system = sortedSnapshots.filter(s => s.setupFollowedBool).length;
    return Math.round(((rules + emotions + system) / (sortedSnapshots.length * 3)) * 100);
  }, [sortedSnapshots]);

  const getRank = () => {
    if (streak >= 15 && averageAllTime >= 90) return { title: 'Zen Master', color: 'text-journal-gold' };
    if (streak >= 7 && averageAllTime >= 80) return { title: 'Discipline Sentinel', color: 'text-emerald-400' };
    if (streak >= 3) return { title: 'Focused Warrior', color: 'text-indigo-400' };
    return { title: 'Market Apprentice', color: 'text-slate-500' };
  };
  const rank = getRank();

  return (
    <div className="mb-12 space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
          Psychological Edge / The Discipline Forge
        </h3>
        
        <div className="flex items-center gap-4">
           {/* Timeframe Filter */}
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Period:</span>
             <select 
               value={timeframe} 
               onChange={(e) => setTimeframe(parseInt(e.target.value))}
               className="bg-transparent text-[9px] font-black text-white uppercase tracking-widest outline-none cursor-pointer hover:text-journal-gold transition-colors appearance-none"
             >
               <option value={1}>Last 1 Week</option>
               <option value={2}>Last 2 Weeks</option>
               <option value={3}>Last 3 Weeks</option>
               <option value={4}>Last 4 Weeks</option>
             </select>
             <ChevronDown size={10} className="text-slate-600" />
           </div>

           <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800">
             <Trophy size={14} className={rank.color} />
             <span className={`text-[9px] font-black uppercase tracking-widest ${rank.color}`}>{rank.title}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Forge Component */}
        <motion.div 
          className="lg:col-span-4 journal-glass rounded-[2.5rem] p-10 border-journal-gold/20 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[400px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] animate-pulse" />
          
          <div className="relative z-10 space-y-8">
            <div className="relative">
               <div className="w-40 h-40 rounded-full border-2 border-journal-gold/20 flex items-center justify-center relative bg-slate-950/50 shadow-[0_0_50px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_80px_rgba(212,175,55,0.2)] transition-all duration-700">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="flex flex-col items-center"
                  >
                    <Flame size={64} className="text-journal-gold drop-shadow-[0_0_25px_rgba(212,175,55,0.6)]" />
                    <p className="text-4xl font-black text-white mt-1 italic tracking-tighter">{streak}</p>
                  </motion.div>
               </div>
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-journal-gold text-journal-bg rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-lg">
                 Discipline Streak
               </div>
            </div>

            <div className="space-y-4">
               <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Selected Period Performance</h4>
                  <div className="flex justify-center gap-3">
                     <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase border border-emerald-500/20">Rules: {filteredStats.ruleRate}%</span>
                     <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-bold uppercase border border-indigo-500/20">EQ: {filteredStats.emotionRate}%</span>
                     <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase border border-amber-500/20">System: {filteredStats.setupRate}%</span>
                  </div>
               </div>
               <p className="text-[9px] text-slate-500 font-bold max-w-[180px] mx-auto leading-relaxed">Maintaining full system compliance across {filteredStats.count} tracked sessions.</p>
            </div>
          </div>
        </motion.div>

        {/* Stats & Forge Log */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard 
              icon={ShieldCheck} 
              label="System Compliance" 
              value={filteredStats.ruleRate} 
              colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              delay={0.1}
            />
            <MetricCard 
              icon={Smile} 
              label="Emotional Equilibrium" 
              value={filteredStats.emotionRate} 
              colorClass="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              delay={0.2}
            />
            <MetricCard 
              icon={Target} 
              label="Setup Adherence" 
              value={filteredStats.setupRate} 
              colorClass="bg-amber-500/10 border-amber-500/20 text-amber-500"
              delay={0.3}
            />
          </div>

          {/* Activity Forge Grid - 30 boxes ONLY */}
          <div className="journal-glass rounded-[2rem] p-8 border-white/5 relative overflow-hidden">
             <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-2">
                   <Activity size={16} className="text-journal-gold" />
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Consistency Engine / Last 30 Sessions</p>
                </div>
                {/* Traffic Light Legend */}
                <div className="flex items-center gap-4 text-[8px] font-black uppercase text-slate-600">
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-rose-500" /> 0 Rules</div>
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-orange-600" /> 1 Rule</div>
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500" /> 2 Rules</div>
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-journal-gold" /> 3 Rules</div>
                </div>
             </div>

             <div className="flex justify-center gap-2.5 flex-wrap">
                {Array.from({ length: 30 }).map((_, i) => {
                  const s = sortedSnapshots[i];
                  let count = 0;
                  if (s) {
                    if (s.rulesFollowedBool) count++;
                    if (s.emotionsInControlBool) count++;
                    if (s.setupFollowedBool) count++;
                  }
                  
                  const getColor = () => {
                    if (!s) return 'bg-white/5';
                    if (count === 3) return 'bg-journal-gold shadow-[0_0_20px_rgba(212,175,55,0.6)]';
                    if (count === 2) return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
                    if (count === 1) return 'bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.4)]';
                    return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
                  };

                  return (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0, rotate: -15 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.01 }}
                      whileHover={{ scale: 1.25, zIndex: 10 }}
                      className={`w-10 h-10 rounded-xl transition-all duration-300 cursor-help ${getColor()}`} 
                      title={s ? `${s.date}: ${count}/3 Compliance Rules` : 'Await Session...'}
                    />
                  );
                })}
             </div>
             
             <div className="mt-8 flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 border-t border-white/5 pt-6">
                <span>Discipline Intensity Map</span>
                <span className="text-slate-500 italic">Targeting 3/3 daily excellence</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitTracker;
