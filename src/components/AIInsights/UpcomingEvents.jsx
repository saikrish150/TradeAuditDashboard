import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { Timer, Activity, TrendingUp, Zap, Clock } from 'lucide-react';

const CountdownTimer = ({ eventTime }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(eventTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('LIVE');
        setIsLive(true);
        return;
      }
      setIsLive(false);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [eventTime]);

  return (
    <div className={`flex items-center gap-1.5 font-mono text-xs font-black tabular-nums ${
      isLive ? 'text-red-400 animate-pulse' : 'text-journal-gold'
    }`}>
      {isLive ? <Zap size={12} /> : <Timer size={12} className="opacity-60" />}
      {timeLeft}
    </div>
  );
};

export const UpcomingEvents = ({ events, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl border border-white/5" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center bg-black/30 rounded-2xl border border-white/5 border-dashed">
        <Activity size={24} className="text-slate-600 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No upcoming high-impact events</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden md:block bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4)]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="col-span-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">#</div>
          <div className="col-span-2 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">Market Impact</div>
          <div className="col-span-3 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">Event</div>
          <div className="col-span-2 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500 text-center">Countdown</div>
          <div className="col-span-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500 text-center">Prev.</div>
          <div className="col-span-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500 text-center">Forecast</div>
          <div className="col-span-2 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Impact</div>
        </div>

        {/* Event Rows */}
        {events.map((event, index) => {
          const eventTime = new Date(event.event_time);
          const isExtreme = event.importance_score >= 95;
          const dateStr = eventTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeStr = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <Motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`grid grid-cols-12 gap-4 px-5 py-4 items-center border-b border-white/5 last:border-b-0 transition-all duration-300 group cursor-default relative ${
                isExtreme
                  ? 'hover:bg-red-500/5'
                  : 'hover:bg-white/[0.03]'
              }`}
            >
              {/* Rank */}
              <div className="col-span-1">
                <span className={`text-xs font-mono font-black ${isExtreme ? 'text-red-400' : 'text-slate-500'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Market Impact */}
              <div className="col-span-2">
                {event.country === 'India' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">🇮🇳</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">Indian</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">₿</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Crypto</span>
                  </div>
                )}
              </div>

              {/* Event Title + Date */}
              <div className="col-span-3 overflow-hidden">
                <p className={`text-sm font-bold truncate leading-tight ${
                  isExtreme ? 'text-red-300 group-hover:text-red-200' : 'text-white group-hover:text-white/90'
                }`}>
                  {event.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={9} className="text-slate-500" />
                  <span className="text-[10px] font-mono text-slate-400">
                    {dateStr} • {timeStr}
                  </span>
                </div>
              </div>

              {/* Countdown */}
              <div className="col-span-2 text-center">
                <CountdownTimer eventTime={event.event_time} />
              </div>

              {/* Previous */}
              <div className="col-span-1 text-center">
                <span className="text-xs font-mono font-bold text-slate-300">{event.previous || '—'}</span>
              </div>

              {/* Forecast */}
              <div className="col-span-1 text-center">
                <span className="text-xs font-mono font-bold text-journal-gold">{event.forecast || '—'}</span>
              </div>

              {/* Impact Indicator */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  isExtreme
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                    : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                }`}>
                  <TrendingUp size={10} />
                  {isExtreme ? 'Critical' : 'High'}
                </div>
              </div>

              {/* Left accent bar on hover */}
              <div className={`absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity ${
                isExtreme ? 'bg-red-500' : 'bg-journal-gold'
              }`} />
            </Motion.div>
          );
        })}
      </div>

      {/* Mobile Card List (visible only on mobile) */}
      <div className="md:hidden space-y-4">
        {events.map((event, index) => {
          const eventTime = new Date(event.event_time);
          const isExtreme = event.importance_score >= 95;
          const dateStr = eventTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeStr = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <Motion.div
              key={event.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`relative overflow-hidden bg-gradient-to-br ${
                isExtreme
                  ? 'from-red-500/10 to-[#0e0707] border border-red-500/20'
                  : 'from-[#111111] to-[#070707] border border-white/5'
              } p-5 rounded-2xl flex flex-col gap-4 shadow-xl`}
            >
              {/* Top Meta Row */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-black ${isExtreme ? 'text-red-400' : 'text-slate-500'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {event.country === 'India' ? (
                    <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/10">🇮🇳 Indian</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/10">₿ Crypto</span>
                  )}
                </div>
                <CountdownTimer eventTime={event.event_time} />
              </div>

              {/* Event Title and Time */}
              <div>
                <h4 className={`text-sm font-bold leading-snug ${isExtreme ? 'text-red-200' : 'text-white'}`}>
                  {event.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                  <Clock size={11} className="text-slate-500 shrink-0" />
                  <span className="font-mono">{dateStr} • {timeStr}</span>
                </div>
              </div>

              {/* Values & Impact Row */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 bg-white/[0.01] -mx-5 -mb-5 px-5 pb-4 rounded-b-2xl">
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Prev.</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{event.previous || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Forecast</span>
                    <span className="text-xs font-mono font-bold text-journal-gold">{event.forecast || '—'}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  isExtreme
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                }`}>
                  <TrendingUp size={10} />
                  {isExtreme ? 'Critical' : 'High'}
                </div>
              </div>
            </Motion.div>
          );
        })}
      </div>
    </div>
  );
};
