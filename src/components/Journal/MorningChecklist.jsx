import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Pin, CheckSquare, Square, X, Sun, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'tr_morning_checklist_date';

const MorningChecklist = ({ notes = [] }) => {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState({});

  // Get pinned notes
  const pinnedNotes = notes.filter(
    n => n.pinned === true || n.pinned === 'Yes' || n['Is Pinned'] === 'Yes' || n.isPinned === 'Yes'
  );

  useEffect(() => {
    // Only show if there are pinned notes
    if (pinnedNotes.length === 0) return;

    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(STORAGE_KEY);

    // Show only once per day
    if (lastShown !== today) {
      // Small delay so app renders first
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [pinnedNotes.length]);

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, today);
    setShow(false);
  };

  const toggleCheck = (id) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allChecked = pinnedNotes.length > 0 && pinnedNotes.every(n => checked[n.id]);
  const checkedCount = pinnedNotes.filter(n => checked[n.id]).length;

  if (!show || pinnedNotes.length === 0) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
          />

          {/* Modal */}
          <Motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-[10000] p-4"
          >
            <div className="w-full max-w-lg bg-[#0a0a0f]/95 backdrop-blur-2xl border border-journal-gold/20 rounded-[2rem] shadow-2xl shadow-black/80 overflow-hidden">
              
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-20 bg-journal-gold/10 blur-[60px] pointer-events-none" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-journal-gold/15 border border-journal-gold/30">
                      <Sun size={18} className="text-journal-gold" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white uppercase tracking-widest">Morning Checklist</h2>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleDismiss}
                    className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="relative z-10 text-[11px] text-slate-400 font-medium mt-3 leading-relaxed">
                  Review your pinned rules before you start trading today. Check each one to confirm you'll follow it.
                </p>
              </div>

              {/* Checklist Items */}
              <div className="px-6 py-4 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
                {pinnedNotes.map((note, i) => {
                  const isChecked = checked[note.id] || false;
                  const categoryColor = {
                    "Observation's": "border-journal-gold/20",
                    "Important Learnings": "border-emerald-500/20",
                    "Most Repeated Mistakes": "border-red-500/20"
                  };
                  const borderStyle = categoryColor[note.category] || 'border-white/5';

                  return (
                    <Motion.div
                      key={note.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => toggleCheck(note.id)}
                      className={`
                        flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all group
                        ${isChecked 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : `bg-white/[0.02] ${borderStyle} hover:bg-white/[0.04]`
                        }
                      `}
                    >
                      {/* Checkbox */}
                      <div className="shrink-0 mt-0.5">
                        {isChecked ? (
                          <Motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center"
                          >
                            <CheckSquare size={14} className="text-white" />
                          </Motion.div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-slate-700 group-hover:border-slate-500 transition-colors" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-medium leading-relaxed transition-all ${
                          isChecked ? 'text-slate-500 line-through' : 'text-slate-200'
                        }`}>
                          {note.content || note.Note || '—'}
                        </p>
                        {note.category && (
                          <span className={`inline-block mt-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                            note.category === "Most Repeated Mistakes" 
                              ? 'text-red-400 border-red-500/30 bg-red-500/10' 
                              : note.category === "Important Learnings"
                              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                              : 'text-journal-gold border-journal-gold/30 bg-journal-gold/10'
                          }`}>
                            {note.category}
                          </span>
                        )}
                      </div>

                      {/* Pin icon */}
                      <Pin size={12} className="text-journal-gold/40 shrink-0 mt-1 rotate-45" />
                    </Motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01]">
                {/* Progress */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {checkedCount} / {pinnedNotes.length} Confirmed
                  </span>
                  <div className="flex h-1.5 w-32 rounded-full overflow-hidden bg-slate-800">
                    <Motion.div 
                      className="bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(checkedCount / pinnedNotes.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className={`
                    w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all
                    ${allChecked 
                      ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:bg-emerald-400' 
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                    }
                  `}
                >
                  {allChecked ? (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles size={14} />
                      Ready to Trade — Good Luck!
                    </span>
                  ) : (
                    'Skip for Today'
                  )}
                </button>
              </div>

            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MorningChecklist;
