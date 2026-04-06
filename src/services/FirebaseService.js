import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const firebaseService = {
  /**
   * Listen to trades collection and transform for the UI
   */
  subscribeToTrades(onData) {
    const q = query(collection(db, 'trades'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => {
        const data = doc.data();
        let jsDate;
        
        // Handle different date formats (Timestamp vs ISO String)
        if (data.date?.toDate) {
          jsDate = data.date.toDate();
        } else if (data.date) {
          jsDate = new Date(data.date);
        } else {
          jsDate = new Date();
        }

        // Normalize screenshots (Handle single string, array, or comma-separated string)
        let screenshotsArr = [];
        if (Array.isArray(data.chartScreenshotUrls)) {
          screenshotsArr = data.chartScreenshotUrls;
        } else if (data.chartScreenshotUrl) {
          // If Notion exported multiple as "url1, url2", handle it
          screenshotsArr = data.chartScreenshotUrl.includes(',') 
            ? data.chartScreenshotUrl.split(',').map(s => s.trim())
            : [data.chartScreenshotUrl];
        }

        // Map to the internal format used by App.jsx analytics
        return {
          id: doc.id,
          pl: parseFloat(data.pl) || 0,
          strategy: data.strategy || 'None',
          setup: data.strategy || 'Uncategorized', 
          setups: data.setups || [], 
          emotion: data.emotions || 'Normal',
          reason: data.lossReason || '',
          learning: data.learning || '',
          quality: data.tradeQuality || 'Unrated',
          status: data.tradeStatus || 'Closed',
          direction: data.direction || 'N/A',
          lots: parseFloat(data.positionSize) || 0,
          market: data.market || 'Unknown',
          category: data.category || 'Other',
          dayNum: jsDate.getDate(),
          fullDate: jsDate.toDateString(),
          jsDate: jsDate,
          month: jsDate.toLocaleString('default', { month: 'long' }),
          year: jsDate.getFullYear().toString(),
          screenshotUrl: screenshotsArr[0] || null, // Fallback for single use
          screenshots: screenshotsArr // Full array for gallery/carousel
        };
      });
      onData(trades);
    });
  },

  /**
   * Check if any data exists (to show/hide migration hub)
   */
  async hasData() {
    const q = query(collection(db, 'trades'));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }
};
