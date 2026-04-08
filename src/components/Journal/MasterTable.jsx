import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Filter, Search, Edit3,
  ArrowUpDown, ExternalLink, ImageIcon, CheckCircle, XCircle, Plus, X, Trash2
} from 'lucide-react';
import { JOURNAL_COLUMNS } from '../../constants/journalColumns';
import { formatCurrency } from '../../utils';
import { FullTextModal } from './JournalModals';

const MasterTable = ({ trades, onEditTrade, onDeleteTrade, onViewImage }) => {
  const [activeTab, setActiveTab] = useState('Today');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState([]); // Array of { field, value, type, op }
  const [activeFilterPopup, setActiveFilterPopup] = useState(null); // field name only
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [viewingText, setViewingText] = useState(null);
  const popoverRef = useRef(null);

  // Click outside listener for dynamic popovers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActiveFilterPopup(null);
      }
    };
    if (activeFilterPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeFilterPopup]);
  const itemsPerPage = 50;

  const columns = JOURNAL_COLUMNS;

  // Helper to get trade value with alias support
  const getVal = (trade, key) => {
    if (!trade) return '';
    const aliases = {
      'quality': ['tradeQuality', 'quality'],
      'status': ['tradeStatus', 'status'],
      'emotion': ['emotions', 'emotion'],
      'reason': ['lossReasons', 'lossReason', 'reason'], // Check array variant first
      'lots': ['positionSize', 'lots'],
      'learning': ['learning', 'Learning '],
      'reasonForTrade': ['reasonForTrade', 'Reson For Trade', 'reason'],
      'rr': ['rr', 'Taken RR', 'takenRR']
    };

    if (aliases[key]) {
      for (const alias of aliases[key]) {
        if (trade[alias] !== undefined && trade[alias] !== '') return trade[alias];
        // Fallback to originalData from migration
        if (trade.originalData && trade.originalData[alias] !== undefined && trade.originalData[alias] !== '') return trade.originalData[alias];
      }
    }
    const directVal = trade[key];
    if (directVal !== undefined && directVal !== '') return directVal;
    
    // Final fallback to originalData for the key itself
    if (trade.originalData && trade.originalData[key] !== undefined) return trade.originalData[key];
    
    return '';
  };

  const getUniqueValues = (field) => {
    const values = trades.flatMap(t => {
      const val = getVal(t, field);
      return Array.isArray(val) ? val : [val];
    }).filter(Boolean);
    return Array.from(new Set(values)).sort();
  };

  const addFilter = (field, value, type = 'cat', op = '=') => {
    if (type === 'cat' || type === 'array') {
      if (!filters.find(f => f.field === field && f.value === value)) {
        setFilters([...filters, { field, value, type, op }]);
      }
    } else {
      const otherFilters = filters.filter(f => !(f.field === field && f.op === op));
      if (value !== '') {
        setFilters([...otherFilters, { field, value, type, op }]);
      } else {
        setFilters(otherFilters);
      }
    }
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Tabs Filter Logic
  const filteredByTab = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();

    return trades.filter(t => {
      const tradeDate = t.jsDate;
      if (!tradeDate) return false;

      switch (activeTab) {
        case 'Today':
          return tradeDate.toDateString() === today;
        case 'This Week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return tradeDate >= startOfWeek;
        case 'This Month':
          return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
        case 'This Year':
          return tradeDate.getFullYear() === now.getFullYear();
        case 'All Trades':
        default:
          return true;
      }
    });
  }, [trades, activeTab]);

  // Search & Advanced Filter Logic
  const processedTrades = useMemo(() => {
    let result = [...filteredByTab];

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => {
        const setupsStr = Array.isArray(t.setups) ? t.setups.join(' ') : (t.setups || '');
        const lossReasonStr = String(getVal(t, 'reason'));
        const learningStr = String(getVal(t, 'learning'));
        const reasonForTradeStr = String(getVal(t, 'reasonForTrade'));

        return (
          t.market?.toLowerCase().includes(lowerSearch) ||
          t.strategy?.toLowerCase().includes(lowerSearch) ||
          learningStr.toLowerCase().includes(lowerSearch) ||
          lossReasonStr.toLowerCase().includes(lowerSearch) ||
          reasonForTradeStr.toLowerCase().includes(lowerSearch) ||
          setupsStr.toLowerCase().includes(lowerSearch)
        );
      });
    }

    // Advanced Filters
    if (filters.length > 0) {
      result = result.filter(t => {
        return filters.every(f => {
          const rawVal = getVal(t, f.field);
          
          if (f.type === 'cat') {
            const grouped = filters.filter(inner => inner.field === f.field && inner.type === 'cat');
            return grouped.length === 0 || grouped.some(inner => String(rawVal).toLowerCase() === String(inner.value).toLowerCase());
          } 
          
          if (f.type === 'array') {
            const grouped = filters.filter(inner => inner.field === f.field && inner.type === 'array');
            const tradeArray = Array.isArray(rawVal) ? rawVal : [rawVal];
            return grouped.length === 0 || grouped.some(inner => tradeArray.some(s => String(s).toLowerCase() === String(inner.value).toLowerCase()));
          }

          if (f.type === 'num') {
            const val = parseFloat(rawVal) || 0;
            const threshold = parseFloat(f.value);
            if (f.op === '>') return val >= threshold;
            if (f.op === '<') return val <= threshold;
          }

          if (f.type === 'text') {
            return String(rawVal).toLowerCase().includes(String(f.value).toLowerCase());
          }

          return true;
        });
      });
    }

    // Custom Date Range
    if (customDateRange.start) {
      const start = new Date(customDateRange.start);
      start.setHours(0, 0, 0, 0);
      result = result.filter(t => t.jsDate && t.jsDate >= start);
    }
    if (customDateRange.end) {
      const end = new Date(customDateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => t.jsDate && t.jsDate <= end);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredByTab, searchTerm, sortConfig, filters, customDateRange]);

  // Pagination
  const totalPages = Math.ceil(processedTrades.length / itemsPerPage);
  const currentTrades = processedTrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const tabs = ['Today', 'This Week', 'This Month', 'This Year', 'All Trades'];

  // Calculate Total P&L
  const totalPL = useMemo(() => {
    return processedTrades.reduce((sum, t) => sum + (parseFloat(t.pl) || 0), 0);
  }, [processedTrades]);

  return (
    <div className="space-y-4 journal-glass rounded-2xl border-journal-gold/10 p-1">
      {/* Table Header Area */}
      <div className="flex flex-col gap-4 p-4 pb-2">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Timeline Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                  ? 'bg-journal-gold text-journal-bg shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                  : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Universal trade search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950/30 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none focus:border-journal-gold/30 transition-all"
                />
             </div>
             <div className={`px-4 py-2 rounded-xl border backdrop-blur-md flex flex-col items-end min-w-[140px] ${totalPL >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
               <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em]">Period Net P&L</p>
               <p className={`text-sm font-black tabular-nums leading-tight ${totalPL >= 0 ? 'text-emerald-400' : 'text-journal-red'}`}>
                 {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
               </p>
             </div>
          </div>
        </div>

        {/* Smart Pill Bar (Active Filters) */}
        {(filters.length > 0 || customDateRange.start || customDateRange.end) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Active Parameters:</span>
            {customDateRange.start && (
              <span className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase">
                From: {customDateRange.start}
                <X size={10} className="hover:text-journal-red cursor-pointer" onClick={() => setCustomDateRange(prev => ({ ...prev, start: '' }))} />
              </span>
            )}
            {customDateRange.end && (
              <span className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase">
                To: {customDateRange.end}
                <X size={10} className="hover:text-journal-red cursor-pointer" onClick={() => setCustomDateRange(prev => ({ ...prev, end: '' }))} />
              </span>
            )}
            {filters.map((f, i) => (
              <span key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-journal-gold/10 border border-journal-gold/30 text-[9px] font-black text-journal-gold uppercase">
                {f.field}: {f.op !== '=' ? f.op : ''} {f.value}
                <X size={10} className="hover:text-white cursor-pointer" onClick={() => removeFilter(i)} />
              </span>
            ))}
            <button 
              onClick={() => { setFilters([]); setCustomDateRange({ start: '', end: '' }); }}
              className="text-[9px] font-bold text-journal-red hover:underline ml-2 uppercase"
            >
              Reset All
            </button>
          </div>
        )}
      </div>



      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[1800px]">
          <thead>
            <tr className="bg-slate-950/20">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => {
                    setActiveFilterPopup(activeFilterPopup === col.key ? null : col.key);
                  }}
                  className={`
                    px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:text-journal-gold transition-colors border-b border-white/5 group/th relative
                    ${col.sticky ? 'sticky left-0 z-20 bg-slate-950/90' : 'z-10'}
                    ${filters.some(f => f.field === col.key) || (col.type === 'date' && (customDateRange.start || customDateRange.end)) ? 'text-journal-gold' : ''}
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {col.label}
                      <Filter size={10} className={`opacity-0 group-hover/th:opacity-100 transition-opacity ${filters.some(f => f.field === col.key) ? 'opacity-100 text-journal-gold' : ''}`} />
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        requestSort(col.key);
                      }}
                      className="p-1 hover:bg-white/5 rounded-md transition-all"
                    >
                      <ArrowUpDown size={10} className={sortConfig.key === col.key ? 'text-journal-gold' : 'opacity-30'} />
                    </button>
                  </div>

                  {/* Attached Filter Popover */}
                  <AnimatePresence>
                    {activeFilterPopup === col.key && (
                      <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[100] cursor-default text-left normal-case tracking-normal"
                      >
                        <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-journal-gold tracking-[0.1em]">Filter {col.label}</p>
                          <button onClick={() => setActiveFilterPopup(null)} className="text-slate-400 hover:text-white"><X size={14} /></button>
                        </div>
                        
                        <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
                          {col.type === 'cat' || col.type === 'array' ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-1.5">
                                {getUniqueValues(col.key).map(val => (
                                  <button
                                    key={val}
                                    onClick={() => addFilter(col.key, val, col.type)}
                                    className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black transition-all ${
                                      filters.find(f => f.field === col.key && f.value === val)
                                      ? 'bg-journal-gold text-journal-bg border-journal-gold'
                                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : col.type === 'num' ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-black">&gt;</span>
                                  <input 
                                    type="number" placeholder="Min"
                                    onBlur={(e) => addFilter(col.key, e.target.value, 'num', '>')}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg pl-7 pr-2 py-2 text-[11px] text-white outline-none focus:border-journal-gold/30"
                                  />
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-black">&lt;</span>
                                  <input 
                                    type="number" placeholder="Max"
                                    onBlur={(e) => addFilter(col.key, e.target.value, 'num', '<')}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg pl-7 pr-2 py-2 text-[11px] text-white outline-none focus:border-journal-gold/30"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : col.type === 'date' ? (
                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Start Window</label>
                                <input 
                                  type="date"
                                  value={customDateRange.start}
                                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none [color-scheme:dark]"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-slate-400 uppercase">End Window</label>
                                <input 
                                  type="date"
                                  value={customDateRange.end}
                                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none [color-scheme:dark]"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                <input 
                                  type="text" placeholder={`Search...`}
                                  autoFocus
                                  onBlur={(e) => addFilter(col.key, e.target.value, 'text')}
                                  onKeyDown={(e) => e.key === 'Enter' && addFilter(col.key, e.target.value, 'text')}
                                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                           <button onClick={() => setActiveFilterPopup(null)} className="text-[9px] font-black uppercase text-journal-gold hover:underline">Apply Filter</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </th>
              ))}
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {currentTrades.map((trade) => (
              <motion.tr
                key={trade.id}
                layout
                className="hover:bg-white/[0.02] transition-colors group"
              >

                <td className="sticky left-0 z-10 bg-journal-bg/80 backdrop-blur-md px-6 py-4 font-black text-[11px] text-white tracking-widest uppercase italic group-hover:bg-white/[0.05]">
                  {trade.market}
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-300 whitespace-nowrap">{trade.fullDate}</td>
                <td className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest ${
                  (trade.isWin === true || String(trade.isWin).toUpperCase() === 'WIN') ? 'text-emerald-400' : 'text-journal-red'
                }`}>
                  {trade.isWin === true || String(trade.isWin).toUpperCase() === 'WIN' ? 'WIN' : 'LOSS'}
                </td>
                <td className={`px-6 py-4 text-[11px] font-black tabular-nums ${trade.pl >= 0 ? 'text-emerald-400' : 'text-journal-red'}`}>
                  {formatCurrency(trade.pl)}
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-200 tabular-nums">
                  {getVal(trade, 'rr') || '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${['LONG', 'B'].includes(String(trade.direction).toUpperCase()) ? 'text-indigo-400 bg-indigo-500/10' : 'text-orange-400 bg-orange-500/10'}`}>
                    {trade.direction}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-200">{getVal(trade, 'emotion')}</td>
                <td 
                  onClick={() => setViewingText({ title: 'Loss Reasons / Logic', content: Array.isArray(getVal(trade, 'reason')) ? getVal(trade, 'reason').join(', ') : getVal(trade, 'reason') })}
                  className="px-6 py-4 text-[10px] font-medium text-slate-400 truncate max-w-[150px] cursor-pointer hover:text-white transition-colors"
                >
                  {Array.isArray(getVal(trade, 'reason')) ? getVal(trade, 'reason').join(', ') : getVal(trade, 'reason')}
                </td>
                <td 
                  onClick={() => setViewingText({ title: 'Reason For Trade', content: getVal(trade, 'reasonForTrade') })}
                  className="px-6 py-4 text-[10px] font-medium text-slate-300 truncate max-w-[150px] cursor-pointer hover:text-white transition-colors"
                >
                  {getVal(trade, 'reasonForTrade')}
                </td>
                <td 
                  onClick={() => setViewingText({ title: 'Key Learning / Reflection', content: getVal(trade, 'learning') })}
                  className="px-6 py-4 text-[10px] font-medium text-slate-200 italic truncate max-w-[200px] cursor-pointer hover:text-white transition-colors"
                >
                   {getVal(trade, 'learning')}
                </td>
                <td className="px-6 py-4 text-[11px] font-bold text-slate-200">{getVal(trade, 'lots')}</td>
                <td className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">{trade.positionType || trade.type || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {trade.setups?.map(s => (
                      <span key={s} className="px-1 py-0.5 rounded bg-white/[0.05] border border-white/5 text-[8px] font-bold text-slate-300 uppercase">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black italic text-journal-gold">{getVal(trade, 'quality')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[9px] font-bold uppercase text-slate-300 bg-slate-800/50 px-2 py-1 rounded">{getVal(trade, 'status')}</span>
                </td>
                <td className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  {getVal(trade, 'tradeMode')}
                </td>
                <td className="px-6 py-4">
                   {getVal(trade, 'chartScreenshotUrl') ? (
                     <div 
                       onClick={() => onViewImage(getVal(trade, 'chartScreenshotUrl'))}
                       className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-800 hover:border-journal-gold/50 transition-all cursor-pointer"
                     >
                       <img src={getVal(trade, 'chartScreenshotUrl')} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-journal-bg/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                         <ImageIcon size={12} className="text-white" />
                       </div>
                     </div>
                   ) : <span className="text-slate-700">-</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onEditTrade(trade)}
                    className="p-2 rounded-lg text-slate-600 hover:text-journal-gold hover:bg-journal-gold/5 transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteTrade(trade.id)}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/5 transition-all"
                    title="Delete Trade"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 flex items-center justify-between border-t border-white/5 bg-slate-950/20 rounded-b-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Showing <span className="text-slate-300">{currentTrades.length}</span> of <span className="text-slate-300">{processedTrades.length}</span> records
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 disabled:opacity-20 hover:border-journal-gold/30 hover:text-journal-gold transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-black text-journal-gold px-2">PAGE {currentPage} / {totalPages || 1}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 disabled:opacity-20 hover:border-journal-gold/30 hover:text-journal-gold transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <FullTextModal 
        isOpen={!!viewingText}
        onClose={() => setViewingText(null)}
        title={viewingText?.title}
        content={viewingText?.content}
      />
    </div>
  );
};

export default MasterTable;
