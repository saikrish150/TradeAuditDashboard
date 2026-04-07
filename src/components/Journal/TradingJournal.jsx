import React, { useState, useEffect, useCallback } from 'react';
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
import CalendarSection from './CalendarSection';
import { AddTradeModal, AddSnapshotModal, AddNoteModal, DataInspectorModal } from './JournalModals';

const TradingJournal = ({ liveRate }) => {
  const [activeTab, setActiveTab] = useState('trades'); // trades, snapshots, calendar
  const [trades, setTrades] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);

  useEffect(() => {
    const unsubTrades = firebaseService.subscribeToTrades(setTrades);
    const unsubSnapshots = firebaseService.subscribeToSnapshots(setSnapshots);
    const unsubNotes = firebaseService.subscribeToNotes(setNotes);
    
    setLoading(false);
    return () => {
      unsubTrades();
      unsubSnapshots();
      unsubNotes();
    };
  }, []);

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

    const tradeRecord = {
      ...data,
      pl: parseFloat(data.pl) || 0,
      chartScreenshotUrl: screenshotUrl,
      jsDate: new Date(data.date),
      fullDate: new Date(data.date).toDateString(),
      year: new Date(data.date).getFullYear().toString(),
      month: new Date(data.date).toLocaleString('default', { month: 'long' }),
      category: data.market === 'Indian' ? 'Indian' : 'Other'
    };

    delete tradeRecord.screenshot; // Remove local file object

    if (editingTrade) {
      await firebaseService.updateTrade(editingTrade.id, tradeRecord);
      setEditingTrade(null);
    } else {
      await firebaseService.addTrade(tradeRecord);
    }
  };

  const handleSaveSnapshot = async (data) => {
    let imageUrl = null;
    if (data.image) {
      imageUrl = await uploadImage(data.image, 'daily_snapshots');
    }

    const snapshotRecord = {
      ...data,
      imageUrl,
      jsDate: new Date(data.date),
      date: new Date(data.date).toDateString()
    };
    delete snapshotRecord.image;

    await firebaseService.addSnapshot(snapshotRecord);
  };

  const handleSaveNote = async (data) => {
    await firebaseService.addNote({
      ...data,
      jsDate: new Date(data.date),
      date: new Date(data.date).toDateString()
    });
  };

  const handleDeleteTrade = async (id) => {
    if (confirm('Are you sure you want to delete this trade record? This action cannot be undone.')) {
      await firebaseService.deleteTrade(id);
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
        onOpenInspector={() => setShowInspector(true)}
      />

      <div className="max-w-7xl mx-auto px-4 pb-20">
        <PerformanceSection trades={trades} />
        <GoalTracking trades={trades} />
        <HabitTracker snapshots={snapshots} />

        <div className="flex justify-center gap-4 mb-8">
           {[
             { id: 'trades', label: 'Trade Journal' },
             { id: 'snapshots', label: 'EOD Snapshots' }
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
              />
            </motion.div>
          )}

          {activeTab === 'snapshots' && (
            <motion.div key="snapshots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <SnapshotSection snapshots={snapshots} />
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
        onClose={() => setShowSnapshotModal(false)} 
        onSave={handleSaveSnapshot} 
      />
      <AddNoteModal 
        isOpen={showNoteModal} 
        onClose={() => setShowNoteModal(false)} 
        onSave={handleSaveNote} 
      />
      <DataInspectorModal
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
        trades={trades}
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
