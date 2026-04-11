import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Image as ImageIcon, LayoutDashboard, 
  ChevronRight, ArrowUpRight, ArrowDownRight,
  TrendingUp, StickyNote, AlertTriangle, Lightbulb,
  Calendar, Clock, Filter, Maximize2, X, Search, Check,
  ChevronDown, ChevronLeft
} from 'lucide-react';
import { EMOTION_OPTIONS, TRADE_QUALITY_OPTIONS, MARKET_OPTIONS, SETUP_OPTIONS, NOTE_CATEGORY_OPTIONS, MARKET_CATEGORIES } from '../../constants/journalOptions';
import { MONTH_MAP } from '../../utils';
import { supabaseService } from '../../services/supabaseService';
import { authService } from '../../services/authService';
import { ChevronUp } from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`modern-glass border border-white/10 rounded-[2rem] overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "indigo" }) => {
  const colors = {
    indigo: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    rose: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    slate: "bg-white/5 border-white/10 text-slate-400"
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase border transition-all ${colors[color] || colors.indigo}`}>
      {children}
    </span>
  );
};

const ReviewTab = ({ trades = [], snapshots = [], notes = [] }) => {
  const [viewMode, setViewMode] = useState('insights'); // insights, screenshots
  const [galleryType, setGalleryType] = useState('trades'); // trades, daily
  const [gallerySort, setGallerySort] = useState('date-desc'); // date-desc, date-asc, pl-desc, pl-asc
  const [lightbox, setLightbox] = useState(null);
  const [expandedSection, setExpandedSection] = useState('mistakes');
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticVotes, setOptimisticVotes] = useState({}); // { noteId: extraVotes }
  const [voteFeedback, setVoteFeedback] = useState(null); // noteId of recently voted
  
  // Local Filters
  const [noteFilters, setNoteFilters] = useState({
    search: '',
    category: 'All'
  });

  const [galleryFilters, setGalleryFilters] = useState({
    emotion: 'All',
    quality: 'All',
    market: 'All',
    setup: 'All',
    search: '',
    startDate: '',
    endDate: '',
    minPL: '',
    maxPL: ''
  });

  const hasActiveGalleryFilters = useMemo(() => {
    return galleryFilters.emotion !== 'All' || galleryFilters.quality !== 'All' || 
           galleryFilters.market !== 'All' || galleryFilters.setup !== 'All' || 
           galleryFilters.search !== '' || galleryFilters.startDate !== '' ||
           galleryFilters.endDate !== '' || galleryFilters.minPL !== '' ||
           galleryFilters.maxPL !== '';
  }, [galleryFilters]);

  const hasActiveNoteFilters = useMemo(() => {
    return noteFilters.search !== '' || noteFilters.category !== 'All';
  }, [noteFilters]);

  // Helper: Normalize date for comparison
  const getComparisonDate = (item) => {
    if (!item) return null;
    if (item instanceof Date) return item;
    
    let dateStr = item;
    if (typeof item === 'object') {
      if (item.jsDate instanceof Date) return item.jsDate;
      dateStr = item.fullDate || item.date || item.Date || item.full_date || item.created_at;
    }
    
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    
    // Fallback for custom formats like "Oct 20, 2026"
    try {
      const cleaned = String(dateStr).replace(/(\d+)(st|nd|rd|th)/, '$1');
      const fallback = new Date(cleaned);
      return !isNaN(fallback.getTime()) ? fallback : null;
    } catch {
      return null;
    }
  };

  const handleVote = async (noteId, currentVotes) => {
    // Optimistic Update
    setOptimisticVotes(prev => ({
      ...prev,
      [noteId]: (prev[noteId] || 0) + 1
    }));
    setVoteFeedback(noteId);
    
    // Clear feedback after 2s
    setTimeout(() => setVoteFeedback(null), 2000);

    if (isVoting) return;
    setIsVoting(true);
    try {
      const session = await authService.getSession();
      const user = session?.user;
      if (!user) return;
      
      const newVotes = (currentVotes || 0) + 1 + (optimisticVotes[noteId] || 0);
      await supabaseService.incrementNoteVotes(user.id, noteId, newVotes);
    } catch (error) {
      console.error("Error voting:", error);
      // Revert optimistic on error
      setOptimisticVotes(prev => ({ ...prev, [noteId]: Math.max(0, (prev[noteId] || 0) - 1) }));
    } finally {
      setIsVoting(true); // Wait for real-time sync for next vote
      setTimeout(() => setIsVoting(false), 500); 
    }
  };

  // Combined Filtering Logic
  const processedTrades = useMemo(() => {
    return trades.filter(t => {
      const tEmotion = String(t.emotion || t.emotions || 'All').toLowerCase().trim();
      const fEmotion = galleryFilters.emotion.toLowerCase().trim();
      const matchEmotion = galleryFilters.emotion === 'All' || tEmotion.includes(fEmotion);
      
      const tQuality = String(t.tradeQuality || t.quality || 'All').toLowerCase().trim();
      const fQuality = galleryFilters.quality.toLowerCase().trim();
      const matchQuality = galleryFilters.quality === 'All' || tQuality === fQuality;
      
      const tMarket = String(t.market || 'All').toLowerCase().trim();
      const fMarket = galleryFilters.market.toLowerCase().trim();
      
      let matchMarket = true;
      if (galleryFilters.market === 'INDIAN MARKETS') {
        const indianSimb = ['nifty', 'banknifty', 'finnifty', 'sensex', 'nse', 'bse'];
        matchMarket = indianSimb.some(s => tMarket.includes(s));
      } else if (galleryFilters.market === 'OTHER MARKETS') {
        const indianSimb = ['nifty', 'banknifty', 'finnifty', 'sensex', 'nse', 'bse'];
        matchMarket = !indianSimb.some(s => tMarket.includes(s)) && tMarket !== 'all';
      } else {
        matchMarket = galleryFilters.market === 'All' || tMarket.includes(fMarket);
      }
      
      const fSetup = galleryFilters.setup.toLowerCase().trim();
      const matchSetup = galleryFilters.setup === 'All' || String(t.setup || '').toLowerCase().includes(fSetup);
      
      const tradeReason = t.reasonForTrade || t.TradeReason || t.reason || '';
      const matchSearch = galleryFilters.search === '' || 
        String(t.setup || '').toLowerCase().includes(galleryFilters.search.toLowerCase()) || 
        String(t.market || '').toLowerCase().includes(galleryFilters.search.toLowerCase()) ||
        String(tradeReason).toLowerCase().includes(galleryFilters.search.toLowerCase());
      
      // Custom Date Range logic
      let matchDate = true;
      const tDate = getComparisonDate(t);
      if (tDate) {
        if (galleryFilters.startDate) {
          const start = new Date(galleryFilters.startDate);
          start.setHours(0,0,0,0);
          if (tDate < start) matchDate = false;
        }
        if (galleryFilters.endDate) {
          const end = new Date(galleryFilters.endDate);
          end.setHours(23,59,59,999);
          if (tDate > end) matchDate = false;
        }
      }

      // Custom P&L Threshold logic
      let matchPL = true;
      const plValue = parseFloat(String(t.pl || 0).replace(/[₹\s,]/g, ''));
      if (galleryFilters.minPL !== '') {
        if (plValue < parseFloat(galleryFilters.minPL)) matchPL = false;
      }
      if (galleryFilters.maxPL !== '') {
        if (plValue > parseFloat(galleryFilters.maxPL)) matchPL = false;
      }
      
      return matchEmotion && matchQuality && matchMarket && matchSetup && matchSearch && matchDate && matchPL;
    });
  }, [trades, galleryFilters]);

  const tradesWithVisuals = useMemo(() => {
    const list = processedTrades.filter(t => t.screenshotUrl || (t.screenshots && t.screenshots.length > 0));
    
    // Apply Gallery Sort
    return [...list].sort((a, b) => {
      if (gallerySort.startsWith('date')) {
        const aDate = getComparisonDate(a.fullDate || a.date)?.getTime() || 0;
        const bDate = getComparisonDate(b.fullDate || b.date)?.getTime() || 0;
        return gallerySort === 'date-desc' ? bDate - aDate : aDate - bDate;
      }
      if (gallerySort.startsWith('pl')) {
        const aPL = parseFloat(String(a.pl || 0).replace(/[₹\s,]/g, '')) || 0;
        const bPL = parseFloat(String(b.pl || 0).replace(/[₹\s,]/g, '')) || 0;
        return gallerySort === 'pl-desc' ? bPL - aPL : aPL - bPL;
      }
      return 0;
    });
  }, [processedTrades, gallerySort]);

  const processedSnapshots = useMemo(() => {
    return snapshots.filter(s => {
      const matchSearch = galleryFilters.search === '' || 
        String(s.title || '').toLowerCase().includes(galleryFilters.search.toLowerCase());
      
      let matchDate = true;
      const sDate = getComparisonDate(s);
      if (sDate) {
        if (galleryFilters.startDate) {
          const start = new Date(galleryFilters.startDate);
          start.setHours(0,0,0,0);
          if (sDate < start) matchDate = false;
        }
        if (galleryFilters.endDate) {
          const end = new Date(galleryFilters.endDate);
          end.setHours(23,59,59,999);
          if (sDate > end) matchDate = false;
        }
      }

      return matchSearch && matchDate;
    });
  }, [snapshots, galleryFilters.search, galleryFilters.startDate, galleryFilters.endDate]);

  const snapshotsWithVisuals = useMemo(() => {
    const list = processedSnapshots.filter(s => (s.screenshotUrl || s.imageUrl || s.url || (s.screenshots && s.screenshots.length > 0)));
    
    // Apply Gallery Sort (Snapshots only support date sort)
    if (gallerySort.startsWith('pl')) return list; // Skip P&L sort for snapshots

    return [...list].sort((a, b) => {
      const aDate = getComparisonDate(a)?.getTime() || 0;
      const bDate = getComparisonDate(b)?.getTime() || 0;
      return gallerySort === 'date-desc' ? bDate - aDate : aDate - bDate;
    });
  }, [processedSnapshots, gallerySort]);

  // Flat list of all images with metadata for common navigation
  const allGalleryItems = useMemo(() => {
    const items = galleryType === 'trades' ? tradesWithVisuals : snapshotsWithVisuals;
    const links = [];
    items.forEach(item => {
      const shots = item.screenshots && item.screenshots.length > 0 
        ? item.screenshots 
        : [item.screenshotUrl || item.imageUrl || item.url].filter(Boolean);
      shots.forEach(s => links.push({ url: s, item }));
    });
    return links;
  }, [galleryType, tradesWithVisuals, snapshotsWithVisuals]);

  // Keyboard Navigation for Lightbox
  React.useEffect(() => {
    if (!lightbox) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') {
        const idx = allGalleryItems.findIndex(l => l.url === lightbox.url);
        if (idx !== -1 && idx < allGalleryItems.length - 1) {
          setLightbox(allGalleryItems[idx + 1]);
        } else if (idx === allGalleryItems.length - 1) {
          setLightbox(allGalleryItems[0]); // Loop
        }
      }
      if (e.key === 'ArrowLeft') {
        const idx = allGalleryItems.findIndex(l => l.url === lightbox.url);
        if (idx > 0) {
          setLightbox(allGalleryItems[idx - 1]);
        } else if (idx === 0) {
          setLightbox(allGalleryItems[allGalleryItems.length - 1]); // Loop
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox, allGalleryItems]);

  const processedNotes = useMemo(() => {
    if (!notes || !Array.isArray(notes)) return [];
    
    return notes.filter(n => {
      if (!n) return false;
      const content = String(n.content || n.Note || '');
      const category = String(n.category || n.Select || '');
      
      const matchSearch = String(noteFilters.search || '') === '' || 
        content.toLowerCase().includes(String(noteFilters.search || '').toLowerCase());
      
      const filterCat = String(noteFilters.category || 'All').toLowerCase().trim();
      const matchCategory = filterCat === 'all' || category.toLowerCase().includes(filterCat);
      
      return matchSearch && matchCategory;
    });
  }, [notes, noteFilters]);

  // Insights Segregation
  const insightColumns = useMemo(() => {
    const getClean = (v) => {
      if (typeof v === 'object' && v !== null) v = v.value || v.label || JSON.stringify(v);
      return String(v || '').toLowerCase().trim();
    };

    const sortNotes = (arr) => {
      return [...arr].sort((a, b) => {
        // Use optimistic votes if available
        const aTotalVotes = (a.votes || 0) + (optimisticVotes[a.id] || 0);
        const bTotalVotes = (b.votes || 0) + (optimisticVotes[b.id] || 0);
        
        const voteDiff = bTotalVotes - aTotalVotes;
        if (voteDiff !== 0) return voteDiff;
        
        const aDate = getComparisonDate(a);
        const bDate = getComparisonDate(b);
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
      });
    };

    const mistakes = processedNotes.filter(n => String(n.category || '').toLowerCase().includes('mistake'));
    const learnings = processedNotes.filter(n => String(n.category || '').toLowerCase().includes('learning'));
    const observations = processedNotes.filter(n => {
      const cat = String(n.category || '').toLowerCase();
      return !cat.includes('mistake') && !cat.includes('learning');
    });

    return {
      mistakes: sortNotes(mistakes),
      learnings: sortNotes(learnings),
      observations: sortNotes(observations)
    };
  }, [processedNotes, optimisticVotes]);

  // Aggregated stats for Daily Snapshots (Indian Markets Only)
  const dailyIndianStats = useMemo(() => {
    const stats = {};
    const indianSimb = ['nifty', 'banknifty', 'finnifty', 'sensex', 'nse', 'bse'];
    
    trades.forEach(t => {
      const tMarket = String(t.market || '').toLowerCase();
      if (!indianSimb.some(s => tMarket.includes(s))) return;
      
      const tDate = getComparisonDate(t)?.toDateString();
      if (!tDate) return;
      
      if (!stats[tDate]) stats[tDate] = { pl: 0, count: 0 };
      stats[tDate].pl += parseFloat(String(t.pl || 0).replace(/[₹\s,]/g, '')) || 0;
      stats[tDate].count += 1;
    });
    return stats;
  }, [trades]);

  const getSnapshotStats = (item) => {
    const d = getComparisonDate(item);
    if (!d) return null;
    return dailyIndianStats[d.toDateString()] || { pl: 0, count: 0 };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">Review Terminal</h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Visual Performance Audit & Psychological Insights</p>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Insights Section - The Bento Wall */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-indigo-500 pl-4 py-1">
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Psychology Insights</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Behavioral Audit Wall</p>
            </div>
            
            {/* Note Filter Bar */}
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              <div className="relative group flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Search notes..." 
                  value={noteFilters.search}
                  onChange={e => setNoteFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] font-bold text-white outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>
              <select 
                value={noteFilters.category}
                onChange={e => setNoteFilters(prev => ({ ...prev, category: e.target.value }))}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="All">All Categories</option>
                {NOTE_CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {hasActiveNoteFilters && (
                <button 
                  onClick={() => setNoteFilters({ search: '', category: 'All' })}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-all"
                >
                  <X size={12} /> Reset
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            {[
              { id: 'mistakes', label: 'Repeated Mistakes', icon: AlertTriangle, color: 'rose', data: insightColumns.mistakes, accent: 'Urgent Fix Required' },
              { id: 'learnings', label: 'Trade Wisdom (Learnings)', icon: Lightbulb, color: 'emerald', data: insightColumns.learnings, accent: 'Edge Documentation' },
              { id: 'observations', label: 'Market Pulse (Observations)', icon: LayoutDashboard, color: 'indigo', data: insightColumns.observations, accent: 'Execution Context' }
            ].map((section) => (
              <div key={section.id} className="space-y-4">
                <button 
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className={`w-full flex items-center justify-between p-6 rounded-[2rem] border transition-all ${
                    expandedSection === section.id 
                    ? `bg-${section.color}-500/10 border-${section.color}-500/40 shadow-[0_0_20px_rgba(0,0,0,0.2)]` 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${section.color}-500/20 text-${section.color}-400`}>
                      <section.icon size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${expandedSection === section.id ? `text-${section.color}-400` : 'text-slate-400'}`}>
                        {section.label}
                      </h4>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {section.data.length} archived {section.data.length === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-slate-600"
                  >
                    <ChevronDown size={20} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {expandedSection === section.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-3 pt-2 pb-6">
                        {section.data.map((note, i) => (
                          <motion.div 
                            key={note.id || `${section.id}-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <Card className={`p-5 relative group hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-all border-${section.color}-500/10 hover:border-${section.color}-500/30`}>
                              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-${section.color}-500/30 group-hover:bg-${section.color}-500 transition-all`} />
                              
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 w-full">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                      <Clock size={10} /> {String(note.date || note.Date || '-')}
                                    </p>
                                    <Badge color={section.color}>{note.category || note.Select || 'Entry'}</Badge>
                                  </div>
                                  <p className={`text-[13px] text-slate-200 leading-relaxed ${section.id === 'mistakes' ? 'font-bold italic' : section.id === 'learnings' ? 'font-black uppercase tracking-tight text-slate-100' : 'font-medium'}`}>
                                    {section.id === 'mistakes' && '"'}{note.content || note.Note || 'Empty Note'}{section.id === 'mistakes' && '"'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-6 shrink-0">
                                  {/* Vote Button */}
                                  <div className="flex flex-col items-center relative">
                                    <button 
                                      onClick={() => handleVote(note.id, note.votes)}
                                      disabled={isVoting && voteFeedback !== note.id}
                                      className={`w-10 h-10 rounded-xl transition-all group/vbtn active:scale-90 flex items-center justify-center border ${
                                        voteFeedback === note.id 
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                                        : 'bg-white/5 hover:bg-journal-gold/20 border-white/10 hover:border-journal-gold/30 text-slate-500 hover:text-journal-gold'
                                      }`}
                                      title="Upvote Insight"
                                    >
                                      <AnimatePresence mode="wait">
                                        {voteFeedback === note.id ? (
                                          <motion.div
                                            key="check"
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.5, opacity: 0 }}
                                          >
                                            <Check size={20} />
                                          </motion.div>
                                        ) : (
                                          <motion.div
                                            key="up"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="group-hover/vbtn:-translate-y-0.5 transition-transform"
                                          >
                                            <ChevronUp size={20} />
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </button>
                                    
                                    <span className={`text-[10px] font-black mt-1 transition-colors ${voteFeedback === note.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                                      {(note.votes || 0) + (optimisticVotes[note.id] || 0)}
                                    </span>

                                    {/* Floating +1 Animation */}
                                    <AnimatePresence>
                                      {voteFeedback === note.id && (
                                        <motion.div
                                          initial={{ y: 0, opacity: 1 }}
                                          animate={{ y: -30, opacity: 0 }}
                                          exit={{ opacity: 0 }}
                                          className="absolute top-0 text-emerald-400 text-[10px] font-black"
                                        >
                                          +1
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>

                                  <div className="text-right ml-2">
                                    <span className={`text-[8px] font-black uppercase tracking-tighter text-${section.color}-500/50 block`}>{section.accent}</span>
                                    <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">Behavioral Anchor</span>
                                  </div>
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${section.color}-500/5 text-${section.color}-500/30`}>
                                    {section.id === 'mistakes' ? <ArrowDownRight size={14} /> : 
                                     section.id === 'learnings' ? <Check size={14} /> :
                                     <ArrowUpRight size={14} />}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                        {section.data.length === 0 && (
                          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 opacity-30">
                            <StickyNote size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest">No entries archived in this segment</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          
          {(insightColumns.mistakes.length + insightColumns.observations.length + insightColumns.learnings.length) === 0 && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50 modern-glass rounded-[2rem] border border-dashed border-white/10">
              <StickyNote size={48} className="text-slate-800" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No behavioral data archived for this selection</p>
            </div>
          )}
        </section>

        {/* Separator */}
        <div className="h-px bg-white/5 w-full" />

        {/* Gallery Section */}
        <section className="space-y-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-3 border-l-4 border-journal-gold pl-4 py-1 text-white">
                <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Visual Gallery</h3>
                <Badge color="amber">{galleryType === 'trades' ? 'Execution Log' : 'EOD Snapshots'}</Badge>
              </div>

              <div className="flex p-1.5 modern-glass rounded-2xl border border-white/10">
                <button 
                  onClick={() => setGalleryType('trades')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${galleryType === 'trades' ? 'bg-journal-gold text-journal-bg shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  <Camera size={14} /> Trade Snapshots ({tradesWithVisuals.length})
                </button>
                <button 
                  onClick={() => setGalleryType('daily')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${galleryType === 'daily' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  <ImageIcon size={14} /> Daily Snapshots ({snapshotsWithVisuals.length})
                </button>
              </div>
            </div>

            {/* Gallery Filter Bar */}
            <div className="flex flex-col gap-4 bg-slate-900/40 p-4 rounded-3xl border border-white/5">
              <div className="flex flex-col xl:flex-row gap-4">
                {/* Search - Primary */}
                <div className="relative group flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-journal-gold transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search gallery..." 
                    value={galleryFilters.search}
                    onChange={e => setGalleryFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-[11px] font-bold text-white outline-none focus:border-journal-gold/50 transition-all"
                  />
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  {/* Date Range Group */}
                  <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                    <Calendar size={14} className="text-slate-500 ml-2" />
                    <input 
                      type="date" 
                      value={galleryFilters.startDate}
                      onChange={e => setGalleryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      onClick={(e) => e.target.showPicker?.()}
                      className="bg-transparent text-[9px] font-black uppercase text-slate-300 outline-none cursor-pointer [color-scheme:dark]"
                    />
                    <span className="text-slate-600 text-[9px] font-bold">to</span>
                    <input 
                      type="date" 
                      value={galleryFilters.endDate}
                      onChange={e => setGalleryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      onClick={(e) => e.target.showPicker?.()}
                      className="bg-transparent text-[9px] font-black uppercase text-slate-300 outline-none cursor-pointer pr-2 [color-scheme:dark]"
                    />
                  </div>

                  {/* P&L Threshold Group */}
                  <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                    <TrendingUp size={14} className="text-slate-500 ml-2" />
                    <input 
                      type="number" 
                      placeholder="Min P&L"
                      value={galleryFilters.minPL}
                      onChange={e => setGalleryFilters(prev => ({ ...prev, minPL: e.target.value }))}
                      className="w-16 bg-transparent text-[9px] font-black uppercase text-slate-300 outline-none placeholder:text-slate-600"
                    />
                    <span className="text-slate-600 text-[9px] font-bold">-</span>
                    <input 
                      type="number" 
                      placeholder="Max P&L"
                      value={galleryFilters.maxPL}
                      onChange={e => setGalleryFilters(prev => ({ ...prev, maxPL: e.target.value }))}
                      className="w-16 bg-transparent text-[9px] font-black uppercase text-slate-300 outline-none placeholder:text-slate-600 pr-2"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <select 
                  value={galleryFilters.emotion}
                  onChange={e => setGalleryFilters(prev => ({ ...prev, emotion: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-journal-gold/50 cursor-pointer"
                >
                  <option value="All">All Emotions</option>
                  {EMOTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>

                <select 
                  value={galleryFilters.quality}
                  onChange={e => setGalleryFilters(prev => ({ ...prev, quality: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-journal-gold/50 cursor-pointer"
                >
                  <option value="All">All Grades</option>
                  {TRADE_QUALITY_OPTIONS.map(opt => <option key={opt} value={opt}>Grade {opt}</option>)}
                </select>

                <select 
                  value={galleryFilters.market}
                  onChange={e => setGalleryFilters(prev => ({ ...prev, market: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-journal-gold/50 cursor-pointer"
                >
                  <option value="All">All Markets</option>
                  {MARKET_CATEGORIES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1 ml-auto">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Sort:</span>
                  <select 
                    value={gallerySort}
                    onChange={e => setGallerySort(e.target.value)}
                    className="bg-transparent text-[9px] font-black uppercase tracking-widest text-journal-gold outline-none cursor-pointer"
                  >
                    <option value="date-desc">Newest Date</option>
                    <option value="date-asc">Oldest Date</option>
                    <option value="pl-desc">Highest P&L</option>
                    <option value="pl-asc">Lowest P&L</option>
                  </select>
                </div>

                {hasActiveGalleryFilters && (
                  <button 
                    onClick={() => setGalleryFilters({ emotion: 'All', quality: 'All', market: 'All', setup: 'All', search: '', startDate: '', endDate: '', minPL: '', maxPL: '' })}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-all font-bold group"
                  >
                    <X size={14} className="group-hover:rotate-90 transition-transform" /> Reset Ranges
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(galleryType === 'trades' ? tradesWithVisuals : snapshotsWithVisuals).map((item, idx) => (
              <Card key={item.id} className="group cursor-pointer">
                <div className="relative aspect-video overflow-hidden border-b border-white/5">
                  <img 
                    src={item.screenshotUrl || (item.screenshots && item.screenshots[0])} 
                    alt="Review Screenshot"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <button 
                      onClick={() => setLightbox({ url: item.screenshotUrl || (item.screenshots && item.screenshots[0]), item })}
                      className="p-4 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-md hover:bg-white/20 transition-all"
                    >
                      <Maximize2 size={24} />
                    </button>
                  </div>
                  {galleryType === 'trades' ? (
                    <div className="absolute top-4 right-4">
                      <Badge color={(item.pl || 0) >= 0 ? 'emerald' : 'rose'}>
                        {(item.pl || 0) >= 0 ? '+' : ''}{(item.pl || 0).toFixed(2)}
                      </Badge>
                    </div>
                  ) : (
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      {getSnapshotStats(item) && (
                        <>
                          <Badge color={getSnapshotStats(item).pl >= 0 ? 'emerald' : 'rose'}>
                            {getSnapshotStats(item).pl >= 0 ? 'Day: +' : 'Day: '}{getSnapshotStats(item).pl.toFixed(2)}
                          </Badge>
                          <Badge color="indigo">Trades: {getSnapshotStats(item).count}</Badge>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Calendar size={10} /> {String(item.fullDate || item.date)}
                      </p>
                      <h4 className="text-sm font-black text-white italic truncate max-w-[200px]">
                        {galleryType === 'trades' ? `${item.market}: ${item.reasonForTrade || item.TradeReason || item.reason || item.setup || 'Reason Not Specified'}` : 'End of Day Snapshot'}
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      {galleryType === 'trades' && item.direction && (
                        <Badge color={String(item.direction).toLowerCase() === 'long' ? 'indigo' : 'rose'}>
                          {String(item.direction).toUpperCase()}
                        </Badge>
                      )}
                      {galleryType === 'trades' && (item.rr || item['Taken RR'] || item.TakenRR) && (
                        <Badge color="amber">RR: {item.rr || item['Taken RR'] || item.TakenRR}</Badge>
                      )}
                      {galleryType !== 'trades' && <Badge color="slate">Snapshot</Badge>}
                    </div>
                  </div>
                  
                  {galleryType === 'trades' ? (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                       {item.emotion && <Badge color="indigo">{String(item.emotion)}</Badge>}
                       {item.tradeQuality && <Badge color="amber">Grade: {String(item.tradeQuality)}</Badge>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {item.tags && item.tags.map(tag => (
                        <span key={tag} className="text-[8px] font-black uppercase text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5 group-hover:border-journal-gold/30 transition-colors">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {(galleryType === 'trades' ? tradesWithVisuals : snapshotsWithVisuals).length === 0 && (
              <Card className="col-span-full py-20 flex flex-col items-center justify-center gap-4 border-dashed opacity-50">
                <ImageIcon size={48} className="text-slate-800" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No Visual Data found for this filter selection</p>
              </Card>
            )}
          </div>
        </section>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-[11000] w-full max-w-[88vw] h-[82vh] flex items-center justify-center pointer-events-none"
            >
              {/* The Unified Image & HUD Wrapper */}
              <div className="relative h-full w-full flex items-center justify-center pointer-events-auto group/viewer">
                
                <motion.div 
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-32 p-3 bg-transparent border-l border-white/5 z-30 hidden xl:flex flex-col gap-5 transition-all duration-700 pointer-events-none"
                >
                   <div className="space-y-5">
                      {/* Phantom Header */}
                      <div className="space-y-0.5 opacity-30">
                         <div className="flex items-center gap-1">
                            <div className={`w-0.5 h-0.5 rounded-full ${galleryType === 'trades' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                            <span className="text-[4px] font-black uppercase tracking-[0.4em] text-white">
                               DATA
                            </span>
                         </div>
                         <h4 className="text-xs font-black italic text-white uppercase tracking-tighter truncate">
                            {galleryType === 'trades' ? (lightbox.item?.market || 'M') : 'S'}
                         </h4>
                         <p className="text-[6px] font-bold text-slate-600 tabular-nums">
                            {String(lightbox.item?.date || '-')}
                         </p>
                      </div>

                      {/* Performance Stats */}
                      <div className="space-y-4">
                         <div className="space-y-0.5">
                            <span className="text-[4px] font-black text-slate-700 uppercase tracking-[0.2em]">Yield</span>
                            <p className={`text-lg font-black italic tracking-tighter leading-none ${
                               (galleryType === 'trades' ? parseFloat(lightbox.item?.pl || 0) : getSnapshotStats(lightbox.item)?.pl) >= 0 
                               ? 'text-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-journal-red/80 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                            }`}>
                               ₹{galleryType === 'trades' ? (lightbox.item?.pl || 0) : getSnapshotStats(lightbox.item)?.pl?.toFixed(0)}
                            </p>
                         </div>

                         <div className="space-y-0.5">
                            <span className="text-[4px] font-black text-slate-700 uppercase tracking-[0.2em]">Logic</span>
                            <p className="text-[10px] font-black text-amber-500/70 italic leading-none truncate">
                               {galleryType === 'trades' 
                                 ? `${!lightbox.item?.rr || lightbox.item?.rr === '0' ? 'N/A' : lightbox.item.rr} RR` 
                                 : `${getSnapshotStats(lightbox.item)?.count} EXE`}
                            </p>
                         </div>
                      </div>

                      {/* Context HUD */}
                      {galleryType === 'trades' && (
                        <div className="space-y-1 opacity-40">
                           <p className="text-[7px] font-black text-slate-500 uppercase italic leading-tight line-clamp-1">
                              {lightbox.item?.reasonForTrade || 'Manual'}
                           </p>
                           <span className="text-[4px] font-black uppercase text-indigo-400/40 tracking-[0.2em]">{lightbox.item.direction}</span>
                        </div>
                      )}
                   </div>

                   <div className="mt-auto opacity-20">
                      <span className="text-[5px] font-black text-slate-800 tabular-nums tracking-[0.3em]">
                         {allGalleryItems.findIndex(l => l.url === lightbox.url) + 1} / {allGalleryItems.length}
                      </span>
                   </div>
                </motion.div>

                {/* Close Button - Floats Top Right */}
                <div className="absolute top-4 right-4 z-40">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
                     className="p-3 rounded-full bg-slate-900/40 backdrop-blur-xl border border-white/5 text-white/50 hover:text-white hover:bg-rose-500/40 transition-all shadow-xl"
                   >
                     <X size={20} />
                   </button>
                </div>

                {/* Navigation Arrows */}
                <button 
                  onClick={(e) => { e.stopPropagation(); const idx = allGalleryItems.findIndex(l => l.url === lightbox.url); if (idx > 0) setLightbox(allGalleryItems[idx - 1]); else setLightbox(allGalleryItems[allGalleryItems.length - 1]); }}
                  className="absolute left-10 md:left-12 p-5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/30 hover:text-white transition-all z-20 shadow-2xl backdrop-blur-md opacity-0 group-hover/viewer:opacity-100"
                >
                  <ChevronLeft size={36} />
                </button>

                <div className="relative w-full h-full flex items-center justify-center rounded-[3rem] overflow-hidden shadow-[0_60px_150px_rgba(0,0,0,1)] border border-white/10 bg-black/60">
                  <img 
                    src={lightbox.url} 
                    alt="Audit Workspace" 
                    className="max-h-full max-w-full object-contain" 
                  />
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); const idx = allGalleryItems.findIndex(l => l.url === lightbox.url); if (idx < allGalleryItems.length - 1) setLightbox(allGalleryItems[idx + 1]); else setLightbox(allGalleryItems[0]); }}
                  className="absolute right-12 p-5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white/30 hover:text-white transition-all z-20 shadow-2xl backdrop-blur-md opacity-0 group-hover/viewer:opacity-100"
                >
                  <ChevronRight size={36} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewTab;
