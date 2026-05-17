/**
 * AI Audit Engine — Pure frontend analytics
 * No API calls. Just math on trade arrays.
 */

// ─── HELPERS ────────────────────────────────────────────
const MONTH_MAP = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };

const getPL = (t) => parseFloat(t.pl) || 0;
const getDate = (t) => t.jsDate || new Date(t.date || t.fullDate);
const getDayOfWeek = (t) => {
  const d = getDate(t);
  return isNaN(d.getTime()) ? 0 : d.getDay();
};
const getDayName = (day) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
const getHour = (t) => {
  const d = getDate(t);
  return isNaN(d.getTime()) ? 10 : d.getHours();
};
const getSessionLabel = (hour) => {
  if (hour < 10) return 'Pre-Market (Before 10)';
  if (hour < 12) return 'Morning (10–12)';
  if (hour < 14) return 'Midday (12–2)';
  return 'Afternoon (2+)';
};

const mean = (arr) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
const stdDev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
};

// ═══════════════════════════════════════════════════════════
// 1. DAILY BRIEFING
// ═══════════════════════════════════════════════════════════
export function generateDailyBriefing(trades) {
  if (!trades || trades.length < 5) {
    return { edge: null, dangers: [], streak: null, forecast: null, insufficient: true };
  }

  const today = new Date();
  const todayDow = today.getDay();

  // ── Best/Worst Day of Week ──
  const dowStats = {};
  trades.forEach(t => {
    const dow = getDayOfWeek(t);
    if (!dowStats[dow]) dowStats[dow] = { wins: 0, total: 0, pl: 0 };
    dowStats[dow].total++;
    dowStats[dow].pl += getPL(t);
    const outcome = String(t.isWin || '').toUpperCase();
    if (['WIN', 'W'].includes(outcome) || (getPL(t) > 0)) dowStats[dow].wins++;
  });

  const todayStat = dowStats[todayDow];
  const allDays = Object.entries(dowStats).filter(([, d]) => d.total >= 3);
  const bestDay = allDays.length > 0 ? allDays.reduce((a, b) => (a[1].pl > b[1].pl ? a : b)) : null;
  const worstDay = allDays.length > 0 ? allDays.reduce((a, b) => (a[1].pl < b[1].pl ? a : b)) : null;

  // ── Edge for today ──
  let edge = null;
  if (todayStat && todayStat.total >= 3) {
    const wr = Math.round((todayStat.wins / todayStat.total) * 100);
    edge = {
      dayName: getDayName(todayDow),
      winRate: wr,
      avgPL: Math.round(todayStat.pl / todayStat.total),
      totalTrades: todayStat.total,
      verdict: wr >= 55 ? 'strong' : wr >= 45 ? 'neutral' : 'weak'
    };
  }

  // ── Best market today ──
  const marketStats = {};
  trades.filter(t => getDayOfWeek(t) === todayDow).forEach(t => {
    const m = t.market || 'Unknown';
    if (!marketStats[m]) marketStats[m] = { wins: 0, total: 0, pl: 0 };
    marketStats[m].total++;
    marketStats[m].pl += getPL(t);
    if (getPL(t) > 0) marketStats[m].wins++;
  });
  const bestMarketToday = Object.entries(marketStats)
    .filter(([, d]) => d.total >= 2)
    .sort((a, b) => b[1].pl - a[1].pl)[0];

  // ── Danger zones ──
  const dangers = [];
  if (worstDay && parseInt(worstDay[0]) === todayDow) {
    dangers.push(`${getDayName(todayDow)} is historically your worst trading day (Net: ₹${Math.round(worstDay[1].pl)}). Trade with extra caution.`);
  }
  
  // Worst emotion
  const emotionStats = {};
  trades.forEach(t => {
    const e = t.emotions || t.emotion || 'Unspecified';
    if (!emotionStats[e]) emotionStats[e] = { wins: 0, total: 0, pl: 0 };
    emotionStats[e].total++;
    emotionStats[e].pl += getPL(t);
    if (getPL(t) > 0) emotionStats[e].wins++;
  });
  const worstEmotion = Object.entries(emotionStats)
    .filter(([, d]) => d.total >= 3 && d.pl < 0)
    .sort((a, b) => a[1].pl - b[1].pl)[0];
  if (worstEmotion) {
    dangers.push(`When you trade feeling "${worstEmotion[0]}", you lose ₹${Math.abs(Math.round(worstEmotion[1].pl))} on average. Avoid trading in that state.`);
  }

  // Worst quality
  const qualityStats = {};
  trades.forEach(t => {
    const q = t.tradeQuality || t.quality || 'Unspecified';
    if (!qualityStats[q]) qualityStats[q] = { total: 0, pl: 0 };
    qualityStats[q].total++;
    qualityStats[q].pl += getPL(t);
  });
  const worstQuality = Object.entries(qualityStats)
    .filter(([k, d]) => d.total >= 3 && d.pl < 0 && k.toLowerCase().includes('c'))
    .sort((a, b) => a[1].pl - b[1].pl)[0];
  if (worstQuality) {
    dangers.push(`C-quality trades have cost you ₹${Math.abs(Math.round(worstQuality[1].pl))} total. Skip anything below B-quality today.`);
  }

  // ── Current streak ──
  const sorted = [...trades].sort((a, b) => getDate(b) - getDate(a));
  let streakType = null, streakCount = 0;
  for (const t of sorted) {
    const outcome = String(t.isWin || '').toUpperCase();
    const isWin = ['WIN', 'W'].includes(outcome) || getPL(t) > 0;
    const isLoss = ['LOSS', 'L'].includes(outcome) || getPL(t) < 0;
    if (streakType === null) {
      streakType = isWin ? 'win' : isLoss ? 'loss' : null;
      if (streakType) streakCount = 1;
    } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && isLoss)) {
      streakCount++;
    } else {
      break;
    }
  }

  let streakAdvice = '';
  if (streakType === 'loss' && streakCount >= 3) {
    streakAdvice = `You're on a ${streakCount}-trade losing streak. Reduce your lot size by 50% today. Focus on execution quality, not P&L recovery.`;
  } else if (streakType === 'win' && streakCount >= 3) {
    streakAdvice = `You're on a ${streakCount}-trade winning streak! Don't get overconfident. Stick to your normal sizing — this is when traders start taking bad setups.`;
  } else if (streakType === 'loss') {
    streakAdvice = `Last ${streakCount} trade${streakCount > 1 ? 's were' : ' was'} a loss. Stay patient and wait for A-quality setups.`;
  } else if (streakType === 'win') {
    streakAdvice = `Last ${streakCount} trade${streakCount > 1 ? 's were' : ' was'} winners. Good momentum — keep your process consistent.`;
  }

  // ── Psychological forecast ──
  const lastTrades = sorted.slice(0, 5);
  const lastEmotions = lastTrades.map(t => t.emotions || t.emotion || 'Unknown');
  const lastPL = lastTrades.reduce((s, t) => s + getPL(t), 0);
  let forecast = '';
  if (lastPL < 0 && streakType === 'loss') {
    forecast = 'You may be feeling frustrated from recent losses. Take 10 deep breaths before your first trade. Remind yourself that one trade doesn\'t define your edge.';
  } else if (lastPL > 0) {
    forecast = 'Recent sessions have been positive. You\'re likely in a confident mindset. Use this energy wisely — confidence is good, but overconfidence leads to oversizing.';
  } else {
    forecast = 'Your recent performance is mixed. Stay neutral and let the market come to you. No need to force trades.';
  }

  return {
    insufficient: false,
    edge,
    bestDay: bestDay ? { name: getDayName(parseInt(bestDay[0])), pl: Math.round(bestDay[1].pl), wr: Math.round((bestDay[1].wins / bestDay[1].total) * 100) } : null,
    bestMarketToday: bestMarketToday ? { name: bestMarketToday[0], pl: Math.round(bestMarketToday[1].pl), wr: Math.round((bestMarketToday[1].wins / bestMarketToday[1].total) * 100) } : null,
    dangers,
    streak: { type: streakType, count: streakCount, advice: streakAdvice },
    forecast
  };
}

