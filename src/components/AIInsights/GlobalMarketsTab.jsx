import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Globe2, Bitcoin, Droplets, Activity } from 'lucide-react';
import SectionHeader from '../SectionHeader';
import GlobalMarketsWidget from './GlobalMarketsWidget';
import CommoditiesWidget from './CommoditiesWidget';
import CryptoWidget from './CryptoWidget';
import MacroIndicatorsWidget from './MacroIndicatorsWidget';

export const GlobalMarketsTab = () => {
  return (
    <Motion.div
      key="global-markets"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-12"
    >
      {/* Global Indices Section */}
      <div className="space-y-6">
        <SectionHeader 
          icon={Globe2} 
          title="Global Indices" 
          subtitle="Real-time Pulse of World Markets" 
          color="gold" 
        />
        
        <div className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden min-h-[120px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-journal-gold/5 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 w-full overflow-x-auto">
            <GlobalMarketsWidget />
          </div>
        </div>
      </div>

      {/* Commodities Section */}
      <div className="space-y-6">
        <SectionHeader 
          icon={Droplets} 
          title="Commodities" 
          subtitle="Energy & Precious Metals" 
          color="gold" 
        />
        
        <div className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden flex items-center justify-center min-h-[160px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-journal-gold/5 blur-[100px] pointer-events-none" />
          <div className="relative z-10 w-full overflow-x-auto">
             <CommoditiesWidget />
          </div>
        </div>
      </div>

      {/* Crypto Section */}
      <div className="space-y-6">
        <SectionHeader 
          icon={Bitcoin} 
          title="Crypto Assets" 
          subtitle="Digital Volatility Trackers" 
          color="gold" 
        />
        
        <div className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden flex items-center justify-center min-h-[160px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-journal-gold/5 blur-[100px] pointer-events-none" />
          <div className="relative z-10 w-full overflow-x-auto">
             <CryptoWidget />
          </div>
        </div>
      </div>

      {/* Macro Indicators Section */}
      <div className="space-y-6">
        <SectionHeader 
          icon={Activity} 
          title="Macro & Fear Indicators" 
          subtitle="Systemic Risk, Currencies & Yields" 
          color="gold" 
        />
        
        <div className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden min-h-[160px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-journal-gold/5 blur-[100px] pointer-events-none" />
          <div className="relative z-10 w-full">
             <MacroIndicatorsWidget />
          </div>
        </div>
      </div>
    </Motion.div>
  );
};
