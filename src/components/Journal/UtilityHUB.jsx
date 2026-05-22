import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Calculator as CalcIcon, Download, X, FileText, LayoutDashboard, Share2, IndianRupee, Database } from 'lucide-react';
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
      
      if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setShowCalc(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  // NEW FEATURE END

  const generateSQLBackup = (data) => {
    let sql = `-- SUPABASE MASTER BACKUP\n-- Generated: ${new Date().toISOString()}\n\n`;
    
    Object.entries(data).forEach(([tableName, rows]) => {
      if (!rows || rows.length === 0) return;
      
      sql += `-- Table: ${tableName}\n`;
      rows.forEach(row => {
        const columns = Object.keys(row).map(k => `"${k}"`).join(', ');
        const values = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return v;
        }).join(', ');
        
        sql += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
      });
      sql += '\n';
    });
    
    return sql;
  };

  const handleExportAll = async () => {
    if (!user?.id) {
      alert("Terminal Session must be active for raw export.");
      return;
    }

    try {
      setIsDownloading(true);
      const tables = ['trades', 'snapshots', 'notes', 'goals', 'alerts'];
      const backupData = {};

      // 1. Fetch all data for SQL backup
      for (const table of tables) {
        try {
          const rawData = await supabaseService.fetchRawTableData(table, user.id);
          backupData[table] = rawData;
        } catch (e) {
          console.warn(`[Backup] Failed to fetch ${table}`, e);
        }
      }

      // 2. Generate and Download SQL
      const sqlContent = generateSQLBackup(backupData);
      const sqlBlob = new Blob([sqlContent], { type: 'application/sql' });
      const sqlUrl = URL.createObjectURL(sqlBlob);
      const sqlLink = document.createElement('a');
      sqlLink.href = sqlUrl;
      sqlLink.download = `SUPABASE_BACKUP_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(sqlLink);
      sqlLink.click();
      document.body.removeChild(sqlLink);
      URL.revokeObjectURL(sqlUrl);

      // 3. Trigger individual CSV downloads (with delays to avoid browser blocking)
      if (backupData.trades) exportToCSV(backupData.trades, 'RAW_Trades_Master');
      
      setTimeout(() => {
        if (backupData.snapshots) exportToCSV(backupData.snapshots, 'RAW_Snapshots_Master');
      }, 500);

      setTimeout(() => {
        if (backupData.notes) exportToCSV(backupData.notes, 'RAW_Notes_Master');
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

                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ delay: 0 }}
                  onClick={handleExportAll}
                  className="w-12 h-12 rounded-2xl journal-glass border border-white/10 flex items-center justify-center text-journal-gold shadow-2xl hover:scale-110 active:scale-95 transition-all group"
                  disabled={isDownloading}
                  title="Full Backup (CSV + SQL)"
                >
                  <Download size={20} className={isDownloading ? 'animate-pulse' : ''} />
                  <span className="absolute left-full ml-3 px-3 py-1 rounded-lg bg-slate-900 border border-white/5 text-[8px] font-black uppercase text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Export CSV & SQL</span>
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
      <CurrencyConverter isOpen={showConverter} onClose={() => setShowConverter(false)} />
    </>
  );
};

export default UtilityHub;

