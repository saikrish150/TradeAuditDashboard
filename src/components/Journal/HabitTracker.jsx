import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ShieldCheck, Smile, Target, TrendingUp, Trophy, Zap, Activity, ChevronDown } from 'lucide-react';

const MetricCard = ({ icon: Icon, label, value, colorClass, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className="p-3 rounded-2xl journal-glass border-white/5 relative overflow-hidden group hover:border-journal-gold/20 transition-all duration-500"
  >
    <div className={`absolute -top-8 -right-8 w-16 h-16 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.split(' ')[0]}`} />
    <div className="flex items-center gap-4 relative z-10">
      <div className={`p-2 rounded-xl scale-90 ${colorClass}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xl font-black text-white italic tracking-tighter leading-none">{value}%</p>
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
    <div className="mb-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
        <div className="flex items-center gap-6">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
            The Discipline Forge
          </h3>
          
          <div className="h-6 w-px bg-white/5 hidden md:block" />

          <div className="flex items-center gap-4">
             {/* Integrated Habit Streak HUD */}
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg">
                <Flame size={14} className="text-journal-gold animate-pulse" />
                <span className="text-[10px] font-black text-white italic tracking-widest">{streak}</span>
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Streak</span>
             </div>

             <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
               <Trophy size={14} className={rank.color} />
               <span className={`text-[9px] font-black uppercase tracking-widest ${rank.color}`}>{rank.title}</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Timeframe Filter */}
           <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800 shadow-inner">
             <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Period:</span>
             <select 
               value={timeframe} 
               onChange={(e) => setTimeframe(parseInt(e.target.value))}
               className="bg-transparent text-[8px] font-black text-white uppercase tracking-widest outline-none cursor-pointer hover:text-journal-gold transition-colors appearance-none"
             >
               <option value={1}>1W</option>
               <option value={2}>2W</option>
               <option value={3}>3W</option>
               <option value={4}>4W</option>
             </select>
             <ChevronDown size={8} className="text-slate-600" />
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard 
            icon={ShieldCheck} 
            label="Compliance" 
            value={filteredStats.ruleRate} 
            colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            delay={0.1}
          />
          <MetricCard 
            icon={Smile} 
            label="Equilibrium" 
            value={filteredStats.emotionRate} 
            colorClass="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
            delay={0.2}
          />
          <MetricCard 
            icon={Target} 
            label="Adherence" 
            value={filteredStats.setupRate} 
            colorClass="bg-amber-500/10 border-amber-500/20 text-amber-500"
            delay={0.3}
          />
        </div>

          {/* Activity Forge Grid - 30 boxes ONLY */}
        <div className="journal-glass rounded-[2rem] p-4 border-white/5 relative overflow-hidden">
           <div className="flex flex-col sm:flex-row items-center justify-between mb-4 px-2 gap-4">
              <div className="flex items-center gap-2">
                 <Activity size={12} className="text-journal-gold" />
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Intensity Map / Last 30 Sessions</p>
              </div>
              {/* Traffic Light Legend */}
              <div className="flex items-center gap-3 text-[7px] font-black uppercase text-slate-600">
                 <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded bg-rose-500" /> 0</div>
                 <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded bg-orange-600" /> 1</div>
                 <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded bg-emerald-500" /> 2</div>
                 <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded bg-journal-gold" /> 3</div>
                 <span className="text-slate-800 ml-1">RULES</span>
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
                      className={`w-7 h-7 rounded-lg transition-all duration-300 cursor-help ${getColor()}`} 
                      title={s ? `${s.date}: ${count}/3 Compliance Rules` : 'Await Session...'}
                    />
                  );
                })}
             </div>
             
           <div className="mt-4 flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 border-t border-white/5 pt-3">
              <span>Discipline Map</span>
              <span className="text-slate-500 italic">Target 3/3</span>
           </div>
          </div>
        </div>
    </div>
  );
};

export default HabitTracker;
