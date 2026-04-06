import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Lock, ArrowRight, Shield as ShieldIcon } from 'lucide-react';

const AccessShield = ({ children }) => {
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Default PIN from environment variables
  const CORRECT_PIN = import.meta.env.VITE_TERMINAL_PIN || '1234';

  useEffect(() => {
    const authStatus = localStorage.getItem('terminal_authorized');
    if (authStatus === 'true') {
      setIsAuthorized(true);
    }
    setIsLoading(false);
  }, []);

  const handleAccess = (e) => {
    if (e) e.preventDefault();
    
    if (pin === CORRECT_PIN) {
      setIsAuthorized(true);
      localStorage.setItem('terminal_authorized', 'true');
      setError(false);
    } else {
      setError(true);
      setPin('');
      // Vibrate if on mobile
      if (window.navigator.vibrate) window.navigator.vibrate(200);
      setTimeout(() => setError(false), 800);
    }
  };

  if (isLoading) return null;

  if (isAuthorized) return children;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020617] flex items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[150px]"
        />
        <Motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[150px]"
        />
      </div>

      <Motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="modern-glass p-8 md:p-12 rounded-[32px] border border-white/10 shadow-2xl shadow-indigo-500/10 text-center">
          <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20">
             <Motion.div
               animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
               transition={{ duration: 0.4 }}
             >
               {error ? (
                 <ShieldAlert className="text-rose-500" size={40} />
               ) : (
                 <Lock className="text-indigo-400" size={32} />
               )}
             </Motion.div>
          </div>

          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none mb-2">
            Trade<span className="text-indigo-500">Audit</span> Shield
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-10">Institutional Access Control</p>

          <form onSubmit={handleAccess} className="space-y-6">
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="ENTER TERMINAL PIN"
                className={`w-full bg-slate-950/50 border ${error ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 'border-slate-800 focus:border-indigo-500/50'} rounded-2xl py-4 px-6 text-center text-xl font-mono font-black tracking-[0.5em] text-white outline-none transition-all placeholder:text-slate-700 placeholder:text-xs placeholder:font-black placeholder:tracking-[0.2em]`}
                autoFocus
                maxLength={8}
              />
              
              <AnimatePresence>
                {pin.length > 0 && (
                  <Motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-90"
                  >
                    <ArrowRight size={20} />
                  </Motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-slate-700" /> Secure Encryption Active
              </div>
              <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed px-4">
                This is a private institutional terminal. Unauthorized access to historical data 
                is strictly prohibited and monitored.
              </p>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-800/50">
               <ShieldIcon size={12} className="text-indigo-400" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Node: {window.location.hostname}</span>
            </div>
        </div>
      </Motion.div>
    </div>
  );
};

export default AccessShield;
