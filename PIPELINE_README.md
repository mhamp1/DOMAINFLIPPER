# Domain Flipping Pipeline

Complete end-to-end automated domain flipping system with TypeScript orchestration, guardrails, and multi-channel marketplace support.

## Architecture

The pipeline follows a stage-based execution model:

```
Intelligence → Valuation/Pricing → Risk Filters → Availability → Purchase → Listing → Monitoring
```

Each stage includes:
- Try/catch error handling
- Logging and alerting
- Short-circuit on empty results
- Progress tracking

## Components

### Core Services

- **Pipeline Orchestrator** (`src/lib/core/pipeline.ts`) - Main workflow engine
- **Runtime Config** (`src/lib/config/runtimeConfig.ts`) - Environment configuration with validation
- **Alerts System** (`src/lib/utils/alerts.ts`) - Webhook-based alerting and health heartbeat

### Domain Services

- **Valuation Service** (`src/lib/valuation/valuationService.ts`) - Estimates domain values using:
  - Length scoring (shorter = more valuable)
  - TLD premiums (.com, .io, .ai)
  - Keyword analysis
  - Brandability scoring
  - Liquidity discount (30% by default)

- **Pricing Policy** (`src/lib/pricing/policy.ts`) - Calculates list and floor prices with strategies:
  - **Aggressive**: 1.5x list, 1.1x floor (fast turnover)
  - **Balanced**: 2.0x list, 1.3x floor (default)
  - **Premium**: 3.0x list, 1.8x floor (high margins)
  - **Market**: 0.87x list, 0.75x floor (competitive)

- **Availability Service** (`src/lib/availability/availabilityService.ts`) - Checks domain availability across registrars

### Purchase System

- **Purchase Controller** (`src/lib/buy/purchaseController.ts`) - Enforces guardrails:
  - ✅ DRY_RUN mode (enabled by default)
  - ✅ Daily spending limit ($100 default)
  - ✅ Per-domain spending limit ($50 default)
  - ✅ Margin threshold (50% minimum ROI)
  - ✅ TLD allowlist (com, net, org, io, ai)
  - ✅ Spend tracking with daily reset
  - ✅ Audit events

- **Registrar Providers** (`src/lib/buy/providers/registrarProvider.ts`):
  - Stub provider (for testing)
  - GoDaddy provider (TODO: implement)
  - Namecheap provider (TODO: implement)

### Marketplace System

- **Listing Orchestrator** (`src/lib/marketplace/listingOrchestrator.ts`) - Multi-channel listing support
- **Marketplace Providers** (`src/lib/marketplace/providers/marketplaceProvider.ts`):
  - Stub provider (for testing)
  - Sedo provider (TODO: implement)
  - Afternic provider (TODO: implement)

### Supporting Services

- **Escrow Provider** (`src/lib/escrow/provider.ts`) - Escrow transaction management
- **Payment Provider** (`src/lib/payments/provider.ts`) - Payment processing
- **Transfer Service** (`src/lib/transfer/transferService.ts`) - Domain transfer handling

## Configuration

Set environment variables (see `.env.example`):

```bash
# Pipeline Behavior
DRY_RUN=true                    # Safe mode (no real purchases)
SIMULATION=true                 # Simulation mode
MAX_SPEND_PER_DAY=100          # Daily spending limit (USD)
MAX_SPEND_PER_DOMAIN=50        # Per-domain spending limit (USD)
MARGIN_THRESHOLD=50            # Minimum ROI percentage

# Domain Filters
ALLOWED_TLDS=com,net,org,io,ai

# Registrar
REGISTRAR_PROVIDER=godaddy
VITE_GODADDY_API_KEY=your-key
VITE_GODADDY_API_SECRET=your-secret

# Marketplace
MARKETPLACE_CHANNELS=sedo,afternic
VITE_SEDO_API_KEY=your-key
VITE_SEDO_USERNAME=your-username

# Monitoring
ALERT_WEBHOOK=https://your-webhook-url
HEALTH_CHECK_INTERVAL=60000    # milliseconds

# Database
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Usage

### Running the Pipeline

```typescript
import { runPipeline } from '@/workers/pipelineRunner'

// Run with mock data (safe for testing)
await runPipeline(false)

// Run with real intelligence sources
await runPipeline(true)
```

### Custom Intelligence Source

```typescript
import { DomainFlippingPipeline } from '@/lib/core/pipeline'
import { createPurchaseController } from '@/lib/buy/purchaseController'
import { getRuntimeConfig } from '@/lib/config/runtimeConfig'

// Load config
const config = getRuntimeConfig()

// Create purchase controller
const purchaseController = createPurchaseController(config)

// Register providers
// ... (see pipelineRunner.ts for example)

// Create pipeline with hooks
const pipeline = new DomainFlippingPipeline(config, purchaseController, {
  onStageStart: async (stage) => {
    console.log(`Starting: ${stage}`)
  },
  onPurchaseSuccess: async (domain, price) => {
    console.log(`Purchased ${domain.name} for $${price}`)
  },
})

