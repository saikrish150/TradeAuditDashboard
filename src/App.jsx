import React, { useState, useMemo, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, LabelList, ComposedChart, Scatter
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, Calendar, Clock,
  Target, Shield, Zap, Skull, Award, ArrowUpRight, ArrowDownRight,
  Briefcase, Hash, BarChart2, DollarSign,
  Info, CheckCircle2, XCircle, ChevronLeft, ChevronDown,
  Brain, History, Scale, Upload, FileSpreadsheet,
  XOctagon, ArrowUpCircle, CheckCircle, Search, ShieldCheck, Filter, Hammer, Footprints, ArrowRight,
  CalendarDays, BookOpen, Flame, ZapOff, Layers, Globe, HeartPulse, Timer, Book,
  CandlestickChart, LayoutDashboard, BrainCircuit, AlertTriangle, Diamond, BoxSelect, Trophy,
  Compass, BarChartHorizontal, CalendarRange, Signal, BarChart3, IndianRupee,
  Terminal, AlertCircle, Lightbulb, ListChecks, CheckSquare,
  ArrowRightCircle, Sparkles as SparklesIcon, Plus,
  Smile, Play, ShieldAlert, LogOut, ZapOff as ZapOffIcon
} from 'lucide-react';

import Card from './components/Card';
import SectionHeader from './components/SectionHeader';
import MetricCard from './components/MetricCard';
import ScoreBar from './components/ScoreBar';
import DonutCenter from './components/DonutCenter';
import CustomTooltip from './components/CustomTooltip';
import { AlertsView } from './components/AlertsView';
import { supabaseService } from './services/supabaseService';
import { authService } from './services/authService';
import AuthShield from './components/AuthShield';
import TradingJournal from './components/Journal/TradingJournal';
import ReviewTab from './components/Journal/ReviewTab';
import UtilityHub from './components/Journal/UtilityHUB';
import { exchangeRateService } from './services/exchangeRateService';
import { MONTH_MAP, COLORS, cleanCurrency, formatCurrency, parseCSV, getMarketCategory } from './utils';
import BackgroundQuotes from './components/BackgroundQuotes';

// Extracted Components
import MobileNav from './components/Common/MobileNav';
import TradeArchiveCarousel from './components/Common/TradeArchiveCarousel';
import { CustomSelect } from './components/Common/CustomSelect';

// Hooks
import { useTradeData } from './hooks/useTradeData';




const Badge = ({ children, color = "indigo" }) => {
  const colors = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-400"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${colors[color] || colors.indigo}`}>
      {children}
    </span>
  );
};

