import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, ImageIcon, CheckCircle2, AlertCircle, 
  Loader2, Trash2, Database, ShieldCheck, ArrowRight,
  DatabaseZap, ClipboardList, StickyNote
} from 'lucide-react';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { MigrationService } from '../services/MigrationService';

const MigrationHub = ({ onComplete, onCancel }) => {
  const [files, setFiles] = useState({
    trades: null,
    snapshots: null,
    notes: null,
    images: [] // Array of File objects
  });

  const [status, setStatus] = useState('idle'); // idle, processing, complete, error
  const [progress, setProgress] = useState({ total: 0, current: 0, message: '' });
  const [error, setError] = useState(null);

  const handleFileChange = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleFolderChange = (e) => {
    const folderFiles = Array.from(e.target.files);
    setFiles(prev => ({ ...prev, images: folderFiles }));
  };

  const uploadImage = async (localPath, imageFiles) => {
    if (!localPath) return null;
    // Notion paths: "Trading%20Journal/Screenshot_2025-06-28_163920.png"
    const fileName = decodeURIComponent(localPath.split('/').pop());
    const matchedFile = imageFiles.find(f => f.name === fileName);
    
    if (!matchedFile) return null;

    try {
      const storageRef = ref(storage, `trading_journal/${Date.now()}_${fileName}`);
      const snapshot = await uploadBytes(storageRef, matchedFile);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.error("Image upload failed:", err);
      return null;
    }
  };

  const startMigration = async () => {
    if (!files.trades || !files.snapshots || !files.notes) {
      setError("Please provide all 3 CSV files.");
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      // 1. Process Trades
      setProgress({ total: 100, current: 5, message: 'Parsing Trades CSV...' });
      const tradesData = await new Promise((resolve) => {
        Papa.parse(files.trades, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data)
        });
      });

      // 2. Process Snapshots
      setProgress({ total: 100, current: 10, message: 'Parsing Snapshots CSV...' });
      const snapshotsData = await new Promise((resolve) => {
        Papa.parse(files.snapshots, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data)
        });
      });

      // 3. Process Notes
      setProgress({ total: 100, current: 15, message: 'Parsing Notes CSV...' });
      const notesData = await new Promise((resolve) => {
        Papa.parse(files.notes, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data)
        });
      });

      const totalItems = tradesData.length + snapshotsData.length + notesData.length;
      let processedCount = 0;

      // 4. Migrate Trades (Batching logic)
      for (const row of tradesData) {
        const trade = MigrationService.mapTradeRow(row);
        
        // Handle Image
        if (trade.chartScreenshotLocal && files.images.length > 0) {
          setProgress(p => ({ ...p, message: `Uploading Image for Trade: ${trade.market}...` }));
          const cloudUrl = await uploadImage(trade.chartScreenshotLocal, files.images);
          if (cloudUrl) trade.chartScreenshotUrl = cloudUrl;
        }

        await addDoc(collection(db, 'trades'), trade);
        processedCount++;
        setProgress({ 
          total: totalItems, 
          current: processedCount, 
          message: `Migrating Trade ${processedCount}/${tradesData.length}...` 
        });
      }

      // 5. Migrate Snapshots
      for (const row of snapshotsData) {
        const snapshot = MigrationService.mapSnapshotRow(row);
        if (snapshot.imageLocal && files.images.length > 0) {
          const cloudUrl = await uploadImage(snapshot.imageLocal, files.images);
          if (cloudUrl) snapshot.imageUrl = cloudUrl;
        }
        await addDoc(collection(db, 'dailySnapshots'), snapshot);
        processedCount++;
        setProgress({ 
          total: totalItems, 
          current: processedCount, 
          message: `Migrating Daily Snapshot ${processedCount - tradesData.length}/${snapshotsData.length}...` 
        });
      }

      // 6. Migrate Notes
      for (const row of notesData) {
        const note = MigrationService.mapNoteRow(row);
        await addDoc(collection(db, 'notes'), note);
        processedCount++;
        setProgress({ 
          total: totalItems, 
          current: processedCount, 
          message: `Migrating Note ${processedCount - tradesData.length - snapshotsData.length}/${notesData.length}...` 
        });
      }

      setStatus('complete');
      setTimeout(onComplete, 2000);

    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl overflow-hidden glass rounded-3xl border border-white/20 shadow-2xl bg-[#0a0a0f]/90"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
              <DatabaseZap size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Notion Migration Hub</h2>
              <p className="text-white/50 text-sm">Sync your entire trading history to the cloud</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {status === 'idle' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trades CSV */}
                <FileImportBox 
                  label="Trading Journal CSV" 
                  icon={<ClipboardList size={20} />}
                  onFileSelect={(e) => handleFileChange('trades', e)}
                  file={files.trades}
                  color="blue"
                />
                {/* Snapshots CSV */}
                <FileImportBox 
                  label="Daily Snapshots CSV" 
                  icon={<Database size={20} />}
                  onFileSelect={(e) => handleFileChange('snapshots', e)}
                  file={files.snapshots}
                  color="purple"
                />
                {/* Notes CSV */}
                <FileImportBox 
                  label="Rules & Notes CSV" 
                  icon={<StickyNote size={20} />}
                  onFileSelect={(e) => handleFileChange('notes', e)}
                  file={files.notes}
                  color="emerald"
                />
                {/* Image Folder */}
                <div className="group relative">
                  <div className={`
                    h-28 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-300
                    ${files.images.length > 0 ? 'border-orange-500/50 bg-orange-500/5' : 'border-white/10 hover:border-orange-500/30 bg-white/5'}
                  `}>
                    <input 
                      type="file" 
                      webkitdirectory="true" 
                      directory="true" 
                      multiple 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFolderChange}
                    />
                    <div className={`p-2 rounded-lg mb-1 ${files.images.length > 0 ? 'text-orange-400 bg-orange-400/20' : 'text-white/40'}`}>
                      <ImageIcon size={24} />
                    </div>
                    <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Screenshot Folder</span>
                    {files.images.length > 0 && (
                      <span className="text-[10px] text-orange-400 font-bold mt-1 uppercase tracking-tighter">
                        {files.images.length} IMAGES READY
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-200 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button 
                  onClick={onCancel}
                  className="px-6 py-3 text-sm font-medium text-white/50 hover:text-white transition-colors"
                >
                  Skip Migration
                </button>
                <button 
                  onClick={startMigration}
                  disabled={!files.trades || !files.snapshots || !files.notes}
                  className="group flex items-center gap-3 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/20 text-white rounded-2xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/20"
                >
                  Initialize Cloud Sync
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <Loader2 size={64} className="text-blue-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-400/20 rounded-full blur-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Syncing to Cloud...</h3>
                <p className="text-white/40 text-sm max-w-sm mb-4">{progress.message}</p>
              </div>
              
              <div className="w-full max-w-md h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              
              <div className="text-xs text-white/30 font-mono">
                {Math.round((progress.current / progress.total) * 100)}% COMPLETE
              </div>
            </div>
          )}

          {status === 'complete' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Migration Successful</h3>
                <p className="text-white/50 text-sm">Your trading journal is now fully cloud-synced.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const FileImportBox = ({ label, icon, onFileSelect, file, color }) => {
  const colors = {
    blue: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
    purple: 'border-purple-500/30 text-purple-400 bg-purple-500/5',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
  };

  return (
    <div className="group relative">
      <div className={`
        h-28 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-300
        ${file ? colors[color] : 'border-white/10 hover:border-white/30 bg-white/5'}
      `}>
        <input 
          type="file" 
          accept=".csv"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onFileSelect}
        />
        <div className={`p-2 rounded-lg mb-1 ${file ? colors[color] : 'text-white/40'}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-white/50 uppercase tracking-widest">{label}</span>
        {file && (
          <span className="text-[10px] text-white/80 font-bold mt-1 line-clamp-1 px-4 text-center">
            {file.name}
          </span>
        )}
      </div>
    </div>
  );
};

export default MigrationHub;
