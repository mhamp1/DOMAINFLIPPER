-- ============================================================
-- DOMAINFLIPPER PRODUCTION SCHEMA MIGRATION v1.0
-- December 2025
-- ============================================================
-- 
-- ⚠️  HOW TO USE THIS FILE:
-- 
--     1. Open your Supabase Dashboard: https://app.supabase.com
--     2. Select your project
--     3. Go to SQL Editor (left sidebar)
--     4. Click "New Query"
--     5. COPY ALL THE CONTENTS OF THIS FILE (Ctrl+A, Ctrl+C)
--     6. PASTE into the SQL Editor (Ctrl+V)
--     7. Click "Run" or press F5
--
-- ❌ DO NOT type the filename "001_production_schema.sql" into the editor
-- ✅ DO copy the ENTIRE contents of this file and paste it
--
-- ============================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- DOMAIN EVENTS (Normalized event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    event_type TEXT NOT NULL, -- scan_found, valuated, bid_placed, bid_won, listed, offer_received, negotiated, sold, transferred
    event_data JSONB DEFAULT '{}',
    correlation_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_events_domain ON domain_events(domain);
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_correlation ON domain_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_created ON domain_events(created_at);

-- ============================================================
-- VALUATIONS (Prediction history)
-- ============================================================
CREATE TABLE IF NOT EXISTS valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    predicted_value DECIMAL(12,2) NOT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.0,
    confidence_interval_low DECIMAL(12,2),
    confidence_interval_high DECIMAL(12,2),
    calibrated_value DECIMAL(12,2),
    model_version TEXT DEFAULT 'v1',
    features JSONB DEFAULT '{}',
    factors JSONB DEFAULT '{}',
    correlation_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuations_domain ON valuations(domain);
CREATE INDEX IF NOT EXISTS idx_valuations_created ON valuations(created_at);

-- ============================================================
-- CALIBRATION DATA (For model improvement)
-- ============================================================
CREATE TABLE IF NOT EXISTS calibration_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    predicted_value DECIMAL(12,2) NOT NULL,
    actual_sale_price DECIMAL(12,2),
    absolute_error DECIMAL(12,2),
    percent_error DECIMAL(8,4),
    model_version TEXT DEFAULT 'v1',
    sale_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_domain ON calibration_data(domain);

-- ============================================================
-- NEGOTIATION SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS negotiation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    buyer_contact TEXT,
    asking_price DECIMAL(12,2) NOT NULL,
    initial_offer DECIMAL(12,2) NOT NULL,
    current_offer DECIMAL(12,2) NOT NULL,
    floor_price DECIMAL(12,2) NOT NULL,
    target_price DECIMAL(12,2) NOT NULL,
    state TEXT NOT NULL DEFAULT 'initial', -- initial, counter_offered, awaiting_response, in_negotiation, deal_reached, rejected, expired, human_override
    current_round INTEGER DEFAULT 1,
    max_rounds INTEGER DEFAULT 5,
    escalated_to_human BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,
    outcome_price DECIMAL(12,2),
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_negotiations_domain ON negotiation_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_negotiations_state ON negotiation_sessions(state);
CREATE INDEX IF NOT EXISTS idx_negotiations_user ON negotiation_sessions(user_id);

CREATE TRIGGER update_negotiation_sessions_updated_at
    BEFORE UPDATE ON negotiation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- NEGOTIATION ROUNDS
-- ============================================================
CREATE TABLE IF NOT EXISTS negotiation_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES negotiation_sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    party TEXT NOT NULL, -- buyer, seller, system
    offer_amount DECIMAL(12,2) NOT NULL,
    message TEXT,
    auto_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neg_rounds_session ON negotiation_rounds(session_id);

-- ============================================================
-- COMPLIANCE CHECKS
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    check_type TEXT NOT NULL, -- trademark, udrp, banned_terms, brand_impersonation, adult, geo_restriction
    passed BOOLEAN NOT NULL,
    risk_level TEXT, -- low, medium, high, critical
    risk_score INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}',
    correlation_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_domain ON compliance_checks(domain);
CREATE INDEX IF NOT EXISTS idx_compliance_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_passed ON compliance_checks(passed);

