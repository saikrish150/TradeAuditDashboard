import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, Save, Edit3, Trash2, TrendingUp, IndianRupee } from 'lucide-react';
import { firebaseService } from '../../services/firebaseService';
import { formatCurrency } from '../../utils';

const GoalTracking = ({ trades }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({
    startDate: '',
    endDate: '',
    amount: ''
  });

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToGoals((data) => {
      setGoals(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveGoal = async () => {
    if (!newGoal.startDate || !newGoal.endDate || !newGoal.amount) return;
    try {
      await firebaseService.updateGoal(null, {
        startDate: newGoal.startDate,
        endDate: newGoal.endDate,
        amount: parseFloat(newGoal.amount),
        status: 'active'
      });
      setNewGoal({ startDate: '', endDate: '', amount: '' });
    } catch (err) {
      console.error("Failed to save goal:", err);
    }
  };

  const currentGoal = useMemo(() => {
    return goals.find(g => g.status === 'active') || goals[0];
  }, [goals]);

  const progressData = useMemo(() => {
    if (!currentGoal || !trades.length) return { pl: 0, percent: 0 };
    
    const start = new Date(currentGoal.startDate);
    const end = new Date(currentGoal.endDate);
    
    const relevantPL = trades
      .filter(t => t.jsDate >= start && t.jsDate <= end)
      .reduce((sum, t) => sum + (t.pl || 0), 0);
    
    const percent = Math.min(100, Math.max(0, (relevantPL / currentGoal.amount) * 100));
    return { pl: relevantPL, percent: Math.round(percent) };
  }, [currentGoal, trades]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-12 items-start">
      {/* Active Goal Counter */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="journal-glass rounded-2xl p-8 border-journal-gold/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 border-l border-b border-journal-gold/10 rounded-bl-3xl bg-journal-gold/5">
          <Target className="text-journal-gold" size={32} />
        </div>

        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">
          Current Objective Progress
        </h3>

        {currentGoal ? (
          <div className="space-y-8">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-end mb-4">
                <div className="flex flex-col">
                   <p className="text-[10px] font-black uppercase text-journal-gold/60 tracking-widest">P&L vs Target</p>
                   <p className="text-3xl font-black tracking-tighter text-white">
                     {formatCurrency(progressData.pl)} <span className="text-slate-600 text-lg">/ {formatCurrency(currentGoal.amount)}</span>
                   </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-journal-gold italic glow-text">{progressData.percent}%</p>
                </div>
              </div>

              {/* Gold Progress Bar */}
              <div className="h-4 w-full bg-slate-950 rounded-full border border-journal-gold/10 overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressData.percent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-journal-gold via-journal-gold/80 to-journal-gold rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-slate-800/50">
               <div>
                 <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Duration</p>
                 <p className="text-[11px] font-bold text-slate-300">{currentGoal.startDate} to {currentGoal.endDate}</p>
               </div>
               <div className="ml-auto flex items-center gap-3">
                 <button className="p-2 rounded-lg hover:bg-white/5 transition-all text-slate-500 hover:text-white border border-transparent hover:border-slate-800">
                    <Edit3 size={14} />
                 </button>
               </div>
            </div>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-600 italic text-sm">
            Set your first performance target to begin tracking.
          </div>
        )}
      </motion.div>

      {/* Goal Inputs & Previous Goals */}
      <div className="space-y-6">
        <div className="journal-glass rounded-2xl p-6 border-journal-gold/10">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-journal-gold mb-6 flex items-center gap-2">
            <Save size={14} /> Define New Performance Goal
          </h4>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Start Date</label>
              <input 
                type="date" 
                value={newGoal.startDate}
                onChange={(e) => setNewGoal({...newGoal, startDate: e.target.value})}
                className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-journal-gold/50 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">End Date</label>
              <input 
                type="date" 
                value={newGoal.endDate}
                onChange={(e) => setNewGoal({...newGoal, endDate: e.target.value})}
                className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-journal-gold/50 transition-all [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 lg:col-span-1">
              <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Target Amount (INR)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  type="number" 
                  placeholder="50000"
                  value={newGoal.amount}
                  onChange={(e) => setNewGoal({...newGoal, amount: e.target.value})}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none focus:border-journal-gold/50 transition-all"
                />
              </div>
            </div>
            <div className="col-span-2 lg:col-span-3 flex justify-end mt-2">
              <button 
                onClick={handleSaveGoal}
                disabled={!newGoal.startDate || !newGoal.endDate || !newGoal.amount}
                className="px-8 py-2.5 bg-journal-gold/10 hover:bg-journal-gold/20 text-journal-gold border border-journal-gold/30 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 flex items-center gap-2"
              >
                <TrendingUp size={14} /> Initialize Goal
              </button>
            </div>
          </div>
        </div>

        {/* Previous Goals Compact Table */}
        <div className="journal-glass rounded-2xl p-6 border-journal-gold/10 max-h-[160px] overflow-y-auto">
           <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4">Historical Goals</h4>
           <div className="space-y-2">
             {goals.map((g, idx) => (
               <div key={g.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-slate-800 text-[10px] font-bold">
                 <div className="flex items-center gap-4">
                   <div className={`w-2 h-2 rounded-full ${g.status === 'active' ? 'bg-journal-gold' : 'bg-slate-700'}`} />
                   <span className="text-slate-400">{g.startDate} to {g.endDate}</span>
                 </div>
                 <div className="flex items-center gap-6">
                   <span className="text-slate-200">{formatCurrency(g.amount)}</span>
                   <button className="text-slate-600 hover:text-journal-red transition-colors"><Trash2 size={12} /></button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default GoalTracking;
