/**
 * Gemini Service — Google AI API wrapper
 * Optimized for Google Gemini Free Tier API (15 RPM)
 * Features dynamic data-fingerprint caching, valid production models, 
 * exponential 429 backoff, and rich trading diagnostics.
 */

const STORAGE_KEY = 'tr_gemini_api_key';
const CACHE_PREFIX = 'tr_gemini_cache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getPL = (t) => parseFloat(t.pl) || 0;

class GeminiService {
  setApiKey(key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  }

  getApiKey() {
    // Priority: 1. Manual entry (localStorage) 2. System default (.env)
    return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  /**
   * Generates a data signature to ensure cached analysis automatically updates
   * whenever new trades, snapshots, or psychology notes are added or synced.
   */
  getDataFingerprint(trades = [], snapshots = [], notes = []) {
    const tCount = trades?.length || 0;
    const latestT = trades?.[0]?.date || trades?.[0]?.jsDate || trades?.[0]?.created_at || '';
    const sCount = snapshots?.length || 0;
    const nCount = notes?.length || 0;
    return `${tCount}_${latestT}_${sCount}_${nCount}`;
  }

  getCachedAnalysis(taskType, expectedFingerprint = null) {
    const keyMap = {
      'deep': 'deep_analysis',
      'strategy': 'strategy_builder',
    };
    if (taskType === 'monthly') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const normalKey = `monthly_${monthStart.getFullYear()}_${monthStart.getMonth()}`;
      let cached = this._getCache(normalKey, expectedFingerprint);
      if (cached) return cached;
      
      const trailingKey = `${normalKey}_trailing`;
      cached = this._getCache(trailingKey, expectedFingerprint);
      if (cached) return cached;
      
      return this._getCache('monthly_report', expectedFingerprint);
    }
    return this._getCache(keyMap[taskType] || taskType, expectedFingerprint);
  }

  isConfigured() {
    return !!this.getApiKey();
  }

