import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, X } from 'lucide-react';

const TerminalClockPicker = ({ value, onChange, onClose }) => {
  // Parse initial value (expected HH:mm)
  const [hour, setHour] = useState(parseInt(value?.split(':')[0]) || 0);
  const [minute, setMinute] = useState(parseInt(value?.split(':')[1]) || 0);
  const [mode, setMode] = useState('hours'); // 'hours' or 'minutes'
  const dialRef = useRef(null);

  const calculateAngle = (e) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - centerX;
    const y = clientY - centerY;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    const radius = Math.sqrt(x*x + y*y);
    return { angle, radius };
  };

  const handleInteraction = (e) => {
    const { angle, radius } = calculateAngle(e) || {};
    if (angle === undefined) return;

    if (mode === 'hours') {
      let h = Math.round(angle / 30);
      if (h === 0) h = 12;
      
      // Determine if clicking inner or outer ring
      // Dial is 64x64 scale (approx 128px radius in logic)
      if (radius < 70) { // Inner Ring (13-00)
        h = h + 12;
        if (h === 24) h = 0;
      } else { // Outer Ring (1-12)
        if (h === 12) h = 12;
      }
      setHour(h);
    } else {
      let m = Math.round(angle / 6);
      if (m === 60) m = 0;
      setMinute(m);
    }
  };

  const saveTime = () => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMin = minute.toString().padStart(2, '0');
    onChange(`${formattedHour}:${formattedMin}`);
    onClose();
  };

  // Hand visual logic
  const isInner = mode === 'hours' && (hour === 0 || hour > 12);
  const hourAngle = (hour % 12) * 30;
  const minuteAngle = minute * 6;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-journal-bg/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-[320px] journal-glass rounded-[2.5rem] border border-journal-gold/20 shadow-2xl p-6 flex flex-col items-center gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-950/50 px-8 py-5 rounded-3xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMode('hours')}
              className={`text-5xl font-black transition-all ${mode === 'hours' ? 'text-journal-gold glow-gold' : 'text-slate-400'}`}
            >
              {hour.toString().padStart(2, '0')}
            </button>
            <span className="text-4xl font-black text-slate-800">:</span>
            <button 
              onClick={() => setMode('minutes')}
              className={`text-5xl font-black transition-all ${mode === 'minutes' ? 'text-journal-gold glow-gold' : 'text-slate-600'}`}
            >
              {minute.toString().padStart(2, '0')}
            </button>
          </div>
        </div>

        {/* The Dial */}
        <div 
          ref={dialRef}
          onMouseMove={(e) => e.buttons === 1 && handleInteraction(e)}
          onMouseDown={handleInteraction}
          onTouchMove={handleInteraction}
          className="relative w-64 h-64 rounded-full bg-slate-950/40 border border-white/5 shadow-2xl flex items-center justify-center cursor-crosshair touch-none select-none"
        >
          {/* Numbers Grid */}
          {[...Array(12)].map((_, i) => {
            const h = i + 1;
            const innerH = (h + 12) % 24;
            const angle = h * 30;
            
            // Outer Ring
            const ox = 50 + 40 * Math.sin(angle * Math.PI / 180);
            const oy = 50 - 40 * Math.cos(angle * Math.PI / 180);
            
            // Inner Ring
            const ix = 50 + 25 * Math.sin(angle * Math.PI / 180);
            const iy = 50 - 25 * Math.cos(angle * Math.PI / 180);

            const isOuterSelected = mode === 'hours' && hour === h;
            const isInnerSelected = mode === 'hours' && hour === innerH;
            const isMinSelected = mode === 'minutes' && (minute === h * 5 || (minute === 0 && h === 12));

            return (
              <React.Fragment key={i}>
                {/* Outer Numbers (1-12 or 0-59) */}
                <div 
                  className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 font-black ${isOuterSelected || isMinSelected ? 'text-journal-gold text-[12px] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'text-slate-400 hover:text-white text-[10px]'}`}
                  style={{ left: `${ox}%`, top: `${oy}%` }}
                >
                  {mode === 'hours' ? h : (h * 5 % 60).toString().padStart(2, '0')}
                </div>

                {/* Inner Numbers (13-00) - Only in hour mode */}
                {mode === 'hours' && (
                  <div 
                    className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 font-black ${isInnerSelected ? 'text-journal-gold text-[11px] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'text-slate-500 text-[9px]'}`}
                    style={{ left: `${ix}%`, top: `${iy}%` }}
                  >
                    {innerH.toString().padStart(2, '0')}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Clock Hand */}
          <motion.div 
            animate={{ 
              rotate: mode === 'hours' ? hourAngle : minuteAngle,
              height: isInner ? '25%' : '40%'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-1/2 left-1/2 w-1 bg-journal-gold origin-bottom rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)]"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 border-journal-gold bg-journal-gold/20 backdrop-blur-md shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center justify-center">
               <div className="w-1.5 h-1.5 rounded-full bg-journal-gold" />
            </div>
          </motion.div>

          {/* Center Dot */}
          <div className="w-3 h-3 rounded-full bg-journal-gold shadow-[0_0_10px_rgba(212,175,55,0.5)] z-10" />
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 w-full">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-slate-900 border border-white/5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={saveTime}
            className="flex-1 py-4 rounded-2xl bg-journal-gold text-journal-bg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-journal-gold/20 hover:scale-[1.05] transition-all"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TerminalClockPicker;
