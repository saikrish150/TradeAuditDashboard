import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Check, X, AlertTriangle, CheckCircle, Settings,
  Bitcoin, TrendingUp, IndianRupee, Terminal
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  fetchUserBrokers, connectBroker, triggerFullBrokerSync, 
} from '../../services/brokers/brokerSyncService';
import { AddTradeModal } from './JournalModals';
import { DB_FIELDS } from '../../constants/fieldMappings';
import { formatToGMT530 } from '../../constants/formDefaults';
import { supabaseService } from '../../services/supabaseService';
import { formatCurrency } from '../../utils';

// Broker-to-category mapping
const BROKER_CATEGORIES = {
  crypto: ['Delta Exchange India'],
  indian: ['Dhan Broker']
};

export default function BrokerSyncCenter({ user, liveRate = 83.5, onClose, onImportSuccess }) {
  const [brokers, setBrokers] = useState([]);
  const [reconstructed, setReconstructed] = useState([]);
  const [selectedBroker, setSelectedBroker] = useState(null);
  
  // Prefill manual modal states
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [prefillTradeData, setPrefillTradeData] = useState(null);
  const [selectedReconstructedTrade, setSelectedReconstructedTrade] = useState(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simple Category Toggle
  const [activeCategory, setActiveCategory] = useState('indian');
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState('today'); // Default to today
  const DATE_FILTERS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: '1 Week' },
    { id: 'month', label: '1 Month' },
    { id: 'all', label: 'All' }
  ];

  // Connection form state
  const [brokerName, setBrokerName] = useState('Dhan Broker');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [dhanClientId, setDhanClientId] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  // Filter brokers by active category
  const categoryBrokers = useMemo(() => {
    const categoryNames = BROKER_CATEGORIES[activeCategory] || [];
    return brokers.filter(b => categoryNames.some(cn => b.broker_name.includes(cn)));
  }, [brokers, activeCategory]);

  // Filter reconstructed trades by active category brokers AND date filter
  const filteredReconstructed = useMemo(() => {
    const categoryBrokerIds = categoryBrokers.map(b => b.id);
    let filtered = reconstructed.filter(t => categoryBrokerIds.includes(t.broker_id));

    // Helper to safely parse potentially 16-digit microsecond Delta timestamps
    const parseEntryTime = (ts) => {
      if (!ts) return new Date(0);
      const strTs = String(ts);
      // Delta Exchange returns 16 digit microsecond epoch
      if (/^\d{16}$/.test(strTs)) {
        return new Date(parseInt(strTs, 10) / 1000);
      }
      return new Date(ts);
    };

    if (dateFilter !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let cutoff;

      if (dateFilter === 'today') {
        cutoff = startOfToday;
      } else if (dateFilter === 'yesterday') {
        cutoff = new Date(startOfToday);
        cutoff.setDate(cutoff.getDate() - 1);
        return filtered.filter(t => {
          const d = parseEntryTime(t.entry_time);
          return d >= cutoff && d < startOfToday;
        });
      } else if (dateFilter === 'week') {
        cutoff = new Date(startOfToday);
        cutoff.setDate(cutoff.getDate() - 7);
      } else if (dateFilter === 'month') {
        cutoff = new Date(startOfToday);
        cutoff.setDate(cutoff.getDate() - 30);
      }

      if (cutoff) {
        filtered = filtered.filter(t => parseEntryTime(t.entry_time) >= cutoff);
      }
    }

    // Apply Indian Market fee calculation for UI display
    return filtered.map(t => {
      const rawSymbol = String(t.symbol).toUpperCase();
      const indianKeywords = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY'];
      
      if (indianKeywords.some(k => rawSymbol.includes(k))) {
        const fillsCount = parseInt(t.fills_count) || 2;
        const qty = parseFloat(t.quantity) || 0;
        const entryPrice = parseFloat(t.entry_price_avg) || 0;
        const exitPrice = parseFloat(t.exit_price_avg) || 0;

        const buyValue = t.direction === 'LONG' ? (qty * entryPrice) : (qty * exitPrice);
        const sellValue = t.direction === 'LONG' ? (qty * exitPrice) : (qty * entryPrice);
        const turnover = buyValue + sellValue;

        const brokerage = fillsCount * 20;
        const stt = Math.round(sellValue * 0.001);
        const exchangeCharge = turnover * 0.00035;
        const sebiFee = turnover * 0.000001;
        const stampDuty = Math.round(buyValue * 0.00003);
        const gst = (brokerage + exchangeCharge + sebiFee) * 0.18;

        let calculatedFees = brokerage + stt + exchangeCharge + sebiFee + stampDuty + gst;
        calculatedFees = Math.round(calculatedFees * 100) / 100;
        
        // Update net PNL based on calculated fees instead of edge function's zero fees
        const grossPnl = parseFloat(t.gross_pnl || t.net_pnl || 0);
        return {
          ...t,
          total_fees: calculatedFees,
          net_pnl: grossPnl - calculatedFees
        };
      }
      return t;
    });
  }, [reconstructed, categoryBrokers, dateFilter]);

  const totalPnL = useMemo(() => {
    return filteredReconstructed.reduce((sum, trade) => sum + (parseFloat(trade.net_pnl) || 0), 0);
  }, [filteredReconstructed]);

  const [localLastSynced, setLocalLastSynced] = useState({});

  // Compute the last time trades were synced for the current category
  const lastSyncedTime = useMemo(() => {
    const targetBroker = categoryBrokers[0];
    if (!targetBroker) return null;
    return localLastSynced[targetBroker.id] || null;
  }, [localLastSynced, categoryBrokers]);

  // Load broker context
  useEffect(() => {
    if (user?.id) {
      loadBrokerContext();
    }
  }, [user]);

  async function loadBrokerContext() {
    try {
      setLoading(true);
      const brokerList = await fetchUserBrokers(user.id);
      setBrokers(brokerList);
      if (brokerList.length > 0) {
        setSelectedBroker(brokerList[0]);
      }

      // Fetch pending + approved reconstructed trades
      const { data: recTrades, error: recErr } = await supabase
        .from('reconstructed_trades')
        .select('*')
        .eq('user_id', user.id)
        .in('review_status', ['PENDING', 'APPROVED'])
        .order('entry_time', { ascending: false });

      if (recErr) throw recErr;
      setReconstructed(recTrades || []);

      // Load last synced times from localStorage or fallback to most recent trade
      const syncedTimes = {};
      brokerList.forEach(b => {
        const stored = localStorage.getItem(`broker_last_sync_${b.id}`);
        if (stored) {
          syncedTimes[b.id] = new Date(stored);
        } else {
          // Fallback to most recent trade entry time
          const tradesForBroker = (recTrades || []).filter(t => t.broker_id === b.id);
          if (tradesForBroker.length > 0) {
            syncedTimes[b.id] = new Date(tradesForBroker[0].entry_time);
          }
        }
      });
      setLocalLastSynced(syncedTimes);
    } catch (err) {
      console.error('Error loading broker data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle manual sync trigger
  async function handleSyncTrigger() {
    const targetBroker = categoryBrokers[0];
    if (!targetBroker) {
      setShowSettings(true);
      return;
    }

    const isDhanBroker = targetBroker.broker_name.includes('Dhan');
    try {
      setIsSyncing(true);
      setTokenExpired(false);
      setSyncLogs(['📡 Connecting to secure Deno Edge function...']);
      
      setTimeout(() => {
        setSyncLogs(prev => [...prev, isDhanBroker
          ? '🔍 Pulling F&O trade history from DhanHQ API...'
          : '🔍 Pulling raw execution fills from Delta Exchange India API...']);
      }, 1000);

      setTimeout(() => {
        setSyncLogs(prev => [...prev, '🔄 Executing Position Reconstruction Engine...']);
      }, 2500);

      setTimeout(() => {
        setSyncLogs(prev => [...prev, '🎉 Full Sync Pipeline Complete!']);
      }, 4000);

      const result = await triggerFullBrokerSync(user.id, targetBroker.id, targetBroker.broker_name);
      
      // Save sync timing locally on success
      const now = new Date();
      localStorage.setItem(`broker_last_sync_${targetBroker.id}`, now.toISOString());
      setLocalLastSynced(prev => ({
        ...prev,
        [targetBroker.id]: now
      }));
      
      setTimeout(async () => {
        setIsSyncing(false);
        setSyncLogs([]);
        await loadBrokerContext();
        if (onImportSuccess) onImportSuccess();
      }, 5000);
    } catch (err) {
      setIsSyncing(false);
      console.error('Sync failed:', err);
      if (err.message && err.message.includes('TOKEN_EXPIRED')) {
        setTokenExpired(true);
        setShowSettings(true);
        setSyncLogs([`❌ Token Expired. Please update your API credentials in settings.`]);
      } else {
        setSyncLogs([`❌ Sync failed: ${err.message}`]);
      }
    }
  }

  // Handle broker key addition
  async function handleConnectSubmit(e) {
    e.preventDefault();
    setConnectError('');
    setConnectSuccess(false);

    const isDhanBroker = brokerName.includes('Dhan');
    const existingBroker = categoryBrokers.length > 0 ? categoryBrokers[0] : null;

    if (isDhanBroker) {
      if (!apiKey) {
        setConnectError('Access Token is required.');
        return;
      }
      if (!existingBroker && !dhanClientId) {
        setConnectError('Dhan Client ID is required for first-time connection.');
        return;
      }
    } else {
      if (!apiKey || !apiSecret) {
        setConnectError('API Key and Secret are required.');
        return;
      }
    }

    try {
      await connectBroker(
        user.id, 
        brokerName, 
        apiKey, 
        isDhanBroker ? '' : apiSecret,
        isDhanBroker ? dhanClientId : null
      );
      setConnectSuccess(true);
      setApiKey('');
      setApiSecret('');
      setDhanClientId('');
      setTokenExpired(false);
      setTimeout(async () => {
        setShowSettings(false);
        setConnectSuccess(false);
        await loadBrokerContext();
        // Automatically sync immediately after updating token!
        handleSyncTrigger();
      }, 1500);
    } catch (err) {
      setConnectError('Connection failed: ' + err.message);
    }
  }

  // Helper to format duration
  function formatDuration(ms) {
    if (!ms || ms < 0) return '0s';
    if (ms < 60000) {
      return `${Math.floor(ms / 1000)}s`;
    }
    const totalMins = Math.floor(ms / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // Handle opening prefilled manual trade modal on Approve click
  async function handleApproveClick(trade, mappedMarket) {
    const entryDate = new Date(trade.entry_time);
    const exitDate = trade.exit_time ? new Date(trade.exit_time) : entryDate;
    const holdDurationMs = exitDate.getTime() - entryDate.getTime();
    
    const prefillObj = {
      jsDate: entryDate,
      market: mappedMarket,
      direction: trade.direction ? trade.direction.toUpperCase() : 'LONG',
      isWin: trade.net_pnl >= 0 ? 'WIN' : 'LOSS',
      pl: Math.round(trade.net_pnl).toString(),
      positionSize: trade.quantity.toString(),
      tradeStatus: trade.net_pnl >= 0 ? 'Target' : 'StopLoss',
      positionType: 'Intraday',
      tradeMode: 'Buying',
      tradeTime: formatDuration(holdDurationMs),
      brokerage: Math.abs(trade.total_fees || 0).toString(),
      reason: ''
    };

    setSelectedReconstructedTrade(trade);
    setPrefillTradeData(prefillObj);
    setShowPrefillModal(true);
  }

  // Handle saving the prefilled trade and finalizing approval status
  async function handleSaveTradeFromPrefill(data) {
    try {
      const tradeRecord = {
        user_id: user.id,
        [DB_FIELDS.date]: formatToGMT530(data.date),
        [DB_FIELDS.market]: data.market,
        [DB_FIELDS.direction]: data.direction,
        [DB_FIELDS.isWin]: data.isWin === 'WIN' ? 'WIN' : 'LOSS',
        [DB_FIELDS.winFlag]: data.isWin === 'WIN' ? 1 : 0,
        [DB_FIELDS.pl]: data.pl.toString(),
        [DB_FIELDS.rr]: data.rr || null,
        [DB_FIELDS.reason]: data.reason || null,
        [DB_FIELDS.learning]: data.learning || null,
        [DB_FIELDS.strategy]: data.strategy || null,
        [DB_FIELDS.setups]: Array.isArray(data.setups) ? data.setups.join(', ') : (data.setups || null),
        [DB_FIELDS.lossReason]: Array.isArray(data.lossReason) ? data.lossReason.join(', ') : (data.lossReason || null),
        [DB_FIELDS.emotions]: data.emotions || null,
        [DB_FIELDS.positionSize]: data.positionSize ? data.positionSize.toString() : '0',
        [DB_FIELDS.tradeQuality]: data.tradeQuality || null,
        [DB_FIELDS.tradeStatus]: data.tradeStatus || null,
        [DB_FIELDS.positionType]: data.positionType || null,
        [DB_FIELDS.tradeMode]: data.tradeMode || null,
        [DB_FIELDS.tradeTime]: data.tradeTime || null,
        [DB_FIELDS.fees]: data.brokerage ? parseFloat(data.brokerage) : null,
        trade_source: 'BROKER',
        broker_id: selectedReconstructedTrade.broker_id,
        linked_reconstructed_trade_id: selectedReconstructedTrade.id,
        trade_hash: selectedReconstructedTrade.trade_hash,
        entry_price: parseFloat(selectedReconstructedTrade.entry_price_avg || 0),
        exit_price: parseFloat(selectedReconstructedTrade.exit_price_avg || 0)
      };

      let screenshotUrl = data.chartScreenshotUrl || null;
      if (data.screenshot) {
        screenshotUrl = await supabaseService.uploadImage(user.id, data.screenshot, 'trades');
      }
      if (screenshotUrl) {
        tradeRecord[DB_FIELDS.chartScreenshotUrl] = screenshotUrl;
      }

      const { error: insertError } = await supabase
        .from('trades')
        .insert([tradeRecord]);

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('reconstructed_trades')
        .update({ review_status: 'APPROVED' })
        .eq('id', selectedReconstructedTrade.id);

      if (updateError) {
        console.error('Failed to update reconstructed trade review status:', updateError.message);
      }

      setShowPrefillModal(false);
      await loadBrokerContext();
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      alert('Approval Save Failed: ' + err.message);
    }
  }

  // Handle rejecting trade
  async function handleRejectTrade(tradeId) {
    if (!window.confirm("Are you sure you want to discard this trade? It will be hidden permanently.")) return;
    try {
      const { error } = await supabase
        .from('reconstructed_trades')
        .update({ review_status: 'REJECTED' })
        .eq('id', tradeId);
      if (error) throw error;
      await loadBrokerContext();
    } catch (err) {
      alert('Reject failed: ' + err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-journal-bg/95 backdrop-blur-2xl"
      />
      
      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-6xl max-h-[90vh] bg-[#050505]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
      >
        {/* Subtle glowing orb in background */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-journal-gold/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-journal-gold/5 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Header Area */}
        <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-black uppercase text-white tracking-widest flex items-center gap-2">
              <RefreshCw className="text-journal-gold" size={24} /> 
              Broker Sync
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Automatic Trade Importing & Reconstruction</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
            {/* Indian vs Crypto Toggles */}
            <div className="flex bg-[#0a0a0a]/80 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto shadow-inner">
              <button
                onClick={() => { setActiveCategory('indian'); setBrokerName('Dhan Broker'); }}
                className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${
                  activeCategory === 'indian' 
                    ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-[#050505] shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-[1.02]' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <TrendingUp size={14} /> Indian F&O
              </button>
              <button
                onClick={() => { setActiveCategory('crypto'); setBrokerName('Delta Exchange India'); }}
                className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${
                  activeCategory === 'crypto' 
                    ? 'bg-gradient-to-r from-journal-gold to-yellow-600 text-[#050505] shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-[1.02]' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bitcoin size={14} /> Crypto
              </button>
            </div>

            {/* Settings Button */}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-[#0a0a0a]/80 border border-white/10 hover:border-journal-gold/50 rounded-2xl text-slate-400 hover:text-journal-gold hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all"
              title="Connection Settings"
            >
              <Settings size={18} />
            </button>

            {/* Close Button */}
            <button onClick={onClose} className="p-3 bg-[#0a0a0a]/80 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-2xl text-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col gap-5 md:gap-6">

          {/* TOKEN EXPIRY WARNING */}
          {tokenExpired && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-4">
              <AlertTriangle className="text-amber-400 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-xs font-black text-amber-300 uppercase">Access Token Expired</p>
                <p className="text-[9px] text-amber-400/70 font-bold mt-0.5">Your broker access token has expired. Please open settings and update your credentials.</p>
              </div>
              <button onClick={() => setShowSettings(true)} className="px-4 py-2 text-[9px] font-black uppercase rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Update Now
              </button>
            </div>
          )}

          {/* CONTROLS BAR: FILTERS + SYNC BUTTON */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0a0a0a]/60 backdrop-blur-md p-3 md:p-4 rounded-[1.5rem] border border-white/10 shadow-2xl">
            
            {/* Date Filters */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 md:flex-wrap">
              {DATE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id)}
                  className={`shrink-0 px-5 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                    dateFilter === f.id
                      ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                      : 'bg-transparent border border-transparent text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Total P&L & Sync Button */}
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
              {/* Total PnL for selected filter */}
              <div className="flex flex-col items-start md:items-center justify-center px-2 md:px-6 md:border-l md:border-r border-white/5">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Total P&L</span>
                <span className={`text-xl font-black font-mono tracking-tighter leading-none ${totalPnL >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]'}`}>
                  {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                </span>
              </div>

              {/* Compact Sync Button */}
              <div className="flex flex-col items-end w-auto">
                <button
                  onClick={handleSyncTrigger}
                disabled={isSyncing || categoryBrokers.length === 0}
                className={`relative overflow-hidden group px-6 py-3 rounded-xl flex flex-col items-center justify-center w-full md:w-auto md:min-w-[220px] max-w-full md:max-w-[280px] transition-all duration-300 ${
                  isSyncing ? 'bg-slate-800/80 text-journal-gold cursor-not-allowed border border-journal-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                  : categoryBrokers.length === 0 ? 'bg-[#1a1a1a] border border-white/10 text-slate-400 hover:text-white hover:border-white/30' 
                  : 'bg-gradient-to-r from-journal-gold to-yellow-500 hover:scale-[1.03] shadow-[0_0_20px_rgba(212,175,55,0.4)] text-[#050505]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSyncing || categoryBrokers.length === 0 ? '' : 'text-[#050505]'}`}>
                      {isSyncing ? 'Syncing Pipeline...' : categoryBrokers.length === 0 ? 'No API Keys' : `Launch Sync`}
                    </span>
                    {!isSyncing && categoryBrokers.length > 0 && lastSyncedTime && (
                      <span className="text-[8px] font-bold tracking-widest text-[#050505]/70 mt-0.5">
                        Last synced: {(() => {
                          const now = new Date();
                          const isToday = lastSyncedTime.toDateString() === now.toDateString();
                          const timeStr = lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          
                          if (isToday) {
                            return `Today, ${timeStr}`;
                          }
                          
                          const yesterday = new Date(now);
                          yesterday.setDate(yesterday.getDate() - 1);
                          const isYesterday = lastSyncedTime.toDateString() === yesterday.toDateString();
                          
                          if (isYesterday) {
                            return `Yesterday, ${timeStr}`;
                          }
                          
                          const dateStr = lastSyncedTime.toLocaleDateString([], { day: '2-digit', month: 'short' });
                          return `${dateStr}, ${timeStr}`;
                        })()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Embedded latest log line */}
                <AnimatePresence>
                  {isSyncing && syncLogs.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="w-full text-center overflow-hidden"
                    >
                      <span className="text-[8px] font-mono tracking-widest opacity-80 truncate block w-full">
                        {syncLogs[syncLogs.length - 1].replace(/^(📡 |🔍 |🔄 |🎉 |❌ )/, '')}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* TRADES TABLE */}
          <div className="relative z-10 flex-1 bg-[#0a0a0a]/60 backdrop-blur-md rounded-[2rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-journal-gold" size={32} />
              </div>
            ) : filteredReconstructed.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-500">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)] animate-bounce-slow">
                  <Terminal size={32} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">No Executions Found</h3>
                <p className="text-[10px] mt-2 font-bold tracking-widest text-slate-400 max-w-xs text-center leading-relaxed">
                  Click the sync button above to securely fetch your latest executions from {brokerName}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] sticky top-0 backdrop-blur-xl z-20">
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Date</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Market</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">W/L</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Direction</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">P/L</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Qty</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Fees</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Hold Time</th>
                      <th className="p-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReconstructed.map((trade) => {
                      const isWin = trade.net_pnl >= 0;
                      const isDup = trade.reconstruction_metadata?.duplicate_status === 'POTENTIAL_DUPLICATE';
                      const isApproved = trade.review_status === 'APPROVED';
                      
                      const marketOptions = activeCategory === 'indian'
                        ? ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY']
                        : ['NIFTY', 'BTC', 'ETH', 'GOLD'];
                      const rawSymbol = String(trade.symbol).toUpperCase();
                      let mappedMarket = rawSymbol;
                      if (rawSymbol.includes('PAXG')) mappedMarket = 'GOLD';
                      else {
                        for (const option of marketOptions) {
                          if (rawSymbol.includes(option)) {
                            mappedMarket = option;
                            break;
                          }
                        }
                      }
                      
                      return (
                        <tr key={trade.id} className={`transition-all ${isApproved ? 'opacity-50' : 'hover:bg-white/[0.02]'}`}>
                          <td className="p-4">
                            <p className="text-xs font-black text-white">{new Date(trade.entry_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{new Date(trade.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-white/5 border border-white/10 text-white">
                              {mappedMarket}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full ${isWin ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                              {isWin ? 'WIN' : 'LOSS'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-black uppercase ${trade.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-sm font-black font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatCurrency(trade.net_pnl)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-black text-white">{trade.quantity}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-[11px] font-black text-slate-300">{formatCurrency(trade.total_fees)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-bold text-slate-400">
                              {(() => {
                                const entryDate = new Date(trade.entry_time);
                                const exitDate = trade.exit_time ? new Date(trade.exit_time) : entryDate;
                                return formatDuration(exitDate.getTime() - entryDate.getTime());
                              })()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => !isApproved && handleApproveClick(trade, mappedMarket)}
                                disabled={isApproved}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                  isApproved 
                                    ? 'bg-slate-800/50 border border-slate-700/30 text-slate-600' 
                                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                }`}
                                title={isApproved ? 'Already synced to journal' : 'Approve & Move to Journal'}
                              >
                                <Check size={14} />
                              </button>
                              {!isApproved && (
                                <button 
                                  onClick={() => handleRejectTrade(trade.id)}
                                  className="w-8 h-8 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 flex items-center justify-center transition-all"
                                  title="Discard Trade"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Settings Popup Overlay */}
      <AnimatePresence>
        {showSettings && (
          <div className="absolute inset-0 z-[550] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-journal-gold/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-3">
                  <Settings size={18} className="text-journal-gold" /> 
                  Connect {activeCategory === 'indian' ? 'Dhan' : 'Delta Exchange'}
                </h3>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="p-2 text-slate-500 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConnectSubmit} className="space-y-5 relative z-10">
                {activeCategory === 'indian' ? (
                  <>
                    {/* Hide Client ID if already connected/saved */}
                    {categoryBrokers.length === 0 && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dhan Client ID</label>
                        <input type="text" value={dhanClientId} onChange={e => setDhanClientId(e.target.value)} required
                          className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-journal-gold shadow-inner transition-all"
                          placeholder="e.g. 1100XXXXX" />
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Access Token (JWT)</label>
                      <textarea value={apiKey} onChange={e => setApiKey(e.target.value)} required rows={3}
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-journal-gold shadow-inner transition-all"
                        placeholder="Paste long JWT token here..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">API Key</label>
                      <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} required
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-journal-gold shadow-inner transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">API Secret</label>
                      <input type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} required
                        className="w-full bg-[#111] border border-white/10 rounded-xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-journal-gold shadow-inner transition-all" />
                    </div>
                  </>
                )}
                
                {connectError && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">{connectError}</p>}
                {connectSuccess && <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex items-center gap-2"><CheckCircle size={14} /> Connection Successful</p>}
                
                <button type="submit" className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-journal-gold to-yellow-600 text-[#050505] font-black uppercase tracking-[0.2em] hover:scale-[1.02] shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all">
                  Secure Connect
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prefill Manual Edit Modal overlaying everything else */}
      {showPrefillModal && (
        <AddTradeModal
          isOpen={showPrefillModal}
          onClose={() => { setShowPrefillModal(false); setSelectedReconstructedTrade(null); }}
          onSave={handleSaveTradeFromPrefill}
          editingTrade={prefillTradeData}
          trades={reconstructed}
          isPrefilled={true}
        />
      )}
    </div>
  );
}
