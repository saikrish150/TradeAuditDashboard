# Frontend Components Catalog

## 1. Overview
The Trader Dashboard is a heavily componentized React application. Components are separated by concern, ensuring that the heavy math aggregation (`useTradeData`) does not cause unnecessary re-renders in visual layers.

## 2. Core Orchestrators

### `App.jsx`
* **Purpose**: The absolute root orchestrator. It manages the global `rawTrades` cache, handles the `activeTab` routing logic, and initializes the `useTradeData` payload.
* **Dependencies**: `supabaseService.js`, `authService.js`.
* **State Management**: Uses `useState` for filter toggles (Year, Month) and `useEffect` for the initial data hydration from Supabase.

### `TradingJournal.jsx`
* **Purpose**: Acts as the sub-router for the entire journaling ecosystem (Master Table, Calendar, Snapshots, Utility Hub).
* **Inputs**: Receives the fully parsed `useTradeData` object as props.
* **Performance**: Deeply memoizes child components to prevent the massive tables from re-rendering when minor UI elements toggle.

---

## 3. The Analytics Layer (`src/components/Journal/`)

### `MetricCard.jsx`
* **Purpose**: High-density metric display unit.
* **Logic**: Receives a `title`, `value`, and `trend`. Implements conditional Tailwind classes to glow `emerald` on positive trends and `rose` on negative trends. Uses Framer Motion for count-up animation on mount.

### `AIAuditTab.jsx`
* **Purpose**: The command center for Gemini Neural Audits.
* **Behavior**: Renders three distinct cards (Deep Audit, Setup Audit, Monthly Review). Handles the `loading` state locally to show spinning indicators while the Gemini API blocking call is active.
* **Dependencies**: `geminiService.js`.

### `ReviewTab.jsx` & `MasterTable.jsx`
* **Purpose**: Handles the rendering of the raw data.
* **Logic**: Implements virtualized rendering (or aggressive pagination) to ensure that rendering 500+ trades does not drop the browser framerate.
* **Interactions**: Double-clicking a row opens an inline edit modal.

---

## 4. The Intelligence Layer (`src/components/AIInsights/`)

### `AIInsightsView.jsx`
* **Purpose**: Orchestrates the Macroeconomic dashboard.
* **Logic**: Makes a direct `supabase.from('economic_events')` call. Filters events strictly to show `High Impact` volatility markers on the current day.
* **Mobile Responsiveness**: Uses `flex-col sm:flex-row` to stack the event timeline securely on narrow mobile viewports to prevent text overlap.

### `EventCalendar.jsx`
* **Purpose**: Renders the macroeconomic calendar timeline.
* **Logic**: Correlates the `economic_events` payload with personal trades to visually show the user if they lost money during a high-volatility macro event (e.g., FOMC).

---

## 5. UI Primitives (`src/components/Common/`)

### `CustomSelect.jsx`
* **Purpose**: A totally bespoke dropdown component overriding native `<select>` tags.
* **Logic**: Built entirely with `div` and `framer-motion` to ensure the dropdown menu styling perfectly matches the ultra-dark, glassmorphic aesthetic of the app. Implements `onClickOutside` listeners for safe dismissal.

### `MobileNav.jsx`
* **Purpose**: Viewport-specific navigation.
* **Logic**: Uses a `fixed bottom-0` absolute positioning layout. It actively monitors the `activeTab` prop and renders a glowing, floating active-indicator pill underneath the selected icon.
