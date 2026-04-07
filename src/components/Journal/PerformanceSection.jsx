import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import { formatCurrency } from '../../utils';

const PerformanceSection = ({ trades }) => {
  // Calculate today's P&L
  const todayPL = useMemo(() => {
    const today = new Date().toDateString();
    return trades
      .filter(t => t.jsDate?.toDateString() === today)
      .reduce((sum, t) => sum + (t.pl || 0), 0);
  }, [trades]);

  // Last 10 days P&L
  const chartData = useMemo(() => {
    const dailyData = {};
    const now = new Date();
    
    // Initialize last 10 days
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dailyData[d.toDateString()] = { date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), pl: 0, rawDate: d };
    }

    trades.forEach(t => {
      const dateStr = t.jsDate?.toDateString();
      if (dailyData[dateStr]) {
        dailyData[dateStr].pl += t.pl || 0;
      }
    });

    return Object.values(dailyData).sort((a, b) => a.rawDate - b.rawDate);
  }, [trades]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
      {/* P&L Card */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`
          relative p-8 rounded-2xl flex flex-col justify-center items-center gap-4
          journal-glass border-journal-gold/20 overflow-hidden
          ${todayPL >= 0 ? 'text-emerald-400' : 'text-journal-red'}
        `}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-journal-gold/30 to-transparent" />
        
        <div className={`p-4 rounded-full bg-slate-900/50 border border-slate-800 mb-2 ${todayPL >= 0 ? 'shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'shadow-[0_0_30px_rgba(255,59,59,0.2)]'}`}>
          {todayPL >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
        </div>
        
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Today's Performance</span>
        <h2 className={`text-5xl font-black tracking-tighter drop-shadow-2xl ${todayPL >= 0 ? 'glow-text' : ''}`}>
          {formatCurrency(todayPL)}
        </h2>
        
        <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-journal-gold/10 border border-journal-gold/20 text-journal-gold text-[10px] font-bold uppercase tracking-widest">
          <IndianRupee size={12} /> Live Terminal Data
        </div>
      </motion.div>

      {/* Bar Chart Section */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:col-span-2 journal-glass rounded-2xl p-6 border-journal-gold/10 flex flex-col h-[300px]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-journal-gold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-journal-gold animate-pulse" />
            10-Day Performance History
          </h3>
          <div className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Rolling Window</div>
        </div>

        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4AF3710" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                dy={10}
              />
              <YAxis 
                hide 
                domain={['auto', 'auto']}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="journal-glass p-3 border-journal-gold/30 rounded-xl shadow-2xl">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{data.date}</p>
                        <p className={`text-sm font-black ${data.pl >= 0 ? 'text-emerald-400' : 'text-journal-red'}`}>
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
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.pl >= 0 ? '#10b981' : '#FF3B3B'} 
                    fillOpacity={0.8}
                    className="hover:fill-opacity-100 transition-all duration-300"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default PerformanceSection;
