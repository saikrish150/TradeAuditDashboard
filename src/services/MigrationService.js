import { collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

/**
 * migrationService
 * Handles parsing and syncing of Notion CSV data to Firebase Firestore and Storage.
 */
export const migrationService = {
  /**
   * Cleans currency strings (e.g., "₹50.00") into numbers.
   */
  cleanCurrency(val) {
    if (!val) return 0;
    const cleaned = val.toString().replace(/[₹,]/g, '').trim();
    return parseFloat(cleaned) || 0;
  },

  /**
   * Normalizes Notion dates to IST.
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    // Notion formats like "June 27, 2025 22:17 (GMT+5:30)" or "July 8, 2025"
    let cleanStr = dateStr.split('(')[0].trim();
    const date = new Date(cleanStr);
    return isNaN(date.getTime()) ? null : date;
  },

  /**
   * Converts Yes/No to Boolean.
   */
  parseBool(val) {
    if (!val) return false;
    const lower = val.toString().toLowerCase();
    return lower === 'yes' || lower === 'true' || lower === '1';
  },

  /**
   * Map Trading Journal DB columns
   */
  mapTradeRow(row) {
    return {
      market: row['Market'] || 'Unknown',
      strategy: row['Strategy'] || 'None',
      date: this.parseDate(row['Date']),
      pl: this.cleanCurrency(row['P/L']),
      direction: row['Direction'] || '',
      emotions: row['Emotions'] || '',
      lossReason: row['LOSS REASON '] || '', // Note the trailing space in Notion CSV
      learning: row['Learning '] || '',
      positionSize: row['Position Size(Lots)'] || '',
      positionType: row['Position Type'] || '',
      reasonForTrade: row['Reson For Trade'] || '',
      setups: row['Setups align with trade'] ? row['Setups align with trade'].split(',').map(s => s.trim()) : [],
      tradeQuality: row['Trade Quality'] || '',
      tradeStatus: row['Trade Status'] || '',
      tradeMode: row['Trade mode (Buying/Selling)'] || '',
      winFlag: parseInt(row['Win Flag']) || 0,
      isWin: row['W/L'] === 'W',
      chartScreenshotLocal: row['Chart Screenshot'] || '',
      originalData: row, // Preserve original as requested
      metadata: {
        source: 'Notion Migration',
        syncedAt: new Date().toISOString()
      }
    };
  },

  /**
   * Map Daily Snapshot columns
   */
  mapSnapshotRow(row) {
    return {
      date: this.parseDate(row['Date Added']),
      name: row['Name'] || '',
      imageLocal: row['Image'] || '',
      tags: row['Tags'] ? row['Tags'].split(',').map(t => t.trim()) : [],
      noOfTrades: parseInt(row['No of trades']) || 0,
      rulesFollowed: this.parseBool(row['Rules Followed']),
      emotionsInControl: this.parseBool(row['Emotions in Control ']),
      setup: row['Setup'] || '',
      progress: parseFloat(row['Progress']) || 0,
      originalData: row
    };
  },

  /**
   * Map Notes columns
   */
  mapNoteRow(row) {
    return {
      title: row['Name'] || 'Untitled Note',
      content: row['Note'] || '',
      category: row['Select'] || 'General',
      isPinned: this.parseBool(row['Pin']),
      source: row['Source '] || '',
      date: this.parseDate(row['Date']),
      createdAt: this.parseDate(row['Created time']),
      lastEditedAt: this.parseDate(row['Last edited time']),
      originalData: row
    };
  }
};
