# TradeAuditDashboard - Trading Journal Website

## Overview
A comprehensive institutional-grade trading performance dashboard designed for professional traders to review and audit their trading history. The application provides deep insights into financial metrics, execution patterns, and behavioral leaks through a polished, data-rich interface.

## Project Outline

### Tech Stack
- **Framework**: React 19 (Vite)
- **Database (Hybrid)**: 
  - **Firebase**: Native cloud storage for Audit logs, Daily Snapshots, and User Journaling.
  - **Supabase**: Real-time alert management and persistence (linked to external automation/bots).
- **Real-time Engine**: Binance WebSocket Gateway using **RxJS** for reactive price streams.
- **Styling**: Tailwind CSS with custom glassmorphism effects.
- **Animations**: Framer Motion for smooth, premium transitions.
- **Visualization**: 
  - **Recharts**: Performance analytics and behavioral distribution maps.
  - **Lightweight Charts**: Interactive financial charting with price line overlays.
- **Icons**: Lucide React for consistent, interactive iconography.

### Design System
- **Theme**: Ultra-dark professional aesthetic using `#020617` (Slate 950) as base.
- **Aesthetics**: Heavy use of glassmorphism (`glass-panel`), glowing light rays, and floating particles for a premium "Institutional Terminal" feel.
- **Typography**: Sans-serif font system with high contrast for monospaced financial data.
- **Interactivity**: Micro-animations on hover for cards, active tab pills, and data points.
- **Layout**: "Non-Scroll" Dashboard design with dynamic viewport height calculations (`calc(100vh - 260px)`) to lock high-density data views to the user's monitor.

### Feature Set
- **Metrics Dashboard**: Net P&L (INR formatting), Win Rate, Profit Factor, Avg Win/Loss, Expectancy.
- **Interactive Heatmap**: Visual performance grid showing daily P&L and trade frequency.
- **Behavioral Audit**: Tracking emotions (revenge, discipline, etc.) and their specific financial impact.
- **Sizing Matrix**: Average lot size analysis by market/symbol.
- **Strategy Analysis**: Performance breakdown by setup/strategy.
- **CSV Integration**: Flexible parser for importing external trading journals.
- **Alert Intelligence**:
  - Real-time price tracking for BTC, ETH, and GOLD.
  - Drag-and-drop price alert creation on the chart.
  - Browser Notification and Audio chime triggers.
  - Hybrid persistence: Alerts sync to Supabase for multi-device/bot visibility.

---

## Completed: Alerts Intelligence Integration

### Objective
Migrate and optimize the standalone trading alert logic into the Trade Audit dashboard while maintaining a hybrid database connection to Supabase.

### Accomplishments
1. **Hybrid Infrastructure**: Configured dual-DB environment (Firebase + Supabase).
2. **WebSocket Porting**: Optimized Binance WebSocket service for Trade Audit's state management.
3. **Interactive Charting**:
   - Ported `Chart.jsx` with full Support for Lightweight Charts **v5 API**.
   - Integrated `autoSize` and `ResizeObserver` for flexible dashboard layouts.
   - Fixed "Object is disposed" hardware acceleration issues on hot-reload.
4. **Performance Tuning**:
   - Implemented `React.memo` across high-frequency components.
   - Moved price-tick state to `useRef` to eliminate re-render storms during high volatility.
5. **Geo-Routing**: Added Global/US server toggle to bypass regional Binance API restrictions.
6. **Smart Alerting**:
   - High-fidelity audio triggers (Mixkit SFX).
   - Desktop system notifications.
   - Persistence sync to Supabase for cross-platform availability.

## Active Plan: Full-Scale Triple-Table Journal Integration

### Objective
Expand the application into a comprehensive trading workstation by migrating and synchronizing three core data collections from Notion into a unified Firebase ecosystem.

### Actionable Steps
1. **Infrastructure**: Initialized `src/firebase.js` with active project credentials.
2. **Journal Tab (CRUD)**:
   - **Trade Log**: Enhanced table with inline edit/delete.
   - **Performance Reflection**: Daily snapshot grid with image lightboxes.
   - **Trading Notebook**: Markdown-supported note-taking interface.
3. **Analytics Integration**: Update charts to consume live data from Firestore, enabling real-time performance tracking.
4. **Hosting**: Deploy the final full-scale application to Firebase Hosting.