// ═══════════════════════════════════════════════════════════
// 2. PATTERN ANOMALY DETECTOR
// ═══════════════════════════════════════════════════════════
export function detectAnomalies(trades) {
  if (!trades || trades.length < 10) return [];
  const anomalies = [];

  // Group trades by date
  const byDate = {};
  trades.forEach(t => {
    const key = getDate(t).toDateString();
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(t);
  });
  const dailyCounts = Object.values(byDate).map(arr => arr.length);
  const avgDaily = mean(dailyCounts);
  const sdDaily = stdDev(dailyCounts);

  // Today's trades
  const todayKey = new Date().toDateString();
  const todayTrades = byDate[todayKey] || [];

  // ── Overtrading ──
  if (todayTrades.length > 0 && todayTrades.length > avgDaily + 1.5 * sdDaily) {
    anomalies.push({
      type: 'overtrading',
      severity: todayTrades.length > avgDaily + 2 * sdDaily ? 'CRITICAL' : 'WARNING',
      message: `You've taken ${todayTrades.length} trades today. Your average is ${avgDaily.toFixed(1)} per day. This is significantly above normal — are you overtrading?`,
      stat: `${todayTrades.length} vs avg ${avgDaily.toFixed(1)}`
    });
  }

  // ── Position size spike ──
  const lots = trades.map(t => parseFloat(t.positionSize || t.lots) || 0).filter(v => v > 0);
  if (lots.length > 5) {
    const avgLots = mean(lots);
    const sdLots = stdDev(lots);
    const recentLots = lots.slice(-3);
    const recentAvg = mean(recentLots);
    if (recentAvg > avgLots + 1.5 * sdLots) {
      anomalies.push({
        type: 'size_spike',
        severity: recentAvg > avgLots + 2 * sdLots ? 'CRITICAL' : 'WARNING',
        message: `Your recent position size (${recentAvg.toFixed(1)} lots) is much higher than your average (${avgLots.toFixed(1)} lots). Large sizes after losses = revenge trading.`,
        stat: `${recentAvg.toFixed(1)} vs avg ${avgLots.toFixed(1)}`
      });
    }
  }

  // ── Losing streak ──
  const sorted = [...trades].sort((a, b) => getDate(b) - getDate(a));
  let consLosses = 0;
  for (const t of sorted) {
    if (getPL(t) < 0) consLosses++;
    else break;
  }
  if (consLosses >= 3) {
    anomalies.push({
      type: 'losing_streak',
      severity: consLosses >= 5 ? 'CRITICAL' : 'WARNING',
      message: `You're on a ${consLosses}-trade losing streak. Historically, your win rate drops to below 30% after 3 consecutive losses. Consider pausing.`,
      stat: `${consLosses} consecutive losses`
    });
  }

  // ── Emotion deterioration ──
  const recentTrades = sorted.slice(0, 10);
  const negEmotions = ['Greedy', 'Fearful', 'Angry', 'Revenge', 'FOMO', 'Frustrated'];
  const recentNeg = recentTrades.filter(t => negEmotions.some(e => String(t.emotions || t.emotion || '').toLowerCase().includes(e.toLowerCase()))).length;
  if (recentNeg >= 4) {
    anomalies.push({
      type: 'emotion_decay',
      severity: recentNeg >= 7 ? 'CRITICAL' : 'WARNING',
      message: `${recentNeg} of your last 10 trades had negative emotional states (Greedy, Fearful, etc.). Your emotional discipline is breaking down.`,
      stat: `${recentNeg}/10 negative emotions`
    });
  }

  // ── Quality decay ──
  const recentQualities = recentTrades.map(t => (t.tradeQuality || t.quality || '').toLowerCase());
  const lowQuality = recentQualities.filter(q => q.includes('c') || q.includes('d')).length;
  if (lowQuality >= 4) {
    anomalies.push({
      type: 'quality_decay',
      severity: lowQuality >= 7 ? 'CRITICAL' : 'WARNING',
      message: `${lowQuality} of your last 10 trades were C/D quality. You're taking poor setups. Only trade A/B quality today.`,
      stat: `${lowQuality}/10 low quality`
    });
  }

  // ── Winning streak (overconfidence risk) ──
  let consWins = 0;
  for (const t of sorted) {
    if (getPL(t) > 0) consWins++;
    else break;
  }
  if (consWins >= 5) {
    anomalies.push({
      type: 'win_streak',
      severity: 'INFO',
      message: `You're on a ${consWins}-trade winning streak! Great performance, but statistically this streak will end. Don't increase lot sizes or take "revenge" trades when it breaks.`,
      stat: `${consWins} consecutive wins`
    });
  }

  // ── Market concentration ──
  const last20 = sorted.slice(0, 20);
  const marketCount20 = {};
  last20.forEach(t => {
    const m = t.market || 'Unknown';
    marketCount20[m] = (marketCount20[m] || 0) + 1;
  });
  const topMarket = Object.entries(marketCount20).sort((a, b) => b[1] - a[1])[0];
  if (topMarket && topMarket[1] >= 16) {
    anomalies.push({
      type: 'concentration',
      severity: 'INFO',
      message: `${topMarket[1]} of your last 20 trades are on ${topMarket[0]}. You're heavily concentrated. If this market turns choppy, consider diversifying.`,
      stat: `${topMarket[1]}/20 on ${topMarket[0]}`
    });
  }

  return anomalies.sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (order[a.severity] || 9) - (order[b.severity] || 9);
  });
}

