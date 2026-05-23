# AI Neural Engine (Gemini Service)

## 1. Overview
The Trader Dashboard utilizes the **Google Gemini API** to act as a "Virtual Quant Analyst" for the trader. Unlike basic chatbot integrations, this AI engine is deeply wired into the application's statistical state and runs specific analytical frameworks.

The engine is encapsulated in the `src/services/geminiService.js` singleton.

---

## 2. Model Fallback Matrix
The API utilizes a highly resilient fallback matrix to prevent rate-limiting on the free tier (15 requests/minute). If a model returns a `429 (Too Many Requests)` or `404`, it automatically degrades gracefully.

```javascript
const models = [
  { name: 'gemini-flash-latest', ver: 'v1beta' },
  { name: 'gemini-2.5-flash', ver: 'v1beta' },
  { name: 'gemini-3.1-flash-lite', ver: 'v1beta' },
  { name: 'gemini-2.0-flash', ver: 'v1beta' },
  { name: 'gemini-1.5-flash', ver: 'v1' }
];
```

---

## 3. Data Formatting Strategy
To prevent prompt-bloat and remain within the context window limits, `geminiService` intercepts the heavy `useTradeData` output and reduces it into a dense string format.

### 3.1 `_buildStatsString`
Extracts high-level totals: Win Rate, P&L, Drawdown, Profit Factor.

### 3.2 `_buildRawTradeList`
Parses the last 60 trades chronologically into single-line telemetry logs:
`1. [05/23/2026] NIFTY | Setup: Breakout | Win | P/L: ₹4500 | Lot: 50 | Emotion: Calm | Error: None`

This ensures the AI is not hallucinating trends, but analyzing absolute execution history.

---

## 4. Prompt Engineering Modes
The service supports 4 distinct execution modes:

### 4.1 Daily Briefing Mode
* **Trigger**: Modal loads on app launch (`DailyBriefingPopup.jsx`).
* **Input**: Yesterday's data vs. Last 30 Days.
* **Objective**: Generate a quick 3-bullet prep sheet for the trader focusing on *immediate* threats (e.g., "You are overleveraging post-loss").

### 4.2 Deep Neural Audit
* **Trigger**: Clicked manually in `AIAuditTab.jsx`.
* **Objective**: A brutal, no-nonsense audit. The prompt forces Gemini to act as an Institutional Risk Manager, stripping away filler words and formatting the response into `## Structural Weaknesses` and `## Edge Verification`.

### 4.3 Setup Strategy Builder
* **Objective**: Isolates the `setupAnalysisMap`. The AI looks specifically at Win Rates grouped by tag (e.g., "Breakout" vs. "Pullback") and suggests allocating more capital to the mathematically superior setup.

### 4.4 Monthly Performance Review
* **Objective**: Aggregates the `monthData` matrix. Generates a comparative analysis identifying MoM growth or regression.

---

## 5. Caching Layer (`localStorage`)
Because the Gemini Free Tier is rate-limited, all AI audits are cached to prevent double-execution:
* **Key Format**: `tr_gemini_cache_[taskType]`
* **TTL (Time to Live)**: `24 * 60 * 60 * 1000` (24 Hours)
* **Bypass**: Users can force a re-generation by deleting the cache via the UI.
