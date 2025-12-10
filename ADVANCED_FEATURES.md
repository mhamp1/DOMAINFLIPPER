# Advanced Features Guide

This document describes the advanced features integrated into DomainFlipper for enhanced domain acquisition, pricing, and selling.

## Overview

The advanced features include:
1. **Brandability/NLP Scoring** - AI-powered domain quality analysis
2. **Seasonal Trend Analysis** - Recency-weighted trend detection with persistence
3. **Channel Performance Tracking** - Per-channel conversion and repricing optimization
4. **Outbound Buyer Suggestions** - Opt-in buyer matching (no auto-send)
5. **Registrar Optimization** - Regional endpoints and pre-auth for faster sniping
6. **Safety Guardrails** - DRY_RUN mode, spending caps, margin requirements

## Feature Details

### 1. Brandability/NLP Scoring

**Purpose**: Evaluate domain names for brandability and quality before purchase.

**How it works**:
- Analyzes pronounceability using CVCV (consonant-vowel) patterns
- Calculates vowel/consonant ratio and syllable count
- Filters profanity, stopwords, and trademark risks
- Detects language (English, Spanish, French, German, etc.)

**Configuration** (in MasterConfig):
```typescript
brandability: {
  enabled: true,              // Enable/disable scoring
  minScore: 60,               // Minimum score to pass (0-100)
  minVowelRatio: 0.25,        // Minimum vowel ratio
  maxVowelRatio: 0.5,         // Maximum vowel ratio
  maxLength: 15,              // Maximum characters
  minLength: 4,               // Minimum characters
  penalizeProfanity: true,    // Flag profane domains
  penalizeStopwords: true,    // Flag common stopwords
  penalizeTrademark: true,    // Flag potential trademark conflicts
  requireEnglish: false,      // Downweight non-English
}
```

**API Usage**:
```typescript
import { brandabilityScorer } from '@/lib/intelligence/brandabilityScorer'

const result = brandabilityScorer.scoreDomain('techly.com')
console.log(result.score)              // 0-100 overall score
console.log(result.pronounceability)   // 0-100 pronunciation score
console.log(result.isClean)            // No profanity/TM issues
console.log(result.warnings)           // Array of concerns
console.log(result.breakdown)          // Human-readable explanation
```

### 2. Seasonal Trend Analysis

**Purpose**: Detect meaningful trends while filtering noise and one-off spikes.

**How it works**:
- Applies exponential recency weighting (recent data matters more)
- Calculates momentum (rate of change) and persistence (trend duration)
- Filters one-off spikes using statistical z-score thresholds
- Provides confidence scores based on data quality

**Configuration** (in MasterConfig):
```typescript
seasonal: {
  enabled: true,              // Enable/disable analysis
  windowDays: 30,             // Days to analyze (7-90)
  recencyDecayRate: 0.1,      // Decay rate (0-1)
  minPersistenceDays: 3,      // Min days for valid trend
  spikeFilterThreshold: 2.5,  // Z-score threshold for spikes
  momentumWeight: 0.4,        // Weight for momentum (0-1)
  enableSpikeFilter: true,    // Filter one-off spikes
}
```

**API Usage**:
```typescript
import { seasonalTrendAnalyzer, TrendDataPoint } from '@/lib/intelligence/seasonalTrendAnalyzer'

const data: TrendDataPoint[] = [
  { timestamp: new Date('2024-01-01'), value: 10, source: 'google' },
  { timestamp: new Date('2024-01-02'), value: 20, source: 'google' },
  // ...more data points
]

const result = seasonalTrendAnalyzer.analyzeTrend('ai-tools', data)
console.log(result.currentScore)    // 0-100 weighted score
console.log(result.momentum)        // -100 to +100 (growth rate)
console.log(result.persistence)     // 0-100 (trend stability)
console.log(result.trend)           // 'rising' | 'stable' | 'declining'
console.log(result.isSpike)         // True if likely one-off spike
console.log(result.confidence)      // 0-100 confidence in analysis
```

### 3. Channel Performance Tracking

**Purpose**: Track and optimize listing performance across marketplaces.

**How it works**:
- Tracks views, inquiries, and sales per channel (Afternic, Dan, Lander)
- Calculates conversion rates, inquiry rates, and close rates
- Generates repricing recommendations based on performance
- Applies channel-specific list/floor price multipliers