-- ============================================================
-- AUDIT LOG (Immutable)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    actor TEXT DEFAULT 'system', -- system, human, api
    domain TEXT,
    inputs JSONB DEFAULT '{}',
    outputs JSONB DEFAULT '{}',
    scores JSONB DEFAULT '{}',
    thresholds JSONB DEFAULT '{}',
    api_response JSONB DEFAULT '{}',
    correlation_id TEXT,
    hash TEXT, -- SHA256 of event data for integrity
    previous_hash TEXT, -- Chain link
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_domain ON audit_log(domain);
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================================
-- KILL SWITCH STATE
-- ============================================================
CREATE TABLE IF NOT EXISTS kill_switch_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    switch_type TEXT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    reason TEXT,
    triggered_by TEXT, -- system, user, circuit_breaker
    triggered_at TIMESTAMPTZ,
    cooldown_until TIMESTAMPTZ,
    auto_reset_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_kill_switch_updated_at
    BEFORE UPDATE ON kill_switch_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SPEND RECORDS (Budget tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS spend_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT,
    amount DECIMAL(12,2) NOT NULL,
    category TEXT NOT NULL, -- acquisition, renewal, listing_fee
    idempotency_key TEXT UNIQUE,
    correlation_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spend_created ON spend_records(created_at);
CREATE INDEX IF NOT EXISTS idx_spend_user ON spend_records(user_id);
CREATE INDEX IF NOT EXISTS idx_spend_category ON spend_records(category);

-- ============================================================
-- JOB QUEUE (For durability)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL, -- scan, valuate, acquire, list, negotiate, transfer
    priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    idempotency_key TEXT UNIQUE,
    correlation_id TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_type ON job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_job_priority ON job_queue(priority);
CREATE INDEX IF NOT EXISTS idx_job_scheduled ON job_queue(scheduled_for);

-- ============================================================
-- API CONFIGS (Encrypted in real deployment)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE, -- godaddy, namecheap, dropcatch, sedo, etc.
    is_configured BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMPTZ,
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_api_configs_updated_at
    BEFORE UPDATE ON api_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- METRICS SNAPSHOTS (Time series)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_time TIMESTAMPTZ DEFAULT NOW(),
    scan_rate DECIMAL(10,2) DEFAULT 0,
    hit_rate DECIMAL(8,4) DEFAULT 0,
    win_rate DECIMAL(8,4) DEFAULT 0,
    snipe_success_rate DECIMAL(8,4) DEFAULT 0,
    total_roi DECIMAL(10,2) DEFAULT 0,
    avg_flip_roi DECIMAL(10,2) DEFAULT 0,
    total_profit DECIMAL(12,2) DEFAULT 0,
    avg_time_to_sale DECIMAL(10,2) DEFAULT 0,
    api_success_rate DECIMAL(8,4) DEFAULT 0,
    avg_api_latency DECIMAL(10,2) DEFAULT 0,
    queue_depth INTEGER DEFAULT 0,
    active_negotiations INTEGER DEFAULT 0,
    portfolio_exposure DECIMAL(8,4) DEFAULT 0,
    max_drawdown DECIMAL(8,4) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    valuation_accuracy DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_time ON metrics_snapshots(snapshot_time);

-- ============================================================
-- OWNED_DOMAINS TABLE (Core domain inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS owned_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    domain TEXT NOT NULL,
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    estimated_value DECIMAL(12,2),
    current_value DECIMAL(12,2),
    listed BOOLEAN DEFAULT FALSE,
    sold BOOLEAN DEFAULT FALSE,
    sale_price DECIMAL(12,2),
    sale_date TIMESTAMPTZ,
    strategy_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owned_domains_domain ON owned_domains(domain);
CREATE INDEX IF NOT EXISTS idx_owned_domains_user ON owned_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_owned_domains_sold ON owned_domains(sold);

-- ============================================================
-- TRANSACTIONS TABLE (All financial transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- buy, sell, purchase, sale
    domain TEXT,
    amount DECIMAL(12,2) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    strategy_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_domain ON transactions(domain);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- ============================================================
-- UPDATE OWNED_DOMAINS TABLE (Add new columns if not exist)
-- ============================================================
DO $$ 
BEGIN
    -- Add tld column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owned_domains' AND column_name = 'tld') THEN
        ALTER TABLE owned_domains ADD COLUMN tld TEXT;
    END IF;
    
    -- Add confidence_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owned_domains' AND column_name = 'confidence_score') THEN
        ALTER TABLE owned_domains ADD COLUMN confidence_score DECIMAL(5,4);
    END IF;
    
    -- Add correlation_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owned_domains' AND column_name = 'correlation_id') THEN
        ALTER TABLE owned_domains ADD COLUMN correlation_id TEXT;
    END IF;
    
    -- Add profit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owned_domains' AND column_name = 'profit') THEN
        ALTER TABLE owned_domains ADD COLUMN profit DECIMAL(12,2);
    END IF;
    
    -- Add roi_percent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owned_domains' AND column_name = 'roi_percent') THEN
        ALTER TABLE owned_domains ADD COLUMN roi_percent DECIMAL(8,2);
    END IF;
    
    -- Add days_to_sale column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owned_domains' AND column_name = 'days_to_sale') THEN
        ALTER TABLE owned_domains ADD COLUMN days_to_sale INTEGER;
    END IF;
END $$;

-- ============================================================
-- UPDATE TRANSACTIONS TABLE (Add new columns if not exist)
-- ============================================================
DO $$ 
BEGIN
    -- Add fee column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'fee') THEN
        ALTER TABLE transactions ADD COLUMN fee DECIMAL(12,2) DEFAULT 0;
    END IF;
    
    -- Add net_amount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'net_amount') THEN
        ALTER TABLE transactions ADD COLUMN net_amount DECIMAL(12,2);
    END IF;
    
    -- Add currency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'currency') THEN
        ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'USD';
    END IF;
    
    -- Add registrar column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'registrar') THEN
        ALTER TABLE transactions ADD COLUMN registrar TEXT;
    END IF;
    
    -- Add marketplace column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'marketplace') THEN
        ALTER TABLE transactions ADD COLUMN marketplace TEXT;
    END IF;
    
    -- Add external_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'external_id') THEN
        ALTER TABLE transactions ADD COLUMN external_id TEXT;
    END IF;
    
    -- Add idempotency_key column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'idempotency_key') THEN
        ALTER TABLE transactions ADD COLUMN idempotency_key TEXT;
    END IF;
    
    -- Add correlation_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'correlation_id') THEN
        ALTER TABLE transactions ADD COLUMN correlation_id TEXT;
    END IF;
