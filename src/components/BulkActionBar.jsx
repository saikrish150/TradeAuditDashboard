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
        <div className="bg-journal-secondary/90 backdrop-blur-2xl border border-journal-gold/20 p-5 rounded-[2rem] shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-journal-gold rounded-2xl flex items-center justify-center text-journal-bg font-black shadow-lg shadow-journal-gold/20">
              {selectedCount}
            </div>
            <div>
               <h4 className="text-white font-black uppercase tracking-tighter italic leading-none">Institutional Operations</h4>
               <p className="text-[10px] text-journal-text-muted font-bold uppercase tracking-widest mt-1">Bulk Command Active</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="px-6 py-2 bg-journal-gold/10 hover:bg-journal-gold/20 text-journal-gold border border-journal-gold/50 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Edit3 size={14} /> Batch Edit
            </button>
            <button 
              onClick={onDelete}
              className="p-3 bg-journal-red/10 hover:bg-journal-red/20 text-journal-red border border-journal-red/50 rounded-full transition-all"
              title="Delete Selected"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-8 bg-white/10 mx-2" />
            <button 
              onClick={onClear}
              className="p-3 hover:bg-white/10 text-journal-text-muted rounded-full transition-all"
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
              className="absolute bottom-full left-0 right-0 p-6 bg-journal-secondary/95 backdrop-blur-2xl border border-journal-gold/30 rounded-[2.5rem] shadow-2xl mb-4"
            >
               <div className="space-y-4">
                  <p className="text-[9px] font-black text-journal-text-muted uppercase tracking-[0.2em] px-2">Update Strategy</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Reversal', 'Breakout', 'Trend', 'Scalp'].map(strat => (
                      <button 
                        key={strat}
                        onClick={() => onUpdate({ strategy: strat })}
                        className="p-3 bg-white/5 hover:bg-journal-gold/10 border border-white/5 hover:border-journal-gold/30 rounded-xl text-[10px] font-bold text-journal-text-secondary text-left transition-all"
                      >
                          {strat}
                      </button>
                    ))}
                  </div>
               </div>
               <div className="space-y-4 mt-6">
                  <p className="text-[9px] font-black text-journal-text-muted uppercase tracking-[0.2em] px-2">Update Grade</p>
                  <div className="flex gap-2">
                    {['A', 'B', 'C', 'D'].map(grade => (
                      <button 
                        key={grade}
                        onClick={() => onUpdate({ grade })}
                        className="w-12 h-12 bg-white/5 hover:bg-journal-gold/10 border border-white/5 hover:border-journal-gold/30 rounded-xl flex items-center justify-center text-[11px] font-black text-journal-text-secondary transition-all"
                      >
                          {grade}
                      </button>
                    ))}
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
