# Domain Flipper

An autonomous domain flipping bot. Scans expired domain auctions, scores them with an 8-factor algorithm, bids within safety limits, and manages the portfolio — all server-side, no browser needed.

## What It Does

- **Scans** GoDaddy Auctions, Namecheap, ExpiredDomains.net (via Apify) every 15 minutes
- **Scores** each domain on 8 factors: length, TLD, keywords, brandability, backlinks, age, comparable sales, trademark
- **Detects** value patterns: LLL.com, CVCV (Roku-style), dictionary words, SaaS suffixes, industry terms
- **Assesses** 7 risk factors: trademark UDRP, spam backlinks, bidding wars, illiquid TLD, trend dependency, renewal trap, serial drops
- **Chooses** auction strategy: snipe late, bid early low, proxy and forget, or skip overheated
- **Bids** within server-side safety limits (daily cap, per-domain cap, min ROI, review queue)
- **Lists** acquired domains for sale on GoDaddy Aftermarket, auto-reprices after 30 days
- **Parks** idle domains on Bodis for ad revenue while waiting to sell
- **Notifies** via Discord/Slack webhook for bids, errors, daily reports, budget alerts
- **Learns** from outcomes — monthly calibration adjusts scoring weights based on what actually profits

## 5 Autonomous Cron Jobs

| Schedule | Job | Purpose |
|----------|-----|---------|
| Every 15 min | `/api/cron/scan` | Scan + score + bid |
| Every 6 hours | `/api/cron/manage-listings` | List + park + redirect |
| Daily 8 AM | `/api/cron/optimize-portfolio` | Price cuts + drop recommendations |
| Daily 10 PM | `/api/cron/daily-report` | Daily summary to Discord/Slack |
| Monthly 1st | `/api/cron/calibrate` | Scoring weight calibration |

## Setup

1. Create a [Supabase](https://supabase.com) project
2. Run migrations in order: `supabase/migrations/002_bot_pipeline.sql` through `006_intelligence_layers.sql`
3. Set environment variables (see `.env.example`)
4. Deploy to Vercel: `vercel --prod`
5. Bot starts in DRY_RUN mode — scans and scores without spending

**Server-side env vars** (Vercel Dashboard):
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOT_USER_ID
GODADDY_API_KEY, GODADDY_API_SECRET
ADMIN_API_KEY, CRON_SECRET
```

**Client-side** (.env):
```
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_API_KEY
```

**Optional** (each makes scoring smarter):
```
APIFY_TOKEN          # ExpiredDomains.net feed
NAMEBIO_API_KEY      # Comparable sales ($15/mo)
ESTIBOT_API_KEY      # CPC data ($30/mo)
BODIS_API_KEY        # Domain parking
```

## Safety

All enforced server-side — cannot be bypassed from the browser:
- DRY_RUN default ON
- Daily spend cap (default $200)
- Per-domain cap (default $50)
- Min ROI threshold (default 3x)
- Review queue for high-value/trademark domains
- Self-healing: auto-pauses after 3 consecutive failures

## Scoring (0-100)

| Factor | Max | Source |
|--------|-----|--------|
| Length | 15 | Local |
| TLD | 15 | Local |
| Keywords | 15 | EstiBot CPC or dictionary |
| Brandability | 15 | Pronounceability + patterns |
| Backlinks | 15 | ExpiredDomains.net |
| Age | 10 | ExpiredDomains.net |
| Comparables | 10 | NameBio API |
| Trademark | 5 | USPTO |
| Pattern bonus | +20 | LLL, CVCV, dictionary word |

Every decision includes a human-readable reasoning string.

## Tech Stack

React + TypeScript + Vite, Vercel Serverless + Cron, Supabase PostgreSQL

## Status

See [STATUS.md](STATUS.md)
