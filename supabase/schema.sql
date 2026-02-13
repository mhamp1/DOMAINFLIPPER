-- DomainFlipper Production Database Schema
-- Supabase PostgreSQL Schema
-- December 2025 — Full event tracking and audit trails

-- ============================================
-- CORE DOMAIN TABLES
-- ============================================

-- Owned Domains Table (enhanced)
CREATE TABLE IF NOT EXISTS owned_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tld TEXT NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_value DECIMAL(12, 2) NOT NULL,
  current_value DECIMAL(12, 2) NOT NULL,
  confidence_score DECIMAL(5, 2) DEFAULT 0.5,
  confidence_interval_low DECIMAL(12, 2),
  confidence_interval_high DECIMAL(12, 2),
  strategy_id TEXT NOT NULL,
  registrar TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'owned' CHECK (status IN ('owned', 'listed', 'in_escrow', 'sold', 'transferred', 'expired')),
  listed BOOLEAN DEFAULT FALSE,
  sold BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(12, 2),
  sale_date TIMESTAMPTZ,
  profit DECIMAL(12, 2),
  roi_percent DECIMAL(8, 2),
  days_to_sale INTEGER,
  acquired_via TEXT CHECK (acquired_via IN ('auction', 'backorder', 'direct', 'snipe', 'negotiation')),
  correlation_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- ============================================
-- TRANSACTION & EVENT TABLES
-- ============================================

-- Domain Events (normalized event log)
CREATE TABLE IF NOT EXISTS domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'scan_discovered', 'valuation_completed', 'compliance_check', 
    'bid_placed', 'bid_won', 'bid_lost',
    'purchase_initiated', 'purchase_completed', 'purchase_failed',
    'listed', 'listing_updated', 'delisted',
    'inquiry_received', 'offer_received', 'counter_sent', 'offer_accepted', 'offer_rejected',
    'sale_initiated', 'sale_completed', 'sale_failed',
    'transfer_initiated', 'transfer_completed', 'transfer_failed',
    'renewal_due', 'renewed', 'expired'
  )),
  event_data JSONB NOT NULL DEFAULT '{}',
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions Table (financial events)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'bid', 'renewal', 'transfer_fee', 'listing_fee', 'escrow_fee')),
  domain TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  fee DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  strategy_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  registrar TEXT,
  marketplace TEXT,
  external_id TEXT,
  idempotency_key TEXT UNIQUE,
  correlation_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VALUATION & ML TABLES
-- ============================================

-- Valuations Table (prediction history)
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  predicted_value DECIMAL(12, 2) NOT NULL,
  confidence_score DECIMAL(5, 4) NOT NULL,
  confidence_interval_low DECIMAL(12, 2),
  confidence_interval_high DECIMAL(12, 2),
  calibrated_value DECIMAL(12, 2),
  model_version TEXT,
  features JSONB NOT NULL DEFAULT '{}',
  factors JSONB DEFAULT '[]',
  source TEXT DEFAULT 'ai',
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calibration Data (for model improvement)
CREATE TABLE IF NOT EXISTS calibration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  predicted_value DECIMAL(12, 2) NOT NULL,
  actual_sale_price DECIMAL(12, 2) NOT NULL,
  absolute_error DECIMAL(12, 2),
  percent_error DECIMAL(8, 4),
  features JSONB DEFAULT '{}',
  sale_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NEGOTIATION TABLES
-- ============================================

-- Negotiation Sessions
CREATE TABLE IF NOT EXISTS negotiation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('waiting_for_offer', 'evaluating_offer', 'counter_offered', 'accepted', 'rejected', 'expired', 'escalated')),
  asking_price DECIMAL(12, 2) NOT NULL,
  floor_price DECIMAL(12, 2) NOT NULL,
  ceiling_price DECIMAL(12, 2) NOT NULL,
  current_offer DECIMAL(12, 2),
  our_last_counter DECIMAL(12, 2),
  buyer_email TEXT,
  buyer_name TEXT,
  outcome TEXT CHECK (outcome IN ('sold', 'no_deal', 'expired', 'escalated')),
  final_price DECIMAL(12, 2),
  correlation_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Negotiation Rounds
