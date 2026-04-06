import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit3, X, CheckSquare, Layers, Award, Tag, Zap } from 'lucide-react';

const BulkActionBar = ({ selectedCount, onClear, onDelete, onUpdate }) => {
  const [showOptions, setShowOptions] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <Motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1500] w-[95%] max-w-2xl"
      >
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">
              {selectedCount}
            </div>
            <div>
               <p className="text-white font-black uppercase tracking-tighter italic leading-none">Institutional Operations</p>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Bulk Command Active</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="px-6 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Edit3 size={14} /> Batch Edit
            </button>
            <button 
              onClick={onDelete}
              className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-full transition-all"
              title="Delete Selected"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-8 bg-white/5 mx-2" />
            <button 
              onClick={onClear}
              className="p-3 hover:bg-white/5 text-slate-500 rounded-full transition-all"
              title="Clear Selection"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Batch Options Popover */}
        <AnimatePresence>
          {showOptions && (
            <Motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: -12, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="absolute bottom-full left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl mb-4"
            >
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Update Strategy</p>
                     <div className="grid grid-cols-2 gap-2">
                        {['Reversal', 'Breakout', 'Trend', 'Scalp'].map(strat => (
                          <button 
                            key={strat}
                            onClick={() => onUpdate({ strategy: strat })}
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold text-slate-300 text-left transition-all"
                          >
                             {strat}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Update Grade</p>
                     <div className="flex gap-2">
                        {['A', 'B', 'C', 'D'].map(grade => (
                          <button 
                            key={grade}
                            onClick={() => onUpdate({ grade })}
                            className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-300 transition-all"
                          >
                             {grade}
                          </button>
                        ))}
                     </div>
                  </div>
               </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.div>
    </AnimatePresence>
  );
};

export default BulkActionBar;
