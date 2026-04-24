import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Calculator as CalcIcon, Download, X, FileText, LayoutDashboard, Share2, IndianRupee } from 'lucide-react';
import { exportToCSV } from '../../utils/csvUtility';
import GlobalCalculator from './GlobalCalculator';
import CurrencyConverter from './CurrencyConverter';
import { supabaseService } from '../../services/supabaseService';

const UtilityHub = ({ user, trades = [], snapshots = [], notes = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // NEW FEATURE START
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      
      if (e.key.toLowerCase() === 'c') {
        // If calculator is not open, open converter
        // We check if calculator is open to avoid conflict (calculator uses 'c' for clear)
        if (!showCalc) {
          e.preventDefault();
          setShowConverter(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCalc]);
  // NEW FEATURE END

  const handleExportAll = async () => {
    if (!user?.id) {
      alert("Terminal Session must be active for raw export.");
      return;
    }

    try {
      setIsDownloading(true);
      
      // 1. Fetch RAW Trades (All columns, Un-normalized)
      const rawTradesFetched = await supabaseService.fetchRawTableData('trades', user.id);
      exportToCSV(rawTradesFetched, 'RAW_Trades_Master');
      
      // 2. Fetch RAW Snapshots
      const rawSnapshotsFetched = await supabaseService.fetchRawTableData('snapshots', user.id);
      setTimeout(() => {
        exportToCSV(rawSnapshotsFetched, 'RAW_Snapshots_Master');
      }, 500);

      // 3. Fetch RAW Notes
      const rawNotesFetched = await supabaseService.fetchRawTableData('notes', user.id);
      setTimeout(() => {
        exportToCSV(rawNotesFetched, 'RAW_Notes_Master');
      }, 1000);
      
    } catch (error) {
      console.error("[Backup] Raw Export failed:", error);
      alert("Deep fetch failed. Check terminal logs.");
    } finally {
      setIsDownloading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 lg:bottom-10 left-6 lg:left-10 z-[50]">
        <div className="relative">
          {/* Sub Icons */}
          <AnimatePresence>
            {isOpen && (
              <div className="absolute bottom-full left-0 mb-4 flex flex-col gap-3">
                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => { setShowCalc(true); setIsOpen(false); }}
                  className="w-12 h-12 rounded-2xl journal-glass border border-white/10 flex items-center justify-center text-journal-gold shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                  title="Universal Calculator"
                >
                  <CalcIcon size={20} />
                  <span className="absolute left-full ml-3 px-3 py-1 rounded-lg bg-slate-900 border border-white/5 text-[8px] font-black uppercase text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Calculator</span>
                </motion.button>

                {/* NEW FEATURE START */}
                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => { setShowConverter(true); setIsOpen(false); }}
                  className="w-12 h-12 rounded-2xl journal-glass border border-white/10 flex items-center justify-center text-emerald-400 shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                  title="Currency Converter"
                >
                  <IndianRupee size={20} />
                  <span className="absolute left-full ml-3 px-3 py-1 rounded-lg bg-slate-900 border border-white/5 text-[8px] font-black uppercase text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Converter</span>
                </motion.button>
                {/* NEW FEATURE END */}

                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ delay: 0 }}
                  onClick={handleExportAll}
                  className="w-12 h-12 rounded-2xl journal-glass border border-white/10 flex items-center justify-center text-emerald-400 shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                  title="Export Separate Collections"
                >
                  <Download size={20} />
                  <span className="absolute left-full ml-3 px-3 py-1 rounded-lg bg-slate-900 border border-white/5 text-[8px] font-black uppercase text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Export CSV</span>
                </motion.button>
              </div>
            )}
          </AnimatePresence>

          {/* Main FAB */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center shadow-2xl transition-all duration-500 border-2 ${
              isOpen ? 'bg-rose-500 border-rose-400 text-white rotate-90 shadow-rose-500/30' : 'bg-journal-gold border-journal-gold/30 text-journal-bg shadow-journal-gold/30'
            }`}
          >
            {isOpen ? <X size={24} /> : <Settings size={24} className="animate-spin-slow" />}
          </motion.button>
        </div>
      </div>

      <GlobalCalculator isOpen={showCalc} onClose={() => setShowCalc(false)} />
      {/* NEW FEATURE START */}
      <CurrencyConverter isOpen={showConverter} onClose={() => setShowConverter(false)} />
      {/* NEW FEATURE END */}
    </>
  );
};

export default UtilityHub;
