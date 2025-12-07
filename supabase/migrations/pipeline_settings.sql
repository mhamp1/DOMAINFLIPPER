-- Pipeline Settings Table
-- Stores runtime configuration for the autonomous pipeline
-- Created: December 2025

CREATE TABLE IF NOT EXISTS pipeline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
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

-- Enable Row Level Security
ALTER TABLE pipeline_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Allow authenticated users to read settings"
  ON pipeline_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update settings
CREATE POLICY "Allow authenticated users to update settings"
  ON pipeline_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_settings_updated 
  ON pipeline_settings (last_updated DESC);

-- Insert default settings if table is empty
INSERT INTO pipeline_settings (
  dry_run,
  registrar_provider,
  marketplace_channels,
  max_spend_per_day,
  max_spend_per_domain,
  min_margin_multiplier,
  allowed_tlds,
  alert_webhook_url,
  updated_by
) 
SELECT 
  true,
  'GoDaddy',
  ARRAY['Afternic', 'Dan'],
  200.00,
  20.00,
  3.0,
  ARRAY['.com', '.ai', '.io'],
  NULL,
  'system'
WHERE NOT EXISTS (SELECT 1 FROM pipeline_settings LIMIT 1);

COMMENT ON TABLE pipeline_settings IS 'Runtime configuration for autonomous domain pipeline';
COMMENT ON COLUMN pipeline_settings.dry_run IS 'When true, no real purchases are made (default: true for safety)';
COMMENT ON COLUMN pipeline_settings.max_spend_per_day IS 'Maximum daily spending limit in USD';
COMMENT ON COLUMN pipeline_settings.max_spend_per_domain IS 'Maximum spend per individual domain in USD';
COMMENT ON COLUMN pipeline_settings.min_margin_multiplier IS 'Minimum required margin (estimated_value / cost)';
COMMENT ON COLUMN pipeline_settings.allowed_tlds IS 'Whitelist of allowed TLDs (e.g., .com, .ai, .io)';
COMMENT ON COLUMN pipeline_settings.marketplace_channels IS 'Selected marketplace channels for listing';
COMMENT ON COLUMN pipeline_settings.alert_webhook_url IS 'Webhook URL for alerts (e.g., Slack)';
