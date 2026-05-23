# Backend & Edge Compute Architecture

## 1. Overview
To maintain a serverless architecture while still supporting heavy backend operations, the Trader Dashboard utilizes **Deno-based Supabase Edge Functions**. These run globally at the edge and are primarily used for tasks that must be executed independently of the React frontend state.

---

## 2. Deno Edge Functions

### `check-alerts`
* **Purpose**: Actively monitors financial data streams and fires webhooks (Telegram) when user-defined price thresholds are breached.
* **Execution Trigger**: Database Cron Job (`pg_cron`). Runs every 60 seconds.
* **Logic Flow**:
  1. Pulls all rows from `alerts` where `status = 'ACTIVE'`.
  2. Pings Binance REST API or AlphaVantage to get current price for the `symbol`.
  3. Evaluates condition: `current_price > target_price` or `current_price < target_price`.
  4. If breached, uses pessimistic database updates to transition `status = 'TRIGGERED'` (preventing duplicate alerts in concurrent executions).
  5. Fires the Telegram Bot webhook to alert the user on their phone.

### `fetch-market-events`
* **Purpose**: Aggregates and sanitizes highly volatile macroeconomic calendar events.
* **Execution Trigger**: Cron Job running every 3 Hours.
* **Logic Flow**:
  1. Scrapes or pulls API data from Investing.com economic calendar feeds.
  2. Filters out "Low Impact" events.
  3. Formats data and runs an `UPSERT` on the `economic_events` table using the event UUID to ensure no duplicates exist across weeks.

### `sync-dhan-trades` & `sync-delta-trades`
* **Purpose**: Ingestion pipelines for raw broker executions.
* **Execution Trigger**: Manual API call from `BrokerSyncCenter.jsx`.
* **Logic Flow**:
  1. Takes the user's `broker_id` and decrypts their API keys stored securely in Supabase.
  2. Connects to the Dhan/Delta Exchange API.
  3. Pulls raw fill logs for the selected date window.
  4. Pushes the raw JSON arrays directly into the `raw_broker_fills` table.

### `reconstruct-trades`
* **Purpose**: Transforms raw exchange fills into mathematically bounded "Trade Positions".
* **Execution Trigger**: Manual API call from `BrokerSyncCenter.jsx` (fired immediately after ingestion completes).
* **Logic Flow**:
  1. Loops through `raw_broker_fills`.
  2. Aggregates Buy/Sell legs based on `symbol` and `order_id` correlation parameters.
  3. Calculates the net P&L mathematically (averaging entry/exit prices based on lot size).
  4. Upserts the final stitched object into `reconstructed_trades`.

---

## 3. `pg_cron` Architecture
Supabase leverages the `pg_cron` PostgreSQL extension to run database-level scheduling.

### Setup Script
```sql
-- Creates a cron job to trigger the check-alerts function every minute
select cron.schedule(
  'invoke-check-alerts',
  '* * * * *', -- Every minute
  $$
    select net.http_post(
        url:='https://[PROJECT_REF].supabase.co/functions/v1/check-alerts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

### De-duplication Strategy
Because `pg_cron` can sometimes overlap if a function execution takes longer than 60 seconds, the Edge Functions utilize `SELECT FOR UPDATE SKIP LOCKED` patterns or strict `UPDATE ... WHERE status = 'ACTIVE'` clauses to ensure that one alert is strictly handled by one worker node.
