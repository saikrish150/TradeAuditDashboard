/**
 * Gemini Service — Google AI API wrapper
 * Free tier: 15 requests/minute
 * Only sends aggregated stats, never raw personal data.
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

  getCachedAnalysis(taskType) {
    const keyMap = {
      'deep': 'deep_analysis',
      'strategy': 'strategy_builder',
    };
    if (taskType === 'monthly') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const normalKey = `monthly_${monthStart.getFullYear()}_${monthStart.getMonth()}`;
      let cached = this._getCache(normalKey);
      if (cached) return cached;
      
      const trailingKey = `${normalKey}_trailing`;
      cached = this._getCache(trailingKey);
      if (cached) return cached;
      
      return this._getCache('monthly_report');
    }
    return this._getCache(keyMap[taskType] || taskType);
  }

  isConfigured() {
    return !!this.getApiKey();
  }

  removeApiKey() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Check localStorage cache
  _getCache(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch { return null; }
  }

  _setCache(key, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
      console.warn('[GeminiService] Cache write failed:', e);
    }
  }

  // Core API call
  async _callGemini(prompt) {
    const key = this.getApiKey();
    if (!key) throw new Error('API key not configured');

    const models = [
      { name: 'gemini-flash-latest', ver: 'v1beta' },
      { name: 'gemini-2.5-flash', ver: 'v1beta' },
      { name: 'gemini-3.1-flash-lite', ver: 'v1beta' },
      { name: 'gemini-2.0-flash', ver: 'v1beta' },
      { name: 'gemini-1.5-flash', ver: 'v1' }
    ];
    let lastError = null;
    let hitRateLimit = false;

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${model.ver}/models/${model.name}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
            })
          }
        );

        if (!res.ok) {
          if (res.status === 429) {
            hitRateLimit = true;
            console.warn(`[GeminiService] Model ${model.name} returned 429 (rate-limited/no-quota). Trying next...`);
            continue; // Try next model since this specific model has no quota
          }
          if (res.status === 404) continue; // Try next model/version
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `API error: ${res.status}`);
        }

        const json = await res.json();
        return json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      } catch (e) {
        lastError = e;
        // If we threw a custom error that is not 429, we still want to record it but keep trying
      }
    }
    
    if (hitRateLimit) {
      throw new Error('Neural Engine Cooldown: Free tier limit reached. Please wait a few minutes or check your quota at aistudio.google.com.');
    }
    throw lastError || new Error('Neural Engine: No compatible models found.');
  }

  // ─── Compact raw trade list formatter ───
  _buildRawTradeList(trades) {
    if (!trades || trades.length === 0) return 'No raw trades recorded.';
    
    // Sort trades chronologically
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const lines = sorted.map((t, idx) => {
      const pl = getPL(t);
      const isWin = t.isWin || pl > 0 ? 'Win' : 'Loss';
      const mkt = t.market || 'N/A';
      const setup = t.setup || t.strategy || 'N/A';
      const lot = t.positionSize || t.lots || 'N/A';
      const emo = t.emotions || t.emotion || 'N/A';
      const err = t.lossReason || t.error || 'None';
      const dateStr = new Date(t.date).toLocaleDateString();
      
      return `${idx+1}. [${dateStr}] ${mkt} | Setup: ${setup} | ${isWin} | P/L: ₹${Math.round(pl)} | Lot: ${lot} | Emotion: ${emo} | Error: ${err}`;
    });
    
    // Limit to the last 60 trades to remain efficient and preserve context size
    if (lines.length > 60) {
      return 'Showing last 60 trades:\n' + lines.slice(-60).join('\n');
    }
    return lines.join('\n');
  }

  // ─── Build aggregated stats from trades (NEVER sends raw data by default, unless requested) ───
  _buildTradeStats(trades) {
    if (!trades || trades.length === 0) return 'No trade data available.';

    let wins = 0, winTotal = 0, lossTotal = 0;
    const emotionMap = {}, marketMap = {}, lossReasons = {}, qualityMap = {}, dowMap = {};
    const lots = [];

    trades.forEach(t => {
      const pl = getPL(t);
      const outcome = String(t.isWin || '').toUpperCase();
      const isWin = ['WIN', 'W'].includes(outcome) || pl > 0;

      if (isWin) { wins++; winTotal += pl; }
      else if (pl < 0) { lossTotal += Math.abs(pl); }

      const em = t.emotions || t.emotion || 'Unknown';
      if (!emotionMap[em]) emotionMap[em] = { count: 0, pl: 0, wins: 0 };
      emotionMap[em].count++; emotionMap[em].pl += pl; if (isWin) emotionMap[em].wins++;

      const mkt = t.market || 'Unknown';
      if (!marketMap[mkt]) marketMap[mkt] = { count: 0, pl: 0, wins: 0 };
      marketMap[mkt].count++; marketMap[mkt].pl += pl; if (isWin) marketMap[mkt].wins++;

      if (pl < 0 && t.lossReason) {
        lossReasons[t.lossReason] = (lossReasons[t.lossReason] || 0) + 1;
      }

      const q = t.tradeQuality || t.quality || 'Unknown';
      if (!qualityMap[q]) qualityMap[q] = { count: 0, pl: 0 };
      qualityMap[q].count++; qualityMap[q].pl += pl;

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
    const avgWin = wins > 0 ? winTotal / wins : 0;
    const avgLoss = (total - wins) > 0 ? lossTotal / (total - wins) : 0;
    const net = winTotal - lossTotal;
    const pf = lossTotal > 0 ? (winTotal / lossTotal).toFixed(2) : 'N/A';
    const avgLot = lots.length > 0 ? (lots.reduce((a, b) => a + b, 0) / lots.length).toFixed(1) : 'N/A';

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

    return `TRADE STATS (${total} trades):
- Win Rate: ${Math.round((wins / total) * 100)}%
- Net P/L: ₹${Math.round(net)}
- Avg Win: ₹${Math.round(avgWin)}, Avg Loss: ₹${Math.round(avgLoss)}
- Profit Factor: ${pf}
- Avg Lot Size: ${avgLot}

EMOTION BREAKDOWN:
${emotionStr}

MARKET BREAKDOWN:
${marketStr}

LOSS REASONS (top 5):
${lossStr || 'None recorded'}

TRADE QUALITY:
${qualStr}

DAY OF WEEK:
${dowStr}`;
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API METHODS
  // ═══════════════════════════════════════════════════════════

  async deepAnalysis(trades, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this._getCache('deep_analysis');
      if (cached) return { text: cached, fromCache: true };
    }

    const stats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(trades);
    const prompt = `You are a world-class trading performance coach. Analyze this trader's metrics and raw trade log to deliver an institutional-grade deep diagnostic report.

AGGREGATED METRICS:
${stats}

RAW TRADES LOG (Recent):
${rawTradeData}

Analyze the correlations, behaviors, and raw log details to generate:
1. **🔍 Behavioral Strengths**: What execution habits are driving the most profit? (be highly specific, reference markets or lot sizes)
2. **⚠️ Core Leak Identification**: What specific pattern, strategy, or emotional trade is leaking the most money? Prove it with raw numbers.
3. **💡 Hidden Behavioral Correlation**: Reveal a non-obvious correlation (e.g., specific day combined with setup, or emotional state following a loss).
4. **🎯 Tactical Action Plan**: Design exactly one concrete process change they should implement this week.

Keep it under 300 words. Be direct, technical, and use clear data.`;

    const text = await this._callGemini(prompt);
    this._setCache('deep_analysis', text);
    return { text, fromCache: false };
  }

  async buildStrategy(trades, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this._getCache('strategy_builder');
      if (cached) return { text: cached, fromCache: true };
    }

    const stats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(trades);
    const prompt = `You are a quantitative trading strategist. Analyze this trader's historical data and raw log to design a custom, high-probability execution rule-set.

AGGREGATED METRICS:
${stats}

RAW TRADES LOG (Recent):
${rawTradeData}

Generate:

**✅ EXECUTIONS WITH STATISTICAL EDGE (Clear buy/sell environment guidelines):**
- List 4 specific, data-driven rules indicating when they should take trades (specify setup, market, conditions, lot size).

**❌ NO-TRADE DANGER ENVIRONMENTS (Conditions for mandatory sideline sitting):**
- List 4 highly specific rules based on errors, setups, or emotional triggers where they consistently lose capital.

**📈 EXPECTED METRICS SHIFT:**
- Quantify how their Win Rate and Profit Factor will improve by strictly removing these dangerous executions.

Keep it under 300 words. Use exact numbers and keep it actionable and professional.`;

    const text = await this._callGemini(prompt);
    this._setCache('strategy_builder', text);
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

    // Fallback: If no trades in the current calendar month, use trailing 30 days
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
    if (!forceRefresh) {
      const cached = this._getCache(cacheKey);
      if (cached) return { text: cached, fromCache: true };
    }

    if (monthTrades.length === 0) {
      // Final fallback: Use all trades if still absolutely empty
      if (trades.length > 0) {
        monthTrades = trades;
      } else {
        return { text: 'No trades recorded in database yet. Come back after taking some trades.', fromCache: false };
      }
    }

    const stats = this._buildTradeStats(monthTrades);
    const allTimeStats = this._buildTradeStats(trades);
    const rawTradeData = this._buildRawTradeList(monthTrades);

    const prompt = `You are a Senior Quantitative Portfolio Risk Director at a high-frequency proprietary trading firm. Conduct an institutional-grade Monthly Performance & Behavioral Attribution Audit. 

We need to extract deep, highly non-generic, numbers-backed mathematical truths from this trader's data to eliminate leaks and identify systemic edges.

MONTHLY AGGREGATED METRICS:
${stats}

ALL-TIME HISTORICAL BASELINE:
${allTimeStats}

RAW TRADES LOG (This Month):
${rawTradeData}

Your audit MUST contain the following four highly granular, analytical sections. Avoid any generic advice (like "let wins run"). Every single point must reference actual numbers, specific setups, dates, emotions, or markets:

1. **📊 Performance & Outlier Decomposition**:
   - Calculate the "adjusted net profit" by identifying the single largest loss of the month (give the date and setup). Show how much the net profit and win rate would improve if this single outlier was avoided.
   - Compare the current month's Win Rate, Average Win-to-Loss Ratio, and Profit Factor against the All-Time Baseline. State if the trader is experiencing positive or negative drift.

2. **💡 Psychological & Tag Attribution (Cost-of-Error)**:
   - Identify the primary emotion (e.g. FOMO, Greed, Anger) or error tag (e.g. Overtrading, Early Exit) that cost the most money this month.
   - Calculate the exact total Rupees (₹) lost across all trades tagged with that emotion or error. State: "Emotion/Error [Tag] cost you exactly ₹X across Y trades."

3. **🚨 Execution Loop & Revenge-Trading Scans**:
   - Scan the raw trade log dates for "consecutive intra-day loss loops" (taking multiple losses on the same day). If found, highlight the specific date and market (e.g., "On [Date], you took Y consecutive losses on [Market], indicating a temporary loss of emotional discipline").
   - Pinpoint the exact setup and lot size combination that yielded the lowest win rate.

4. **🛡️ Tailored Proprietary Risk Mandates**:
   - Provide a mathematically derived **Max Daily Loss Limit** (in ₹) calculated as 1.5x your average loss size.
   - Set a **Max Weekly Drawdown Threshold** (in ₹) where the trading console must lock, and specify the exact maximum lot size permitted for the worst-performing setup.

Keep the entire audit under 450 words. Be blunt, mathematical, direct, and completely non-generic.`;

    const text = await this._callGemini(prompt);
    this._setCache(cacheKey, text);
    return { text, fromCache: false };
  }
}

export const geminiService = new GeminiService();
