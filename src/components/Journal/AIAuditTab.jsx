import React, { useState, useEffect, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, Sparkles, AlertTriangle, Play, ChevronRight, 
  RefreshCcw, Key, X, Info, TrendingUp, ShieldAlert,
  Zap, ArrowRight, BarChart3, ListChecks, Calendar, Lock
} from 'lucide-react';
import { generateDailyBriefing, detectAnomalies, runWhatIf, getScenarios } from '../../services/aiAuditEngine';
import { geminiService } from '../../services/geminiService';
import { DB_FIELDS } from '../../constants/fieldMappings';

const Card = ({ children, className = "", title, icon: Icon, sub }) => (
  <div className={`modern-glass border border-white/10 rounded-[2rem] overflow-hidden flex flex-col ${className}`}>
    {title && (
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-xl bg-journal-gold/10 border border-journal-gold/20 text-journal-gold">
              <Icon size={18} />
            </div>
          )}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">{title}</h3>
            {sub && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{sub}</p>}
          </div>
        </div>
      </div>
    )}
    <div className="flex-1 p-6">
      {children}
    </div>
  </div>
);

const AIAuditTab = ({ trades = [], snapshots = [], notes = [] }) => {
  const [apiKey, setApiKey] = useState(geminiService.getApiKey());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [loading, setLoading] = useState({});
  const [analysisResults, setAnalysisResults] = useState({
    deep: geminiService.getCachedAnalysis('deep'),
    strategy: geminiService.getCachedAnalysis('strategy'),
    monthly: geminiService.getCachedAnalysis('monthly')
  });
  const [selectedScenario, setSelectedScenario] = useState('skip_c_quality');

  // New Mode States for Interactive Toggling
  const [briefingMode, setBriefingMode] = useState('math'); // 'math' | 'neural'
  const [anomalyMode, setAnomalyMode] = useState('math'); // 'math' | 'neural'

  // Neural Briefing & Anomaly Scan Data States
  const [neuralBriefing, setNeuralBriefing] = useState(geminiService.getCachedAnalysis('daily_briefing'));
  const [neuralAnomaly, setNeuralAnomaly] = useState(geminiService.getCachedAnalysis('anomaly_scan'));
  const [loadingNeuralBriefing, setLoadingNeuralBriefing] = useState(false);
  const [loadingNeuralAnomaly, setLoadingNeuralAnomaly] = useState(false);

  // Clear any legacy/truncated cache items on load to force a clean full fetch
  useEffect(() => {
    // Clear dynamic month key if truncated
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const possibleKeys = [
      'tr_gemini_cache_monthly_report',
      `tr_gemini_cache_monthly_${monthStart.getFullYear()}_${monthStart.getMonth()}`,
      `tr_gemini_cache_monthly_${monthStart.getFullYear()}_${monthStart.getMonth()}_trailing`
    ];

    possibleKeys.forEach(k => {
      const cacheVal = localStorage.getItem(k);
      if (cacheVal) {
        try {
          const parsed = JSON.parse(cacheVal);
          // If the cached content is less than 300 characters, it is truncated! Clear it!
          if (parsed?.data && parsed.data.length < 300) {
            localStorage.removeItem(k);
            setAnalysisResults(prev => ({ ...prev, monthly: null }));
          }
        } catch (e) {}
      }
    });
  }, []);

  // Pure Math calculations
  const briefing = useMemo(() => generateDailyBriefing(trades), [trades]);
  const anomalies = useMemo(() => detectAnomalies(trades), [trades]);
  const whatIf = useMemo(() => runWhatIf(trades, selectedScenario), [trades, selectedScenario]);
  const scenarios = getScenarios();

  const handleSaveKey = () => {
    geminiService.setApiKey(tempKey);
    setApiKey(tempKey);
    setShowKeyModal(false);
    setTempKey('');
  };

  const triggerNeuralBriefing = async (force = true) => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }
    setLoadingNeuralBriefing(true);
    try {
      const res = await geminiService.dailyBriefing(trades, snapshots, notes, force);
      setNeuralBriefing(res.text);
    } catch (e) {
      console.error("Neural briefing error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoadingNeuralBriefing(false);
    }
  };

  const triggerNeuralAnomaly = async (force = true) => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }
    setLoadingNeuralAnomaly(true);
    try {
      const res = await geminiService.anomalyScan(trades, snapshots, notes, force);
      setNeuralAnomaly(res.text);
    } catch (e) {
      console.error("Neural anomaly error:", e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoadingNeuralAnomaly(false);
    }
  };

  const runLLMTask = async (taskType) => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    setLoading(prev => ({ ...prev, [taskType]: true }));
    try {
      let result;
      if (taskType === 'deep') result = await geminiService.deepAnalysis(trades, true);
      if (taskType === 'strategy') result = await geminiService.buildStrategy(trades, true);
      if (taskType === 'monthly') result = await geminiService.monthlyReport(trades, true);

      setAnalysisResults(prev => ({ ...prev, [taskType]: result.text }));
    } catch (error) {
      console.error(`Gemini Error (${taskType}):`, error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [taskType]: false }));
    }
  };

  const runCompleteNeuralAudit = async () => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }
    
    // Set all loaders active concurrently
    setLoading({ deep: true, strategy: true, monthly: true });
    setLoadingNeuralBriefing(true);
    setLoadingNeuralAnomaly(true);
    
    try {
      // Trigger all five concurrently in parallel
      await Promise.all([
        (async () => {
          try {
            const res = await geminiService.deepAnalysis(trades, true);
            setAnalysisResults(prev => ({ ...prev, deep: res.text }));
          } catch (e) {
            console.error('Deep Analysis failed:', e);
          } finally {
            setLoading(prev => ({ ...prev, deep: false }));
          }
        })(),
        (async () => {
          try {
            const res = await geminiService.buildStrategy(trades, true);
            setAnalysisResults(prev => ({ ...prev, strategy: res.text }));
          } catch (e) {
            console.error('Strategy Architect failed:', e);
          } finally {
            setLoading(prev => ({ ...prev, strategy: false }));
          }
        })(),
        (async () => {
          try {
            const res = await geminiService.monthlyReport(trades, true);
            setAnalysisResults(prev => ({ ...prev, monthly: res.text }));
          } catch (e) {
            console.error('Monthly Audit failed:', e);
          } finally {
            setLoading(prev => ({ ...prev, monthly: false }));
          }
        })(),
        (async () => {
          try {
            const res = await geminiService.dailyBriefing(trades, snapshots, notes, true);
            setNeuralBriefing(res.text);
          } catch (e) {
            console.error('Neural Briefing failed:', e);
          } finally {
            setLoadingNeuralBriefing(false);
          }
        })(),
        (async () => {
          try {
            const res = await geminiService.anomalyScan(trades, snapshots, notes, true);
            setNeuralAnomaly(res.text);
          } catch (e) {
            console.error('Neural Anomaly failed:', e);
          } finally {
            setLoadingNeuralAnomaly(false);
          }
        })()
      ]);
    } catch (error) {
      console.error('Complete Neural Audit failed:', error);
    }
  };

  const splitMonthlyReport = (text) => {
    if (!text) return { col1: '', col2: '' };
    
    // Look for unique Section 3 key phrases
    const splitKeyphrases = ['Execution Loop', 'Revenge-Trading', 'Execution & Revenge'];
    let splitIdx = -1;
    
    for (const phrase of splitKeyphrases) {
      const idx = text.indexOf(phrase);
      if (idx !== -1) {
        splitIdx = idx;
        break;
      }
    }
    
    if (splitIdx !== -1) {
      // Backtrack to the start of the line or paragraph to keep the header whole
      const lastNewline = text.lastIndexOf('\n', splitIdx);
      const splitPoint = lastNewline !== -1 ? lastNewline : splitIdx;
      
      return {
        col1: text.substring(0, splitPoint).trim(),
        col2: text.substring(splitPoint).trim()
      };
    }
    
    // Fallback: split by line count if markers are not found
    const lines = text.split('\n');
    const mid = Math.ceil(lines.length / 2);
    return {
      col1: lines.slice(0, mid).join('\n'),
      col2: lines.slice(mid).join('\n')
    };
  };

  const MarkdownText = ({ text }) => {
    if (!text) return null;
    return (
      <div className="space-y-4 text-slate-300 text-xs leading-relaxed font-medium whitespace-pre-wrap">
        {text.split('\n').map((line, i) => {
          if (line.startsWith('**') || line.startsWith('##')) {
            return <p key={i} className="text-white font-black uppercase tracking-wider mt-4 first:mt-0">{line.replace(/\*\*|##/g, '')}</p>;
          }
          if (line.startsWith('- ')) {
            return <div key={i} className="flex gap-2 items-start ml-2"><div className="w-1 h-1 rounded-full bg-journal-gold mt-1.5 shrink-0" /><span>{line.substring(2)}</span></div>;
          }
          return <p key={i}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-20">
      
      {/* ─── HEADER & API STATUS ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white flex items-center gap-3">
            <BrainCircuit className="text-journal-gold" size={28} />
            AI Audit <span className="text-journal-gold/50 not-italic text-sm ml-2 font-mono">v1.0.institutional</span>
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Algorithmic Math + Gemini Neural Intelligence</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-stretch md:self-auto w-full md:w-auto">
          {apiKey && (
            <button
              onClick={runCompleteNeuralAudit}
              disabled={loading.deep || loading.strategy || loading.monthly}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl bg-gradient-to-r from-journal-gold to-yellow-600 text-[#050505] font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles size={13} className={loading.deep || loading.strategy || loading.monthly ? "animate-spin shrink-0" : "shrink-0"} />
              {loading.deep || loading.strategy || loading.monthly ? 'Auditing All Systems...' : 'Trigger Complete Neural Audit'}
            </button>
          )}

          <button 
            onClick={() => setShowKeyModal(true)}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl border transition-all whitespace-nowrap ${
              apiKey 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                : 'bg-journal-gold/10 border border-journal-gold/30 text-journal-gold hover:bg-journal-gold/20 shadow-[0_0_20px_rgba(212,175,55,0.1)]'
            }`}
          >
            {apiKey ? <ShieldAlert size={13} className="shrink-0" /> : <Key size={13} className="shrink-0" />}
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
              {apiKey ? 'Neural Engine Active' : 'Connect Gemini API'}
            </span>
          </button>
        </div>
      </div>

      {/* ─── TOP ROW: DAILY BRIEFING & ANOMALIES ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Daily Market Briefing */}
        <Card title="Daily Market Briefing" icon={Calendar} sub="Historical Performance Alignment">
          {/* Segmented Mode Control Switcher */}
          <div className="flex bg-[#0b0f19]/80 p-1 rounded-2xl border border-white/5 backdrop-blur-md mb-6 w-full shadow-inner">
            <button
              onClick={() => setBriefingMode('math')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                briefingMode === 'math' 
                  ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-black shadow-lg shadow-journal-gold/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 size={11} /> Algorithmic Mode
            </button>
            <button
              onClick={() => setBriefingMode('neural')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                briefingMode === 'neural' 
                  ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-black shadow-lg shadow-journal-gold/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BrainCircuit size={11} /> Neural AI Mode
            </button>
          </div>

          {briefingMode === 'math' ? (
            briefing.insufficient ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Info className="text-slate-600 mb-4" size={32} />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                  Insufficient Data<br />Trade at least 5 times to unlock briefing.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Today's Edge */}
                {briefing.edge && (
                  <div className="bg-journal-gold/10 border border-journal-gold/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-journal-gold/20 flex items-center justify-center text-journal-gold">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Today's Probability ({briefing.edge.dayName})</p>
                        <p className="text-xl font-black text-white">{briefing.edge.winRate}% <span className="text-xs font-bold text-slate-400 not-italic ml-1">Win Rate</span></p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      briefing.edge.verdict === 'strong' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 
                      briefing.edge.verdict === 'weak' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 
                      'bg-slate-500/20 border-slate-500/30 text-slate-400'
                    }`}>
                      {briefing.edge.verdict} Verdict
                    </div>
                  </div>
                )}

                {/* Warnings/Dangers */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} /> Cognitive Dangers Today
                  </p>
                  {briefing.dangers.map((danger, i) => (
                    <div key={i} className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[11px] font-medium text-slate-300 leading-relaxed italic">
                      {danger}
                    </div>
                  ))}
                </div>

                {/* Streak Advice */}
                {briefing.streak && (
                  <div className={`p-4 rounded-2xl border ${briefing.streak.type === 'win' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Zap size={16} className={briefing.streak.type === 'win' ? 'text-emerald-400' : 'text-amber-400'} />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">{briefing.streak.count}-Trade {briefing.streak.type.toUpperCase()} Streak</p>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{briefing.streak.advice}</p>
                  </div>
                )}

                {/* Psychological Forecast */}
                <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl">
                  <p className="text-[10px] font-black text-journal-gold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                     <Sparkles size={12} /> Neural Forecast
                  </p>
                  <p className="text-[11px] text-slate-300 italic">"{briefing.forecast}"</p>
                </div>
              </div>
            )
          ) : (
            // Neural AI Mode for Daily Briefing
            <div className="flex flex-col h-full min-h-[300px]">
              {loadingNeuralBriefing ? (
                <div className="h-full flex-1 flex flex-col items-center justify-center space-y-4 py-16">
                  <Motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-journal-gold"><RefreshCcw size={28} /></Motion.div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Running Neural Attribution...</p>
                </div>
              ) : neuralBriefing ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto max-h-[360px] pr-2 no-scrollbar">
                  <MarkdownText text={neuralBriefing} />
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                    <button 
                      onClick={() => triggerNeuralBriefing(true)} 
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all"
                    >
                      <RefreshCcw size={12} /> Re-Generate AI Briefing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex-1 flex flex-col items-center justify-center py-12 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-journal-gold/5 border border-journal-gold/10 flex items-center justify-center">
                    <BrainCircuit className="text-journal-gold/40" size={32} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Neural Briefing Ready</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Gemini will analyze your recent trade log, journal notes, and habit compliance snapshots to produce an elite-level Daily Briefing.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerNeuralBriefing(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-journal-gold to-yellow-600 text-black font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all"
                  >
                    <Sparkles size={12} />
                    Generate AI Briefing
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 2. Anomaly Detector */}
        <Card title="Pattern Anomaly Detector" icon={AlertTriangle} sub="Behavioral Deviation Alerts">
          {/* Segmented Mode Control Switcher */}
          <div className="flex bg-[#0b0f19]/80 p-1 rounded-2xl border border-white/5 backdrop-blur-md mb-6 w-full shadow-inner">
            <button
              onClick={() => setAnomalyMode('math')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                anomalyMode === 'math' 
                  ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-black shadow-lg shadow-journal-gold/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 size={11} /> Standard Alerts
            </button>
            <button
              onClick={() => setAnomalyMode('neural')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                anomalyMode === 'neural' 
                  ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-black shadow-lg shadow-journal-gold/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BrainCircuit size={11} /> Neural AI Scan
            </button>
          </div>

          {anomalyMode === 'math' ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
              {anomalies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <ShieldAlert size={40} className="text-emerald-500 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">System Stable — No Anomalies</p>
                </div>
              ) : (
                anomalies.map((anom, i) => (
                  <Motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className={`p-4 rounded-2xl border flex items-start gap-4 ${
                      anom.severity === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30' : 
                      anom.severity === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30' : 
                      'bg-slate-500/5 border-slate-500/20'
                    }`}
                  >
                    <div className={`mt-1 p-1.5 rounded-lg border ${
                      anom.severity === 'CRITICAL' ? 'border-rose-500/40 text-rose-500' : 
                      anom.severity === 'WARNING' ? 'border-amber-500/40 text-amber-500' : 
                      'border-slate-500/40 text-slate-500'
                    }`}>
                      <AlertTriangle size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${
                          anom.severity === 'CRITICAL' ? 'text-rose-400' : 
                          anom.severity === 'WARNING' ? 'text-amber-400' : 
                          'text-slate-400'
                        }`}>{anom.type.replace('_', ' ')}</p>
                        <span className="text-[8px] font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/10 uppercase">{anom.severity}</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-200 leading-tight mb-2">{anom.message}</p>
                      <p className="text-[9px] font-mono text-slate-500 font-bold">DATA POINT: {anom.stat}</p>
                    </div>
                  </Motion.div>
                ))
              )}
            </div>
          ) : (
            // Neural AI Mode for Pattern Anomalies
            <div className="flex flex-col h-full min-h-[300px]">
              {loadingNeuralAnomaly ? (
                <div className="h-full flex-1 flex flex-col items-center justify-center space-y-4 py-16">
                  <Motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-journal-gold"><RefreshCcw size={28} /></Motion.div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Running Neural Risk Attribution...</p>
                </div>
              ) : neuralAnomaly ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto max-h-[360px] pr-2 no-scrollbar">
                  <MarkdownText text={neuralAnomaly} />
                  <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                    <button 
                      onClick={() => triggerNeuralAnomaly(true)} 
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-all"
                    >
                      <RefreshCcw size={12} /> Re-Run Neural Scan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex-1 flex flex-col items-center justify-center py-12 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-journal-gold/5 border border-journal-gold/10 flex items-center justify-center">
                    <AlertTriangle className="text-journal-gold/40" size={32} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Neural Scan Ready</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Gemini will run a deep audit on all raw trades, snapshots, and psychology note logs to detect structural discipline breakdowns, sizing anomalies, or focus leakages.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerNeuralAnomaly(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-journal-gold to-yellow-600 text-black font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all"
                  >
                    <Sparkles size={12} />
                    Run Neural Anomaly Scan
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ─── SECOND ROW: MONTHLY REPORT (Swapped to be above What-If Engine) ─── */}
      <Card title="Monthly AI Growth & Performance Audit" icon={Calendar} sub="Institutional Growth Audit">
        <div className="flex flex-col h-full min-h-[400px]">
          <div className="flex-1">
            {loading.monthly ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                <Motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-journal-gold"><RefreshCcw size={32} /></Motion.div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Aggregating monthly performance metrics...</p>
              </div>
            ) : analysisResults.monthly ? (() => {
              const { col1, col2 } = splitMonthlyReport(analysisResults.monthly);
              return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <MarkdownText text={col1} />
                  </div>
                  <div className="space-y-6">
                    <MarkdownText text={col2} />
                  </div>
                </div>
              );
            })() : (
              <div className="h-full flex flex-col items-center justify-center py-24 text-center space-y-6">
                <div className="w-24 h-24 rounded-3xl bg-journal-gold/5 border border-journal-gold/10 flex items-center justify-center rotate-3">
                  <BarChart3 className="text-journal-gold/40" size={48} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-white tracking-[0.3em] mb-2">Monthly Audit Portal</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    A comprehensive AI-generated performance audit of your trading growth, edges, capital leaks, and emotional habits over the current month.
                  </p>
                </div>
                <button
                  onClick={() => runLLMTask('monthly')}
                  disabled={loading.monthly}
                  className="px-10 py-4 bg-journal-gold/10 border border-journal-gold/30 text-journal-gold rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-journal-gold/20 transition-all flex items-center gap-3"
                >
                  <Calendar size={18} /> Generate Monthly Audit
                </button>
              </div>
            )}
          </div>
          {analysisResults.monthly && (
            <div className="pt-10 flex justify-center">
               <button onClick={() => runLLMTask('monthly')} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all"><RefreshCcw size={14} /> Refresh Audit</button>
            </div>
          )}
        </div>
      </Card>

      {/* ─── THIRD ROW: WHAT-IF ENGINE ─── */}
      <Card title="'What-If' Scenario Engine" icon={BarChart3} sub="Mathematical Simulation of Process Change">
        <div className="space-y-5">
          {/* Compact Horizontal Selectors */}
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
            {scenarios.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                  selectedScenario === s.id 
                    ? 'bg-journal-gold/20 border-journal-gold/50 text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Compact Results Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {whatIf && (
              <>
                <div className="bg-slate-950/40 rounded-2xl border border-white/5 p-5 flex flex-col justify-center text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Net P&L</p>
                  <p className="text-2xl font-black text-white italic">₹{whatIf.originalNet.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-2">{whatIf.originalCount} Trades</p>
                </div>

                <div className="bg-journal-gold/5 rounded-2xl border border-journal-gold/20 p-5 flex flex-col justify-center text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-journal-gold/10 to-transparent pointer-events-none" />
                  <p className="text-[9px] font-black text-journal-gold uppercase tracking-widest mb-1">Projected Net P&L</p>
                  <p className="text-2xl font-black text-journal-gold italic">₹{whatIf.whatIfNet.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-2">{whatIf.filteredCount} Trades Remaining</p>
                </div>

                <div className={`rounded-2xl border p-5 flex flex-col justify-center text-center ${whatIf.delta >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Profit Improvement</p>
                  <div className="flex items-center justify-center gap-1.5">
                    {whatIf.delta >= 0 ? <TrendingUp size={16} className="text-emerald-400" /> : <ShieldAlert size={16} className="text-rose-400" />}
                    <p className={`text-2xl font-black italic ${whatIf.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {whatIf.delta >= 0 ? '+' : ''}₹{whatIf.delta.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 mt-2">Saved {whatIf.removedCount} leak-trades</p>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ─── FOURTH ROW: GEMINI NEURAL ANALYSIS (LLM-BASED) ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* 4. Deep Performance Analysis */}
        <Card title="Neural Deep Analysis" icon={Sparkles} sub="Gemini Flash 2.0 Logic Processor">
          <div className="flex flex-col h-full min-h-[350px]">
            <div className="flex-1">
              {loading.deep ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                  <Motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-journal-gold"><RefreshCcw size={32} /></Motion.div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Scanning behavioral clusters...</p>
                </div>
              ) : analysisResults.deep ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <MarkdownText text={analysisResults.deep} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-journal-gold/5 border border-journal-gold/10 flex items-center justify-center">
                    <BrainCircuit className="text-journal-gold/40" size={40} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Neural Link Ready</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Gemini will scan your entire trade history for non-obvious performance leaks.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-white/5">
              <button
                onClick={() => runLLMTask('deep')}
                disabled={loading.deep}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-journal-gold to-yellow-600 text-[#050505] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-50"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles size={16} />
                  {analysisResults.deep ? 'Refresh Analysis' : 'Initialize Neural Analysis'}
                </div>
                <Motion.div className="absolute inset-0 bg-white/20" initial={{ x: '-100%' }} whileHover={{ x: '100%' }} transition={{ duration: 0.6 }} />
              </button>
            </div>
          </div>
        </Card>

        {/* 5. Strategy Builder */}
        <Card title="AI Strategy Architect" icon={ShieldAlert} sub="Algorithmic Rule Generation">
          <div className="flex flex-col h-full min-h-[350px]">
            <div className="flex-1">
              {loading.strategy ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                  <Motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-journal-gold"><RefreshCcw size={32} /></Motion.div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Synthesizing edge parameters...</p>
                </div>
              ) : analysisResults.strategy ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <MarkdownText text={analysisResults.strategy} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-journal-gold/5 border border-journal-gold/10 flex items-center justify-center">
                    <ListChecks className="text-journal-gold/40" size={40} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Strategy Core Offline</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Gemini will build a custom rule-set optimized specifically for your historical win rates.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-white/5">
              <button
                onClick={() => runLLMTask('strategy')}
                disabled={loading.strategy}
                className="w-full bg-slate-900 border border-white/10 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-800 hover:border-journal-gold/50"
              >
                <div className="flex items-center justify-center gap-2">
                  <ListChecks size={16} className="text-journal-gold" />
                  {analysisResults.strategy ? 'Re-Architect Strategy' : 'Build Custom Rule-Set'}
                </div>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── API KEY MODAL ─── */}
      <AnimatePresence>
        {showKeyModal && (
          <>
            <Motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowKeyModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            />
            <Motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[201] p-4"
            >
              <div className="modern-glass border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-journal-gold/10 blur-[60px] pointer-events-none" />
                
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-journal-gold/10 border border-journal-gold/20 text-journal-gold">
                      <Lock size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Gemini API Key</h3>
                  </div>
                  <button onClick={() => setShowKeyModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-journal-gold/5 border border-journal-gold/10 rounded-2xl">
                    <p className="text-[11px] text-journal-gold leading-relaxed font-medium">
                      Your key is stored <strong>locally</strong> in your browser and is never sent to our servers. It is used exclusively to fetch AI insights for your data.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enter API Key</p>
                    <input 
                      type="password"
                      placeholder="AIzaSy..."
                      value={tempKey}
                      onChange={e => setTempKey(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-journal-gold/50 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleSaveKey}
                      className="w-full bg-gradient-to-r from-journal-gold to-yellow-600 text-[#050505] py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-journal-gold/20 hover:scale-[1.01] transition-all"
                    >
                      Connect Neural Engine
                    </button>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-center py-2 text-[9px] font-black uppercase text-slate-500 hover:text-journal-gold transition-all flex items-center justify-center gap-2"
                    >
                      Get your free key from Google AI Studio <ChevronRight size={10} />
                    </a>
                  </div>
                </div>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AIAuditTab;