// Run with your intelligence source
const result = await pipeline.run(async () => {
  // Return array of Domain opportunities
  return [
    {
      id: '1',
      name: 'example.com',
      tld: 'com',
      length: 7,
      estimatedValue: 1000,
      aiScore: 85,
      strategyId: 'test',
      status: 'available',
    },
  ]
})

console.log('Pipeline result:', result)
```

## Database Schema

The pipeline uses Supabase with the following tables:

- **opportunities** - Discovered domains
- **valuations** - Domain valuations with factors
- **availability_checks** - Availability check results
- **purchases** - Purchase transactions
- **listings** - Marketplace listings
- **sales** - Completed sales
- **transfers** - Domain transfers
- **spend_ledger** - Daily spending tracking
- **alerts** - System alerts

Apply migrations:

```bash
# Using Supabase CLI
supabase migration up
```

## Safety Features

### Default Safe Configuration

- ✅ **DRY_RUN** enabled by default - No real purchases
- ✅ **Stub providers** return simulated data
- ✅ **Spending limits** enforced at multiple levels
- ✅ **Margin thresholds** prevent unprofitable purchases
- ✅ **TLD allowlist** filters domains
- ✅ **Audit trail** records all actions

### Production Checklist

Before running in production:

1. ✅ Set `DRY_RUN=false` in environment
2. ✅ Configure real registrar API credentials
3. ✅ Configure marketplace API credentials
4. ✅ Set appropriate spending limits
5. ✅ Configure alert webhook
6. ✅ Test with small limits first
7. ✅ Monitor logs and alerts
8. ✅ Review spend ledger regularly

## Testing

Run tests:

```bash
# All pipeline tests
npm test -- src/lib/valuation/valuationService.test.ts \
             src/lib/pricing/policy.test.ts \
             src/lib/buy/purchaseController.test.ts

# Watch mode
npm test:watch
```

Current test coverage:
- ✅ 48 tests passing
- ✅ Valuation logic (12 tests)
- ✅ Pricing strategies (21 tests)
- ✅ Purchase guardrails (15 tests)

## Monitoring

### Logs

The pipeline uses structured logging:

```typescript
import { logger } from '@/lib/utils/logger'

// View logs
const logs = logger.getLogs({ level: 'error', limit: 100 })

// Get stats
const stats = logger.getStats()
```

### Alerts

Configure webhook for critical alerts:

```typescript
import { alertSystem } from '@/lib/utils/alerts'

alertSystem.configure({
  webhookUrl: 'https://your-webhook-url',
  enabled: true,
  minSeverity: 'warning',
})
```

Alert types:
- Purchase success/failure
- Spending limit reached
- Listing created
- Sale completed
- Pipeline errors

### Health Heartbeat

Enable health monitoring:

```typescript
import { healthHeartbeat } from '@/lib/utils/alerts'

healthHeartbeat.configure({
  interval: 60000, // 1 minute
  webhookUrl: 'https://your-webhook-url',
  enabled: true,
})

healthHeartbeat.start()
```

## Extending the Pipeline

### Adding a New Registrar Provider

1. Implement `RegistrarProvider` interface:

```typescript
import type { RegistrarProvider } from '@/lib/buy/providers/registrarProvider'

export class MyRegistrarProvider implements RegistrarProvider {
  name = 'myregistrar'
  
  async purchaseDomain(options) {
    // Implement purchase logic
  }
  
  isConfigured() {
    return !!this.apiKey
  }
  
  async getPrice(domain) {
    // Implement pricing logic
  }
  
  validateOptions(options) {
    // Implement validation
  }
}
```

2. Register with purchase controller:

```typescript
const provider = new MyRegistrarProvider(apiKey, apiSecret)
purchaseController.registerProvider(provider)
purchaseController.setDefaultProvider('myregistrar')
```

### Adding a New Marketplace Provider

Similar to registrar providers, implement `MarketplaceProvider` interface and register with `listingOrchestrator`.

### Adding a New Pipeline Stage

Stages are executed in `DomainFlippingPipeline.run()`. To add a new stage:

1. Add stage logic in the `run()` method
2. Use `runStage()` helper for consistent error handling
3. Update hooks if needed
4. Add tests

## Troubleshooting

### "No opportunities found"

- Check intelligence source is returning domains
- Verify domains meet TLD allowlist
- Review valuation output

### "Guardrails failed"

- Check margin threshold setting
- Verify spending limits not exceeded
- Review TLD allowlist

### "Provider not configured"

- Set API credentials in environment
- Verify `isConfigured()` returns true
- Check for typos in environment variable names

### "Daily limit reached"

- Check `MAX_SPEND_PER_DAY` setting
- Review spend ledger in database
- Wait for daily reset (midnight UTC)

## License

See LICENSE file in repository root.