END $$;

-- ============================================================
-- VIEWS FOR ANALYTICS
-- ============================================================

-- Daily P&L View
CREATE OR REPLACE VIEW daily_pnl AS
SELECT 
    DATE_TRUNC('day', created_at) AS day,
    SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) AS revenue,
    SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) AS spend,
    SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) AS profit,
    COUNT(CASE WHEN type = 'sale' THEN 1 END) AS sales_count,
    COUNT(CASE WHEN type = 'purchase' THEN 1 END) AS purchases_count
FROM transactions
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- Portfolio Summary View
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
    tld,
    COUNT(*) AS domain_count,
    SUM(purchase_price) AS total_cost,
    SUM(estimated_value) AS total_value,
    SUM(current_value) AS current_value,
    AVG(estimated_value / NULLIF(purchase_price, 0)) AS avg_roi,
    COUNT(CASE WHEN sold = true THEN 1 END) AS sold_count
FROM owned_domains
GROUP BY tld
ORDER BY total_value DESC;

-- Strategy Performance View
CREATE OR REPLACE VIEW strategy_performance AS
SELECT 
    strategy_id,
    COUNT(*) AS domain_count,
    SUM(purchase_price) AS total_invested,
    SUM(profit) AS total_profit,
    AVG(roi_percent) AS avg_roi,
    AVG(days_to_sale) AS avg_days_to_sale,
    COUNT(CASE WHEN sold = true THEN 1 END) AS sold_count,
    COUNT(CASE WHEN sold = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) AS win_rate
FROM owned_domains
WHERE strategy_id IS NOT NULL
GROUP BY strategy_id
ORDER BY total_profit DESC;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE owned_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;
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

-- Create policies (allowing authenticated users full access for now)
-- In production, you'd want more restrictive policies

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Allow authenticated access to owned_domains" ON owned_domains;
DROP POLICY IF EXISTS "Allow authenticated access to transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated access to domain_events" ON domain_events;
DROP POLICY IF EXISTS "Allow authenticated access to valuations" ON valuations;
DROP POLICY IF EXISTS "Allow authenticated access to calibration_data" ON calibration_data;
DROP POLICY IF EXISTS "Allow authenticated access to negotiation_sessions" ON negotiation_sessions;
DROP POLICY IF EXISTS "Allow authenticated access to negotiation_rounds" ON negotiation_rounds;
DROP POLICY IF EXISTS "Allow authenticated access to compliance_checks" ON compliance_checks;
DROP POLICY IF EXISTS "Allow authenticated access to audit_log" ON audit_log;
DROP POLICY IF EXISTS "Allow authenticated access to kill_switch_state" ON kill_switch_state;
DROP POLICY IF EXISTS "Allow authenticated access to spend_records" ON spend_records;
DROP POLICY IF EXISTS "Allow authenticated access to job_queue" ON job_queue;
DROP POLICY IF EXISTS "Allow authenticated access to api_configs" ON api_configs;
DROP POLICY IF EXISTS "Allow authenticated access to metrics_snapshots" ON metrics_snapshots;

CREATE POLICY "Allow authenticated access to owned_domains" ON owned_domains
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to transactions" ON transactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to domain_events" ON domain_events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to valuations" ON valuations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to calibration_data" ON calibration_data
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to negotiation_sessions" ON negotiation_sessions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to negotiation_rounds" ON negotiation_rounds
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to compliance_checks" ON compliance_checks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to audit_log" ON audit_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to kill_switch_state" ON kill_switch_state
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to spend_records" ON spend_records
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to job_queue" ON job_queue
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to api_configs" ON api_configs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated access to metrics_snapshots" ON metrics_snapshots
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ DOMAINFLIPPER Production Schema Migration Complete!';
    RAISE NOTICE 'Core tables: owned_domains, transactions';
    RAISE NOTICE 'Event tables: domain_events, valuations, calibration_data';
    RAISE NOTICE 'Negotiation: negotiation_sessions, negotiation_rounds';
    RAISE NOTICE 'Operations: compliance_checks, audit_log, kill_switch_state, spend_records, job_queue, api_configs, metrics_snapshots';
    RAISE NOTICE 'Views created: daily_pnl, portfolio_summary, strategy_performance';
    RAISE NOTICE 'RLS enabled on all tables with authenticated access policies';
END $$;
