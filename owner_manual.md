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
    *This uploads your `dist` folder, applies your Security Rules, and updates your live link.*

### Live Link & Dashboard
-   **Terminal URL**: [https://tradingjournal-b17c4.web.app](https://tradingjournal-b17c4.web.app)
-   **Firebase Console**: [https://console.firebase.google.com/project/tradingjournal-b17c4/overview](https://console.firebase.google.com/project/tradingjournal-b17c4/overview)

---

## 2. Data Storage & Management

Your terminal uses a hybrid cloud backend for maximum institutional performance.

### A. Trade & Journal Data (Firebase Firestore)
All your trade history, metrics, and journal notes are stored in **Cloud Firestore**.
-   **Management Console**: [Go to Firestore Database](https://console.firebase.google.com/project/tradingjournal-b17c4/firestore)
-   **How to Edit/Delete**: You can browse the `trades` collection directly in the console. Click any document to edit its fields (like `pnl`, `asset`, or `notes`).
-   **Data Recovery & Export**: Firebase keeps a backup of your data. You can export the entire database as a JSON/CSV using the "Export" feature in the Google Cloud Console (linked from Firebase).

### B. Chart Screenshots (Firebase Storage)
Your institutional terminal stores chart snapshots in **Firebase Storage**.
-   **Asset Console**: [Go to Storage Buckets](https://console.firebase.google.com/project/tradingjournal-b17c4/storage)
-   **Usage**: All images uploaded via the journal are stored here. You can manually delete or download them from this console.

### C. Price Alerts (Supabase)
Real-time alerts for BTC, ETH, and GOLD are managed via **Supabase**.
-   **Alert Console**: [Go to Supabase Dashboard](https://app.supabase.com/project/dayyrrzkewrmdrhwdalg)
-   **Management**: If you need to clear all active alerts manually, you can do so in the `alerts` table within the SQL editor or Table Editor.

---

## 3. Security Protocols

As the owner, you have control over the application's "Shield" layers.

### Terminal PIN (Obsolete)
The PIN-based `AccessShield` has been upgraded to **Institutional Google Auth**. The `VITE_TERMINAL_PIN` is no longer required for main access, but is kept in your `.env` for legacy support.

---

## 4. Troubleshooting & FAQ

### "CONFIGURATION_NOT_FOUND" Error
If you see an error about configuration not being found when connecting to Google:
1.  Open your [Firebase Auth Provider Settings](https://console.firebase.google.com/project/tradingjournal-b17c4/authentication/providers).
2.  Click **Add provider** → **Google**.
3.  Ensure the toggle is **Enabled** and save.

### "Popup Blocked" Message
This occurs because your browser's security settings stopped the Google login window. 
1.  Look at your browser's address bar for a "Popup Blocked" icon.
2.  Select **"Always allow popups from this site."**
3.  Refresh and try again.

---

## 5. Owner Checklist (Before Launch)

> [!IMPORTANT]
> **1. GitHub Warning**: Your [`.gitignore`](file:///d:/Downloads/Projects%20files/Trading%20journal%20website/.gitignore) is correctly set to exclude your `.env`. **Never remove `.env` from this list**, or your private keys will be leaked to the public.

> [!TIP]
> **2. Regular Exports**: Every month, I recommend going to the [Firestore Console](https://console.firebase.google.com/project/tradingjournal-b17c4/firestore) and checking your usage. While the terminal is within "Free Tier" limits, keeping a local CSV export of your data is a professional habit.

> [!CAUTION]
> **3. Firebase CLI**: To run `firebase deploy`, you must be logged in to your Google Account on your computer. If you haven't yet, run `firebase login` in your terminal first.

---

## Summary of Technology Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React + Vite + Tailwind | Institutional UI & Logic |
| **Hosting** | Firebase Hosting | Production Website Delivery |
| **Database** | Firestore NoSQL | Trade & Performance Data |
| **Storage** | Firebase Storage | Chart Screenshots & Assets |
| **Real-time** | Supabase | Trading Alerts & Webhooks |
