# Pipeline Settings - Configurable Defaults Guide

## Overview

The pipeline settings feature provides a UI-configurable runtime configuration system for the autonomous domain flipping pipeline. This allows operators to easily adjust key operational parameters without modifying code.

## Default Settings (Safe Defaults)

All settings default to safe values that prevent accidental spending:

- **DRY_RUN**: `true` (no real purchases)
- **Registrar Provider**: `GoDaddy`
- **Marketplace Channels**: `['Afternic', 'Dan']`
- **Max Spend Per Day**: `$200`
- **Max Spend Per Domain**: `$20`
- **Min Margin Multiplier**: `3.0x` (3x return minimum)
- **Allowed TLDs**: `['.com', '.ai', '.io']`
- **Alert Webhook URL**: (empty)

## Configurable Settings

### 1. DRY_RUN Mode

**Default**: `true` (enabled)

Controls whether the pipeline makes real purchases or simulates them.

- **Enabled (`true`)**: No real money is spent. All purchases are simulated and logged with `[DRY_RUN]` prefix.
- **Disabled (`false`)**: Real purchases are made. Requires explicit confirmation to disable.

**Safety**: This setting defaults to `true` and requires explicit user confirmation to disable. This prevents accidental spending.

### 2. Registrar Provider

**Default**: `GoDaddy`

**Options**: 
- `GoDaddy`: Use GoDaddy API exclusively
- `Namecheap`: Use Namecheap API exclusively  
- `Auto`: Automatically choose the cheapest provider for each domain

### 3. Marketplace Channels

**Default**: `['Afternic', 'Dan']`

**Options**: Select one or more from:
- `Afternic`
- `Dan`
- `Sedo`
- `Flippa`
- `GoDaddy`

**Constraint**: At least one marketplace must be selected.

### 4. Max Spend Per Day

**Default**: `$200`

**Range**: `$50 - $1,000`

**Hard Cap**: `$10,000` (enforced by validation)

Maximum total spending allowed per day across all domain purchases.

### 5. Max Spend Per Domain

**Default**: `$20`

**Range**: `$5 - $100`

**Hard Cap**: `$1,000` (enforced by validation)

Maximum amount that can be spent on any single domain.

### 6. Min Margin Multiplier

**Default**: `3.0x`

**Range**: `1.5x - 10x`

**Minimum**: `1.5x` (enforced by validation)

Minimum required margin ratio (estimated_value / cost). For example, a 3.0x multiplier means the estimated value must be at least 3 times the purchase cost.

### 7. Allowed TLDs

**Default**: `['.com', '.ai', '.io']`

**Options**:
- `.com`
- `.ai`
- `.io`
- `.net`
- `.org`
- `.co`

**Constraint**: At least one TLD must be selected.

Only domains with these extensions will be considered for purchase.

### 8. Alert Webhook URL

**Default**: (empty)

**Format**: Valid HTTPS URL (e.g., `https://hooks.slack.com/services/...`)

Optional webhook URL for receiving alerts about important events (purchases, listings, errors).

## Accessing Settings

### UI

The settings can be accessed through the Settings page:

```typescript
import Settings from '@/pages/Settings'
```

Or use the PipelineSettings component directly:

```typescript
import { PipelineSettingsPanel } from '@/components/settings/PipelineSettings'
```

### Programmatic Access

```typescript
import { pipelineSettings } from '@/lib/config/settingsService'

// Get current settings
const settings = pipelineSettings.getSettings()

// Check DRY_RUN mode
const isDryRun = pipelineSettings.isDryRun()

// Check if a domain can be purchased
const { allowed, reason } = pipelineSettings.canPurchase(
  'example.com', 
  15, // price
  50  // estimated value
)

// Get spending limits
const dailyLimit = pipelineSettings.getDailySpendLimit()

// Get selected providers
const registrar = pipelineSettings.getRegistrarProvider()
const marketplaces = pipelineSettings.getMarketplaceChannels()

// Subscribe to settings changes
const unsubscribe = pipelineSettings.subscribe((newSettings) => {
  console.log('Settings updated:', newSettings)
})
```

## Updating Settings

### Via UI

1. Navigate to the Settings page
2. Modify desired settings using the controls
3. Click "Save Settings"
4. For DRY_RUN disable, confirm the action in the modal

### Programmatically

