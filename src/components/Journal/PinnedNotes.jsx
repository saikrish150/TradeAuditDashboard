import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Calendar, Quote, ChevronRight } from 'lucide-react';

const PinnedNotes = ({ notes = [] }) => {
  const pinnedNotes = notes
    .filter(n => n.pinned === true || n.pinned === 'Yes' || n['Is Pinned'] === 'Yes' || n.isPinned === 'Yes')
    .slice(0, 4);

  if (!pinnedNotes.length) return null;

  return (
    <div className="mb-12 space-y-6">
      <div className="flex items-center px-2 gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-3 relative">
          <div className="absolute -left-3 w-1 h-full bg-journal-gold rounded-r-full" />
          <Pin size={12} className="text-journal-gold rotate-45" />
          Active Directives
        </h3>
        <div className="h-px bg-gradient-to-r from-journal-gold/20 to-transparent flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <AnimatePresence>
          {pinnedNotes.map((note, idx) => (
            <motion.div
              key={note.id || idx}
              initial={{ opacity: 0, y: 20, rotateX: -10 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="relative group cursor-pointer h-[160px]"
            >
              {/* Main Shard Body */}
              <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md border border-white/10 group-hover:border-journal-gold/40 transition-colors duration-500 overflow-hidden"
                style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
              >
                {/* Oversized Background Icon */}
                <div className="absolute -right-6 -bottom-6 text-white/[0.02] group-hover:text-journal-gold/[0.05] transition-colors duration-700 transform -rotate-12">
                  <Quote size={120} />
                </div>
                
                {/* Dynamic Left Bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-journal-gold/80 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                <div className="p-5 flex flex-col h-full relative z-10">
                  {/* Category Header */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-journal-gold bg-journal-gold/10 px-2 py-1 rounded-sm border border-journal-gold/20">
                      {note.category || 'Observation'}
                    </span>
                    <Pin size={10} className="text-slate-600 group-hover:text-journal-gold transition-colors transform group-hover:rotate-45" />
                  </div>

                  {/* Note Content */}
                  <p className="text-[11px] font-bold text-slate-300 leading-relaxed line-clamp-3 group-hover:text-white transition-colors flex-1">
                    "{note.content}"
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-3">
                    <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Calendar size={10} className="text-journal-gold" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        {note.date ? new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'LOG'}
                      </span>
                    </div>
                    
                    {/* Corner Tech Detail */}
                    <div className="flex gap-0.5">
                       <div className="w-1 h-1 bg-slate-700 group-hover:bg-journal-gold animate-pulse" />
                       <div className="w-1 h-1 bg-slate-700 group-hover:bg-journal-gold transition-colors delay-75" />
                       <div className="w-1 h-1 bg-slate-700 group-hover:bg-journal-gold transition-colors delay-150" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Glowing Underlay */}
              <div 
                className="absolute inset-0 bg-journal-gold/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10"
                style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PinnedNotes;
