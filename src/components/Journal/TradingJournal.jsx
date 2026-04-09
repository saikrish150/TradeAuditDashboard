import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { firebaseService } from '../../services/firebaseService';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Journal Sub-components
import ActionBar from './ActionBar';
import PerformanceSection from './PerformanceSection';
import GoalTracking from './GoalTracking';
import HabitTracker from './HabitTracker';
import MasterTable from './MasterTable';
import SnapshotSection from './SnapshotSection';
import NotesSection from './NotesSection';
import CalendarSection from './CalendarSection';
import { AddTradeModal, AddSnapshotModal, AddNoteModal } from './JournalModals';
import { SNAPSHOT_TAG_OPTIONS, NOTE_CATEGORY_OPTIONS } from '../../constants/journalOptions';
import { TRADE_SCHEMA_MAP, SNAPSHOT_SCHEMA_MAP, NOTE_SCHEMA_MAP } from '../../constants/fieldMappings';

const TradingJournal = ({ liveRate }) => {
  const [activeTab, setActiveTab] = useState('trades'); // trades, snapshots, calendar, notes
  const [trades, setTrades] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isFullHistory, setIsFullHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [editingSnapshot, setEditingSnapshot] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);

  useEffect(() => {
    const unsubTrades = firebaseService.subscribeToTrades(setTrades, isFullHistory ? null : 1000);
    const unsubSnapshots = firebaseService.subscribeToSnapshots(setSnapshots);
    const unsubNotes = firebaseService.subscribeToNotes(setNotes);
    
    setLoading(false);
    return () => {
      unsubTrades();
      unsubSnapshots();
      unsubNotes();
    };
  }, [isFullHistory]);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Image Upload Helper
  const uploadImage = async (file, path) => {
    if (!file) return null;
    try {
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.error("Image upload failed:", err);
      return null;
    }
  };

  const handleSaveTrade = async (data) => {
    let screenshotUrl = data.chartScreenshotUrl || null;
    if (data.screenshot) {
      screenshotUrl = await uploadImage(data.screenshot, 'trade_charts');
    }

    // Map UI Form keys to DB Schema Keys
    const tradeRecord = {
      market: data.market,
      direction: data.direction,
      isWin: data.isWin === 'WIN',
      pl: parseFloat(data.pl) || 0,
       // Use Schema Maps for non-matching keys
      [TRADE_SCHEMA_MAP.rr]: data.rr,
      [TRADE_SCHEMA_MAP.reason]: data.reason,
      [TRADE_SCHEMA_MAP.learning]: data.learning,
      [TRADE_SCHEMA_MAP.setups]: data.setups,
      [TRADE_SCHEMA_MAP.lossReasons]: data.lossReasons,
      [TRADE_SCHEMA_MAP.emotions]: data.emotions,
      [TRADE_SCHEMA_MAP.positionSize]: parseFloat(data.positionSize) || 0,
      [TRADE_SCHEMA_MAP.tradeQuality]: data.tradeQuality,
      [TRADE_SCHEMA_MAP.tradeStatus]: data.tradeStatus,
      [TRADE_SCHEMA_MAP.positionType]: data.positionType,
      [TRADE_SCHEMA_MAP.tradeMode]: data.tradeMode,
      chartScreenshotUrls: screenshotUrl ? [screenshotUrl] : (data.chartScreenshotUrl ? [data.chartScreenshotUrl] : []),
      jsDate: new Date(data.date),
      fullDate: new Date(data.date).toDateString(),
      year: new Date(data.date).getFullYear().toString(),
      month: new Date(data.date).toLocaleString('default', { month: 'long' }),
      category: data.market === 'Indian' ? 'Indian' : 'Other'
    };

    if (editingTrade) {
      await firebaseService.updateTrade(editingTrade.id, tradeRecord);
      setEditingTrade(null);
    } else {
      await firebaseService.addTrade(tradeRecord);
    }
  };

  const handleSaveSnapshot = async (data) => {
    let imageUrl = data.imageUrl || null;
    if (data.image) {
      imageUrl = await uploadImage(data.image, 'daily_snapshots');
    }

    const snapshotRecord = {
      [SNAPSHOT_SCHEMA_MAP.date]: data.date,
      [SNAPSHOT_SCHEMA_MAP.imageUrl]: imageUrl,
      [SNAPSHOT_SCHEMA_MAP.tags]: data.tags,
      [SNAPSHOT_SCHEMA_MAP.noOfTrades]: parseInt(data.noOfTrades) || 0,
      [SNAPSHOT_SCHEMA_MAP.rulesFollowed]: !!data.rulesFollowed,
      [SNAPSHOT_SCHEMA_MAP.emotionsInControl]: !!data.emotionsInControl,
      [SNAPSHOT_SCHEMA_MAP.setupFollowed]: !!data.setupFollowed,
      [SNAPSHOT_SCHEMA_MAP.setup]: data.setup || '',
      jsDate: new Date(data.date)
    };

    if (editingSnapshot) {
      await firebaseService.updateSnapshot(editingSnapshot.id, snapshotRecord);
      setEditingSnapshot(null);
    } else {
      await firebaseService.addSnapshot(snapshotRecord);
    }
  };

  const handleSaveNote = async (data) => {
    const noteData = {
      [NOTE_SCHEMA_MAP.date]: data.date,
      [NOTE_SCHEMA_MAP.content]: data.content,
      [NOTE_SCHEMA_MAP.category]: data.category,
      [NOTE_SCHEMA_MAP.isPinned]: !!data.isPinned,
      jsDate: new Date(data.date)
    };

    if (editingNote) {
      await firebaseService.updateNote(editingNote.id, noteData);
      setEditingNote(null);
    } else {
      await firebaseService.addNote(noteData);
    }
  };

  const existingSnapshotTags = useMemo(() => {
    const historicalTags = snapshots.flatMap(s => s.tags || []);
    return Array.from(new Set([...SNAPSHOT_TAG_OPTIONS, ...historicalTags])).sort();
  }, [snapshots]);

  const handleDeleteTrade = async (id) => {
    if (confirm('Are you sure you want to delete this trade record? This action cannot be undone.')) {
      await firebaseService.deleteTrade(id);
    }
  };

  const handleDeleteSnapshot = async (id) => {
    if (confirm('Are you sure you want to delete this snapshot? This will remove your EOD analysis record permanently.')) {
      await firebaseService.deleteSnapshot(id);
    }
  };

  const handleDeleteNote = async (id) => {
    if (confirm('Are you sure you want to delete this journal entry? This will permanently remove it from your archive.')) {
      await firebaseService.deleteNote(id);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-t-2 border-journal-gold rounded-full animate-spin shadow-[0_0_20px_rgba(212,175,55,0.3)]" />
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Terminal...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700">
      <ActionBar 
        onAddTrade={() => setShowTradeModal(true)} 
        onAddSnapshot={() => setShowSnapshotModal(true)} 
        onAddNote={() => setShowNoteModal(true)} 
      />

      <div className="max-w-7xl mx-auto px-4 pb-20">
        <PerformanceSection trades={trades} />
        <GoalTracking trades={trades} />
        <HabitTracker snapshots={snapshots} />

        <div className="flex justify-center gap-4 mb-8">
           {[
             { id: 'trades', label: 'Trade Journal' },
             { id: 'snapshots', label: 'EOD Snapshots' },
             { id: 'notes', label: 'Psychology Notes' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeTab === tab.id ? 'bg-journal-gold/10 border-journal-gold text-journal-gold' : 'border-slate-800 text-slate-500 hover:text-white'}`}
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
                onViewImage={setViewerImage}
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
                onViewImage={setViewerImage}
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
                Monthly Activity Heatmap
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

      {/* Full-screen Image Viewer */}
      <AnimatePresence>
        {viewerImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setViewerImage(null)}
            className="fixed inset-0 z-[9999] bg-journal-bg/95 backdrop-blur-2xl flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-6xl w-full h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={viewerImage} 
                alt="Trade Screenshot"
                className="max-w-full max-h-full rounded-2xl shadow-2xl border border-white/10 object-contain"
              />
              <button 
                onClick={() => setViewerImage(null)}
                className="absolute top-4 right-4 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all backdrop-blur-md"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradingJournal;
