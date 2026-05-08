import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pin, Tag, Edit3, Trash2, 
  Calendar, ChevronLeft, ChevronRight, Search, 
  Filter, ArrowUpDown, X, StickyNote,
  ShieldCheck, Smile, Target
} from 'lucide-react';
import { NOTES_COLUMNS } from '../../constants/journalColumns';
import { NOTE_CATEGORY_OPTIONS } from '../../constants/journalOptions';
import { FullTextModal } from './JournalModals';
import { supabaseService } from '../../services/supabaseService';
import { authService } from '../../services/authService';
import { DB_FIELDS } from '../../constants/fieldMappings';
import { ChevronUp, Check as CheckIcon } from 'lucide-react';

const NotesSection = ({ notes = [], onEditNote, onDeleteNote, user, setNotes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState([]);
  const [activeFilterPopup, setActiveFilterPopup] = useState(null);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'pinned', direction: 'desc' });
  const [viewingText, setViewingText] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isPinning, setIsPinning] = useState(null); // noteId
  const [pinStates, setPinStates] = useState({}); // { noteId: boolean }
  const [optimisticVotes, setOptimisticVotes] = useState({}); // { noteId: extraVotes }
  const [voteFeedback, setVoteFeedback] = useState(null); // noteId of recently voted
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

  const getVal = (n, key) => {
    if (!n) return '';
    return n[key] || '';
  };

  const getUniqueValues = (key) => {
    if (key === 'category') return NOTE_CATEGORY_OPTIONS;
    if (key === 'isPinned') return ['Pinned', 'Regular'];
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

  const handleVote = async (noteId, currentVotes) => {
    if (isVoting || !user) return;
    
    const newVotes = (currentVotes || 0) + 1;

    // Optimistic Update
    setOptimisticVotes(prev => ({
      ...prev,
      [noteId]: (prev[noteId] || 0) + 1
    }));
    setVoteFeedback(noteId);
    
    // Clear feedback after 2s
    setTimeout(() => setVoteFeedback(null), 2000);

    setIsVoting(true);
    try {
      await supabaseService.incrementNoteVotes(user.id, noteId, newVotes);
      
      // Update global state to ensure sync
      if (setNotes) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, votes: newVotes } : n));
      }
      
      // Clear optimistic vote since global state is now updated
      setOptimisticVotes(prev => ({ ...prev, [noteId]: 0 }));
    } catch (error) {
      console.error("Error voting:", error);
      setOptimisticVotes(prev => ({ ...prev, [noteId]: Math.max(0, (prev[noteId] || 0) - 1) }));
    } finally {
      setTimeout(() => setIsVoting(false), 500); 
    }
  };

  const handleTogglePin = async (note) => {
    if (isPinning || !user) return;
    const newPinnedStatus = !note.pinned;
    
    // OPTIMISTIC UPDATE: Instant UI feedback
    setPinStates(prev => ({ ...prev, [note.id]: newPinnedStatus }));
    setIsPinning(note.id);
    
    try {
      await supabaseService.updateNote(user.id, note.id, {
        [DB_FIELDS.notePinned]: newPinnedStatus ? 'Yes' : 'No'
      });
      if (setNotes) {
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: newPinnedStatus } : n));
      }
    } catch (error) {
      console.error("Error pinning:", error);
      setPinStates(prev => ({ ...prev, [note.id]: note.pinned }));
    } finally {
      setIsPinning(null);
    }
  };

  const processedNotes = useMemo(() => {
    let result = notes.map(n => ({
      ...n,
      pinned: pinStates[n.id] !== undefined ? pinStates[n.id] : n.pinned
    }));

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(n => 
        n.content?.toLowerCase().includes(lowerSearch) ||
        n.category?.toLowerCase().includes(lowerSearch) ||
        n.date?.toString().toLowerCase().includes(lowerSearch)
      );
    }

    // Advanced Filters
    if (filters.length > 0) {
      result = result.filter(n => {
        return filters.every(f => {
          const rawVal = getVal(n, f.field);
          
          if (f.type === 'cat') {
             return String(rawVal).toLowerCase() === String(f.value).toLowerCase();
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
      result = result.filter(n => (n.jsDate || new Date(n.date)) >= start);
    }
    if (customDateRange.end) {
      const end = new Date(customDateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter(n => (n.jsDate || new Date(n.date)) <= end);
    }

    // Sort
    result.sort((a, b) => {
      // PRIMARY SORT: Always respectPinned status first
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      // SECONDARY SORT: Based on user selection
      let aVal = getVal(a, sortConfig.key);
      let bVal = getVal(b, sortConfig.key);

      if (sortConfig.key === 'date') {
        aVal = a.jsDate || new Date(a.date);
        bVal = b.jsDate || new Date(b.date);
      } else if (sortConfig.key === 'pinned') {
        aVal = a.pinned ? 1 : 0;
        bVal = b.pinned ? 1 : 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [notes, searchTerm, filters, customDateRange, sortConfig, pinStates]);

  const totalPages = Math.ceil(processedNotes.length / itemsPerPage);
  const currentNotes = processedNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 mb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
          Journal
        </h3>

        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search entries..."
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
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Journal Filters:</span>
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
              {f.field}: {f.value}
              <X size={10} className="hover:text-white cursor-pointer" onClick={() => removeFilter(i)} />
            </span>
          ))}
          <button 
            onClick={() => { setFilters([]); setCustomDateRange({ start: '', end: '' }); }}
            className="text-[9px] font-black text-journal-red hover:underline ml-2 uppercase tracking-tighter"
          >
            Clear All Reset
          </button>
        </div>
      )}

      <div className="md:hidden flex items-center justify-center gap-2 mb-2 text-slate-600 animate-pulse">
        <ArrowUpDown size={12} className="rotate-90" />
        <span className="text-[9px] font-black uppercase tracking-widest">Swipe horizontally to explore journal data</span>
      </div>

      <div className="journal-glass rounded-3xl overflow-hidden border-journal-gold/10 relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
            <thead className="bg-slate-950/40">
              <tr>
                {NOTES_COLUMNS.map(col => (
                  <th 
                    key={col.key} 
                    onClick={() => setActiveFilterPopup(activeFilterPopup === col.key ? null : col.key)}
                    className={`
                      px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 cursor-pointer hover:text-journal-gold transition-colors relative group/th
                      ${col.sticky ? 'md:sticky md:left-0 z-10 md:z-20 md:bg-journal-bg' : 'z-10'}
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}
                      ${filters.some(f => f.field === col.key) || (col.type === 'date' && (customDateRange.start || customDateRange.end)) ? 'text-journal-gold' : ''}
                    `}
                  >
                    <div className={`flex items-center gap-2 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-between'}`}>
                       <div className="flex items-center gap-2">
                         {col.label}
                         {<Filter size={10} className={`opacity-0 group-hover/th:opacity-100 transition-opacity ${filters.some(f => f.field === col.key) ? 'opacity-100 text-journal-gold' : ''}`} />}
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
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">Start Date</label>
                                    <input 
                                      type="date"
                                      value={customDateRange.start}
                                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                      onClick={(e) => e.target.showPicker?.()}
                                      className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none [color-scheme:dark]"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase">End Date</label>
                                    <input 
                                      type="date"
                                      value={customDateRange.end}
                                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                      onClick={(e) => e.target.showPicker?.()}
                                      className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none [color-scheme:dark]"
                                    />
                                  </div>
                               </div>
                             ) : col.type === 'cat' ? (
                               <div className="grid grid-cols-1 gap-2">
                                 {getUniqueValues(col.key).map(val => (
                                   <button
                                     key={val}
                                     onClick={() => addFilter(col.key, val, 'cat')}
                                     className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase text-left transition-all ${
                                       filters.find(f => f.field === col.key && f.value === val)
                                       ? 'bg-journal-gold/20 border-journal-gold text-journal-gold'
                                       : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                                     }`}
                                   >
                                     {val}
                                   </button>
                                 ))}
                               </div>
                             ) : (
                               <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                <input 
                                  type="text" placeholder={`Search ${col.label}...`}
                                  autoFocus
                                  onBlur={(e) => addFilter(col.key, e.target.value, 'text')}
                                  onKeyDown={(e) => e.key === 'Enter' && addFilter(col.key, e.target.value, 'text')}
                                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white outline-none"
                                />
                              </div>
                             )}
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
              {currentNotes.length > 0 ? currentNotes.map((n, idx) => {
                const isPinned = n.pinned === true;
                return (
                  <motion.tr 
                    key={n.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-white/[0.02] transition-colors group ${isPinned ? 'bg-journal-gold/[0.02]' : ''}`}
                  >
                  {NOTES_COLUMNS.map(col => {
                    const val = n[col.key];
                    const renderCell = () => {
                      if (col.key === 'pinned') {
                         const loading = isPinning === n.id;
                         return (
                            <div className="flex justify-center">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePin(n);
                                }}
                                disabled={loading}
                                className={`p-2 rounded-xl transition-all hover:bg-white/5 active:scale-90 ${loading ? 'animate-pulse' : ''}`}
                              >
                                <Pin 
                                  size={14} 
                                  className={`transition-all ${val ? 'text-journal-gold fill-journal-gold rotate-45' : 'text-slate-800 group-hover:text-slate-600'}`} 
                                />
                              </button>
                            </div>
                         );
                      }

                      if (col.key === 'category' && val) {
                         const colorMap = {
                            "Observation's": "bg-journal-gold/10 border-journal-gold/30 text-journal-gold",
                            "Important Learnings": "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                            "Most Repeated Mistakes": "bg-rose-500/10 border-rose-500/30 text-rose-400"
                         };
                         const styles = colorMap[val] || "bg-white/5 border-white/10 text-slate-400";
                         return (
                            <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${styles}`}>
                              {val}
                            </span>
                         );
                      }

                      if (col.type === 'date') {
                           return (
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg border transition-all ${n.pinned ? 'bg-journal-gold/10 border-journal-gold/30 text-journal-gold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                                  <Calendar size={14} />
                                </div>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                                  {val ? new Date(val).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
                                </span>
                              </div>
                           );
                      }
                      if (col.key === 'content') {
                         return (
                            <p className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-[450px] group-hover:text-slate-300 transition-colors">
                              {val || '-'}
                            </p>
                         );
                      }

                      if (col.key === 'votes') {
                         const currentVotes = (val || 0) + (optimisticVotes[n.id] || 0);
                         return (
                            <div className="flex items-center gap-2 relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVote(n.id, val);
                                  }}
                                  disabled={isVoting && voteFeedback !== n.id}
                                  className={`w-8 h-8 rounded-lg transition-all active:scale-90 flex items-center justify-center border ${
                                    voteFeedback === n.id 
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                                    : 'bg-white/5 hover:bg-journal-gold/20 border-white/10 hover:border-journal-gold/30 text-slate-500 hover:text-journal-gold'
                                  }`}
                                >
                                  <AnimatePresence mode="wait">
                                    {voteFeedback === n.id ? (
                                      <motion.div
                                        key="check"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                      >
                                        <CheckIcon size={14} />
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        key="up"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                      >
                                        <ChevronUp size={16} />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </button>
                                <span className={`text-[10px] font-black w-4 text-center ${voteFeedback === n.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {currentVotes}
                                </span>

                                {/* Floating +1 Animation */}
                                <AnimatePresence>
                                  {voteFeedback === n.id && (
                                    <motion.div
                                      initial={{ y: 0, opacity: 1 }}
                                      animate={{ y: -20, opacity: 0 }}
                                      exit={{ opacity: 0 }}
                                      className="absolute -top-4 left-2 text-emerald-400 text-[8px] font-black"
                                    >
                                      +1
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                            </div>
                         );
                      }

                      return <span className="text-[10px] font-bold text-slate-200">{String(val || '-')}</span>;
                    };

                    return (
                      <td 
                        key={col.key} 
                        onClick={() => col.key === 'content' && setViewingText({ title: `${n.category || 'Journal'} Entry - ${n.date}`, content: val })}
                        className={`px-6 py-4 border-b border-white/[0.02] ${col.sticky ? 'md:sticky md:left-0 z-10 md:bg-journal-bg md:shadow-[2px_0_10px_rgba(0,0,0,0.5)]' : ''} ${col.align === 'center' ? 'text-center' : ''} ${col.key === 'content' ? 'cursor-pointer' : ''}`}
                      >
                        {renderCell()}
                      </td>
                    );
                  })}
  
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 translate-x-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => onEditNote(n)}
                          className="p-2 rounded-lg text-slate-600 hover:text-journal-gold hover:bg-journal-gold/5 transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => onDeleteNote(n.id)}
                          className="p-2 rounded-lg text-slate-600 hover:text-red-500 hover:bg-red-500/5 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
 : (
                <tr>
                  <td colSpan={NOTES_COLUMNS.length + 1} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <StickyNote size={40} className="text-slate-900" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">No journal entries found matching your parameters</p>
                       {(filters.length > 0 || searchTerm) && (
                         <button onClick={() => { setFilters([]); setSearchTerm(''); }} className="text-[10px] font-black text-journal-gold uppercase border border-journal-gold/20 px-4 py-2 rounded-xl hover:bg-journal-gold/5 transition-all">
                           Reset Journal Explorer
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
            Showing <span className="text-slate-300">{currentNotes.length}</span> of <span className="text-slate-300">{processedNotes.length}</span> entries
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

      <FullTextModal 
        isOpen={!!viewingText}
        onClose={() => setViewingText(null)}
        title={viewingText?.title}
        content={viewingText?.content}
      />
    </div>
  );
};

export default NotesSection;
