# Status

## Working — Fully Autonomous
- **5 cron jobs running without any browser open:**
  - Every 15 min: Scan → Score → Intelligence → Bid
  - Every 6 hours: Manage listings + parking
  - Daily 8 AM: Portfolio optimization (price cuts, drop recommendations)
  - Daily 10 PM: Daily report to Discord/Slack
  - Monthly 1st: Scoring calibration from real outcomes
- 8-factor domain scoring with transparent breakdown + reasoning strings
- 6 intelligence layers:
  - Pattern Recognition: LLL.com, CVCV, dictionary words, SaaS suffixes, industry terms, AI trends
  - Risk Assessment: 7 real factors (trademark, spam, bidding wars, illiquid TLD, trend risk, renewal trap, serial drops)
  - Auction Strategy: 4 approaches (snipe late, bid early low, proxy and forget, skip overheated)
  - Outcome Learning: monthly calibration correlates factors with profit, adjusts weights
  - Self-Healing: auto-pauses on 3 consecutive failures, disables broken sources
  - Market Context: tracks hot TLDs/keywords from your own outcomes + NameBio
- GoDaddy Auctions (search + bid + list)
- Namecheap (availability checks only; marketplace scanning is scaffolded)
- ExpiredDomains.net via Apify (requires APIFY token, treated as optional — returns empty results when not configured)
- Smart bidding: ROI × confidence × risk multiplier × auction strategy
- Review queue for high-value/high-risk domains (approve/reject in dashboard)
- Server-side spending controls (daily cap, per-domain cap, min ROI)
- DRY_RUN mode (default ON)
- Discord/Slack webhook notifications for all events
- Auto-listing + stale repricing + domain parking (Bodis)
- SEO backlink redirects for high-backlink domains
- Income stream tracking per domain (parking revenue, lease income)

## Optional Enrichment APIs
- NameBio comparable sales (NAMEBIO_API_KEY — $15/mo)
- EstiBot appraisal + CPC data (ESTIBOT_API_KEY — $30/mo)
- USPTO trademark checking (free, no key needed)
- Bodis domain parking (BODIS_API_KEY — revenue share)

## Planned
- Auto-generated landing pages with affiliate links
- Lead capture forms for high-CPC keyword domains
- Additional marketplace listing (Afternic DLS, Dan.com)

## Removed (dead code from previous iterations)
- TensorFlow.js, Black-Scholes, Monte Carlo, VADER
- MultiBotSwarm, QuantumShield, DarkPool, GodTier
- 170+ dead files, all stubs, all mock data, all fiction docs
- All hardcoded API credentials, all Math.random() metrics
- Browser-based "autonomous" engine (replaced by 5 server-side cron jobs)
