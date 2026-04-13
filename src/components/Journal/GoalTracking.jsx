import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Calendar, Plus, TrendingUp, History, ChevronDown, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { AddGoalModal } from './JournalModals';

const GoalTracking = ({ trades, goals = [], onSaveGoal, onDeleteGoal }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSaveGoal = async (goalData) => {
    try {
      await onSaveGoal(goalData);
    } catch (err) {
      console.error("Failed to save goal:", err);
    }
  };

  const calculateProgress = (goal) => {
    if (!goal || !trades.length) return { pl: 0, percent: 0, daysLeft: 0 };
    const start = new Date(goal.startDate);
    const end = new Date(goal.endDate);
    const today = new Date();
    
    const relevantPL = trades
      .filter(t => t.jsDate >= start && t.jsDate <= end)
      .reduce((sum, t) => sum + (t.pl || 0), 0);
    
    const percent = Math.min(100, Math.max(0, (relevantPL / goal.amount) * 100));
    const daysLeft = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));

    return { pl: relevantPL, percent: Math.round(percent), daysLeft };
  };

  const currentGoal = useMemo(() => {
    return goals.find(g => g.status === 'active') || (goals.length > 0 ? goals[0] : null);
  }, [goals]);

  const progressData = useMemo(() => calculateProgress(currentGoal), [currentGoal, trades]);

  const handleToggleStatus = async (goal) => {
    await onSaveGoal({ ...goal, status: 'active' });
  };

  const handleDeleteGoal = async (id) => {
    if (confirm('Delete this historical goal record?')) {
      await onDeleteGoal(id);
    }
  };

  return (
    <div className="mb-12 space-y-6">
      <div className="flex items-center justify-between px-2 gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          Goals
        </h3>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-journal-gold/10 hover:bg-journal-gold/20 text-journal-gold border border-journal-gold/20 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <Plus size={12} /> <span className="hidden xs:inline">Set Goal</span><span className="xs:hidden">Set</span>
        </button>
      </div>

      {/* Hero Active Goal */}
      <motion.div 
        layout
        className="journal-glass rounded-[2rem] p-6 border-journal-gold/20 relative overflow-hidden group"
      >
        {/* Background Accent */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-journal-gold/5 rounded-full blur-3xl group-hover:bg-journal-gold/10 transition-all duration-700" />
        
        {currentGoal ? (
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-journal-gold tracking-[0.4em]">Goal</p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl font-black text-white tracking-tighter">
                    {formatCurrency(progressData.pl)}
                  </h2>
                  <span className="text-lg font-bold text-slate-600">/ {formatCurrency(currentGoal.amount)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
                <div className="text-left sm:text-center">
                   <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Success</p>
                   <p className="text-xl sm:text-3xl font-black text-journal-gold italic glow-text">{progressData.percent}%</p>
                </div>
                <div className="h-8 sm:h-12 w-px bg-white/10" />
                <div className="text-left sm:text-center">
                   <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Time Left</p>
                   <p className="text-lg sm:text-2xl font-black text-white uppercase italic">{progressData.daysLeft} <span className="text-[8px] sm:text-[10px] text-slate-500 not-italic">Days</span></p>
                </div>
              </div>
            </div>

            {/* Premium Progress Bar */}
            <div className="space-y-4">
               <div className="h-6 w-full bg-slate-950 rounded-2xl border border-white/5 overflow-hidden p-1 relative shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressData.percent}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gradient-to-r from-journal-gold/40 via-journal-gold to-journal-gold rounded-xl shadow-[0_0_25px_rgba(212,175,55,0.4)] relative"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:50px_50px] animate-[shimmer_2s_linear_infinite]" />
                  </motion.div>
               </div>
               <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span>Start: {currentGoal.startDate}</span>
                  <span>End: {currentGoal.endDate}</span>
               </div>
            </div>

            {/* History Toggle */}
            <div className="pt-4 border-t border-white/5 flex justify-center">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-journal-gold transition-all group/h"
              >
                <History size={12} className={showHistory ? 'text-journal-gold' : ''} />
                {showHistory ? 'Hide Archive' : 'View Archive'}
                <ChevronDown size={14} className={`transition-transform duration-300 ${showHistory ? 'rotate-180 text-journal-gold' : 'text-slate-500'}`} />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-20 h-20 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                <Target size={32} className="text-slate-700" />
             </div>
             <div className="space-y-2">
                <p className="text-xl font-black text-white uppercase tracking-widest">No Active Objective</p>
                <p className="text-xs text-slate-500 font-bold max-w-xs mx-auto">Establish your first performance target to unlock real-time progress tracking.</p>
             </div>
             <button 
              onClick={() => setShowAddModal(true)}
              className="px-10 py-4 bg-journal-gold text-journal-bg rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg hover:scale-105 active:scale-95 transition-all"
             >
               Initialize Goal
             </button>
          </div>
        )}

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                {goals.filter(g => g.id !== currentGoal?.id).length > 0 ? (
                  goals.filter(g => g.id !== currentGoal?.id).map((g) => {
                    const stats = calculateProgress(g);
                    return (
                      <div key={g.id} className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-4 group/item hover:border-white/10 transition-all">
                         <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                               <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Archive</span>
                               <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">{g.startDate} — {g.endDate}</span>
                            </div>
                            <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-800 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all p-1">
                               <Trash2 size={12} />
                            </button>
                         </div>
 
                         <div className="flex justify-between items-end">
                            <div className="space-y-1">
                               <p className="text-sm font-black text-white italic tracking-tighter">{formatCurrency(g.amount)} <span className="text-[8px] text-slate-500 not-italic uppercase font-bold tracking-widest pl-1">Target</span></p>
                               <p className={`${stats.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'} text-[10px] font-black`}>{formatCurrency(stats.pl)} <span className="text-[8px] opacity-60 uppercase font-bold">Final</span></p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                               <span className={`text-[10px] font-black italic ${stats.percent >= 100 ? 'text-journal-gold' : 'text-slate-500'}`}>
                                  {stats.percent}%
                               </span>
                               <button 
                                 onClick={() => handleToggleStatus(g)}
                                 className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[7px] font-black uppercase tracking-widest hover:bg-journal-gold hover:text-journal-bg hover:border-journal-gold transition-all"
                               >
                                  Switch to Active
                               </button>
                            </div>
                         </div>

                         {/* Mini Progress Bar */}
                         <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${stats.percent >= 100 ? 'bg-journal-gold' : 'bg-slate-700'}`} 
                              style={{ width: `${stats.percent}%` }} 
                            />
                         </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-10 text-center text-slate-700 text-[10px] font-bold uppercase tracking-widest">
                    No historical records available
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <AddGoalModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveGoal}
      />

    </div>
  );
};

export default GoalTracking;
