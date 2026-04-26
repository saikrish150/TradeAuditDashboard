import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Smile, Target, Trophy, Activity, ChevronDown, Brain, BookOpen, Check, X } from 'lucide-react';

const StatPill = ({ icon: Icon, label, value, colorClass, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 sm:py-2.5 rounded-xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-all shrink-0"
  >
    <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon size={12} className={colorClass.split(' ')[2]} />
    </div>
    <div className="flex flex-col">
      <span className="text-[6px] font-black uppercase text-slate-500 tracking-[0.2em]">{label}</span>
      <span className="text-xs sm:text-base font-black text-white italic tracking-tighter">{value}%</span>
    </div>
  </motion.div>
);

const AuditLedgerCard = ({ snapshot, index }) => {
  const s = snapshot;
  let count = 0;
  if (s) {
    if (s.rulesFollowedBool) count++;
    if (s.emotionsInControlBool) count++;
    if (s.setupFollowedBool) count++;
  }

  const getBorderColor = () => {
    if (!s) return 'border-white/5 opacity-40';
    if (count === 3) return 'border-journal-gold bg-journal-gold/10 shadow-[0_0_20px_rgba(212,175,55,0.2)] ring-1 ring-journal-gold/20';
    if (count === 2) return 'border-emerald-500/20 bg-emerald-500/[0.03]';
    if (count === 1) return 'border-orange-600/20 bg-orange-600/[0.03]';
    return 'border-rose-500/20 bg-rose-500/[0.03]';
  };

  const AuditRow = ({ icon: Icon, label, followed, activeColor }) => (
    <div className="flex items-center justify-between w-full px-2">
       <div className="flex items-center gap-2">
          <Icon size={10} className={`${followed ? activeColor : 'text-rose-500 opacity-60'}`} />
          <span className={`text-[7px] font-black uppercase tracking-widest ${followed ? 'text-slate-300' : 'text-slate-600'}`}>
             {label}
          </span>
       </div>
       {followed ? <Check size={8} className="text-emerald-500" /> : <X size={8} className="text-rose-500" />}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      whileHover={{ y: -4, scale: 1.02, borderColor: 'rgba(255,255,255,0.2)' }}
      className={`
        w-full min-w-[130px] max-w-[165px] h-[95px] rounded-2xl border flex flex-col p-3 relative transition-all duration-300 group/chip cursor-help
        ${getBorderColor()}
      `}
    >
       {/* Card ID Header */}
       <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
          <span className="text-[6px] font-black text-slate-500 uppercase tracking-widest">
             Trace-{(30 - index).toString().padStart(2, '0')}
          </span>
          <div className="flex gap-1">
             <div className={`w-1 h-1 rounded-full ${count === 3 ? 'bg-journal-gold animate-pulse' : 'bg-slate-800'}`} />
             <div className={`w-1 h-1 rounded-full ${count >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          </div>
       </div>

       {/* Audit Table Rows */}
       <div className="flex flex-col gap-1.5">
          <AuditRow icon={BookOpen} label="Strategy" followed={s?.rulesFollowedBool} activeColor="text-emerald-400" />
          <AuditRow icon={Brain} label="Emotions" followed={s?.emotionsInControlBool} activeColor="text-journal-gold" />
          <AuditRow icon={Target} label="Adherence" followed={s?.setupFollowedBool} activeColor="text-journal-gold" />
       </div>

       {/* Excellence Marker */}
       {count === 3 && (
         <div className="absolute -top-1 -right-1 bg-journal-gold text-slate-950 px-1 rounded text-[5px] font-black uppercase">
            A+ Score
         </div>
       )}
    </motion.div>
  );
};

const HabitTracker = ({ snapshots = [] }) => {
  const [timeframe, setTimeframe] = useState(4); // default 4 weeks
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => {
      const dateA = a.jsDate || new Date(a.date);
      const dateB = b.jsDate || new Date(b.date);
      return dateB - dateA;
    });
  }, [snapshots]);

  const streak = useMemo(() => {
    let currentStreak = 0;
    for (const s of sortedSnapshots) {
      if (s.rulesFollowedBool && s.emotionsInControlBool && s.setupFollowedBool) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [sortedSnapshots]);

  const filteredStats = useMemo(() => {
    const days = timeframe * 7;
    const now = new Date();
    const cutoff = new Date(now.setDate(now.getDate() - days));
    const recent = sortedSnapshots.filter(s => (s.jsDate || new Date(s.date)) >= cutoff);
    const denominator = recent.length || 1;
    return {
      ruleRate: Math.round((recent.filter(s => s.rulesFollowedBool).length / denominator) * 100),
      emotionRate: Math.round((recent.filter(s => s.emotionsInControlBool).length / denominator) * 100),
      setupRate: Math.round((recent.filter(s => s.setupFollowedBool).length / denominator) * 100),
    };
  }, [sortedSnapshots, timeframe]);

  const getRank = () => {
    const avg = Math.round((filteredStats.ruleRate + filteredStats.emotionRate + filteredStats.setupRate) / 3);
    if (streak >= 15 && avg >= 90) return { title: 'Zen Master', color: 'text-journal-gold' };
    if (streak >= 7 && avg >= 80) return { title: 'Sentinel', color: 'text-emerald-400' };
    return { title: 'Apprentice', color: 'text-slate-500' };
  };
  const rank = getRank();

  return (
    <div className="mb-12 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 px-4">
        <div className="flex flex-wrap items-center gap-6">
           <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-journal-gold/10 border border-journal-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                 <Activity size={18} className="text-journal-gold animate-pulse" />
              </div>
              <div className="flex flex-col">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">The Forge</h3>
                 <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-0.5 italic text-shadow-sm">System Audit protocol established</span>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl shadow-inner">
                 <Flame size={14} className="text-journal-gold" />
                 <span className="text-[11px] font-black text-white italic tracking-tighter">{streak} Day Streak</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-xl">
                <Trophy size={14} className={rank.color} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${rank.color}`}>{rank.title}</span>
              </div>
           </div>
        </div>

        {/* Global HUD Metrics */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/20 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
          <StatPill icon={ShieldCheck} label="Compliance" value={filteredStats.ruleRate} colorClass="bg-emerald-500 text-emerald-400" />
          <StatPill icon={Smile} label="Equilibrium" value={filteredStats.emotionRate} colorClass="bg-journal-gold text-journal-gold" />
          <StatPill icon={Target} label="Adherence" value={filteredStats.setupRate} colorClass="bg-journal-gold text-journal-gold" />
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 group transition-all hover:border-slate-600">
             <select 
               value={timeframe} 
               onChange={(e) => setTimeframe(parseInt(e.target.value))}
               className="bg-transparent text-[8px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer appearance-none group-hover:text-white"
             >
               <option value={1}>1 Week Window</option><option value={2}>2 Week Window</option><option value={3}>3 Week Window</option><option value={4}>Full 4W Window</option>
             </select>
             <ChevronDown size={8} className="text-slate-600" />
          </div>
        </div>
      </div>

      {/* Main Wide-Format Ledger Container */}
      <div className="journal-glass rounded-[2rem] p-4 sm:p-6 border-white/5 relative overflow-hidden group/matrix shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.05),transparent)] opacity-40" />
         
         <div className="mb-4 relative z-10" />

         {/* Space-Filling High-Density Grid */}
         <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 relative z-10 place-items-center">
            {Array.from({ length: isExpanded ? 30 : (isMobile ? 4 : 10) }).map((_, i) => (
              <AuditLedgerCard key={i} snapshot={sortedSnapshots[i]} index={i} />
            ))}
         </div>

         <div className="mt-4 flex flex-col items-center relative z-10">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-all underline underline-offset-4 decoration-white/10"
            >
              {isExpanded ? '[ - ] COLLAPSE' : '[ + ] VIEW ALL'}
            </button>
         </div>
      </div>
    </div>
  );
};

export default HabitTracker;
