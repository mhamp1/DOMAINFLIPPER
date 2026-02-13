-- Intelligence Layers — cache, self-healing, risk storage
-- February 2026

-- Cache table for market context (6-hour TTL)
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_cache" ON cache FOR ALL USING (true) WITH CHECK (true);

-- Self-healing: disabled sources on bot_state
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS disabled_sources TEXT[] DEFAULT '{}';

-- Risk assessment stored with scan results
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical', NULL));
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '[]';
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS pattern_bonus INTEGER DEFAULT 0;
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS patterns_detected JSONB DEFAULT '[]';
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS strategy TEXT;

-- Risk on review queue
ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '[]';

-- Risk on owned domains (snapshot at purchase)
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS risk_at_purchase JSONB;
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS patterns_at_purchase JSONB;

COMMENT ON TABLE cache IS 'Market context cache with TTL (6-hour default)';
COMMENT ON COLUMN bot_state.disabled_sources IS 'Auto-disabled API sources after repeated failures';
COMMENT ON COLUMN scan_results.risk_level IS 'Risk assessment level at scan time';
COMMENT ON COLUMN scan_results.pattern_bonus IS 'Bonus points from detected value patterns';
