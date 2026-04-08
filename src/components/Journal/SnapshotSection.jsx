import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Smile, Target, Tag, Edit3, Trash2, 
  ImageIcon, Calendar, BarChart3, ChevronLeft, ChevronRight, Search, 
  Filter, ArrowUpDown, X
} from 'lucide-react';
import { SNAPSHOT_COLUMNS } from '../../constants/journalColumns';
import { COMPLIANCE_OPTIONS } from '../../constants/journalOptions';

const SnapshotSection = ({ snapshots = [], onEditSnapshot, onDeleteSnapshot, onViewImage }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [filters, setFilters] = useState([]);
  const [activeFilterPopup, setActiveFilterPopup] = useState(null);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setActiveFilterPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getVal = (s, key) => {
    if (!s) return '';
    switch(key) {
      case 'date': return s.date;
      case 'visual': return s.imageUrl;
      case 'volume': return s.noOfTrades;
      case 'compliance': return { rules: s.rulesFollowed, eq: s.emotionsInControl, system: s.setupFollowed };
      case 'metadata': return s.tags || [];
      case 'yield': return s.progress || s.winRate;
      default: return s[key] || '';
    }
  };

  const getUniqueValues = (key) => {
    if (key === 'metadata') {
      const allTags = snapshots.flatMap(s => s.tags || []);
      return Array.from(new Set(allTags)).sort();
    }
    return [];
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
    setCurrentPage(1);
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
    setCurrentPage(1);
  };

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const processedSnapshots = useMemo(() => {
    let result = [...snapshots];

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name?.toLowerCase().includes(lowerSearch) ||
        s.date?.toString().toLowerCase().includes(lowerSearch) ||
        s.notes?.toLowerCase().includes(lowerSearch) ||
        s.tags?.some(t => t.toLowerCase().includes(lowerSearch))
      );
    }

    // Advanced Filters
    if (filters.length > 0) {
      result = result.filter(s => {
        return filters.every(f => {
          const rawVal = getVal(s, f.field);
          
          if (f.field === 'metadata') { // array type
             const tradeArray = Array.isArray(rawVal) ? rawVal : [];
             return tradeArray.some(tag => String(tag).toLowerCase() === String(f.value).toLowerCase());
          }

          if (f.field === 'compliance') {
             const option = COMPLIANCE_OPTIONS.find(opt => opt.label === f.value);
             if (!option) return true;
             return !!rawVal[option.key.replace('Followed', '').replace('InControl', '').toLowerCase().includes('rules') ? 'rules' : (option.key.toLowerCase().includes('emotion') ? 'eq' : 'system')];
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
      result = result.filter(s => (s.jsDate || new Date(s.date)) >= start);
    }
    if (customDateRange.end) {
      const end = new Date(customDateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter(s => (s.jsDate || new Date(s.date)) <= end);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = getVal(a, sortConfig.key);
      let bVal = getVal(b, sortConfig.key);

      if (sortConfig.key === 'date') {
        aVal = a.jsDate || new Date(a.date);
        bVal = b.jsDate || new Date(b.date);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [snapshots, searchTerm, filters, customDateRange, sortConfig]);

  const totalPages = Math.ceil(processedSnapshots.length / itemsPerPage);
  const currentSnapshots = processedSnapshots.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 mb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
          Execution Intelligence Archives
        </h3>

        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search archives..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950/30 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none focus:border-journal-gold/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Smart Filter Pill Bar */}
      {(filters.length > 0 || customDateRange.start || customDateRange.end) && (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1 rounded-2xl bg-slate-950/20 border border-white/5">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Archive Filters:</span>
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
            className="text-[9px] font-black text-journal-red hover:underline ml-2 uppercase tracking-tighter"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="journal-glass rounded-3xl overflow-hidden border-journal-gold/10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1100px]">
            <thead className="bg-slate-950/40">
              <tr>
                {SNAPSHOT_COLUMNS.map(col => (
                  <th 
                    key={col.key} 
                    onClick={() => setActiveFilterPopup(activeFilterPopup === col.key ? null : col.key)}
                    className={`
                      px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 cursor-pointer hover:text-journal-gold transition-colors relative group/th
                      ${col.sticky ? 'sticky left-0 z-20 bg-slate-950/90' : ''}
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}
                      ${filters.some(f => f.field === col.key) || (col.type === 'date' && (customDateRange.start || customDateRange.end)) ? 'text-journal-gold' : ''}
                    `}
                  >
                    <div className={`flex items-center gap-2 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-between'}`}>
                       <div className="flex items-center gap-2">
                         {col.label}
                         {col.key !== 'visual' && <Filter size={10} className={`opacity-0 group-hover/th:opacity-100 transition-opacity ${filters.some(f => f.field === col.key) ? 'opacity-100 text-journal-gold' : ''}`} />}
                       </div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); requestSort(col.key); }}
                         className="p-1 hover:bg-white/5 rounded-md transition-all"
                       >
                         <ArrowUpDown size={10} className={sortConfig.key === col.key ? 'text-journal-gold' : 'opacity-30'} />
                       </button>
                    </div>

                    {/* Filter Popover */}
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
                             {col.type === 'date' ? (
                               <div className="grid grid-cols-1 gap-3">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Start Archive</label>
                                    <input 
                                      type="date"
                                      value={customDateRange.start}
                                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                      className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none [color-scheme:dark]"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">End Archive</label>
                                    <input 
                                      type="date"
                                      value={customDateRange.end}
                                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                      className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none [color-scheme:dark]"
                                    />
                                  </div>
                               </div>
                             ) : col.key === 'metadata' ? (
                               <div className="flex flex-wrap gap-1.5">
                                 {getUniqueValues('metadata').map(val => (
                                   <button
                                     key={val}
                                     onClick={() => addFilter('metadata', val, 'array')}
                                     className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black transition-all ${
                                       filters.find(f => f.field === 'metadata' && f.value === val)
                                       ? 'bg-journal-gold text-journal-bg border-journal-gold'
                                       : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                     }`}
                                   >
                                     {val}
                                   </button>
                                 ))}
                               </div>
                             ) : col.key === 'compliance' ? (
                               <div className="grid grid-cols-1 gap-2">
                                 {COMPLIANCE_OPTIONS.map(opt => (
                                   <button
                                     key={opt.key}
                                     onClick={() => addFilter('compliance', opt.label, 'cat')}
                                     className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase text-left transition-all ${
                                       filters.find(f => f.field === 'compliance' && f.value === opt.label)
                                       ? 'bg-journal-gold/20 border-journal-gold text-journal-gold'
                                       : 'bg-slate-950/50 border-slate-800 text-slate-500'
                                     }`}
                                   >
                                     {opt.label}
                                   </button>
                                 ))}
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
                             ) : (
                               <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                <input 
                                  type="text" placeholder={`Search archives...`}
                                  autoFocus
                                  onBlur={(e) => addFilter(col.key, e.target.value, 'text')}
                                  onKeyDown={(e) => e.key === 'Enter' && addFilter(col.key, e.target.value, 'text')}
                                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none"
                                />
                              </div>
                             )}
                          </div>
                          <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                             <button onClick={() => setActiveFilterPopup(null)} className="text-[9px] font-black uppercase text-journal-gold hover:underline">Apply Archive Filter</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </th>
                ))}
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {currentSnapshots.length > 0 ? currentSnapshots.map((s, idx) => (
                <motion.tr 
                  key={s.id || idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="sticky left-0 z-10 bg-journal-bg/80 backdrop-blur-md px-6 py-4 border-b border-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500">
                        <Calendar size={14} />
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                        {s.date?.toDateString ? s.date.toDateString() : s.date}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => onViewImage(s.imageUrl)}
                      className="relative w-12 h-8 rounded-lg overflow-hidden border border-slate-800 group-hover:border-journal-gold/50 cursor-pointer transition-all"
                    >
                      {s.imageUrl ? (
                        <img src={s.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-800">
                          <ImageIcon size={14} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-journal-bg/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon size={12} className="text-white" />
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800">
                      <BarChart3 size={10} className="text-journal-gold" />
                      <span className="text-[10px] font-black text-white">{s.noOfTrades || 0}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4">
                      {COMPLIANCE_OPTIONS.map(opt => {
                        const Icon = opt.key === 'rulesFollowed' ? ShieldCheck : (opt.key === 'emotionsInControl' ? Smile : Target);
                        const isActive = !!s[opt.key];
                        const colorClass = opt.key === 'rulesFollowed' ? 'text-emerald-400' : (opt.key === 'emotionsInControl' ? 'text-indigo-400' : 'text-journal-gold');
                        
                        return (
                          <div key={opt.key} className={`flex flex-col items-center gap-1 ${isActive ? colorClass : 'text-slate-800'}`}>
                            <Icon size={14} />
                            <span className="text-[6px] font-black uppercase tracking-tighter">{opt.shortLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                      {s.tags?.length > 0 ? s.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-white/[0.03] text-[8px] font-black uppercase text-slate-500 border border-white/5 hover:border-journal-gold/30 hover:text-slate-300 transition-all cursor-default">
                          #{t}
                        </span>
                      )) : <span className="text-[9px] text-slate-700 italic">No Tags</span>}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 translate-x-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => onEditSnapshot(s)}
                        className="p-2 rounded-lg text-slate-600 hover:text-journal-gold hover:bg-journal-gold/5 transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => onDeleteSnapshot(s.id)}
                        className="p-2 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/5 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan={SNAPSHOT_COLUMNS.length + 1} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <BarChart3 size={40} className="text-slate-900" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">No session archives found matching your parameters</p>
                       {(filters.length > 0 || searchTerm) && (
                         <button onClick={() => { setFilters([]); setSearchTerm(''); }} className="text-[10px] font-black text-journal-gold uppercase border border-journal-gold/20 px-4 py-2 rounded-xl hover:bg-journal-gold/5 transition-all">
                           Clear Search Parameters
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 flex items-center justify-between border-t border-white/5 bg-slate-950/20">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-300">{currentSnapshots.length}</span> of <span className="text-slate-300">{processedSnapshots.length}</span> archives
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-500 disabled:opacity-20 hover:border-journal-gold/30 hover:text-journal-gold transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[9px] font-black text-journal-gold px-2">PAGE {currentPage} / {totalPages || 1}</span>
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
    </div>
  );
};

export default SnapshotSection;
