import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Calendar, BrainCircuit, Sparkles, X, BarChart3, AlertTriangle, TrendingUp, Zap, ShieldAlert, Key, RefreshCcw } from 'lucide-react';
import { geminiService } from '../../services/geminiService';
import { generateDailyBriefing } from '../../services/aiAuditEngine';

const STORAGE_KEY = 'tr_daily_briefing_popup_date';

const DailyBriefingPopup = ({ trades = [], snapshots = [], notes = [], checklistActive = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(geminiService.getApiKey());
  const [briefingMode, setBriefingMode] = useState('neural');
  const [neuralBriefing, setNeuralBriefing] = useState(geminiService.getCachedAnalysis('daily_briefing'));
  const [loading, setLoading] = useState(false);

  // Pure Math briefing
  const mathBriefing = generateDailyBriefing(trades);

  useEffect(() => {
    // If the checklist is still active, wait for it to close
    if (checklistActive) return;

    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(STORAGE_KEY);

    if (lastShown !== today) {
      // Small delay for clean entrance
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [checklistActive]);

  const handleClose = () => {
    const today = new Date().toDateString();
    localStorage.setItem(STORAGE_KEY, today);
    setIsOpen(false);
  };

  const triggerNeuralBriefing = async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const res = await geminiService.dailyBriefing(trades, snapshots, notes, true);
      setNeuralBriefing(res.text);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fetch in the background immediately when MorningChecklist is active or on mount so that data is ready instantly!
  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem(STORAGE_KEY);

    if (apiKey && !neuralBriefing && !loading && lastShown !== today) {
      triggerNeuralBriefing();
    }
  }, [apiKey, neuralBriefing, checklistActive]);

  if (!isOpen) return null;

  // Custom Markdown parser for simple bullets
  const renderMarkdown = (text) => {
    if (!text) return null;
    return (
      <div className="space-y-4 text-[11px] font-medium leading-relaxed text-slate-300">
        {text.split('\n').map((line, i) => {
          if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
            return (
              <p key={i} className="text-white font-black uppercase tracking-wider mt-5 first:mt-0 flex items-center gap-2 border-b border-white/5 pb-1">
                {line.substring(3)}
              </p>
            );
          }
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const cleanText = line.replace(/^[\s-*]+/, '');
            return (
              <div key={i} className="flex gap-2.5 items-start ml-2 pl-1">
                <div className="w-1.5 h-1.5 rounded-full bg-journal-gold mt-1.5 shrink-0" />
                <span>{cleanText}</span>
              </div>
            );
          }
          if (!line.trim()) return null;
          return <p key={i} className="pl-1 text-slate-400 italic">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999]"
          />

          {/* Modal */}
          <Motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-[10000] p-4 pointer-events-none"
          >
            <div className="w-full max-w-lg bg-[#07090e]/95 border border-journal-gold/20 rounded-[2.5rem] shadow-2xl shadow-black overflow-hidden pointer-events-auto">
              
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-20 bg-journal-gold/10 blur-[60px] pointer-events-none" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-journal-gold/15 border border-journal-gold/30">
                      <BrainCircuit size={18} className="text-journal-gold" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white uppercase tracking-widest">Daily Market Briefing</h2>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                        Today's AI Performance Strategy
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleClose}
                    className="p-2 rounded-xl text-slate-600 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="px-6 pt-4">
                <div className="flex bg-[#0b0f19]/80 p-1 rounded-2xl border border-white/5 backdrop-blur-md w-full shadow-inner">
                  <button
                    onClick={() => setBriefingMode('math')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      briefingMode === 'math' 
                        ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-black shadow-lg shadow-journal-gold/20' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 size={11} /> Algorithmic Mode
                  </button>
                  <button
                    onClick={() => setBriefingMode('neural')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      briefingMode === 'neural' 
                        ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-black shadow-lg shadow-journal-gold/20' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BrainCircuit size={11} /> Neural AI Mode
                  </button>
                </div>
              </div>

              {/* Content Panel */}
              <div className="px-6 py-5 max-h-[55vh] overflow-y-auto custom-scrollbar">
                {briefingMode === 'math' ? (
                  mathBriefing.insufficient ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                      <ShieldAlert size={36} className="text-slate-600 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Insufficient Data</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Today's Probability */}
                      {mathBriefing.edge && (
                        <div className="bg-journal-gold/5 border border-journal-gold/15 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-journal-gold/15 flex items-center justify-center text-journal-gold">
                              <TrendingUp size={18} />
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Today's Probability</p>
                              <p className="text-lg font-black text-white">{mathBriefing.edge.winRate}% <span className="text-[10px] font-bold text-slate-400 ml-1">Win Rate</span></p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                            mathBriefing.edge.verdict === 'strong' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                          }`}>
                            {mathBriefing.edge.verdict} Verdict
                          </span>
                        </div>
                      )}

                      {/* Warnings */}
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                          <AlertTriangle size={12} /> Dangers to Avoid
                        </p>
                        {mathBriefing.dangers.slice(0, 2).map((danger, i) => (
                          <div key={i} className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10px] font-bold text-slate-400 italic">
                            {danger}
                          </div>
                        ))}
                      </div>

                      {/* Streak advice */}
                      {mathBriefing.streak && (
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                          <p className="text-[9px] font-black text-white uppercase tracking-widest mb-1">Trading Streak Advice</p>
                          <p className="text-[10px] text-slate-400 font-medium">{mathBriefing.streak.advice}</p>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  // Neural Mode
                  <div className="min-h-[220px] flex flex-col justify-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center space-y-3 py-10">
                        <Motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-journal-gold">
                          <RefreshCcw size={24} />
                        </Motion.div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Running Neural attribution...</p>
                      </div>
                    ) : neuralBriefing ? (
                      <div className="animate-in fade-in duration-300">
                        {renderMarkdown(neuralBriefing)}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                        <div className="w-12 h-12 rounded-full bg-journal-gold/5 border border-journal-gold/10 flex items-center justify-center">
                          <BrainCircuit className="text-journal-gold/30" size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Neural Forecast Offline</p>
                          <p className="text-[9px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                            No cached forecast. Connect Gemini API to generate instant performance psychology strategies.
                          </p>
                        </div>
                        {apiKey && (
                          <button
                            onClick={triggerNeuralBriefing}
                            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-journal-gold to-yellow-600 text-black font-black text-[9px] uppercase tracking-widest animate-pulse"
                          >
                            <Sparkles size={11} /> Generate AI Forecast
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-[#07090e]/95 flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-journal-gold to-yellow-600 text-black font-black text-[10px] uppercase tracking-widest hover:scale-[1.01] transition-all shadow-lg shadow-journal-gold/15"
                >
                  Acquire & Start Session
                </button>
              </div>

            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DailyBriefingPopup;
