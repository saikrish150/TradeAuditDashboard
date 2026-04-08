import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, Activity, Calendar, Zap, Target } from 'lucide-react';
import { formatCurrency } from '../../utils';

const PerformanceSection = ({ trades }) => {
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

    const recentDays = Array.from(dailyMap.values())
      .filter(d => d.pl !== 0 && !isNaN(d.pl))
      .sort((a, b) => a.date - b.date)
      .slice(-15);

    const wins = recentDays.filter(d => d.pl > 0).length;
    const winRate = recentDays.length ? Math.round((wins / recentDays.length) * 100) : 0;
    const grossProfit = recentDays.filter(d => d.pl > 0).reduce((sum, d) => sum + d.pl, 0);
    const grossLoss = Math.abs(recentDays.filter(d => d.pl < 0).reduce((sum, d) => sum + d.pl, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? '99+' : '0.00') : (grossProfit / grossLoss).toFixed(2);

    return { todayPL, chartData: recentDays, winRate, profitFactor };
  }, [trades]);

  const CustomLabel = (props) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null || isNaN(value)) return null;
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
      style={{ minHeight: '240px' }}
      className="journal-glass rounded-[5rem] border-white/5 mb-12 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
    >
      <div className="flex flex-col lg:flex-row min-h-[240px]">
        {/* Today's Sidebar */}
        <div className="lg:w-[220px] p-6 ps-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 bg-white/[0.01]">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stats.todayPL >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
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
        <div className="flex-1 p-6 pe-10 flex flex-col min-h-[240px]">
           <div className="flex items-center justify-between mb-4">
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

           <div className="flex-1 w-full min-h-[140px] relative">
              <ResponsiveContainer width="100%" height={140}>
                 <BarChart data={stats.chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }} 
                      dy={10}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
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
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.pl >= 0 ? '#10b981' : '#f43f5e'} 
                          fillOpacity={0.8}
                          className="hover:fill-opacity-100 transition-all duration-300"
                        />
                      ))}
                      <LabelList dataKey="pl" content={<CustomLabel />} />
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
           
           <div className="mt-6 flex justify-between items-center text-[7px] font-black text-slate-600 uppercase tracking-widest px-2 border-t border-white/5 pt-4">
              <div className="flex gap-4">
                 <span>Latest {stats.chartData.length} Sessions</span>
                 <span className="text-slate-500 italic">Values shown in local currency</span>
              </div>
              <div className="flex gap-4">
                 <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Winning</span>
                 <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Drawdown</span>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceSection;