CREATE TABLE IF NOT EXISTS negotiation_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES negotiation_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  their_offer DECIMAL(12, 2),
  our_counter DECIMAL(12, 2),
  action TEXT NOT NULL CHECK (action IN ('offer_received', 'counter_sent', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPLIANCE & AUDIT TABLES
-- ============================================

-- Compliance Checks
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  checks JSONB NOT NULL DEFAULT '[]',
  blocked_by TEXT[],
  warnings TEXT[],
  estimated_legal_risk DECIMAL(12, 2),
  correlation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  action TEXT NOT NULL,
  domain TEXT,
  actor TEXT NOT NULL CHECK (actor IN ('system', 'human', 'api')),
  inputs JSONB DEFAULT '{}',
  outputs JSONB DEFAULT '{}',
  decision JSONB,
  api_response JSONB,
  correlation_id TEXT,
  hash TEXT,
  previous_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OPERATIONAL TABLES
-- ============================================

-- Kill Switch State
CREATE TABLE IF NOT EXISTS kill_switch_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  switch_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  triggered_by TEXT,
  reason TEXT,
  auto_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, switch_type)
);

-- Spend Records
CREATE TABLE IF NOT EXISTS spend_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  domains TEXT[] DEFAULT '{}',
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Job Queue (for persistence)
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  data JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  correlation_id TEXT,
  timeout_ms INTEGER DEFAULT 30000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- API Configurations Table (encrypted)
CREATE TABLE IF NOT EXISTS api_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN (
    'godaddy', 'namecheap', 'dropcatch', 'afternic', 'sedo', 'flippa', 'dan',
    'google', 'twitter', 'uspto', 'stripe', 'infura', 'alchemy'
  )),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT,
  additional_config JSONB DEFAULT '{}',
  sandbox BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Metrics Snapshots (for dashboards)
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('hourly', 'daily', 'weekly', 'monthly')),
  metrics JSONB NOT NULL DEFAULT '{}',
  kpis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_owned_domains_domain ON owned_domains(domain);
CREATE INDEX IF NOT EXISTS idx_owned_domains_strategy ON owned_domains(strategy_id);
CREATE INDEX IF NOT EXISTS idx_owned_domains_status ON owned_domains(status);
CREATE INDEX IF NOT EXISTS idx_owned_domains_sold ON owned_domains(sold);
CREATE INDEX IF NOT EXISTS idx_owned_domains_correlation ON owned_domains(correlation_id);