// ═══════════════════════════════════════════════════════════
// 3. WHAT-IF SCENARIO ENGINE
// ═══════════════════════════════════════════════════════════
const SCENARIOS = [
  { id: 'skip_c_quality', label: 'Skip all C/D quality trades', filter: (t) => !(t.tradeQuality || t.quality || '').toLowerCase().match(/c|d/) },
  { id: 'skip_negative_emotions', label: 'Skip trades when Greedy/Fearful/FOMO', filter: (t) => !['greedy', 'fearful', 'fomo', 'angry', 'revenge', 'frustrated'].some(e => (t.emotions || t.emotion || '').toLowerCase().includes(e)) },
  { id: 'cap_lots_2', label: 'Cap position size at 2 lots', transform: (t) => {
    const lots = parseFloat(t.positionSize || t.lots) || 1;
    if (lots <= 2) return t;
    const ratio = 2 / lots;
    return { ...t, pl: getPL(t) * ratio };
  }},
  { id: 'skip_afternoon', label: 'Only trade before 2 PM', filter: (t) => getHour(t) < 14 },
  { id: 'best_market_only', label: 'Only trade your best market', _dynamic: true },
  { id: 'remove_worst_3', label: 'Remove your 3 worst trades', _dynamic: true }
];

export function getScenarios() {
  return SCENARIOS.map(s => ({ id: s.id, label: s.label }));
}

