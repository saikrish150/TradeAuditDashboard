import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { binanceService } from '../services/binance';
import { SUPPORTED_SYMBOLS, SUPPORTED_TIMEFRAMES } from '../types/binance';
import { Chart } from './Chart';
import { AlertsPanel } from './AlertsPanel';
import { TrendingUp, Coins, ChevronRight, LayoutGrid, Clock, Wifi, WifiOff, RefreshCw, Database, Globe, Flag } from 'lucide-react';

const GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export const AlertsView = () => {
  const [alerts, setAlerts] = useState([]);
  const currentPricesRef = useRef({}); // Optimized: Use ref to prevent re-rendering on every price tick
  const [selectedSymbol, setSelectedSymbol] = useState(SUPPORTED_SYMBOLS[0]);
  const [selectedInterval, setSelectedInterval] = useState('5m');
  const [connStatus, setConnStatus] = useState('disconnected');
  const [isTesting, setIsTesting] = useState(false);
  const [isUSMode, setIsUSMode] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [triggeredModal, setTriggeredModal] = useState(null);
  
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
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });
      
    if (!error && data) setAlerts(data);
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const playAlertSound = useCallback(() => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => {
        console.warn('[AlertsView] Audio play blocked. Click anywhere on the page to enable sound.', e);
      });
      // Stop after 4 seconds to prevent looping/annoyance
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 4000);
    } catch (e) {
      console.error('[AlertsView] Audio initialization failed', e);
    }
  }, []);

  const triggerAlert = (alert) => {
    if (triggeredCountRef.current.has(alert.id)) return;
    
    triggeredCountRef.current.add(alert.id);
    console.log(`[AlertsView] Price Hit! Sound and Popup only: ${alert.id}`);
    
    setTriggeredModal(alert);
    playAlertSound(); // Fire the audio cue
    
    // Web audio or notification can be added here
    if (window.Notification && Notification.permission === "granted") {
      new Notification(`🔔 ${alert.symbol} Alert!`, { body: `${alert.symbol} hit your target of $${alert.target_price}` });
    }
  };

  useEffect(() => {
    console.log(`[AlertsView] Initializing connection for symbols on ${selectedInterval} interval`);
    binanceService.connectAll(SUPPORTED_SYMBOLS, selectedInterval);
    
    const subscription = binanceService.getPriceStream().subscribe((update) => {
      currentPricesRef.current[update.symbol] = update.price;
      
      alertsRef.current.forEach((alert) => {
        if (alert.status === 'active' && alert.symbol === update.symbol) {
          const isTriggered = (alert.condition === 'gt' && update.price >= alert.target_price) || 
                            (alert.condition === 'lt' && update.price <= alert.target_price);
          
          if (isTriggered) {
             triggerAlert(alert);
          }
        }
      });
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
      case 'connected': return 'text-emerald-500';
      case 'connecting': return 'text-amber-500 animate-pulse';
      case 'error': return 'text-rose-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Alert Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
        
        {/* Symbol Selector */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          {SUPPORTED_SYMBOLS.map(sym => (
            <button 
              key={sym.id} 
              onClick={() => setSelectedSymbol(sym)} 
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                selectedSymbol.id === sym.id 
                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Coins className="w-3 h-3" /> {sym.id}
            </button>
          ))}
        </div>

        {/* Timeframe Selector & Status */}
        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950/40 rounded-xl border border-slate-800/50">
            {SUPPORTED_TIMEFRAMES.map(tf => (
              <button 
                key={tf} 
                onClick={() => setSelectedInterval(tf)} 
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all uppercase ${
                  selectedInterval === tf 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          
          <div className="hidden lg:block w-[1px] h-6 bg-slate-800"></div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/50 group relative`}>
              {connStatus === 'error' ? <WifiOff className={`w-3.5 h-3.5 ${getStatusColor()}`} /> : <Wifi className={`w-3.5 h-3.5 ${getStatusColor()}`} />}
              <span className={`text-[10px] font-black uppercase tracking-wider ${getStatusColor()} hidden xs:inline`}>{connStatus}</span>
            </div>

            <button 
              onClick={toggleUSMode} 
              title={`Switch to ${isUSMode ? 'Global' : 'US'} Network`}
              className={`p-1.5 rounded-xl border transition-all bg-slate-950/40 hover:bg-slate-800 flex items-center gap-1 ${isUSMode ? 'text-indigo-400 border-indigo-500/50' : 'text-slate-400 border-slate-800/50'}`}
            >
              {isUSMode ? <Flag className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-bold uppercase hidden sm:inline">{isUSMode ? 'US Data' : 'Global Data'}</span>
            </button>

            <button 
              onClick={() => {
                fetchAlerts();
                showToast('Alerts synchronized with cloud Server');
              }} 
              title="Sync Alerts with Database"
              className="p-1.5 rounded-xl border transition-all bg-slate-950/40 border-slate-800/50 hover:bg-slate-800 hover:text-indigo-400 group"
            >
              <Database className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </button>

            <button 
              onClick={runDiagnostic} 
              disabled={isTesting}
              title="Test Websocket Connection"
              className={`p-1.5 rounded-xl border transition-all ${isTesting ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-950/40 border-slate-800/50 hover:bg-slate-800 group'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isTesting ? 'animate-spin text-indigo-400' : 'group-hover:text-indigo-400'} transition-colors`} />
            </button>
          </div>
        </div>

      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Chart Column */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-800/50 bg-[#131722] overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-260px)] min-h-[400px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-[#1a1e2e]/50 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest"><LayoutGrid className="w-4 h-4 text-indigo-500" /> {selectedSymbol.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-700" />
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-widest"><Clock className="w-4 h-4" /> {selectedInterval}</span>
              </div>
          </div>
          <div className="flex-1 relative z-0">
            <Chart 
              key={`${selectedSymbol.id}-${selectedInterval}-${isUSMode}`} 
              symbol={selectedSymbol} 
              interval={selectedInterval} 
              alerts={alerts} 
              onAddAlert={handleAddAlert}
              onUpdateAlert={handleUpdateAlert}
              onDeleteAlert={handleDeleteAlert}
            />
          </div>
        </div>
        
        {/* Alerts Panel Column */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-md p-4 shadow-2xl h-[calc(100vh-260px)] min-h-[400px]">
          <AlertsPanel alerts={alerts} onDelete={handleDeleteAlert} />
        </div>

      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed bottom-12 right-6 z-[100] px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 border backdrop-blur-md ${
          toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-rose-600/90 border-rose-400 text-white'
        }`}>
          {toast.type === 'success' ? <Clock className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-xs font-bold tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* Alert Triggered Modal */}
      {triggeredModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.3)] p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400" />
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
              <TrendingUp className="w-8 h-8 text-indigo-500 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-slate-100 mb-2 uppercase tracking-widest">Target Reached!</h2>
            <div className="text-4xl font-black text-indigo-400 mb-6 tracking-tighter drop-shadow-md">
              {triggeredModal.symbol}
            </div>
            <p className="text-slate-400 mb-8 font-bold">
              Hit target at <span className="text-white">${triggeredModal.target_price}</span>
            </p>
            <button 
              onClick={() => setTriggeredModal(null)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
