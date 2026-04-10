import { supabase } from '../lib/supabase';
import { DB_FIELDS } from '../constants/fieldMappings';

/**
 * Normalizes a Supabase row (Literal Notion Headers) into Standard UI keys.
 */
export const normalizeRow = (row) => {
  if (!row) return null;
  const normalized = { ...row }; 
  
  // Date Normalization (Core field for all exports)
  normalized.date = row[DB_FIELDS.date] || row[DB_FIELDS.dateAdded] || row[DB_FIELDS.noteDate] || '';
  
  // Synthesize common UI keys for internal logic (Sorting/Filtering)
  const rawPL = (row[DB_FIELDS.pl] || row.pl)?.toString()?.replace(/[₹,]/g, '');
  normalized.pl = parseFloat(rawPL) || 0;
  
  // Determine WIN/LOSS status from literal columns
  const wl = row[DB_FIELDS.isWin];
  normalized.isWin = wl === 'WIN' || row[DB_FIELDS.winFlag] == 1 || normalized.pl > 0;
  
  normalized.id = row.id;
  
  // Robust Date Parsing
  const rawDateStr = row[DB_FIELDS.date] || row[DB_FIELDS.dateAdded];
  let jsDate = new Date(rawDateStr);
  
  // Fallback for tricky strings like "April 9, 2026 14:16 (GMT+5:30)"
  if (isNaN(jsDate.getTime()) && rawDateStr) {
    const parts = rawDateStr.split(' ');
    if (parts.length >= 3) {
      jsDate = new Date(`${parts[0]} ${parts[1]} ${parts[2]}`);
    }
  }

  normalized.jsDate = isNaN(jsDate.getTime()) ? new Date() : jsDate;
  normalized.fullDate = normalized.jsDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Synthesize common UI keys for internal logic (Sorting/Filtering)
  normalized.month = normalized.jsDate.toLocaleString('default', { month: 'long' });
  normalized.year = normalized.jsDate.getFullYear().toString();
  normalized.dayNum = normalized.jsDate.getDate(); // Fixed for Heatmap

  // Standardized shorthand keys for App.jsx and ReviewTab.jsx logic
  const cleanedPL = String(row[DB_FIELDS.pl] || '0').replace(/[^0-9.-]/g, '');
  normalized.pl = parseFloat(cleanedPL) || 0;
  
  normalized.isWin = String(row[DB_FIELDS.isWin] || '').trim();
  normalized.market = row[DB_FIELDS.market] || '';
  normalized.emotion = row[DB_FIELDS.emotions] || 'Calm';
  normalized.emotions = normalized.emotion; 
  
  normalized.quality = row[DB_FIELDS.tradeQuality] || 'A';
  normalized.tradeQuality = normalized.quality;
  
  normalized.status = row[DB_FIELDS.tradeStatus] || 'Neutral';
  normalized.tradeStatus = normalized.status;
  
  normalized.lots = parseFloat(row[DB_FIELDS.positionSize]) || 0;
  normalized.positionSize = normalized.lots;
  
  normalized.lossReason = row[DB_FIELDS.lossReason] || 'Unspecified';
  normalized.strategy = row[DB_FIELDS.strategy] || 'Misc';
  normalized.reason = row[DB_FIELDS.reason] || '';
  normalized.rr = row[DB_FIELDS.rr] || '0';
  normalized.learning = row[DB_FIELDS.learning] || '';
  normalized.direction = row[DB_FIELDS.direction] || 'LONG';
  normalized.positionType = row[DB_FIELDS.positionType] || 'Intraday';
  normalized.tradeMode = row[DB_FIELDS.tradeMode] || 'Buying';
  normalized.winFlag = row[DB_FIELDS.winFlag] || '0';
  normalized.learning = row[DB_FIELDS.learning] || ''; 

  // Note Specific Normalization: Pure raw data pass-through
  normalized.content = row[DB_FIELDS.noteContent] || row.content || '';
  
  // Map the raw 'Select' column value directly to category as requested
  normalized.category = row[DB_FIELDS.noteCategory] || row.category || '';
  
  // Votes Normalization
  normalized.votes = parseInt(row[DB_FIELDS.noteVotes] || row.votes) || 0;

  const rawPin = String(row[DB_FIELDS.notePinned] || row.pinned || '').toLowerCase().trim();
  normalized.pinned = rawPin === 'true' || rawPin === 'yes' || rawPin === '1' || row[DB_FIELDS.notePinned] === true;
  normalized.source = row[DB_FIELDS.noteSource] || '';
  
  // Setup Parsing (Standardized as array for App.jsx)
  const setupStr = row[DB_FIELDS.setups] || row[DB_FIELDS.strategy] || 'Misc';
  normalized.setups = setupStr.split(',').map(s => s.trim()).filter(Boolean);
  normalized.setup = normalized.setups[0] || 'Misc';

  normalized.screenshotUrl = row[DB_FIELDS.chartScreenshotUrl] || '';
  normalized.chartScreenshotUrl = normalized.screenshotUrl;

  // Market Categorization (Moved to prevent collision with Note categories)
  const indianKeywords = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'HDFC', 'SBIN', 'MCX'];
  const marketStr = (normalized.market || '').toUpperCase();
  const isIndian = indianKeywords.some(k => marketStr.includes(k));
  
  // Only set marketCategory if it's actually a trade record to avoid stomping on notes
  if (normalized.market) {
    normalized.marketCategory = isIndian ? 'Indian' : 'Other';
  }

  // Snapshot Logic
  normalized.imageUrl = row[DB_FIELDS.snapshotImage] || '';
  normalized.screenshotUrl = normalized.screenshotUrl || normalized.imageUrl; // Dual mapping for Gallery
  normalized.snapshotImage = normalized.imageUrl;
  
  normalized.title = row[DB_FIELDS.snapshotTags] || 'Daily Snapshot'; // For Gallery search
  normalized.date = row[DB_FIELDS.date] || row[DB_FIELDS.dateAdded] || '';

  // Snapshot Habit Keys (Unified mapping for HabitTracker.jsx)
  const isYes = (val) => val === 'YES' || val === 'true' || val === true || val === 'Yes';
  normalized.rulesFollowedBool = isYes(row[DB_FIELDS.rulesFollowed]);
  normalized.emotionsInControlBool = isYes(row[DB_FIELDS.emotionsInControl]);
  normalized.setupFollowedBool = isYes(row[DB_FIELDS.snapshotSetup]);

  // Snapshot Table Keys (Normalized for journalColumns.js)
  normalized.rulesFollowed = isYes(row[DB_FIELDS.rulesFollowed]) ? 'Yes' : 'No';
  normalized.emotionsInControl = isYes(row[DB_FIELDS.emotionsInControl]) ? 'Yes' : 'No';

  // Snapshot Table Keys (Normalized for journalColumns.js)
  normalized.noOfTrades = row[DB_FIELDS.noOfTrades] || '';
  normalized.tags = row[DB_FIELDS.snapshotTags] ? (typeof row[DB_FIELDS.snapshotTags] === 'string' ? row[DB_FIELDS.snapshotTags].split(',').map(s => s.trim()) : row[DB_FIELDS.snapshotTags]) : [];
  normalized.setup = isYes(row[DB_FIELDS.snapshotSetup]) ? 'Yes' : 'No';
  normalized.progress = row[DB_FIELDS.progress] || '';

  return normalized;
};