CREATE INDEX IF NOT EXISTS idx_domain_events_domain ON domain_events(domain);
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_correlation ON domain_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_created ON domain_events(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_domain ON transactions(domain);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transactions_correlation ON transactions(correlation_id);

CREATE INDEX IF NOT EXISTS idx_valuations_domain ON valuations(domain);
CREATE INDEX IF NOT EXISTS idx_valuations_created ON valuations(created_at);

CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_domain ON negotiation_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_state ON negotiation_sessions(state);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_domain ON compliance_checks(domain);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_passed ON compliance_checks(passed);

CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_domain ON audit_log(domain);
CREATE INDEX IF NOT EXISTS idx_audit_log_correlation ON audit_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled ON job_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON job_queue(priority);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE owned_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kill_switch_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES
-- ============================================

-- Owned Domains policies
CREATE POLICY "Users can view own domains" ON owned_domains
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own domains" ON owned_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own domains" ON owned_domains
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own domains" ON owned_domains
  FOR DELETE USING (auth.uid() = user_id);

-- Domain Events policies
CREATE POLICY "Users can view own events" ON domain_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON domain_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Valuation policies
CREATE POLICY "Users can view own valuations" ON valuations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own valuations" ON valuations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Calibration policies
CREATE POLICY "Users can view own calibration" ON calibration_data
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calibration" ON calibration_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Negotiation policies
CREATE POLICY "Users can view own negotiations" ON negotiation_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own negotiations" ON negotiation_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own negotiation rounds" ON negotiation_rounds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM negotiation_sessions WHERE id = session_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert own negotiation rounds" ON negotiation_rounds
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM negotiation_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- Compliance policies
CREATE POLICY "Users can view own compliance" ON compliance_checks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own compliance" ON compliance_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit log policies (read-only for users)
CREATE POLICY "Users can view own audit log" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert audit log" ON audit_log
  FOR INSERT WITH CHECK (true);

-- Kill switch policies
CREATE POLICY "Users can manage own kill switches" ON kill_switch_state
  FOR ALL USING (auth.uid() = user_id);

-- Spend records policies
CREATE POLICY "Users can manage own spend records" ON spend_records
  FOR ALL USING (auth.uid() = user_id);

-- Job queue policies
CREATE POLICY "Users can manage own jobs" ON job_queue
  FOR ALL USING (auth.uid() = user_id);

-- API config policies
CREATE POLICY "Users can view own api configs" ON api_configs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own api configs" ON api_configs
  FOR ALL USING (auth.uid() = user_id);

-- Metrics policies
CREATE POLICY "Users can manage own metrics" ON metrics_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Calculate profit on sale
CREATE OR REPLACE FUNCTION calculate_sale_profit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sold = true AND NEW.sale_price IS NOT NULL AND NEW.profit IS NULL THEN
    NEW.profit = NEW.sale_price - NEW.purchase_price;
    NEW.roi_percent = ((NEW.sale_price - NEW.purchase_price) / NEW.purchase_price) * 100;
    NEW.days_to_sale = EXTRACT(DAY FROM (NEW.sale_date - NEW.purchase_date));
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Calculate net amount on transaction
CREATE OR REPLACE FUNCTION calculate_net_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_amount = NEW.amount - COALESCE(NEW.fee, 0);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_owned_domains_updated_at 
  BEFORE UPDATE ON owned_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER calculate_owned_domains_profit
  BEFORE UPDATE ON owned_domains
  FOR EACH ROW EXECUTE FUNCTION calculate_sale_profit();

CREATE TRIGGER update_negotiation_sessions_updated_at 
  BEFORE UPDATE ON negotiation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kill_switch_updated_at 
  BEFORE UPDATE ON kill_switch_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spend_records_updated_at 
  BEFORE UPDATE ON spend_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_configs_updated_at 
  BEFORE UPDATE ON api_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER calculate_transaction_net_amount
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION calculate_net_amount();

-- ============================================
-- VIEWS
-- ============================================

-- Daily P&L view
CREATE OR REPLACE VIEW daily_pnl AS
SELECT 
  user_id,
  DATE(date) as day,
  SUM(CASE WHEN type = 'sell' THEN net_amount ELSE 0 END) as revenue,
  SUM(CASE WHEN type = 'buy' THEN amount ELSE 0 END) as spent,
  SUM(CASE WHEN type = 'sell' THEN net_amount ELSE -amount END) as net_profit,
  COUNT(DISTINCT CASE WHEN type = 'buy' THEN domain END) as domains_bought,
  COUNT(DISTINCT CASE WHEN type = 'sell' THEN domain END) as domains_sold
FROM transactions
WHERE status = 'completed'
GROUP BY user_id, DATE(date);

-- Portfolio summary view
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
  user_id,
  COUNT(*) as total_domains,
  COUNT(*) FILTER (WHERE status = 'owned') as owned_count,
  COUNT(*) FILTER (WHERE status = 'listed') as listed_count,
  COUNT(*) FILTER (WHERE status = 'sold') as sold_count,
  SUM(purchase_price) as total_invested,
  SUM(current_value) as total_current_value,
  SUM(CASE WHEN sold THEN sale_price - purchase_price ELSE 0 END) as total_realized_profit,
  AVG(roi_percent) FILTER (WHERE sold) as avg_roi,
  AVG(days_to_sale) FILTER (WHERE sold) as avg_days_to_sale
FROM owned_domains
GROUP BY user_id;

-- Strategy performance view
CREATE OR REPLACE VIEW strategy_performance AS
SELECT 
  user_id,
  strategy_id,
  COUNT(*) as total_domains,
  SUM(purchase_price) as total_invested,
  SUM(CASE WHEN sold THEN profit ELSE 0 END) as total_profit,
  AVG(roi_percent) FILTER (WHERE sold) as avg_roi,
  COUNT(*) FILTER (WHERE sold) as domains_sold,
  COUNT(*) FILTER (WHERE sold) * 100.0 / NULLIF(COUNT(*), 0) as sell_rate
FROM owned_domains
GROUP BY user_id, strategy_id;

-- ============================================
-- ADVANCED FEATURES TABLES
-- ============================================

-- User Settings Table (for persisting advanced settings)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Channel Listings Table (tracks listings per channel with stats)
CREATE TABLE IF NOT EXISTS channel_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'Afternic', 'Dan', 'Lander'
  list_price DECIMAL(12, 2) NOT NULL,
  floor_price DECIMAL(12, 2) NOT NULL,
  listed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_repriced_date TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  inquiries INTEGER DEFAULT 0,
  sold BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(12, 2),
  sale_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain, channel)
);

