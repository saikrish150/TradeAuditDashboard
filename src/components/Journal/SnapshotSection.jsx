import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, ShieldCheck, Smile, Target, Tag, Hash } from 'lucide-react';

const SnapshotSection = ({ snapshots = [] }) => {
  const [viewMode, setViewMode] = useState('gallery');

  const modes = [
    { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
    { id: 'table', label: 'Table', icon: List }
  ];

  return (
    <div className="space-y-6 mb-12">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
          Execution Intelligence Archives
        </h3>
        
        <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              className={`p-2 rounded-lg transition-all ${
                viewMode === m.id 
                ? 'bg-journal-gold/20 text-journal-gold border border-journal-gold/30' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <m.icon size={16} />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'gallery' && (
          <motion.div 
            key="gallery"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {snapshots.map((s, idx) => (
              <div key={s.id || idx} className="journal-glass rounded-2xl overflow-hidden group cursor-pointer border-journal-gold/10 hover:border-journal-gold/40 transition-all">
                <div className="h-40 bg-slate-900 relative">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-800"><Target size={40} /></div>
                  )}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-tighter border border-white/10">
                    {s.date?.toDateString ? s.date.toDateString() : s.date}
                  </div>
                </div>
                <div className="p-4 bg-slate-950/40">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.setup || 'Session Note'}</span>
                    <span className="text-[9px] font-bold text-journal-gold uppercase tracking-[0.2em]">{s.noOfTrades || 0} EXEC</span>
                  </div>
                  <div className="flex gap-2">
                    {s.rulesFollowed && <ShieldCheck size={12} className="text-emerald-400" />}
                    {s.emotionsInControl && <Smile size={12} className="text-indigo-400" />}
                    {s.setupFollowed && <Target size={12} className="text-journal-gold" />}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {viewMode === 'table' && (
           <motion.div 
            key="table"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="journal-glass rounded-2xl overflow-x-auto border-journal-gold/10"
           >
             <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead className="bg-slate-950/20 border-b border-white/5">
                 <tr>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Snapshot Date</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Primary Strategy</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Volume</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Compliance</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Metadata / Tags</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">Success %</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.03]">
                 {snapshots.map((s, idx) => (
                   <tr key={s.id || idx} className="hover:bg-white/[0.01] transition-colors">
                     <td className="px-6 py-4 text-[10px] font-bold text-slate-400 whitespace-nowrap">{s.date}</td>
                     <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{s.setup || 'N/A'}</span>
                            <span className="text-[9px] text-slate-600 font-bold italic line-clamp-1">{s.notes}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-black text-journal-gold">
                            {s.noOfTrades || 0}
                        </span>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className={`p-1 rounded ${s.rulesFollowed ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-800 bg-white/5'}`} title="Rules Followed"><ShieldCheck size={14} /></div>
                            <div className={`p-1 rounded ${s.emotionsInControl ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-800 bg-white/5'}`} title="Emotions Controlled"><Smile size={14} /></div>
                            <div className={`p-1 rounded ${s.setupFollowed ? 'text-journal-gold bg-journal-gold/10' : 'text-slate-800 bg-white/5'}`} title="Setup Discipline"><Target size={14} /></div>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {s.tags?.map(t => (
                                <span key={t} className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[8px] font-black uppercase text-slate-500 border border-white/5">#{t}</span>
                            )) || <span className="text-[9px] text-slate-700 italic">No tags</span>}
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <span className="text-[11px] font-black text-journal-gold italic">{s.progress || s.winRate || 0}%</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SnapshotSection;