// Highly Optimized Column Strings (Based on DB_FIELDS)
// This ensures we never fetch unnecessary system metadata, saving bandwidth.
const SRC_COLS = {
  trades: `id, user_id, "${DB_FIELDS.date}", "${DB_FIELDS.market}", "${DB_FIELDS.direction}", "${DB_FIELDS.isWin}", "${DB_FIELDS.winFlag}", "${DB_FIELDS.pl}", "${DB_FIELDS.rr}", "${DB_FIELDS.reason}", "${DB_FIELDS.learning}", "${DB_FIELDS.strategy}", "${DB_FIELDS.setups}", "${DB_FIELDS.lossReason}", "${DB_FIELDS.emotions}", "${DB_FIELDS.positionSize}", "${DB_FIELDS.tradeQuality}", "${DB_FIELDS.tradeStatus}", "${DB_FIELDS.positionType}", "${DB_FIELDS.tradeMode}", "${DB_FIELDS.chartScreenshotUrl}"`,
  snapshots: `id, user_id, "${DB_FIELDS.dateAdded}", "${DB_FIELDS.snapshotImage}", "${DB_FIELDS.snapshotTags}", "${DB_FIELDS.noOfTrades}", "${DB_FIELDS.rulesFollowed}", "${DB_FIELDS.emotionsInControl}", "${DB_FIELDS.snapshotSetup}", "${DB_FIELDS.progress}"`,
  notes: `id, user_id, "${DB_FIELDS.noteDate}", "${DB_FIELDS.noteContent}", "${DB_FIELDS.noteCategory}", "${DB_FIELDS.notePinned}", "${DB_FIELDS.noteSource}", "${DB_FIELDS.noteVotes}"`,
  goals: `*` // Goals are usually small, select * is fine here
};