const CustomMobileSelect = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-select-container')) setIsOpen(false);
    };
    if (isOpen) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative custom-select-container">
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center gap-2 cursor-pointer bg-slate-950/80 hover:bg-black px-3 py-2 rounded-xl border border-white/10 shadow-inner transition-colors"
      >
        <span className="text-slate-100 text-[11px] font-black uppercase tracking-widest">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-journal-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <Motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 min-w-[180px] bg-[#0c0c0c]/95 backdrop-blur-2xl border border-journal-gold/30 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 z-[200]"
          >
            <div className="max-h-[250px] overflow-y-auto no-scrollbar py-2 flex flex-col gap-1 px-2">
              {options.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${value === opt.value ? 'bg-journal-gold/20 text-journal-gold shadow-sm border border-journal-gold/30' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const App = () => {
  const [activeSection, setActiveSection] = useState('journal');
  const [activeTab, setActiveTab] = useState('performance');
  const [rawTrades, setRawTrades] = useState(() => {
    try {
      const cached = localStorage.getItem('tr_trades_v7');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [rawSnapshots, setRawSnapshots] = useState(() => {
    try {
      const cached = localStorage.getItem('tr_snapshots_v7');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [notes, setNotes] = useState(() => {
    try {
      const cached = localStorage.getItem('tr_notes_v7');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [goals, setGoals] = useState(() => {
    try {
      const cached = localStorage.getItem('tr_goals_v7');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  // Filter States
  const [availableYears, setAvailableYears] = useState(['All']);
  const [availableMonths, setAvailableMonths] = useState(['All']);
  const [availableAssets, setAvailableAssets] = useState(['All']);

  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [datePreset, setDatePreset] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [heatmapMode, setHeatmapMode] = useState('pnl');
  const [isParsing, setIsParsing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [liveRate, setLiveRate] = useState(83.5);

  const [isFullHistory, setIsFullHistory] = useState(false);
  // NEW FEATURE START: Time Analysis Toggle State
  const [timeMarket, setTimeMarket] = useState('indian');
  const [timeInterval, setTimeInterval] = useState(60);
  // NEW FEATURE END

  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1. Establish User Session
    authService.getSession().then(session => {
      setUser(session?.user || null);
    });

    const authSub = authService.onAuthStateChange((_event, session) => {
      const newUser = session?.user || null;
      setUser(prev => (prev?.id === newUser?.id) ? prev : newUser);
    });

    // 2. Fetch live Forex rate
    exchangeRateService.getUsdToInrRate().then(rate => {
      setLiveRate(rate);
    });

    return () => {
      if (authSub) authSub.unsubscribe();
    };
  }, []);

  // 3. Smart-Tab Default Filtering: Dashboard defaults to Current Month, Journal to All
  useEffect(() => {
    if (activeSection === 'audit') {
      setDatePreset('CurrentMonth');
    } else if (activeSection === 'journal') {
      setDatePreset('All');
    }
  }, [activeSection]);

  useEffect(() => {
    if (!user) return;

    // Soft loading: Only show spinner if we have NO data yet
    if (rawTrades.length === 0) {
      setLoading(true);
    }

    // Subscribe to live data via Supabase with Full History awareness
    const subTrades = supabaseService.subscribeToTrades(user.id, (newData) => {
      // Logic for newData can be either a full set (initial) or a functional update (real-time)
      setRawTrades(newData);
      setLoading(false);
    }, isFullHistory);

    const subSnapshots = supabaseService.subscribeToSnapshots(user.id, setRawSnapshots, isFullHistory);
    const subNotes = supabaseService.subscribeToNotes(user.id, setNotes, isFullHistory);
    const subGoals = supabaseService.subscribeToGoals(user.id, setGoals);

    return () => {
      subTrades();
      subSnapshots();
      subNotes();
      subGoals();
    };
  }, [user, isFullHistory]);

  // Handle Local Persistence
  useEffect(() => {
    localStorage.setItem('tr_trades_v7', JSON.stringify(rawTrades));
    localStorage.setItem('tr_snapshots_v7', JSON.stringify(rawSnapshots));
    localStorage.setItem('tr_notes_v7', JSON.stringify(notes));
    localStorage.setItem('tr_goals_v7', JSON.stringify(goals));
  }, [rawTrades, rawSnapshots, notes, goals]);

  // Logic to trigger full history expansion
  useEffect(() => {
    if (isFullHistory) return; // Already in full mode
    
    const isGlobalAll = datePreset === 'All' && selectedYear === 'All' && selectedMonth === 'All' && selectedCategory === 'All' && selectedAsset === 'All';
    if (isGlobalAll) {
      setIsFullHistory(true);
    }
  }, [datePreset, selectedYear, selectedMonth, selectedCategory, selectedAsset]);

  useEffect(() => {
    if (!rawTrades.length) return;

    const now = new Date();
    const curMonthName = now.toLocaleString('default', { month: 'long' });
    const curYearName = now.getFullYear().toString();

    const timeFiltered = rawTrades.filter(t => {
      if (datePreset === 'CurrentMonth') {
        if (t.month !== curMonthName || t.year !== curYearName) return false;
      } else if (datePreset !== 'All') {
        if (['30', '60', '90'].includes(datePreset)) {
          const daysLimit = parseInt(datePreset);
          const diffDays = Math.ceil(Math.abs(now - t.jsDate) / (1000 * 60 * 60 * 24));
          if (diffDays > daysLimit) return false;
        } else if (datePreset === 'Custom') {
          if (startDate && t.jsDate < new Date(startDate)) return false;
          if (endDate && t.jsDate > new Date(endDate)) return false;
        }
      } else {
        if (selectedYear !== 'All' && t.year !== selectedYear) return false;
        if (selectedMonth !== 'All' && t.month !== selectedMonth) return false;
      }
      return true;
    });

    const catFiltered = selectedCategory === 'All' ? timeFiltered : timeFiltered.filter(t => t.category === selectedCategory);

    // YEAR FILTER FIX: Extract unique years from rawTrades for the dropdown
    const yearsFound = Array.from(new Set(rawTrades.map(t => t.year))).filter(Boolean).sort((a, b) => b - a);
    setAvailableYears(['All', ...yearsFound]);

    const yearFiltered = selectedYear === 'All' ? rawTrades : rawTrades.filter(t => t.year === selectedYear);
    const monthsFound = Array.from(new Set(yearFiltered.map(t => t.month)));
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    setAvailableMonths(['All', ...monthOrder.filter(m => monthsFound.includes(m))]);

    setAvailableAssets(['All', ...Array.from(new Set(catFiltered.map(t => t.market))).sort()]);
  }, [selectedYear, selectedMonth, selectedCategory, rawTrades, datePreset, startDate, endDate]);

  // Analytical Engine Layer
  const processedData = useTradeData({
    rawTrades,
    rawSnapshots,
    notes,
    datePreset,
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedCategory,
    selectedAsset,
    startDate,
    endDate
  });

  // Debugging & Analytics
  const { 
    metrics = {}, scores = {}, hierarchical = {}, activeMonths = [], barData = [], 
    maxDayAbsVal = 1, bestPeriod = ['', {}], worstPeriod = ['', {}], 
    statusStats = [], equity = [], outcomeDist = [], sizingData = [], 
    qualityStats = [], setupAnalysis = [], emotionStats = [], errors = [], 
    dynamicAudit = { start: [], continue: [] }, learnings = [], 
    weekdayEdge = [], bestDay, worstDay, aiBrief = {},
    trades = [], snapshots = [], filteredNotes = []
  } = processedData || {};

  // NEW FEATURE START: Time Analysis Calculation
  const timeAnalysisData = useMemo(() => {
    if (!trades || trades.length === 0) return { indian: [], others: [] };

    const getTradesForMarket = (isIndian) => {
      const indianKeywords = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'HDFC', 'SBIN', 'MCX', 'NSE', 'BSE', 'SENSEX'];
      return trades.filter(t => {
        const m = String(t.market || '').toUpperCase();
        const match = indianKeywords.some(k => m.includes(k));
        return isIndian ? match : !match;
      });
    };

    const processSlots = (tradesList, slots) => {
      return slots.map(slot => {
        const slotTrades = tradesList.filter(t => {
          const d = typeof t.jsDate === 'string' ? new Date(t.jsDate) : t.jsDate;
          if (!d || isNaN(d.getTime())) return false;
          const h = d.getHours();
          const m = d.getMinutes();
          const timeVal = h * 60 + m;
          
          let [sH, sM] = slot.start.split(':').map(Number);
          let [eH, eM] = slot.end.split(':').map(Number);
          const startVal = sH * 60 + sM;
          // Handle 24:00 wrap around for logic
          let endVal = eH * 60 + (eM || 0);
          if (slot.end === '24:00') endVal = 24 * 60;
          
          return timeVal >= startVal && timeVal < endVal;
        });

        const totalPL = slotTrades.reduce((sum, t) => sum + (parseFloat(t.pl) || 0), 0);
        const winCount = slotTrades.filter(t => String(t.isWin || '').toUpperCase() === 'WIN' || t.isWin === 'true' || t.isWin === true).length;
        const totalCount = slotTrades.length;
        const wr = totalCount > 0 ? Math.round((winCount / totalCount) * 100) : 0;

        return { ...slot, pl: totalPL, total: totalCount, wr };
      });
    };

    const formatTime = (totalMins) => {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Generate Indian Slots dynamically (09:15 to 15:30)
    const indianSlots = [];
    let curIn = 9 * 60 + 15;
    const endIn = 15 * 60 + 30;
    while (curIn < endIn) {
        let nxt = curIn + timeInterval;
        if (nxt > endIn) nxt = endIn;
        indianSlots.push({ start: formatTime(curIn), end: formatTime(nxt) });
        curIn = nxt;
    }

    // Generate Other Slots dynamically (00:00 to 24:00)
    const otherSlots = [];
    let curOt = 0;
    const endOt = 24 * 60;
    while (curOt < endOt) {
        let nxt = curOt + timeInterval;
        otherSlots.push({ 
            start: formatTime(curOt), 
            end: nxt >= endOt ? '24:00' : formatTime(nxt) 
        });
        curOt = nxt;
    }

    return {
      indian: processSlots(getTradesForMarket(true), indianSlots),
      others: processSlots(getTradesForMarket(false), otherSlots)
    };
  }, [trades, timeInterval]);
  // NEW FEATURE END

  useEffect(() => {
    if (!processedData || processedData.isEmpty) {
      setAiSuggestions(null);
      return;
    }

    const generateInbuiltSuggestions = () => {
      const suggestions = [];
      const wR = parseFloat(metrics.winRate) || 0;
      const rr = parseFloat(metrics.overallRR) || 0;

      // 1. Mathematical Expectancy Edge
      const avgWin = metrics.avgWin || 0;
      const avgLoss = Math.abs(metrics.avgLoss || 0);
      const winProb = wR / 100;
      const lossProb = 1 - winProb;
      const expectancy = (winProb * avgWin) - (lossProb * avgLoss);
      
      if (expectancy > 0) {
        suggestions.push(`System Edge Validated: Your strategy yields a positive expectancy of +${formatCurrency(expectancy)} per trade. Focus solely on mechanical execution; the math is in your favor.`);
      } else if (expectancy < 0 && (avgWin + avgLoss) > 0) {
        const requiredWr = Math.round((avgLoss / (avgWin + avgLoss)) * 100);
        suggestions.push(`System Leak Detected: Current expectancy is negative (${formatCurrency(expectancy)}/trade). To reach breakeven with your current R:R, you must boost your win rate above ${requiredWr}%.`);
      }

      // 2. Advanced Risk/Reward Dynamics
      if (rr > 0 && rr < 1 && wR < 60) {
        suggestions.push(`Critical Risk Warning: You are risking more than you make (1:${rr.toFixed(2)} R:R). You need an unsustainably high win rate (>50%) just to survive. Tighter invalidation levels are mandatory.`);
      } else if (rr >= 2 && wR < 40) {
        suggestions.push(`High R:R Profile: Your R:R is excellent (1:${rr.toFixed(2)}). A low win rate (${wR}%) is mathematically acceptable here. Do not alter your strategy during drawdowns—trust the asymmetrical payouts.`);
      }

      // 3. High-Impact Error Isolation
      if (errors && errors.length > 0) {
        const topError = errors[0];
        const errorFreq = ((topError.count / (trades.length || 1)) * 100).toFixed(0);
        if (topError.impact < 0) {
          suggestions.push(`Behavioral Sinkhole: "${topError.cat}" occurs in ${errorFreq}% of trades, draining ${formatCurrency(topError.impact)}. Eliminating this single flaw is the fastest path to compounding your account.`);
        }
      }

      // 4. Psychological Triggers
      const negativeEmotions = emotionStats?.filter(e => e.pl < 0).sort((a, b) => a.pl - b.pl) || [];
      if (negativeEmotions.length > 0) {
        const worstEmotion = negativeEmotions[0];
        if (worstEmotion.count >= 2) {
          suggestions.push(`Psychological Trigger: Trading while feeling "${worstEmotion.name}" correlates with severe underperformance (${formatCurrency(worstEmotion.pl)}). Implement a mandatory 24-hour cooling-off rule when this state hits.`);
        }
      }

      // 5. Temporal / Day of Week Edge
      if (bestDay && worstDay && bestDay.name !== worstDay.name && bestDay.count >= 2 && worstDay.count >= 2) {
        suggestions.push(`Temporal Edge: Extreme outperformance detected on ${bestDay.fullName}s (${bestDay.winRate}% WR). Conversely, ${worstDay.fullName}s are historically toxic (${worstDay.winRate}% WR). Consider sizing down heavily on ${worstDay.fullName}s.`);
      }

      // 6. Setup Quality Discrepancy
      if (qualityStats && qualityStats.length > 0) {
        const aGrade = qualityStats.find(q => q.grade === 'A');
        const cGrade = qualityStats.find(q => q.grade === 'C');
        if (aGrade && cGrade && cGrade.count > aGrade.count) {
           suggestions.push(`Discipline Gap: You are taking more C-grade setups (${cGrade.count}) than A-grade setups (${aGrade.count}). Stop forcing trades in sub-optimal environments.`);
        }
      }

      // 7. Directional Bias
      if (statusStats && statusStats.length >= 2) {
        const longStat = statusStats.find(s => s.name.toUpperCase() === 'LONG' || s.name.toUpperCase() === 'BUY');
        const shortStat = statusStats.find(s => s.name.toUpperCase() === 'SHORT' || s.name.toUpperCase() === 'SELL');
        
        if (longStat && shortStat) {
          if (longStat.pl > 0 && shortStat.pl < 0) {
            suggestions.push(`Directional Edge: You have a strong edge going LONG (${formatCurrency(longStat.pl)}), but SHORTs are bleeding (${formatCurrency(shortStat.pl)}). Avoid shorting in the current market regime.`);
          } else if (shortStat.pl > 0 && longStat.pl < 0) {
            suggestions.push(`Directional Edge: You excel at SHORTing (${formatCurrency(shortStat.pl)}), but LONGs are costing you (${formatCurrency(longStat.pl)}). Respect your bearish bias.`);
          }
        }
      }

      // 8. Profit Factor Check
      const pf = parseFloat(metrics.pf) || 0;
      if (pf >= 2.0) {
        suggestions.push(`Profit Factor Validation: A PF of ${pf} indicates you make ${pf} for every 1 you lose. This is elite-level robustness. The only goal now is scaling sizing without emotional degradation.`);
      } else if (pf > 0 && pf < 1.0) {
        suggestions.push(`Profit Factor Warning: A PF of ${pf} means you lose more than you make. You must prioritize capital preservation over aggressive entries until this crosses 1.25.`);
      }

      // 9. Setup/Strategy Analysis
      if (setupAnalysis && setupAnalysis.length >= 2) {
        const bestSetup = setupAnalysis[setupAnalysis.length - 1];
        const worstSetup = setupAnalysis[0]; 
        
        if (worstSetup && worstSetup.pl < 0 && worstSetup.trades >= 3) {
           suggestions.push(`Strategy Leak: The "${worstSetup.name}" setup is severely underperforming (${formatCurrency(worstSetup.pl)} over ${worstSetup.trades} trades). Remove it from your playbook temporarily.`);
        }
        if (bestSetup && bestSetup.pl > 0 && bestSetup.trades >= 3) {
           suggestions.push(`Core Edge: The "${bestSetup.name}" setup is your absolute best performer (${formatCurrency(bestSetup.pl)}). Build your entire session around waiting for this exact setup.`);
        }
      }

      setAiSuggestions(suggestions.slice(0, 8));
    };

    generateInbuiltSuggestions();
  }, [processedData]);

  return (
    <AuthShield>
    <div className={`min-h-screen overflow-x-hidden ${activeSection === 'journal' ? 'bg-journal-bg' : 'bg-journal-bg'} text-journal-text-primary font-sans p-4 md:p-8 pb-24 md:pb-8 relative transition-colors duration-1000`}>
      {/* Dynamic Background Polish */}
      <div className="absolute inset-0 bg-gradient-to-tr from-journal-red/5 via-transparent to-journal-gold/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iMSIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>
      <BackgroundQuotes />
      <div className="max-w-7xl mx-auto relative">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 relative">
          <div className="flex items-center gap-6 z-20 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">

              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <h1 className="text-lg md:text-xl font-black tracking-[0.4em] uppercase text-white italic drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Trader</h1>
                </div>
                <div className="flex items-center gap-3">
                   <h2 className="text-xl md:text-3xl font-black italic tracking-tighter uppercase leading-none glow-text text-transparent bg-clip-text bg-gradient-to-r from-journal-gold via-white to-journal-gold pr-2">Dashboard</h2>
                </div>
              </div>

              <button 
                onClick={() => authService.signOut()}
                className="modern-glass p-2.5 text-journal-text-secondary hover:text-journal-red transition-all flex items-center justify-center border border-white/5 active:scale-95 group/logout"
                title="Disconnect Dashboard"
              >
                <LogOut size={16} className="group-hover/logout:-translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Mobile Filter Trigger - only visible on audit tab */}
            {activeSection === 'audit' && (
              <button 
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="md:hidden p-2.5 rounded-xl modern-glass border border-white/10 text-slate-400 active:scale-95 transition-all"
              >
                <Filter size={18} className={showMobileFilters ? 'text-journal-gold' : ''} />
              </button>
            )}
          </div>

          {rawTrades.length > 0 && (
            <div className="hidden md:flex bg-journal-secondary/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto scrollbar-hide no-scrollbar w-full md:w-auto relative z-20">
              {[
                { id: 'alerts', label: 'Trade Alerts', icon: Signal },
                { id: 'journal', label: 'Trade Journal', icon: History },
                { id: 'audit', label: 'Trade Audit', icon: ShieldCheck }
              ].map((tab) => (
                <div key={tab.id} className="relative">
                  <button
                    onClick={() => setActiveSection(tab.id)}
                    className={`
                      relative px-6 py-2.5 rounded-xl flex items-center gap-2.5 
                      text-[10px] font-black uppercase tracking-[0.2em] transition-all 
                      whitespace-nowrap flex-shrink-0 z-10
                      ${activeSection === tab.id ? 'text-journal-bg' : 'text-journal-text-muted hover:text-white'}
                    `}
                  >
                    <tab.icon size={14} className={activeSection === tab.id ? 'text-journal-bg' : 'text-journal-text-muted transition-colors'} />
                    {tab.label}

                    {activeSection === tab.id && (
                      <Motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-journal-gold rounded-xl shadow-lg shadow-journal-gold/30"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

        </header>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {showMobileFilters && activeSection === 'audit' && (
            <>
              <Motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowMobileFilters(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[160] md:hidden"
              />
              <Motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[170] bg-journal-bg/95 backdrop-blur-2xl rounded-t-[32px] border-t border-white/10 p-6 md:hidden max-h-[80vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                   <Filter className="text-journal-gold" /> Filters
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Timeframe</span>
                    <CustomMobileSelect
                      value={datePreset}
                      onChange={setDatePreset}
                      options={[
                        { value: 'All', label: 'All Time' },
                        { value: 'CurrentMonth', label: 'Current Month' },
                        { value: '30', label: 'Past 30 Days' },
                        { value: '60', label: 'Past 60 Days' },
                        { value: '90', label: 'Past 90 Days' },
                        { value: 'Custom', label: 'Custom Range' },
                      ]}
                    />
                  </div>
                  {datePreset === 'Custom' && (
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-2">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} className="bg-transparent text-slate-100 text-[11px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none flex-1" />
                      <span className="text-slate-500 text-[11px]">TO</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} className="bg-transparent text-slate-100 text-[11px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none flex-1 text-right" />
                    </div>
                  )}
                  
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Market</span>
                    <CustomMobileSelect
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      options={[
                        { value: 'All', label: 'All Types' },
                        { value: 'Indian', label: 'Indian' },
                        { value: 'Other', label: 'Other' },
                      ]}
                    />
                  </div>
 
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Asset</span>
                    <CustomSelect
                      value={selectedAsset}
                      onChange={setSelectedAsset}
                      dropdownPosition="top"
                      options={(availableAssets || []).map(a => ({ value: a, label: a === 'All' ? 'All Assets' : a }))}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full mt-8 py-4 bg-journal-gold text-journal-bg rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-journal-gold/20 active:scale-95 transition-all hover:brightness-110"
                >
                  Apply Filters
                </button>
              </Motion.div>
            </>
          )}
        </AnimatePresence>
        {/* Professional Mobile Bottom Navigation */}
        <MobileNav activeSection={activeSection} setActiveSection={setActiveSection} />

        
        {rawTrades.length > 0 && activeSection === 'audit' && (
          <div className="hidden md:flex flex-wrap items-center justify-center md:justify-end gap-2 mb-8 mt-2 relative z-10 w-full bg-transparent p-1 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl hover:bg-white/10 transition-colors">
              <Clock size={12} className="text-slate-500 ml-2" />
              <CustomSelect
                value={datePreset}
                onChange={setDatePreset}
                className="w-32"
                triggerClassName="bg-transparent border-none shadow-none px-1 py-0.5"
                options={[
                  { value: 'All', label: 'All Time' },
                  { value: 'CurrentMonth', label: 'Current Month' },
                  { value: '30', label: 'Past 30 Days' },
                  { value: '60', label: 'Past 60 Days' },
                  { value: '90', label: 'Past 90 Days' },
                  { value: 'Custom', label: 'Custom Range' }
                ]}
              />
            </div>
            {datePreset === 'Custom' && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} className="bg-transparent text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none" />
                <span className="text-slate-500 text-[10px]">-</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} className="bg-transparent text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none" />
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl hover:bg-white/10 transition-colors">
              <Globe size={12} className="text-slate-500 ml-2" />
              <CustomSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                className="w-32"
                triggerClassName="bg-transparent border-none shadow-none px-1 py-0.5"
                options={[
                  { value: 'All', label: 'Type: All' },
                  { value: 'Indian', label: 'Indian Markets' },
                  { value: 'Other', label: 'Other Markets' }
                ]}
              />
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl hover:bg-white/10 transition-colors">
              <Hash size={12} className="text-slate-500 ml-2" />
              <CustomSelect
                value={selectedAsset}
                onChange={setSelectedAsset}
                className="w-28"
                triggerClassName="bg-transparent border-none shadow-none px-1 py-0.5"
                options={(availableAssets || []).map(a => ({ value: a, label: a === 'All' ? 'Asset: All' : a }))}
              />
            </div>
            {datePreset === 'All' && (
              <>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                  <Filter size={12} className="text-slate-500 ml-2" />
                  <CustomSelect
                    value={selectedYear}
                    onChange={setSelectedYear}
                    className="w-24"
                    triggerClassName="bg-transparent border-none shadow-none px-1 py-0.5"
                    options={(availableYears || []).map(y => ({ value: y, label: y === 'All' ? 'Year: All' : y }))}
                  />
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                  <CalendarDays size={12} className="text-slate-500 ml-2" />
                  <CustomSelect
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    className="w-28"
                    triggerClassName="bg-transparent border-none shadow-none px-1 py-0.5"
                    options={(availableMonths || []).map(m => ({ value: m, label: m === 'All' ? 'Month: All' : m }))}
                  />
                </div>
              </>
            )}
          </div>
        )}


        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-t-2 border-journal-gold rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.3)]" />
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Cloud Terminal...</p>
          </div>
        ) : (!rawTrades || rawTrades.length === 0) && !isParsing ? (
          <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
            <Card className="max-w-xl w-full p-12 border-dashed border-2 border-slate-800">
              <div className="w-20 h-20 bg-journal-gold/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse"><Signal className="text-journal-gold" size={40} /></div>
              <h1 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">Trader<span className="text-journal-gold">Dashboard</span> Cloud</h1>
              <p className="text-slate-400 mb-10 text-xs font-bold uppercase tracking-[0.2em]">Institutional Performance Terminal (Connected)</p>
              <button 
                onClick={() => setActiveSection('journal')}
                className="inline-flex items-center gap-3 bg-journal-gold hover:bg-journal-gold/90 text-journal-bg px-10 py-4 rounded-2xl cursor-pointer font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-journal-gold/20"
              >
                <Plus size={18} /> Start Journaling
              </button>
            </Card>
          </div>
        ) : processedData?.isEmpty ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4"><Search size={48} className="text-slate-800" /><p className="text-slate-500 uppercase font-black text-xs tracking-[0.2em]">No data found for this selection.</p><button onClick={() => { setSelectedYear('All'); setSelectedMonth('All'); setDatePreset('CurrentMonth'); }} className="text-[10px] font-black uppercase text-journal-gold underline">Reset Filters</button></div>
        ) : (
          <Motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {activeSection === 'alerts' && (
               <AlertsView />
             )}
 
             {activeSection === 'journal' && (
                <TradingJournal 
                  liveRate={liveRate} 
                  user={user}
                  trades={rawTrades}
                  snapshots={rawSnapshots}
                  notes={notes}
                  goals={goals}
                  isFullHistory={isFullHistory}
                  setIsFullHistory={setIsFullHistory}
                  setRawTrades={setRawTrades}
                  setRawSnapshots={setRawSnapshots}
                  setNotes={setNotes}
                  setGoals={setGoals}
                />
             )}
 
             {activeSection === 'audit' && (
               <div className="space-y-6 md:space-y-12">
                 <div className="flex bg-transparent p-1 rounded-xl border border-white/5 overflow-x-auto scrollbar-hide no-scrollbar">
                   {[
                     { id: 'performance', label: 'Performance', icon: Activity },
                     { id: 'audit', label: 'Audit', icon: ShieldCheck },
                     { id: 'review', label: 'Review', icon: LayoutDashboard },
                     { id: 'strategies', label: 'Strategies', icon: Target }
                   ].map((t) => (
                     <button
                       key={t.id}
                       onClick={() => setActiveTab(t.id)}
                       className={`
                         flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 transition-all relative rounded-lg
                         ${activeTab === t.id 
                           ? 'bg-journal-gold text-journal-bg shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                           : 'text-journal-text-muted hover:text-white hover:bg-white/5'}
                       `}
                     >
                       <t.icon size={12} className={activeTab === t.id ? 'text-journal-bg' : ''} />
                       {t.label}
                     </button>
                   ))}
                 </div>

                  {activeTab === 'review' && (
                    <ReviewTab 
                      user={user}
                      trades={rawTrades} 
                      snapshots={rawSnapshots} 
                      notes={notes} 
                      setNotes={setNotes}
                    />
                  )}

                 {activeTab === 'audit' && (
                   <div className="space-y-6 md:space-y-12">
                     <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         <Card className="p-8 border-rose-500/30 bg-rose-500/5 col-span-2 relative text-white">
                           <SectionHeader icon={Hammer} title="Diagnosis" color="text-rose-400" />
                           <div className="p-6 bg-slate-950/40 rounded-3xl border border-rose-500/20 mb-6">
                             <div className="flex items-center gap-3 mb-2"><Terminal className="text-indigo-400" size= {16} /><h4 className="text-xs font-black uppercase text-indigo-400 tracking-widest">AI Institutional Brief</h4></div>
                             <p className="text-sm font-black text-white italic mb-2 uppercase tracking-tighter leading-none">Trader Profile: {String(aiBrief.profile)}</p>
                             <p className="text-xs text-slate-300 leading-relaxed font-medium mt-2">{String(aiBrief.narrative)}</p>
                             <p className="text-xs text-indigo-300 font-bold mt-2 uppercase tracking-tighter italic">Verdict: {String(aiBrief.reviewStatement)}</p>
                           </div>
                           <div className="space-y-3">
                             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2"><ListChecks size={14} /> Priority Action Steps</p>
                             {(aiBrief?.prioritySteps || []).map((step, i) => (
                               <div key={i} className="flex gap-3 p-3 bg-slate-800/40 rounded-2xl border border-slate-700/50 text-xs font-bold leading-none items-center shadow-lg"><CheckSquare size={14} className="text-indigo-500" /> {String(step)}</div>
                             ))}
                           </div>
                         </Card>

                         <Card className="p-8">
                           <SectionHeader icon={BrainCircuit} title="Insights" color="text-amber-400" />
                           <div className="space-y-4">
                             {aiSuggestions ? (
                               <div className="space-y-2">
                                 {aiSuggestions.map((s, i) => (
                                   <div key={i} className="flex gap-3 items-start p-2 animate-in slide-in-from-right duration-500">
                                     <ArrowRightCircle className="text-indigo-400 mt-0.5 shrink-0" size={14} />
                                     <p className="text-[11px] text-slate-300 leading-tight font-medium"> {String(s)} </p>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-xs text-slate-500 text-center py-10">Upload trade data to generate strategy.</p>
                             )}
                           </div>
                         </Card>
                       </div>
                     </Motion.div>

                     {/* Behavioral Edge: Emotions & Errors */}
                     <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <Card className="p-8 bg-purple-500/5 relative text-white">
                           <SectionHeader icon={Smile} title="Emotions" color="text-purple-400" />
                           <div className="relative w-full h-[300px]">
                             <DonutCenter value={emotionStats.reduce((acc, curr) => acc + curr.pl, 0)} />
                             <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                               <PieChart>
                                 <Pie data={emotionStats} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="absImpact" label={({ name, pl }) => `${String(name)}: ${formatCurrency(pl)}`}>
                                   {emotionStats.map((e, idx) => <Cell key={idx} fill={COLORS.qualityPalette[idx % COLORS.qualityPalette.length]} />)}
                                 </Pie>
                                 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }} formatter={(val, name, props) => [`${formatCurrency(props.payload.pl)}`, String(props.payload.name)]} />
                               </PieChart>
                             </ResponsiveContainer>
                           </div>
                         </Card>

                         <Card className="p-8">
                           <SectionHeader icon={ZapOffIcon} title="Errors" color="text-rose-400" />
                           <div className="h-[300px]">
                             <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                               <BarChart data={errors} layout="vertical" margin={{ left: 40, right: 20 }}>
                                 <XAxis type="number" hide />
                                 <YAxis type="category" dataKey="cat" stroke={COLORS.white} fontSize={10} width={100} axisLine={false} tickLine={false} />
                                 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} cursor={{ fill: 'transparent' }} formatter={(v) => [`${formatCurrency(v)} Impact`, 'Total Loss']} />
                                 <Bar dataKey="impact" fill={COLORS.rose} radius={[0, 4, 4, 0]} activeBar={false}>{errors.map((e, i) => <Cell key={i} fillOpacity={1 - (i * 0.1)} />)}</Bar>
                               </BarChart>
                             </ResponsiveContainer>
                           </div>
                         </Card>
                       </div>
                     </Motion.div>

                     {/* Strategic Direction: Start / Continue */}
                     <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Card className="p-8 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                             <ShieldCheck size={120} className="text-emerald-500" />
                           </div>
                           
                           <div className="relative z-10">
                             <div className="flex items-center justify-between mb-8">
                               <SectionHeader icon={Play} title="Keep Doing" color="text-emerald-400" />
                               <Badge color="emerald">Edge Reinforcement</Badge>
                             </div>
                           <div className="space-y-4">
                             {(dynamicAudit?.continue || []).map((item, i) => (
                               <div key={i} className="flex gap-4 p-5 bg-slate-900/80 rounded-[2rem] border border-emerald-500/20 text-[11px] font-black uppercase tracking-tight text-emerald-100 shadow-xl hover:border-emerald-500/40 transition-all hover:translate-x-1">
                                 <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                   <CheckCircle size={16} className="text-emerald-400" />
                                 </div>
                                 <p className="leading-relaxed">{String(item)}</p>
                               </div>
                             ))}
                             {dynamicAudit.continue.length === 0 && <p className="text-center text-slate-500 py-10">No recent positive trends detected.</p>}
                            </div>
                           </div>
                         </Card>
                         <Card className="p-8 border-rose-500/20 bg-rose-500/5 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                             <ZapOff size={120} className="text-rose-500" />
                           </div>

                           <div className="relative z-10">
                             <div className="flex items-center justify-between mb-8">
                               <SectionHeader icon={ShieldAlert} title="Stop Doing" color="text-rose-400" />
                               <Badge color="rose">Behavioral Debt</Badge>
                             </div>
                           <div className="space-y-4">
                             {(dynamicAudit?.start || []).map((item, i) => (
                               <div key={i} className="flex gap-4 p-5 bg-slate-900/80 rounded-[2rem] border border-rose-500/20 text-[11px] font-black uppercase tracking-tight text-rose-100 shadow-xl hover:border-rose-500/40 transition-all hover:translate-x-1">
                                 <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                                   <XCircle size={16} className="text-rose-400" />
                                 </div>
                                 <p className="leading-relaxed">{String(item)}</p>
                               </div>
                             ))}
                             {dynamicAudit.start.length === 0 && <p className="text-center text-slate-500 py-10">No recent behavioral leaks detected.</p>}
                           </div>
                           </div>
                         </Card>
                       </div>
                     </Motion.div>

                      {/* NEW FEATURE START: Time Analysis Section */}
                      <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <SectionHeader icon={Timer} title="Time Analysis" sub="Performance Breakdown by Entry Window" />
                          <div className="flex flex-wrap gap-3 items-center">
                            {/* Market Toggle */}
                            <div className="flex bg-journal-secondary/50 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                              <button
                                onClick={() => setTimeMarket('indian')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeMarket === 'indian' ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' : 'text-journal-text-muted hover:text-white'}`}
                              >
                                Indian
                              </button>
                              <button
                                onClick={() => setTimeMarket('others')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeMarket === 'others' ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' : 'text-journal-text-muted hover:text-white'}`}
                              >
                                Other
                              </button>
                            </div>
                            
                            {/* Interval Toggle */}
                            <div className="flex bg-journal-secondary/50 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                              {[15, 30, 60, 120, 180].map(val => (
                                <button
                                  key={val}
                                  onClick={() => setTimeInterval(val)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeInterval === val ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' : 'text-journal-text-muted hover:text-white'}`}
                                >
                                  {val >= 60 ? `${val/60}H` : `${val}M`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 pb-4 overflow-hidden">
                          {timeAnalysisData[timeMarket].map((slot, i) => (
                            <Card key={i} className={`p-4 transition-all hover:scale-[1.05] border-t-2 overflow-hidden relative group ${slot.total === 0 ? 'opacity-40 grayscale' : slot.pl >= 0 ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-transparent' : 'border-rose-500/50 bg-gradient-to-b from-rose-500/10 to-transparent'}`}>
                              {/* Background Glow */}
                              {slot.total > 0 && (
                                <div className={`absolute -top-10 -right-10 w-24 h-24 blur-3xl opacity-20 rounded-full pointer-events-none transition-opacity group-hover:opacity-40 ${slot.pl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              )}
                              
                              <div className="relative z-10 flex flex-col gap-2">
                                {/* Time Header */}
                                <div className="flex items-center gap-1.5 opacity-80">
                                  <Clock size={14} className={slot.total > 0 ? "text-indigo-400" : "text-slate-500"} />
                                  <span className="text-xs font-black tracking-widest text-slate-300">{slot.start}</span>
                                </div>
                                
                                {/* P&L - HERO */}
                                <div className="my-1">
                                  <span className={`text-xl font-black tracking-tighter drop-shadow-md ${slot.total === 0 ? 'text-slate-500' : slot.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {slot.total > 0 ? (slot.pl >= 0 ? '+' : '') + formatCurrency(slot.pl) : '-'}
                                  </span>
                                </div>

                                {/* Micro Metrics */}
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex flex-col">
                                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">WR</span>
                                    <span className={`text-[10px] font-black ${slot.wr >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{slot.wr}%</span>
                                  </div>
                                  <div className="flex flex-col text-right">
                                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Vol</span>
                                    <span className="text-[10px] font-black text-slate-300">{slot.total}</span>
                                  </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="mt-2 h-0.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
                                  <Motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${slot.wr}%` }}
                                    className={`h-full shadow-[0_0_8px_currentColor] ${slot.wr >= 50 ? 'bg-emerald-500 text-emerald-500' : 'bg-rose-500 text-rose-500'}`}
                                  />
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </Motion.div>
                      {/* NEW FEATURE END */}

                       <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                         <Card className="p-8 border-t border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                         <SectionHeader icon={Activity} title="Scorecard" sub="Behavioral Grade Summary" />
                         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 pt-2">
                           <ScoreBar label="Risk Management" score={scores.risk || 0} color="text-amber-400" />
                           <ScoreBar label="Execution Discipline" score={scores.discipline || 0} color="text-indigo-400" />
                           <ScoreBar label="Psychology & Mood" score={scores.psychology || 0} color="text-purple-400" />
                           <ScoreBar label="Equity Consistency" score={scores.consistency || 0} color="text-rose-400" />
                         </div>
                         <div className="mt-8 p-4 bg-slate-800/30 rounded-2xl text-center">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">AGGREGATE PERFORMANCE SCORE</p>
                           <p className="font-black text-4xl text-white">{String(Math.round(Object.values(scores || {}).reduce((a, b) => a + b, 0) / 4))}%</p>
                         </div>
                       </Card>
                     </Motion.div>

                      {/* NEW FEATURE START: Most Important Learning (Moved to bottom, Ascending Sort) */}
                      <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                        <Card className="p-8">
                          <SectionHeader icon={Lightbulb} title="Most Important Learning" color="text-amber-400" />
                          <div className="space-y-4 mt-6">
                            {[...learnings].sort((a, b) => a.pl - b.pl).map((item, i) => (
                              <div key={i} className="flex flex-col gap-2 p-4 bg-slate-900/40 rounded-2xl border border-white/5 hover:border-journal-gold/20 transition-all group">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-journal-gold/50" />
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{item.date}</span>
                                  </div>
                                  <span className={`text-[10px] font-mono font-bold ${item.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatCurrency(item.pl)}
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                                  "{item.text}"
                                </p>
                              </div>
                            ))}
                            {learnings.length === 0 && (
                              <p className="text-center text-slate-500 py-10 uppercase text-[10px] font-black tracking-widest italic animate-pulse">
                                No critical learnings documented for this period.
                              </p>
                            )}
                          </div>
                        </Card>
                      </Motion.div>
                      {/* NEW FEATURE END */}
                   </div>
                 )}

                 {activeTab === 'performance' && (
                   <div className="space-y-6 md:space-y-12">
                     <SectionHeader icon={Briefcase} title="Financials" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard title="Trades" value={String(metrics.total || 0)} icon={Hash} />
                  <MetricCard title="Win Rate" value={`${String(metrics.winRate || 0)}%`} icon={TrendingUp} trend="up" />
                  <MetricCard title="P&L" value={formatCurrency(metrics.net || 0)} icon={IndianRupee} trend={(metrics.net || 0) >= 0 ? "up" : "down"} size="large" />
                  <MetricCard title="PF" value={String(metrics.pf || 0)} icon={BarChart2} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard title="Avg Win" value={formatCurrency(metrics.avgWin || 0)} icon={ArrowUpRight} trend="up" colorClass="text-emerald-400" />
                  <MetricCard title="Avg Loss" value={formatCurrency(metrics.avgLoss || 0)} icon={ArrowDownRight} trend="down" colorClass="text-rose-400" />
                  <MetricCard title="Max Win" value={formatCurrency(metrics.maxProfit || 0)} icon={Flame} colorClass="text-emerald-500" />
                  <MetricCard title="Max Loss" value={formatCurrency(metrics.maxLoss || 0)} icon={ZapOff} colorClass="text-rose-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard title="R:R" value={`1:${String(metrics.overallRR)}`} icon={Scale} colorClass="text-indigo-400" />
                  <MetricCard title="Expectancy" value={`₹${String(metrics.expectancy)}`} icon={Zap} colorClass={metrics.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"} />
                </div>
                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={Calendar} title="Activity" sub="Hierarchical Performance Drilldown" color="text-amber-400" />
                  <div className="mb-10">
                    {selectedYear === 'All' && datePreset === 'All' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(hierarchical.yearData || {}).map(([year, data]) => (
                          <Card key={year} className="p-6 cursor-pointer group hover:border-indigo-500" onClick={() => setSelectedYear(year)}>
                            <div className="flex justify-between items-center mb-4"><h4 className="text-2xl font-black text-white">{String(year)}</h4><ArrowRight size={18} className="text-slate-600 group-hover:text-indigo-400 transition-colors" /></div>
                            <p className={`text-xl font-mono font-bold ${data.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(data.pl)}</p>
                            <p className="text-[10px] text-slate-500 font-black uppercase mt-1">{String(data.count)} Trades Taken</p>
                          </Card>
                        ))}
                      </div>
                    ) : (selectedMonth === 'All' && datePreset === 'All') ? (
                      <div className="space-y-4">
                        <button onClick={() => setSelectedYear('All')} className="flex items-center gap-2 text-[10px] font-black uppercase text-journal-gold hover:text-white mb-2 transition-colors"><ChevronLeft size={14} /> Back to Yearly View</button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(hierarchical.monthData || {}).map(([monthYear, data]) => (
                            <Card key={monthYear} className="p-6 cursor-pointer group hover:border-journal-gold/50" onClick={() => setSelectedMonth(monthYear.split(' ')[0])}>
                              <div className="flex justify-between items-center mb-2"><h4 className="text-sm font-black text-slate-400 uppercase">{String(monthYear.split(' ')[0])}</h4><ArrowRight size={14} className="text-slate-600 group-hover:text-journal-gold transition-colors" /></div>
                              <p className={`text-lg font-mono font-bold ${data.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(data.pl)}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{String(data.count)} Trades</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          {datePreset === 'All' && <button onClick={() => setSelectedMonth('All')} className="flex items-center gap-2 text-[10px] font-black uppercase text-journal-gold hover:text-white transition-colors"><ChevronLeft size={14} /> Back to Monthly</button>}
                          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                            <button onClick={() => setHeatmapMode('pnl')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${heatmapMode === 'pnl' ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' : 'text-slate-500 hover:text-white'}`}>P&L Mode</button>
                            <button onClick={() => setHeatmapMode('frequency')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${heatmapMode === 'frequency' ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' : 'text-slate-500 hover:text-white'}`}>Volume Mode</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-8">
                          {activeMonths.map(monthStr => {
                            const [mName, yStr] = monthStr.split(' ');
                            const mIdx = MONTH_MAP[mName];
                            const yNum = parseInt(yStr);
                            const firstDayOfMonth = new Date(Date.UTC(yNum, mIdx, 1)).getUTCDay();
                            const daysInMonth = new Date(Date.UTC(yNum, mIdx + 1, 0)).getUTCDate();
                            return (
                              <div key={monthStr} className="animate-in fade-in duration-700">
                                <div className="flex items-center gap-3 mb-6">
                                  <div className="h-px flex-1 bg-white/5" />
                                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-4 py-1 rounded-full border border-white/5 bg-white/[0.02]">{monthStr}</h4>
                                  <div className="h-px flex-1 bg-white/5" />
                                </div>
                                
                                <div className="grid grid-cols-7 gap-2 sm:gap-4">
                                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="text-center py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                                      {d}
                                    </div>
                                  ))}
                                  
                                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-20 sm:h-32 bg-transparent" />
                                  ))}
                                  
                                  {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dateKey = `${yNum}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                    const dayVal = (hierarchical.dateData || {})[dateKey] || { pl: 0, count: 0 };
                                    const hasActivity = dayVal.count > 0;
                                    
                                    let isPos = dayVal.pl >= 0;
                                    let intensity = 0;
                                    
                                    if (heatmapMode === 'pnl') {
                                      intensity = Math.max(0.1, (Math.abs(dayVal.pl) / (maxDayAbsVal || 1)));
                                    } else {
                                      intensity = Math.min(1, dayVal.count / (metrics.maxTradesInDay || 1));
                                    }

                                    return (
                                      <Motion.div
                                        key={i}
                                        whileHover={hasActivity ? { y: -4, scale: 1.02 } : {}}
                                        className={`
                                          relative h-20 sm:h-32 rounded-xl sm:rounded-[2rem] border transition-all duration-300 group
                                          ${!hasActivity ? 'bg-slate-950/20 border-white/5' : 'bg-slate-900/40 backdrop-blur-xl border-white/10 hover:border-journal-gold/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]'}
                                        `}
                                      >
                                        {hasActivity && (
                                          <div 
                                            className="absolute inset-0 rounded-xl sm:rounded-[2rem] opacity-20 group-hover:opacity-40 transition-opacity"
                                            style={{ 
                                              background: heatmapMode === 'pnl' 
                                                ? (isPos ? `radial-gradient(circle at 50% 0%, #10b98130, transparent)` : `radial-gradient(circle at 50% 0%, #f43f5e30, transparent)`)
                                                : `radial-gradient(circle at 50% 0%, #6366f130, transparent)`
                                            }} 
                                          />
                                        )}

                                        <div className="relative z-10 p-2 sm:p-4 h-full flex flex-col justify-between">
                                          <span className={`text-[10px] sm:text-xs font-black ${hasActivity ? 'text-white' : 'text-slate-700'}`}>
                                            {dayNum}
                                          </span>

                                          {hasActivity && (
                                            <div className="flex flex-col items-center sm:items-start">
                                              {heatmapMode === 'pnl' ? (
                                                <p className={`text-[9px] sm:text-xl font-black italic tracking-tighter ${isPos ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]'}`}>
                                                  {isPos ? '+' : ''}{Math.round(dayVal.pl).toLocaleString()}
                                                </p>
                                              ) : (
                                                <p className="text-lg sm:text-3xl font-black text-white italic tracking-tighter drop-shadow-lg">
                                                  {dayVal.count}
                                                </p>
                                              )}
                                              
                                              <div className="flex items-center gap-1.5 mt-1 sm:mt-2">
                                                <div className={`w-1 h-1 rounded-full ${isPos ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                                <span className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">{dayVal.count} TDS</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </Motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Motion.div>

                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={Layers} title="Distribution" color="text-[#00c6ff]" />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 p-4 md:p-6 h-[300px] md:h-[400px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ComposedChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <filter id="neonGlowPlus" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <filter id="neonGlowMinus" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <linearGradient id="pinGPlus" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.emerald} stopOpacity={1} /><stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0.1} /></linearGradient>
                            <linearGradient id="pinGMinus" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.rose} stopOpacity={1} /><stop offset="100%" stopColor={COLORS.rose} stopOpacity={0.1} /></linearGradient>
                            <linearGradient id="momentumGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.indigo} stopOpacity={0.15} /><stop offset="100%" stopColor={COLORS.indigo} stopOpacity={0} /></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} filter={(item) => item.dataKey === "pl"} />
                          <Area type="monotone" dataKey="pl" stroke="none" fill="url(#momentumGrad)" baseLine={0} />
                          <Bar dataKey="pl" barSize={4} activeBar={false}>
                            {barData.map((e, idx) => <Cell key={idx} fill={e.pl >= 0 ? "url(#pinGPlus)" : "url(#pinGMinus)"} />)}
                          </Bar>
                          <Scatter dataKey="pl">
                            {barData.map((e, idx) => <Cell key={idx} fill={e.pl >= 0 ? COLORS.emerald : COLORS.rose} />)}
                          </Scatter>
                          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Card>
                    <Card className="p-6 bg-indigo-500/5 text-white">
                      <SectionHeader icon={SparklesIcon} title="Period Highlights" />
                      <div className="space-y-4">
                        <div><p className="text-[10px] text-slate-500 font-black uppercase">PEAK PERFORMANCE</p><p className="text-sm font-black text-emerald-400">{String(bestPeriod[0])}: {formatCurrency(bestPeriod[1]?.pl)}</p></div>
                        <div><p className="text-[10px] text-slate-500 font-black uppercase">WORST PERFORMANCE</p><p className="text-sm font-black text-rose-400">{String(worstPeriod[0])}: {formatCurrency(worstPeriod[1]?.pl)}</p></div>
                      </div>
                    </Card>
                  </div>
                </Motion.div>

                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={Diamond} title="Quality" color="text-[#f5d020]" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-4 md:p-6 h-[340px] md:h-[420px] relative text-white">
                      <SectionHeader icon={Layers} title="P&L Weight by Grade" />
                      <div className="relative w-full h-[80%]">
                        <DonutCenter value={qualityStats.reduce((acc, curr) => acc + curr.pl, 0)} />
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart>
                            <Pie 
                              data={qualityStats} 
                              innerRadius={70} 
                              outerRadius={100} 
                              paddingAngle={5} 
                              dataKey="absImpact" 
                              label={({ name, pl }) => pl !== 0 ? `${String(name)}: ${formatCurrency(pl)}` : ''} 
                              labelLine={{ stroke: COLORS.white }}
                            >
                              {qualityStats.map((entry, index) => <Cell key={index} fill={COLORS.qualityPalette[index % COLORS.qualityPalette.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }} formatter={(val, name, props) => [`${formatCurrency(props.payload.pl)}`, String(props.payload.name)]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                    <Card className="p-4 md:p-6 h-[340px] md:h-[420px]">
                      <SectionHeader icon={BoxSelect} title="Lot Sizes" />
                      <ResponsiveContainer width="100%" height="80%" minWidth={0}>
                        <BarChart data={sizingData} layout="vertical" margin={{ left: 40, right: 20 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" stroke={COLORS.white} fontSize={9} width={80} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} 
                            itemStyle={{ color: '#ffffff' }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                            cursor={{ fill: 'transparent' }} 
                            formatter={(v) => [`${String(v)} Lots`, 'Average Size']} 
                          />
                          <Bar dataKey="avgLots" fill={COLORS.gold} radius={[0, 4, 4, 0]} activeBar={false}>
                            {sizingData.map((e, i) => <Cell key={i} fillOpacity={Math.max(0.3, 1 - (i * 0.15))} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                </Motion.div>

                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={Shield} title="Risk" color="text-[#f5d020]" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <MetricCard title="Wins" value={String(metrics.maxWinningStreak || 0)} icon={Trophy} trend="up" />
                      <MetricCard title="Losses" value={String(metrics.maxLosingStreak || 0)} icon={XCircle} trend="down" />
                      <MetricCard title="Drawdown" value={formatCurrency(metrics.peakDD || 0)} icon={TrendingDown} colorClass="text-rose-400" />
                      <MetricCard title="P/D Ratio" value={String(metrics.profitDD || 0)} icon={Activity} colorClass="text-indigo-400" />
                    </div>
                    <Card className="md:col-span-2 p-4 md:p-6 bg-indigo-500/5 relative text-white h-[360px] md:h-[420px]">
                      <SectionHeader icon={Target} title="Trade Outcome Weights" />
                      <div className="relative w-full h-[calc(100%-40px)]">
                        <DonutCenter value={statusStats.reduce((acc, curr) => acc + curr.pl, 0)} />
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart>
                            <Pie data={statusStats} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="absImpact" label={({ name, pl }) => `${String(name)}: ${formatCurrency(pl)}`}>
                              {statusStats.map((e, idx) => <Cell key={idx} fill={COLORS.qualityPalette[idx % COLORS.qualityPalette.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }} formatter={(val, name, props) => [`${formatCurrency(props.payload.pl)} (${String(props.payload.trades)} trades)`, String(props.payload.name)]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                </Motion.div>

                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={Activity} title="Growth" color="text-[#00f2fe]" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <Card className="p-4 md:p-6 h-[300px] md:h-[400px]">
                      <SectionHeader icon={TrendingUp} title="Equity" />
                      <ResponsiveContainer width="100%" height="85%" minWidth={0}>
                        <AreaChart data={equity}>
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="Equity" stroke={COLORS.indigo} strokeWidth={4} fill={COLORS.indigo} fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                    <Card className="p-4 md:p-6 h-[300px] md:h-[400px] relative text-white">
                      <SectionHeader icon={Target} title="Win Rate" />
                      <div className="relative w-full h-[85%]">
                        <DonutCenter value={outcomeDist.reduce((acc, curr) => acc + (curr.pl || 0), 0)} />
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <PieChart>
                            <Pie 
                              data={outcomeDist} 
                              innerRadius={70} 
                              outerRadius={100} 
                              paddingAngle={5} 
                              dataKey="value" 
                              label={({ name, pl }) => `${String(name)}: ${formatCurrency(pl || 0)}`}
                            >
                              {outcomeDist.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }} formatter={(val, name, props) => [`${formatCurrency(props.payload.pl)}`, String(props.payload.name)]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                </Motion.div>

                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={BarChart3} title="Time" color="text-[#e100ff]" />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 p-8">
                      <div className="h-[280px] md:h-[350px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart data={weekdayEdge} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke={COLORS.white} fontSize={11} axisLine={false} tickLine={false} />
                            <YAxis stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="pl" radius={[6, 6, 0, 0]} activeBar={false}>
                              {weekdayEdge.map((entry, index) => <Cell key={index} fill={entry.pl >= 0 ? COLORS.emerald : COLORS.rose} />)}
                              <LabelList dataKey="pl" position="top" formatter={(v) => formatCurrency(v)} fill={COLORS.white} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                    <Card className="p-8 bg-purple-500/5 text-white">
                      <SectionHeader icon={Brain} title="Weekdays" color="text-purple-400" />
                      <div className="space-y-4">
                        {bestDay && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl"><p className="text-[10px] font-black text-emerald-400 mb-1 uppercase tracking-widest leading-none">Best Weekday Winrate</p><p className="text-lg font-black">{String(bestDay.fullName)}</p><p className="text-2xl font-mono font-bold text-emerald-400">{String(bestDay.winRate)}% Success</p></div>}
                        {worstDay && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"><p className="text-[10px] font-black text-rose-400 mb-1 uppercase tracking-widest leading-none">Worst Weekday Winrate</p><p className="text-lg font-black">{String(worstDay.fullName)}</p><p className="text-2xl font-mono font-bold text-rose-400">{String(worstDay.winRate)}% Success</p></div>}
                        <div className="space-y-2 mt-6 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                          {weekdayEdge.map((day, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                              <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">{String(day.fullName)}</p><p className="text-xs font-black">{String(day.trades)}T</p></div>
                              <div className="text-right"><p className={`text-sm font-mono font-bold ${day.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(day.pl)}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                </Motion.div>

                   </div>
                 )}

                 {activeTab === 'strategies' && (
                   <div className="space-y-12">
                     <SectionHeader icon={Compass} title="Edge" />
                     <Card className="p-8 border-dashed border-2 border-slate-800 text-center">
                       <SectionHeader icon={BarChartHorizontal} title="Strategy" sub="Cumulative P&L per Setup" color="text-indigo-400" />
                       <div className="h-[300px] md:h-[400px]">
                         <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                           <BarChart
                             layout="vertical"
                             data={[...setupAnalysis].sort((a, b) => b.pl - a.pl)}
                             margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
                           >
                             <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                             <XAxis type="number" stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                             <YAxis type="category" dataKey="name" stroke={COLORS.white} fontSize={10} width={100} axisLine={false} tickLine={false} />
                             <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                             <Bar dataKey="pl" radius={[0, 4, 4, 0]} barSize={24} activeBar={false}>
                               {[...setupAnalysis].sort((a, b) => b.pl - a.pl).map((entry, index) => (
                                 <Cell key={index} fill={entry.pl >= 0 ? COLORS.emerald : COLORS.rose} fillOpacity={0.8} />
                               ))}
                               <LabelList dataKey="pl" position="right" formatter={(v) => formatCurrency(v)} fill={COLORS.white} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                       </div>
                     </Card>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {setupAnalysis.map((s, i) => (
                         <Card key={i} className="group p-6 border border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition-all text-white">
                           <div>
                             <div className="flex justify-between items-start mb-4 text-white"><h4 className="text-white font-black text-xl uppercase group-hover:text-indigo-400 leading-none">{String(s.name)}</h4><div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${parseFloat(s.wr) >= 50 ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}><p className="text-xs font-black">{String(s.wr)}%</p></div></div>
                             <div className="grid grid-cols-2 gap-3 mb-6"><div className="bg-slate-800/30 p-3 rounded-2xl border border-slate-800 leading-none"><p className="text-[8px] text-slate-500 font-bold uppercase mb-1">R:R</p><p className="text-lg font-black text-white">1:{String(s.rr)}</p></div><div className="bg-slate-800/30 p-3 rounded-2xl border border-slate-800 leading-none"><p className="text-[8px] text-slate-500 font-black uppercase mb-1">EXP</p><p className={`text-lg font-black ${parseFloat(s.expectancy) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>₹{String(s.expectancy)}</p></div></div>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold uppercase leading-none"><span className="text-slate-500 text-[10px]">Net Impact</span><span className={parseFloat(s.pl) >= 0 ? "text-emerald-400" : "text-rose-400"}>{formatCurrency(s.pl)}</span></div>
                         </Card>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}
          </Motion.main>
        )}
        <footer className="mt-20 py-8 border-t border-[#00f2fe]/10 text-center font-bold uppercase text-[10px] tracking-[0.3em] text-slate-600 drop-shadow-[0_0_8px_rgba(0,198,255,0.2)]">TraderDashboard Institutional v2.0</footer>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }`}</style>
      <AnimatePresence>
      </AnimatePresence>
      <UtilityHub user={user} trades={rawTrades} snapshots={rawSnapshots} notes={notes} />
    </div>
  </AuthShield>
  );
};

export default App;
