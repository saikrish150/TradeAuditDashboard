import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy } from 'lucide-react';
import { formatCurrency } from '../../utils';

const CalendarSection = ({ trades }) => {
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
      const d = t.jsDate;
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

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="journal-glass rounded-2xl p-4 sm:p-6 border-journal-gold/10 overflow-hidden">
      <div className="flex items-center justify-between mb-8 px-2">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-journal-gold flex items-center gap-2">
          <CalendarIcon size={16} /> {monthName}
        </h3>
        
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
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(d => (
          <div key={d} className="text-center py-2 text-[9px] font-black uppercase tracking-widest text-slate-600">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
        
        {calendarData.map((d, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={!d.empty ? { scale: 1.05, y: -2, zIndex: 50 } : {}}
            className={`
              relative h-16 sm:h-24 rounded-lg sm:rounded-xl border flex flex-col justify-between p-1 sm:p-2 transition-all group
              ${d.empty ? 'bg-transparent border-transparent' : 'bg-slate-950/40 border-slate-800/50 hover:border-journal-gold/30 hover:shadow-2xl hover:shadow-journal-gold/5'}
              ${d.isBest ? 'gold-border-glow bg-journal-gold/[0.03]' : ''}
            `}
          >
            {!d.empty && (
              <>
                <div className="flex justify-between items-start relative z-10">
                  <span className={`text-[10px] font-black ${d.count > 0 ? 'text-white/80' : 'text-slate-700'}`}>{d.day}</span>
                  {d.isBest && (
                    <motion.div 
                      animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1, 1.2, 1] }} 
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Trophy size={12} className="text-journal-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                    </motion.div>
                  )}
                </div>

                {d.count > 0 && (
                  <div className="mt-auto relative z-10">
                    <p className={`
                      text-[11px] sm:text-[18px] font-black tabular-nums tracking-tighter leading-none mb-1
                      ${d.pl >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-journal-red drop-shadow-[0_0_10px_rgba(230,57,70,0.3)]'}
                    `}>
                      {d.pl >= 0 ? '+' : ''}{formatCurrency(d.pl).split('.')[0]}
                    </p>
                    <div className="flex items-center gap-1">
                      <div className={`h-1 w-1 rounded-full ${d.pl >= 0 ? 'bg-emerald-500' : 'bg-journal-red'}`} />
                      <p className="hidden sm:block text-[8px] font-black text-slate-500 uppercase tracking-widest">{d.count} Trades</p>
                    </div>
                  </div>
                )}

                {/* Dynamic Card Background Glow */}
                {!d.empty && d.count > 0 && (
                  <div className={`
                    absolute inset-0 opacity-10 transition-opacity duration-500 group-hover:opacity-20
                    ${d.pl >= 0 ? 'bg-gradient-to-br from-emerald-500/20 to-transparent' : 'bg-gradient-to-br from-rose-500/20 to-transparent'}
                  `} />
                )}
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CalendarSection;
