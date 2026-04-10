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
  Info, CheckCircle2, XCircle, ChevronLeft,
  Brain, History, Scale, Upload, FileSpreadsheet,
  XOctagon, ArrowUpCircle, CheckCircle, Search, ShieldCheck, Filter, Hammer, Footprints, ArrowRight,
  CalendarDays, BookOpen, Flame, ZapOff, Layers, Globe, HeartPulse, Timer, Book,
  CandlestickChart, LayoutDashboard, BrainCircuit, AlertTriangle, Diamond, BoxSelect, Trophy,
  Compass, BarChartHorizontal, CalendarRange, Signal, BarChart3, IndianRupee,
  Terminal, AlertCircle, Lightbulb, ListChecks, CheckSquare,
  ArrowRightCircle, Sparkles as SparklesIcon,
  Smile, Play, ShieldAlert, LogOut
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
import LightRaysAndParticles from './components/Common/LightRaysAndParticles';
import MobileNav from './components/Common/MobileNav';
import TradeArchiveCarousel from './components/Common/TradeArchiveCarousel';

// Hooks
import { useTradeData } from './hooks/useTradeData';




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

  useEffect(() => {
    if (!processedData || processedData.isEmpty) {
      setAiSuggestions(null);
      return;
    }

    const generateInbuiltSuggestions = () => {
      const suggestions = [];

      // Rule 1: Win Rate Analysis
      if (metrics.winRate < 40) {
        suggestions.push(`Win rate is low (${metrics.winRate}%). Focus on higher-probability setups and stricter entry criteria.`);
      } else if (metrics.winRate > 60) {
        suggestions.push(`Excellent win rate (${metrics.winRate}%). Consider carefully increasing position size on A-grade setups.`);
      }

      // Rule 2: Risk/Reward Analysis
      if (metrics.overallRR < 1.5) {
        suggestions.push(`Risk/Reward ratio is suboptimal (1:${metrics.overallRR}). Aim for setups with at least a 1:1.5 R/R.`);
      } else {
        suggestions.push(`Strong R/R profile (1:${metrics.overallRR}). Continue to let winners run.`);
      }

      // Rule 3: Top Error Analysis
      if (errors.length > 0) {
        const topError = errors[0];
        suggestions.push(`Your top error is "${topError.cat}," costing you ${formatCurrency(topError.impact)}. Create a rule to prevent this.`);
      }

      // Rule 4: Emotional Impact
      const negativeEmotions = emotionStats.filter(e => e.pl < 0).sort((a, b) => a.pl - b.pl);
      if (negativeEmotions.length > 0) {
        const worstEmotion = negativeEmotions[0];
        suggestions.push(`Trading while feeling "${worstEmotion.name}" has the most negative impact (${formatCurrency(worstEmotion.pl)}). Recognize and pause when this emotion appears.`);
      }

      // Rule 5: Best vs. Worst Day
      if (bestDay && worstDay && bestDay.name !== worstDay.name) {
        suggestions.push(`Your best trading day is ${bestDay.fullName} (${bestDay.winRate}% WR), while your worst is ${worstDay.fullName} (${worstDay.winRate}% WR). Analyze the difference.`);
      }

      setAiSuggestions(suggestions.slice(0, 5));
    };

    generateInbuiltSuggestions();
  }, [processedData, metrics.winRate, metrics.overallRR, errors, emotionStats, bestDay, worstDay]);

  return (
    <AuthShield>
      <div className={`min-h-screen ${activeSection === 'journal' ? 'bg-[#0B0B0B]' : 'bg-[#020617]'} text-slate-100 font-sans p-4 md:p-8 pb-24 md:pb-8 relative transition-colors duration-1000`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iMSIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>
      <LightRaysAndParticles />
      {activeSection === 'journal' && <BackgroundQuotes />}
      <div className="max-w-7xl mx-auto relative">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 relative">
          <div className="flex items-center gap-4 z-20 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30 shrink-0">
                <CandlestickChart className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none">Trader<span className="text-indigo-500"> Terminal</span></h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">Terminal v5.1.0</p>
                  <div className="w-1 h-1 bg-slate-800 rounded-full" />
                  <button 
                    onClick={() => authService.signOut()}
                    className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-rose-500 transition-all flex items-center gap-1.5 group/logout"
                  >
                    <LogOut size={10} className="group-hover/logout:-translate-x-0.5 transition-transform" />
                    Disconnect Terminal
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Filter Trigger */}
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden p-2.5 rounded-xl modern-glass border border-white/10 text-slate-400 active:scale-95 transition-all"
            >
              <Filter size={18} className={showMobileFilters ? 'text-indigo-400' : ''} />
            </button>
          </div>

          {rawTrades.length > 0 && (
            <nav className="hidden md:flex modern-glass p-1.5 rounded-2xl md:absolute md:left-1/2 md:-translate-x-1/2 z-10 w-auto overflow-x-auto scrollbar-hide">
              {[
                { id: 'alerts', label: 'Alerts', icon: Signal },
                { id: 'journal', label: 'Trading Journal', icon: History },
                { id: 'audit', label: 'Dashboard', icon: ShieldCheck }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`relative px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 z-10 flex-1 md:flex-none whitespace-nowrap ${activeSection === tab.id ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-slate-500 hover:text-white'}`}
                >
                  {activeSection === tab.id && (
                    <Motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-gradient-to-r from-[#00f2fe]/20 to-[#4facfe]/20 rounded-xl border border-[#00f2fe]/30 shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-20 flex items-center gap-2">
                    <tab.icon size={14} />
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>
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
                className="fixed bottom-0 left-0 right-0 z-[170] modern-glass rounded-t-[32px] border-t border-white/20 p-6 md:hidden max-h-[80vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                   <Filter className="text-indigo-400" /> Filters
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Timeframe</span>
                    <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="bg-transparent text-slate-100 text-xs font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none text-right">
                      <option className="bg-slate-950" value="All">All Time</option>
                      <option className="bg-slate-950" value="CurrentMonth">Current Month</option>
                      <option className="bg-slate-950" value="30">Past 30 Days</option>
                      <option className="bg-slate-950" value="60">Past 60 Days</option>
                      <option className="bg-slate-950" value="90">Past 90 Days</option>
                      <option className="bg-slate-950" value="Custom">Custom Range</option>
                    </select>
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Market</span>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent text-slate-100 text-xs font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none text-right">
                      <option className="bg-slate-950" value="All">All Types</option>
                      <option className="bg-slate-950" value="Indian">Indian</option>
                      <option className="bg-slate-950" value="Other">Other</option>
                    </select>
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Asset</span>
                    <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="bg-transparent text-slate-100 text-xs font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none text-right">
                      {(availableAssets || []).map(a => <option className="bg-slate-950" key={a} value={a}>{a === 'All' ? 'All Assets' : a}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full mt-8 py-4 bg-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
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
          <div className="hidden md:flex flex-wrap items-center justify-center md:justify-end gap-2 mb-8 mt-2 relative z-10 w-full bg-slate-950/20 p-2 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
              <Clock size={12} className="text-slate-500 ml-2" />
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="bg-slate-900 text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer pr-2 [color-scheme:dark] border-none">
                <option className="bg-slate-900" value="All">All Time</option>
                <option className="bg-slate-900" value="CurrentMonth">Current Month</option>
                <option className="bg-slate-900" value="30">Past 30 Days</option>
                <option className="bg-slate-900" value="60">Past 60 Days</option>
                <option className="bg-slate-900" value="90">Past 90 Days</option>
                <option className="bg-slate-900" value="Custom">Custom Range</option>
              </select>
            </div>
            {datePreset === 'Custom' && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} className="bg-transparent text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none" />
                <span className="text-slate-500 text-[10px]">-</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => e.target.showPicker?.()} className="bg-transparent text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none" />
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
              <Globe size={12} className="text-slate-500 ml-2" />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-slate-900 text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer pr-2 [color-scheme:dark] border-none">
                <option className="bg-slate-900" value="All">Type: All</option>
                <option className="bg-slate-900" value="Indian">Indian Markets</option>
                <option className="bg-slate-900" value="Other">Other Markets</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
              <Hash size={12} className="text-slate-500 ml-2" />
              <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="bg-slate-900 text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer pr-2 [color-scheme:dark] border-none">
                {(availableAssets || []).map((a, idx) => <option className="bg-slate-900" key={`${a}-${idx}`} value={a}>{a === 'All' ? 'Asset: All' : a}</option>)}
              </select>
            </div>
            {datePreset === 'All' && (
              <>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                  <Filter size={12} className="text-slate-500 ml-2" />
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-900 text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer pr-2 [color-scheme:dark] border-none">
                    {(availableYears || []).map((y, idx) => <option className="bg-slate-900" key={`${y}-${idx}`} value={y}>{y === 'All' ? 'Year: All' : y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                  <CalendarDays size={12} className="text-slate-500 ml-2" />
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-900 text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer pr-2 [color-scheme:dark] border-none">
                    {(availableMonths || []).map((m, idx) => <option className="bg-slate-900" key={`${m}-${idx}`} value={m}>{m === 'All' ? 'Month: All' : m}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        )}


        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-t-2 border-indigo-500 rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Cloud Terminal...</p>
          </div>
        ) : (!rawTrades || rawTrades.length === 0) && !isParsing ? (
          <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
            <Card className="max-w-xl w-full p-12 border-dashed border-2 border-slate-800">
              <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse"><Signal className="text-indigo-500" size={40} /></div>
              <h1 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">Trader<span className="text-indigo-500">Dashboard</span> Cloud</h1>
              <p className="text-slate-400 mb-10 text-xs font-bold uppercase tracking-[0.2em]">Institutional Performance Terminal (Connected)</p>
              <button 
                onClick={() => setActiveSection('journal')}
                className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl cursor-pointer font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/20"
              >
                <Plus size={18} /> Start Journaling
              </button>
            </Card>
          </div>
        ) : processedData?.isEmpty ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4"><Search size={48} className="text-slate-800" /><p className="text-slate-500 uppercase font-black text-xs tracking-[0.2em]">No data found for this selection.</p><button onClick={() => { setSelectedYear('All'); setSelectedMonth('All'); setDatePreset('CurrentMonth'); }} className="text-[10px] font-black uppercase text-indigo-400 underline">Reset Filters</button></div>
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
                 <nav className="flex justify-center md:justify-start gap-4 mb-10 border-b border-slate-800 pb-4 overflow-x-auto scrollbar-hide">
                   {[
                     { id: 'performance', label: 'Performance', icon: Activity },
                     { id: 'audit', label: 'Audit', icon: ShieldCheck },
                      { id: 'review', label: 'Review', icon: LayoutDashboard },
                     { id: 'strategies', label: 'Strategies', icon: Target }
                   ].map((t) => (
                     <button
                       key={t.id}
                       onClick={() => setActiveTab(t.id)}
                       className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 transition-all relative ${activeTab === t.id ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
                     >
                       <t.icon size={12} />
                       {t.label}
                       {activeTab === t.id && (
                         <Motion.div layoutId="sub-pill" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                       )}
                     </button>
                   ))}
                 </nav>

                  {activeTab === 'review' && (
                    <ReviewTab 
                      trades={rawTrades} 
                      snapshots={rawSnapshots} 
                      notes={notes} 
                    />
                  )}

                 {activeTab === 'audit' && (
                   <div className="space-y-6 md:space-y-12">
                     <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         <Card className="p-8 border-rose-500/30 bg-rose-500/5 col-span-2 relative text-white">
                           <SectionHeader icon={Hammer} title="Behavioral Diagnosis" color="text-rose-400" />
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
                           <SectionHeader icon={BrainCircuit} title="AI Strategic Roadmap" color="text-amber-400" />
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
                           <SectionHeader icon={Smile} title="Emotional Impact Distribution" color="text-purple-400" />
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
                           <SectionHeader icon={ZapOff} title="Top Error Impact Chart" color="text-rose-400" />
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
                         <Card className="p-8 border-emerald-500/20 bg-emerald-500/5">
                           <SectionHeader icon={Play} title="What to Continue Doing" color="text-emerald-400" />
                           <div className="space-y-4">
                             {dynamicAudit.continue.map((item, i) => (
                               <div key={i} className="flex gap-4 p-4 bg-slate-900/60 rounded-2xl border border-emerald-500/10 text-xs font-bold leading-relaxed text-emerald-100 shadow-md">
                                 <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                                 <p>{String(item)}</p>
                               </div>
                             ))}
                             {dynamicAudit.continue.length === 0 && <p className="text-center text-slate-500 py-10">No recent positive trends detected.</p>}
                           </div>
                         </Card>
                         <Card className="p-8 border-rose-500/20 bg-rose-500/5">
                           <SectionHeader icon={ShieldAlert} title="What to Start Stopping" color="text-rose-400" />
                           <div className="space-y-4">
                             {dynamicAudit.start.map((item, i) => (
                               <div key={i} className="flex gap-4 p-4 bg-slate-900/60 rounded-2xl border border-rose-500/10 text-xs font-bold leading-relaxed text-rose-100 shadow-md">
                                 <XCircle size={18} className="text-rose-500 shrink-0" />
                                 <p>{String(item)}</p>
                               </div>
                             ))}
                             {dynamicAudit.start.length === 0 && <p className="text-center text-slate-500 py-10">No recent behavioral leaks detected.</p>}
                           </div>
                         </Card>
                       </div>
                     </Motion.div>


                     <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                       <Card className="p-8 border-t border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                         <SectionHeader icon={Activity} title="Institutional Scorecard" sub="Behavioral Grade Summary" />
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-2">
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
                   </div>
                 )}

                 {activeTab === 'performance' && (
                   <div className="space-y-6 md:space-y-12">
                     <SectionHeader icon={Briefcase} title="1. Financial Summary" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Total Trades" value={String(metrics.total || 0)} icon={Hash} />
                  <MetricCard title="Win Rate" value={`${String(metrics.winRate || 0)}%`} icon={TrendingUp} trend="up" />
                  <MetricCard title="Net P&L" value={formatCurrency(metrics.net || 0)} icon={IndianRupee} trend={(metrics.net || 0) >= 0 ? "up" : "down"} size="large" />
                  <MetricCard title="Profit Factor" value={String(metrics.pf || 0)} icon={BarChart2} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Avg Win" value={formatCurrency(metrics.avgWin || 0)} icon={ArrowUpRight} trend="up" colorClass="text-emerald-400" />
                  <MetricCard title="Avg Loss" value={formatCurrency(metrics.avgLoss || 0)} icon={ArrowDownRight} trend="down" colorClass="text-rose-400" />
                  <MetricCard title="Highest Win" value={formatCurrency(metrics.maxProfit || 0)} icon={Flame} colorClass="text-emerald-500" />
                  <MetricCard title="Highest Loss" value={formatCurrency(metrics.maxLoss || 0)} icon={ZapOff} colorClass="text-rose-500" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <MetricCard title="Realized Risk/Reward" value={`1:${String(metrics.overallRR)}`} icon={Scale} colorClass="text-indigo-400" />
                  <MetricCard title="Performance Expectancy" value={`₹${String(metrics.expectancy)}`} icon={Zap} colorClass={metrics.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"} />
                </div>
                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={Calendar} title="2. Execution Timeline & Heatmap" sub="Hierarchical Performance Drilldown" color="text-amber-400" />
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
                        <button onClick={() => setSelectedYear('All')} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400 hover:text-white mb-2 transition-colors"><ChevronLeft size={14} /> Back to Yearly View</button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(hierarchical.monthData || {}).map(([monthYear, data]) => (
                            <Card key={monthYear} className="p-6 cursor-pointer group hover:border-indigo-500" onClick={() => setSelectedMonth(monthYear.split(' ')[0])}>
                              <div className="flex justify-between items-center mb-2"><h4 className="text-sm font-black text-slate-400 uppercase">{String(monthYear.split(' ')[0])}</h4><ArrowRight size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" /></div>
                              <p className={`text-lg font-mono font-bold ${data.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(data.pl)}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{String(data.count)} Trades</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          {datePreset === 'All' && <button onClick={() => setSelectedMonth('All')} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-colors"><ChevronLeft size={14} /> Back to Monthly</button>}
                          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                            <button onClick={() => setHeatmapMode('pnl')} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${heatmapMode === 'pnl' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>P&L Mode</button>
                            <button onClick={() => setHeatmapMode('frequency')} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${heatmapMode === 'frequency' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Volume Mode</button>
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
                              <div key={monthStr} className="animate-in fade-in duration-500">
                                <h4 className="text-sm font-black text-slate-400 uppercase mb-4">{monthStr}</h4>
                                <div className="grid grid-cols-7 gap-2">
                                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-600 uppercase pb-2">{d}</div>)}
                                  {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="h-24 bg-transparent" />)}
                                  {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dateKey = `${yNum}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                    const dayVal = (hierarchical.dateData || {})[dateKey] || { pl: 0, count: 0 };
                                    let bgColor, borderColor, textColor;
                                    if (heatmapMode === 'pnl') {
                                      const intensity = Math.max(0.1, (Math.abs(dayVal.pl) / (maxDayAbsVal || 1)));
                                      bgColor = dayVal.pl > 0 ? `rgba(16, 185, 129, ${intensity})` : dayVal.pl < 0 ? `rgba(244, 63, 94, ${intensity})` : 'rgba(30, 41, 59, 0.3)';
                                      borderColor = dayVal.pl !== 0 ? (dayVal.pl > 0 ? '#10b981' : '#f43f5e') : '#1e293b';
                                      textColor = dayVal.pl !== 0 ? 'text-white' : 'text-slate-600';
                                    } else {
                                      const intensity = Math.min(1, dayVal.count / (metrics.maxTradesInDay || 1));
                                      bgColor = dayVal.count > 0 ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` : 'rgba(30, 41, 59, 0.3)';
                                      borderColor = dayVal.count > 0 ? '#3b82f6' : '#1e293b';
                                      textColor = dayVal.count > 0 ? 'text-white' : 'text-slate-600';
                                    }
                                    return (
                                      <Card key={i} className="h-24 p-3 flex flex-col justify-between" style={{ backgroundColor: bgColor, borderColor: borderColor }}>
                                        <span className={`text-xs font-black ${textColor === 'text-white' ? 'text-white/50' : 'text-slate-200'}`}>{dayNum}</span>
                                        <div className={`flex-1 flex items-center justify-center`}>
                                          {heatmapMode === 'frequency' && dayVal.count > 0 && <span className="text-2xl font-black text-white drop-shadow-lg animate-in zoom-in duration-300">{String(dayVal.count)}</span>}
                                          {heatmapMode === 'pnl' && dayVal.pl !== 0 && <span className="text-[10px] font-black text-white text-center drop-shadow-md">{formatCurrency(dayVal.pl)}</span>}
                                        </div>
                                        <div className="text-right">{dayVal.count > 0 && <span className={`text-[8px] font-black block ${heatmapMode === 'frequency' ? 'text-blue-200' : 'text-slate-400'}`}>{String(dayVal.count)}T</span>}</div>
                                      </Card>
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
                  <SectionHeader icon={Layers} title="3. Periodic P&L Distribution" color="text-[#00c6ff]" />
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
                  <SectionHeader icon={Diamond} title="4. Quality Grade & Sizing Matrix" color="text-[#f5d020]" />
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
                      <SectionHeader icon={BoxSelect} title="Average Lot Size by Symbol" />
                      <ResponsiveContainer width="100%" height="80%" minWidth={0}>
                        <BarChart data={sizingData} layout="vertical" margin={{ left: 40, right: 20 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" stroke={COLORS.white} fontSize={9} width={80} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} cursor={{ fill: 'transparent' }} formatter={(v) => [`${String(v)} Lots`, 'Average Size']} />
                          <Bar dataKey="avgLots" fill={COLORS.indigo} radius={[0, 4, 4, 0]} activeBar={false}>{sizingData.map((e, i) => <Cell key={i} fillOpacity={1 - (i * 0.1)} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                </Motion.div>

                <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                  <SectionHeader icon={Shield} title="5. Risk & Trajectory Metrics" color="text-[#f5d020]" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <MetricCard title="Max Win Streak" value={String(metrics.maxWinningStreak || 0)} icon={Trophy} trend="up" />
                      <MetricCard title="Max Loss Streak" value={String(metrics.maxLosingStreak || 0)} icon={XCircle} trend="down" />
                      <MetricCard title="Peak Drawdown" value={formatCurrency(metrics.peakDD || 0)} icon={TrendingDown} colorClass="text-rose-400" />
                      <MetricCard title="Profit/DD Ratio" value={String(metrics.profitDD || 0)} icon={Activity} colorClass="text-indigo-400" />
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
                  <SectionHeader icon={Activity} title="6. Growth & Probability Profile" color="text-[#00f2fe]" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <Card className="p-4 md:p-6 h-[300px] md:h-[400px]">
                      <SectionHeader icon={TrendingUp} title="Cumulative Equity Path" />
                      <ResponsiveContainer width="100%" height="85%" minWidth={0}>
                        <AreaChart data={equity}>
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="Equity" stroke={COLORS.indigo} strokeWidth={4} fill={COLORS.indigo} fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                    <Card className="p-4 md:p-6 h-[300px] md:h-[400px] relative text-white">
                      <SectionHeader icon={Target} title="Win/Loss Probability Profile" />
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
                  <SectionHeader icon={BarChart3} title="7. Weekday Edge Analysis" color="text-[#e100ff]" />
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
                      <SectionHeader icon={Brain} title="Weekday Impact" color="text-purple-400" />
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
                     <SectionHeader icon={Compass} title="Technical Edge Ranking Matrix" />
                     <Card className="p-8 border-dashed border-2 border-slate-800 text-center">
                       <SectionHeader icon={BarChartHorizontal} title="Strategy Performance Profile" sub="Cumulative P&L per Setup" color="text-indigo-400" />
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