**Configuration** (in MasterConfig):
```typescript
channelPerformance: {
  enabled: true,
  channels: [
    {
      name: 'Afternic',
      enabled: true,
      commission: 0.20,              // 20% commission
      listPriceMultiplier: 1.0,      // No adjustment
      floorPriceMultiplier: 1.0,     // No adjustment
      repricingCadenceDays: 30,      // Reprice every 30 days
      autoReprice: false,            // Manual repricing only
    },
    {
      name: 'Dan',
      enabled: true,
      commission: 0.09,              // 9% commission
      listPriceMultiplier: 1.0,
      floorPriceMultiplier: 1.0,
      repricingCadenceDays: 30,
      autoReprice: false,
    },
  ],
}
```

**API Usage**:
```typescript
import { channelPerformanceTracker } from '@/lib/marketplace/channelPerformanceTracker'

// Add listing
channelPerformanceTracker.addListing('example.com', 'Afternic', 1000, 500)

// Track activity
channelPerformanceTracker.recordView('example.com', 'Afternic')
channelPerformanceTracker.recordInquiry('example.com', 'Afternic')
channelPerformanceTracker.recordSale('example.com', 'Afternic', 1200)

// Get stats
const stats = channelPerformanceTracker.getChannelStats('Afternic')
console.log(stats.conversionRate)   // Sales / listings (%)
console.log(stats.avgSalePrice)     // Average sale price
console.log(stats.avgDaysToSale)    // Average days to sale

// Get repricing recommendations
const recommendations = channelPerformanceTracker.getRepricingRecommendations('example.com')
for (const rec of recommendations) {
  console.log(`${rec.action}: ${rec.currentPrice} → ${rec.recommendedPrice}`)
  console.log(`Reason: ${rec.reason} (confidence: ${rec.confidence}%)`)
}
```

### 4. Outbound Buyer Suggestions (Opt-In)

**Purpose**: Match domains to potential buyers based on industry/keywords.

**IMPORTANT**: This feature is **opt-in only** and requires **manual approval** for all outreach. No messages are sent automatically.

**How it works**:
- Matches domain keywords to buyer interests and industries
- Scores matches 0-100 based on relevance
- Suggests optimal outreach pricing
- Exports suggestions to CSV/JSON for review

**Configuration** (in MasterConfig):
```typescript
outbound: {
  enabled: false,                 // DEFAULT: DISABLED (opt-in)
  requireManualApproval: true,    // DEFAULT: REQUIRE APPROVAL
  minMatchScore: 70,              // Minimum match score (0-100)
  maxSuggestionsPerDomain: 5,     // Max suggestions per domain
  includeCompetitors: false,      // Include competitor matches
}
```

**API Usage**:
```typescript
import { outboundBuyerMatcher } from '@/lib/marketplace/outboundBuyerMatcher'

// Find potential buyers (does NOT send messages)
const matches = outboundBuyerMatcher.findBuyersForDomain('techly.com', 5000)

for (const match of matches) {
  console.log(`Buyer: ${match.buyer.name}`)
  console.log(`Match Score: ${match.matchScore}`)
  console.log(`Suggested Price: $${match.suggestedPrice}`)
  console.log(`Reasoning: ${match.reasoning}`)
}

// Approve a match (required before contact)
outboundBuyerMatcher.approveMatch('techly.com', 'buyer-id')

// Mark as contacted (after manual outreach)
outboundBuyerMatcher.markContacted('techly.com', 'buyer-id')

// Export suggestions
const json = outboundBuyerMatcher.exportMatches('techly.com', 'json')
const csv = outboundBuyerMatcher.exportMatches('techly.com', 'csv')
```

### 5. Registrar Optimization

**Purpose**: Reduce latency for availability checks and domain sniping.

**How it works**:
- Supports regional endpoints for lower latency
- Pre-authenticates to cache tokens for faster requests
- Measures endpoint latency to select optimal routes
- Maintains all safety guardrails (DRY_RUN, caps, circuit breakers)

**Configuration** (in MasterConfig):
```typescript
registrar: {
  defaultRegistrar: 'GoDaddy',         // 'GoDaddy' | 'Namecheap' | 'DropCatch'
  defaultMarketplaces: ['Afternic', 'Dan'],
  preferredRegion: 'us-east',          // Optional: 'us-east' | 'us-west' | 'eu-west'
  preAuthEnabled: false,               // Pre-cache auth tokens
}
```

