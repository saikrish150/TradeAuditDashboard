import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { Timer, Activity, TrendingUp, Zap, Clock, Globe } from 'lucide-react';

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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-[9px] font-black tracking-widest uppercase tabular-nums border transition-all ${
      isLive 
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
        : 'bg-journal-gold/10 border-journal-gold/20 text-journal-gold shadow-[0_0_15px_rgba(212,175,55,0.05)]'
    }`}>
      {isLive ? <Zap size={10} className="animate-bounce" /> : <Clock size={10} className="opacity-70 animate-pulse" />}
      {timeLeft}
    </span>
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
      <div className="hidden md:block bg-[#0e0f14]/90 backdrop-blur-3xl rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_35px_100px_rgba(0,0,0,0.7)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 bg-white/[0.01]">
          <div className="col-span-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">#</div>
          <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Market</div>
          <div className="col-span-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Macro Event</div>
          <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Countdown</div>
          <div className="col-span-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Prev.</div>
          <div className="col-span-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Forecast</div>
          <div className="col-span-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Impact</div>
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`grid grid-cols-12 gap-4 px-6 py-5 items-center border-b border-white/[0.03] last:border-b-0 transition-all duration-300 group cursor-default relative ${
                isExtreme
                  ? 'hover:bg-rose-950/10'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Rank */}
              <div className="col-span-1">
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-journal-gold transition-colors">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Market Segment */}
              <div className="col-span-2">
                {event.country === 'India' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-400 uppercase tracking-widest shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Indian F&O
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-journal-gold/10 border border-journal-gold/20 text-[9px] font-black text-journal-gold uppercase tracking-widest shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-journal-gold animate-pulse" />
                    Crypto
                  </span>
                )}
              </div>

              {/* Event Title + Date */}
              <div className="col-span-3 overflow-hidden">
                <p className="text-sm font-semibold truncate leading-tight text-white group-hover:text-journal-gold transition-colors">
                  {event.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock size={10} className="text-slate-500" />
                  <span className="text-[10px] font-mono text-slate-400">
                    {dateStr} • {timeStr}
                  </span>
                </div>
              </div>

              {/* Countdown Pill */}
              <div className="col-span-2 text-center">
                <CountdownTimer eventTime={event.event_time} />
              </div>

              {/* Previous Value */}
              <div className="col-span-1 text-center">
                <span className="text-xs font-mono font-black text-slate-400">{event.previous || '—'}</span>
              </div>

              {/* Forecast Value */}
              <div className="col-span-1 text-center">
                <span className="text-xs font-mono font-black text-journal-gold">{event.forecast || '—'}</span>
              </div>

              {/* Impact Badge */}
              <div className="col-span-2 flex items-center justify-end">
                <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
                  isExtreme
                    ? 'bg-rose-950/40 text-rose-400 border-rose-500/30 hover:border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.15)] group-hover:scale-105'
                    : 'bg-amber-950/40 text-amber-400 border-amber-500/30 hover:border-amber-400/50 group-hover:scale-105'
                }`}>
                  <Activity size={10} className="opacity-80 animate-pulse" />
                  {isExtreme ? 'Critical' : 'High'}
                </span>
              </div>

              {/* Left premium indicator bar on hover */}
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                isExtreme ? 'bg-rose-500' : 'bg-journal-gold'
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
                  ? 'from-rose-500/10 to-[#0f0a0a] border border-rose-500/20'
                  : 'from-[#0e0f14] to-[#09090c] border border-white/10'
              } p-5 rounded-[2rem] flex flex-col gap-4 shadow-2xl` }
            >
              {/* Top Meta Row */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {event.country === 'India' ? (
                    <span className="text-[8px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-xl border border-orange-500/20">🇮🇳 Indian F&O</span>
                  ) : (
                    <span className="text-[8px] font-black uppercase tracking-widest text-journal-gold bg-journal-gold/10 px-2.5 py-1 rounded-xl border border-journal-gold/20">₿ Crypto</span>
                  )}
                </div>
                <CountdownTimer eventTime={event.event_time} />
              </div>

              {/* Event Title and Time */}
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {event.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                  <Clock size={11} className="text-slate-500 shrink-0" />
                  <span className="font-mono">{dateStr} • {timeStr}</span>
                </div>
              </div>

              {/* Values & Impact Row */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 bg-white/[0.01] -mx-5 -mb-5 px-5 pb-4 rounded-b-[2rem]">
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Prev.</span>
                    <span className="text-xs font-mono font-black text-slate-400">{event.previous || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Forecast</span>
                    <span className="text-xs font-mono font-black text-journal-gold">{event.forecast || '—'}</span>
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border ${
                  isExtreme
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                }`}>
                  <Activity size={10} className="animate-pulse" />
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
