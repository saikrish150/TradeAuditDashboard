# Deployment & DevOps Infrastructure

## 1. Overview
The Trader Dashboard is built as a static Single Page Application (SPA). This means the deployment process is highly streamlined and does not require complex Kubernetes or Docker container orchestration for the frontend layer.

---

## 2. Build Process (Vite)

### 2.1 Local Development
* **Command**: `npm run dev`
* **Port**: Automatically binds to `:5173`.
* **HMR**: Hot Module Replacement is fully active, utilizing `@vitejs/plugin-react` to instantly push CSS/JS changes without losing component state.

### 2.2 Production Build
* **Command**: `npm run build`
* **Engine**: Vite uses **Rollup** under the hood for production builds.
* **Optimization Strategies**:
  1. **Tree Shaking**: Eliminates unused exports from heavy libraries like `recharts` and `framer-motion`.
  2. **Minification**: Compresses CSS/JS payloads into optimized chunks located in the `dist/assets` directory.
* **Exit Code**: Validates strict compilation before emitting the `dist/` folder. Exit code `0` is required for CI/CD pipelines to proceed.

---

## 3. Environment Variables
The application relies heavily on `.env` files to prevent secret leakage. 

```env
# Mandatory Supabase Configuration
VITE_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...

# Optional AI Configuration
VITE_GEMINI_API_KEY=AIzaSy...
```
*Variables prefixed with `VITE_` are exposed to the browser. The `VITE_SUPABASE_ANON_KEY` is completely safe to expose to the browser, as Row Level Security (RLS) protects the database via the user's JWT, not the API key itself.*

---

## 4. Hosting Recommendations

Because the output is entirely static (`dist/index.html` + JS/CSS chunks), it can be deployed to any modern CDN or edge network.

1. **Vercel / Netlify**: Highly recommended. Provides out-of-the-box CI/CD. Simply point the repository to Vercel, set the build command to `npm run build`, and inject the Environment Variables via their UI.
2. **AWS S3 + CloudFront**: For enterprise deployments requiring extreme compliance. The `dist/` folder can be synced to an S3 bucket and routed through CloudFront edge nodes for global caching.
3. **Firebase Hosting**: Alternative if migrating from legacy infrastructure. Use `firebase deploy --only hosting`.

---

## 5. Backend Deployment (Supabase Edge Functions)
The Deno Edge functions must be deployed via the Supabase CLI.

### 5.1 Deployment Commands
```bash
# Deploy the webhook alert daemon
supabase functions deploy check-alerts --no-verify-jwt

# Deploy the broker sync ingestion scripts
supabase functions deploy sync-dhan-trades
supabase functions deploy reconstruct-trades

# Deploy macroeconomic fetcher
supabase functions deploy fetch-market-events --no-verify-jwt
```
*Note: Functions triggered by `pg_cron` (like `check-alerts`) usually require the `--no-verify-jwt` flag since they are invoked by the internal database process, not a frontend user passing a JWT.*
