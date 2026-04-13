import React, { useMemo, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area, ReferenceLine } from 'recharts';
import { Radio, Zap, Activity, Cpu, Compass, Crosshair, Box, Shield, Terminal } from 'lucide-react';
import { formatCurrency } from '../../utils';

const PerformanceSection = ({ trades }) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for parallax
  const springConfig = { damping: 25, stiffness: 700 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-500, 500], [5, -5]);
  const rotateY = useTransform(smoothX, [-500, 500], [-5, 5]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const moveX = clientX - window.innerWidth / 2;
      const moveY = clientY - window.innerHeight / 2;
      mouseX.set(moveX);
      mouseY.set(moveY);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyMap = new Map();
    let todayPL = 0; let monthPL = 0;
    let todayCount = 0; let todayWins = 0;
    let monthCount = 0; let monthGP = 0; let monthGL = 0;
    let todayTrades = []; let monthTrades = [];

    trades.forEach(t => {
      const d = t.jsDate ? (t.jsDate.toDate ? t.jsDate.toDate() : new Date(t.jsDate)) : new Date();
      if (isNaN(d.getTime())) return;
      const val = parseFloat(t.pl) || 0;
      const key = d.toDateString();

      if (key === todayStr) { 
        todayPL += val; todayCount++; 
        if (val > 0) todayWins++;
        todayTrades.push({ val, d }); 
      }
      if (d >= firstOfMonth) { 
        monthPL += val; monthCount++;
        if (val > 0) monthGP += val; else if (val < 0) monthGL += Math.abs(val);
        monthTrades.push({ val, d }); 
      }
      const current = dailyMap.get(key) || { pl: 0, date: d, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) };
      current.pl += val;
      dailyMap.set(key, current);
    });

    const sliceDepth = windowWidth < 768 ? 5 : 15;
    const chartData = Array.from(dailyMap.values()).filter(d => d.pl !== 0).sort((a, b) => b.date - a.date).slice(0, sliceDepth);
    const maxVal = Math.max(...chartData.map(d => Math.abs(d.pl)), 100);
    const yDomain = [-maxVal * 1.5, maxVal * 1.5]; 

    const todayWR = todayCount ? Math.round((todayWins / todayCount) * 100) : 0;
    const monthPF = monthGL ? (monthGP / monthGL).toFixed(2) : (monthGP > 0 ? '9.9+' : '0.00');

    const todayTrend = todayTrades.map((t, i) => ({ x: i, y: t.val }));
    const monthTrend = monthTrades.slice(-20).map((t, i) => ({ x: i, y: t.val }));

    return { todayPL, monthPL, chartData, todayTrend, monthTrend, todayCount, todayWR, monthCount, monthPF, yDomain };
  }, [trades]);


  const BinocularHub = ({ value, label, side, trendData, subInfo }) => {
    const isPositive = value >= 0;
    const marginClasses = side === 'left' 
      ? '-mb-16 lg:mb-0 lg:-mr-24' 
      : '-mt-16 lg:mt-0 lg:-ml-24';
      
    return (
      <div className={`relative flex-shrink-0 z-30 ${marginClasses}`}>
        <motion.div 
          style={{ rotateX, rotateY }}
          className="w-40 h-40 md:w-64 md:h-64 rounded-full journal-glass border-4 border-white/10 shadow-[0_0_80px_-20px_rgba(0,0,0,1)] flex items-center justify-center relative overflow-hidden group"
        >
           {/* HUD Decorative Layers */}
           <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute inset-2 border-2 border-dashed border-white/5 rounded-full" />
           <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="absolute inset-6 border border-white/10 rounded-full border-t-emerald-500/30 border-b-rose-500/30" />
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
           
           {/* Mini Trend Area */}
           <div className="absolute inset-0 opacity-20 pointer-events-none translate-y-8">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={trendData}>
                    <Area type="monotone" dataKey="y" stroke={isPositive ? '#10b981' : '#f43f5e'} fill={isPositive ? '#10b98160' : '#f43f5e60'} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>

           {/* Core LCD Readout */}
           <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
              <div className="flex items-center gap-2 mb-1">
                 <Radio size={8} className={`${isPositive ? 'text-emerald-400' : 'text-rose-400'} animate-pulse`} />
                 <p className="text-[7px] md:text-[9px] font-black uppercase text-slate-400 tracking-[0.4em]">{label}</p>
              </div>
              <motion.h4 
                 key={value}
                 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                 className={`text-xl md:text-4xl font-black italic tracking-tighter ${isPositive ? 'text-emerald-400' : 'text-rose-500'} drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]`}
              >
                 {formatCurrency(value)}
              </motion.h4>
              
              <div className="mt-2 md:mt-4 flex gap-1.5 items-center bg-black/80 px-3 md:px-4 py-0.5 md:py-1 rounded-full border border-white/10">
                 <Activity size={8} className="text-emerald-500" />
                 <span className="text-[7px] md:text-[10px] font-black text-white italic tracking-widest">{subInfo}</span>
              </div>
           </div>

           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 opacity-20">
              {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 bg-white rounded-full" />)}
           </div>
        </motion.div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto mb-20 relative px-4"
    >
      <div className="flex flex-col lg:flex-row items-center justify-center relative perspective-[2000px]">
        
        {/* Today Hub */}
        <BinocularHub 
          value={stats.todayPL} 
          label="Today" 
          side="left" 
          trendData={stats.todayTrend} 
          subInfo={`TDS: ${stats.todayCount} | WR: ${stats.todayWR}%`}
        />

        <motion.div 
           style={{ rotateX, rotateY }}
           className="relative flex-1 w-full lg:w-auto h-64 bg-black/60 border-y-2 border-white/10 z-20 shadow-[0_0_120px_rgba(0,0,0,0.8)] px-8 md:px-20 flex flex-col justify-center journal-glass"
        >
           <div className="h-56 md:h-52 relative z-3">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart 
                   data={stats.chartData} 
                   margin={windowWidth < 768 ? { top: 30, right: 0, left: 0, bottom: 30 } : { top: 0, right: 0, left: 0, bottom: 25 }}
                 >
                    <defs>
                      <linearGradient id="hyperWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#10b98105" /></linearGradient>
                      <linearGradient id="hyperLoss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e05" /><stop offset="100%" stopColor="#f43f5e" /></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="6 6" stroke="#ffffff03" />
                    <XAxis dataKey="label" axisLine={{ stroke: '#ffffff10' }} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#475569' }} dy={25} />
                    <YAxis hide domain={stats.yDomain} />
                    <ReferenceLine y={0} stroke="#ffffff20" />
                    <Bar dataKey="pl" radius={[4, 4, 4, 4]} barSize={windowWidth < 768 ? 40 : 28}>
                       {stats.chartData.map((e, i) => <Cell key={i} fill={e.pl >= 0 ? "url(#hyperWin)" : "url(#hyperLoss)"} className="transition-all duration-300 hover:brightness-125" />)}
                       <LabelList dataKey="pl" content={(props) => {
                          const { x, y, width, height, value } = props;
                          if (!value) return null;
                          const isPos = value >= 0;
                          // In standard SVG, larger Y is lower on the screen
                          // For positive bars: y is the top tip. For negative bars: y+height is the bottom tip.
                          // However, Recharts height can be negative. We'll find the absolute extremity.
                          const tipY = isPos ? Math.min(y, y + height) : Math.max(y, y + height);
                          const labelY = isPos ? tipY - 15 : tipY + 22;
                          
                          return (
                            <text 
                              x={x + width / 2} 
                              y={labelY} 
                              fill={isPos ? '#10b981' : '#f43f5e'} 
                              textAnchor="middle" 
                              className="text-[11px] font-black tracking-tighter drop-shadow-lg"
                            >
                               {value > 0 ? '+' : ''}{Math.round(value).toLocaleString()}
                            </text>
                          );
                       }} />
                    </Bar>
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={({ active, payload }) => {
                       if (active && payload?.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="p-4 bg-black/95 border border-white/20 rounded-2xl backdrop-blur-3xl shadow-2xl border-t-emerald-500/50">
                               <p className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2"><Terminal size={8}/> {d.date.toDateString()}</p>
                               <p className={`text-lg font-black ${d.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(d.pl)}</p>
                            </div>
                          );
                       }
                       return null;
                    }} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </motion.div>

        {/* Monthly Hub */}
        <BinocularHub 
          value={stats.monthPL} 
          label="Monthly" 
          side="right" 
          trendData={stats.monthTrend} 
          subInfo={`TDS: ${stats.monthCount} | PF: ${stats.monthPF}`}
        />

      </div>
    </motion.div>
  );
};

export default PerformanceSection;
