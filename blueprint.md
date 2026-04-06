# TradeAuditDashboard - Trading Journal Website

## Overview
A comprehensive institutional-grade trading performance dashboard designed for professional traders to review and audit their trading history. The application provides deep insights into financial metrics, execution patterns, and behavioral leaks through a polished, data-rich interface.

## Project Outline

### Tech Stack
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS with custom glassmorphism effects
- **Animations**: Framer Motion for smooth, premium transitions
- **Visualization**: Recharts for high-performance financial charting
- **Icons**: Lucide React for consistent, interactive iconography

### Design System
- **Theme**: Ultra-dark professional aesthetic using `#020617` (Slate 950) as base.
- **Aesthetics**: Heavy use of glassmorphism (`glass-panel`), glowing light rays, and floating particles for a premium "Institutional Terminal" feel.
- **Typography**: Sans-serif font system with high contrast for monospaced financial data.
- **Interactivity**: Micro-animations on hover for cards, active tab pills, and data points.

### Feature Set
- **Metrics Dashboard**: Net P&L (INR formatting), Win Rate, Profit Factor, Avg Win/Loss, Expectancy.
- **Interactive Heatmap**: Visual performance grid showing daily P&L and trade frequency.
- **Behavioral Audit**: Tracking emotions (revenge, discipline, etc.) and their specific financial impact.
- **Sizing Matrix**: Average lot size analysis by market/symbol.
- **Strategy Analysis**: Performance breakdown by setup/strategy.
- **CSV Integration**: Flexible parser for importing external trading journals.

---

## Plan: Full-Scale Triple-Table Journal Integration

### Objective
Expand the application into a comprehensive trading workstation by migrating and synchronizing three core data collections from Notion into a unified Firebase ecosystem.

### Data Architecture (Cloud)
1. **`trades`**: Individual execution data, P&L, strategy, and asset tracking.
2. **`dailySnapshots`**: Higher-level daily performance reflections, psychology scores, and chart imagery.
3. **`notes`**: Searchable repository for trading rules, setup checklists, and general reflections.

### Actionable Steps
1. **Infrastructure**: Initialized `src/firebase.js` with active project credentials.
2. **Triple-Sync Utility**: Build a migration tool in the UI that handles 3 simultaneous CSV uploads (one for each Notion table).
3. **Multi-Collection Schema**: Define normalized data models for Firestore to ensure seamless cross-referencing (e.g., linking a trade to its daily snapshot).
4. **Journal Tab (CRUD)**:
   - **Trade Log**: Enhanced table with inline edit/delete.
   - **Performance Reflection**: Daily snapshot grid with image lightboxes.
   - **Trading Notebook**: Markdown-supported note-taking interface.
5. **Analytics Integration**: Update charts to consume live data from Firestore, enabling real-time performance tracking.
6. **Hosting**: Deploy the final full-scale application to Firebase Hosting.
