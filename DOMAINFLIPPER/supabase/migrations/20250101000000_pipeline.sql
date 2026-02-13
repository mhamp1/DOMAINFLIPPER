-- Domain Flipping Pipeline Tables
-- Migration for pipeline tracking and audit
-- December 2025

-- ============================================
-- OPPORTUNITIES TABLE
-- Tracks discovered domain opportunities
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tld TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL, -- 'expired_domains', 'reddit', 'sedo', etc.
  estimated_value DECIMAL(12, 2),
  ai_score INTEGER,
  status TEXT NOT NULL CHECK (status IN ('discovered', 'valued', 'filtered', 'purchased', 'rejected')),
  rejection_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opportunities_domain ON opportunities(domain);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_discovered_at ON opportunities(discovered_at);
CREATE INDEX idx_opportunities_user_id ON opportunities(user_id);

-- ============================================
-- VALUATIONS TABLE
-- Stores domain valuation details
-- ============================================
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  estimated_value DECIMAL(12, 2) NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  factors JSONB, -- lengthScore, tldPremium, keywordValue, brandability, liquidity
  comps JSONB, -- comparable sales data
  valued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_valuations_opportunity_id ON valuations(opportunity_id);
CREATE INDEX idx_valuations_domain ON valuations(domain);
CREATE INDEX idx_valuations_valued_at ON valuations(valued_at);

-- ============================================
-- AVAILABILITY_CHECKS TABLE
-- Tracks availability check results
-- ============================================
CREATE TABLE IF NOT EXISTS availability_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  available BOOLEAN NOT NULL,
  provider TEXT NOT NULL, -- 'godaddy', 'namecheap', etc.
  price DECIMAL(12, 2),
  premium BOOLEAN DEFAULT FALSE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_availability_checks_opportunity_id ON availability_checks(opportunity_id);
CREATE INDEX idx_availability_checks_domain ON availability_checks(domain);
CREATE INDEX idx_availability_checks_checked_at ON availability_checks(checked_at);

-- ============================================
-- PURCHASES TABLE
-- Records domain purchase transactions
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  registrar TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  dry_run BOOLEAN DEFAULT FALSE,
  error TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_domain ON purchases(domain);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_purchased_at ON purchases(purchased_at);
CREATE INDEX idx_purchases_dry_run ON purchases(dry_run);

-- ============================================
-- LISTINGS TABLE
-- Tracks marketplace listings
-- ============================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  marketplace TEXT NOT NULL, -- 'sedo', 'afternic', 'flippa', etc.
  listing_id TEXT, -- External listing ID from marketplace
  list_price DECIMAL(12, 2) NOT NULL,
  floor_price DECIMAL(12, 2),
  status TEXT NOT NULL CHECK (status IN ('active', 'sold', 'expired', 'cancelled')),
  views INTEGER DEFAULT 0,
  offers INTEGER DEFAULT 0,
  listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_domain ON listings(domain);
CREATE INDEX idx_listings_marketplace ON listings(marketplace);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_listed_at ON listings(listed_at);

-- ============================================
-- SALES TABLE
-- Records completed domain sales
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  sale_price DECIMAL(12, 2) NOT NULL,
  purchase_price DECIMAL(12, 2),
  profit DECIMAL(12, 2),
  roi_percentage DECIMAL(8, 2),
  marketplace TEXT NOT NULL,
  buyer_email TEXT,
  escrow_transaction_id TEXT,
  payment_transaction_id TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_domain ON sales(domain);
CREATE INDEX idx_sales_sold_at ON sales(sold_at);
CREATE INDEX idx_sales_marketplace ON sales(marketplace);

-- ============================================
-- TRANSFERS TABLE
-- Tracks domain transfer operations
-- ============================================
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  from_registrar TEXT NOT NULL,
  to_registrar TEXT NOT NULL,
  auth_code TEXT,
  transfer_id TEXT, -- External transfer ID
  status TEXT NOT NULL CHECK (status IN ('initiated', 'pending', 'completed', 'failed', 'cancelled')),
  error TEXT,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfers_domain ON transfers(domain);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_initiated_at ON transfers(initiated_at);