```typescript
import { pipelineSettings } from '@/lib/config/settingsService'

// Update settings
const result = await pipelineSettings.updateSettings({
  maxSpendPerDay: 300,
  minMarginMultiplier: 4.0,
}, 'user_id_here')

if (result.success) {
  console.log('Settings updated successfully')
} else {
  console.error('Failed to update:', result.error)
}

// Reset to defaults
await pipelineSettings.resetToDefaults('user_id_here')
```

## Data Persistence

Settings are persisted in two locations:

1. **Supabase Database** (primary): Settings are stored in the `pipeline_settings` table
2. **LocalStorage** (fallback): If Supabase is unavailable, settings fall back to localStorage

### Supabase Table Schema

```sql
CREATE TABLE pipeline_settings (
  id UUID PRIMARY KEY,
  dry_run BOOLEAN DEFAULT true,
  registrar_provider TEXT DEFAULT 'GoDaddy',
  marketplace_channels TEXT[] DEFAULT ARRAY['Afternic', 'Dan'],
  max_spend_per_day DECIMAL(10, 2) DEFAULT 200.00,
  max_spend_per_domain DECIMAL(10, 2) DEFAULT 20.00,
  min_margin_multiplier DECIMAL(5, 2) DEFAULT 3.0,
  allowed_tlds TEXT[] DEFAULT ARRAY['.com', '.ai', '.io'],
  alert_webhook_url TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

See `supabase/migrations/pipeline_settings.sql` for the complete migration.

## Guardrails

The settings service enforces several guardrails to prevent misconfigurations:

1. **Hard Caps**: Daily and per-domain spending cannot exceed hard-coded maximums
2. **Minimum Margin**: Margin multiplier cannot be below 1.5x
3. **Required Selections**: At least one TLD and marketplace must be selected
4. **Webhook Validation**: Alert webhook URLs must be valid HTTPS URLs
5. **DRY_RUN Default**: Always defaults to `true` on initialization

These guardrails are enforced both client-side (UI validation) and server-side (schema validation).

## Integration with Pipeline

The settings are integrated throughout the pipeline:

### AutonomousBrain

- Checks DRY_RUN mode before processing domains
- Filters domains by allowed TLDs
- Enforces margin requirements
- Uses configured marketplaces for listing
- Respects per-domain spending cap

### RealSniper

- Checks DRY_RUN mode before making purchases
- Validates against per-domain cap
- Validates against daily limit
- Checks margin requirements
- Simulates purchases when DRY_RUN is enabled

### MarketplaceLister

- Lists only on selected marketplace channels
- Filters by configured channels

## Security Considerations

1. **DRY_RUN Protection**: Requires explicit confirmation to disable
2. **Validation**: All settings are validated with Zod schemas
3. **Supabase RLS**: Row-level security policies restrict access to authenticated users
4. **Audit Trail**: `last_updated` and `updated_by` fields track changes

## Testing

Settings validation is thoroughly tested:

```bash
npm test -- src/lib/config/settingsService.test.ts
```

Tests cover:
- Default value validation
- Schema constraints
- Invalid inputs
- Edge cases
- Guardrail enforcement

## Troubleshooting

### Settings Not Persisting

1. Check Supabase connection status
2. Verify RLS policies are configured
3. Check browser localStorage if Supabase is unavailable

### DRY_RUN Can't Be Disabled

1. Ensure you're clicking through the confirmation modal
2. Check browser console for errors
3. Verify settings service is initialized

### Purchases Still Happening in DRY_RUN

This should never happen. If it does:
1. Check logs for `[DRY_RUN]` prefix
2. Verify `pipelineSettings.isDryRun()` returns `true`
3. File a bug report immediately

## Best Practices

1. **Start with DRY_RUN**: Always test with DRY_RUN enabled first
2. **Gradual Increases**: Start with low spending limits and increase gradually
3. **Monitor Closely**: When DRY_RUN is disabled, monitor the pipeline closely
4. **Use Webhooks**: Configure alert webhooks for important notifications
5. **Regular Reviews**: Periodically review and adjust settings based on performance

## Future Enhancements

Potential future additions:
- Time-based settings (different limits for different times of day)
- Per-TLD spending caps
- Dynamic margin adjustments based on market conditions
- Advanced filtering rules
- Settings versioning and rollback
