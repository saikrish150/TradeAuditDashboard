import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowRightCircle, Sparkles as SparklesIcon
} from 'lucide-react';

import Card from './components/Card';
import SectionHeader from './components/SectionHeader';
import MetricCard from './components/MetricCard';
import ScoreBar from './components/ScoreBar';
import DonutCenter from './components/DonutCenter';
import CustomTooltip from './components/CustomTooltip';
import { MONTH_MAP, COLORS, cleanCurrency, formatCurrency, parseCSV, getMarketCategory } from './utils';

const App = () => {
  const [activeTab, setActiveTab] = useState('performance');
  const [rawTrades, setRawTrades] = useState([]);

  // Filter States
  const [availableYears, setAvailableYears] = useState(['All']);
  const [availableMonths, setAvailableMonths] = useState(['All']);
  const [availableAssets, setAvailableAssets] = useState(['All']);

  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState('All');

  const [datePreset, setDatePreset] = useState('CurrentMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [heatmapMode, setHeatmapMode] = useState('pnl');
  const [isParsing, setIsParsing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const processFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error("Format Mismatch.");
        const headers = rows[0].map(h => h.toLowerCase().trim());
        const dataRows = rows.slice(1);

        const getIdx = (keywords) => {
          const kwArr = Array.isArray(keywords) ? keywords : [keywords];
          for (const kw of kwArr) {
            const exact = headers.findIndex(h => h === kw.toLowerCase().trim());
            if (exact !== -1) return exact;
            const includes = headers.findIndex(h => h.includes(kw.toLowerCase().trim()));
            if (includes !== -1) return includes;
          }
          return -1;
        };

        const idx = {
          strategy: getIdx('strategy'), date: getIdx('date'), emotion: getIdx(['emotions', 'mindset', 'mood']),
          lossReason: getIdx(['loss reason', 'error', 'mistake', 'why', 'fault']),
          learning: getIdx(['learning', 'notes', 'lesson']), pl: getIdx(['p/l', 'profit', 'result', 'realized']),
          quality: getIdx(['trade quality', 'grade', 'rating']), setup: getIdx(['setups align with trade', 'setup']),
          direction: getIdx('direction'), market: getIdx(['market', 'symbol', 'asset']),
          status: getIdx(['status', 'outcome']), lots: getIdx(['position size', 'lots', 'quantity'])
        };

        const parsed = dataRows.map((row, i) => {
          const dateStr = (row[idx.date] || '').trim();
          let cleanStr = dateStr.replace(/\s*\(GMT[+-]\d+:\d+\)/, '').trim();
          let jsDateObj;

          const components = cleanStr.match(/([a-zA-Z]+)\s+(\d+),\s+(\d+)\s+(\d+):(\d+)/) ||
            cleanStr.match(/([a-zA-Z]+)\s+(\d+),\s+(\d+)/);

          if (components) {
            const mStr = components[1];
            const dNum = parseInt(components[2]);
            const yNum = parseInt(components[3]);
            const hour = parseInt(components[4] || 12);
            const min = parseInt(components[5] || 0);
            jsDateObj = new Date(Date.UTC(yNum, MONTH_MAP[mStr], dNum, hour, min, 0));
          } else {
            jsDateObj = new Date(cleanStr);
            jsDateObj = new Date(Date.UTC(jsDateObj.getUTCFullYear(), jsDateObj.getUTCMonth(), jsDateObj.getUTCDate(), 12, 0, 0));
          }

          const rawMarketVal = (row[idx.market] || '').trim().toUpperCase();
          const isAllowedMarket = ['NIFTY', 'BANKNIFTY', 'SENSEX'].includes(rawMarketVal);
          const marketVal = rawMarketVal || 'Uncategorized'; // Keep the specific name for the Asset dropdown

          return {
            id: i,
            pl: cleanCurrency(row[idx.pl]),
            strategy: (row[idx.strategy] || 'Misc').trim(),
            setup: (row[idx.setup] || 'Uncategorized').trim(),
            emotion: (row[idx.emotion] || 'Neutral').trim(),
            reason: (row[idx.lossReason] || '').trim(),
            learning: (row[idx.learning] || '').trim(),
            quality: (row[idx.quality] || 'Unrated').trim(),
            status: (row[idx.status] || row[idx.quality] || 'Open').trim(),
            direction: (row[idx.direction] || 'N/A').toUpperCase().trim(),
            lots: parseFloat(row[idx.lots]) || 0,
            market: marketVal,
            category: getMarketCategory(marketVal),
            dayNum: jsDateObj.getUTCDate(),
            fullDate: jsDateObj.toUTCString().slice(0, 16),
            jsDate: jsDateObj,
            month: jsDateObj.toLocaleString('default', { month: 'long', timeZone: 'UTC' }),
            year: jsDateObj.getUTCFullYear().toString()
          };
        }).filter(t => t.year && t.month && !isNaN(t.jsDate.getTime()));

        setRawTrades(parsed);
        const yearsFound = Array.from(new Set(parsed.map(t => t.year))).sort();
        setAvailableYears(['All', ...yearsFound]);
        setSelectedYear('All'); setSelectedMonth('All'); setSelectedDay('All');
        setSelectedCategory('All'); setSelectedAsset('All'); setDatePreset('CurrentMonth');
      } catch (err) {
        console.error("Critical Parsing Error", err);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (!rawTrades.length) return;

    const now = new Date();
    const curMonthName = now.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
    const curYearName = now.getUTCFullYear().toString();

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

    const yearFiltered = selectedYear === 'All' ? rawTrades : rawTrades.filter(t => t.year === selectedYear);
    const monthsFound = Array.from(new Set(yearFiltered.map(t => t.month)));
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    setAvailableMonths(['All', ...monthOrder.filter(m => monthsFound.includes(m))]);

    setAvailableAssets(['All', ...Array.from(new Set(catFiltered.map(t => t.market))).sort()]);
  }, [selectedYear, selectedMonth, selectedCategory, rawTrades, datePreset, startDate, endDate]);

  const processedData = useMemo(() => {
    if (!rawTrades || rawTrades.length === 0) return null;

    const now = new Date();
    const curMonthName = now.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
    const curYearName = now.getUTCFullYear().toString();

    const filtered = rawTrades.filter(t => {
      // DATE PRESET LOGIC
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

      // GLOBAL FILTER LOGIC
      if (selectedDay !== 'All' && String(t.dayNum) !== selectedDay) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (selectedAsset !== 'All' && t.market !== selectedAsset) return false;
      return true;
    });

    const tradeTotalCount = filtered.length;
    if (tradeTotalCount === 0) return { metrics: { total: 0 }, isEmpty: true, maxDayAbsVal: 1, bestPeriod: ['', { pl: 0 }], worstPeriod: ['', { pl: 0 }] };

    let cumulativePL = 0, winCount = 0, winTotal = 0, lossTotal = 0, ruleAlignedCount = 0, revengeLoss = 0;
    let peakEquity = 0, maxDDValue = 0, maxLosingStreak = 0, currentLosingStreak = 0, maxWinningStreak = 0, currentWinningStreak = 0;

    const equityArr = [], errorMap = {}, learningVault = [];
    const yearData = {}, monthData = {}, dayData = {}, dateData = {};
    const activeMonthsSet = new Set();
    const emotionalPnlMap = {}, qualityPnlMap = {}, statusPnlMap = {}, symbolSizingMap = {}, setupAnalysisMap = {};

    const weekDayStatsRaw = {
      1: { name: 'Monday', wins: 0, total: 0, pl: 0 }, 2: { name: 'Tuesday', wins: 0, total: 0, pl: 0 },
      3: { name: 'Wednesday', wins: 0, total: 0, pl: 0 }, 4: { name: 'Thursday', wins: 0, total: 0, pl: 0 },
      5: { name: 'Friday', wins: 0, total: 0, pl: 0 }, 6: { name: 'Saturday', wins: 0, total: 0, pl: 0 },
      0: { name: 'Sunday', wins: 0, total: 0, pl: 0 }
    };

    filtered.forEach((t, i) => {
      cumulativePL += t.pl; equityArr.push({ id: i, date: t.fullDate, Equity: cumulativePL });
      if (cumulativePL > peakEquity) peakEquity = cumulativePL;
      const dd = cumulativePL - peakEquity; if (dd < maxDDValue) maxDDValue = dd;

      const setupKey = t.setup || 'Misc';
      if (!setupAnalysisMap[setupKey]) setupAnalysisMap[setupKey] = { pl: 0, wins: 0, total: 0, winSum: 0, lossSum: 0 };
      setupAnalysisMap[setupKey].pl += t.pl; setupAnalysisMap[setupKey].total += 1;
      if (t.pl > 0) { setupAnalysisMap[setupKey].wins += 1; setupAnalysisMap[setupKey].winSum += t.pl; }
      else { setupAnalysisMap[setupKey].lossSum += Math.abs(t.pl); }

      const eKey = t.emotion || 'Neutral';
      if (!emotionalPnlMap[eKey]) emotionalPnlMap[eKey] = { pl: 0, count: 0 };
      emotionalPnlMap[eKey].pl += t.pl; emotionalPnlMap[eKey].count += 1;

      const qKey = t.quality || 'Unrated';
      if (!qualityPnlMap[qKey]) qualityPnlMap[qKey] = { pl: 0, count: 0 };
      qualityPnlMap[qKey].pl += t.pl; qualityPnlMap[qKey].count += 1;

      const sKey = t.status || t.quality || 'Unrated';
      if (!statusPnlMap[sKey]) statusPnlMap[sKey] = { pl: 0, count: 0 };
      statusPnlMap[sKey].pl += t.pl; statusPnlMap[sKey].count += 1;

      const symKey = t.market || 'Unknown';
      if (!symbolSizingMap[symKey]) symbolSizingMap[symKey] = { totalLots: 0, count: 0 };
      symbolSizingMap[symKey].totalLots += t.lots; symbolSizingMap[symKey].count += 1;

      const mIdx = MONTH_MAP[t.month];
      const checkDate = new Date(Date.UTC(parseInt(t.year), mIdx, t.dayNum, 12, 0, 0));
      const dayOfWeek = checkDate.getUTCDay();

      weekDayStatsRaw[dayOfWeek].total += 1;
      weekDayStatsRaw[dayOfWeek].pl += t.pl;
      if (t.pl > 0) weekDayStatsRaw[dayOfWeek].wins += 1;

      if (t.pl > 0) {
        winCount++; winTotal += t.pl; currentLosingStreak = 0; currentWinningStreak++;
        if (currentWinningStreak > maxWinningStreak) maxWinningStreak = currentWinningStreak;
      } else if (t.pl < 0) {
        lossTotal += Math.abs(t.pl); const reasonKey = t.reason || "Unspecified Error";
        if (!errorMap[reasonKey]) errorMap[reasonKey] = { impact: 0, count: 0 };
        errorMap[reasonKey].impact += t.pl; errorMap[reasonKey].count += 1;
        if (t.emotion.toLowerCase().includes('revenge')) revengeLoss += Math.abs(t.pl);
        currentWinningStreak = 0; currentLosingStreak++;
        if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak;
      }

      if (!yearData[t.year]) yearData[t.year] = { pl: 0, count: 0 };
      yearData[t.year].pl += t.pl; yearData[t.year].count += 1;
      const mKey = `${t.month} ${t.year}`;
      activeMonthsSet.add(mKey);
      if (!monthData[mKey]) monthData[mKey] = { pl: 0, count: 0 };
      monthData[mKey].pl += t.pl; monthData[mKey].count += 1;
      if (!dayData[t.dayNum]) dayData[t.dayNum] = { pl: 0, count: 0 };
      dayData[t.dayNum].pl += t.pl; dayData[t.dayNum].count += 1;

      const dateKey = `${t.year}-${String(mIdx + 1).padStart(2, '0')}-${String(t.dayNum).padStart(2, '0')}`;
      if (!dateData[dateKey]) dateData[dateKey] = { pl: 0, count: 0 };
      dateData[dateKey].pl += t.pl; dateData[dateKey].count += 1;

      if (t.learning && t.learning.length > 3) learningVault.push({ date: t.fullDate, text: t.learning, pl: t.pl });
      if (t.quality.toLowerCase().includes('a') || t.quality.toLowerCase().includes('b')) ruleAlignedCount++;
    });

    const activeMonthsArray = Array.from(activeMonthsSet).sort((a, b) => new Date(Date.parse(`1 ${a}`)) - new Date(Date.parse(`1 ${b}`)));

    const weekdayEdge = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const raw = weekDayStatsRaw[d];
      const wr = raw.total > 0 ? Math.round((raw.wins / raw.total) * 100) : 0;
      return { name: raw.name.slice(0, 3), fullName: raw.name, winRate: wr, pl: raw.pl, trades: raw.total };
    });

    const activeDays = weekdayEdge.filter(d => d.trades > 0);
    const bestDay = activeDays.length > 0 ? activeDays.reduce((a, b) => a.winRate > b.winRate ? a : b) : null;
    const worstDay = activeDays.length > 0 ? activeDays.reduce((a, b) => a.winRate < b.winRate ? a : b) : null;

    let highlightSource = [];
    if (selectedYear === 'All' && datePreset === 'All') highlightSource = Object.entries(yearData);
    else if (selectedMonth === 'All' && datePreset === 'All') highlightSource = Object.entries(monthData);
    else highlightSource = Object.entries(dayData).map(([d, v]) => [`Day ${d}`, v]);

    if (highlightSource.length <= 1) {
      highlightSource = filtered.map((t, idx) => [`Trade #${idx + 1}`, { pl: t.pl }]);
    }

    const bestPeriod = highlightSource.length > 0 ? highlightSource.reduce((a, b) => a[1].pl > b[1].pl ? a : b) : ['', { pl: 0 }];
    const worstPeriod = highlightSource.length > 0 ? highlightSource.reduce((a, b) => a[1].pl < b[1].pl ? a : b) : ['', { pl: 0 }];

    const avgWin = winTotal / (winCount || 1); const avgLoss = lossTotal / (tradeTotalCount - winCount || 1);
    const overallRRValue = (avgWin / (avgLoss || 1)).toFixed(2); const winRateValue = ((winCount / tradeTotalCount) * 100).toFixed(1);

    const errorStats = Object.entries(errorMap).sort((a, b) => a[1].impact - b[1].impact).map(([cat, d]) => ({ cat: String(cat), impact: d.impact }));
    const eStats = Object.entries(emotionalPnlMap).map(([name, d]) => ({ name: String(name), pl: d.pl, trades: d.count, absImpact: Math.abs(d.pl) || 1 }));

    // FIX: Variables properly scoped for Brief generation
    const generateBrief = (wr, rr) => {
      const topMistake = errorStats.length > 0 ? errorStats[0] : null;
      const topEmotion = eStats.sort((a, b) => b.absImpact - a.absImpact).length > 0 ? eStats.sort((a, b) => b.absImpact - a.absImpact)[0] : null;
      const winRateNum = parseFloat(wr);
      const rrNum = parseFloat(rr);

      let profileType = "Developing Trader";
      if (winRateNum >= 50 && rrNum >= 1.5) profileType = "Consistent & Profitable";
      else if (winRateNum < 40 && rrNum >= 2) profileType = "Low Strike, High Reward";
      else if (winRateNum >= 60 && rrNum < 1) profileType = "High Strike, Poor Risk Management";
      else if (winRateNum < 50 && rrNum < 1) profileType = "High Risk of Ruin";

      let narrative = `Your system currently operates with a ${wr}% win rate and a 1:${rr} Risk/Reward ratio. `;
      if (winTotal > Math.abs(lossTotal)) narrative += "You are mathematically profitable across this sample size. ";
      else narrative += "Your current metrics result in a negative expectancy. ";

      if (topEmotion && topEmotion.pl < 0) {
        narrative += `Trading while feeling "${topEmotion.name}" is your biggest behavioral leak, costing you ${formatCurrency(Math.abs(topEmotion.pl))}.`;
      }

      const worstThreeTrades = filtered.filter(t => t.pl < 0).sort((a, b) => a.pl - b.pl).slice(0, 3);
      const worstThreeLossSum = worstThreeTrades.reduce((sum, t) => sum + Math.abs(t.pl), 0);
      const whatIfNetPnl = cumulativePL + worstThreeLossSum;

      const prioritySteps = [];
      if (worstThreeTrades.length > 0) {
        prioritySteps.push(`"The One Good Trade" Metric: If you eliminated your 3 worst trades, your P&L would jump from ${formatCurrency(cumulativePL)} to ${formatCurrency(whatIfNetPnl)}. You are paying a ${formatCurrency(worstThreeLossSum)} tax for severe mistakes.`);
      }
      if (rrNum < 1.2) prioritySteps.push(`Your Risk/Reward is too low (1:${rr}). You must let winners run or cut losses faster.`);
      if (winRateNum < 45) prioritySteps.push(`Focus on 'A' quality setups to improve your ${wr}% strike rate.`);
      if (topMistake) prioritySteps.push(`Eliminate "${topMistake.cat}" errors. This mistake has cost you ${formatCurrency(topMistake.impact)}.`);
      if (Math.abs(revengeLoss) > (winTotal * 0.2)) prioritySteps.push("Revenge trading is a critical issue. Enforce a daily loss limit.");
      if (prioritySteps.length === 0) prioritySteps.push("Maintain discipline. Your metrics show strong consistency.");

      return {
        profile: profileType,
        narrative: narrative,
        reviewStatement: winTotal > Math.abs(lossTotal) ? "Positive expectancy. Maintain current rules." : "Negative expectancy. System needs adjustment.",
        prioritySteps: prioritySteps.slice(0, 4) // Keep it concise
      };
    };

    return {
      metrics: { net: cumulativePL, winRate: winRateValue, total: tradeTotalCount, avgWin, avgLoss, overallRR: overallRRValue, maxProfit: Math.max(...filtered.map(t => t.pl > 0 ? t.pl : 0), 0), maxLoss: Math.max(...filtered.map(t => t.pl < 0 ? Math.abs(t.pl) : 0), 0), pf: (winTotal / (lossTotal || 1)).toFixed(2), expectancy: (cumulativePL / tradeTotalCount).toFixed(0), maxLosingStreak, maxWinningStreak, peakDD: maxDDValue, profitDD: (cumulativePL / (Math.abs(maxDDValue) || 1)).toFixed(2), mindsetEfficiency: Math.round(((winTotal - Math.abs(revengeLoss)) / (winTotal || 1)) * 100), maxTradesInDay: Math.max(...Object.values(dateData).map(d => d.count), 0), avgTradesPerActiveDay: Object.keys(dateData).length > 0 ? (tradeTotalCount / Object.keys(dateData).length).toFixed(1) : 0 },
      scores: { risk: Math.min(100, Math.max(0, (winTotal / (lossTotal || 1)) * 40)), discipline: Math.round((ruleAlignedCount / (tradeTotalCount || 1)) * 100), psychology: Math.min(100, Math.max(0, 100 - (Math.abs(revengeLoss) / (winTotal || 1) * 100))), consistency: Math.min(100, Math.max(0, 100 - (Math.abs(maxDDValue) / (winTotal || 1) * 50))) },
      hierarchical: { yearData, monthData, dayData, dateData },
      activeMonths: activeMonthsArray,
      barData: selectedYear === 'All' && datePreset === 'All'
        ? Object.entries(yearData).map(([n, d]) => ({ name: String(n), pl: d.pl }))
        : (selectedMonth === 'All' && datePreset === 'All')
          ? Object.entries(monthData).map(([k, d]) => ({ name: String(k.split(' ')[0]), pl: d.pl }))
          : Object.entries(dayData).map(([d, val]) => ({ name: `D${String(d)}`, pl: val.pl })),
      maxDayAbsVal: Math.max(...Object.values(dateData).map(d => Math.abs(d.pl)), 1),
      weekdayEdge, bestDay, worstDay, bestPeriod, worstPeriod,
      aiBrief: generateBrief(winRateValue, overallRRValue),
      emotionStats: eStats,
      qualityStats: Object.entries(qualityPnlMap).map(([name, d]) => ({ name: String(name), pl: d.pl, trades: d.count, absImpact: Math.abs(d.pl) || 1 })),
      statusStats: Object.entries(statusPnlMap).map(([name, d]) => ({ name: String(name), pl: d.pl, trades: d.count, absImpact: Math.abs(d.pl) || 1 })),
      sizingData: Object.entries(symbolSizingMap).map(([name, d]) => ({ name: String(name), avgLots: parseFloat((d.totalLots / (d.count || 1)).toFixed(2)) })).sort((a, b) => b.avgLots - a.avgLots),
      setupAnalysis: Object.entries(setupAnalysisMap).map(([name, d]) => ({ name: String(name), pl: d.pl, trades: d.total, wr: ((d.wins / d.total) * 100).toFixed(1), rr: ((d.winSum / (d.wins || 1)) / (d.lossSum / (d.total - d.wins || 1) || 1)).toFixed(2), expectancy: (d.pl / d.total).toFixed(0) })).sort((a, b) => a.pl - b.pl),
      outcomeDist: [{ name: 'Wins', value: winCount, color: COLORS.emerald, pl: winTotal }, { name: 'Losses', value: tradeTotalCount - winCount, color: COLORS.rose, pl: -lossTotal }],
      equity: equityArr.filter((_, i) => i % Math.max(1, Math.floor(equityArr.length / 50)) === 0),
      errors: errorStats,
      dynamicAudit: { start: learningVault.filter(l => l.pl < 0).slice(-3).map(l => l.text), continue: learningVault.filter(l => l.pl >= 0).slice(-3).map(l => l.text) },
      learnings: learningVault.sort((a, b) => a.pl - b.pl)
    };
  }, [rawTrades, selectedYear, selectedMonth, selectedDay, selectedCategory, selectedAsset, datePreset, startDate, endDate]);

  const { metrics = {}, scores = {}, hierarchical = {}, activeMonths = [], barData = [], maxDayAbsVal = 1, bestPeriod = ['', {}], worstPeriod = ['', {}], statusStats = [], equity = [], outcomeDist = [], sizingData = [], qualityStats = [], setupAnalysis = [], emotionStats = [], errors = [], dynamicAudit = { start: [], continue: [] }, learnings = [], weekdayEdge = [], bestDay, worstDay, aiBrief = {} } = processedData || {};

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
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iMSIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>
      <div className="max-w-7xl mx-auto relative">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
              <CandlestickChart className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Trade<span className="text-indigo-500">Audit</span></h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Review Terminal v125.0</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {rawTrades.length > 0 && (
              <>
                <nav className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-xl shadow-indigo-500/10 self-center md:self-end">
                  {['performance', 'audit', 'strategies'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                      {tab === 'performance' ? <LayoutDashboard size={14} /> : tab === 'audit' ? <ShieldCheck size={14} /> : <Zap size={14} />}
                      {tab}
                    </button>
                  ))}
                </nav>

                <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
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
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none" />
                      <span className="text-slate-500 text-[10px]">-</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer [color-scheme:dark] border-none" />
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
                      {(availableAssets || []).map(a => <option className="bg-slate-900" key={a} value={a}>{a === 'All' ? 'Asset: All' : a}</option>)}
                    </select>
                  </div>
                  {datePreset === 'All' && (
                    <>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                        <Filter size={12} className="text-slate-500 ml-2" />
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-900 text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer pr-2 [color-scheme:dark] border-none">
                          {(availableYears || []).map(y => <option className="bg-slate-900" key={y} value={y}>{y === 'All' ? 'Year: All' : y}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                        <CalendarDays size={12} className="text-slate-500 ml-2" />
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-900 text-slate-100 text-[10px] font-black uppercase outline-none cursor-pointer pr-2 [color-scheme:dark] border-none">
                          {(availableMonths || []).map(m => <option className="bg-slate-900" key={m} value={m}>{m === 'All' ? 'Month: All' : m}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {(!rawTrades || rawTrades.length === 0) && !isParsing ? (
          <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
            <Card className="max-w-xl w-full p-12 border-dashed border-2 border-slate-800">
              <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse"><FileSpreadsheet className="text-indigo-500" size={40} /></div>
              <h1 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">Trade<span className="text-indigo-500">Audit</span></h1>
              <p className="text-slate-400 mb-10 text-xs font-bold uppercase tracking-[0.2em]">Institutional Performance Terminal</p>
              <label className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl cursor-pointer font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/20">
                <Upload size={18} /> Sync Journal
                <input type="file" accept=".csv" onChange={processFile} className="hidden" />
              </label>
            </Card>
          </div>
        ) : processedData?.isEmpty ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4"><Search size={48} className="text-slate-800" /><p className="text-slate-500 uppercase font-black text-xs tracking-[0.2em]">No data found for this selection.</p><button onClick={() => { setSelectedYear('All'); setSelectedMonth('All'); setDatePreset('CurrentMonth'); }} className="text-[10px] font-black uppercase text-indigo-400 underline">Reset Filters</button></div>
        ) : (
          <main className="animate-in fade-in duration-700">
            {activeTab === 'performance' && (
              <div className="space-y-6">
                <SectionHeader icon={Briefcase} title="1. Financial Summary" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <MetricCard title="Total Trades" value={String(metrics.total || 0)} icon={Hash} />
                  <MetricCard title="Win Rate" value={`${String(metrics.winRate || 0)}%`} icon={TrendingUp} trend="up" />
                  <MetricCard title="Net P&L" value={formatCurrency(metrics.net || 0)} icon={IndianRupee} trend={(metrics.net || 0) >= 0 ? "up" : "down"} size="large" />
                  <MetricCard title="Profit Factor" value={String(metrics.pf || 0)} icon={BarChart2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <MetricCard title="Avg Win" value={formatCurrency(metrics.avgWin || 0)} icon={ArrowUpRight} trend="up" colorClass="text-emerald-400" />
                  <MetricCard title="Avg Loss" value={formatCurrency(metrics.avgLoss || 0)} icon={ArrowDownRight} trend="down" colorClass="text-rose-400" />
                  <MetricCard title="Highest Win" value={formatCurrency(metrics.maxProfit || 0)} icon={Flame} colorClass="text-emerald-500" />
                  <MetricCard title="Highest Loss" value={formatCurrency(metrics.maxLoss || 0)} icon={ZapOff} colorClass="text-rose-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard title="Realized Risk/Reward" value={`1:${String(metrics.overallRR)}`} icon={Scale} colorClass="text-indigo-400" />
                  <MetricCard title="Performance Expectancy" value={`₹${String(metrics.expectancy)}`} icon={Zap} colorClass={metrics.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"} />
                </div>

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

                <SectionHeader icon={Layers} title="3. Periodic P&L Distribution" color="text-indigo-400" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 p-6 h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="pinGPlus" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.emerald} stopOpacity={1} /><stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0.1} /></linearGradient>
                          <linearGradient id="pinGMinus" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.rose} stopOpacity={1} /><stop offset="100%" stopColor={COLORS.rose} stopOpacity={0.1} /></linearGradient>
                          <linearGradient id="momentumGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.indigo} stopOpacity={0.05} /><stop offset="100%" stopColor={COLORS.indigo} stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} filter={(item) => item.dataKey === "pl"} />
                        <Area type="monotone" dataKey="pl" stroke="none" fill="url(#momentumGrad)" baseLine={0} />
                        <Bar dataKey="pl" barSize={4}>
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

                <SectionHeader icon={Diamond} title="4. Quality Grade & Sizing Matrix" color="text-amber-400" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 h-[420px] relative text-white">
                    <SectionHeader icon={Layers} title="P&L Weight by Grade" />
                    <DonutCenter value={qualityStats.reduce((acc, curr) => acc + curr.pl, 0)} />
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie data={qualityStats} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="absImpact" label={({ name, pl }) => `${String(name)}: ${formatCurrency(pl)}`} labelLine={{ stroke: COLORS.white }}>
                          {qualityStats.map((entry, index) => <Cell key={index} fill={COLORS.qualityPalette[index % COLORS.qualityPalette.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} formatter={(val, name, props) => [`${formatCurrency(props.payload.pl)}`, String(props.payload.name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card className="p-6 h-[420px]">
                    <SectionHeader icon={BoxSelect} title="Average Lot Size by Symbol" />
                    <ResponsiveContainer width="100%" height="80%">
                      <BarChart data={sizingData} layout="vertical" margin={{ left: 40, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" stroke={COLORS.white} fontSize={9} width={80} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} formatter={(v) => [`${String(v)} Lots`, 'Average Size']} />
                        <Bar dataKey="avgLots" fill={COLORS.indigo} radius={[0, 4, 4, 0]}>{sizingData.map((e, i) => <Cell key={i} fillOpacity={1 - (i * 0.1)} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <SectionHeader icon={Shield} title="5. Risk & Trajectory Metrics" color="text-amber-400" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <MetricCard title="Max Win Streak" value={String(metrics.maxWinningStreak || 0)} icon={Trophy} trend="up" />
                    <MetricCard title="Max Loss Streak" value={String(metrics.maxLosingStreak || 0)} icon={XCircle} trend="down" />
                    <MetricCard title="Peak Drawdown" value={formatCurrency(metrics.peakDD || 0)} icon={TrendingDown} colorClass="text-rose-400" />
                    <MetricCard title="Profit/DD Ratio" value={String(metrics.profitDD || 0)} icon={Activity} colorClass="text-indigo-400" />
                  </div>
                  <Card className="md:col-span-2 p-6 bg-indigo-500/5 relative text-white">
                    <SectionHeader icon={Target} title="Trade Outcome Weights" />
                    <DonutCenter value={statusStats.reduce((acc, curr) => acc + curr.pl, 0)} />
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie data={statusStats} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="absImpact" label={({ name, pl }) => `${String(name)}: ${formatCurrency(pl)}`}>
                          {statusStats.map((e, idx) => <Cell key={idx} fill={COLORS.qualityPalette[idx % COLORS.qualityPalette.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} formatter={(val, name, props) => [`${formatCurrency(props.payload.pl)} (${String(props.payload.trades)} trades)`, String(props.payload.name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <SectionHeader icon={Activity} title="6. Growth & Probability Profile" color="text-indigo-400" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <Card className="p-6 h-[400px]">
                    <SectionHeader icon={TrendingUp} title="Cumulative Equity Path" />
                    <ResponsiveContainer width="100%" height="85%">
                      <AreaChart data={equity}>
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Equity" stroke={COLORS.indigo} strokeWidth={4} fill={COLORS.indigo} fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card className="p-6 h-[400px] relative text-white">
                    <SectionHeader icon={Target} title="Win/Loss Probability Profile" />
                    <DonutCenter value={outcomeDist.reduce((acc, curr) => acc + (curr.pl || 0), 0)} />
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie data={outcomeDist} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, pl }) => `${String(name)}: ${formatCurrency(pl)}`}>
                          {outcomeDist.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} formatter={(val, name, props) => [`${formatCurrency(props.payload.pl)}`, String(props.payload.name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <SectionHeader icon={BarChart3} title="7. Weekday Edge Analysis" color="text-purple-400" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 p-8">
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekdayEdge} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke={COLORS.white} fontSize={11} axisLine={false} tickLine={false} />
                          <YAxis stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="pl" radius={[6, 6, 0, 0]}>
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
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-6 text-white text-white">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="p-8 border-rose-500/30 bg-rose-500/5 col-span-2 relative text-white">
                    <SectionHeader icon={Hammer} title="Behavioral Diagnosis" color="text-rose-400" />
                    <div className="p-6 bg-slate-950/40 rounded-3xl border border-rose-500/20 mb-6">
                      <div className="flex items-center gap-3 mb-2"><Terminal className="text-indigo-400" size={16} /><h4 className="text-xs font-black uppercase text-indigo-400 tracking-widest">AI Institutional Brief</h4></div>
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

                <SectionHeader icon={BrainCircuit} title="Emotional P&L Impact" color="text-purple-400" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 p-6 h-[400px] relative text-white">
                    <DonutCenter value={emotionStats.reduce((acc, curr) => acc + curr.pl, 0)} />
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie data={emotionStats} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="absImpact" label={({ name, pl }) => `${String(name)}: ${formatCurrency(pl)}`}>
                          {emotionStats.map((e, idx) => <Cell key={idx} fill={COLORS.psychPalette[idx % COLORS.psychPalette.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} formatter={(v, n, p) => [`${formatCurrency(p.payload.pl)}`, String(p.payload.name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                  <Card className="p-6 bg-purple-500/5 h-[400px] relative text-white">
                    <SectionHeader icon={AlertTriangle} title="Mistake Analysis" color="text-purple-400" />
                    <ResponsiveContainer width="100%" height="80%"><BarChart data={errors} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="cat" stroke={COLORS.white} fontSize={8} width={60} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} formatter={(v) => formatCurrency(Number(v))} /><Bar dataKey="impact" fill={COLORS.rose} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-white text-white">
                  <Card className="p-6 border-rose-500/20 bg-rose-500/5"><SectionHeader icon={XOctagon} title="Top Loss Drivers" color="text-rose-400" /><div className="space-y-4">{errors.slice(0, 5).map((f, i) => (<div key={i} className="flex gap-3"><XCircle size={14} className="text-rose-500 mt-1 shrink-0" /><div><p className="text-xs font-black uppercase leading-none">{String(f.cat)}</p><p className="text-[10px] text-rose-400 font-bold mt-1">{formatCurrency(f.impact)} Leaked</p></div></div>))}</div></Card>
                  <Card className="p-6 border-amber-500/20 bg-amber-500/5 text-white text-white"><SectionHeader icon={ArrowUpCircle} title="Lessons (Losses)" color="text-amber-400" />{(dynamicAudit?.start || []).map((text, i) => <div key={i} className="flex gap-3 text-xs font-medium italic mb-3">"{String(text)}"</div>)}</Card>
                  <Card className="p-6 border-emerald-500/20 bg-emerald-500/5 text-white text-white"><SectionHeader icon={CheckCircle} title="Patterns (Wins)" color="text-emerald-400" />{(dynamicAudit?.continue || []).map((text, i) => <div key={i} className="flex gap-3 text-xs font-medium italic mb-3">"{String(text)}"</div>)}</Card>
                </div>

                <Card className="p-6">
                  <SectionHeader icon={BookOpen} title="Trade Journal Archive" />
                  <div className="max-h-[350px] overflow-y-auto pr-4 space-y-3 custom-scrollbar text-white">
                    {learnings.map((l, i) => (
                      <div key={i} className="p-4 bg-slate-800/20 border border-slate-800/60 rounded-2xl flex justify-between items-start gap-4">
                        <div className="flex-1 text-white"><span className="text-[10px] text-slate-500 font-bold uppercase">{String(l.date)}</span><p className="text-sm font-medium italic">"{String(l.text)}"</p></div>
                        <div className={`font-mono font-bold ${l.pl < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(l.pl)}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-8">
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
              </div>
            )}

            {activeTab === 'strategies' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <SectionHeader icon={Compass} title="Technical Edge Ranking Matrix" />
                <Card className="p-8 border-dashed border-2 border-slate-800 text-center">
                  <SectionHeader icon={BarChartHorizontal} title="Strategy Performance Profile" sub="Cumulative P&L per Setup" color="text-indigo-400" />
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={[...setupAnalysis].sort((a, b) => b.pl - a.pl)}
                        margin={{ top: 20, right: 60, left: 60, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" stroke={COLORS.white} fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke={COLORS.white} fontSize={10} width={100} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="pl" radius={[0, 4, 4, 0]} barSize={24}>
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
          </main>
        )}
        <footer className="mt-20 py-8 border-t border-slate-900 text-center font-black uppercase text-[10px] tracking-widest text-slate-600 italic">TradeAudit Institutional v125.0</footer>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}</style>
    </div>
  );
};

export default App;