-- Channel Performance Stats Table
CREATE TABLE IF NOT EXISTS channel_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  total_listings INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  avg_sale_price DECIMAL(12, 2) DEFAULT 0,
  avg_days_to_sale DECIMAL(8, 2) DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  inquiry_rate DECIMAL(5, 2) DEFAULT 0,
  close_rate DECIMAL(5, 2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel)
);

-- Buyer Suggestions Table (opt-in only)
CREATE TABLE IF NOT EXISTS buyer_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_industry TEXT,
  buyer_email TEXT,
  match_score INTEGER NOT NULL, -- 0-100
  match_type TEXT NOT NULL, -- 'keyword', 'industry', 'competitor', 'similar'
  suggested_price DECIMAL(12, 2) NOT NULL,
  reasoning TEXT,
  confidence INTEGER, -- 0-100
  approved BOOLEAN DEFAULT FALSE,
  contacted BOOLEAN DEFAULT FALSE,
  contacted_date TIMESTAMPTZ,
  response_received BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_channel_listings_domain ON channel_listings(domain);
CREATE INDEX IF NOT EXISTS idx_channel_listings_channel ON channel_listings(channel);
CREATE INDEX IF NOT EXISTS idx_channel_listings_sold ON channel_listings(sold);
CREATE INDEX IF NOT EXISTS idx_channel_stats_channel ON channel_stats(channel);
CREATE INDEX IF NOT EXISTS idx_buyer_suggestions_domain ON buyer_suggestions(domain);
CREATE INDEX IF NOT EXISTS idx_buyer_suggestions_approved ON buyer_suggestions(approved);
CREATE INDEX IF NOT EXISTS idx_buyer_suggestions_contacted ON buyer_suggestions(contacted);

-- RLS for new tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for channel_listings
CREATE POLICY "Users can view own channel listings" ON channel_listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own channel listings" ON channel_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channel listings" ON channel_listings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own channel listings" ON channel_listings
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for channel_stats
CREATE POLICY "Users can view own channel stats" ON channel_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own channel stats" ON channel_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channel stats" ON channel_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for buyer_suggestions
CREATE POLICY "Users can view own buyer suggestions" ON buyer_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own buyer suggestions" ON buyer_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buyer suggestions" ON buyer_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own buyer suggestions" ON buyer_suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for new tables
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_listings_updated_at BEFORE UPDATE ON channel_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buyer_suggestions_updated_at BEFORE UPDATE ON buyer_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
