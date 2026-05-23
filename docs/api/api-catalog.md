# External API Catalog & Integration Flow

## 1. Overview
The Trader Dashboard connects to several third-party APIs to gather live data, stream prices, and execute neural logic. 

This catalog details the integrations, their payloads, and resilience handling.

---

## 2. Google Gemini Neural API
* **Endpoint**: `POST https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent`
* **Purpose**: Core engine for Daily Briefings and Neural Audits.
* **Authentication**: API Key passed via Query Parameter `?key={API_KEY}`.

### 2.1 Request Payload
```json
{
  "contents": [{ "parts": [{ "text": "PROMPT_STRING" }] }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 4096
  }
}
```

### 2.2 Rate Limiting & Resilience
* **Free Tier Limits**: 15 requests per minute.
* **Handling 429 Errors**: The system implements an automatic Model Fallback Matrix. If `gemini-1.5-pro` throws a 429, the service seamlessly degrades to `gemini-1.5-flash` to guarantee a response.

---

## 3. Binance WebSocket Stream
* **Endpoint**: `wss://stream.binance.com:9443/ws/{symbol}@trade`
* **Purpose**: Streams sub-second live price data directly to the Lightweight Charts canvas for real-time alerting.
* **Authentication**: None required (Public stream).

### 3.1 Connection Logic
* Handled entirely within `src/services/binance.js`.
* Employs an **Exponential Backoff Reconnect Strategy**. If the connection is dropped, it waits `2000ms`, `4000ms`, `8000ms`, up to a max of `30000ms` before re-attempting.

### 3.2 Payload Stream
```json
{
  "e": "trade",
  "E": 1672512345678,
  "s": "BTCUSDT",
  "p": "92100.50",
  "q": "0.15"
}
```
* **Performance Hook**: React components subscribe using an `rxjs Subject`. This bypasses React's state reconciliation engine to prevent frame drops.

---

## 4. Telegram Bot Webhook API
* **Endpoint**: `POST https://api.telegram.org/bot{TOKEN}/sendMessage`
* **Purpose**: Delivers markdown-formatted alerts triggered by the `check-alerts` Edge Function.

### 4.1 Request Payload
```json
{
  "chat_id": "-100123456789",
  "text": "🚨 **ALERT TRIGGERED** 🚨\n\n**Symbol**: BTCUSDT\n**Price**: $92,500\n**Condition**: GREATER_THAN",
  "parse_mode": "MarkdownV2"
}
```
* **Security**: The `TELEGRAM_BOT_TOKEN` is stored strictly as a Supabase Edge Function secret and is never exposed to the frontend.

---

## 5. Exchange Rate API
* **Endpoint**: `GET https://api.exchangerate-api.com/v4/latest/USD`
* **Purpose**: Fetches the live USD/INR exchange rate to automatically convert Crypto/Delta P&L into native Indian Rupees.

### 5.1 Caching Strategy
* Results are cached in `localStorage` (`tr_exchange_rate_cache`) with a TTL (Time-To-Live) of 4 hours to prevent spamming the rate-limited public endpoint on every page reload.
