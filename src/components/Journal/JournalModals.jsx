import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, ChevronDown, Plus, Trash2, IndianRupee, History, Target, ShieldAlert, Calendar, Clock as ClockIcon } from 'lucide-react';
import TerminalClockPicker from './TerminalClockPicker';
import AutoSuggestTextarea from '../Common/AutoSuggestTextarea';
import { supabaseService } from '../../services/supabaseService';
import { 
  MARKET_OPTIONS,
  TRADE_STATUS_OPTIONS, 
  EMOTION_OPTIONS, 
  SETUP_OPTIONS, 
  LOSS_REASON_OPTIONS, 
  OUTCOME_OPTIONS,
  DIRECTION_OPTIONS,
  POSITION_TYPE_OPTIONS,
  TRADE_MODE_OPTIONS,
  TRADE_QUALITY_OPTIONS,
  COMPLIANCE_OPTIONS,
  NOTE_CATEGORY_OPTIONS
} from '../../constants/journalOptions';
import { 
  DEFAULT_TRADE_FORM, mapTradeToForm, 
  DEFAULT_SNAPSHOT_FORM, mapSnapshotToForm, 
  DEFAULT_NOTE_FORM, mapNoteToForm 
} from '../../constants/formDefaults';

const ModalWrapper = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-journal-bg/95 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full ${maxWidth} max-h-[95vh] overflow-y-auto journal-glass rounded-[2rem] border-journal-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.1)] flex flex-col`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-journal-bg/90 backdrop-blur-md">
          <h2 className="text-sm md:text-xl font-black text-white uppercase tracking-widest">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export const FullTextModal = ({ isOpen, onClose, title, content }) => {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm font-medium leading-relaxed text-slate-300 whitespace-pre-wrap selection:bg-journal-gold selection:text-journal-bg">
          {content}
        </p>
      </div>
    </ModalWrapper>
  );
};

export const AddGoalModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Default 30 days
    amount: '',
    isActive: true
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.startDate || !formData.endDate || !formData.amount) return;
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        amount: parseFloat(formData.amount),
        status: formData.isActive ? 'active' : 'archived'
      });
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Goal" maxWidth="max-w-md">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Start Date</label>
            <input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} onClick={(e) => e.target.showPicker?.()} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Target Date</label>
            <input type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} onClick={(e) => e.target.showPicker?.()} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Profit Target (INR)</label>
          <div className="relative">
            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="number" 
              onWheel={(e) => e.target.blur()} 
              placeholder="e.g. 50000"
              value={formData.amount || ''} 
              onChange={e => setFormData({...formData, amount: e.target.value})} 
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-4 py-4 text-sm font-black text-white outline-none focus:border-journal-gold/50" 
            />
          </div>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Your progress will be tracked automatically across all trades in this period.</p>
        </div>

        <div 
          onClick={() => setFormData({...formData, isActive: !formData.isActive})}
          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${formData.isActive ? 'bg-journal-gold/5 border-journal-gold/40 text-journal-gold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}
        >
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase italic tracking-widest">Set as Active Objective</span>
              <span className="text-[8px] font-bold opacity-60 uppercase">Archives existing active goals if enabled</span>
           </div>
           <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${formData.isActive ? 'bg-journal-gold border-journal-gold text-journal-bg' : 'border-slate-700'}`}>
              {formData.isActive && <Check size={14} />}
           </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving || !formData.amount}
          className="w-full py-4 bg-journal-gold text-journal-bg rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
        >
          <Target size={16} />
          {isSaving ? 'Establishing Objective...' : 'Initialize Performance Goal'}
        </button>
      </div>
    </ModalWrapper>
  );
};