**API Usage**:
```typescript
import { registrarOptimizer } from '@/lib/buy/registrarOptimizer'

// Get optimal endpoint
const endpoint = await registrarOptimizer.getOptimalEndpoint('GoDaddy')
console.log(endpoint.region)      // Selected region
console.log(endpoint.latencyMs)   // Measured latency

// Pre-authenticate
await registrarOptimizer.preAuthenticate('GoDaddy')

// Check if purchase allowed
const check = registrarOptimizer.canPurchase('example.com', 15, 50)
if (check.allowed) {
  // Safe to purchase
  registrarOptimizer.recordPurchase(15)
} else {
  console.log(check.reason)  // Why purchase was blocked
}
```

### 6. Safety Guardrails

**Purpose**: Prevent accidental overspending and enforce prudent acquisition rules.

**Configuration** (in MasterConfig):
```typescript
safety: {
  dryRun: true,                   // DEFAULT: DRY RUN MODE (no real purchases)
  dailyCapUSD: 200,               // DEFAULT: $200 daily cap
  perDomainCapUSD: 20,            // DEFAULT: $20 per-domain cap
  minMargin: 3.0,                 // DEFAULT: 3.0x minimum margin
  allowedTLDs: ['.com', '.ai', '.io'],  // DEFAULT: Major TLDs only
  circuitBreakerThreshold: 5,     // Failures before circuit breaker
  requireConfirmation: true,      // DEFAULT: REQUIRE CONFIRMATION
}
```

**Key Safety Features**:
- **DRY_RUN Mode**: No real purchases unless explicitly disabled (requires confirmation in UI)
- **Daily Cap**: Maximum daily spend limit
- **Per-Domain Cap**: Maximum spend per single domain
- **Margin Requirement**: Minimum profit margin (e.g., 3.0x = 200% profit)
- **TLD Allowlist**: Only purchase approved TLDs
- **Circuit Breaker**: Stops purchases after repeated failures
- **Confirmation Required**: UI prompts before disabling DRY_RUN or enabling outbound

## UI Controls

All advanced features are configurable through the **AdvancedSettings** component in the EmpireControlCenter.

### Accessing Settings

1. Navigate to Empire Control Center
2. Click on "Advanced Settings" tab
3. Configure each feature with toggles and sliders
4. Changes are saved automatically to MasterConfig

### Confirmation Dialogs

- **Disabling DRY_RUN**: Requires explicit confirmation with warning
- **Enabling Outbound**: Requires explicit opt-in with no-auto-send reminder

## Database Schema

The advanced features use additional Supabase tables:

- `user_settings`: Persists user configuration (JSONB)
- `channel_listings`: Tracks per-channel listings with stats
- `channel_stats`: Aggregated channel performance metrics
- `buyer_suggestions`: Opt-in buyer matches and approval status

See `supabase/schema.sql` for full schema details.

## Integration with Pipeline

The advanced features are integrated into the `AutonomousBrain` hunt cycle:

1. **Before Purchase**: Brandability scoring filters low-quality domains
2. **Safety Checks**: All purchases validated against safety guardrails
3. **After Purchase**: Domains listed on enabled channels with tracking
4. **Repricing**: Channel performance informs pricing adjustments
5. **Outbound**: (If enabled) Buyer suggestions generated for export

## Default Settings Summary

| Feature | Default State | Key Default Values |
|---------|---------------|-------------------|
| Brandability Scoring | Enabled | Min score: 60, max length: 15 |
| Seasonal Analysis | Enabled | 30-day window, spike filter on |
| Channel Tracking | Enabled | Afternic + Dan enabled |
| Outbound Suggestions | **DISABLED** | Require manual approval: true |
| Registrar | GoDaddy | No regional preference |
| Safety | **DRY_RUN: TRUE** | Daily cap: $200, Per-domain: $20, Margin: 3.0x |

## Testing

Tests are included for all new services:
- `brandabilityScorer.test.ts`
- `seasonalTrendAnalyzer.test.ts`
- `channelPerformanceTracker.test.ts`

Run tests with:
```bash
npm test
```

## Security & Privacy

- All settings persisted in Supabase with row-level security (RLS)
- No sensitive data in client-side code
- Outbound features require explicit opt-in
- DRY_RUN mode prevents accidental purchases by default

## Support

For questions or issues with advanced features, please refer to:
- Main README.md
- SETUP_GUIDE.md
- API_SETUP_GUIDE.md
