import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, TrendingDown, Activity, Clock, Zap, Shield,
  AlertTriangle, Tag, History, GitBranch, Layers } from 'lucide-react';

const URGENCY_STYLES = {
  EXTREME: {
    border: 'border-l-red-500',
    glow: 'shadow-[inset_4px_0_15px_rgba(239,68,68,0.15)]',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    pulse: 'animate-pulse',
    icon: AlertTriangle
  },
  HIGH: {
    border: 'border-l-amber-500',
    glow: 'shadow-[inset_4px_0_15px_rgba(245,158,11,0.1)]',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pulse: '',
    icon: Zap
  },
  MEDIUM: {
    border: 'border-l-blue-500',
    glow: 'shadow-[inset_4px_0_15px_rgba(59,130,246,0.1)]',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pulse: '',
    icon: Shield
  }
};

const CATEGORY_COLORS = {
  MACRO: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  GEOPOLITICAL: 'bg-red-500/20 text-red-300 border-red-500/30',
  BANKING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  CRYPTO: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  INDIA: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
};

const IMPACT_COLORS = {
  Bullish: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: TrendingUp },
  Bearish: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', icon: TrendingDown },
  Volatile: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: Activity }
};

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function IntelligenceCard({ event, index }) {
  const urgencyStyle = URGENCY_STYLES[event.urgency] || URGENCY_STYLES.MEDIUM;
  const UrgencyIcon = urgencyStyle.icon;
  const categoryColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.MACRO;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`
        relative bg-journal-card/50 backdrop-blur-xl
        border border-white/5 border-l-4 ${urgencyStyle.border}
        rounded-2xl overflow-hidden
        ${urgencyStyle.glow}
      `}
    >
      {/* Main Clickable Area */}
      <a
        href={event.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-5 group hover:bg-white/5 transition-all duration-300"
      >
        {/* Top Row: Score + Category + Urgency + Cluster + Time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Impact Score */}
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              font-black text-sm tabular-nums
              ${event.impactScore >= 9 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : event.impactScore >= 7 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }
            `}>
              {event.impactScore}
            </div>

            {/* Category */}
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border ${categoryColor}`}>
              {event.category}
            </span>

            {/* Urgency */}
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border ${urgencyStyle.badge} ${urgencyStyle.pulse} flex items-center gap-1`}>
              <UrgencyIcon size={10} />
              {event.urgency}
            </span>

            {/* Cluster Badge */}
            {event.clusterCount > 1 && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-white/5 text-slate-400 border-white/10 flex items-center gap-1">
                <Layers size={10} />
                {event.clusterCount} sources
              </span>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock size={10} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{formatTimeAgo(event.timestamp)}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-sm leading-snug mb-2 group-hover:text-journal-gold transition-colors line-clamp-2">
          {event.title}
        </h3>

        {/* Summary */}
        {event.summary && (
          <p className="text-slate-400 text-[11px] leading-relaxed mb-3 line-clamp-2">
            {event.summary}
          </p>
        )}

        {/* Matched Keywords */}
        {event.matchedKeywords && event.matchedKeywords.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <Tag size={10} className="text-journal-gold/60 flex-shrink-0" />
            {event.matchedKeywords.map((kw, i) => (
              <span key={i} className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-journal-gold/10 text-journal-gold/80 border border-journal-gold/15">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Affected Markets Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {event.affectedMarkets.slice(0, 5).map(market => {
              const impact = event.marketImpact[market];
              const impactStyle = IMPACT_COLORS[impact] || IMPACT_COLORS.Volatile;
              const ImpactIcon = impactStyle.icon;
              return (
                <span key={market} className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${impactStyle.bg} ${impactStyle.text} ${impactStyle.border}`}>
                  <ImpactIcon size={8} />
                  {market}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-journal-gold transition-colors">
            <span className="text-[9px] font-bold uppercase tracking-wider max-w-[100px] truncate">{event.source}</span>
            <ExternalLink size={10} />
          </div>
        </div>

        {/* Historical Impact — Inline */}
        {event.historicalImpact && (
          <div className="mt-3 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <History size={10} className="text-amber-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">{event.historicalImpact.event}</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">{event.historicalImpact.impact}</p>
          </div>
        )}

        {/* Cross-Market Correlation — Inline, best match only */}
        {event.correlations && event.correlations.length > 0 && (
          <div className="mt-2">
            {event.correlations.slice(0, 1).map((corr, i) => (
              <div key={i} className={`rounded-xl p-2.5 border flex items-start gap-2 ${corr.type === 'bearish' ? 'bg-red-500/5 border-red-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                <GitBranch size={10} className={`flex-shrink-0 mt-0.5 ${corr.type === 'bearish' ? 'text-red-400' : 'text-emerald-400'}`} />
                <div>
                  <span className={`text-[8px] font-black uppercase tracking-wider ${corr.type === 'bearish' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {corr.trigger}:
                  </span>
                  <span className="text-slate-400 text-[9px] font-mono tracking-wide ml-1.5">{corr.flow}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Related Sources */}
        {event.relatedSources && event.relatedSources.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Layers size={9} className="text-slate-600" />
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">Also:</span>
            {event.relatedSources.map((src, i) => (
              <span key={i} className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5">
                {src}
              </span>
            ))}
          </div>
        )}
      </a>
    </motion.div>
  );
}

export default memo(IntelligenceCard);
