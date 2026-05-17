import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Filter, Search, Edit3,
  ArrowUpDown, ExternalLink, ImageIcon, CheckCircle, XCircle, Plus, X, Trash2
} from 'lucide-react';
import { JOURNAL_COLUMNS } from '../../constants/journalColumns';
import { DB_FIELDS } from '../../constants/fieldMappings';
import { formatCurrency } from '../../utils';
import { FullTextModal } from './JournalModals';

const MasterTable = ({ trades, onEditTrade, onDeleteTrade, onViewImage, onTabChange }) => {
  const [activeTab, setActiveTab] = useState('This Month');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState([]); // Array of { field, value, type, op }
  const [activeFilterPopup, setActiveFilterPopup] = useState(null); // field name only
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [viewingText, setViewingText] = useState(null);
  // NEW FEATURE START: Hover Tooltip State
  const [hoveredCell, setHoveredCell] = useState(null);
  // NEW FEATURE END
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
  const itemsPerPage = 10;

  const columns = JOURNAL_COLUMNS;

  // Helper to get trade value directly from literal keys
  const getVal = (s, key) => {
    if (!s) return '';
    return s[key] || '';
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
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Chronological Sort for dates (use jsDate instead of string)
      if (sortConfig.key === 'date') {
        aVal = a.jsDate instanceof Date ? a.jsDate.getTime() : 0;
        bVal = b.jsDate instanceof Date ? b.jsDate.getTime() : 0;
      } else {
        // Fallback to getVal for alias-based fields if direct access is missing
        if (aVal === undefined) aVal = getVal(a, sortConfig.key);
        if (bVal === undefined) bVal = getVal(b, sortConfig.key);
      }

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
    return processedTrades.reduce((sum, t) => sum + (parseFloat(getVal(t, 'pl')) || 0), 0);
  }, [processedTrades]);

  return (
    <div className="space-y-4 journal-glass rounded-2xl border-journal-gold/10 p-1">
      {/* Table Header Area */}
      <div className="flex flex-col gap-4 p-4 pb-2">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full">
          {/* Timeline Tabs */}
          <div className="flex flex-wrap md:flex-nowrap bg-journal-secondary/50 p-1 rounded-xl border border-white/10 backdrop-blur-md w-full xl:w-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => { 
                  setActiveTab(tab); 
                  setCurrentPage(1); 
                  if (onTabChange) onTabChange(tab);
                }}
                className={`
                  flex-1 md:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                  ${activeTab === tab
                    ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20'
                    : 'text-journal-text-muted hover:text-white'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-journal-text-muted" size={14} />
                <input
                  type="text"
                  placeholder="Universal trade search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-journal-secondary/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none focus:border-journal-gold/30 transition-all"
                />
             </div>
             <div className={`px-4 py-2 rounded-xl border backdrop-blur-md flex flex-col items-end min-w-[140px] flex-shrink-0 ${totalPL >= 0 ? 'border-journal-green/20 bg-journal-green/5' : 'border-journal-red/20 bg-journal-red/5'}`}>
               <p className="text-[7px] font-black uppercase text-journal-text-muted tracking-[0.2em]">Period Net P&L</p>
               <p className={`text-sm font-black tabular-nums leading-tight ${totalPL >= 0 ? 'text-journal-green' : 'text-journal-red'}`}>
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



      {/* Table Container with Horizontal Scroll & Visual Cue */}
      <div className="relative group/table">
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
                    px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-journal-text-muted cursor-pointer hover:text-journal-gold transition-colors border-b border-white/5 group/th relative
                    ${col.sticky ? 'md:sticky md:left-0 z-10 md:z-20 md:bg-journal-bg' : 'z-10'}
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
                                  onClick={(e) => e.target.showPicker?.()}
                                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none [color-scheme:dark]"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">End Window</label>
                                <input 
                                  type="date"
                                  value={customDateRange.end}
                                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                  onClick={(e) => e.target.showPicker?.()}
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
                className="hover:bg-journal-gold/[0.03] odd:bg-journal-bg even:bg-journal-secondary/30 transition-colors group"
              >
                {columns.map(col => {
                  const val = trade[col.key];
                  
                  // Specialized Rendering based on Column Type
                  const renderCell = () => {
                    if (col.type === 'date') {
                      return <span className="text-[10px] font-bold text-slate-300">{val ? new Date(val).toDateString() : '-'}</span>;
                    }
                    if (col.key === 'W/L' || col.key === 'isWin') {
                      const isWin = val === 'WIN' || trade.isWin === true;
                      return (
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isWin ? 'text-journal-green' : 'text-journal-red'}`}>
                          {val || (isWin ? 'WIN' : 'LOSS')}
                        </span>
                      );
                    }
                    if (col.key === 'pl') {
                      const numVal = parseFloat(val?.toString().replace(/[₹,]/g, '')) || 0;
                      return (
                        <span className={`text-[11px] font-black tabular-nums ${numVal >= 0 ? 'text-journal-green' : 'text-journal-red'}`}>
                          {formatCurrency(numVal)}
                        </span>
                      );
                    }
                    if (col.key === 'chartScreenshotUrl' || col.key === 'imageUrl') {
                      return val ? (
                        <div 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const allImages = processedTrades.map(t => t.chartScreenshotUrl || t.imageUrl).filter(Boolean);
                            onViewImage(val, allImages); 
                          }}
                          className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-800 hover:border-journal-gold/50 transition-all cursor-pointer"
                        >
                          <img src={val} className="w-full h-full object-cover" />
                        </div>
                      ) : '-';
                    }
                    if (col.type === 'array') {
                      const arr = Array.isArray(val) ? val : (val ? val.split(', ') : []);
                      return (
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {arr.map(s => <span key={s} className="px-1 py-0.5 rounded bg-white/[0.05] border border-white/5 text-[8px] font-bold text-slate-300 uppercase">{s}</span>)}
                        </div>
                      );
                    }
                    
                    // Default Text Cell
                    return <span className="text-[10px] font-bold text-slate-200">{String(val || '-')}</span>;
                  };

                  return (
                    <td 
                      key={col.key}
                      onClick={() => (col.type === 'text' || col.key.includes('Reason') || col.key === 'reason') && setViewingText({ title: col.label, content: val })}
                      // NEW FEATURE START: Hover Tooltip Handlers
                      onMouseEnter={(e) => {
                        const isImage = col.key === 'chartScreenshotUrl' || col.key === 'imageUrl';
                        if (isImage && val) {
                          setHoveredCell({
                            content: val,
                            isImage: true,
                            x: e.clientX,
                            y: e.clientY
                          });
                          return;
                        }
                        const content = String(val || '');
                        const isExpandable = col.type === 'text' || col.key.includes('Reason') || col.key === 'reason';
                        if (isExpandable && content.length > 25) {
                          setHoveredCell({
                            content,
                            isImage: false,
                            x: e.clientX,
                            y: e.clientY
                          });
                        }
                      }}
                      onMouseMove={(e) => {
                        if (hoveredCell) {
                          setHoveredCell(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      // NEW FEATURE END
                      className={`px-6 py-4 truncate max-w-[200px] ${col.sticky ? 'md:sticky md:left-0 z-10 md:bg-journal-bg/80 md:backdrop-blur-md group-hover:bg-white/[0.05]' : ''} ${(col.type === 'text' || col.key.includes('Reason') || col.key === 'reason') ? 'cursor-pointer hover:text-white' : ''}`}
                    >
                      {renderCell()}
                    </td>
                  );
                })}
                
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
      {/* Right edge scroll shadow cue */}
      <div className="absolute top-0 right-0 bottom-0 w-12 pointer-events-none bg-gradient-to-l from-slate-950/20 to-transparent opacity-0 group-hover/table:opacity-100 transition-opacity" />
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

      {/* NEW FEATURE START: Hover Tooltip Popup (Portaled to Body) */}
      {createPortal(
        <AnimatePresence>
          {hoveredCell && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`fixed z-[9999] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-none ${hoveredCell.isImage ? 'p-1.5' : 'p-4 max-w-xs'} bg-slate-900/95`}
              style={{ 
                left: Math.min(hoveredCell.x + 15, window.innerWidth - (hoveredCell.isImage ? 320 : 320)), 
                top: Math.min(hoveredCell.y + 15, window.innerHeight - (hoveredCell.isImage ? 250 : 100)) 
              }}
            >
              {hoveredCell.isImage ? (
                <img 
                  src={hoveredCell.content} 
                  alt="Trade Screenshot" 
                  className="w-[280px] h-auto max-h-[220px] object-cover rounded-xl"
                />
              ) : (
                <p className="text-[11px] font-medium text-slate-200 leading-relaxed italic relative z-10">
                  "{hoveredCell.content}"
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {/* NEW FEATURE END */}
    </div>
  );
};

export default MasterTable;
