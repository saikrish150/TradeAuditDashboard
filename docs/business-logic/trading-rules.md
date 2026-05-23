# Trading Rules & Metrics Calculations

## 1. Overview
The Trader Dashboard derives all performance analytics entirely on the client-side within the custom `useTradeData.js` hook. This document outlines the mathematical rules, edge cases, and derivation methods used to convert raw, normalized trades into high-level institutional metrics.

## 2. Global Filtering & Date Presets
Before any math is calculated, the raw trade array is piped through a strict filtering system to isolate the active "Sample Size".

* **Global Modifiers**: Hard filters by `selectedYear`, `selectedMonth`, and `selectedDay`.
* **Date Presets (Rolling Windows)**:
  * `CurrentMonth`: Only allows trades matching `curMonthName` and `curYearName`.
  * `30/60/90 Days`: Uses strict JavaScript Date math: `Math.ceil(Math.abs(now - tDate) / 86400000) > daysLimit`.
  * `Custom`: Allows bounding by `startDate` and `endDate`.
* **Category Filters**: Allows filtering strictly by `selectedAsset` (e.g., NIFTY) or `selectedCategory`.

*If the resulting array has `length === 0`, the hook immediately returns an `isEmpty: true` object to prevent mathematical `NaN` or `Infinity` errors downstream.*

---

## 3. Core Expectancy Metrics

Once the filtered array is established, a single heavy `O(n)` loop `filtered.forEach((t, i) => {...})` calculates all running totals.

### 3.1 Win/Loss Boolean Logic
Determining whether a trade is a "Win" or "Loss" involves strict precedence rules to account for missing string flags:
1. **Explicit Flags**: Checks if `t.isWin` string matches `WIN`, `W`, `LOSS`, `L`.
2. **P&L Fallback**: If the explicit flag is ambiguous (e.g., `Neutral`), it falls back to the actual P&L value:
   * **Win**: `tPL > 0` AND NOT explicitly labeled as "Loss" or "Break Even".
   * **Loss**: `tPL < 0` AND NOT explicitly labeled as "Running" or "Break Even".

### 3.2 Primary Metrics Math
* **Win Rate (`winRateValue`)**: `(winCount / tradeTotalCount) * 100` (Fixed to 1 decimal).
* **Average Win (`avgWin`)**: `winTotal / (winCount || 1)`
* **Average Loss (`avgLoss`)**: `lossTotal / (tradeTotalCount - winCount || 1)`
* **Profit Factor (`pf`)**: `winTotal / (lossTotal || 1)`
* **Expectancy**: Average P&L per trade in the sample: `(cumulativePL / tradeTotalCount)`.

### 3.3 Drawdown & Streaks
* **Peak Equity (`peakEquity`)**: Continuously tracks the highest `cumulativePL` point in the loop.
* **Maximum Drawdown (`maxDDValue`)**: Continuously calculates `cumulativePL - peakEquity`. If this dips lower than the current `maxDDValue`, it updates.
* **Profit to Drawdown Ratio (`profitDD`)**: A critical institutional metric measuring risk-adjusted returns: `(cumulativePL / Math.abs(maxDDValue || 1))`.

---

## 4. Behavioral & Setup Analysis

The dashboard goes beyond raw P&L, calculating behavioral analytics to map psychology to monetary outcomes.

### 4.1 Setup Analysis (`setupAnalysisMap`)
Maps P&L, Win Rate, and Risk/Reward to specific setup strategies (e.g., "Breakout", "Mean Reversion").
* **Handling Multiple Setups**: If a single trade contains an array `t.setups` (e.g., `["A+", "Pullback"]`), the P&L is attributed fully to *both* tags in the map to track individual factor performance.

### 4.2 Emotion & Quality Mapping (`emotionalPnlMap`, `qualityPnlMap`)
Groups P&L sums by strings like `FOMO`, `Revenge`, `Calm`, `A-Quality`.
* **Revenge Trading Tracker**: If the `t.emotion` string contains the word `revenge`, the absolute loss is tracked in `revengeLoss`.
* **Psychology Score**: `100 - (Math.abs(revengeLoss) / (winTotal || 1) * 100)`. Punishes the trader's total score based on how much of their gross profit was destroyed by revenge trading.
* **Discipline Score**: `(ruleAlignedCount / (tradeTotalCount || 1)) * 100`. The percentage of trades manually tagged as `A` or `B` quality.

---

## 5. The "AI Brief" Generation Engine
The `generateBrief` function is a local mathematical parser that creates an instant text briefing *before* Gemini is even invoked.

1. **Trader Profiling**:
   * `Consistent & Profitable`: Win Rate $\ge$ 50% & R/R $\ge$ 1.5
   * `Low Strike, High Reward`: Win Rate < 40% & R/R $\ge$ 2.0
   * `High Strike, Poor Risk`: Win Rate $\ge$ 60% & R/R < 1.0
   * `High Risk of Ruin`: Win Rate < 50% & R/R < 1.0
2. **"The One Good Trade" Metric**: Isolates the top 3 worst trades in the sample, sums their losses, and shows the user a "What-If" scenario: *"If you eliminated your 3 worst trades, your P&L would jump from X to Y."*
3. **Dynamic Priority Steps**: A rule-based array pushes action items based on mathematical triggers (e.g., if R/R < 1.2, it warns the user to let winners run).
