# Domain Flipper Bot — Cursor Rules

## Architecture

This is a **personal autonomous domain flipping bot**. One user. Real money. No demo mode.

### Pipeline Architecture
```
[Vercel Cron Job: /api/cron/scan every 15 min]
  → Check bot_state table (enabled? dry_run?)
  → Check spend_records (daily limit reached?)
  → Fetch domains from GoDaddy Auctions API (server-side)
  → Score each domain (transparent weighted algorithm)
  → Filter by criteria (ROI, TLD, price caps)
  → If DRY_RUN=false: place bids via API
  → Save results to scan_results table
  → Log everything to bot_logs table
  → Dashboard reads from Supabase (display only)
```

### Security Rules
- **NEVER** put API secrets in `VITE_` environment variables
- Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ADMIN_API_KEY` are client-side
- All API calls go through `/api/` serverless functions which have server-side env vars
- **NEVER** hardcode credentials in source code
- **NEVER** fall back to mock data when an API fails — show errors or empty state

### Database
- Supabase with RLS enabled on all tables
- Core tables: `bot_state`, `scan_results`, `bot_logs`, `pipeline_settings`, `owned_domains`, `transactions`, `spend_records`
- Bot state lives in database, NOT localStorage
- Dashboard reads from Supabase, the cron job writes to it

### Absolute Rules
1. **NEVER** return mock/demo data. If data isn't available, error or show empty state.
2. **NEVER** use `Math.random()` to generate values displayed as real metrics.
3. **NEVER** catch errors and return fake success responses.
4. **NEVER** claim accuracy percentages that aren't measured from real data.
5. **NEVER** put spending logic in the browser — all spending controls are server-side.
6. DRY_RUN defaults to TRUE in the database.
7. Every bid attempt is logged to `bot_logs` and `transactions`.
8. The browser dashboard is READ-ONLY — it does not execute the bot pipeline.

### Server-Side Env Vars (set in Vercel Dashboard)
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOT_USER_ID,
CRON_SECRET, ADMIN_API_KEY,
GODADDY_API_KEY, GODADDY_API_SECRET,
NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP
```

### Intelligence Architecture (api/lib/)
```
api/lib/valuation/scorer.ts    — 8-factor scoring engine (length, TLD, keywords, brandability, backlinks, age, comparables, trademark)
api/lib/sources/expiredDomains.ts — ExpiredDomains.net via Apify (primary feed with SEO metrics)
api/lib/sources/godaddy.ts     — GoDaddy Auctions API (bidding + listing)
api/lib/sources/namecheap.ts   — Namecheap availability check (secondary)
api/lib/enrichment/namebio.ts  — NameBio comparable sales (optional, $15/mo)
api/lib/enrichment/estibot.ts  — EstiBot appraisal + CPC data (optional, $30/mo)
api/lib/enrichment/uspto.ts    — USPTO trademark check (free)
```

### Scoring Model (0-100 points)
- Length (0-15): ≤3 chars = 15pts, ≤4 = 13, ≤5 = 11, ≤6 = 9, ≤8 = 7, ≤10 = 5, ≤15 = 3
- TLD (0-15): .com = 15, .ai = 12, .io = 10, .co = 8, .net/.org = 7
- Keywords (0-15): Based on real CPC data. Insurance = $50 CPC = 15pts, AI = $25 = 15pts
- Brandability (0-15): Pronounceable, no hyphens, no numbers, real words
- Backlinks (0-15): Referring domains from ExpiredDomains.net data
- Age (0-10): Older = more SEO authority
- Comparables (0-10): NameBio historical sales data (strongest signal)
- Trademark (0-5): USPTO active trademark = bonus but also legal risk flag

### Smart Bidding
- Max bid = estimated_value / min_ROI * (confidence / 100)
- Domains above review_threshold → review_queue table (manual approval)
- GoDaddy bid increments follow their tier rules

### API Routes
- `GET /api/cron/scan` — Cron-triggered autonomous scan (every 15 min)
- `GET/POST /api/bot-state` — Read/update bot state (enable, disable, toggle dry_run)
- `GET/PUT /api/settings` — Read/update pipeline settings
- `GET /api/portfolio?type=stats|portfolio|scans|logs|transactions` — Dashboard data
- `GET /api/godaddy/auctions` — GoDaddy auctions proxy
- `GET /api/godaddy/appraisal` — GoDaddy appraisal proxy
- `GET /api/godaddy/closeouts` — GoDaddy closeouts proxy
- `GET /api/namecheap/check` — Namecheap domain check proxy
- `GET /api/namecheap/marketplace` — Namecheap marketplace proxy
