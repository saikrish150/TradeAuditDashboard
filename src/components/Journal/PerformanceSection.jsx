import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, Activity, Calendar, Zap, Target } from 'lucide-react';
import { formatCurrency } from '../../utils';

const PerformanceSection = ({ trades }) => {
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safe date helper
  const getSafeDate = (d) => {
    if (!d) return new Date();
    const dateObj = d.toDate ? d.toDate() : new Date(d);
    return isNaN(dateObj.getTime()) ? new Date() : dateObj;
  };

  // Performance Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => getSafeDate(t.jsDate).toDateString() === today);
    const todayPL = todayTrades.reduce((sum, t) => sum + (t.pl || 0), 0);

    const dailyMap = new Map();
    trades.forEach(t => {
      const d = getSafeDate(t.jsDate);
      const key = d.toDateString();
      const val = parseFloat(t.pl) || 0;
      
      const current = dailyMap.get(key) || { 
        pl: 0, 
        wins: 0, 
        losses: 0, 
        total: 0, 
        date: d,
        label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      };
      
      current.pl += val;
      current.total++;
      if (val > 0) current.wins++; else if (val < 0) current.losses++;
      dailyMap.set(key, current);
    });

    const isMobileView = windowWidth < 768;
    const recentDays = Array.from(dailyMap.values())
      .filter(d => d.pl !== 0 && !isNaN(d.pl))
      .sort((a, b) => b.date - a.date) // Most Recent First
      .slice(0, isMobileView ? 7 : 15);

    const wins = recentDays.filter(d => d.pl > 0).length;
    const winRate = recentDays.length ? Math.round((wins / recentDays.length) * 100) : 0;
    const grossProfit = recentDays.filter(d => d.pl > 0).reduce((sum, d) => sum + d.pl, 0);
    const grossLoss = Math.abs(recentDays.filter(d => d.pl < 0).reduce((sum, d) => sum + d.pl, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? '99+' : '0.00') : (grossProfit / grossLoss).toFixed(2);

    return { todayPL, chartData: recentDays, winRate, profitFactor };
  }, [trades, windowWidth]);

  const CustomLabel = (props) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null || isNaN(value)) return null;
    
    // Hide labels on small mobile screens to prevent text collisions
    if (typeof window !== 'undefined' && window.innerWidth < 480) return null;

    const isPositive = value >= 0;
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill={isPositive ? '#10b981' : '#f43f5e'} 
        textAnchor="middle" 
        className="text-[8px] font-black tracking-tighter"
      >
        {value > 0 ? '+' : ''}{Math.round(value).toLocaleString()}
      </text>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ minHeight: '180px' }}
      className="journal-glass rounded-[4rem] border-white/5 mb-8 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
    >
      <div className="flex flex-col lg:flex-row min-h-[180px]">
        {/* Today's Sidebar */}
        <div className="lg:w-[220px] p-4 ps-6 md:ps-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 bg-white/[0.01]">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${stats.todayPL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
              {stats.todayPL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
           </div>
           
           <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Today's P&L</p>
           <h2 className={`text-3xl font-black tracking-tighter mb-2 ${stats.todayPL >= 0 ? 'text-white' : 'text-rose-500'}`}>
              {formatCurrency(stats.todayPL)}
           </h2>
           
           <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-journal-gold animate-pulse" />
              <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Active</span>
           </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-4 pe-10 flex flex-col min-h-[180px]">
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                 <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Calendar size={12} className="text-journal-gold" />
                    Historical Flow
                 </h3>
                 {/* Compact Metrics */}
                 <div className="flex gap-2">
                    <div className="px-2 py-0.5 rounded-md bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-1">
                       <Zap size={8} className="text-emerald-500" />
                       <span className="text-[8px] font-black text-emerald-400 italic">WR: {stats.winRate}%</span>
                    </div>
                    <div className="px-2 py-0.5 rounded-md bg-amber-500/5 border border-amber-500/10 flex items-center gap-1">
                       <Target size={8} className="text-amber-500" />
                       <span className="text-[8px] font-black text-amber-500 italic">PF: {stats.profitFactor}</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex-1 w-full min-h-[130px] relative">
              <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={stats.chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barWin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="barLoss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                        <stop offset="100%" stopColor="#e11d48" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }} 
                      dy={10}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(212, 175, 55, 0.03)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="journal-glass p-3 border-white/10 rounded-xl shadow-2xl backdrop-blur-xl">
                              <p className="text-[9px] font-black uppercase text-slate-500 mb-1">{data.date.toDateString()}</p>
                              <p className={`text-sm font-black ${data.pl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {formatCurrency(data.pl)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="pl" 
                      radius={[6, 6, 0, 0]}
                      barSize={windowWidth < 768 ? 40 : 32}
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.pl >= 0 ? 'url(#barWin)' : 'url(#barLoss)'}
                          className="hover:brightness-125 transition-all duration-300 cursor-pointer"
                        />
                      ))}
                      <LabelList dataKey="pl" content={<CustomLabel />} />
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </motion.div>
  );
};

export default PerformanceSection;
