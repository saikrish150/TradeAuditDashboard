import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, IndianRupee, DollarSign, RefreshCw } from 'lucide-react';
import { exchangeRateService } from '../../services/exchangeRateService';

const CurrencyConverter = ({ isOpen, onClose }) => {
  const [usdAmount, setUsdAmount] = useState('');
  const [inrAmount, setInrAmount] = useState('');
  const [rate, setRate] = useState(92.87);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRate();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchRate = async () => {
    setIsLoading(true);
    try {
      const liveRate = await exchangeRateService.getUsdToInrRate();
      setRate(liveRate);
    } catch (error) {
      console.error("Failed to fetch rate:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const usd = parseFloat(usdAmount);
    if (!isNaN(usd)) {
      setInrAmount((usd * rate).toFixed(2));
    } else {
      setInrAmount('');
    }
  }, [usdAmount, rate]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-sm journal-glass rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl shadow-emerald-500/20"
        >
          <div className="p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                </div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white italic">Currency Terminal</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign size={10} className="text-journal-gold" />
                  USD Amount
                </label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="number" 
                    value={usdAmount} 
                    onChange={e => setUsdAmount(e.target.value)}
                    placeholder="Enter USD..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-lg font-black text-white outline-none focus:border-journal-gold/50 transition-all" 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    USD
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="h-px flex-1 bg-white/5" />
                <div className="px-4 text-[10px] font-black text-slate-700 uppercase tracking-widest italic">
                  Converted Rate: {rate.toFixed(2)}
                </div>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <IndianRupee size={10} className="text-emerald-400" />
                  INR Equivalent
                </label>
                <div className="relative">
                  <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-3xl font-black text-emerald-400 tracking-tighter italic">
                    {inrAmount || '0.00'}
                  </div>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600/50 uppercase tracking-widest">
                    INR
                  </div>
                </div>
              </div>

              <button 
                onClick={fetchRate}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                {isLoading ? "Syncing Live Exchange..." : "Update Live Rate"}
              </button>
            </div>

            <p className="text-[7px] text-center font-black text-slate-600 uppercase tracking-widest italic animate-pulse">
               Institutional FX Bridge Active
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CurrencyConverter;
