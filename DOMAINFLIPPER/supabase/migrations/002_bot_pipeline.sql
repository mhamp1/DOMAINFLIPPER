-- Bot Pipeline Tables
-- Adds bot_state and scan_results for the autonomous pipeline
-- February 2026

-- ============================================
-- BOT STATE TABLE (single row per user)
-- ============================================

CREATE TABLE IF NOT EXISTS bot_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core state
  enabled BOOLEAN NOT NULL DEFAULT false,
  dry_run BOOLEAN NOT NULL DEFAULT true,
  
  -- Last activity
  last_scan_at TIMESTAMPTZ,
  last_bid_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Counters (reset daily by cron)
  scans_today INTEGER NOT NULL DEFAULT 0,
  bids_today INTEGER NOT NULL DEFAULT 0,
  spend_today DECIMAL(12, 2) NOT NULL DEFAULT 0,
  domains_found_today INTEGER NOT NULL DEFAULT 0,
  
  -- Lifetime counters
  total_scans INTEGER NOT NULL DEFAULT 0,
  total_bids INTEGER NOT NULL DEFAULT 0,
  total_spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_domains_acquired INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================
-- SCAN RESULTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Domain info
  domain TEXT NOT NULL,
  tld TEXT NOT NULL,
  source TEXT NOT NULL, -- 'godaddy_auction', 'namecheap', 'expired_domains', etc.
  
  -- Pricing
  current_price DECIMAL(12, 2) NOT NULL,
  estimated_value DECIMAL(12, 2) NOT NULL,
  roi_multiple DECIMAL(8, 2),
  
  -- Scoring breakdown (transparent)
  total_score INTEGER NOT NULL, -- 0-100
  length_score INTEGER NOT NULL DEFAULT 0,
  tld_score INTEGER NOT NULL DEFAULT 0,
  keyword_score INTEGER NOT NULL DEFAULT 0,
  brandability_score INTEGER NOT NULL DEFAULT 0,
  trend_score INTEGER NOT NULL DEFAULT 0,
  
  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('bid', 'skip', 'review', 'dry_run_would_bid')),
  decision_reason TEXT,
  
  -- If bid was placed
  bid_amount DECIMAL(12, 2),
  bid_result TEXT CHECK (bid_result IN ('success', 'failed', 'outbid', NULL)),
  bid_error TEXT,
  
  -- Metadata
  auction_id TEXT,
  auction_end_time TIMESTAMPTZ,
  scan_batch_id TEXT, -- groups results from same scan run
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- BOT LOGS TABLE (immutable activity log)
-- ============================================

CREATE TABLE IF NOT EXISTS bot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'scan_started', 'scan_completed', 'scan_error',
    'domain_scored', 'domain_qualified', 'domain_skipped',
    'bid_placed', 'bid_won', 'bid_lost', 'bid_error',
    'purchase_completed', 'purchase_failed',
    'daily_reset', 'bot_enabled', 'bot_disabled',
    'dry_run_enabled', 'dry_run_disabled',
    'settings_changed', 'spend_limit_reached',
    'error', 'warning', 'info'
  )),
  message TEXT NOT NULL,
  domain TEXT,
  details JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bot_state_user ON bot_state(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_user ON scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_created ON scan_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_domain ON scan_results(domain);
CREATE INDEX IF NOT EXISTS idx_scan_results_score ON scan_results(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_decision ON scan_results(decision);
CREATE INDEX IF NOT EXISTS idx_scan_results_batch ON scan_results(scan_batch_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_user ON bot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_created ON bot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_event ON bot_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_bot_logs_domain ON bot_logs(domain);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- Bot state policies
CREATE POLICY "Users can view own bot state" ON bot_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bot state" ON bot_state
  FOR ALL USING (auth.uid() = user_id);

-- Scan results policies
CREATE POLICY "Users can view own scan results" ON scan_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert scan results" ON scan_results
  FOR INSERT WITH CHECK (true);

-- Bot logs policies
CREATE POLICY "Users can view own bot logs" ON bot_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert bot logs" ON bot_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_bot_state_updated_at 
  BEFORE UPDATE ON bot_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PIPELINE SETTINGS TABLE (create if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core settings
  dry_run BOOLEAN NOT NULL DEFAULT true,

  -- Provider configuration
  registrar_provider TEXT NOT NULL DEFAULT 'GoDaddy',
  marketplace_channels TEXT[] NOT NULL DEFAULT ARRAY['Afternic', 'Dan'],

  -- Spending limits
  max_spend_per_day DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
  max_spend_per_domain DECIMAL(10, 2) NOT NULL DEFAULT 20.00,

  -- ROI requirements
  min_margin_multiplier DECIMAL(5, 2) NOT NULL DEFAULT 3.0,

  -- Domain filters
  allowed_tlds TEXT[] NOT NULL DEFAULT ARRAY['.com', '.ai', '.io'],

  -- Alerting
  alert_webhook_url TEXT,

  -- Metadata
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_daily_spend CHECK (max_spend_per_day > 0 AND max_spend_per_day <= 10000),
  CONSTRAINT valid_domain_spend CHECK (max_spend_per_domain > 0 AND max_spend_per_domain <= 1000),
  CONSTRAINT valid_margin CHECK (min_margin_multiplier >= 1.5 AND min_margin_multiplier <= 100),
  CONSTRAINT valid_registrar CHECK (registrar_provider IN ('GoDaddy', 'Namecheap', 'Auto')),
  CONSTRAINT at_least_one_tld CHECK (array_length(allowed_tlds, 1) > 0),
  CONSTRAINT at_least_one_marketplace CHECK (array_length(marketplace_channels, 1) > 0)
);

ALTER TABLE pipeline_settings ENABLE ROW LEVEL SECURITY;

-- Policies (using IF NOT EXISTS via DO block to avoid duplicates)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_settings' AND policyname = 'Allow authenticated users to read settings') THEN
    CREATE POLICY "Allow authenticated users to read settings"
      ON pipeline_settings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_settings' AND policyname = 'Allow authenticated users to update settings') THEN
    CREATE POLICY "Allow authenticated users to update settings"
      ON pipeline_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pipeline_settings_updated
  ON pipeline_settings (last_updated DESC);

-- Insert default settings if table is empty
INSERT INTO pipeline_settings (
  dry_run, registrar_provider, marketplace_channels,
  max_spend_per_day, max_spend_per_domain, min_margin_multiplier,
  allowed_tlds, alert_webhook_url, updated_by
)
SELECT
  true, 'GoDaddy', ARRAY['Afternic', 'Dan'],
  200.00, 20.00, 3.0,
  ARRAY['.com', '.ai', '.io'], NULL, 'system'
WHERE NOT EXISTS (SELECT 1 FROM pipeline_settings LIMIT 1);

-- Add user_id column if the table existed before this migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pipeline_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE pipeline_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON TABLE bot_state IS 'Current state of the autonomous bot per user';
COMMENT ON TABLE scan_results IS 'Results from each autonomous scan with transparent scoring';
COMMENT ON TABLE bot_logs IS 'Immutable activity log of all bot actions';
