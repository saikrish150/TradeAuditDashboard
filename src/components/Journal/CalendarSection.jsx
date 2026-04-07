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
    <div className="journal-glass rounded-2xl p-6 border-journal-gold/10 overflow-hidden">
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
            {d}
          </div>
        ))}
        
        {calendarData.map((d, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
              relative h-24 rounded-xl border flex flex-col justify-between p-2 transition-all
              ${d.empty ? 'bg-transparent border-transparent' : 'bg-slate-950/40 border-slate-800/50 hover:border-journal-gold/30'}
              ${d.isBest ? 'gold-border-glow bg-journal-gold/[0.03]' : ''}
            `}
          >
            {!d.empty && (
              <>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-black ${d.count > 0 ? 'text-white' : 'text-slate-700'}`}>{d.day}</span>
                  {d.isBest && <Trophy size={10} className="text-journal-gold animate-bounce" />}
                </div>

                {d.count > 0 && (
                  <div className="mt-auto">
                    <p className={`text-[9px] font-black tabular-nums tracking-tighter ${d.pl >= 0 ? 'text-emerald-400' : 'text-journal-red'}`}>
                      {d.pl >= 0 ? '+' : ''}{formatCurrency(d.pl)}
                    </p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{d.count} TRADES</p>
                  </div>
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
