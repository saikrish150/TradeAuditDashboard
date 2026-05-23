# Frontend Architecture

## 1. Overview
The Trader Dashboard is built using **React 19** and bundled via **Vite**. The architecture prioritizes "Thick Client" performance, ensuring zero-latency data aggregation and parsing directly within the user's browser. 

---

## 2. Component Hierarchy & Decoupling
The core UI is orchestrated by `App.jsx`, but visual components are strictly decoupled into the `src/components/` structure to prevent render bottlenecks.

```
src/
├── App.jsx (Root State & Orchestrator)
├── hooks/
│   └── useTradeData.js (Heavy Math Engine)
├── components/
│   ├── Common/ (Re-usable UI & Glassmorphism widgets)
│   │   ├── CustomSelect.jsx
│   │   └── MobileNav.jsx
│   ├── Journal/ (Data Management & Logging)
│   │   ├── MasterTable.jsx
│   │   ├── AIAuditTab.jsx
│   │   └── UtilityHUB.jsx
│   └── AIInsights/ (Macro Intelligence & External Data)
│       └── AIInsightsView.jsx
```

## 3. UI Paradigm: The "Terminal" Layout
Unlike traditional scrolling websites, the Trader Dashboard uses a locked viewport paradigm.
* **Non-Scroll Container**: The main data wrapper utilizes `h-[calc(100vh-260px)]` to lock the application height to the exact monitor bounds.
* **Overflow Handling**: Inner tabs handle their own overflow via `.no-scrollbar` utility classes, mimicking a desktop application like a Bloomberg Terminal.

## 4. State Management Strategy
The application bypasses third-party state managers (Redux/Zustand) by utilizing deeply optimized React Primitives.

### 4.1 Root State (`App.jsx`)
* **`rawTrades`, `notes`, `goals`**: Sourced synchronously from `localStorage` during initial mount to ensure the UI renders in `0ms` before the Supabase async network call resolves.
* **`activeTab`, `activeSection`**: Simple string matching to handle conditional rendering of massive DOM sub-trees without relying on `react-router-dom` (reducing bundle size).

### 4.2 Mathematical Isolation
All P&L aggregation is abstracted into the `useTradeData.js` custom hook.
* **Memoization (`useMemo`)**: The entire derivation pipeline is wrapped in a massive `useMemo` dependency array tracking `[rawTrades, selectedYear, datePreset]`.
* **Render Guarantee**: The heavy `O(n)` loops calculating Streaks, Drawdowns, and Expectations will **only** re-execute if the filter dependencies or trade arrays mutate, never on a UI tab swap.

## 5. Styling Ecosystem
* **Tailwind CSS**: Core layout engine.
* **Custom CSS (`index.css`)**: Injects critical aesthetic variables and `@keyframes`.
  * `.modern-glass`: A core utility defining `backdrop-blur-xl`, `bg-black/40`, and micro-borders (`border-white/5`) to create the deep institutional dark mode aesthetic.
  * `.glow-text`: Applies golden-hour text masking using `bg-gradient-to-r`.
* **Framer Motion**: Manages layout shifts (`<AnimatePresence>`) for modals (`DailyBriefingPopup.jsx`) and tab transitions to ensure butter-smooth 60fps UI feedback.
