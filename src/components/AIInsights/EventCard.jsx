import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { AlertTriangle, Globe, Calendar as CalendarIcon, Activity, Flame, Timer } from 'lucide-react';

export const EventCard = ({ event, showCountdown = false }) => {
  const isHighImpact = event.importance_score >= 80;
  const isExtremeImpact = event.importance_score >= 95;
  const eventTime = new Date(event.event_time);
  
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!showCountdown) return;
    
    const calculateTimeLeft = () => {
      const difference = eventTime.getTime() - new Date().getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        if (days > 0) {
           setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else {
           setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      } else {
        setTimeLeft('LIVE / PASSED');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [eventTime, showCountdown]);
  
  const timeFormatted = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = eventTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <Motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`relative overflow-hidden p-5 border backdrop-blur-2xl transition-all group ${
        isExtremeImpact 
          ? 'bg-red-950/40 border-red-500/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)] hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
          : isHighImpact
          ? 'bg-orange-950/40 border-orange-500/50 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)] hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]'
          : 'bg-black/60 border-white/10 hover:border-journal-gold/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]'
      }`}
      style={{
         // Sci-fi cut corner effect
         clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)',
      }}
    >
      {/* Tactical Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

      {/* Cyber Glow Lines */}
      <div className={`absolute top-0 left-0 w-full h-[2px] ${isExtremeImpact ? 'bg-gradient-to-r from-red-500 to-transparent' : isHighImpact ? 'bg-gradient-to-r from-orange-500 to-transparent' : 'bg-gradient-to-r from-journal-gold to-transparent'}`} />
      <div className={`absolute bottom-0 right-0 w-1/2 h-[2px] ${isExtremeImpact ? 'bg-gradient-to-l from-red-500 to-transparent' : isHighImpact ? 'bg-gradient-to-l from-orange-500 to-transparent' : 'bg-gradient-to-l from-journal-gold to-transparent'}`} />

      {/* Background Glow Blob */}
      {(isExtremeImpact || isHighImpact) && (
        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40 ${isExtremeImpact ? 'bg-red-500' : 'bg-orange-500'}`} />
      )}

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {event.country === 'India' ? (
               <span className="text-xl drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" title="India">🇮🇳</span>
            ) : event.country === 'United States' ? (
               <span className="text-xl drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" title="United States">🇺🇸</span>
            ) : (
              <Globe size={16} className="text-slate-400" />
            )}
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 bg-black/60 px-2.5 py-1 rounded-sm border border-white/10 backdrop-blur-md">
              SYS.{event.source.substring(0,3).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 opacity-70">
            <CalendarIcon size={10} className="text-journal-gold" />
            <span className="text-[10px] font-mono font-bold text-white">{dateFormatted}</span>
            <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">{timeFormatted}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {showCountdown && timeLeft && (
            <div className={`flex items-center gap-1.5 text-[11px] font-mono font-black px-3 py-1.5 rounded-sm border backdrop-blur-md shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] ${
              timeLeft === 'LIVE / PASSED' 
                ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                : 'bg-journal-gold/10 text-journal-gold border-journal-gold/30'
            }`}>
              {timeLeft === 'LIVE / PASSED' ? <Activity size={12} className="animate-pulse" /> : <Timer size={12} />}
              {timeLeft}
            </div>
          )}
        </div>
      </div>

      <h3 className={`text-sm font-black tracking-widest uppercase mb-4 relative z-10 leading-snug ${isExtremeImpact ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : isHighImpact ? 'text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'text-white'}`}>
        {event.title}
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
        <div className="bg-black/60 p-3 rounded-sm border border-white/10 relative overflow-hidden group-hover:border-white/20 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-700" />
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 ml-1">Previous Data</div>
          <div className="text-xs font-mono font-bold text-white ml-1">{event.previous || 'N/A'}</div>
        </div>
        <div className="bg-black/60 p-3 rounded-sm border border-journal-gold/20 relative overflow-hidden group-hover:border-journal-gold/40 transition-colors shadow-[inset_0_0_10px_rgba(212,175,55,0.05)]">
          <div className="absolute top-0 left-0 w-1 h-full bg-journal-gold" />
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-journal-gold/70 mb-1 ml-1">Forecast</div>
          <div className="text-xs font-mono font-bold text-journal-gold ml-1 drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">{event.forecast || 'N/A'}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
             <Activity size={10} className={isExtremeImpact ? 'text-red-500 animate-pulse' : 'text-orange-500'} />
             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
               Vol. Profile: <span className={isExtremeImpact ? 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : isHighImpact ? 'text-orange-400' : 'text-white'}>{isExtremeImpact ? 'CRITICAL' : 'ELEVATED'}</span>
             </span>
          </div>
        </div>
        
        {event.affected_markets && event.affected_markets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
             <Flame size={10} className="text-journal-gold/70" />
             {event.affected_markets.map((market, idx) => (
               <React.Fragment key={market}>
                 <span className="text-[9px] font-mono font-bold tracking-widest text-journal-gold bg-journal-gold/10 px-1.5 py-0.5 rounded-sm border border-journal-gold/20">
                   {market}
                 </span>
               </React.Fragment>
             ))}
          </div>
        )}
      </div>

    </Motion.div>
  );
};
