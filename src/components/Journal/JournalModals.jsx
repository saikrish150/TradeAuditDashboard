import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, ChevronDown, Plus, Trash2, IndianRupee, History, Target } from 'lucide-react';
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-journal-bg/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto journal-glass rounded-3xl border-journal-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.1)] flex flex-col`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/5 bg-journal-bg/80 backdrop-blur-md">
          <h2 className="text-xl font-black text-white uppercase tracking-widest">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
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
    amount: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.startDate || !formData.endDate || !formData.amount) return;
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        amount: parseFloat(formData.amount),
        status: 'active'
      });
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Set New Performance Objective" maxWidth="max-w-md">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Start Date</label>
            <input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Target Date</label>
            <input type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
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
  
  const toggleOption = (opt) => {
    const safeSelected = Array.isArray(selected) ? selected : [];
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
        className="min-h-[44px] bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 flex flex-wrap gap-2 cursor-pointer hover:border-journal-gold/30 transition-all"
      >
        {Array.isArray(selected) && selected.length > 0 ? (
          selected.map(s => (
            <span key={s} className="px-2 py-0.5 rounded bg-journal-gold/10 text-journal-gold text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1">
              {s} <X size={10} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleOption(s); }} />
            </span>
          ))
        ) : (
          <span className="text-slate-600 text-xs italic">Select options...</span>
        )}
        <ChevronDown size={14} className={`ml-auto text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                onClick={() => toggleOption(opt)}
                className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-journal-gold/10 hover:text-journal-gold cursor-pointer flex items-center justify-between"
              >
                {opt}
                {selected.includes(opt) && <Check size={14} />}
              </div>
            ))}
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Execute New Entry Record">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Execution Date & Time */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Execution Date & Time</label>
            <input 
              type="datetime-local" 
              value={formData.date || ''}
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 transition-all [color-scheme:dark]"
            />
          </div>

          <SingleSelect 
            label="Market / Symbol"
            options={Array.from(new Set([...MARKET_OPTIONS, ...uniqueValues('market')]))}
            value={formData.market || ''}
            onChange={val => setFormData({...formData, market: val})}
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
                    ? (d === 'LONG' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 
                       d === 'SHORT' ? 'bg-red-500/10 border-journal-red text-journal-red' : 
                       'bg-amber-500/10 border-amber-500 text-amber-500')
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
           <div className="relative h-48 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-950/30 hover:bg-slate-950/50 transition-all cursor-pointer overflow-hidden">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reason For Trade</label>
             <textarea 
               value={formData.reason || ''}
               onChange={e => setFormData({...formData, reason: e.target.value})}
               className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 outline-none focus:border-journal-gold/50 h-24 resize-none"
               placeholder="Logic behind entry..."
             />
          </div>
          <div className="flex flex-col gap-2">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Key Learning / Reflection</label>
             <textarea 
               value={formData.learning || ''}
               onChange={e => setFormData({...formData, learning: e.target.value})}
               className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 outline-none focus:border-journal-gold/50 h-24 resize-none"
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
            selected={formData.lossReasons || []}
            onChange={val => setFormData({...formData, lossReasons: val})}
          />
        )}

        {/* Additional Selects */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="flex flex-col gap-2 text-center lg:text-left">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Position Size</label>
              <input type="number" step="any" onWheel={(e) => e.target.blur()} value={formData.positionSize || ''} onChange={e => setFormData({...formData, positionSize: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none" placeholder="Lots" />
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
                      : 'bg-slate-950/30 border-slate-800 text-slate-600 hover:border-slate-700'
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
                      : 'bg-slate-950/30 border-slate-800 text-slate-600 hover:border-slate-700'
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
             className={`w-full py-4 text-journal-bg rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all ${
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Log Daily Performance Snapshot">
       <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Snapshot Date</label>
                  <input type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
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
             <div className="relative h-48 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-950/30 hover:bg-slate-950/50 transition-all cursor-pointer overflow-hidden text-center">
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
                  <label key={item.key} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${!!formData[item.key] ? 'bg-journal-gold/5 border-journal-gold/40 text-journal-gold' : 'bg-slate-950/30 border-slate-800 text-slate-500'}`}>
                     <span className="text-[10px] font-black uppercase italic tracking-widest">{item.label}</span>
                     <input type="checkbox" checked={!!formData[item.key]} onChange={e => setFormData({...formData, [item.key]: e.target.checked})} className="hidden" />
                     {!!formData[item.key] ? <Check size={16} /> : <Plus size={16} />}
                  </label>
                ))}
             </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg transition-all ${
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
       <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Entry Date</label>
                <input type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-journal-gold/50 [color-scheme:dark]" />
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
             <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-xs font-medium text-slate-300 outline-none focus:border-journal-gold/50 min-h-[160px] resize-none" placeholder="Deep dive into your session today..." />
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
              className="w-full py-4 bg-journal-gold text-journal-bg rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Locking Entry...' : 'Lock Entry'}
            </button>
          </div>
       </div>
    </ModalWrapper>
  );
};
// Removed DataInspectorModal