const MultiSelect = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const safeSelected = Array.isArray(selected) ? selected : [];

  const toggleOption = (opt) => {
    const newSelected = safeSelected.includes(opt) 
      ? safeSelected.filter(s => s !== opt) 
      : [...safeSelected, opt];
    onChange(newSelected);
  };

  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-2 relative" ref={selectRef}>
      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 flex flex-wrap gap-2 cursor-pointer hover:border-journal-gold/30 transition-all items-center"
      >
        {safeSelected.length > 0 ? (
          safeSelected.map(s => (
            <span key={s} className="px-2 py-0.5 rounded bg-journal-gold/10 text-journal-gold text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 border border-journal-gold/20">
              {s} <X size={8} className="cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); toggleOption(s); }} />
            </span>
          ))
        ) : (
          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Select {label}...</span>
        )}
        <ChevronDown size={14} className={`ml-auto text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl p-3"
          >
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
              {options.map(opt => {
                const isActive = safeSelected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={`
                      px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-200
                      ${isActive 
                        ? 'bg-journal-gold/20 border-journal-gold text-journal-gold glow-gold shadow-[0_0_10px_rgba(212,175,55,0.15)]' 
                        : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                      }
                    `}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SingleSelect = ({ label, options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-2 relative" ref={selectRef}>
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="h-[44px] bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer hover:border-journal-gold/30 transition-all font-bold text-xs text-white"
      >
        {value || <span className="text-slate-600 italic">Select...</span>}
        <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
          >
            {options.map(opt => (
              <div 
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`px-4 py-2.5 text-xs font-bold cursor-pointer flex items-center justify-between transition-colors ${value === opt ? 'bg-journal-gold/10 text-journal-gold' : 'text-slate-300 hover:bg-white/5'}`}
              >
                {opt}
                {value === opt && <Check size={14} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AddTradeModal = ({ isOpen, onClose, onSave, trades, editingTrade, liveRate = 92.87 }) => {
  const [isClockOpen, setIsClockOpen] = useState(false);
  const [customRate, setCustomRate] = useState(liveRate);
  const [showRateInput, setShowRateInput] = useState(false);

  useEffect(() => {
    if (!showRateInput) setCustomRate(liveRate);
  }, [liveRate]);

  const [formData, setFormData] = useState(DEFAULT_TRADE_FORM);

  useEffect(() => {
    const val = parseFloat(formData.pl);
    if (!isNaN(val)) {
      setFormData(prev => ({ ...prev, isWin: val >= 0 ? 'WIN' : 'LOSS' }));
    }
  }, [formData.pl]);

  useEffect(() => {
    if (editingTrade && isOpen) {
      setFormData(mapTradeToForm(editingTrade));
    } else if (!editingTrade && isOpen) {
      setFormData(DEFAULT_TRADE_FORM);
    }
  }, [editingTrade, isOpen]);

  const uniqueValues = (field) => {
    return Array.from(new Set(trades.map(t => t[field]).filter(Boolean))).sort();
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving trade:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const [isUsd, setIsUsd] = useState(false);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Trade">
      <div className="space-y-4 md:space-y-5 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {/* Execution Date & Time */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Execution Date & Time</label>
            <div className="flex gap-2">
              <input 
                type="date" 
                value={formData.date ? formData.date.split('T')[0] : ''}
                onChange={e => {
                  const time = formData.date?.split('T')[1] || '09:30';
                  setFormData({...formData, date: `${e.target.value}T${time}`});
                }}
                className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 transition-all [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={() => setIsClockOpen(true)}
                className="flex items-center gap-2 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-journal-gold hover:border-journal-gold/30 transition-all"
              >
                <ClockIcon size={14} />
                {formData.date ? formData.date.split('T')[1]?.substring(0, 5) : '09:30'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isClockOpen && (
              <TerminalClockPicker 
                value={formData.date ? formData.date.split('T')[1]?.substring(0, 5) : '09:30'}
                onChange={(newTime) => {
                  const date = formData.date?.split('T')[0] || new Date().toISOString().split('T')[0];
                  setFormData({...formData, date: `${date}T${newTime}`});
                }}
                onClose={() => setIsClockOpen(false)}
              />
            )}
          </AnimatePresence>

          <SingleSelect 
            label="Market / Symbol"
            options={Array.from(new Set([...MARKET_OPTIONS, ...uniqueValues('market')]))}
            value={formData.market || ''}
            onChange={val => {
              const updates = { market: val };
              if (val.toUpperCase() === 'NIFTY') {
                updates.positionSize = '65';
              }
              setFormData({...formData, ...updates});
            }}
          />

          {/* Direction Radio */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Direction</label>
            <div className="flex gap-2">
              {DIRECTION_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setFormData({...formData, direction: d})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    formData.direction === d 
                    ? (d === 'LONG' ? 'bg-journal-green/10 border-journal-green text-journal-green' : 
                       d === 'SHORT' ? 'bg-journal-red/10 border-journal-red text-journal-red' : 
                       'bg-journal-gold/10 border-journal-gold text-journal-gold')
                    : 'bg-slate-950/30 border-slate-800 text-slate-600 hover:border-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>


          {/* P&L Input */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Net P&L (INR)</label>
              {formData.market !== 'NIFTY' && (
                <div className="flex items-center gap-2">
                  {showRateInput ? (
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-1">
                      <input 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        value={customRate || ''} 
                        onChange={e => setCustomRate(parseFloat(e.target.value))}
                        className="w-12 bg-transparent text-[9px] text-white outline-none font-bold"
                      />
                      <button onClick={() => setShowRateInput(false)} className="text-[10px] text-emerald-400">✓</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        if (formData.pl) {
                          const usdVal = parseFloat(formData.pl);
                          const inrVal = Math.round(usdVal * customRate);
                          setFormData({...formData, pl: inrVal.toString()});
                        }
                      }}
                      className="text-[9px] font-black uppercase text-journal-gold hover:underline flex items-center gap-1 bg-journal-gold/5 px-2 py-1 rounded"
                    >
                      <Plus size={8} /> Convert $ to ₹ (Rate: {customRate.toFixed(2)})
                    </button>
                  )}
                  <button onClick={() => setShowRateInput(!showRateInput)} className="text-slate-600 hover:text-slate-400 p-1">
                    <History size={10} />
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                {isUsd ? '$' : <IndianRupee size={14} />}
              </div>
              <input 
                type="number" 
                step="any"
                onWheel={(e) => e.target.blur()} 
                value={formData.pl || ''}
                onChange={e => setFormData({...formData, pl: e.target.value})}
                placeholder="0.00"
                className={`w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 ${formData.pl < 0 ? 'text-journal-red' : (formData.pl > 0 ? 'text-emerald-400' : '')}`}
              />
            </div>
          </div>
        </div>

        {/* Screenshot Upload */}
        <div className="flex flex-col gap-2">
           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Chart Analysis Screenshot</label>
           <div className="relative h-32 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-950/30 hover:bg-slate-950/50 transition-all cursor-pointer overflow-hidden">
              {(formData.screenshot || formData.chartScreenshotUrl) ? (
                <>
                  <img 
                    src={formData.screenshot ? URL.createObjectURL(formData.screenshot) : formData.chartScreenshotUrl} 
                    className="w-full h-full object-contain" 
                  />
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setFormData({...formData, screenshot: null, chartScreenshotUrl: ''}); 
                    }}
                    className="absolute top-2 right-2 p-2 bg-journal-red/80 rounded-full text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="text-slate-700" size={32} />
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Click or Drag to Upload Terminal Screenshot</p>
                  <input type="file" className="absolute inset-0 opacity-0" onChange={e => setFormData({...formData, screenshot: e.target.files[0]})} />
                </>
              )}
           </div>
        </div>


        {/* Text Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reason For Trade</label>
             <AutoSuggestTextarea 
               value={formData.reason || ''}
               onChange={val => setFormData({...formData, reason: val})}
               className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 outline-none focus:border-journal-gold/50 h-16 resize-none w-full"
               placeholder="Logic behind entry..."
             />
          </div>
          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Key Learning / Reflection</label>
             <AutoSuggestTextarea 
               value={formData.learning || ''}
               onChange={val => setFormData({...formData, learning: val})}
               className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 outline-none focus:border-journal-gold/50 h-16 resize-none w-full"
               placeholder="Mistakes or wins..."
             />
          </div>
        </div>

        {/* Multi Selects & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className={parseFloat(formData.pl) > 0 ? "md:col-span-2" : "md:col-span-3"}>
             <MultiSelect 
               label="Aligned Setups" 
               options={SETUP_OPTIONS}
               selected={formData.setups || []}
               onChange={val => setFormData({...formData, setups: val})}
             />
           </div>
           
           {parseFloat(formData.pl) > 0 && (
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Taken RR</label>
                <input 
                  type="text" 
                  value={formData.rr || ''}
                  onChange={e => setFormData({...formData, rr: e.target.value})}
                  placeholder="1:2.5"
                  className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 h-[42px]"
                />
             </div>
           )}
        </div>

        {/* Conditional Loss Reasons */}
        {(formData.isWin !== 'WIN' && parseFloat(formData.pl) < 0) && (
          <MultiSelect 
            label="Loss Reasons" 
            options={LOSS_REASON_OPTIONS}
            selected={formData.lossReason || []}
            onChange={val => setFormData({...formData, lossReason: val})}
          />
        )}

        {/* Additional Selects */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Position Size</label>
              <input type="number" step="any" onWheel={(e) => e.target.blur()} value={formData.positionSize || ''} onChange={e => setFormData({...formData, positionSize: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-3 text-xs font-bold text-white outline-none" placeholder="Lots" />
           </div>
           
           <SingleSelect 
             label="Trade Quality"
             options={TRADE_QUALITY_OPTIONS}
             value={formData.tradeQuality || ''}
             onChange={val => setFormData({...formData, tradeQuality: val})}
           />

           <SingleSelect 
             label="Trade Status"
             options={TRADE_STATUS_OPTIONS}
             value={formData.tradeStatus || ''}
             onChange={val => setFormData({...formData, tradeStatus: val})}
           />

           <SingleSelect 
             label="Emotions"
             options={EMOTION_OPTIONS}
             value={formData.emotions || ''}
             onChange={val => setFormData({...formData, emotions: val})}
           />

           <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Type</label>
              <div className="flex gap-2 h-[40px]">
                {POSITION_TYPE_OPTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => setFormData({...formData, positionType: q})}
                    className={`flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      formData.positionType === q 
                      ? 'bg-journal-gold/10 border-journal-gold text-journal-gold glow-gold'
                      : 'bg-slate-950/20 border-slate-800 text-slate-600 hover:border-slate-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
           </div>

           <div className="flex flex-col gap-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Trade Mode</label>
              <div className="flex gap-2 h-[40px]">
                {TRADE_MODE_OPTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => setFormData({...formData, tradeMode: q})}
                    className={`flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                      formData.tradeMode === q 
                      ? 'bg-journal-gold/10 border-journal-gold text-journal-gold glow-gold'
                      : 'bg-slate-950/20 border-slate-800 text-slate-600 hover:border-slate-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-white/5">
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className={`w-full py-3 text-journal-bg rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all ${
               isSaving 
               ? 'bg-slate-700 cursor-wait' 
               : 'bg-journal-gold shadow-[0_0_30px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-95'
             }`}
           >
             {isSaving ? (
               <div className="flex items-center justify-center gap-2">
                 <div className="w-3 h-3 border-2 border-journal-bg/30 border-t-journal-bg rounded-full animate-spin" />
                 Syncing Record...
               </div>
             ) : 'Lock Trade Record'}
           </button>
        </div>
      </div>
    </ModalWrapper>
  );
};


export const AddSnapshotModal = ({ isOpen, onClose, onSave, editingSnapshot, existingTags = [] }) => {
  const [formData, setFormData] = useState(DEFAULT_SNAPSHOT_FORM);

  useEffect(() => {
    if (editingSnapshot && isOpen) {
      setFormData(mapSnapshotToForm(editingSnapshot));
    } else if (!editingSnapshot && isOpen) {
      setFormData(DEFAULT_SNAPSHOT_FORM);
    }
  }, [editingSnapshot, isOpen]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving snapshot:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add EOD">
       <div className="space-y-4 md:space-y-5 pb-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Snapshot Date</label>
                  <input type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} onClick={(e) => e.target.showPicker?.()} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
               </div>
                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Execution Volume</label>
                   <div className="flex items-center gap-2">
                      <div className="flex bg-slate-900/50 border border-slate-800 rounded-xl p-1 shrink-0">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            onClick={() => setFormData({...formData, noOfTrades: num.toString()})}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${formData.noOfTrades === num.toString() ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="number" 
                        onWheel={(e) => e.target.blur()} 
                        placeholder="Qty" 
                        value={formData.noOfTrades || ''} 
                        onChange={e => setFormData({...formData, noOfTrades: e.target.value})} 
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50" 
                      />
                   </div>
                </div>
             </div>

             <MultiSelect 
                label="Metadata Tags" 
                options={existingTags}
                selected={formData.tags || []}
                onChange={val => setFormData({...formData, tags: val})}
             />

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Daily Chart / Result Image</label>
             <div className="relative h-32 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-950/30 hover:bg-slate-950/50 transition-all cursor-pointer overflow-hidden text-center">
                {formData.image || formData.imageUrl ? (
                   <>
                    <img 
                      src={formData.image ? URL.createObjectURL(formData.image) : formData.imageUrl} 
                      className="w-full h-full object-contain" 
                    />
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setFormData({...formData, image: null, imageUrl: ''}); 
                      }} 
                      className="absolute top-2 right-2 p-2 bg-journal-red/80 rounded-full text-white"
                    >
                      <Trash2 size={16} />
                    </button>
                   </>
                ) : (
                  <>
                    <Upload className="text-slate-700" size={32} />
                    <p className="text-[10px] font-bold text-slate-600 uppercase px-8 line-clamp-2">Upload End of Day Performance Summary Screenshot</p>
                    <input type="file" className="absolute inset-0 opacity-0" onChange={e => setFormData({...formData, image: e.target.files[0]})} />
                  </>
                )}
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rule Compliance Checklist</label>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {COMPLIANCE_OPTIONS.map(item => (
                  <label key={item.key} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${formData[item.key] ? 'bg-journal-gold/5 border-journal-gold/40 text-journal-gold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>
                     <span className="text-[10px] font-black uppercase italic tracking-widest">{item.label}</span>
                     <input type="checkbox" checked={!!formData[item.key]} onChange={e => setFormData({...formData, [item.key]: e.target.checked})} className="hidden" />
                     {formData[item.key] ? <Check size={16} /> : <Plus size={16} />}
                  </label>
                ))}
             </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg transition-all ${
                isSaving ? 'bg-slate-700 cursor-wait' : 'bg-journal-gold text-journal-bg hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isSaving ? 'Syncing Record...' : 'Sync Snapshot'}
            </button>
          </div>
       </div>
    </ModalWrapper>
  );
};


import { TRADING_RULES } from '../../constants/tradingRules';

export const TradingRulesModal = ({ isOpen, onClose }) => {
  const rules = TRADING_RULES;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Rules" maxWidth="max-w-6xl">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {rules.map((section, idx) => {
          const barColor = section.color.includes('gold') 
            ? 'from-journal-gold to-yellow-600' 
            : section.color.includes('amber') 
            ? 'from-amber-500 to-yellow-500' 
            : 'from-rose-500 to-red-500';

          return (
            <motion.div 
              key={idx}
              variants={itemAnim}
              className={`p-6 pt-8 rounded-3xl border ${section.border} ${section.bg} backdrop-blur-sm flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.01] hover:border-white/10 transition-all duration-300`}
            >
              {/* Premium Top Accent Glow Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${barColor}`} />
              
              {/* Background Icon Watermark */}
              <section.icon className="absolute -bottom-4 -right-4 w-32 h-32 opacity-[0.025] group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${section.bg} border ${section.border} ${section.color}`}>
                  <section.icon size={20} />
                </div>
                <h3 className={`text-sm font-black uppercase tracking-widest ${section.color}`}>{section.title}</h3>
              </div>

              <div className="space-y-4 flex-1">
                {section.items.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${section.color} opacity-60`} />
                      <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider font-mono">{item.label}</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed pl-3 border-l border-white/5">
                      {item.desc}
                    </p>
                    {item.isList && (
                      <div className="pl-6 space-y-1.5 mt-1 border-l border-white/5">
                        {item.subItems.map((sub, si) => (
                          <div key={si} className="flex items-start gap-2">
                            <span className={`${section.color} mt-1`}><Check size={10} /></span>
                            <span className="text-[10px] font-bold text-slate-500 italic leading-snug">{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 text-slate-400">
          <ShieldAlert size={16} className="text-journal-gold shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest leading-loose">
            Discipline is not just a rule, it is the <span className="text-journal-gold">barrier</span> between capital and chaos. Stick to the plan or stay out of the market.
          </p>
        </div>
      </div>
    </ModalWrapper>
  );
};

export const AddNoteModal = ({ isOpen, onClose, onSave, editingNote }) => {
  const [formData, setFormData] = useState(DEFAULT_NOTE_FORM);

  useEffect(() => {
    if (editingNote && isOpen) {
      setFormData(mapNoteToForm(editingNote));
    } else if (!editingNote && isOpen) {
      setFormData(DEFAULT_NOTE_FORM);
    }
  }, [editingNote, isOpen]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={editingNote ? "Refine Journal Entry" : "Terminal Journal Entry"}>
       <div className="space-y-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Entry Date</label>
                <input type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} onClick={(e) => e.target.showPicker?.()} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
             </div>
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Category</label>
                <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none">
                   {NOTE_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Content</label>
             <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 outline-none focus:border-journal-gold/50 min-h-[100px] resize-none" placeholder="Deep dive into your session today..." />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
             <div className={`w-10 h-6 rounded-full p-1 transition-all ${formData.isPinned ? 'bg-journal-gold' : 'bg-slate-800'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${formData.isPinned ? 'translate-x-4' : 'translate-x-0'}`} />
             </div>
             <input type="checkbox" checked={formData.isPinned} onChange={e => setFormData({...formData, isPinned: e.target.checked})} className="hidden" />
             <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white transition-colors">Pin to Archive Header</span>
          </label>

          <div className="pt-6 border-t border-white/5">
            <button 
              disabled={isSaving}
              onClick={handleSave}
              className="w-full py-3 bg-journal-gold text-journal-bg rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Locking Entry...' : 'Lock Entry'}
            </button>
          </div>
       </div>
    </ModalWrapper>
  );
};
// Removed DataInspectorModal
