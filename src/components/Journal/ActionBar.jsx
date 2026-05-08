import React from 'react';
import { Plus, Camera, FileText, Database, DatabaseZap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const ActionBar = ({ onAddTrade, onAddSnapshot, onAddNote, onOpenRules }) => {

  const buttons = [
    { id: 'trade', label: 'Add Trade', icon: Plus, action: onAddTrade, color: 'journal-red' },
    { id: 'snapshot', label: 'Add Snapshot', icon: Camera, action: onAddSnapshot, color: 'journal-gold' },
    { id: 'note', label: 'Add Notes', icon: FileText, action: onAddNote, color: 'journal-text-secondary' },
    { id: 'rules', label: 'Rules', icon: ShieldCheck, action: onOpenRules, color: 'journal-gold' },
  ];

  return (
    <div className="hidden lg:block sticky top-0 z-[100] w-full py-6 mb-8 bg-transparent overflow-x-auto scrollbar-hide no-scrollbar transition-all duration-500">
      <div className="flex items-center justify-start md:justify-center gap-4 px-4 w-full">
        {buttons.map((btn) => (
          <motion.button
            key={btn.id}
            onClick={btn.action}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-6 py-2.5 rounded-xl flex items-center gap-2 
              text-[11px] font-black uppercase tracking-[0.2em] transition-all
              bg-transparent border border-journal-gold/20 hover:border-journal-gold/50
              ${btn.color === 'journal-red' ? 'text-journal-red hover:red-glow' : ''}
              ${btn.color === 'journal-gold' ? 'text-journal-gold hover:gold-glow' : ''}
              ${btn.color === 'journal-text-secondary' ? 'text-journal-text-secondary hover:active-glow' : ''}
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
