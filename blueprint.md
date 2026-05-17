# Trader Dashboard - Institutional Trading Terminal

## Overview
A comprehensive institutional-grade trading performance dashboard designed for professional traders to review and audit their trading history. The application provides deep insights into financial metrics, execution patterns, and behavioral leaks through a polished, data-rich interface.

## Project Outline

### Tech Stack
- **Framework**: React 19 (Vite)
- **Database**: **Supabase (Postgres)** - Master data persistence for trades, snapshots, notes, and goals.
- **Auth**: **Supabase Auth** - Secure identity management and session handling.
- **Storage**: **Supabase Storage** - Secure asset hosting for chart screenshots and gallery media.
- **Real-time Engine**: Binance WebSocket Gateway using **RxJS** for reactive price streams.
- **Styling**: Tailwind CSS with custom glassmorphism effects.
- **Animations**: Framer Motion for smooth, premium transitions.
- **Visualization**: 
  - **Recharts**: Performance analytics and behavioral distribution maps.
  - **Lightweight Charts**: Interactive financial charting with price line overlays.
- **Icons**: Lucide React for consistent, interactive iconography.

### Architecture
- **Analytical Engine**: Centralized in the `useTradeData` custom hook for isolated, high-performance processing.
- **Modular UI**: Components like `LightRaysAndParticles`, `MobileNav`, and `TradeArchiveCarousel` are decoupled from the main entry point for better maintainability.

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
- **Market Insights Terminal & Market Intelligence:**
  - Real-time aggregation of macroeconomic events.
  - Custom unified logic to merge Global (US Focus) and Regional (India Focus) data streams.
  - Strict high-impact volatility filtering (`importance: 1` strict focus for Indian markets).
  - 100% Serverless Backend architecture (Supabase Edge Functions + pg_cron).

## Backend Architecture (Supabase Engine)
- **Data Fetcher (`fetch-market-events`)**: Deno Edge Function running every 3 hours. Pulls live data from Investing.com and TradingView, calculates internal `importance_score` and `affected_markets`, and uses `UPSERT` to maintain a deduped `economic_events` table.
- **Alert System (`system-alerts`)**: Deno Edge Function running every 5 minutes. Scans for events occurring exactly 15 minutes away, sending a formatted Markdown notification directly to a designated Telegram Bot to keep the trader instantly aware of impending volatility.
- **Frontend Integration**: UI completely decoupled from external APIs, reading lightning-fast directly from the Supabase database.

---

## Completed: Full Supabase Migration

### Objective
Decommission the legacy Firebase infrastructure and migrate all core services to Supabase for improved performance, unified data management, and better SQL-based analytics.

### Accomplishments
1. **Unified Infrastructure**: Migrated all tables (Trades, Snapshots, Notes, Goals) to Supabase Postgres.
2. **Auth Switch**: Replaced Firebase Auth with Supabase Auth, integrating `AuthShield` and `authService`.
3. **Storage Migration**: Successfully moved all chart screenshots and daily snapshots to Supabase Storage.
4. **SQL Backup Utility**: Developed a standalone Node script to generate comprehensive SQL backups for disaster recovery.
5. **Real-time Optimization**: Leveraged Supabase Channels for high-fidelity data synchronization across components.
6. **Master Export**: Implemented a "Master JSON Backup" feature in the Utility HUB for portable data access.

---

## Status: Project Scale Optimization
### Objective
Modularize the architecture to ensure the terminal remains performant and maintainable as new features are added.

### Accomplishments
1. **Analytical Engine Extraction**: Created the `useTradeData` hook to separate mathematical expectancy from UI rendering.
2. **Decomposition**: Extracted background animations, mobile nav, and carousels into the `src/components/Common` hub.
3. **Workspace Purge**: Removed obsolete migration scripts to stabilize the project root.
4. **Code Quality**: Reduced `App.jsx` complexity significantly, leading to faster hot-reload times and cleaner orchestration logic.

