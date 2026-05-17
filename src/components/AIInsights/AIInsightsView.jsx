import React, { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, RefreshCw, CalendarRange, Zap, BarChart3, Radar, Coffee, Globe2 } from 'lucide-react';
import { UpcomingEvents } from './UpcomingEvents';
import { EventCalendar } from './EventCalendar';
import { GlobalMarketsTab } from './GlobalMarketsTab';
import { MarketIntelligenceTab } from './MarketIntelligenceTab';
import { AIOverviewTab } from './AIOverviewTab';
import { economicEventsService } from '../../services/economicEventsService';
import SectionHeader from '../SectionHeader';

const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: Brain },
  { id: 'events', label: 'Events', icon: CalendarRange },
  { id: 'global', label: 'Global Markets', icon: Globe2 },
  { id: 'intelligence', label: 'Market News', icon: Radar },
];

export const AIInsightsView = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [allHolidays, setAllHolidays] = useState([]);
  const [nextHoliday, setNextHoliday] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const events = await economicEventsService.fetchEconomicEvents();
      const holidays = await economicEventsService.fetchHolidays();
      
      // Group all events by exact timestamp
      const groups = {};
      events.forEach(e => {
        const timeStr = new Date(e.event_time).toISOString();
        if (!groups[timeStr]) groups[timeStr] = [];
        groups[timeStr].push(e);
      });

      const processedEvents = Object.values(groups).map(group => {
        if (group.length === 1) return group[0];
        const hasHighImpact = group.some(e => e.importance_score >= 95);
        return {
          ...group[0],
          title: group.map(e => e.title).join(' / '),
          isAggregated: true,
          importance_score: hasHighImpact ? 100 : 75,
          subEvents: group
        };
      }).sort((a, b) => new Date(a.event_time) - new Date(b.event_time));

      const now = new Date();
      const futureEvents = processedEvents.filter(e => new Date(e.event_time) >= now);
      const futureHolidays = holidays.filter(h => h.jsDate >= now);
      
      setUpcomingEvents(futureEvents.slice(0, 5));
      setCalendarEvents(processedEvents);
      setAllHolidays(holidays);
      if (futureHolidays.length > 0) {
        setNextHoliday(futureHolidays[0]);
      }
    } catch (error) {
      console.error("Error fetching Market Insights events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white flex items-center gap-3">
            <Brain className="text-journal-gold" /> Market Insights <span className="text-journal-gold">Terminal</span>
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">
            Institutional-Grade Macro Event Intelligence
          </p>
        </div>
        <button 
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh Data
        </button>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0a0a0a]/80 p-1.5 rounded-xl border border-white/10 backdrop-blur-xl w-fit">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                isActive
                  ? 'text-journal-gold'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <Motion.div
                  layoutId="activeInsightTab"
                  className="absolute inset-0 bg-journal-gold/10 border border-journal-gold/30 rounded-lg shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={14} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content - Kept mounted to prevent TradingView unmount errors and improve speed */}
      <div className="mt-8 relative min-h-[500px]">
        {/* Overview Tab */}
        <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: activeTab === 'overview' ? 1 : 0, y: activeTab === 'overview' ? 0 : 10 }}
            transition={{ duration: 0.25 }}
          >
            <AIOverviewTab />
          </Motion.div>
        </div>

        {/* Events Tab */}
        <div className={activeTab === 'events' ? 'block' : 'hidden'}>
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: activeTab === 'events' ? 1 : 0, y: activeTab === 'events' ? 0 : 10 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
              <>
                {/* Holiday Alert */}
                {nextHoliday && (
                  <Motion.div 
                    initial={{ opacity: 0, y: -20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ scale: 1.01 }}
                    className="relative overflow-hidden bg-gradient-to-br from-[#06140e] to-[#0a0a0a] border border-emerald-500/20 p-6 rounded-3xl flex items-center justify-between group cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] transition-all duration-500"
                  >
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] group-hover:bg-emerald-400/20 group-hover:scale-150 transition-all duration-1000" />
                    <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-teal-500/5 rounded-full blur-[60px]" />
                    
                    <div className="relative z-10 flex items-center gap-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] group-hover:scale-110 group-hover:rotate-6 group-hover:text-emerald-300 transition-all duration-500">
                        <Coffee size={28} />
                      </div>
                      <div>
                        <h3 className="text-white font-black italic tracking-tighter uppercase text-xl flex items-center gap-2">
                          Next Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Holiday</span>
                        </h3>
                        <p className="text-emerald-500/70 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Exchange: <span className="text-emerald-400">{nextHoliday.exchange} ({nextHoliday.country})</span>
                        </p>
                      </div>
                    </div>
                    <div className="relative z-10 text-right">
                      <p className="text-emerald-400 font-black text-2xl tabular-nums tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                        {nextHoliday.date}
                      </p>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1.5 italic border border-white/5 bg-black/50 px-2 py-1 rounded-md inline-block">
                        {nextHoliday.name}
                      </p>
                    </div>
                  </Motion.div>
                )}

                {/* Top Section: 5 Upcoming Events with Countdown */}
                <div className="space-y-6">
                  <SectionHeader icon={Sparkles} title="Impending Volatility" subtitle="Next 5 High Impact Events & Countdown" color="gold" />
                  <UpcomingEvents events={upcomingEvents} loading={loading} />
                </div>

                {/* Bottom Section: 30-Day Calendar */}
                <div className="space-y-6">
                  <SectionHeader icon={Brain} title="Macro Horizon" subtitle="30-Day Forward Looking Calendar" color="red" />
                  {loading ? (
                    <div className="h-[500px] bg-white/5 animate-pulse rounded-3xl border border-white/10" />
                  ) : (
                    <EventCalendar events={calendarEvents} holidays={allHolidays} />
                  )}
                </div>
              </>
          </Motion.div>
        </div>

        {/* Global Markets Tab (TradingView Widgets) */}
        <div className={activeTab === 'global' ? 'block' : 'hidden'}>
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: activeTab === 'global' ? 1 : 0, y: activeTab === 'global' ? 0 : 10 }}
            transition={{ duration: 0.25 }}
          >
            <GlobalMarketsTab />
          </Motion.div>
        </div>

        {/* Market News Tab */}
        <div className={activeTab === 'intelligence' ? 'block' : 'hidden'}>
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: activeTab === 'intelligence' ? 1 : 0, y: activeTab === 'intelligence' ? 0 : 10 }}
            transition={{ duration: 0.25 }}
          >
            <MarketIntelligenceTab />
          </Motion.div>
        </div>
      </div>
      
    </div>
  );
};
