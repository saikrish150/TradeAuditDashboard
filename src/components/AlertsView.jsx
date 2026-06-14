import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { binanceService } from '../services/binance';
import { SUPPORTED_SYMBOLS, SUPPORTED_TIMEFRAMES } from '../types/binance';
import { Chart } from './Chart';
import { AlertsPanel } from './AlertsPanel';
import { TrendingUp, Coins, ChevronRight, LayoutGrid, Clock, Wifi, WifiOff, RefreshCw, Database, Globe, Flag, Volume2 } from 'lucide-react';

const GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export const AlertsView = () => {
  const [alerts, setAlerts] = useState([]);
  const currentPricesRef = useRef({}); // Optimized: Use ref to prevent re-rendering on every price tick
  const audioCtxRef = useRef(null);
  const [selectedSymbol, setSelectedSymbol] = useState(SUPPORTED_SYMBOLS[0]);
  const [selectedInterval, setSelectedInterval] = useState('5m');
  const [connStatus, setConnStatus] = useState('disconnected');
  const [isTesting, setIsTesting] = useState(false);
  const [isUSMode, setIsUSMode] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [triggeredModal, setTriggeredModal] = useState(null);
  const [autoLevels, setAutoLevels] = useState({ pdh: null, pdl: null, pwh: null, pwl: null });
  const triggeredLevelsRef = useRef(new Set());
  const autoLevelsRef = useRef(autoLevels);

  useEffect(() => {
    autoLevelsRef.current = autoLevels;
  }, [autoLevels]);
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const triggeredCountRef = useRef(new Set());
  const alertsRef = useRef(alerts);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    const statusSub = binanceService.getConnectionStatus().subscribe(setConnStatus);
    return () => statusSub.unsubscribe();
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext && !audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {}
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const toggleUSMode = () => {
    const newVal = !isUSMode;
    setIsUSMode(newVal);
    binanceService.setUseBinanceUS(newVal);
    binanceService.connectAll(SUPPORTED_SYMBOLS, selectedInterval);
    showToast(`Switched to ${newVal ? 'US' : 'Global'} Binance Servers`);
  };

  const runDiagnostic = async () => {
    setIsTesting(true);
    setTestResult('Running connectivity tests...');
    try {
      const res = await binanceService.testConnectivity();
      const status = `REST: ${res.rest ? 'OK ✅' : 'FAIL ❌'} | WS: ${res.ws ? 'OK ✅' : 'REFUSED ❌'}`;
      setTestResult(status + (res.message ? `\nNote: ${res.message}` : ''));
      
      if (res.rest && res.ws && connStatus !== 'connected') {
        binanceService.connectAll(SUPPORTED_SYMBOLS, selectedInterval);
      }
    } catch (e) {
      setTestResult(`Test Error: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const fetchAlerts = useCallback(async () => {
    const currentUserId = GUEST_USER_ID; // Since Trade Audit uses Firebase Auth, we map global alerts to this default or grab Firebase UID later
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) setAlerts(data);
  }, []);

  useEffect(() => { 
    fetchAlerts(); 
    
    // Listen for backend cron job updates (e.g. status changing to 'triggered')
    const channel = supabase
      .channel('alerts-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          setAlerts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  // Handled globally by useAutoLevelsSync in App.jsx

  useEffect(() => {
    const updateLocalAutoLevels = async () => {
      try {
        const dailyCandles = await binanceService.getHistoricalData(selectedSymbol, '1d');
        const weeklyCandles = await binanceService.getHistoricalData(selectedSymbol, '1w');
        let pdh = null, pdl = null, pwh = null, pwl = null;
        if (dailyCandles && dailyCandles.length >= 2) {
          pdh = dailyCandles[dailyCandles.length - 2].high;
          pdl = dailyCandles[dailyCandles.length - 2].low;
        }
        if (weeklyCandles && weeklyCandles.length >= 2) {
          pwh = weeklyCandles[weeklyCandles.length - 2].high;
          pwl = weeklyCandles[weeklyCandles.length - 2].low;
        }
        setAutoLevels({ pdh, pdl, pwh, pwl });
      } catch (e) {
        console.error('[AutoLevels] Failed to update local levels:', e);
      }
    };
    updateLocalAutoLevels();
  }, [selectedSymbol]);

  const playAlertSound = useCallback(() => {
    try {
      // 1. Initialize AudioContext on the fly if needed
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtxRef.current = new AudioContext();
        }
      }

      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        
        // Tone 1: A5 (880Hz) - Alert trigger
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.03);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.35);
        
        // Tone 2: C6 (1046.5Hz) - Ascending minor third (highly audible warning)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.12);
        gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
        gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.5);
        return;
      }
    } catch (e) {
      console.warn('[AlertsView] Web Audio API synth failed, attempting fallback', e);
    }

    // Fallback: Extremely reliable free public sound asset
    try {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => {
        console.warn('[AlertsView] Audio play blocked by browser autoplay policy.', e);
      });
    } catch (e) {
      console.error('[AlertsView] Audio initialization failed', e);
    }
  }, []);

  useEffect(() => {
    binanceService.connectAll(SUPPORTED_SYMBOLS, selectedInterval);
    
    const subscription = binanceService.getPriceStream().subscribe((update) => {
      currentPricesRef.current[update.symbol] = update.price;
    });
    
    return () => {
      subscription.unsubscribe();
      binanceService.disconnect();
    };
  }, [selectedInterval]);

  const handleAddAlert = useCallback(async (targetPrice) => {
    const curPrice = currentPricesRef.current[selectedSymbol.id] || targetPrice;
    const currentUserId = GUEST_USER_ID;
    
    const { data, error } = await supabase.from('alerts').insert({
      symbol: selectedSymbol.id,
      target_price: targetPrice,
      condition: targetPrice > curPrice ? 'gt' : 'lt',
      status: 'active',
      user_id: currentUserId
    }).select().single();
    
    if (!error) { 
      setAlerts(prev => [data, ...prev]); 
      if (window.Notification && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
      showToast(`Alert set for ${selectedSymbol.id} at $${targetPrice}`);
    } else {
      console.error('[AlertsView] Failed to create alert:', error);
      showToast('Failed to create alert', 'error');
    }
  }, [selectedSymbol]);

  const handleUpdateAlert = useCallback(async (id, newPrice) => {
    const alert = alertsRef.current.find(a => a.id === id);
    if (!alert) return;

    const curPrice = currentPricesRef.current[alert.symbol] || newPrice;
    
    setAlerts(prev => prev.map(a => a.id === id ? { 
      ...a, 
      target_price: newPrice,
      condition: newPrice > curPrice ? 'gt' : 'lt'
    } : a));
    
    const { error } = await supabase.from('alerts').update({ 
      target_price: newPrice,
      condition: newPrice > curPrice ? 'gt' : 'lt'
    }).eq('id', id);
    
    if (error) {
      console.error('[AlertsView] Failed to update alert price:', error);
      fetchAlerts(); // Rollback on error
      showToast('Failed to update alert', 'error');
    } else {
      showToast(`Alert updated: $${newPrice}`);
    }
  }, [fetchAlerts]);

  const handleDeleteAlert = useCallback(async (id) => {
    const { error } = await supabase.from('alerts').delete().eq('id', id);
    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== id));
      showToast('Alert deleted');
    } else {
      showToast('Failed to delete alert', 'error');
    }
  }, []);

  const getStatusColor = () => {
    switch(connStatus) {
      case 'connected': return 'text-journal-green';
      case 'connecting': return 'text-journal-gold animate-pulse';
      case 'error': return 'text-journal-red';
      default: return 'text-journal-text-muted';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Alert Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-journal-secondary/40 border border-journal-gold/10 backdrop-blur-md">
        
        {/* Symbol Selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          {SUPPORTED_SYMBOLS.map(sym => (
            <button 
              key={sym.id} 
              onClick={() => setSelectedSymbol(sym)} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap shadow-xl ${
                selectedSymbol.id === sym.id 
                ? 'bg-journal-gold text-journal-bg gold-glow border-journal-gold/50' 
                : 'text-journal-text-muted hover:text-journal-gold hover:bg-white/5 border border-white/5'
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> {sym.id}
            </button>
          ))}
        </div>

        {/* Timeframe Selector & Status */}
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="flex items-center gap-1 p-1.5 bg-black/40 rounded-2xl border border-white/5">
            {SUPPORTED_TIMEFRAMES.map(tf => (
              <button 
                key={tf} 
                onClick={() => setSelectedInterval(tf)} 
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black transition-all uppercase tracking-widest ${
                  selectedInterval === tf 
                  ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' 
                  : 'text-journal-text-muted hover:text-journal-gold hover:bg-white/5'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          <div className="hidden md:block w-[1px] h-8 bg-white/5"></div>

          <div className="hidden md:flex items-center gap-2">
            <div className={`flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/5`}>
              {connStatus === 'error' ? <WifiOff className={`w-4 h-4 ${getStatusColor()}`} /> : <Wifi className={`w-4 h-4 ${getStatusColor()}`} />}
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${getStatusColor()} hidden xs:inline`}>{connStatus}</span>
            </div>

            <button 
              onClick={() => {
                fetchAlerts();
                showToast('Alerts synchronized with cloud Server');
              }} 
              title="Sync Alerts with Database"
              className="p-2 rounded-2xl border transition-all bg-black/40 border-white/5 hover:border-journal-gold/30 text-journal-text-muted hover:text-journal-gold hover:bg-journal-gold/5 group"
            >
              <Database className="w-4 h-4 transition-colors" />
            </button>
          </div>
        </div>

      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Chart Column */}
        <div className="lg:col-span-3 rounded-2xl border border-journal-gold/10 bg-[#0c0c0c] overflow-hidden shadow-2xl flex flex-col h-[450px] lg:h-[calc(100vh-280px)] min-h-[400px]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-journal-gold/10 bg-black/60 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-[10px] font-black text-journal-text-muted uppercase tracking-[0.3em]"><LayoutGrid className="w-4 h-4 text-journal-gold" /> {selectedSymbol.name}</span>
                <ChevronRight className="w-4 h-4 text-white/10" />
                <span className="flex items-center gap-2 text-[10px] font-black text-journal-gold uppercase tracking-[0.3em]"><Clock className="w-4 h-4" /> {selectedInterval}</span>
              </div>
          </div>
          <div className="flex-1 relative z-0">
            <Chart 
              key={`${selectedSymbol.id}-${selectedInterval}-${isUSMode}`} 
              symbol={selectedSymbol} 
              interval={selectedInterval} 
              alerts={alerts} 
              autoLevels={autoLevels}
              onAddAlert={handleAddAlert}
              onUpdateAlert={handleUpdateAlert}
              onDeleteAlert={handleDeleteAlert}
            />
          </div>
        </div>
        
        {/* Alerts Panel Column */}
        <div className="lg:col-span-1 rounded-2xl border border-journal-gold/10 bg-journal-secondary/30 backdrop-blur-md p-5 shadow-2xl h-[450px] lg:h-[calc(100vh-280px)] min-h-[400px]">
          <AlertsPanel alerts={alerts} onDelete={handleDeleteAlert} />
        </div>

      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed bottom-12 right-6 z-[100] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300 border backdrop-blur-2xl ${
          toast.type === 'success' ? 'bg-journal-green/90 border-journal-green/40 text-journal-bg' : 'bg-journal-red/90 border-journal-red/40 text-white'
        }`}>
          {toast.type === 'success' ? <Clock className="w-5 h-5 font-black" /> : <WifiOff className="w-5 h-5" />}
          <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      {/* Alert Triggered Modal */}
      {triggeredModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-journal-secondary border border-journal-gold/30 rounded-[3rem] shadow-2xl p-10 max-w-sm w-full text-center animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-journal-red via-journal-gold to-journal-green" />
            <div className="w-20 h-20 bg-journal-gold/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-journal-gold/20 shadow-xl shadow-journal-gold/10">
              <TrendingUp className="w-10 h-10 text-journal-gold animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-[0.2em] italic">
              {triggeredModal.isAutoLevel ? `${triggeredModal.levelName} Crossed` : 'Target Reached'}
            </h2>
            <div className="text-5xl font-black text-journal-gold mb-8 tracking-tighter drop-shadow-lg gold-glow py-2">
              {triggeredModal.symbol}
            </div>
            <p className="text-journal-text-muted mb-10 font-black uppercase tracking-widest text-[10px]">
              Hit level at <span className="text-white">${triggeredModal.target_price}</span>
            </p>
            <button 
              onClick={() => setTriggeredModal(null)}
              className="w-full py-5 bg-journal-gold text-journal-bg hover:bg-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95"
            >
              Acknowledge Trade
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
