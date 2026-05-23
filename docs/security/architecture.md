# Security Architecture

## 1. Overview
As a financial performance tracking tool, security, and strict tenant isolation are top priorities. The Trader Dashboard delegates all core security and identity management directly to **Supabase Auth** and enforces data silos via PostgreSQL **Row Level Security (RLS)**.

---

## 2. Authentication Flow
The system utilizes JWT (JSON Web Tokens) for session management.

1. User authenticates via email/password using the `AuthShield.jsx` component.
2. Supabase verifies credentials and returns an `access_token` (JWT) and a `refresh_token`.
3. The `authService.js` singleton handles storing these securely in the browser environment (handling token refresh lifecycles automatically).
4. **All** subsequent interactions with the database include this JWT in the Authorization Header.

---

## 3. Data Isolation (Row Level Security)

RLS is the primary defense mechanism against cross-tenant data leaks. 

### 3.1 Policy Design
In PostgreSQL, RLS policies dictate that a user can only read, update, or delete rows where the `user_id` column matches their authenticated JWT ID (`auth.uid()`).

**Example: Securing the Trades Table**
```sql
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users only"
ON "public"."trades" FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable read access for users based on user_id"
ON "public"."trades" FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
ON "public"."trades" FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
ON "public"."trades" FOR DELETE USING (auth.uid() = user_id);
```

Because this is enforced at the database layer, even if a user manipulates the frontend JavaScript to attempt to fetch trade ID #1234, the database will return `0 rows` if trade #1234 does not belong to them.

---

## 4. API Key Encryption & Broker Security
The most sensitive data in the application are the user's exchange API keys (Dhan, Delta).

### 4.1 Encryption at Rest
* API keys and secrets are never stored in plain text.
* When saving a broker, the Edge Function or Database layer must utilize `pgcrypto` to encrypt the `api_secret` column symmetrically, using a highly secure internal vault key that the frontend never has access to.

### 4.2 Decryption at Runtime
* When a user clicks "Sync Trades", the React frontend merely sends the `broker_id` to the Edge Function.
* The Edge Function reads the `api_secret_encrypted` from the database, decrypts it internally using the vault key, connects to the Broker, and then destroys the decrypted variable in memory.
* The raw secret is **never** sent back over the wire to the React client.

---

## 5. Media & Storage Security
Screenshots uploaded to the journaling system are hosted on Supabase Storage.
* **Storage Buckets**: Set to `Restricted`.
* **Access Logs**: The `snapshots` table points to these URLs, but fetching the actual image file requires the user to pass their JWT authorization header to the bucket, guaranteeing privacy of trading execution strategies.