-- ============================================
-- SPEND_LEDGER TABLE
-- Tracks daily spending for guardrails
-- ============================================
CREATE TABLE IF NOT EXISTS spend_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  max_spend_per_day DECIMAL(12, 2) NOT NULL,
  purchases JSONB, -- Array of {domain, amount, timestamp}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_spend_ledger_user_id ON spend_ledger(user_id);
CREATE INDEX idx_spend_ledger_date ON spend_ledger(date);

-- ============================================
-- ALERTS TABLE
-- Stores system alerts and notifications
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  webhook_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_read ON alerts(read);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Opportunities policies
CREATE POLICY "Users can view own opportunities" ON opportunities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own opportunities" ON opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own opportunities" ON opportunities
  FOR UPDATE USING (auth.uid() = user_id);

-- Valuations policies (read-only, linked to opportunities)
CREATE POLICY "Users can view valuations for own opportunities" ON valuations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = valuations.opportunity_id 
      AND opportunities.user_id = auth.uid()
    )
  );

-- Availability checks policies
CREATE POLICY "Users can view availability checks for own opportunities" ON availability_checks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = availability_checks.opportunity_id 
      AND opportunities.user_id = auth.uid()
    )
  );

-- Purchases policies
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own purchases" ON purchases
  FOR UPDATE USING (auth.uid() = user_id);

-- Listings policies
CREATE POLICY "Users can view own listings" ON listings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own listings" ON listings
  FOR UPDATE USING (auth.uid() = user_id);

-- Sales policies
CREATE POLICY "Users can view own sales" ON sales
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sales" ON sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transfers policies (read-only)
CREATE POLICY "Users can view transfers for own sales" ON transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = transfers.sale_id 
      AND sales.user_id = auth.uid()
    )
  );

-- Spend ledger policies
CREATE POLICY "Users can view own spend ledger" ON spend_ledger
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own spend ledger" ON spend_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own spend ledger" ON spend_ledger
  FOR UPDATE USING (auth.uid() = user_id);

-- Alerts policies
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at column trigger function (reuse existing)
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spend_ledger_updated_at BEFORE UPDATE ON spend_ledger
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Pipeline funnel view
CREATE OR REPLACE VIEW pipeline_funnel AS
SELECT 
  DATE_TRUNC('day', discovered_at) as date,
  COUNT(*) as opportunities_discovered,
  COUNT(CASE WHEN status = 'valued' THEN 1 END) as opportunities_valued,
  COUNT(CASE WHEN status = 'purchased' THEN 1 END) as opportunities_purchased,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as opportunities_rejected
FROM opportunities
GROUP BY DATE_TRUNC('day', discovered_at)
ORDER BY date DESC;

-- Daily performance view
CREATE OR REPLACE VIEW daily_performance AS
SELECT 
  date,
  total_spend,
  purchase_count,
  COALESCE(listings.listing_count, 0) as listing_count,
  COALESCE(sales.sale_count, 0) as sale_count,
  COALESCE(sales.total_revenue, 0) as total_revenue,
  COALESCE(sales.total_profit, 0) as total_profit
FROM spend_ledger
LEFT JOIN (
  SELECT DATE(listed_at) as date, COUNT(*) as listing_count
  FROM listings
  GROUP BY DATE(listed_at)
) listings ON spend_ledger.date = listings.date
LEFT JOIN (
  SELECT DATE(sold_at) as date, COUNT(*) as sale_count, 
         SUM(sale_price) as total_revenue, 
         SUM(profit) as total_profit
  FROM sales
  GROUP BY DATE(sold_at)
) sales ON spend_ledger.date = sales.date
ORDER BY date DESC;