export function runWhatIf(trades, scenarioId) {
  if (!trades || trades.length === 0) return null;

  const sorted = [...trades].sort((a, b) => getDate(a) - getDate(b));

  // Build original equity curve
  let cumPL = 0;
  const originalEquity = sorted.map((t, i) => {
    cumPL += getPL(t);
    return { id: i, date: getDate(t).toLocaleDateString(), equity: cumPL };
  });

  // Find scenario
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) return null;

  let filteredTrades;
  if (scenarioId === 'best_market_only') {
    // Find best market
    const marketPL = {};
    sorted.forEach(t => {
      const m = t.market || 'Unknown';
      marketPL[m] = (marketPL[m] || 0) + getPL(t);
    });
    const bestMarket = Object.entries(marketPL).sort((a, b) => b[1] - a[1])[0]?.[0];
    filteredTrades = sorted.filter(t => (t.market || 'Unknown') === bestMarket);
  } else if (scenarioId === 'remove_worst_3') {
    const worstIndices = sorted
      .map((t, i) => ({ i, pl: getPL(t) }))
      .sort((a, b) => a.pl - b.pl)
      .slice(0, 3)
      .map(x => x.i);
    filteredTrades = sorted.filter((_, i) => !worstIndices.includes(i));
  } else if (scenario.transform) {
    filteredTrades = sorted.map(scenario.transform);
  } else if (scenario.filter) {
    filteredTrades = sorted.filter(scenario.filter);
  } else {
    filteredTrades = sorted;
  }

  // Build what-if equity curve
  cumPL = 0;
  const whatIfEquity = filteredTrades.map((t, i) => {
    cumPL += getPL(t);
    return { id: i, date: getDate(t).toLocaleDateString(), equity: cumPL };
  });

  const originalNet = originalEquity.length > 0 ? originalEquity[originalEquity.length - 1].equity : 0;
  const whatIfNet = whatIfEquity.length > 0 ? whatIfEquity[whatIfEquity.length - 1].equity : 0;
  const delta = whatIfNet - originalNet;
  const removed = sorted.length - filteredTrades.length;

  return {
    scenarioLabel: scenario.label,
    originalEquity,
    whatIfEquity,
    originalNet: Math.round(originalNet),
    whatIfNet: Math.round(whatIfNet),
    delta: Math.round(delta),
    originalCount: sorted.length,
    filteredCount: filteredTrades.length,
    removedCount: removed
  };
}
