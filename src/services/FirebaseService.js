import { 
  collection, query, orderBy, onSnapshot, getDocs, 
  doc, updateDoc, deleteDoc, writeBatch, addDoc, serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export const firebaseService = {
  /**
   * Internal helper to transform trade database documents for the UI
   */
  _transformTrade(doc) {
    const data = doc.data();
    let jsDate;
    if (data.date?.toDate) {
      jsDate = data.date.toDate();
    } else if (data.date) {
      jsDate = new Date(data.date);
    } else {
      jsDate = new Date();
    }

    let screenshotsArr = [];
    if (Array.isArray(data.chartScreenshotUrls)) {
      screenshotsArr = data.chartScreenshotUrls;
    } else if (data.chartScreenshotUrl) {
      screenshotsArr = data.chartScreenshotUrl.includes(',') 
        ? data.chartScreenshotUrl.split(',').map(s => s.trim())
        : [data.chartScreenshotUrl];
    }

    return {
      id: doc.id,
      ...data,
      dayNum: jsDate.getDate(),
      fullDate: jsDate.toDateString(),
      jsDate: jsDate,
      month: jsDate.toLocaleString('default', { month: 'long' }),
      year: jsDate.getFullYear().toString(),
      screenshotUrl: screenshotsArr[0] || null,
      screenshots: screenshotsArr,
      pl: parseFloat(data.pl) || 0,
      lots: parseFloat(data.positionSize || data.lots) || 0
    };
  },

  /**
   * Listen to trades collection (Limited for UI Performance)
   */
  subscribeToTrades(onData) {
    const q = query(collection(db, 'trades'), orderBy('date', 'desc'), limit(200));
    return onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => this._transformTrade(doc));
      onData(trades);
    });
  },

  /**
   * Fetch ALL trades (Bypasses UI limits for Full Backup)
   */
  async getAllTrades() {
    const q = query(collection(db, 'trades'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this._transformTrade(doc));
  },

  /**
   * Check if any data exists (to show/hide migration hub)
   */
  async hasData() {
    const q = query(collection(db, 'trades'), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  /**
   * Update a single trade
   */
  async updateTrade(id, data) {
    const tradeRef = doc(db, 'trades', id);
    return await updateDoc(tradeRef, data);
  },

  /**
   * Delete a single trade
   */
  async deleteTrade(id) {
    const tradeRef = doc(db, 'trades', id);
    return await deleteDoc(tradeRef);
  },

  /**
   * Bulk update trades
   */
  async bulkUpdateTrades(ids, data) {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const ref = doc(db, 'trades', id);
      batch.update(ref, data);
    });
    return await batch.commit();
  },

  /**
   * Bulk delete trades
   */
  async bulkDeleteTrades(ids) {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const ref = doc(db, 'trades', id);
      batch.delete(ref);
    });
    return await batch.commit();
  },

  /**
   * Add a new trade
   */
  async addTrade(tradeData) {
    return await addDoc(collection(db, 'trades'), {
      ...tradeData,
      date: tradeData.date || serverTimestamp(),
      createdAt: serverTimestamp()
    });
  },

  /**
   * Internal helper to transform simplified collections (Snapshots, Notes)
   */
  _transformGeneric(doc) {
    const data = doc.data();
    let jsDate = data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now());
    return { 
      id: doc.id, 
      ...data,
      jsDate: jsDate,
      date: jsDate.toDateString() 
    };
  },

  /**
   * Listen to daily snapshots (Limited for UI Performance)
   */
  subscribeToSnapshots(onData) {
    const q = query(collection(db, 'dailySnapshots'), orderBy('date', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      onData(snapshot.docs.map(doc => this._transformGeneric(doc)));
    });
  },

  /**
   * Fetch ALL Snapshots (Bypasses UI limits for Full Backup)
   */
  async getAllSnapshots() {
    const q = query(collection(db, 'dailySnapshots'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this._transformGeneric(doc));
  },

  /**
   * Add a daily snapshot
   */
  async addSnapshot(data) {
    return await addDoc(collection(db, 'dailySnapshots'), {
      ...data,
      date: data.date || serverTimestamp(),
      createdAt: serverTimestamp()
    });
  },

  /**
   * Update a daily snapshot
   */
  async updateSnapshot(id, data) {
    const itemRef = doc(db, 'dailySnapshots', id);
    return await updateDoc(itemRef, data);
  },

  /**
   * Delete a daily snapshot
   */
  async deleteSnapshot(id) {
    const itemRef = doc(db, 'dailySnapshots', id);
    return await deleteDoc(itemRef);
  },

  /**
   * Listen to notes (Limited for UI Performance)
   */
  subscribeToNotes(onData) {
    const q = query(collection(db, 'notes'), orderBy('date', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      onData(snapshot.docs.map(doc => this._transformGeneric(doc)));
    });
  },

  /**
   * Fetch ALL Notes (Bypasses UI limits for Full Backup)
   */
  async getAllNotes() {
    const q = query(collection(db, 'notes'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this._transformGeneric(doc));
  },

  /**
   * Add a note
   */
  async addNote(data) {
    return await addDoc(collection(db, 'notes'), {
      ...data,
      date: data.date || serverTimestamp(),
      createdAt: serverTimestamp()
    });
  },

  /**
   * Update a note
   */
  async updateNote(id, data) {
    const itemRef = doc(db, 'notes', id);
    return await updateDoc(itemRef, data);
  },

  /**
   * Delete a note
   */
  async deleteNote(id) {
    const itemRef = doc(db, 'notes', id);
    return await deleteDoc(itemRef);
  },

  /**
   * Listen to goals
   */
  subscribeToGoals(onData) {
    const q = query(collection(db, 'goals'), orderBy('startDate', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        // Goals use startDate and endDate strings (YYYY-MM-DD from input) 
        // but Firestore might store them as Timestamps if they were server-side generated.
        // We'll normalize them to strings for the UI.
        const normalize = (val) => val?.toDate ? val.toDate().toISOString().split('T')[0] : val;
        return { 
          id: doc.id, 
          ...data,
          startDate: normalize(data.startDate),
          endDate: normalize(data.endDate)
        };
      });
      onData(items);
    });
  },

  /**
   * Create or update a goal
   */
  async updateGoal(id, data) {
    if (id) {
      const ref = doc(db, 'goals', id);
      return await updateDoc(ref, data);
    } else {
      return await addDoc(collection(db, 'goals'), {
        ...data,
        createdAt: serverTimestamp()
      });
    }
  },

  /**
   * Data Integrity Repair: Synchronize all isWin values with actual P&L
   * Force all outcomes to Booleans (true/false) based on P&L performance.
   */
  async repairAllTradeOutcomes(onProgress) {
    const q = query(collection(db, 'trades'));
    const snapshot = await getDocs(q);
    const total = snapshot.docs.length;
    let updateCount = 0;
    
    // Chunk documents into batches of 400 (Stay safe under the 500 limit)
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 400);
      
      chunk.forEach(tradeDoc => {
        const data = tradeDoc.data();
        const plVal = parseFloat(data.pl) || 0;
        const expectedIsWin = plVal >= 0;
        
        // Only update if currently mismatched or not a boolean
        if (data.isWin !== expectedIsWin) {
          batch.update(tradeDoc.ref, { isWin: expectedIsWin });
          updateCount++;
        }
      });
      
      await batch.commit();
      if (onProgress) onProgress(Math.min(i + 400, total), total);
    }
    return { updateCount, total };
  }
};
