import React, { useState, useEffect, useCallback } from 'react';
import { motion as Motion } from 'framer-motion';
import { Brain, Activity, Shield, Zap, TrendingUp, TrendingDown, AlertTriangle, Target, Globe2, Newspaper, CalendarDays } from 'lucide-react';
import { marketPulseEngine } from '../../services/marketPulseEngine';
import SectionHeader from '../SectionHeader';

// ─── Helper: Time ago ──────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── Helper: Urgency badge ─────────────────────────────────
const urgencyStyle = (urgency) => {
  const map = {
    EXTREME: 'bg-red-500/15 border-red-500/40 text-red-400',
    HIGH: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
    MEDIUM: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
    LOW: 'bg-slate-500/15 border-slate-500/40 text-slate-400'
  };
  return map[urgency] || map.LOW;
};

// ═══════════════════════════════════════════════════════════
// NEWS SUMMARY — Plain language briefing
// ═══════════════════════════════════════════════════════════
const NewsSummary = ({ intelligence }) => {
  if (!intelligence || intelligence.length === 0) {
    return (
      <div className="bg-journal-secondary/40 border border-white/5 rounded-[2rem] p-8 text-center">
        <Newspaper size={32} className="text-slate-700 mx-auto mb-3" />
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No news data available yet</p>
      </div>
    );
  }

  // Categorize
  const bullishCount = intelligence.filter(n => {
    const impacts = Object.values(n.marketImpact || {});
    return impacts.filter(i => i === 'Bullish').length > impacts.filter(i => i === 'Bearish').length;
  }).length;
  const bearishCount = intelligence.filter(n => {
    const impacts = Object.values(n.marketImpact || {});
    return impacts.filter(i => i === 'Bearish').length > impacts.filter(i => i === 'Bullish').length;
  }).length;
  const neutralCount = intelligence.length - bullishCount - bearishCount;
  const extremeCount = intelligence.filter(n => n.urgency === 'EXTREME').length;
  const highCount = intelligence.filter(n => n.urgency === 'HIGH').length;

  // Dominant sentiment
  const dominant = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'mixed';
  const dominantColor = dominant === 'bullish' ? 'text-emerald-400' : dominant === 'bearish' ? 'text-red-400' : 'text-amber-400';

  // Top 3 headlines
  const top3 = [...intelligence].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0)).slice(0, 3);

  // Most affected markets
  const marketCounts = {};
  intelligence.forEach(n => (n.affectedMarkets || []).forEach(m => { marketCounts[m] = (marketCounts[m] || 0) + 1; }));
  const topMarkets = Object.entries(marketCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => m);

  // Build summary paragraph
  const sentenceParts = [];
  sentenceParts.push(`We analyzed ${intelligence.length} news articles.`);
  sentenceParts.push(`The overall news flow is ${dominant === 'mixed' ? 'mixed — neither clearly bullish nor bearish' : dominant} right now — ${bullishCount} articles are positive, ${bearishCount} are negative, and ${neutralCount} are neutral.`);
  if (extremeCount > 0) sentenceParts.push(`⚠️ There ${extremeCount === 1 ? 'is' : 'are'} ${extremeCount} extreme-urgency ${extremeCount === 1 ? 'story' : 'stories'} that could move markets sharply.`);
  else if (highCount > 0) sentenceParts.push(`There ${highCount === 1 ? 'is' : 'are'} ${highCount} high-urgency ${highCount === 1 ? 'story' : 'stories'} worth watching.`);
  else sentenceParts.push('No urgent alerts at this time — markets should be relatively calm from a news perspective.');
  if (topMarkets.length > 0) sentenceParts.push(`Markets most in focus: ${topMarkets.join(', ')}.`);

  return (
    <div className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-6 rounded-[2rem] space-y-5">
      {/* Dominant sentiment badge */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${dominant === 'bullish' ? 'bg-emerald-500/15' : dominant === 'bearish' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
          {dominant === 'bullish' ? <TrendingUp size={18} className="text-emerald-400" /> :
           dominant === 'bearish' ? <TrendingDown size={18} className="text-red-400" /> :
           <Activity size={18} className="text-amber-400" />}
        </div>
        <div>
          <p className={`text-sm font-black uppercase tracking-widest ${dominantColor}`}>{dominant} Sentiment</p>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{intelligence.length} articles • {bullishCount} bullish • {bearishCount} bearish</p>
        </div>
      </div>

      {/* Plain language summary */}
      <p className="text-[13px] text-slate-300 leading-relaxed font-medium">
        {sentenceParts.join(' ')}
      </p>

      {/* Top Headlines — simple list */}
      {top3.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Top Headlines</p>
          {top3.map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              <span className="text-[10px] font-black text-slate-600 mt-0.5 shrink-0">{i + 1}.</span>
              <div>
                <p className="text-[12px] font-bold text-slate-200 leading-snug">{item.title}</p>
                <p className="text-[9px] text-slate-500 font-bold mt-1">
                  {(item.affectedMarkets || []).slice(0, 3).join(', ')} • {timeAgo(item.publishedAt || item.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// EVENTS SUMMARY — Plain language briefing
// ═══════════════════════════════════════════════════════════
const EventsSummary = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="bg-journal-secondary/40 border border-white/5 rounded-[2rem] p-8 text-center">
        <CalendarDays size={32} className="text-slate-700 mx-auto mb-3" />
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No upcoming events</p>
      </div>
    );
  }

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.event_time || e.date) > now);
  const highImpact = upcoming.filter(e => (e.importance || e.impact || 0) >= 3);
  const nextEvent = upcoming[0];
  const nextHighImpact = highImpact[0];

  // Countries involved
  const countries = [...new Set(upcoming.map(e => e.country).filter(Boolean))];

  // Build summary
  const lines = [];
  lines.push(`There ${upcoming.length === 1 ? 'is' : 'are'} ${upcoming.length} upcoming economic ${upcoming.length === 1 ? 'event' : 'events'} on the calendar.`);
  
  if (highImpact.length > 0) {
    lines.push(`🔴 ${highImpact.length} of them ${highImpact.length === 1 ? 'is' : 'are'} high-impact — these can cause sudden price spikes and wide spreads, so trade carefully around them.`);
  } else {
    lines.push('None of the upcoming events are high-impact, so volatility risk from the calendar is low.');
  }

  if (nextEvent) {
    const nextDate = new Date(nextEvent.event_time || nextEvent.date);
    const hoursUntil = Math.max(0, Math.round((nextDate - now) / 3600000));
    const timeStr = hoursUntil === 0 ? 'happening now' : hoursUntil < 24 ? `in ${hoursUntil} hours` : `in ${Math.round(hoursUntil / 24)} days`;
    lines.push(`The next event is "${nextEvent.event || nextEvent.title}" from ${nextEvent.country || 'Global'}, coming up ${timeStr}.`);
  }

  if (nextHighImpact && nextHighImpact !== nextEvent) {
    const hDate = new Date(nextHighImpact.event_time || nextHighImpact.date);
    const hHours = Math.max(0, Math.round((hDate - now) / 3600000));
    const hTimeStr = hHours === 0 ? 'happening now' : hHours < 24 ? `in ${hHours} hours` : `in ${Math.round(hHours / 24)} days`;
    lines.push(`⚠️ The next high-impact event is "${nextHighImpact.event || nextHighImpact.title}" (${nextHighImpact.country}) — ${hTimeStr}. Consider reducing position size or avoiding new entries around this window.`);
  }

  if (countries.length > 0) {
    lines.push(`Countries in focus: ${countries.slice(0, 5).join(', ')}.`);
  }

  // Simple upcoming list for high-impact only
  const highList = highImpact.slice(0, 5);

  return (
    <div className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-6 rounded-[2rem] space-y-5">
      {/* Quick stat row */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${highImpact.length > 0 ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
          {highImpact.length > 0 ? <AlertTriangle size={18} className="text-red-400" /> : <Shield size={18} className="text-emerald-400" />}
        </div>
        <div>
          <p className={`text-sm font-black uppercase tracking-widest ${highImpact.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {highImpact.length > 0 ? `${highImpact.length} High-Impact Event${highImpact.length > 1 ? 's' : ''} Ahead` : 'Calendar Is Clear'}
          </p>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{upcoming.length} total events • {countries.length} countries</p>
        </div>
      </div>

      {/* Plain language summary */}
      <p className="text-[13px] text-slate-300 leading-relaxed font-medium">
        {lines.join(' ')}
      </p>

      {/* High-impact list — simple */}
      {highList.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-white/5">
          <p className="text-[9px] font-black text-red-400/80 uppercase tracking-widest">High-Impact Events to Watch</p>
          {highList.map((event, i) => {
            const eDate = new Date(event.event_time || event.date);
            const hrsLeft = Math.max(0, Math.round((eDate - now) / 3600000));
            return (
              <div key={i} className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)] mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-200 truncate">{event.event || event.title}</p>
                    <p className="text-[9px] text-slate-500 font-bold">{event.country} • {eDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} at {eDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase shrink-0 ${hrsLeft <= 4 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                  {hrsLeft === 0 ? 'NOW' : hrsLeft < 24 ? `${hrsLeft}h` : `${Math.round(hrsLeft / 24)}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN OVERVIEW TAB
// ═══════════════════════════════════════════════════════════
export const AIOverviewTab = () => {
  // Try cached data first for instant render
  const cachedPulse = marketPulseEngine.getCachedPulse();
  const [pulse, setPulse] = useState(cachedPulse);
  const [loading, setLoading] = useState(!cachedPulse);
  const [intelligence, setIntelligence] = useState(marketPulseEngine.getRawIntelligence());
  const [events, setEvents] = useState(marketPulseEngine.getRawEvents());

  const fetchPulse = useCallback(async (showLoader = true) => {
    if (showLoader && !pulse) setLoading(true);
    const data = await marketPulseEngine.getPulse();
    setPulse(data);
    setIntelligence(marketPulseEngine.getRawIntelligence());
    setEvents(marketPulseEngine.getRawEvents());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPulse(!cachedPulse);
    const interval = setInterval(() => fetchPulse(false), 60000);
    return () => clearInterval(interval);
  }, [fetchPulse]);

  if (loading || !pulse) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Brain size={48} className="text-journal-gold animate-pulse opacity-50" />
          <p className="text-[10px] text-journal-gold font-black uppercase tracking-[0.2em] animate-pulse">
            Synthesizing Market Intelligence...
          </p>
        </div>
      </div>
    );
  }

  // Sentiment Gauge Color Logic
  const getGaugeColor = (score) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };
  
  const getGaugeShadow = (score) => {
    if (score >= 70) return 'drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]';
    if (score >= 40) return 'drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]';
    return 'drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]';
  };

  const getGaugeBg = (score) => {
    if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score >= 40) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const biasConfig = {
    BULLISH: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
    BEARISH: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
    VOLATILE: { icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' }
  };

  return (
    <Motion.div
      key="ai-overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      {/* ── Section 1: Macro Sentiment + What It Means For You ── */}
      <div className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-6 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-32 bg-journal-gold/5 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">
          {/* Left: Gauge */}
          <div className="flex flex-col items-center text-center">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">Macro Sentiment</p>
            <div className={`relative w-36 h-36 rounded-full border-4 flex items-center justify-center ${getGaugeBg(pulse.sentiment.score)}`}>
              <div className="absolute inset-2 rounded-full border border-dashed border-white/10 animate-[spin_10s_linear_infinite]" />
              <div className="relative z-10 flex flex-col items-center">
                <span className={`text-5xl font-black tabular-nums tracking-tighter ${getGaugeColor(pulse.sentiment.score)} ${getGaugeShadow(pulse.sentiment.score)}`}>
                  {pulse.sentiment.score}
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">/ 100</span>
              </div>
            </div>
            <div className="mt-3">
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border ${getGaugeBg(pulse.sentiment.score)} ${getGaugeColor(pulse.sentiment.score)}`}>
                {pulse.sentiment.label}
              </span>
            </div>
          </div>

          {/* Right: What It Means */}
          <div className="space-y-5">
            {/* Plain language explanation */}
            <div>
              <p className="text-[9px] text-journal-gold font-black uppercase tracking-[0.2em] mb-2">What This Means For Your Trading</p>
              <p className="text-[13px] text-slate-300 leading-relaxed font-medium">
                {pulse.sentiment.score >= 80 
                  ? "Markets are in extreme greed territory. Prices are likely stretched and a pullback can happen anytime. This is NOT the time to chase breakouts. If you're already in profitable positions, consider booking partial profits. New longs carry high risk."
                  : pulse.sentiment.score >= 60 
                  ? "Sentiment is bullish — markets are optimistic. This is a good environment for trend-following strategies. Look for pullbacks to support levels for entries. Avoid shorting unless you have very strong setups."
                  : pulse.sentiment.score >= 45 
                  ? "Markets are in a neutral zone — no strong directional bias. This is a choppy environment. Reduce your position sizes and focus only on A-quality setups. Both longs and shorts can work but neither has a clear edge."
                  : pulse.sentiment.score >= 25
                  ? "Fear is building in the market. Prices may be falling or uncertainty is high. Short setups have better odds. If going long, only at strong demand zones with tight stops. Protect capital first."
                  : "Extreme fear dominates. Markets could be in a panic sell-off OR near a bottom reversal. Do NOT try to catch falling knives. Wait for price stabilization before entering. If you must trade, keep sizes very small."
                }
              </p>
            </div>

            {/* Actionable advice boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5">
                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">✅ Do This</p>
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                  {pulse.sentiment.score >= 70 
                    ? "Book partial profits on existing longs. Tighten stop losses. Look for short setups at resistance."
                    : pulse.sentiment.score >= 45
                    ? "Follow the trend — buy pullbacks to support. Use normal position sizing. Trail your stops."
                    : "Reduce position sizes. Focus on capital preservation. Only take A-quality setups with tight risk."
                  }
                </p>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3.5">
                <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1.5">❌ Avoid This</p>
                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                  {pulse.sentiment.score >= 70
                    ? "Don't chase breakouts at highs. Don't increase lot sizes. Don't ignore stop losses thinking 'it will recover'."
                    : pulse.sentiment.score >= 45
                    ? "Don't fight the trend. Don't over-trade on both sides. Don't ignore the calendar for upcoming events."
                    : "Don't bottom-fish or buy dips blindly. Don't average down on losing positions. Don't trade with emotions."
                  }
                </p>
              </div>
            </div>

            {/* Volatility Risk inline */}
            <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${pulse.risk.level === 'CRITICAL' ? 'bg-red-500/5 border-red-500/20' : pulse.risk.level === 'HIGH' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
              <div className={`p-2 rounded-lg shrink-0 ${pulse.risk.level === 'CRITICAL' ? 'bg-red-500/15 text-red-400' : pulse.risk.level === 'HIGH' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>
                {pulse.risk.level === 'CRITICAL' ? <AlertTriangle size={16} className="animate-pulse" /> : 
                 pulse.risk.level === 'HIGH' ? <Zap size={16} /> : <Shield size={16} />}
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${pulse.risk.level === 'CRITICAL' ? 'text-red-400' : pulse.risk.level === 'HIGH' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {pulse.risk.level} Volatility Risk (24H)
                </p>
                {pulse.risk.drivingFactors.length > 0 ? (
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    {pulse.risk.drivingFactors.join('. ')}. {pulse.risk.level === 'CRITICAL' ? 'Widen your stops or stay flat.' : pulse.risk.level === 'HIGH' ? 'Reduce lot sizes during these windows.' : ''}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 font-medium mt-1">No major catalysts in the next 24 hours. Normal conditions — trade your plan.</p>
                )}
              </div>
            </div>

            <p className="text-[8px] text-slate-600 font-mono tracking-widest uppercase">
              Last Computed: {new Date(pulse.timestamp).toLocaleTimeString()} • Auto-refreshes every 60s
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: News Intelligence Summary ── */}
      <div>
        <SectionHeader icon={Newspaper} title="News Intelligence" subtitle="Top stories shaping market sentiment right now" color="gold" />
        <div className="mt-6">
          <NewsSummary intelligence={intelligence} />
        </div>
      </div>

      {/* ── Section 3: Economic Events Summary ── */}
      <div>
        <SectionHeader icon={CalendarDays} title="Upcoming Events" subtitle="Economic calendar events that may drive volatility" color="gold" />
        <div className="mt-6">
          <EventsSummary events={events} />
        </div>
      </div>

      {/* ── Section 4: AI Trade Bias — Actionable (Moved to Last) ── */}
      {(() => {
        const biasEntries = Object.entries(pulse.bias);
        const allBullish = biasEntries.every(([, d]) => d.state === 'BULLISH');
        const allBearish = biasEntries.every(([, d]) => d.state === 'BEARISH');
        const mixed = !allBullish && !allBearish;
        const safeHavensBullish = pulse.bias.safeHavens?.state === 'BULLISH';
        const equitiesBearish = pulse.bias.equities?.state === 'BEARISH';

        // Generate cross-asset insight
        let crossInsight = '';
        if (safeHavensBullish && equitiesBearish) {
          crossInsight = 'Classic risk-off environment — money is flowing from stocks to gold/USD. This is a defensive market. Prioritize capital preservation and look for short setups on equities.';
        } else if (allBullish) {
          crossInsight = 'All asset classes are bullish — a strong risk-on environment. This is rare and suggests broad market confidence. Trend-following strategies should work well across the board.';
        } else if (allBearish) {
          crossInsight = 'All asset classes are bearish — this signals broad market stress or uncertainty. Stay defensive, reduce size, and wait for clear reversal signals before committing.';
        } else if (mixed) {
          crossInsight = 'Mixed signals across asset classes — some are bullish while others are bearish. This is a selective market. Focus on the asset class with the clearest direction and avoid over-diversifying.';
        }

        const titles = { equities: 'Equities (NIFTY/SPX)', safeHavens: 'Safe Havens (Gold/USD)', crypto: 'Crypto (BTC/ETH)' };
        
        const getActionText = (assetKey, state) => {
          if (state === 'BULLISH') {
            if (assetKey === 'equities') return 'Look for long setups on pullbacks. Trend is your friend. Breakout trades above key resistance levels have higher probability.';
            if (assetKey === 'safeHavens') return 'Gold & USD demand is rising — could signal fear in other markets. Good for hedging. Consider gold longs if equities weaken.';
            return 'Crypto is in risk-on mode. Trade with the trend but keep tight stops — crypto moves fast. Focus on BTC/ETH, avoid altcoins with low liquidity.';
          }
          if (state === 'BEARISH') {
            if (assetKey === 'equities') return 'Avoid catching falling knives on equity indices. Look for short setups at resistance. If your strategy is long-only, reduce size or sit out.';
            if (assetKey === 'safeHavens') return 'Safe havens are weak — market feels confident. Risk appetite is high, which favors equities and crypto over gold.';
            return 'Crypto is selling off. Avoid bottom-fishing. Wait for structure to form before going long. Short setups may work but crypto is unpredictable.';
          }
          if (assetKey === 'equities') return 'No clear direction on equities. Range-bound conditions expected. Scalp both sides with small size, or wait for a breakout.';
          if (assetKey === 'safeHavens') return 'Gold/USD are choppy. No strong trend — avoid large positions. Wait for a decisive move before committing.';
          return 'Crypto is range-bound with conflicting signals. Reduce exposure and wait for clarity. This is not a high-conviction environment.';
        };

        return (
          <div>
            <SectionHeader icon={Target} title="AI Trade Bias" subtitle="What to trade, what to avoid, and why" color="gold" />
            
            {/* Cross-asset insight */}
            <div className="mt-6 mb-4 bg-journal-secondary/40 border border-white/5 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Brain size={18} className="text-journal-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black text-journal-gold uppercase tracking-widest mb-1">Big Picture</p>
                  <p className="text-[13px] text-slate-300 leading-relaxed font-medium">{crossInsight}</p>
                </div>
              </div>
            </div>

            {/* Asset cards with actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {biasEntries.map(([assetKey, data]) => {
                const config = biasConfig[data.state];
                const Icon = config.icon;
                return (
                  <div key={assetKey} className="bg-journal-secondary/40 backdrop-blur-2xl border border-white/5 p-5 rounded-[1.5rem] relative overflow-hidden group hover:bg-white/[0.02] transition-colors flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">{titles[assetKey]}</h4>
                      <div className={`p-2 rounded-xl border ${config.bg} ${config.color} ${config.border}`}><Icon size={14} /></div>
                    </div>
                    
                    <div className="mb-3">
                      <span className={`text-xl font-black uppercase tracking-widest ${config.color}`}>{data.state}</span>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-relaxed mb-3">{data.reason}</p>
                    
                    {/* Actionable advice */}
                    <div className={`mt-auto p-3 rounded-xl border ${config.bg} ${config.border}`}>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${config.color}`}>
                        {data.state === 'BULLISH' ? '📈 Action' : data.state === 'BEARISH' ? '📉 Action' : '⚖️ Action'}
                      </p>
                      <p className="text-[10px] text-slate-300 leading-relaxed font-medium">{getActionText(assetKey, data.state)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </Motion.div>
  );
};