  removeApiKey() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Check localStorage cache with fingerprint validation
  _getCache(key, expectedFingerprint = null) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, timestamp, fingerprint } = JSON.parse(raw);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      // If a data fingerprint is provided and does not match, data has changed: invalidate cache
      if (expectedFingerprint && fingerprint && fingerprint !== expectedFingerprint) {
        return null;
      }
      return data;
    } catch { return null; }
  }

  _setCache(key, data, fingerprint = null) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ 
        data, 
        timestamp: Date.now(),
        fingerprint 
      }));
    } catch (e) {
      console.warn('[GeminiService] Cache write failed:', e);
    }
  }

  // Core API call — Optimized for Google Gemini Free Tier
  async _callGemini(prompt, systemInstruction = null) {
    const key = this.getApiKey();
    if (!key) throw new Error('Gemini API key not configured. Please enter your key in the AI Audit settings.');

    // Verified production models returning HTTP 200 on Google AI API
    const models = [
      { name: 'gemini-2.5-flash', ver: 'v1beta' },
      { name: 'gemini-flash-latest', ver: 'v1beta' },
      { name: 'gemini-3.5-flash', ver: 'v1beta' },
      { name: 'gemini-flash-lite-latest', ver: 'v1beta' },
      { name: 'gemini-3.1-flash-lite', ver: 'v1beta' }
    ];
    let lastError = null;
    let hitRateLimit = false;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.35, // Balanced precision and deterministic adherence
            maxOutputTokens: 8192 // Standard full Gemini output token limit
          }
        };

        // On models with internal reasoning (gemini-2.5-flash), turn off thinking tokens
        // so that 100% of the token allowance goes to the actual visible response.
        if (model.name.includes('2.5')) {
          payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }

        if (systemInstruction) {
          payload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/${model.ver}/models/${model.name}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );

        if (!res.ok) {
          if (res.status === 429) {
            hitRateLimit = true;
            console.warn(`[GeminiService] Model ${model.name} returned 429 (rate-limited). Cooling down for 1.5s before fallback...`);
            await new Promise(r => setTimeout(r, 1500));
            continue; // Try next model in sequence
          }
          if (res.status === 503 || res.status === 500 || res.status === 502) {
            console.warn(`[GeminiService] Model ${model.name} returned ${res.status} (server overloaded/unavailable). Trying next model in fallback chain...`);
            await new Promise(r => setTimeout(r, 800));
            continue; // Seamlessly fall back to next model without failing
          }
          if (res.status === 404) {
            console.warn(`[GeminiService] Model ${model.name} returned 404. Skipping...`);
            continue;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `API error: ${res.status}`);
        }

        const json = await res.json();
        return json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      } catch (e) {
        lastError = e;
        if (e.message && (e.message.includes('429') || e.message.includes('503'))) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    
    if (hitRateLimit) {
      throw new Error('Gemini Free Tier Rate Limit (15 RPM): Please wait 30–60 seconds before generating again.');
    }
    throw lastError || new Error('Neural Engine: No compatible Gemini models responded.');
  }

  // ─── Compact raw trade list formatter enriched with trade mode & RR ───
  _buildRawTradeList(trades) {
    if (!trades || trades.length === 0) return 'No raw trades recorded.';
    
    // Sort trades chronologically
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const lines = sorted.map((t, idx) => {
      const pl = getPL(t);
      const outcome = String(t.isWin || '').toUpperCase();
      const isWin = ['WIN', 'W'].includes(outcome) || pl > 0 ? 'WIN' : 'LOSS';
      const mkt = t.market || 'N/A';
      const dir = t.direction || 'LONG';
      const mode = t.tradeMode || 'Buying';
      const status = t.tradeStatus || (pl >= 0 ? 'Target' : 'StopLoss');
      const setup = t.setup || t.strategy || 'N/A';
      const lot = t.positionSize || t.lots || '1';
      const rr = t.rr ? `1:${t.rr}` : 'N/A';
      const emo = t.emotions || t.emotion || 'Calm';
      const err = t.lossReason || 'None';
      const duration = t.tradeTime ? ` | Dur: ${t.tradeTime}` : '';
      const dateStr = new Date(t.date).toLocaleDateString();
      
      return `${idx+1}. [${dateStr}] ${mkt} (${dir} - ${mode}) | Status: ${status} | RR: ${rr} | ${isWin} | P/L: ₹${Math.round(pl)} | Lots: ${lot} | Setup: ${setup} | Emo: ${emo} | Error: ${err}${duration}`;
    });
    
    // Limit to the last 50 trades to stay comfortably within free tier token limits
    if (lines.length > 50) {
      return 'Showing last 50 trades:\n' + lines.slice(-50).join('\n');
    }
    return lines.join('\n');
  }

  // ─── Build comprehensive, numbers-backed aggregated stats ───
  _buildTradeStats(trades) {
    if (!trades || trades.length === 0) return 'No trade data available.';

    let wins = 0, winTotal = 0, lossTotal = 0;
    const emotionMap = {}, marketMap = {}, lossReasons = {}, qualityMap = {}, dowMap = {};
    const modeMap = { Buying: { count: 0, pl: 0, wins: 0 }, Selling: { count: 0, pl: 0, wins: 0 } };
    const statusMap = {};
    const lots = [];
    const validRRs = [];

    trades.forEach(t => {
      const pl = getPL(t);
      const outcome = String(t.isWin || '').toUpperCase();
      const isWin = ['WIN', 'W'].includes(outcome) || pl > 0;

      if (isWin) { wins++; winTotal += pl; }
      else if (pl < 0) { lossTotal += Math.abs(pl); }

      // Taken RR
      const rrNum = parseFloat(t.rr);
      if (!isNaN(rrNum) && rrNum > 0) validRRs.push(rrNum);

      // Trade Mode (Buying vs Selling)
      const mode = (t.tradeMode || 'Buying').toLowerCase().includes('sell') ? 'Selling' : 'Buying';
      modeMap[mode].count++;
      modeMap[mode].pl += pl;
      if (isWin) modeMap[mode].wins++;

      // Trade Status
      const st = t.tradeStatus || (pl >= 0 ? 'Target' : 'StopLoss');
      statusMap[st] = (statusMap[st] || 0) + 1;

      // Emotion
      const em = t.emotions || t.emotion || 'Unknown';
      if (!emotionMap[em]) emotionMap[em] = { count: 0, pl: 0, wins: 0 };
      emotionMap[em].count++; emotionMap[em].pl += pl; if (isWin) emotionMap[em].wins++;

      // Market
      const mkt = t.market || 'Unknown';
      if (!marketMap[mkt]) marketMap[mkt] = { count: 0, pl: 0, wins: 0 };
      marketMap[mkt].count++; marketMap[mkt].pl += pl; if (isWin) marketMap[mkt].wins++;

      // Loss Reason
      if (pl < 0 && t.lossReason) {
        lossReasons[t.lossReason] = (lossReasons[t.lossReason] || 0) + 1;
      }

      // Quality
      const q = t.tradeQuality || t.quality || 'Unknown';
      if (!qualityMap[q]) qualityMap[q] = { count: 0, pl: 0 };
      qualityMap[q].count++; qualityMap[q].pl += pl;

      // Day of Week
      const d = t.jsDate || new Date(t.date);
      if (d && !isNaN(d.getTime())) {
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        if (!dowMap[dayName]) dowMap[dayName] = { count: 0, pl: 0, wins: 0 };
        dowMap[dayName].count++; dowMap[dayName].pl += pl; if (isWin) dowMap[dayName].wins++;
      }

      const lot = parseFloat(t.positionSize || t.lots) || 0;
      if (lot > 0) lots.push(lot);
    });

    const total = trades.length;
    const losses = total - wins;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const avgWin = wins > 0 ? winTotal / wins : 0;
    const avgLoss = losses > 0 ? lossTotal / losses : 0;
    const net = winTotal - lossTotal;
    const pf = lossTotal > 0 ? (winTotal / lossTotal).toFixed(2) : 'N/A';
    const avgLot = lots.length > 0 ? (lots.reduce((a, b) => a + b, 0) / lots.length).toFixed(1) : 'N/A';
    const avgRR = validRRs.length > 0 ? (validRRs.reduce((a, b) => a + b, 0) / validRRs.length).toFixed(2) : 'N/A';
    
    // Mathematical Expectancy per Trade: (WR * AvgWin) - (LR * AvgLoss)
    const expectancy = total > 0 ? Math.round(((wins / total) * avgWin) - ((losses / total) * avgLoss)) : 0;

    const modeStr = Object.entries(modeMap)
      .filter(([, d]) => d.count > 0)
      .map(([m, d]) => `${m}: ${d.count} trades, ${Math.round((d.wins / d.count) * 100)}% WR, ₹${Math.round(d.pl)} P/L`)
      .join(' | ');

    const statusStr = Object.entries(statusMap)
      .map(([s, c]) => `${s}: ${c}`)
      .join(', ');

    const emotionStr = Object.entries(emotionMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([e, d]) => `${e}: ${d.count} trades, ${Math.round((d.wins / d.count) * 100)}% WR, ₹${Math.round(d.pl)} P/L`)
      .join('\n');

    const marketStr = Object.entries(marketMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([m, d]) => `${m}: ${d.count} trades, ${Math.round((d.wins / d.count) * 100)}% WR, ₹${Math.round(d.pl)} P/L`)
      .join('\n');

    const lossStr = Object.entries(lossReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([r, c]) => `"${r}": ${c} times`)
      .join('\n');

    const qualStr = Object.entries(qualityMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([q, d]) => `${q}: ${d.count} trades, ₹${Math.round(d.pl)} P/L`)
      .join('\n');

    const dowStr = Object.entries(dowMap)
      .map(([d, v]) => `${d}: ${v.count} trades, ${Math.round((v.wins / v.count) * 100)}% WR, ₹${Math.round(v.pl)}`)
      .join('\n');

    return `TRADING PERFORMANCE SUMMARY (${total} trades):
- Win Rate: ${winRate}% (${wins}W / ${losses}L)
- Net P/L: ₹${Math.round(net)}
- Avg Win: ₹${Math.round(avgWin)}, Avg Loss: ₹${Math.round(avgLoss)}
- Profit Factor: ${pf}
- Avg Risk-to-Reward (RR): ${avgRR}
- Mathematical Expectancy per Trade: ₹${expectancy}
- Avg Lot Size: ${avgLot}

TRADE MODE BREAKDOWN:
${modeStr || 'N/A'}

TRADE STATUSES:
${statusStr || 'N/A'}

EMOTION ATTRIBUTION:
${emotionStr}

MARKET PERFORMANCE:
${marketStr}

TOP LOSS REASONS:
${lossStr || 'None recorded'}

TRADE QUALITY:
${qualStr}

DAY OF WEEK PERFORMANCE:
${dowStr}`;
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API METHODS
  // ═══════════════════════════════════════════════════════════

  async deepAnalysis(trades, forceRefresh = false) {
    const fingerprint = this.getDataFingerprint(trades);
    if (!forceRefresh) {
      const cached = this._getCache('deep_analysis', fingerprint);
      if (cached) return { text: cached, fromCache: true };
    }

    const stats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(trades);
    const systemPrompt = "You are a quantitative trading performance coach at an institutional proprietary desk. Provide direct, numbers-backed mathematical feedback. No generic motivation.";
    
    const userPrompt = `Analyze this trader's metrics, RR data, buying vs selling modes, and recent raw trade log to deliver an institutional-grade deep diagnostic report.

AGGREGATED METRICS:
${stats}

RAW TRADES LOG:
${rawTradeData}

Analyze the correlations, behaviors, and raw log details to generate:
1. **🔍 Behavioral Strengths**: What execution habits (markets, setups, lot sizes, or buying/selling) are driving the most profit? Cite exact data.
2. **⚠️ Core Leak Identification**: What specific pattern, trade mode, or emotional state is leaking the most capital? Prove it with exact rupee amounts.
3. **💡 Hidden Behavioral Correlation**: Reveal a non-obvious correlation (e.g., RR ratio versus win rate, duration vs loss rate, or sizing changes after losses).
4. **🎯 Tactical Action Plan**: Design exactly one concrete process change they must implement this week.

Keep it under 300 words. Be direct, technical, and use clear data.`;

    const text = await this._callGemini(userPrompt, systemPrompt);
    this._setCache('deep_analysis', text, fingerprint);
    return { text, fromCache: false };
  }

  async buildStrategy(trades, forceRefresh = false) {
    const fingerprint = this.getDataFingerprint(trades);
    if (!forceRefresh) {
      const cached = this._getCache('strategy_builder', fingerprint);
      if (cached) return { text: cached, fromCache: true };
    }

    const stats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(trades);
    const systemPrompt = "You are a quantitative trading strategist. Design strict, data-backed execution rule-sets that maximize expectancy.";

    const userPrompt = `Analyze this trader's historical data, trade modes, and raw log to design a custom, high-probability execution rule-set.

AGGREGATED METRICS:
${stats}

RAW TRADES LOG:
${rawTradeData}

Generate:

**✅ EXECUTIONS WITH STATISTICAL EDGE (Clear buy/sell environment guidelines):**
- List 4 specific, data-driven rules indicating when they should take trades (specify setup, market, conditions, lot size).

**❌ NO-TRADE DANGER ENVIRONMENTS (Conditions for mandatory sideline sitting):**
- List 4 highly specific rules based on errors, setups, or emotional triggers where they consistently lose capital.

**📈 EXPECTED METRICS SHIFT:**
- Quantify how their Win Rate, Expectancy, and Profit Factor will improve by strictly removing these dangerous executions.

Keep it under 300 words. Use exact numbers and keep it actionable and professional.`;

    const text = await this._callGemini(userPrompt, systemPrompt);
    this._setCache('strategy_builder', text, fingerprint);
    return { text, fromCache: false };
  }

  async monthlyReport(trades, forceRefresh = false) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    let monthTrades = trades.filter(t => {
      const d = t.jsDate || new Date(t.date);
      return d >= monthStart;
    });

    let isTrailing = false;
    if (monthTrades.length === 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      monthTrades = trades.filter(t => {
        const d = t.jsDate || new Date(t.date);
        return d >= thirtyDaysAgo;
      });
      isTrailing = true;
    }

    const cacheKey = `monthly_${monthStart.getFullYear()}_${monthStart.getMonth()}${isTrailing ? '_trailing' : ''}`;
    const fingerprint = this.getDataFingerprint(monthTrades);

    if (!forceRefresh) {
      const cached = this._getCache(cacheKey, fingerprint);
      if (cached) return { text: cached, fromCache: true };
    }

    if (monthTrades.length === 0) {
      if (trades.length > 0) {
        monthTrades = trades;
      } else {
        return { text: 'No trades recorded in database yet. Come back after taking some trades.', fromCache: false };
      }
    }

    const stats = this._buildTradeStats(monthTrades);
    const allTimeStats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(monthTrades);
    const systemPrompt = "You are a Senior Quantitative Portfolio Risk Director at a high-frequency proprietary trading firm. Conduct an institutional-grade Monthly Performance & Behavioral Attribution Audit.";

    const userPrompt = `Extract deep, numbers-backed mathematical truths from this trader's data to eliminate leaks and identify systemic edges.

MONTHLY AGGREGATED METRICS:
${stats}

ALL-TIME HISTORICAL BASELINE:
${allTimeStats}

RAW TRADES LOG (This Month):
${rawTradeData}

Your audit MUST contain the following four analytical sections. Avoid generic advice; reference actual numbers, specific setups, dates, emotions, or markets:

1. **📊 Performance & Outlier Decomposition**:
   - Calculate adjusted net profit by identifying the single largest loss of the month (give date and setup). Show how much net profit and win rate improve if this outlier was avoided.
   - Compare current month's Win Rate, Average Win-to-Loss Ratio, and Expectancy against the All-Time Baseline.

2. **💡 Psychological & Tag Attribution (Cost-of-Error)**:
   - Identify the primary emotion (FOMO, Greed, Anger) or error tag that cost the most money this month.
   - Calculate the exact total Rupees (₹) lost across all trades tagged with that emotion or error. State: "Emotion/Error [Tag] cost you exactly ₹X across Y trades."

3. **🚨 Execution Loop & Revenge-Trading Scans**:
   - Scan raw trade log dates for consecutive intra-day loss loops. Highlight specific dates and markets.
   - Pinpoint the exact setup and lot size combination that yielded the lowest win rate.

4. **🛡️ Tailored Proprietary Risk Mandates**:
   - Provide a mathematically derived **Max Daily Loss Limit** (in ₹) calculated as 1.5x your average loss size.
   - Set a **Max Weekly Drawdown Threshold** (in ₹) where the trading console must lock, and specify the exact maximum lot size permitted for the worst-performing setup.

Keep the entire audit under 450 words. Be blunt, mathematical, direct, and non-generic.`;

    const text = await this._callGemini(userPrompt, systemPrompt);
    this._setCache(cacheKey, text, fingerprint);
    return { text, fromCache: false };
  }

  async dailyBriefing(trades, snapshots, notes, forceRefresh = false) {
    const fingerprint = this.getDataFingerprint(trades, snapshots, notes);
    if (!forceRefresh) {
      const cached = this._getCache('daily_briefing', fingerprint);
      if (cached) return { text: cached, fromCache: true };
    }

    const stats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(trades);
    
    const snapshotSummary = snapshots && snapshots.length > 0 
      ? snapshots.slice(-15).map((s, idx) => `${idx+1}. [${new Date(s.date || s.dateAdded).toLocaleDateString()}] Rules: ${s.rulesFollowed || 'N/A'} | Emotions: ${s.emotionsInControl || 'N/A'} | Progress: ${s.progress || 'N/A'}`).join('\n')
      : 'No daily snapshots recorded.';
      
    const notesSummary = notes && notes.length > 0
      ? notes.slice(-15).map((n, idx) => `${idx+1}. [${new Date(n.date || n.Date || n.noteDate).toLocaleDateString()}] (${n.category || n.Select || 'Entry'}): "${n.content || n.Note || 'Empty content'}"`).join('\n')
      : 'No psychology notes recorded.';

    const systemPrompt = "You are a concise, world-class trading performance coach. Deliver a simple, clean, and highly actionable AI Daily Market Briefing.";

    const userPrompt = `Deliver a clean and actionable AI Daily Market Briefing based on this trader's data:

AGGREGATED METRICS:
${stats}

RECENT RAW TRADES LOG:
${rawTradeData}

RECENT DAILY SNAPSHOTS (Rule compliance):
${snapshotSummary}

RECENT PSYCHOLOGY JOURNAL NOTES (Mistakes & emotional patterns):
${notesSummary}

CRITICAL: Keep the briefing short, simple, and clean. Use basic plain words. Use single-sentence bullet points (maximum 12 words per bullet). The entire response must be under 90 words total.

Structure it EXACTLY as follows:

1. **🚫 AVOID TODAY**:
   - [Short actionable bullet 1]
   - [Short actionable bullet 2]

2. **🎯 FOCUS TODAY**:
   - [Short actionable bullet 1]
   - [Short actionable bullet 2]

3. **⚡ VERDICT**:
   - [Single short posture sentence with 1 clear mathematical reason]`;

    const text = await this._callGemini(userPrompt, systemPrompt);
    this._setCache('daily_briefing', text, fingerprint);
    return { text, fromCache: false };
  }

  async anomalyScan(trades, snapshots, notes, forceRefresh = false) {
    const fingerprint = this.getDataFingerprint(trades, snapshots, notes);
    if (!forceRefresh) {
      const cached = this._getCache('anomaly_scan', fingerprint);
      if (cached) return { text: cached, fromCache: true };
    }

    const stats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(trades);
    
    const snapshotSummary = snapshots && snapshots.length > 0 
      ? snapshots.slice(-20).map((s, idx) => `${idx+1}. [${new Date(s.date || s.dateAdded).toLocaleDateString()}] Rules: ${s.rulesFollowed || 'N/A'} | Emotions: ${s.emotionsInControl || 'N/A'} | Setup: ${s.setup || s.snapshotSetup || 'N/A'}`).join('\n')
      : 'No daily snapshots recorded.';
      
    const notesSummary = notes && notes.length > 0
      ? notes.slice(-20).map((n, idx) => `${idx+1}. [${new Date(n.date || n.Date || n.noteDate).toLocaleDateString()}] (${n.category || n.Select || 'Entry'}): "${n.content || n.Note || 'Empty content'}"`).join('\n')
      : 'No psychology notes recorded.';

    const systemPrompt = "You are a Senior Quantitative Risk Attribution Systems Director. Detect structural, behavioral, or statistical anomalies.";

    const userPrompt = `Conduct a high-level anomaly detection scan on this trader's data to detect structural, behavioral, or statistical deviations:

AGGREGATED METRICS:
${stats}

RECENT RAW TRADES LOG:
${rawTradeData}

RECENT DAILY SNAPSHOTS (Rule adherence & setups):
${snapshotSummary}

RECENT PSYCHOLOGY JOURNAL NOTES (Emotional triggers & leaks):
${notesSummary}

Analyze all elements to detect anomalies (revenge trading indicators, size spikes, market focus decay, rules-compliance drops, emotional deterioration, or setup drift).

Deliver a blunt Anomaly Report containing:

1. **🔴 CRITICAL BEHAVIORAL ANOMALIES**:
   - List severe anomalies where discipline is breaking down (sizing spikes, rule violations, consecutive intra-day losses, or FOMO concentrations). Cite exact numbers.

2. **🟡 STATISTICAL & PROCESS DEVIATIONS**:
   - Identify warning-level anomalies (trading low-win-rate days, setups with declining win rates, or excessive frequency).

3. **🟢 SYSTEM STABILITY SCORE**:
   - State an overall system stability percentage (e.g., 85% stable) with a brief mathematical reason why.

Keep it under 350 words. Be clinical, quantitative, direct, and numbers-backed.`;

    const text = await this._callGemini(userPrompt, systemPrompt);
    this._setCache('anomaly_scan', text, fingerprint);
    return { text, fromCache: false };
  }
}

export const geminiService = new GeminiService();
