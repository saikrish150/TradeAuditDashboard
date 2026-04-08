import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator as CalcIcon, Percent, Target, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const GlobalCalculator = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('math'); // math, risk
  const [mathDisplay, setMathDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [activeOp, setActiveOp] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Risk Calc States
  const [balance, setBalance] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [riskResults, setRiskResults] = useState({ amount: 0, qty: 0 });

  // Math Logic 2.0
  const handleDigit = (digit) => {
    if (waitingForOperand) {
      setMathDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setMathDisplay(prev => prev === '0' ? String(digit) : prev + digit);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setMathDisplay('0.');
      setWaitingForOperand(false);
    } else if (!mathDisplay.includes('.')) {
      setMathDisplay(prev => prev + '.');
    }
  };

  const performCalculation = (nextValue, nextOp) => {
    const inputValue = parseFloat(nextValue);
    
    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (activeOp) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;
      
      if (activeOp === '+') newValue = currentValue + inputValue;
      if (activeOp === '-') newValue = currentValue - inputValue;
      if (activeOp === '*') newValue = currentValue * inputValue;
      if (activeOp === '/') newValue = currentValue / inputValue;
      
      setPrevValue(newValue);
      setMathDisplay(String(Number(newValue.toFixed(8)))); // Precision guard
    }
    
    setWaitingForOperand(true);
    setActiveOp(nextOp);
  };

  const handleOp = (op) => {
    performCalculation(mathDisplay, op);
  };

  const calculateMath = () => {
    if (!activeOp || waitingForOperand) return;
    performCalculation(mathDisplay, null);
    setPrevValue(null);
    setWaitingForOperand(false);
  };

  const clearMath = () => {
    setMathDisplay('0');
    setPrevValue(null);
    setActiveOp(null);
    setWaitingForOperand(false);
  };

  // Keyboard Support
  useEffect(() => {
    if (!isOpen || mode !== 'math') return;

    const handleKeyDown = (e) => {
      const key = e.key;
      if (/[0-9]/.test(key)) {
        handleDigit(key);
      } else if (key === '.') {
        handleDecimal();
      } else if (['+', '-', '*', '/'].includes(key)) {
        handleOp(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateMath();
      } else if (key === 'Escape') {
        onClose();
      } else if (key === 'Backspace') {
        setMathDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      } else if (key.toLowerCase() === 'c') {
        clearMath();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, mathDisplay, activeOp, prevValue, waitingForOperand]);

  // Risk Logic
  useEffect(() => {
    const b = parseFloat(balance) || 0;
    const r = parseFloat(riskPct) || 0;
    const e = parseFloat(entry) || 0;
    const sl = parseFloat(stopLoss) || 0;

    const riskAmount = b * (r / 100);
    const slDistance = Math.abs(e - sl);
    const qty = slDistance > 0 ? (riskAmount / slDistance) : 0;

    setRiskResults({ amount: riskAmount, qty: qty });
  }, [balance, riskPct, entry, stopLoss]);

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
          className="relative w-full max-w-sm journal-glass rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl shadow-indigo-500/20"
        >
          {/* Header & Tabs */}
          <div className="p-6 pb-0 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalcIcon size={18} className="text-journal-gold" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white italic">Universal Terminal</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex p-1 rounded-2xl bg-slate-950/50 border border-white/5">
              <button 
                onClick={() => setMode('math')}
                className={`flex-1 py-2 rounded-[1.1rem] text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'math' ? 'bg-journal-gold text-journal-bg' : 'text-slate-500 hover:text-white'}`}
              >
                Standard
              </button>
              <button 
                onClick={() => setMode('risk')}
                className={`flex-1 py-2 rounded-[1.1rem] text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'risk' ? 'bg-journal-gold text-journal-bg' : 'text-slate-500 hover:text-white'}`}
              >
                Risk Engine
              </button>
            </div>
          </div>

          <div className="p-6">
            {mode === 'math' ? (
              <div className="space-y-4">
                <div className="p-6 rounded-[1.5rem] bg-black/40 border border-white/5 text-right relative">
                  <div className="absolute top-2 left-4 text-[10px] font-black text-journal-gold uppercase tracking-widest italic opacity-50">
                    {activeOp ? `Operation: ${activeOp}` : 'Ready'}
                  </div>
                  <p className="text-3xl font-black text-white italic tracking-tighter truncate">{mathDisplay}</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['7', '8', '9', '/'].map(btn => (
                    <button key={btn} onClick={() => isNaN(btn) ? handleOp(btn) : handleDigit(btn)} className="h-12 rounded-xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-all">{btn}</button>
                  ))}
                  {['4', '5', '6', '*'].map(btn => (
                    <button key={btn} onClick={() => isNaN(btn) ? handleOp(btn) : handleDigit(btn)} className="h-12 rounded-xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-all">{btn}</button>
                  ))}
                  {['1', '2', '3', '-'].map(btn => (
                    <button key={btn} onClick={() => isNaN(btn) ? handleOp(btn) : handleDigit(btn)} className="h-12 rounded-xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-all">{btn}</button>
                  ))}
                  {['C', '0', '.', '+'].map(btn => (
                    <button 
                      key={btn} 
                      onClick={() => {
                        if (btn === 'C') clearMath();
                        else if (btn === '.') handleDecimal();
                        else if (isNaN(btn)) handleOp(btn);
                        else handleDigit(btn);
                      }} 
                      className="h-12 rounded-xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-all"
                    >
                      {btn}
                    </button>
                  ))}
                  <button 
                    onClick={calculateMath}
                    className="col-span-4 h-12 rounded-xl bg-journal-gold text-journal-bg font-black uppercase tracking-[0.2em] italic shadow-lg shadow-journal-gold/20 active:scale-95 transition-all mt-1"
                  >
                    Solve Entry
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <DollarSign size={10} className="text-journal-gold" />
                          Balance
                       </label>
                       <input 
                         type="number" 
                         value={balance} 
                         onChange={e => setBalance(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Percent size={10} className="text-journal-gold" />
                          Risk %
                       </label>
                       <input 
                         type="number" 
                         value={riskPct} 
                         onChange={e => setRiskPct(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50" 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <TrendingUp size={10} className="text-emerald-400" />
                          Entry
                       </label>
                       <input 
                         type="number" 
                         value={entry} 
                         onChange={e => setEntry(e.target.value)}
                         placeholder="1.2400"
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Target size={10} className="text-rose-500" />
                          Stop Loss
                       </label>
                       <input 
                         type="number" 
                         value={stopLoss} 
                         onChange={e => setStopLoss(e.target.value)}
                         placeholder="1.2380"
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50" 
                       />
                    </div>
                 </div>

                 <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mt-4">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Total Risk</span>
                       <span className="text-sm font-black text-white italic">{riskResults.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl">
                       <span className="text-[9px] font-black text-journal-gold uppercase tracking-[0.2em]">Position Size</span>
                       <span className="text-lg font-black text-white italic tracking-tighter">
                          {riskResults.qty > 1000 ? (riskResults.qty / 1000).toFixed(2) + 'k' : riskResults.qty.toFixed(2)}
                       </span>
                    </div>
                 </div>
              </div>
            )}
            <p className="mt-6 text-[7px] text-center font-black text-slate-600 uppercase tracking-widest italic animate-pulse">
               Terminal Calculation Engine active
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GlobalCalculator;
