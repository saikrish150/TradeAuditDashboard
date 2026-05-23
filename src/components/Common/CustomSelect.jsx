import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export const CustomSelect = ({ 
  value, 
  options, 
  onChange, 
  className = "", 
  triggerClassName, 
  dropdownPosition = "bottom",
  fontSize = "text-[11px]",
  chevronSize = 14
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  // Normalize options to handle both strings and objects
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );
  
  const selectedLabel = normalizedOptions.find(o => o.value === value)?.label || value;

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const positionClasses = dropdownPosition === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 cursor-pointer px-3 py-2 rounded-xl transition-colors ${triggerClassName !== undefined ? triggerClassName : 'bg-slate-950/80 hover:bg-black border border-white/10 shadow-inner'}`}
      >
        <span className={`text-slate-100 font-black uppercase tracking-widest truncate ${fontSize}`}>{selectedLabel}</span>
        <ChevronDown size={chevronSize} className={`text-journal-gold shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: dropdownPosition === 'top' ? 5 : -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropdownPosition === 'top' ? 5 : -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 ${positionClasses} min-w-[150px] bg-[#0c0c0c]/95 backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/80 z-[200]`}
          >
            <div className="max-h-[250px] overflow-y-auto no-scrollbar py-1.5 flex flex-col px-1.5 gap-0.5">
              {normalizedOptions.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all ${value === opt.value ? 'bg-journal-gold/10 text-journal-gold border border-journal-gold/20' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
