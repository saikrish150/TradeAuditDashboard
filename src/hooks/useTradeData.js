import { useMemo } from 'react';
import { MONTH_MAP, COLORS, formatCurrency } from '../utils';

export const useTradeData = ({
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
}) => {
  return useMemo(() => {
    if (!rawTrades || rawTrades.length === 0) {
      return { 
        metrics: { total: 0 }, 
        isEmpty: true, 
        maxDayAbsVal: 1, 
        bestPeriod: ['', { pl: 0 }], 
        worstPeriod: ['', { pl: 0 }],
        trades: [],
        snapshots: [],
        filteredNotes: []
      };
    }

    const now = new Date();
    const curMonthName = now.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
    const curYearName = now.getUTCFullYear().toString();

    const getPL = (t) => {
      if (t.pl !== undefined && t.pl !== '' && parseFloat(t.pl) !== 0) return parseFloat(t.pl) || 0;
      if (t.originalData) {
        const variants = ['P/L', 'P & L', 'Profit/Loss', 'Net P&L', 'Amount', 'Profit', 'pl'];
        for (const v of variants) {
          if (t.originalData[v] !== undefined && t.originalData[v] !== '' && parseFloat(t.originalData[v]?.toString().replace(/[₹,]/g, '')) !== 0) {
            const val = t.originalData[v].toString().replace(/[₹,]/g, '').trim();
            return parseFloat(val) || 0;
          }
        }
      }
      return parseFloat(t.pl) || 0;
    };

    const filtered = rawTrades.filter(t => {
      // SUB-FILTER LOGIC (Global Modifiers)
      if (selectedYear !== 'All' && String(t.year) !== String(selectedYear)) return false;
      if (selectedMonth !== 'All' && String(t.month) !== String(selectedMonth)) return false;

      // DATE PRESET LOGIC (Window Filters)
      if (datePreset === 'CurrentMonth') {
        if (t.month !== curMonthName || t.year !== curYearName) return false;
      } else if (datePreset !== 'All') {
        if (['30', '60', '90'].includes(datePreset)) {
          const daysLimit = parseInt(datePreset);
          const diffDays = Math.ceil(Math.abs(now - (t.jsDate || new Date(t.date))) / (1000 * 60 * 60 * 24));
          if (diffDays > daysLimit) return false;
        } else if (datePreset === 'Custom') {
          const tDate = t.jsDate || new Date(t.date);
          if (startDate && tDate < new Date(startDate)) return false;
          if (endDate && tDate > new Date(endDate)) return false;
        }
      } 

      // GLOBAL FILTER LOGIC
      if (selectedDay !== 'All' && String(t.dayNum) !== selectedDay) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (selectedAsset !== 'All' && t.market !== selectedAsset) return false;
      return true;
    });

    const tradeTotalCount = filtered.length;
    if (tradeTotalCount === 0) {
      return { 
        metrics: { total: 0 }, 
        isEmpty: true, 
        maxDayAbsVal: 1, 
        bestPeriod: ['', { pl: 0 }], 
        worstPeriod: ['', { pl: 0 }],
        trades: [],
        snapshots: [],
        filteredNotes: []
      };
    }

    let cumulativePL = 0, winCount = 0, winTotal = 0, lossTotal = 0, ruleAlignedCount = 0, revengeLoss = 0;
    let peakEquity = 0, maxDDValue = 0, maxLosingStreak = 0, currentLosingStreak = 0, maxWinningStreak = 0, currentWinningStreak = 0;
    let totalHoldMinutes = 0, tradesWithHoldTimeCount = 0, totalBrokerage = 0;

    const equityArr = [], errorMap = {}, learningVault = [];
    const yearData = {}, monthData = {}, dayData = {}, dateData = {};
    const activeMonthsSet = new Set();
    const emotionalPnlMap = {}, qualityPnlMap = {}, statusPnlMap = {}, symbolSizingMap = {}, setupAnalysisMap = {}, pointsAnalysisMap = {};

    const holdTimeBuckets = [
      { label: '< 5m', maxMins: 5 },
      { label: '5-10m', maxMins: 10 },
      { label: '10-20m', maxMins: 20 },
      { label: '20-30m', maxMins: 30 },
      { label: '30m-1h', maxMins: 60 },
      { label: '1h-2h', maxMins: 120 },
      { label: '2h-4h', maxMins: 240 },
      { label: '4h-1d', maxMins: 1440 },
      { label: '> 1d', maxMins: Infinity }
    ];
    
    const holdTimeAnalysisMap = holdTimeBuckets.reduce((acc, b) => {
      acc[b.label] = { label: b.label, pl: 0, count: 0, wins: 0 };
      return acc;
    }, {});

    const weekDayStatsRaw = {
      1: { name: 'Monday', wins: 0, total: 0, pl: 0 }, 2: { name: 'Tuesday', wins: 0, total: 0, pl: 0 },
      3: { name: 'Wednesday', wins: 0, total: 0, pl: 0 }, 4: { name: 'Thursday', wins: 0, total: 0, pl: 0 },
      5: { name: 'Friday', wins: 0, total: 0, pl: 0 }, 6: { name: 'Saturday', wins: 0, total: 0, pl: 0 },
      0: { name: 'Sunday', wins: 0, total: 0, pl: 0 }
    };

    filtered.forEach((t, i) => {
      const tPL = getPL(t);
      cumulativePL += tPL; equityArr.push({ id: i, date: t.fullDate, Equity: cumulativePL });
      if (cumulativePL > peakEquity) peakEquity = cumulativePL;
      const dd = cumulativePL - peakEquity; if (dd < maxDDValue) maxDDValue = dd;

      const rawOutcome = String(t.isWin || 'Neutral').toUpperCase();
      const isActuallyWin = ['WIN', 'W'].includes(rawOutcome) || (tPL > 0 && !['LOSS', 'L', 'NEUTRAL', 'NETURAL', 'BE', 'BREAK EVEN'].includes(rawOutcome));
      const isActuallyLoss = ['LOSS', 'L'].includes(rawOutcome) || (tPL < 0 && !['WIN', 'W', 'NEUTRAL', 'NETURAL', 'BE', 'BREAK EVEN', 'RUNNING'].includes(rawOutcome));

      const setupsToProcess = (t.setups && t.setups.length > 0) ? t.setups : [t.setup || t.strategy || 'Misc'];
      setupsToProcess.forEach(sName => {
        const setupKey = String(sName).trim();
        if (!setupAnalysisMap[setupKey]) setupAnalysisMap[setupKey] = { pl: 0, wins: 0, total: 0, winSum: 0, lossSum: 0 };
        setupAnalysisMap[setupKey].pl += tPL; 
        setupAnalysisMap[setupKey].total += 1;
        if (isActuallyWin) { 
          setupAnalysisMap[setupKey].wins += 1; 
          setupAnalysisMap[setupKey].winSum += (parseFloat(t.pl) || 0); 
        } else if (isActuallyLoss) { 
          setupAnalysisMap[setupKey].lossSum += Math.abs(parseFloat(t.pl) || 0); 
        }
      });

      const eKey = t.emotions || t.emotion || 'Unspecified';
      if (!emotionalPnlMap[eKey]) emotionalPnlMap[eKey] = { pl: 0, count: 0 };
      emotionalPnlMap[eKey].pl += tPL; emotionalPnlMap[eKey].count += 1;

      const qKey = t.tradeQuality || t.quality || 'Unspecified';
      if (!qualityPnlMap[qKey]) qualityPnlMap[qKey] = { pl: 0, count: 0 };
      qualityPnlMap[qKey].pl += tPL; qualityPnlMap[qKey].count += 1;

      const sKey = t.tradeStatus || t.status || 'Unspecified';
      if (!statusPnlMap[sKey]) statusPnlMap[sKey] = { pl: 0, count: 0 };
      statusPnlMap[sKey].pl += tPL; statusPnlMap[sKey].count += 1;

      const symKey = t.market || 'Unknown';
      if (!symbolSizingMap[symKey]) symbolSizingMap[symKey] = { totalLots: 0, count: 0, pl: 0 };
      symbolSizingMap[symKey].totalLots += (parseFloat(t.lots || t.positionSize) || 0);
      symbolSizingMap[symKey].count += 1;
      symbolSizingMap[symKey].pl += tPL;

      // Points analysis per symbol based on entry and exit price
      const ep = parseFloat(t.entry_price || t.entryPrice);
      const exp = parseFloat(t.exit_price || t.exitPrice);
      if (!isNaN(ep) && !isNaN(exp) && ep > 0 && exp > 0) {
        const points = Math.abs(exp - ep);
        if (!pointsAnalysisMap[symKey]) {
          pointsAnalysisMap[symKey] = {
            symbol: symKey,
            target: { totalPoints: 0, count: 0, high: -Infinity, low: Infinity },
            sl: { totalPoints: 0, count: 0, high: -Infinity, low: Infinity }
          };
        }
        
        const isTarget = isActuallyWin;
        const targetObj = isTarget ? pointsAnalysisMap[symKey].target : pointsAnalysisMap[symKey].sl;
        targetObj.totalPoints += points;
        targetObj.count += 1;
        if (points > targetObj.high) targetObj.high = points;
        if (points < targetObj.low) targetObj.low = points;
      }

      // Brokerage calculation
      totalBrokerage += (parseFloat(t.brokerage) || 0);

      // Hold time calculation
      if (t.tradeTime) {
        const timeStr = String(t.tradeTime).toLowerCase().trim();
        let mins = 0;
        let valid = false;
        
        const hMatch = timeStr.match(/(\d+(?:\.\d+)?)\s*h/);
        if (hMatch) { mins += parseFloat(hMatch[1]) * 60; valid = true; }
        
        const mMatch = timeStr.match(/(\d+(?:\.\d+)?)\s*m/);
        if (mMatch) { mins += parseFloat(mMatch[1]); valid = true; }
        
        const sMatch = timeStr.match(/(\d+(?:\.\d+)?)\s*s/);
        if (sMatch) { mins += parseFloat(sMatch[1]) / 60; valid = true; }

        if (valid) {
          totalHoldMinutes += mins;
          tradesWithHoldTimeCount += 1;
          
          const bucket = holdTimeBuckets.find(b => mins <= b.maxMins);
          if (bucket) {
            holdTimeAnalysisMap[bucket.label].pl += tPL;
            holdTimeAnalysisMap[bucket.label].count += 1;
            if (isActuallyWin) holdTimeAnalysisMap[bucket.label].wins += 1;
          }
        }
      }

      const mIdx = MONTH_MAP[t.month] ?? 0;
      const checkDate = new Date(Date.UTC(parseInt(t.year) || 2024, mIdx, parseInt(t.dayNum) || 1, 12, 0, 0));
      const dayOfWeek = isNaN(checkDate.getTime()) ? 0 : checkDate.getUTCDay();

      if (weekDayStatsRaw[dayOfWeek]) {
        weekDayStatsRaw[dayOfWeek].total += 1;
        weekDayStatsRaw[dayOfWeek].pl += tPL;
        if (isActuallyWin) weekDayStatsRaw[dayOfWeek].wins += 1;
      }

      if (isActuallyWin) {
        winCount++; winTotal += tPL; currentLosingStreak = 0; currentWinningStreak++;
        if (currentWinningStreak > maxWinningStreak) maxWinningStreak = currentWinningStreak;
      } else if (isActuallyLoss) {
        lossTotal += Math.abs(tPL); 
        const reasonKey = t.lossReason || "Unspecified Error";
        if (!errorMap[reasonKey]) errorMap[reasonKey] = { impact: 0, count: 0 };
        errorMap[reasonKey].impact += tPL; errorMap[reasonKey].count += 1;
        if (String(t.emotion || '').toLowerCase().includes('revenge')) revengeLoss += Math.abs(tPL);
        currentWinningStreak = 0; currentLosingStreak++;
        if (currentLosingStreak > maxLosingStreak) maxLosingStreak = currentLosingStreak;
      }

      if (!yearData[t.year]) yearData[t.year] = { pl: 0, count: 0 };
      yearData[t.year].pl += tPL; yearData[t.year].count += 1;
      const mKey = `${t.month} ${t.year}`;
      activeMonthsSet.add(mKey);
      if (!monthData[mKey]) monthData[mKey] = { pl: 0, count: 0 };
      monthData[mKey].pl += tPL; monthData[mKey].count += 1;
      if (!dayData[t.dayNum]) dayData[t.dayNum] = { pl: 0, count: 0 };
      dayData[t.dayNum].pl += tPL; dayData[t.dayNum].count += 1;

      const dateKey = `${t.year}-${String(mIdx + 1).padStart(2, '0')}-${String(t.dayNum).padStart(2, '0')}`;
      if (!dateData[dateKey]) dateData[dateKey] = { pl: 0, count: 0 };
      dateData[dateKey].pl += tPL; dateData[dateKey].count += 1;

      if (t.learning && t.learning.length > 3) {
        learningVault.push({ 
          date: t.fullDate, 
          text: t.learning, 
          pl: tPL,
          screenshots: t.screenshots || [t.screenshotUrl || t.chartScreenshotUrl].filter(Boolean)
        });
      }
      if (String(t.tradeQuality || t.quality).toLowerCase().includes('a') || String(t.tradeQuality || t.quality).toLowerCase().includes('b')) ruleAlignedCount++;
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
      highlightSource = filtered.map((t, idx) => [`Trade #${idx + 1}`, { pl: getPL(t) }]);
    }

    const bestPeriod = highlightSource.length > 0 ? highlightSource.reduce((a, b) => a[1].pl > b[1].pl ? a : b) : ['', { pl: 0 }];
    const worstPeriod = highlightSource.length > 0 ? highlightSource.reduce((a, b) => a[1].pl < b[1].pl ? a : b) : ['', { pl: 0 }];

    const avgWin = winTotal / (winCount || 1); const avgLoss = lossTotal / (tradeTotalCount - winCount || 1);
    const overallRRValue = (avgWin / (avgLoss || 1)).toFixed(2); const winRateValue = ((winCount / tradeTotalCount) * 100).toFixed(1);

    const errorStats = Object.entries(errorMap).sort((a, b) => a[1].impact - b[1].impact).map(([cat, d]) => ({ cat: String(cat), impact: d.impact }));
    const eStats = Object.entries(emotionalPnlMap).map(([name, d]) => ({ name: String(name), pl: d.pl, trades: d.count, absImpact: Math.abs(d.pl) || 1 }));
    const holdTimeAnalysis = holdTimeBuckets.map(b => holdTimeAnalysisMap[b.label]);

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

      const worstThreeTrades = filtered.filter(t => getPL(t) < 0).sort((a, b) => getPL(a) - getPL(b)).slice(0, 3);
      const worstThreeLossSum = worstThreeTrades.reduce((sum, t) => sum + Math.abs(getPL(t)), 0);
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
        prioritySteps: prioritySteps.slice(0, 4)
      };
    };

    // Advanced Behavioral Audit Logic
    const worstSetup = Object.entries(setupAnalysisMap).sort((a, b) => a[1].pl - b[1].pl)[0];
    const bestSetup = Object.entries(setupAnalysisMap).sort((a, b) => b[1].pl - a[1].pl)[0];
    const worstEmotion = eStats.sort((a, b) => a.pl - b.pl)[0];
    const bestEmotion = eStats.sort((a, b) => b.pl - a.pl)[0];

    const noteMistakes = (notes || []).filter(n => String(n.category || '').toLowerCase().includes('mistake'))
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 3)
      .map(n => n.content || n.Note);
      
    const noteLearnings = (notes || []).filter(n => String(n.category || '').toLowerCase().includes('learning'))
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 3)
      .map(n => n.content || n.Note);

    const stopDoing = [...noteMistakes];
    if (worstSetup && worstSetup[1].pl < 0) stopDoing.push(`STOP Trading ${worstSetup[0]} (Net Loss: ${formatCurrency(worstSetup[1].pl)})`);
    if (worstEmotion && worstEmotion.pl < 0) stopDoing.push(`STOP Trading when feeling ${worstEmotion.name} (Impact: ${formatCurrency(worstEmotion.pl)})`);

    const keepDoing = [];
    if (bestSetup && bestSetup[1].pl > 0) keepDoing.push(`KEEP Focused on ${bestSetup[0]} (Best Edge: ${formatCurrency(bestSetup[1].pl)})`);
    if (bestEmotion && bestEmotion.pl > 0) keepDoing.push(`KEEP Trading in ${bestEmotion.name} state (Profit: ${formatCurrency(bestEmotion.pl)})`);

    const avgHoldTimeStr = tradesWithHoldTimeCount > 0 ? (totalHoldMinutes / tradesWithHoldTimeCount) : 0;
    const formatAvgHoldTime = (mins) => {
        if (!mins) return '0s';
        if (mins < 1) return `${Math.round(mins * 60)}s`;
        if (mins < 60) return `${Math.round(mins)}m`;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const pointsAnalysis = Object.values(pointsAnalysisMap).map(m => {
      return {
        symbol: m.symbol,
        target: {
          avg: m.target.count > 0 ? parseFloat((m.target.totalPoints / m.target.count).toFixed(2)) : 0,
          high: m.target.high === -Infinity ? 0 : parseFloat(m.target.high.toFixed(2)),
          low: m.target.low === Infinity ? 0 : parseFloat(m.target.low.toFixed(2)),
          count: m.target.count
        },
        sl: {
          avg: m.sl.count > 0 ? parseFloat((m.sl.totalPoints / m.sl.count).toFixed(2)) : 0,
          high: m.sl.high === -Infinity ? 0 : parseFloat(m.sl.high.toFixed(2)),
          low: m.sl.low === Infinity ? 0 : parseFloat(m.sl.low.toFixed(2)),
          count: m.sl.count
        }
      };
    }).filter(m => m.target.count > 0 || m.sl.count > 0);

    const symbolPnl = Object.keys(symbolSizingMap).map(k => ({
      name: k,
      pl: symbolSizingMap[k].pl,
      trades: symbolSizingMap[k].count
    })).sort((a, b) => b.pl - a.pl);

    return {
      metrics: { net: cumulativePL, winRate: winRateValue, total: tradeTotalCount, avgWin, avgLoss, overallRR: overallRRValue, maxProfit: Math.max(...filtered.map(t => t.pl > 0 ? t.pl : 0), 0), maxLoss: Math.max(...filtered.map(t => t.pl < 0 ? Math.abs(t.pl) : 0), 0), pf: (winTotal / (lossTotal || 1)).toFixed(2), expectancy: (cumulativePL / tradeTotalCount).toFixed(0), maxLosingStreak, maxWinningStreak, peakDD: maxDDValue, profitDD: (cumulativePL / (Math.abs(maxDDValue) || 1)).toFixed(2), mindsetEfficiency: Math.round(((winTotal - Math.abs(revengeLoss)) / (winTotal || 1)) * 100), maxTradesInDay: Math.max(...Object.values(dateData).map(d => d.count), 0), avgTradesPerActiveDay: Object.keys(dateData).length > 0 ? (tradeTotalCount / Object.keys(dateData).length).toFixed(1) : 0, avgTimeHolded: formatAvgHoldTime(avgHoldTimeStr), brokeragePaid: totalBrokerage },
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
      holdTimeAnalysis,
      pointsAnalysis,
      symbolPnl,
      dynamicAudit: { start: stopDoing.slice(0, 5), continue: keepDoing.slice(0, 5) },
      learnings: learningVault.sort((a, b) => a.pl - b.pl),
      trades: filtered,
      snapshots: rawSnapshots.filter(s => {
        const sDate = s.jsDate || new Date(s.date);
        if (datePreset === 'CurrentMonth') {
          if (s.month !== curMonthName || s.year !== curYearName) return false;
        } else if (datePreset !== 'All') {
          if (['30', '60', '90'].includes(datePreset)) {
            const daysLimit = parseInt(datePreset);
            const diffDays = Math.ceil(Math.abs(now - sDate) / (1000 * 60 * 60 * 24));
            if (diffDays > daysLimit) return false;
          } else if (datePreset === 'Custom') {
            if (startDate && sDate < new Date(startDate)) return false;
            if (endDate && sDate > new Date(endDate)) return false;
          }
        } else {
          if (selectedYear !== 'All' && s.year !== selectedYear) return false;
          if (selectedMonth !== 'All' && s.month !== selectedMonth) return false;
        }
        return true;
      }),
      filteredNotes: notes.filter(n => {
        const nDate = n.jsDate || new Date(n.date);
        if (datePreset === 'CurrentMonth') {
          if (n.month !== curMonthName || n.year !== curYearName) return false;
        } else if (datePreset !== 'All') {
          if (['30', '60', '90'].includes(datePreset)) {
            const daysLimit = parseInt(datePreset);
            const diffDays = Math.ceil(Math.abs(now - nDate) / (1000 * 60 * 60 * 24));
            if (diffDays > daysLimit) return false;
          } else if (datePreset === 'Custom') {
            if (startDate && nDate < new Date(startDate)) return false;
            if (endDate && nDate > new Date(endDate)) return false;
          }
        } else {
          if (selectedYear !== 'All' && n.year !== selectedYear) return false;
          if (selectedMonth !== 'All' && n.month !== selectedMonth) return false;
        }
        return true;
      })
    };
  }, [rawTrades, rawSnapshots, notes, datePreset, selectedYear, selectedMonth, selectedDay, selectedCategory, selectedAsset, startDate, endDate]);
};
