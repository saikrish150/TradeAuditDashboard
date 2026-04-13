import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabaseService, normalizeRow } from '../../services/supabaseService';

// Journal Sub-components
import ActionBar from './ActionBar';
import PerformanceSection from './PerformanceSection';
import GoalTracking from './GoalTracking';
import HabitTracker from './HabitTracker';
import MasterTable from './MasterTable';
import SnapshotSection from './SnapshotSection';
import NotesSection from './NotesSection';
import CalendarSection from './CalendarSection';
import { AddTradeModal, AddSnapshotModal, AddNoteModal, TradingRulesModal } from './JournalModals';
import { SNAPSHOT_TAG_OPTIONS, NOTE_CATEGORY_OPTIONS } from '../../constants/journalOptions';
import { TRADE_SCHEMA_MAP, SNAPSHOT_SCHEMA_MAP, NOTE_SCHEMA_MAP } from '../../constants/fieldMappings';
import { formatToGMT530 } from '../../constants/formDefaults';

const TradingJournal = ({ 
  liveRate, user, trades, snapshots, notes, goals, isFullHistory, setIsFullHistory,
  setRawTrades, setRawSnapshots, setNotes, setGoals
}) => {
  const [activeTab, setActiveTab] = useState('trades'); // trades, snapshots, calendar, notes
  const [loading, setLoading] = useState(false); // Controlled by App now

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modal States
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [editingSnapshot, setEditingSnapshot] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [viewerState, setViewerState] = useState({ isOpen: false, currentImage: null, images: [], index: 0 });

  const handleViewImage = useCallback((image, allImages = []) => {
    const images = allImages.filter(img => !!img);
    if (images.length === 0 && !image) return;
    
    const finalImages = images.length > 0 ? images : [image];
    const index = finalImages.indexOf(image);
    
    setViewerState({
      isOpen: true,
      currentImage: image || finalImages[0],
      images: finalImages,
      index: index >= 0 ? index : 0
    });
  }, []);

  const handlePrevImage = useCallback(() => {
    setViewerState(prev => {
      const nextIndex = (prev.index - 1 + prev.images.length) % prev.images.length;
      return { ...prev, index: nextIndex, currentImage: prev.images[nextIndex] };
    });
  }, []);

  const handleNextImage = useCallback(() => {
    setViewerState(prev => {
      const nextIndex = (prev.index + 1) % prev.images.length;
      return { ...prev, index: nextIndex, currentImage: prev.images[nextIndex] };
    });
  }, []);

  // No local state subscriptions anymore, handled by App.jsx

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setShowTradeModal(true);
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowSnapshotModal(true);
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowNoteModal(true);
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowRulesModal(prev => !prev);
      }

      // Viewer Controls
      if (viewerState.isOpen) {
        if (e.key === 'ArrowLeft') handlePrevImage();
        if (e.key === 'ArrowRight') handleNextImage();
        if (e.key === 'Escape') setViewerState(prev => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to handle service calls with userId
  const performAction = async (action, ...args) => {
    if (!user?.id) throw new Error("IDENTIFICATION_REQUIRED: No active session found.");
    return await action(user.id, ...args);
  };

  const handleSaveTrade = async (data) => {
    let screenshotUrl = data.chartScreenshotUrl || null;
    try {
      if (data.screenshot) {
        screenshotUrl = await performAction(supabaseService.uploadImage, data.screenshot, 'trades');
      }

      const tradeRecord = {
        [TRADE_SCHEMA_MAP.market]: data.market,
        [TRADE_SCHEMA_MAP.direction]: data.direction,
        [TRADE_SCHEMA_MAP.isWin]: data.isWin === 'WIN' ? 'WIN' : 'LOSS',
        [TRADE_SCHEMA_MAP.winFlag]: data.isWin === 'WIN' ? 1 : 0,
        [TRADE_SCHEMA_MAP.pl]: data.pl.toString(),
        [TRADE_SCHEMA_MAP.rr]: data.rr,
        [TRADE_SCHEMA_MAP.reason]: data.reason,
        [TRADE_SCHEMA_MAP.learning]: data.learning,
        [TRADE_SCHEMA_MAP.strategy]: data.strategy,
        [TRADE_SCHEMA_MAP.setups]: Array.isArray(data.setups) ? data.setups.join(', ') : data.setups,
        [TRADE_SCHEMA_MAP.lossReason]: Array.isArray(data.lossReason) ? data.lossReason.join(', ') : data.lossReason,
        [TRADE_SCHEMA_MAP.emotions]: data.emotions,
        [TRADE_SCHEMA_MAP.positionSize]: data.positionSize.toString(),
        [TRADE_SCHEMA_MAP.tradeQuality]: data.tradeQuality,
        [TRADE_SCHEMA_MAP.tradeStatus]: data.tradeStatus,
        [TRADE_SCHEMA_MAP.positionType]: data.positionType,
        [TRADE_SCHEMA_MAP.tradeMode]: data.tradeMode,
        [TRADE_SCHEMA_MAP.chartScreenshotUrl]: screenshotUrl,
        [TRADE_SCHEMA_MAP.date]: formatToGMT530(data.date)
      };

      if (editingTrade) {
        const updatedRaw = await performAction(supabaseService.updateTrade, editingTrade.id, tradeRecord);
        const normalized = normalizeRow(updatedRaw || { ...tradeRecord, id: editingTrade.id });
        setRawTrades(prev => prev.map(t => t.id === editingTrade.id ? normalized : t));
        showToast('Trade record updated successfully', 'success');
      } else {
        const newRaw = await performAction(supabaseService.addTrade, tradeRecord);
        const normalized = normalizeRow(newRaw || { ...tradeRecord, id: Date.now() });
        setRawTrades(prev => [normalized, ...prev]);
        showToast('Trade record saved instantly', 'success');
      }
      setShowTradeModal(false);
      setEditingTrade(null);
    } catch (err) {
      showToast('Terminal Save Error: ' + err.message, 'error');
    }
  };

  const handleSaveSnapshot = async (data) => {
    let imageUrl = data.imageUrl || null;
    try {
      if (data.image) {
        imageUrl = await performAction(supabaseService.uploadImage, data.image, 'daily-snapshots');
      }

      const snapshotRecord = {
        "Name": data.name || `Snapshot ${data.date}`,
        [SNAPSHOT_SCHEMA_MAP.date]: formatToGMT530(data.date),
        [SNAPSHOT_SCHEMA_MAP.imageUrl]: imageUrl,
        [SNAPSHOT_SCHEMA_MAP.tags]: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags,
        [SNAPSHOT_SCHEMA_MAP.noOfTrades]: data.noOfTrades?.toString(),
        [SNAPSHOT_SCHEMA_MAP.rulesFollowed]: data.rulesFollowed ? 'Yes' : 'No',
        [SNAPSHOT_SCHEMA_MAP.emotionsInControl]: data.emotionsInControl ? 'Yes' : 'No',
        [SNAPSHOT_SCHEMA_MAP.setup]: data.snapshotSetup ? 'Yes' : 'No',
        [SNAPSHOT_SCHEMA_MAP.progress]: `${Math.round((( (data.rulesFollowed?1:0) + (data.emotionsInControl?1:0) + (data.snapshotSetup?1:0) ) / 3) * 100)}%`
      };

      if (editingSnapshot) {
        const updated = await performAction(supabaseService.updateSnapshot, editingSnapshot.id, snapshotRecord);
        const normalized = normalizeRow(updated || { ...snapshotRecord, id: editingSnapshot.id });
        setRawSnapshots(prev => prev.map(s => s.id === editingSnapshot.id ? normalized : s));
        showToast('Snapshot updated successfully', 'success');
      } else {
        const newSnap = await performAction(supabaseService.addSnapshot, snapshotRecord);
        const normalized = normalizeRow(newSnap || { ...snapshotRecord, id: Date.now() });
        setRawSnapshots(prev => [normalized, ...prev]);
        showToast('Snapshot locked successfully', 'success');
      }
      setShowSnapshotModal(false);
      setEditingSnapshot(null);
    } catch (err) {
      showToast('Snapshot Sync Failed: ' + err.message, 'error');
    }
  };

  const handleSaveNote = async (data) => {
    const noteData = {
      "Name": data.title || `Note ${data.date}`,
      [NOTE_SCHEMA_MAP.date]: formatToGMT530(data.date),
      [NOTE_SCHEMA_MAP.content]: data.content,
      [NOTE_SCHEMA_MAP.category]: data.category,
      [NOTE_SCHEMA_MAP.isPinned]: data.isPinned ? 'Yes' : 'No',
      [NOTE_SCHEMA_MAP.source]: data.source || ''
    };

    try {
      if (editingNote) {
        const updated = await performAction(supabaseService.updateNote, editingNote.id, noteData);
        const normalized = normalizeRow(updated || { ...noteData, id: editingNote.id });
        setNotes(prev => prev.map(n => n.id === editingNote.id ? normalized : n));
        showToast('Note updated successfully', 'success');
      } else {
        const newNote = await performAction(supabaseService.addNote, noteData);
        const normalized = normalizeRow(newNote || { ...noteData, id: Date.now() });
        setNotes(prev => [normalized, ...prev]);
        showToast('Note archived successfully', 'success');
      }
      setShowNoteModal(false);
      setEditingNote(null);
    } catch (err) {
      showToast('Note Archive Failed: ' + err.message, 'error');
    }
  };

  const handleDeleteNote = async (id) => {
    if (window.confirm("DELETE NOTE?")) {
      try {
        await performAction(supabaseService.deleteNote, id);
        setNotes(prev => prev.filter(n => n.id !== id));
        showToast('Note deleted successfully', 'success');
      } catch (err) {
        showToast('Purge Failure: ' + err.message, 'error');
      }
    }
  };

  const handleSaveGoal = async (data) => {
    // Sanitize data for Supabase (remove UI-only keys)
    const goalRecord = {
      startDate: data.startDate,
      endDate: data.endDate,
      amount: parseFloat(data.amount),
      status: data.status
    };

    try {
      if (data.id) {
        const updated = await performAction(supabaseService.updateGoal, data.id, goalRecord);
        
        // SERVER PERSISTENCE: Archive others if this one is active
        if (goalRecord.status === 'active') {
          await performAction(supabaseService.archiveOtherGoals, data.id);
        }

        setGoals(prev => {
          let next = prev.map(g => g.id === data.id ? (updated || { ...goalRecord, id: data.id }) : g);
          if (goalRecord.status === 'active') {
            next = next.map(g => g.id !== data.id ? { ...g, status: 'archived' } : g);
          }
          return next;
        });
        showToast('Objective updated successfully', 'success');
      } else {
        const newGoal = await performAction(supabaseService.addGoal, goalRecord);
        
        // SERVER PERSISTENCE: Archive others if this one is active
        if (goalRecord.status === 'active' && newGoal?.id) {
           await performAction(supabaseService.archiveOtherGoals, newGoal.id);
        }

        setGoals(prev => {
          const freshGoal = newGoal || { ...goalRecord, id: Date.now() };
          let next = [freshGoal, ...prev];
          if (freshGoal.status === 'active') {
             next = next.map(g => g.id !== freshGoal.id ? { ...g, status: 'archived' } : g);
          }
          return next;
        });
        showToast('Objective set successfully', 'success');
      }
    } catch (err) {
      showToast('Goal Sync Failed: ' + err.message, 'error');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (window.confirm("DELETE PERFORMANCE OBJECTIVE?")) {
      try {
        await performAction(supabaseService.deleteGoal, id);
        setGoals(prev => prev.filter(g => g.id !== id));
        showToast('Objective deleted successfully', 'success');
      } catch (err) {
        showToast('Goal Purge Failed: ' + err.message, 'error');
      }
    }
  };

  const existingSnapshotTags = useMemo(() => {
    const historicalTags = snapshots.flatMap(s => s.tags || []);
    return Array.from(new Set([...SNAPSHOT_TAG_OPTIONS, ...historicalTags])).sort();
  }, [snapshots]);

  const handleDeleteTrade = async (id) => {
    if (confirm('Are you sure you want to delete this trade record? This action cannot be undone.')) {
      try {
        await performAction(supabaseService.deleteTrade, id);
        setRawTrades(prev => prev.filter(t => t.id !== id));
        showToast('Trade record permanently deleted', 'success');
      } catch (err) {
        showToast('Trade deletion failed: ' + err.message, 'error');
      }
    }
  };

  const handleDeleteSnapshot = async (id) => {
    if (confirm('Are you sure you want to delete this snapshot? This will remove your EOD analysis record permanently.')) {
      try {
        await performAction(supabaseService.deleteSnapshot, id);
        setRawSnapshots(prev => prev.filter(s => s.id !== id));
        showToast('Snapshot permanently deleted', 'success');
      } catch (err) {
        showToast('Snapshot deletion failed: ' + err.message, 'error');
      }
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-t-2 border-journal-gold rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.3)]" />
      <p className="text-journal-text-secondary text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Cloud Terminal...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700">
      {/* Dynamic Toast Notifications */}
      {toast && (
        <div className={`fixed bottom-10 right-10 z-[300] px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 ${
          toast.type === 'success' 
            ? 'bg-journal-secondary/90 border-journal-gold/50 text-journal-gold shadow-[0_0_30px_rgba(212,175,55,0.15)]' 
            : 'bg-journal-red/10 border-journal-red/50 text-journal-red shadow-[0_0_30px_rgba(230,57,70,0.15)]'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <ActionBar 
        onAddTrade={() => setShowTradeModal(true)} 
        onAddSnapshot={() => setShowSnapshotModal(true)} 
        onAddNote={() => setShowNoteModal(true)} 
        onOpenRules={() => setShowRulesModal(true)}
      />

      <div className="max-w-7xl mx-auto px-4 pb-20 w-full overflow-hidden">
        <PerformanceSection trades={trades} />
        <GoalTracking 
          trades={trades} 
          goals={goals}
          onSaveGoal={handleSaveGoal}
          onDeleteGoal={handleDeleteGoal}
        />
        <HabitTracker snapshots={snapshots} />

        <div className="flex bg-journal-secondary/10 p-1 rounded-xl border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar w-full md:w-max md:mx-auto mb-8 justify-start md:justify-center px-4 md:px-1">
           {[
             { id: 'trades', label: 'Trades' },
             { id: 'snapshots', label: 'Snapshots' },
             { id: 'notes', label: 'Notes' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`
                 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex-shrink-0
                 ${activeTab === tab.id ? 'bg-journal-gold text-journal-bg shadow-lg shadow-journal-gold/20' : 'text-journal-text-muted hover:text-white'}
               `}
             >
                {tab.label}
             </button>
           ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'trades' && (
            <motion.div key="trades" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <MasterTable 
                trades={trades} 
                onEditTrade={(t) => { setEditingTrade(t); setShowTradeModal(true); }} 
                onDeleteTrade={handleDeleteTrade}
                onViewImage={handleViewImage}
                onTabChange={(tab) => {
                  if (tab === 'All Trades' && !isFullHistory) {
                    setIsFullHistory(true);
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === 'snapshots' && (
            <motion.div key="snapshots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <SnapshotSection 
                snapshots={snapshots} 
                onEditSnapshot={(s) => { setEditingSnapshot(s); setShowSnapshotModal(true); }}
                onDeleteSnapshot={handleDeleteSnapshot}
                onViewImage={handleViewImage}
              />
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <NotesSection 
                notes={notes}
                onEditNote={(n) => { setEditingNote(n); setShowNoteModal(true); }}
                onDeleteNote={handleDeleteNote}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2">
                Heatmap
            </h3>
            <CalendarSection trades={trades} />
        </div>
      </div>

      {/* Modals */}
      <AddTradeModal 
        isOpen={showTradeModal} 
        onClose={() => { setShowTradeModal(false); setEditingTrade(null); }} 
        onSave={handleSaveTrade}
        trades={trades}
        editingTrade={editingTrade}
        liveRate={liveRate}
      />
      <AddSnapshotModal 
        isOpen={showSnapshotModal} 
        onClose={() => { setShowSnapshotModal(false); setEditingSnapshot(null); }} 
        onSave={handleSaveSnapshot} 
        editingSnapshot={editingSnapshot}
        existingTags={existingSnapshotTags}
      />
      <AddNoteModal 
        isOpen={showNoteModal} 
        onClose={() => { setShowNoteModal(false); setEditingNote(null); }} 
        onSave={handleSaveNote}
        editingNote={editingNote} 
      />
      <TradingRulesModal 
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Full-screen Image Viewer */}
      <AnimatePresence>
        {viewerState.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
            className="fixed inset-0 z-[9999] bg-journal-bg/95 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-6xl w-full h-full flex items-center justify-center group"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
                className="absolute top-4 right-4 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md"
              >
                <X size={24} />
              </button>

              {/* Navigation Buttons */}
              {viewerState.images.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button 
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
                  >
                    <ChevronRight size={32} />
                  </button>

                  {/* Counter */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-black tracking-widest uppercase border border-white/10">
                    Image {viewerState.index + 1} / {viewerState.images.length}
                  </div>
                </>
              )}

              <img 
                src={viewerState.currentImage} 
                alt="Trade Screenshot"
                className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/10 object-contain selection:bg-none"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradingJournal;
