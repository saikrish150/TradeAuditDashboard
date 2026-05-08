import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { CustomSelect } from '../Common/CustomSelect';

const CalendarSection = ({ trades }) => {
  const [viewMode, setViewMode] = useState('heatmap'); // 'monthly' or 'heatmap'
  const [heatmapMonths, setHeatmapMonths] = useState(6);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0-6

    const days = [];
    
    // Add empty slots for days of previous month
    for (let i = 0; i < startingDay; i++) {
      days.push({ empty: true });
    }

    // Process trades for this month
    const tradesByDay = {};
    trades.forEach(t => {
      const d = t.jsDate || new Date(t.date);
      if (d && d.getMonth() === month && d.getFullYear() === year) {
        const dayNum = d.getDate();
        if (!tradesByDay[dayNum]) tradesByDay[dayNum] = { pl: 0, count: 0 };
        tradesByDay[dayNum].pl += t.pl || 0;
        tradesByDay[dayNum].count += 1;
      }
    });

    // Find the best day in this month
    let maxPL = -Infinity;
    let bestDayNum = -1;
    Object.entries(tradesByDay).forEach(([day, data]) => {
      if (data.pl > maxPL) {
        maxPL = data.pl;
        bestDayNum = parseInt(day);
      }
    });

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
       days.push({
         day: i,
         pl: tradesByDay[i]?.pl || 0,
         count: tradesByDay[i]?.count || 0,
         isBest: i === bestDayNum && tradesByDay[i]?.pl > 0
       });
    }

    return days;
  }, [currentMonth, trades]);

  const heatmapData = useMemo(() => {
    if (viewMode !== 'heatmap') return { months: [], maxAbsPL: 1 };
    
    const months = [];
    const now = new Date();
    let maxAbsPL = 0;
    
    let totalPL = 0;
    let greenDays = 0;
    let redDays = 0;
    
    for (let i = 0; i < heatmapMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      
      const days = [];
      const tradesInMonth = trades.filter(t => {
        const td = t.jsDate || new Date(t.date);
        return td.getMonth() === month && td.getFullYear() === year;
      });

      let mPL = 0;
      let mGreen = 0;
      let mRed = 0;

      for (let day = 1; day <= lastDay; day++) {
        const dayTrades = tradesInMonth.filter(t => (t.jsDate || new Date(t.date)).getDate() === day);
        const pl = dayTrades.reduce((acc, curr) => acc + (curr.pl || 0), 0);
        if (Math.abs(pl) > maxAbsPL) maxAbsPL = Math.abs(pl);
        days.push({ day, pl, count: dayTrades.length });

        if (dayTrades.length > 0) {
          totalPL += pl;
          mPL += pl;
          if (pl > 0) { greenDays++; mGreen++; }
          else if (pl < 0) { redDays++; mRed++; }
        }
      }
      
      months.push({
        name: d.toLocaleString('default', { month: 'short' }),
        year,
        days,
        mPL,
        mGreen,
        mRed
      });
    }
    return { months, maxAbsPL: maxAbsPL || 1, totalPL, greenDays, redDays };
  }, [viewMode, heatmapMonths, trades]);

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="journal-glass rounded-2xl p-4 sm:p-6 border-journal-gold/10 overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4 px-2">
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-journal-gold flex items-center gap-2">
            <CalendarIcon size={16} /> {viewMode === 'monthly' ? monthName : `Heatmap: Last ${heatmapMonths} Months`}
          </h3>
          
          {/* View Toggle */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'monthly' ? 'bg-journal-gold text-journal-bg' : 'text-slate-500 hover:text-white'}`}
            >
              Month
            </button>
            <button 
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'heatmap' ? 'bg-journal-gold text-journal-bg' : 'text-slate-500 hover:text-white'}`}
            >
              Heatmap
            </button>
          </div>

          {/* Timeframe Selector (Only for Heatmap) */}
          {viewMode === 'heatmap' && (
              <div className="flex items-center gap-2 bg-slate-950/40 px-2 py-1 rounded-xl border border-white/5">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest pl-2">Window:</span>
                <CustomSelect
                  value={heatmapMonths}
                  onChange={(val) => setHeatmapMonths(parseInt(val))}
                  className="w-28"
                  options={[3, 6, 9, 12, 18, 24, 36, 48].map(m => ({
                    value: m,
                    label: m < 12 ? `${m} Months` : `${m/12} Year${m/12 > 1 ? 's' : ''}`
                  }))}
                />
             </div>
          )}
        </div>
        
        {viewMode === 'monthly' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-500 hover:text-journal-gold hover:border-journal-gold/30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-500 hover:text-journal-gold hover:border-journal-gold/30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'monthly' ? (
          <motion.div 
            key="monthly"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-7 gap-2 sm:gap-4"
          >
            {weekDays.map(d => (
              <div key={d} className="text-center py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d[0]}</span>
              </div>
            ))}
            
            {calendarData.map((d, i) => {
              const hasTrades = d.count > 0;
              const isProfit = d.pl >= 0;
              
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                    e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                  }}
                  whileHover={!d.empty ? { 
                    scale: 1.05, 
                    y: -4, 
                    zIndex: 50,
                    transition: { duration: 0.2, ease: "easeOut" }
                  } : {}}
                  className={`
                    relative h-16 sm:h-32 rounded-xl sm:rounded-[1.5rem] border flex flex-col justify-between p-1.5 sm:p-4 transition-all duration-300 group
                    ${d.empty ? 'bg-transparent border-transparent' : 'bg-slate-950/60 backdrop-blur-md border-white/5 hover:border-journal-gold/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]'}
                    ${d.isBest ? 'ring-2 ring-journal-gold ring-offset-4 ring-offset-journal-bg' : ''}
                  `}
                >
                  {!d.empty && (
                    <>
                      {/* Best Day Rotating Aura */}
                      {d.isBest && (
                        <div className="absolute inset-0 rounded-[1.5rem] overflow-hidden pointer-events-none">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent,rgba(212,175,55,0.1),transparent)]"
                          />
                        </div>
                      )}

                      <div className="flex justify-between items-start relative z-10">
                        <span className={`
                          text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-lg transition-colors
                          ${hasTrades ? 'bg-white/10 text-white' : 'text-slate-700'}
                        `}>
                          {d.day}
                        </span>
                        {d.isBest && (
                          <motion.div 
                            animate={{ 
                              y: [0, -4, 0],
                              filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                            }} 
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Trophy size={14} className="text-journal-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
                          </motion.div>
                        )}
                      </div>

                      {hasTrades && (
                        <div className="mt-auto relative z-10">
                          <p className={`
                            text-[11px] sm:text-2xl font-black tabular-nums tracking-tighter leading-none mb-1.5 transition-all
                            ${isProfit 
                              ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)] group-hover:text-emerald-300' 
                              : 'text-journal-red drop-shadow-[0_0_15px_rgba(230,57,70,0.4)] group-hover:text-rose-400'}
                          `}>
                            <span className="text-[0.6em] opacity-70 mr-0.5">{isProfit ? '+' : ''}</span>
                            {formatCurrency(d.pl).split('.')[0]}
                          </p>
                          
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <div className={`h-1.5 w-1.5 rounded-full ${isProfit ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-journal-red shadow-[0_0_8px_rgba(230,57,70,0.6)]'}`} />
                              <p className="hidden sm:block text-[8px] font-black text-slate-500 uppercase tracking-widest">{d.count} Trades</p>
                            </div>
                            
                            {/* Intensity Indicator */}
                            <div className="hidden sm:flex gap-0.5">
                               {Array.from({ length: Math.min(d.count, 5) }).map((_, idx) => (
                                 <div key={idx} className={`w-1 h-3 rounded-full ${isProfit ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />
                               ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Holographic Hover Background Glow */}
                      {!d.empty && hasTrades && (
                        <div className={`
                          absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none rounded-xl sm:rounded-[1.5rem]
                          ${isProfit 
                            ? 'bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(16,185,129,0.1),transparent_70%)]' 
                            : 'bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(230,57,70,0.1),transparent_70%)]'}
                        `} />
                      )}
                      
                      {/* Static Glow */}
                      {!d.empty && hasTrades && (
                        <div className={`
                          absolute inset-0 opacity-5 transition-opacity duration-500 group-hover:opacity-15
                          ${isProfit ? 'bg-gradient-to-br from-emerald-500/20 to-transparent' : 'bg-gradient-to-br from-rose-500/20 to-transparent'}
                        `} />
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="heatmap"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-10"
          >
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-12 gap-y-10">
              {heatmapData.months.map((month, idx) => (
                <div key={idx} className="flex flex-col gap-4">
                  <div className="flex justify-between items-start border-b border-white/5 pb-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{month.name}</span>
                      <span className="text-[7px] font-bold text-slate-600 tracking-wider uppercase">{month.year}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-black italic tracking-tighter ${month.mPL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {month.mPL >= 0 ? '+' : ''}{Math.round(month.mPL).toLocaleString()}
                      </span>
                      <div className="flex gap-1.5 mt-0.5">
                        <span className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">{month.mGreen}G</span>
                        <span className="text-[7px] font-black text-rose-400 uppercase tracking-tighter">{month.mRed}R</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {month.days.map((day, dIdx) => {
                      const intensity = Math.max(0.5, Math.min(1, Math.abs(day.pl) / heatmapData.maxAbsPL));
                      const hasTrades = day.count > 0;
                      
                      return (
                        <motion.div
                          key={dIdx}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: (idx * 0.05) + (dIdx * 0.002) }}
                          className={`
                            w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full relative group/dot cursor-help transition-all duration-300
                            ${!hasTrades ? 'bg-slate-700/60 border border-white/10' : 
                              day.pl >= 0 ? 'bg-[#10b981]' : 'bg-[#e63946]'}
                          `}
                          style={hasTrades ? { 
                            opacity: Math.max(0.6, intensity),
                            filter: `brightness(${1.2 + (intensity * 0.6)}) saturate(${1.2 + (intensity * 0.3)})`,
                            boxShadow: day.pl >= 0 
                              ? `0 0 ${20 * intensity}px rgba(16, 185, 129, ${0.8 * intensity})` 
                              : `0 0 ${20 * intensity}px rgba(230, 57, 70, ${0.8 * intensity})`
                          } : {}}
                        >
                          {/* Enhanced Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-all z-50 shadow-2xl backdrop-blur-xl">
                            <div className="flex flex-col gap-1">
                               <span className="text-slate-500">{month.name} {day.day}, {month.year}</span>
                               <span className={day.pl >= 0 ? 'text-emerald-400' : 'text-journal-red'}>
                                  {day.count > 0 ? `${day.pl >= 0 ? '+' : ''}${formatCurrency(day.pl)}` : 'No Activity'}
                               </span>
                               {day.count > 0 && <span className="text-[7px] text-slate-600">{day.count} Trades</span>}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Heatmap Performance Summary */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-white/5">
               <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Heatmap Period P&L</span>
                  <p className={`text-lg font-black italic tracking-tighter ${heatmapData.totalPL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {heatmapData.totalPL >= 0 ? '+' : ''}{formatCurrency(heatmapData.totalPL)}
                  </p>
               </div>
               
               <div className="h-8 w-px bg-white/5" />

               <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-emerald-400/80 uppercase tracking-widest">Green Sessions</span>
                    <p className="text-xl font-black text-emerald-400 italic tracking-tighter">
                       {heatmapData.greenDays} <span className="text-[10px] font-bold text-slate-600 not-italic ml-1">DAYS</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-rose-400/80 uppercase tracking-widest">Red Sessions</span>
                    <p className="text-xl font-black text-rose-500 italic tracking-tighter">
                       {heatmapData.redDays} <span className="text-[10px] font-bold text-slate-600 not-italic ml-1">DAYS</span>
                    </p>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarSection;
