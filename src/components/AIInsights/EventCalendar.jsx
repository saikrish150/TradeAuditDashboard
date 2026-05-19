import React, { useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Coffee } from 'lucide-react';

export const EventCalendar = ({ events, holidays = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  // Calendar Logic
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }

    // Next month padding
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }

    return cells;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const getEventsForDay = (date) => {
    return events.filter(e => {
      const d = new Date(e.event_time);
      return d.getDate() === date.getDate() && 
             d.getMonth() === date.getMonth() && 
             d.getFullYear() === date.getFullYear();
    });
  };

  const getHolidaysForDay = (date) => {
    return holidays.filter(h => {
      const d = h.jsDate;
      return d.getDate() === date.getDate() && 
             d.getMonth() === date.getMonth() && 
             d.getFullYear() === date.getFullYear();
    });
  };

  return (
    <div className="space-y-6 bg-black/40 backdrop-blur-2xl border border-white/5 p-4 md:p-6 rounded-[2rem] shadow-[inset_0_0_100px_rgba(255,255,255,0.02)] relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-journal-gold/5 blur-[100px] pointer-events-none" />

      {/* Calendar Controller */}
      <div className="flex items-center justify-between px-2 relative z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-journal-gold/20 to-transparent border border-journal-gold/30 flex items-center justify-center text-journal-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <CalendarIcon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-white leading-none drop-shadow-md">{monthName}</h3>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-journal-gold/70 mt-1">{year} Fiscal Cycle</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 bg-black/50 p-1 md:p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-1.5 md:p-2.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={14} className="md:w-4 md:h-4" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg bg-white/5 hover:bg-journal-gold/20 border border-white/5 hover:border-journal-gold/30 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-journal-gold transition-all"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-1.5 md:p-2.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight size={14} className="md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 gap-1 md:gap-3 mt-8 relative z-10">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
          <div key={day} className={`text-center py-2 rounded-xl text-[9px] font-black uppercase tracking-wider md:tracking-[0.3em] ${i === 0 || i === 6 ? 'bg-red-500/5 text-red-400/50 border border-red-500/10' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day[0]}</span>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-3 relative z-10">
        {calendarData.map((cell, idx) => {
          const dayEvents = getEventsForDay(cell.date);
          const dayHolidays = getHolidaysForDay(cell.date);
          const hasExtreme = dayEvents.some(e => e.importance_score >= 95);
          const hasHoliday = dayHolidays.length > 0;
          const isToday = new Date().toDateString() === cell.date.toDateString();

          return (
            <div 
              key={idx}
              onClick={() => {
                if (dayEvents.length > 0 || dayHolidays.length > 0) {
                  setSelectedDayEvents({ date: cell.date, events: dayEvents, holidays: dayHolidays });
                }
              }}
              className={`min-h-[55px] md:min-h-[120px] lg:min-h-[160px] p-1.5 md:p-2.5 rounded-xl md:rounded-2xl border transition-all duration-500 relative group overflow-hidden cursor-pointer ${
                cell.currentMonth 
                  ? 'bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-white/5 hover:border-journal-gold/30 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)] hover:-translate-y-1' 
                  : 'bg-transparent border-transparent opacity-0 pointer-events-none'
              } ${isToday ? 'ring-1 ring-journal-gold/50 border-journal-gold/30 bg-gradient-to-b from-journal-gold/[0.05] to-transparent' : ''}`}
            >
              {/* Massive Watermark Date */}
              {cell.currentMonth && (
                <div className={`absolute -bottom-2 -right-1 text-3xl md:text-7xl font-black italic tracking-tighter select-none pointer-events-none transition-all duration-500 ${isToday ? 'text-journal-gold/[0.08] group-hover:text-journal-gold/[0.15]' : 'text-white/[0.02] group-hover:text-white/[0.05]'}`}>
                  {cell.day}
                </div>
              )}

              {/* Day Number (Top Left) */}
              <div className="flex justify-between items-start relative z-10">
                <span className={`text-xs md:text-sm font-black tabular-nums transition-colors ${
                  isToday ? 'text-journal-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]' : cell.currentMonth ? 'text-slate-400 group-hover:text-white' : 'text-slate-800'
                }`}>
                  {cell.day}
                </span>
                
                <div className="flex gap-1">
                  {hasHoliday && (
                    <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse">
                      <Coffee size={8} className="md:w-2.5 md:h-2.5" />
                    </div>
                  )}
                  {dayEvents.length > 0 && (
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mt-1 ${hasExtreme ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-journal-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]'}`} />
                  )}
                </div>
              </div>

              {/* Event & Holiday Snippets (hidden on mobile) */}
              {cell.currentMonth && (
                <div className="hidden md:block mt-3 space-y-2 relative z-10">
                  {/* Holidays First */}
                  {dayHolidays.map((h, hIdx) => (
                    <div 
                      key={`h-${hIdx}`}
                      className="relative overflow-hidden px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-l-2 border-l-emerald-400 border-y border-r border-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase truncate tracking-tighter shadow-[0_0_10px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <span className="relative z-10 flex items-center gap-1.5 drop-shadow-md">
                        <Coffee size={10} className="text-emerald-400" /> {h.name}
                      </span>
                    </div>
                  ))}

                  {/* Then Events */}
                  {dayEvents.slice(0, 4).map((event, eIdx) => {
                    const extreme = event.importance_score >= 95;
                    return (
                      <div 
                        key={eIdx}
                        className={`relative overflow-hidden px-2 py-1.5 rounded-lg text-[8px] font-black uppercase truncate tracking-tighter transition-all duration-300 ${
                          extreme 
                            ? 'bg-gradient-to-r from-red-500/20 to-transparent border-l-2 border-l-red-500 border-y border-r border-red-500/20 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.15)] group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                            : 'bg-gradient-to-r from-white/5 to-transparent border-l-2 border-l-white/20 border-y border-r border-white/5 text-slate-400 group-hover:from-journal-gold/10 group-hover:border-l-journal-gold group-hover:border-journal-gold/20 group-hover:text-journal-gold shadow-sm'
                        }`}
                      >
                        {extreme && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]" />}
                        <span className="relative z-10 flex items-center gap-1">
                          <span className="text-[10px]">{event.country === 'India' ? '🇮🇳' : '🇺🇸'}</span> {event.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sleek Mobile Day Detail Modal */}
      <AnimatePresence>
        {selectedDayEvents && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-[2rem] p-6 shadow-2xl overflow-hidden relative flex flex-col gap-4 max-h-[70vh] z-[210]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h4 className="text-base font-black uppercase text-white tracking-wider">
                    {selectedDayEvents.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h4>
                  <p className="text-[8px] font-black uppercase tracking-wider text-journal-gold mt-0.5">Scheduled Economic Events</p>
                </div>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  Close
                </button>
              </div>

              {/* Body Content */}
              <div className="space-y-4 overflow-y-auto no-scrollbar py-2 flex-1">
                {/* Holidays */}
                {selectedDayEvents.holidays.map((h, i) => (
                  <div key={`h-${i}`} className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Coffee size={14} />
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Exchange Holiday</span>
                      <h5 className="text-xs font-bold text-white mt-0.5">{h.name}</h5>
                    </div>
                  </div>
                ))}

                {/* Events */}
                {selectedDayEvents.events.map((e, i) => {
                  const extreme = e.importance_score >= 95;
                  const timeStr = new Date(e.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={`e-${i}`} className={`p-4 bg-gradient-to-br ${extreme ? 'from-red-500/10 to-transparent border-red-500/20' : 'from-white/5 to-transparent border-white/5'} border rounded-2xl flex flex-col gap-3`}>
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className={`text-[8px] font-black uppercase tracking-wider ${extreme ? 'text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20' : 'text-slate-400'}`}>
                          {extreme ? 'Critical Impact' : 'High Impact'}
                        </span>
                        <span className="text-xs font-mono font-black text-journal-gold">{timeStr}</span>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-white leading-snug">{e.title}</h5>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-black">Region: {e.country === 'India' ? '🇮🇳 India' : '🇺🇸 Crypto / Global'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Prev.</span>
                          <span className="text-xs font-mono font-bold text-slate-300">{e.previous || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Forecast</span>
                          <span className="text-xs font-mono font-bold text-journal-gold">{e.forecast || '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
