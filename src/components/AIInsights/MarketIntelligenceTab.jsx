import React, { useState, useEffect, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Radar, RefreshCw, AlertTriangle, Zap, Shield, Flame, Filter, Globe2 } from 'lucide-react';
import IntelligenceCard from './IntelligenceCard';
import { marketIntelligenceService } from '../../services/marketIntelligenceService';

const CATEGORY_FILTERS = ['ALL', 'LIVE', 'CRYPTO', 'INDIA'];

export const MarketIntelligenceTab = () => {
  // Try to load cached data immediately to skip loading screen
  const cachedData = marketIntelligenceService.getCachedData();
  const [events, setEvents] = useState(cachedData || []);
  const [loading, setLoading] = useState(!cachedData);
  const [lastRefresh, setLastRefresh] = useState(cachedData ? new Date() : null);
  const [activeFilter, setActiveFilter] = useState('LIVE');
  const [urgencyFilter, setUrgencyFilter] = useState('EXTREME');

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader && events.length === 0) setLoading(true);
    try {
      const data = await marketIntelligenceService.fetchIntelligence();
      setEvents(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[Intelligence Tab] Failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we already have cached data, just do a background refresh
    fetchData(!cachedData);
    const interval = setInterval(() => fetchData(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredEvents = (() => {
    let list = activeFilter === 'ALL' || activeFilter === 'LIVE'
      ? [...events]
      : events.filter(e => e.category === activeFilter);
    
    // Apply urgency sub-filter
    if (urgencyFilter !== 'ALL') {
      list = list.filter(e => e.urgency === urgencyFilter);
    }
    
    if (activeFilter === 'LIVE') {
      return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    return list.sort((a, b) => b.impactScore - a.impactScore);
  })();

  const stats = {
    total: events.length,
    extreme: events.filter(e => e.urgency === 'EXTREME').length,
    high: events.filter(e => e.urgency === 'HIGH').length,
    categories: CATEGORY_FILTERS.slice(1).reduce((acc, cat) => {
      acc[cat] = events.filter(e => e.category === cat).length;
      return acc;
    }, {})
  };

  return (
    <Motion.div
      key="intelligence"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-journal-gold/10 border border-journal-gold/20 rounded-2xl relative">
            <Radar size={22} className="text-journal-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">
              Market News
            </h2>
            <p className="text-[10px] text-journal-text-secondary font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {lastRefresh 
                ? `Last scan: ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` 
                : 'Scanning sources...'
              }
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh Intel
        </button>
      </div>

      {/* Stats Bar */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-journal-card/40 border border-white/5 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-journal-gold/10 rounded-lg">
              <Globe2 size={16} className="text-journal-gold" />
            </div>
            <div>
              <p className="text-white font-black text-lg tabular-nums">{stats.total}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Alerts</p>
            </div>
          </div>

          <div className="bg-journal-card/40 border border-white/5 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Flame size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-red-400 font-black text-lg tabular-nums">{stats.extreme}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Extreme</p>
            </div>
          </div>

          <div className="bg-journal-card/40 border border-white/5 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Zap size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400 font-black text-lg tabular-nums">{stats.high}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">High Impact</p>
            </div>
          </div>

          <div className="bg-journal-card/40 border border-white/5 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 font-black text-lg tabular-nums">{stats.total - stats.extreme - stats.high}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Medium</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <Filter size={14} className="text-slate-500 flex-shrink-0" />
        {CATEGORY_FILTERS.map(cat => {
          const count = cat === 'ALL' ? events.length : (stats.categories?.[cat] || 0);
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em]
                transition-all whitespace-nowrap flex-shrink-0
                ${isActive 
                  ? 'bg-journal-gold/15 text-journal-gold border border-journal-gold/30'
                  : 'bg-white/5 text-slate-500 border border-white/5 hover:text-white hover:bg-white/10'
                }
              `}
            >
              {cat}
              {count > 0 && (
                <span className={`text-[8px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-journal-gold/20' : 'bg-white/10'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Urgency Sub-Filters */}
      <div className="flex items-center gap-2 -mt-4">
        {['ALL', 'EXTREME', 'HIGH', 'MEDIUM'].map(level => {
          const isActive = urgencyFilter === level;
          const colorMap = {
            ALL: isActive ? 'bg-journal-gold/15 text-journal-gold border-journal-gold/30' : '',
            EXTREME: isActive ? 'bg-red-500/15 text-red-400 border-red-500/30' : '',
            HIGH: isActive ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : '',
            MEDIUM: isActive ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : ''
          };
          return (
            <button
              key={level}
              onClick={() => setUrgencyFilter(level)}
              className={`
                px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.15em]
                transition-all border
                ${isActive
                  ? colorMap[level]
                  : 'bg-white/3 text-slate-600 border-white/5 hover:text-slate-400 hover:bg-white/5'
                }
              `}
            >
              {level === 'ALL' ? 'All Levels' : level}
            </button>
          );
        })}
      </div>

      {/* Intelligence Feed */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton loading
          Array.from({ length: 5 }).map((_, i) => (
            <div 
              key={i}
              className="bg-journal-card/30 border border-white/5 rounded-2xl p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl" />
                <div className="w-20 h-5 bg-white/5 rounded-lg" />
                <div className="w-16 h-5 bg-white/5 rounded-lg" />
              </div>
              <div className="w-3/4 h-4 bg-white/5 rounded-md mb-2" />
              <div className="w-1/2 h-3 bg-white/5 rounded-md mb-4" />
              <div className="flex gap-2">
                <div className="w-14 h-4 bg-white/5 rounded-md" />
                <div className="w-14 h-4 bg-white/5 rounded-md" />
                <div className="w-14 h-4 bg-white/5 rounded-md" />
              </div>
            </div>
          ))
        ) : filteredEvents.length > 0 ? (
          <AnimatePresence>
            {filteredEvents.map((event, index) => (
              <IntelligenceCard key={`${event.title}-${index}`} event={event} index={index} />
            ))}
          </AnimatePresence>
        ) : (
          // Empty State
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="p-6 bg-journal-card/30 rounded-3xl border border-white/5">
              <Shield size={40} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
              {activeFilter === 'ALL' 
                ? 'No high-impact events detected in the last 24 hours'
                : `No ${activeFilter} events detected`
              }
            </p>
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">
              Markets are calm. Stay alert.
            </p>
          </Motion.div>
        )}
      </div>

      {/* Footer */}
      {!loading && events.length > 0 && (
        <div className="text-center pt-4 border-t border-white/5">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
            Sources: GDELT Project • BBC World • CNBC • Al Jazeera • Economic Times • Livemint • Business Standard
          </p>
          <p className="text-[8px] text-slate-700 uppercase tracking-wider mt-1">
            Intelligence scores are algorithmic estimates • Not financial advice
          </p>
        </div>
      )}
    </Motion.div>
  );
};
