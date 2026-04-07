import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Filter, Search, Edit3,
  ArrowUpDown, ExternalLink, ImageIcon, CheckCircle, XCircle, Plus, X, Trash2
} from 'lucide-react';
import { formatCurrency } from '../../utils';

const MasterTable = ({ trades, onEditTrade, onDeleteTrade, onViewImage }) => {
  const [activeTab, setActiveTab] = useState('Today');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState([]); // Array of { field, value }
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const filterMenuRef = useRef(null);

  // Click outside listener for filter menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
    };
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterMenuOpen]);

  const itemsPerPage = 50;

  // Filter Options
  const filterOptions = [
    { field: 'tradeQuality', label: 'Quality', type: 'cat' },
    { field: 'pl', label: 'Net P&L', type: 'num' },
    { field: 'positionSize', label: 'Pos Size', type: 'num' }
  ];

  const getUniqueValues = (field) => {
    return Array.from(new Set(trades.map(t => t[field]).filter(Boolean))).sort();
  };

  const addFilter = (field, value, type = 'cat', op = '=') => {
    if (type === 'cat') {
      if (!filters.find(f => f.field === field && f.value === value)) {
        setFilters([...filters, { field, value, type, op }]);
      }
    } else {
      // Numeric filters (Remove existing same-field/same-op filter first)
      const otherFilters = filters.filter(f => !(f.field === field && f.op === op));
      if (value !== '') {
        setFilters([...otherFilters, { field, value: parseFloat(value), type, op }]);
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
      result = result.filter(t =>
        t.market?.toLowerCase().includes(lowerSearch) ||
        t.strategy?.toLowerCase().includes(lowerSearch) ||
        t.learning?.toLowerCase().includes(lowerSearch)
      );
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

    // Advanced Multi-Select Filters (Notion-style: OR within field, AND across fields)
    if (filters.length > 0) {
      result = result.filter(t => {
        return filters.every(f => {
          if (f.type === 'cat') {
            const grouped = filters.filter(inner => inner.field === f.field && inner.type === 'cat');
            return grouped.length === 0 || grouped.some(inner => String(t[inner.field]).toLowerCase() === String(inner.value).toLowerCase());
          } else {
            const val = parseFloat(t[f.field]) || 0;
            if (f.op === '>') return val > f.value;
            if (f.op === '<') return val < f.value;
            return true;
          }
        });
      });
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
  }, [filteredByTab, searchTerm, sortConfig, filters]);

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

  const columns = [
    { key: 'market', label: 'Market', sticky: true },
    { key: 'date', label: 'Date' },
    { key: 'pl', label: 'P&L' },
    { key: 'direction', label: 'Dir' },
    { key: 'isWin', label: 'Win/Loss' },
    { key: 'tradeMode', label: 'Trade Mode' },
    { key: 'lots', label: 'Pos Size' },
    { key: 'positionType', label: 'Type' },
    { key: 'quality', label: 'Quality' },
    { key: 'status', label: 'Status' },
    { key: 'setups', label: 'Setups' },
    { key: 'emotion', label: 'Emotion' },
    { key: 'reason', label: 'Loss Reason' },
    { key: 'reasonForTrade', label: 'Trade Reason' },
    { key: 'learning', label: 'Learning' }
  ];

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
                  : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Persistent Horizontal Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/30 p-2 rounded-2xl border border-white/5">
            {/* Custom Date Range */}
            <div className="flex items-center gap-2 border-r border-white/5 pr-3">
               <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Start Window</label>
                  <input 
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-transparent text-[10px] font-bold text-white outline-none w-24 [color-scheme:dark]"
                  />
               </div>
               <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">End Window</label>
                  <input 
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent text-[10px] font-bold text-white outline-none w-24 [color-scheme:dark]"
                  />
               </div>
            </div>

            {/* P&L Range */}
            <div className="flex items-center gap-2 border-r border-white/5 pr-3">
               <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">P&L &gt;</label>
                  <input 
                    type="number"
                    placeholder="Min"
                    onBlur={(e) => addFilter('pl', e.target.value, 'num', '>')}
                    className="bg-transparent text-[10px] font-bold text-emerald-400 placeholder:text-slate-600 outline-none w-16"
                  />
               </div>
               <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">P&L &lt;</label>
                  <input 
                    type="number"
                    placeholder="Max"
                    onBlur={(e) => addFilter('pl', e.target.value, 'num', '<')}
                    className="bg-transparent text-[10px] font-bold text-journal-red placeholder:text-slate-600 outline-none w-16"
                  />
               </div>
            </div>

            {/* Cat Filter Toggle */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filters.length > 0 ? 'border-journal-gold text-journal-gold shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 'border-slate-800 text-slate-500'}`}
              >
                <Filter size={12} />
                Categories
              </button>
              <AnimatePresence>
                {isFilterMenuOpen && (
                  <motion.div 
                    ref={filterMenuRef}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[150] overflow-hidden"
                  >
                    <div className="max-h-64 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                      {filterOptions.filter(o => o.type === 'cat').map(opt => (
                        <div key={opt.field} className="space-y-1.5">
                          <p className="text-[9px] font-black text-slate-500 uppercase ml-1">{opt.label}</p>
                          <div className="flex flex-wrap gap-1">
                            {getUniqueValues(opt.field).map(val => (
                              <button
                                key={val}
                                onClick={() => addFilter(opt.field, val, 'cat')}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${filters.find(f => f.field === opt.field && f.value === val) ? 'bg-journal-gold text-journal-bg' : 'bg-slate-950/50 border border-slate-800 text-slate-400 hover:border-slate-600'}`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Second Row: Search / Tags / Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Search description/markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/30 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs font-bold text-white outline-none focus:border-journal-gold/30 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {(customDateRange.start || customDateRange.end) && (
                 <span className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                   Window Active
                   <X size={10} className="hover:text-journal-red cursor-pointer" onClick={() => setCustomDateRange({ start: '', end: '' })} />
                 </span>
              )}
              {filters.map((f, i) => (
                <span key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-journal-gold/10 border border-journal-gold/30 text-[9px] font-black text-journal-gold uppercase tracking-tighter">
                  {f.field}: {f.op !== '=' ? f.op : ''} {f.value}
                  <X size={10} className="hover:text-white cursor-pointer" onClick={() => removeFilter(i)} />
                </span>
              ))}
              {(filters.length > 0 || customDateRange.start || customDateRange.end) && (
                <button 
                  onClick={() => { setFilters([]); setCustomDateRange({ start: '', end: '' }); }}
                  className="text-[9px] font-bold text-slate-600 hover:text-white underline ml-1"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className={`px-4 py-1.5 rounded-xl border backdrop-blur-md flex flex-col items-end min-w-[140px] ${totalPL >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
             <p className="text-[7px] font-black uppercase text-slate-500 tracking-[0.2em]">Net Performance</p>
             <p className={`text-sm font-black tabular-nums leading-tight ${totalPL >= 0 ? 'text-emerald-400' : 'text-journal-red'}`}>
               {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
             </p>
          </div>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[1800px]">
          <thead>
            <tr className="bg-slate-950/20">

              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => requestSort(col.key)}
                  className={`
                    px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-journal-gold transition-colors border-b border-white/5
                    ${col.sticky ? 'sticky left-0 z-20 bg-slate-950/90' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    <ArrowUpDown size={10} className={sortConfig.key === col.key ? 'text-journal-gold' : 'opacity-30'} />
                  </div>
                </th>
              ))}
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">Media</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 text-right">Actions</th>
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
                <td className="px-6 py-4 text-[10px] font-bold text-slate-400 whitespace-nowrap">{trade.fullDate}</td>
                <td className={`px-6 py-4 text-[11px] font-black tabular-nums ${trade.pl >= 0 ? 'text-emerald-400' : 'text-journal-red'}`}>
                  {formatCurrency(trade.pl)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${['LONG', 'B'].includes(String(trade.direction).toUpperCase()) ? 'text-indigo-400 bg-indigo-500/10' : 'text-orange-400 bg-orange-500/10'}`}>
                    {trade.direction}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {['WIN', 'W'].includes(String(trade.isWin).toUpperCase()) || trade.winFlag === 1 || (trade.pl > 0 && !['LOSS', 'L', 'NEUTRAL', 'NETURAL', 'BE'].includes(String(trade.isWin).toUpperCase())) ? (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{String(trade.isWin)}</span>
                    </div>
                  ) : ['NEUTRAL', 'NETURAL', 'BE', 'BREAK EVEN'].includes(String(trade.isWin).toUpperCase()) ? (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <ChevronRight size={12} className="rotate-90" />
                      <span className="text-[9px] font-black uppercase tracking-widest">{String(trade.isWin)}</span>
                    </div>
                  ) : ['RUNNING'].includes(String(trade.isWin).toUpperCase()) ? (
                    <div className="flex items-center gap-1.5 text-journal-gold">
                      <Plus size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{String(trade.isWin)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-journal-red">
                      <XCircle size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{String(trade.isWin)}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                  {trade.tradeMode}
                </td>
                <td className="px-6 py-4 text-[11px] font-bold text-slate-200">{trade.positionSize || trade.lots}</td>
                <td className="px-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">{trade.positionType}</td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-black italic text-journal-gold">{trade.tradeQuality || trade.quality}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[9px] font-bold uppercase text-slate-500">{trade.tradeStatus || trade.status}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {trade.setups?.map(s => (
                      <span key={s} className="px-1 py-0.5 rounded bg-white/[0.05] border border-white/5 text-[8px] font-bold text-slate-400 uppercase">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-300">{trade.emotions || trade.emotion}</td>
                <td className="px-6 py-4 text-[10px] font-medium text-slate-500 truncate max-w-[150px]">{trade.lossReasons?.join(', ') || trade.lossReason || trade.reason}</td>
                <td className="px-6 py-4 text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{trade.reasonForTrade}</td>
                <td className="px-6 py-4 text-[10px] font-medium text-slate-300 italic truncate max-w-[200px]">{trade.learning}</td>
                <td
                  className="px-6 py-4 cursor-pointer"
                  onClick={(e) => {
                    const url = trade.screenshotUrl || trade.chartScreenshotUrl;
                    if (url) {
                      console.log('[Lightbox] Opening Image:', url);
                      onViewImage(url);
                    }
                  }}
                >
                  {trade.screenshotUrl || trade.chartScreenshotUrl ? (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-800 group-hover:border-journal-gold/50 transition-all pointer-events-none">
                      <img src={trade.screenshotUrl || trade.chartScreenshotUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-journal-bg/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon size={12} className="text-white" />
                      </div>
                    </div>
                  ) : <div className="w-8 h-8 bg-slate-900 rounded-lg" />}
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
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Showing <span className="text-slate-300">{currentTrades.length}</span> of <span className="text-slate-300">{processedTrades.length}</span> records
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-500 disabled:opacity-20 hover:border-journal-gold/30 hover:text-journal-gold transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-black text-journal-gold px-2">PAGE {currentPage} / {totalPages || 1}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-500 disabled:opacity-20 hover:border-journal-gold/30 hover:text-journal-gold transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterTable;
