# Trader Dashboard Terminal: Master Operations Manual

This document serves as your official guide for managing, deploying, and securing your institutional trading terminal.

---

## 1. Deployment Lifecycle

Your application is a modern **Single Page Application (SPA)** built with React and Vite, hosted on **Firebase Hosting**.

### How to Deploy Updates
When you make changes to the code and are ready to push them to the live website, follow these steps in your terminal:

1.  **Generate Production Build**:
    ```bash
    npm run build
    ```
    *This creates a high-performance `dist` folder containing your optimized dashboard.*

2.  **Push to Firebase**:
    ```bash
    firebase deploy
    ```
    *This uploads your `dist` folder to the web. (Note: Firebase is used only for HOSTING the files, not for storing your data).*

### Live Link & Dashboard
-   **Terminal URL**: [https://tradingjournal-b17c4.web.app](https://tradingjournal-b17c4.web.app)
-   **Hosting Console**: [Go to Firebase Hosting](https://console.firebase.google.com/project/tradingjournal-b17c4/hosting/main)

---

## 2. Data Storage & Management (Supabase)

Your terminal has been fully migrated to **Supabase** for maximum institutional performance, real-time sync, and security.

### A. Master Database (Supabase)
All your trade history, daily snapshots, pinned notes, and goals are stored in the Supabase PostgreSQL database.
-   **Management Console**: [Go to Supabase Table Editor](https://app.supabase.com/project/dayyrrzkewrmdrhwdalg/editor)
-   **Tables**:
    -   `trades`: Your master trade history.
    -   `snapshots`: Daily habit tracking and gallery images.
    -   `notes`: Your learning logs and pinned market notes.
    -   `goals`: Active and archived performance objectives.
    -   `alerts`: Real-time price alerts (BTC, ETH, GOLD).

### B. Chart Screenshots (Supabase Storage)
All chart snapshots and gallery images are stored in **Supabase Storage**.
-   **Asset Console**: [Go to Storage Buckets](https://app.supabase.com/project/dayyrrzkewrmdrhwdalg/storage/buckets/trading-media)
-   **Usage**: Images are automatically partitioned by your User ID for privacy and organization.

---

## 3. Security Protocols

Your terminal is protected by **Supabase Auth** and Row Level Security (RLS).

### Terminal Access
The dashboard requires a verified identity. You can manage your account and security settings in the Supabase Dashboard.
-   **Identity Registry**: [Manage Users](https://app.supabase.com/project/dayyrrzkewrmdrhwdalg/auth/users)

---

## 4. Maintenance & Backups

### SQL Data Backups
A custom utility has been added to your project to generate full SQL backups of your entire history.
-   **Run Backup**: 
    ```bash
    node scripts/generate_sql_backup.js
    ```
-   **Result**: This creates a `full_backup.sql` file in your root directory containing every record you've ever saved.

### Master JSON Export
For quick data analysis, use the **Utility HUB** inside the application to download a single JSON file containing all your synchronized cloud data.

---

## 5. Summary of Technology Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + Tailwind | Institutional UI & Logic |
| **Hosting** | Firebase Hosting | Production Website Delivery |
| **Database** | Supabase (Postgres) | Master Data Persistence |
| **Auth** | Supabase Auth | Identity & Access Control |
| **Storage** | Supabase Storage | Chart Screenshots & Assets |
| **Real-time** | Binance WebSockets | Live Market Data Streams |
