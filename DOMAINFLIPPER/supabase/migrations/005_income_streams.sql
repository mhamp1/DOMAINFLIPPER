-- Income Streams Integration
-- Adds columns for parking, landing pages, SEO redirects, leasing
-- February 2026

-- Pipeline settings: income stream toggles
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS parking_enabled BOOLEAN DEFAULT true;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS parking_provider TEXT DEFAULT 'bodis';
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS landing_pages_enabled BOOLEAN DEFAULT false;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS redirect_enabled BOOLEAN DEFAULT false;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS redirect_target_url TEXT;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS redirect_min_backlinks INTEGER DEFAULT 50;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS leasing_enabled BOOLEAN DEFAULT false;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS default_lease_monthly DECIMAL(10,2) DEFAULT 200.00;

-- Scan results: add reasoning column
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- Owned domains: income tracking per domain
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS parking_active BOOLEAN DEFAULT false;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS parking_provider TEXT;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS parking_revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS landing_page_url TEXT;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS redirect_target TEXT;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS lease_active BOOLEAN DEFAULT false;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS lease_monthly_rate DECIMAL(10,2);
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS total_income DECIMAL(12,2) DEFAULT 0;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS listed_price DECIMAL(12,2);
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS price_reduced_at TIMESTAMPTZ;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS marketplace TEXT;

-- Domain leases table
CREATE TABLE IF NOT EXISTS domain_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  lessee_email TEXT NOT NULL,
  monthly_rate DECIMAL(10,2) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  total_collected DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE domain_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own leases" ON domain_leases
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_domain_leases_user ON domain_leases(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_leases_domain ON domain_leases(domain);
CREATE INDEX IF NOT EXISTS idx_domain_leases_status ON domain_leases(status);

COMMENT ON COLUMN owned_domains.parking_revenue IS 'Total parking ad revenue earned from this domain';
COMMENT ON COLUMN owned_domains.total_income IS 'Total non-sale income (parking + leasing + affiliate)';
