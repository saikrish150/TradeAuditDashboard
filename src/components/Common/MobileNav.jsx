import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Signal, Brain, History, ShieldCheck, Activity } from 'lucide-react';

const MobileNav = ({ activeSection, setActiveSection }) => {
  const tabs = [
    { id: 'alerts', label: 'Alerts', icon: Signal },
    { id: 'insights', label: 'Insights', icon: Brain },
    { id: 'journal', label: 'Journal', icon: History },
    { id: 'audit', label: 'Audit', icon: ShieldCheck }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[150] md:hidden modern-glass border-t border-white/10 px-2 pb-safe-area shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300 relative ${
              activeSection === tab.id ? 'text-journal-gold' : 'text-journal-text-muted'
            }`}
          >
            {activeSection === tab.id && (
              <Motion.div
                layoutId="active-nav-glow"
                className="absolute top-0 w-12 h-1 bg-gradient-to-r from-journal-gold to-amber-500 rounded-full shadow-[0_4px_12px_rgba(212,175,55,0.4)]"
              />
            )}
            <tab.icon size={20} className={activeSection === tab.id ? 'glow-text' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
