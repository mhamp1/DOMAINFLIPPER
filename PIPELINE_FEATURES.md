# Domain Flipping Pipeline - Advanced Features

This document describes the advanced features added to the domain flipping pipeline.

## Table of Contents

1. [Comparable Sales Valuation](#comparable-sales-valuation)
2. [Momentum & Negative Filters](#momentum--negative-filters)
3. [Clustered De-duplication](#clustered-de-duplication)
4. [Pricing Policy](#pricing-policy)
5. [Multi-Channel Sync](#multi-channel-sync)
6. [Anomaly Alerts](#anomaly-alerts)
7. [Configuration](#configuration)

---

## Comparable Sales Valuation

**Location**: `src/lib/valuation/comparableSales.ts`

### Features

- **Comp-Driven Pricing**: Fetch comparable sales data from NameBio API or use configurable stub data
- **Statistical Analysis**: Calculate median, percentiles (p25, p75), mean, min, and max
- **Liquidity Discount**: Apply configurable discount (default 15%) for quick-sale scenarios
- **Confidence Scoring**: Based on sample size (higher sample = higher confidence)

### Usage

```typescript
import { getCompDrivenValuation, enhanceValuationWithComps } from '@/lib/valuation/comparableSales'

// Get comp-driven valuation
const result = await getCompDrivenValuation('example.com', {
  liquidityDiscount: 0.85, // 15% discount
  minSampleSize: 10,
})

console.log(`Estimated Value: $${result.estimatedValue}`)
console.log(`Sample Size: ${result.compStats.sampleSize}`)
console.log(`Confidence: ${result.confidence}%`)

// Enhance existing valuation with comps
const enhanced = await enhanceValuationWithComps('example.com', 10000, {
  liquidityDiscount: 0.85,
  weight: 0.6, // 60% weight to comps, 40% to base
})

console.log(`Final Value: $${enhanced.finalValue}`)
```

### Configuration

Set `VITE_NAMEBIO_API_KEY` in your `.env` file to use real NameBio data. Otherwise, stub data is used.

---

## Momentum & Negative Filters

**Location**: `src/lib/intelligence/filters.ts`

### Features

- **Momentum Scoring**: Calculate rate-of-change and persistence over time
- **Profanity Filter**: Block domains with offensive/inappropriate terms
- **Trademark Filter**: Detect high-risk brand names (Google, Apple, Amazon, etc.)
- **Scam Filter**: Flag get-rich-quick schemes and dubious niches

### Usage

```typescript
import {
  calculateMomentumScore,
  applyFilters,
  DEFAULT_FILTER_SETTINGS,
  generateMockHistoricalData,
} from '@/lib/intelligence/filters'

// Calculate momentum
const historicalData = generateMockHistoricalData('crypto', 30, 'rising')
const momentum = calculateMomentumScore('crypto', historicalData)

console.log(`Trend: ${momentum.trend}`)
console.log(`Score: ${momentum.score}/100`)
console.log(`Persistence: ${momentum.persistence} days`)

// Apply all filters
const result = applyFilters('gooddomain.com', momentum, DEFAULT_FILTER_SETTINGS)

if (result.passed) {
  console.log('Domain passed all filters!')
} else {
  console.log('Domain rejected:', result.reasons.join(', '))
}
```

### Settings (in EmpireSettings)

```typescript
{
  momentumThreshold: 50,          // Minimum momentum score (0-100)
  persistenceThreshold: 3,        // Minimum days of persistence
  enableProfanityFilter: true,
  enableTMFilter: true,
  enableScamFilter: true,
}
```

---

## Clustered De-duplication

**Location**: `src/lib/utils/deduplication.ts`

### Features

- **Plural/Singular Variants**: Detect apple.com ↔ apples.com
- **Hyphen Variants**: Detect webapp.com ↔ web-app.com
- **Edit Distance**: Detect close typos (apple.com ↔ aple.com)
- **Best Representative**: Keep highest-scoring domain from each cluster
- **Detailed Reports**: See how many duplicates were found by type

### Usage

```typescript
import {
  deduplicateDomains,
  getDeduplicationReport,
  type DomainCandidate,
} from '@/lib/utils/deduplication'

const candidates: DomainCandidate[] = [
  { domain: 'apple.com', score: 90, estimatedValue: 10000 },
  { domain: 'apples.com', score: 85, estimatedValue: 8000 },
  { domain: 'app-le.com', score: 75, estimatedValue: 5000 },
]

// Get deduplicated list
const deduplicated = deduplicateDomains(candidates, {
  checkPlural: true,
  checkHyphen: true,
  checkEditDistance: true,
  maxEditDistance: 2,
})

console.log(`Reduced from ${candidates.length} to ${deduplicated.length} domains`)

// Get detailed report
const report = getDeduplicationReport(candidates)
console.log(`Plural variants found: ${report.duplicatesFound.plural}`)
console.log(`Hyphen variants found: ${report.duplicatesFound.hyphen}`)
console.log(`Edit distance variants: ${report.duplicatesFound.editDistance}`)
```

---

## Pricing Policy

**Location**: `src/lib/pricing/pricingPolicy.ts`

### Features

- **Liquidation Price**: Quick-sale price (default 75% of aspirational)
- **Aspirational Price**: Optimistic market price (1.3x base valuation)
- **Floor Price**: Absolute minimum (default 55% of aspirational)
- **Auto-Reprice Rules**: Triggered by days on market, low interest, or channel performance
- **Batch Processing**: Reprice multiple domains at once

### Usage

```typescript
import {
  calculatePricingStrategy,
  autoRepriceDomain,
  DEFAULT_PRICING_POLICY,
} from '@/lib/pricing/pricingPolicy'

// Calculate pricing
const strategy = calculatePricingStrategy('example.com', 10000, DEFAULT_PRICING_POLICY)

console.log(`List Price: $${strategy.listPrice}`)
console.log(`Liquidation: $${strategy.liquidationPrice}`)
console.log(`Floor: $${strategy.floorPrice}`)

// Auto-reprice based on performance
strategy.daysOnMarket = 35 // Listed for 35 days
const repriceResult = autoRepriceDomain('example.com', strategy, DEFAULT_PRICING_POLICY)

if (repriceResult.success) {
  console.log(`Repriced: $${repriceResult.oldPrice} → $${repriceResult.newPrice}`)
  console.log(`Rules: ${repriceResult.appliedRules.join(', ')}`)
}
```

### Default Reprice Rules

1. **30 days**: Reduce by 10%
2. **60 days**: Reduce to liquidation price
3. **90 days**: Set to floor price
4. **Low interest** (< 10 views in 14 days): Reduce by 15%
5. **High interest** (2+ offers): Increase by 5%

### Settings (in EmpireSettings)

```typescript
{
  liquidationDiscount: 0.75,    // 75% of aspirational
  floorDiscount: 0.55,          // 55% of aspirational
  autoRepriceEnabled: true,
}
```

---

## Multi-Channel Sync

**Location**: `src/lib/marketplace/multiChannelSync.ts`

### Features

- **Price Consistency**: Ensure same price/floor across all channels
- **Propagate Updates**: Update all channels when price changes
- **Fail Closed**: Rollback on any channel error
- **Status Tracking**: Monitor listing status per channel
- **Reconciliation**: Fix inconsistencies automatically

### Usage

```typescript
import {
  syncPriceAcrossChannels,
  checkChannelConsistency,
  cancelListingAcrossChannels,
  type ChannelListing,
} from '@/lib/marketplace/multiChannelSync'

const channels: ChannelListing[] = [
  {
    channel: 'afternic',
    listingId: 'abc123',
    domain: 'example.com',
    price: 10000,
    floorPrice: 5000,
    status: 'active',
    lastSync: new Date(),
  },
  // ... more channels
]

// Sync price across all channels
const result = await syncPriceAcrossChannels('example.com', 9000, 5000, channels)

if (result.success) {
  console.log('Price synced across all channels')
} else {
  console.log('Sync failed on:', result.failedChannels.join(', '))
}

// Check consistency
const status = checkChannelConsistency('example.com', channels)
if (!status.isConsistent) {
  console.log('Issues found:', status.inconsistencies.join(', '))
}

// Cancel listing everywhere
await cancelListingAcrossChannels('example.com', channels)
```

### Supported Channels

- Afternic
- Sedo
- Flippa
- GoDaddy Marketplace
- Namecheap Marketplace

---

## Anomaly Alerts

**Location**: `src/lib/health/anomalyAlerts.ts`

### Features

- **Spend Spike Detection**: Alert on unusual spending patterns
- **Provider Error Tracking**: Detect repeated API failures
- **Listing Mismatch Detection**: Find price/status inconsistencies
- **Budget Overrun Alerts**: Warn when exceeding daily budget
- **Severity Levels**: Low, medium, high, critical
- **Alert Callbacks**: Subscribe to alerts for custom handling

### Usage

```typescript
import { anomalyDetector, DEFAULT_ANOMALY_THRESHOLDS } from '@/lib/health/anomalyAlerts'

// Update thresholds
anomalyDetector.updateThresholds({
  spendSpikePercent: 200,      // 200% increase triggers alert
  providerErrorThreshold: 5,   // 5 consecutive errors
  budgetOverrunPercent: 110,   // 110% of budget
})

// Record spend
anomalyDetector.recordSpend(150, 'example.com', 'godaddy')

// Record provider error
anomalyDetector.recordProviderError('namecheap', 'API timeout', '/domains/check')

// Check budget overrun
anomalyDetector.checkBudgetOverrun(100, 125) // $100 budget, $125 spent

// Get alerts
const alerts = anomalyDetector.getAlerts({
  unacknowledgedOnly: true,
  severity: 'high',
})

alerts.forEach(alert => {
  console.log(`[${alert.severity}] ${alert.message}`)
})

// Subscribe to alerts
anomalyDetector.onAlert(alert => {
  if (alert.severity === 'critical') {
    // Send urgent notification
  }
})
```

### Settings (in EmpireSettings)

```typescript
{
  spendSpikePercent: 200,           // % increase to trigger alert
  spendSpikeWindow: 1,              // Hours to compare
  providerErrorThreshold: 5,        // Consecutive errors
  providerErrorWindow: 15,          // Minutes window
  listingMismatchThreshold: 3,      // Number of mismatches
  budgetOverrunPercent: 110,        // % of budget
}
```

---

## Configuration

All settings are configurable in `EmpireSettings` (`src/lib/config/EmpireSettings.ts`):

```typescript
export interface EmpireSettingsData {
  // ... existing settings ...
  
  // Momentum & Filter Settings
  momentumThreshold: number
  persistenceThreshold: number
  enableProfanityFilter: boolean
  enableTMFilter: boolean
  enableScamFilter: boolean
  
  // Pricing Policy Settings
  liquidationDiscount: number
  floorDiscount: number
  autoRepriceEnabled: boolean
  
  // Anomaly Alert Thresholds
  spendSpikePercent: number
  spendSpikeWindow: number
  providerErrorThreshold: number
  providerErrorWindow: number
  listingMismatchThreshold: number
  budgetOverrunPercent: number
}
```

### Defaults

All features have sensible defaults that work out-of-the-box:

- **Momentum**: Threshold 50/100, persistence 3 days, all filters enabled
- **Pricing**: 75% liquidation, 55% floor, auto-reprice enabled
- **Anomalies**: 200% spend spike, 5 errors, 110% budget

### UI Configuration

Settings are accessible through the UI Config tab and persisted in localStorage + MasterConfig.

---

## Testing

All features include comprehensive tests:

```bash
npm test -- src/lib/valuation/comparableSales.test.ts
npm test -- src/lib/intelligence/filters.test.ts
npm test -- src/lib/utils/deduplication.test.ts
```

Total: 37 tests passing

---

## Integration Examples

### Complete Pipeline

```typescript
import { getCompDrivenValuation } from '@/lib/valuation/comparableSales'
import { applyFilters, calculateMomentumScore } from '@/lib/intelligence/filters'
import { deduplicateDomains } from '@/lib/utils/deduplication'
import { calculatePricingStrategy } from '@/lib/pricing/pricingPolicy'
import { syncPriceAcrossChannels } from '@/lib/marketplace/multiChannelSync'
import { anomalyDetector } from '@/lib/health/anomalyAlerts'

async function processDomain(domain: string) {
  // 1. Get comp-driven valuation
  const valuation = await getCompDrivenValuation(domain)
  
  // 2. Check momentum and filters
  const historicalData = await fetchHistoricalData(domain)
  const momentum = calculateMomentumScore(domain, historicalData)
  const filterResult = applyFilters(domain, momentum, settings)
  
  if (!filterResult.passed) {
    console.log(`❌ ${domain} filtered out:`, filterResult.reasons)
    return
  }
  
  // 3. Calculate pricing strategy
  const pricing = calculatePricingStrategy(domain, valuation.estimatedValue, settings)
  
  // 4. List on channels
  const channels = await listOnChannels(domain, pricing)
  
  // 5. Sync prices
  await syncPriceAcrossChannels(domain, pricing.listPrice, pricing.floorPrice, channels)
  
  // 6. Record spend and check for anomalies
  anomalyDetector.recordSpend(pricing.listPrice, domain, 'godaddy')
  
  console.log(`✅ ${domain} processed successfully`)
}
```

---

## Support

For questions or issues with these features, please check:

- Code comments in each module
- Test files for usage examples
- Existing issues in the repository

---

## Changelog

### Version 1.0 (2025-12-07)

- ✅ Comparable sales valuation with NameBio integration
- ✅ Momentum scoring and negative filters
- ✅ Clustered de-duplication (plural, hyphen, edit distance)
- ✅ Liquidation vs aspirational pricing with auto-reprice
- ✅ Multi-channel sync with fail-closed safeguards
- ✅ Anomaly alerts for spend, errors, and mismatches
- ✅ Comprehensive test coverage (37 tests)
- ✅ Full configuration integration

---

## License

Same as parent project.