export const supabaseService = {
  /**
   * PURE RAW FETCH: For Bit-for-Bit Backup (No Normalization)
   */
  fetchRawTableData: async (tableName, userId) => {
    if (!userId) throw new Error("User ID required for raw export.");
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * TRADES: Real-time Subscription with User Isolation
   */
  subscribeToTrades: (userId, onUpdate, fullHistory = false) => {
    if (!userId) return () => {};

    // Initial Fetch with Limit or Full History
    let query = supabase
      .from('trades')
      .select(SRC_COLS.trades)
      .eq('user_id', userId)
      .order(DB_FIELDS.date, { ascending: false });
    
    if (!fullHistory) query = query.limit(100);

    query.then(({ data }) => {
      if (data) onUpdate(data.map(normalizeRow));
    });

    // INCREMENTAL REAL-TIME: Merging changes locally instead of re-fetching everything
    const channel = supabase
      .channel(`trades_${userId}`)
      .on('postgres_changes', 
        { event: '*', table: 'trades', filter: `user_id=eq.${userId}` }, 
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            onUpdate(prev => [normalizeRow(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            onUpdate(prev => prev.map(item => item.id === payload.new.id ? normalizeRow(payload.new) : item));
          } else if (payload.eventType === 'DELETE') {
            onUpdate(prev => prev.filter(item => item.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * SNAPSHOTS: Real-time Subscription with User Isolation
   */
  subscribeToSnapshots: (userId, onUpdate, fullHistory = false) => {
    if (!userId) return () => {};

    let query = supabase
      .from('snapshots')
      .select(SRC_COLS.snapshots)
      .eq('user_id', userId)
      .order(DB_FIELDS.dateAdded, { ascending: false });

    if (!fullHistory) query = query.limit(50);

    query.then(({ data }) => {
      if (data) onUpdate(data.map(normalizeRow));
    });

    const channel = supabase
      .channel(`snapshots_${userId}`)
      .on('postgres_changes', 
        { event: '*', table: 'snapshots', filter: `user_id=eq.${userId}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            onUpdate(prev => [normalizeRow(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            onUpdate(prev => prev.map(item => item.id === payload.new.id ? normalizeRow(payload.new) : item));
          } else if (payload.eventType === 'DELETE') {
            onUpdate(prev => prev.filter(item => item.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * NOTES: Real-time Subscription with User Isolation
   */
  subscribeToNotes: (userId, onUpdate, fullHistory = false) => {
    if (!userId) return () => {};

    let query = supabase
      .from('notes')
      .select(SRC_COLS.notes)
      .eq('user_id', userId)
      .order(DB_FIELDS.noteDate, { ascending: false });

    if (!fullHistory) query = query.limit(100);

    query.then(({ data }) => {
      if (data) onUpdate(data.map(normalizeRow));
    });

    const channel = supabase
      .channel(`notes_${userId}`)
      .on('postgres_changes', 
        { event: '*', table: 'notes', filter: `user_id=eq.${userId}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            onUpdate(prev => [normalizeRow(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            onUpdate(prev => prev.map(item => item.id === payload.new.id ? normalizeRow(payload.new) : item));
          } else if (payload.eventType === 'DELETE') {
            onUpdate(prev => prev.filter(item => item.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  /**
   * GOALS: Real-time Subscription with User Isolation
   */
  subscribeToGoals: (userId, onUpdate) => {
    if (!userId) return () => {};

    supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('startDate', { ascending: false })
      .then(({ data }) => {
        if (data) onUpdate(data);
      });

    const channel = supabase
      .channel(`goals_${userId}`)
      .on('postgres_changes', 
        { event: '*', table: 'goals', filter: `user_id=eq.${userId}` }, 
        async () => {
          const { data } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .order('startDate', { ascending: false });
          if (data) onUpdate(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * CRUD OPERATIONS with user_id enforcement
   */
  addTrade: async (userId, tradeData) => {
    const { data, error } = await supabase.from('trades').insert([{ ...tradeData, user_id: userId }]).select();
    if (error) throw error;
    return data?.[0];
  },
  updateTrade: async (userId, id, tradeData) => {
    const { data, error } = await supabase.from('trades').update(tradeData).eq('id', id).eq('user_id', userId).select();
    if (error) throw error;
    return data?.[0];
  },
  deleteTrade: async (userId, id) => {
    const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  addSnapshot: async (userId, data) => {
    const { data: result, error } = await supabase.from('snapshots').insert([{ ...data, user_id: userId }]).select();
    if (error) throw error;
    return result?.[0];
  },
  updateSnapshot: async (userId, id, data) => {
    const { data: result, error } = await supabase.from('snapshots').update(data).eq('id', id).eq('user_id', userId).select();
    if (error) throw error;
    return result?.[0];
  },
  deleteSnapshot: async (userId, id) => {
    const { error } = await supabase.from('snapshots').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  addNote: async (userId, data) => {
    // Transform boolean to Yes/No for database
    const dbPayload = {
      [DB_FIELDS.noteDate]: data.date,
      [DB_FIELDS.noteContent]: data.content,
      [DB_FIELDS.noteCategory]: data.category,
      [DB_FIELDS.notePinned]: data.isPinned ? "Yes" : "No",
      user_id: userId
    };
    const { data: result, error } = await supabase.from('notes').insert([dbPayload]).select();
    if (error) throw error;
    return result?.[0];
  },
  updateNote: async (userId, id, data) => {
    // Transform boolean to Yes/No for database
    const dbPayload = {
      [DB_FIELDS.noteDate]: data.date,
      [DB_FIELDS.noteContent]: data.content,
      [DB_FIELDS.noteCategory]: data.category,
      [DB_FIELDS.notePinned]: data.isPinned ? "Yes" : "No"
    };
    const { data: result, error } = await supabase.from('notes').update(dbPayload).eq('id', id).eq('user_id', userId).select();
    if (error) throw error;
    return result?.[0];
  },
  deleteNote: async (userId, id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  addGoal: async (userId, data) => {
    const { error } = await supabase.from('goals').insert([{ ...data, user_id: userId }]);
    if (error) throw error;
  },
  updateGoal: async (userId, id, data) => {
    const { error } = await supabase.from('goals').update(data).eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },
  deleteGoal: async (userId, id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  /**
   * VOTING: Increment/Update votes for a note
   */
  incrementNoteVotes: async (userId, noteId, newVotes) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ [DB_FIELDS.noteVotes]: newVotes })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select();
    
    if (error) throw error;
    return data?.[0] ? normalizeRow(data[0]) : null;
  },

  /**
   * STORAGE: Image Upload (partitioned by userId)
   */
  uploadImage: async (userId, file, subFolder = 'uploads') => {
    if (!file || !userId) return null;
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `${userId}/${subFolder}/${filename}`;
    
    const { error } = await supabase.storage
      .from('trading-media')
      .upload(storagePath, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('trading-media')
      .getPublicUrl(storagePath);

    return publicUrl;
  }
};
