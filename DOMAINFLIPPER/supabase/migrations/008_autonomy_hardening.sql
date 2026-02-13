-- Autonomy Hardening Migration
-- February 2026 — Adds cooldown columns, parking DNS tracking, unique constraints

-- Bot state cooldown columns for auto-resume (replaces hard-disable)
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS cooldown_level INTEGER DEFAULT 0;

-- Parking DNS tracking
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS parking_dns_set BOOLEAN DEFAULT FALSE;

-- Acquired via tracking
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS acquired_via TEXT;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS registrar TEXT;

-- Add domain_acquired + domain_sold event types to bot_logs
-- (The CHECK constraint on event_type needs updating to allow new types)
ALTER TABLE bot_logs DROP CONSTRAINT IF EXISTS bot_logs_event_type_check;
ALTER TABLE bot_logs ADD CONSTRAINT bot_logs_event_type_check CHECK (event_type IN (
  'scan_started', 'scan_completed', 'scan_error',
  'domain_scored', 'domain_qualified', 'domain_skipped',
  'bid_placed', 'bid_won', 'bid_lost', 'bid_error',
  'purchase_completed', 'purchase_failed',
  'domain_acquired', 'domain_sold',
  'daily_reset', 'bot_enabled', 'bot_disabled',
  'dry_run_enabled', 'dry_run_disabled',
  'settings_changed', 'spend_limit_reached',
  'error', 'warning', 'info'
));

-- Add 'renewal' to transactions type constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Ensure flip_outcomes has the columns sale detection needs
ALTER TABLE flip_outcomes ADD COLUMN IF NOT EXISTS days_held INTEGER;
ALTER TABLE flip_outcomes ADD COLUMN IF NOT EXISTS acquired_via TEXT;
ALTER TABLE flip_outcomes ADD COLUMN IF NOT EXISTS sold_via TEXT;
ALTER TABLE flip_outcomes ADD COLUMN IF NOT EXISTS outcome TEXT;

COMMENT ON TABLE bot_state IS 'Current state of the autonomous bot per user — includes cooldown for auto-resume';
COMMENT ON COLUMN bot_state.cooldown_until IS 'When cooldown expires and scanning auto-resumes';
COMMENT ON COLUMN bot_state.cooldown_level IS 'Escalation level: 0=1hr, 1=4hr, 2=12hr, 3=24hr';
