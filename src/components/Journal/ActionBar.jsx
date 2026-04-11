import React from 'react';
import { Plus, Camera, FileText, Database, DatabaseZap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const ActionBar = ({ onAddTrade, onAddSnapshot, onAddNote, onOpenRules }) => {

  const buttons = [
    { id: 'trade', label: 'Add Trade', icon: Plus, action: onAddTrade, color: 'journal-red' },
    { id: 'snapshot', label: 'Add Snapshot', icon: Camera, action: onAddSnapshot, color: 'journal-gold' },
    { id: 'note', label: 'Add Notes', icon: FileText, action: onAddNote, color: 'white' },
    { id: 'rules', label: 'Rules', icon: ShieldCheck, action: onOpenRules, color: 'indigo' },
  ];

  return (
    <div className="sticky top-0 z-[100] w-full py-4 mb-8 bg-journal-bg/80 backdrop-blur-xl border-b border-journal-gold/10 overflow-x-auto scrollbar-hide no-scrollbar">
      <div className="flex items-center justify-start md:justify-center gap-3 px-4 w-full">
        {buttons.map((btn) => (
          <motion.button
            key={btn.id}
            onClick={btn.action}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-6 py-2.5 rounded-xl flex items-center gap-2 
              text-[11px] font-black uppercase tracking-[0.2em] transition-all
              journal-glass border-journal-gold/20 hover:border-journal-gold/50
              ${btn.color === 'journal-red' ? 'text-journal-red hover:red-glow' : ''}
              ${btn.color === 'journal-gold' ? 'text-journal-gold hover:gold-glow' : ''}
              ${btn.color === 'cyan' ? 'text-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]' : ''}
              ${btn.color === 'indigo' ? 'text-indigo-400 hover:shadow-[0_0_20px_rgba(129,140,248,0.2)]' : ''}
              ${btn.color === 'white' ? 'text-slate-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]' : ''}
            `}
          >
            <btn.icon size={16} className="shrink-0" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest truncate">{btn.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ActionBar;
