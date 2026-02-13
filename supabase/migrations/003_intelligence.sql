-- Intelligence Layer Tables
-- Adds flip_outcomes tracking and review_queue for smart bidding
-- February 2026

-- ============================================
-- FLIP OUTCOMES TABLE (tracks buy-to-sell performance)
-- ============================================

CREATE TABLE IF NOT EXISTS flip_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  domain TEXT NOT NULL,
  tld TEXT NOT NULL,
  
  -- Purchase data
  purchase_price DECIMAL(12, 2) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  purchase_source TEXT, -- 'godaddy_auction', 'namecheap', etc.
  score_at_purchase INTEGER,
  score_breakdown_at_purchase JSONB,
  
  -- Sale data (filled when sold)
  sell_price DECIMAL(12, 2),
  sell_date TIMESTAMPTZ,
  sell_venue TEXT, -- 'GoDaddy', 'Afternic', 'Dan', 'Direct', etc.
  days_to_sell INTEGER,
  
  -- Computed columns
  profit DECIMAL(12, 2) GENERATED ALWAYS AS (sell_price - purchase_price) STORED,
  roi_percent DECIMAL(8, 2) GENERATED ALWAYS AS (
    CASE WHEN purchase_price > 0 AND sell_price IS NOT NULL
      THEN (sell_price - purchase_price) / purchase_price * 100
      ELSE NULL
    END
  ) STORED,
  
  -- Score accuracy tracking (for calibration)
  estimated_value_at_purchase DECIMAL(12, 2),
  score_accuracy TEXT CHECK (score_accuracy IN ('overvalued', 'undervalued', 'accurate', NULL)),
  
  status TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'listed', 'sold', 'expired', 'dropped')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVIEW QUEUE TABLE (high-value domains needing human approval)
-- ============================================

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  domain TEXT NOT NULL,
  source TEXT NOT NULL,
  
  -- Scoring info
  total_score INTEGER NOT NULL,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  estimated_value DECIMAL(12, 2) NOT NULL,
  confidence INTEGER NOT NULL,
  
  -- Auction info
  current_price DECIMAL(12, 2) NOT NULL,
  recommended_bid DECIMAL(12, 2) NOT NULL,
  max_proxy_bid DECIMAL(12, 2),
  auction_id TEXT,
  auction_end_time TIMESTAMPTZ,
  
  -- Decision
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired', 'auto_bid')),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  -- Enrichment data snapshot
  enrichment_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_flip_outcomes_user ON flip_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_flip_outcomes_domain ON flip_outcomes(domain);
CREATE INDEX IF NOT EXISTS idx_flip_outcomes_status ON flip_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_flip_outcomes_profit ON flip_outcomes(profit DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_review_queue_user ON review_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_created ON review_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_auction_end ON review_queue(auction_end_time);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE flip_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flip outcomes" ON flip_outcomes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage flip outcomes" ON flip_outcomes
  FOR ALL WITH CHECK (true);

CREATE POLICY "Users can view own review queue" ON review_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own review queue" ON review_queue
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "System can insert review queue" ON review_queue
  FOR INSERT WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_flip_outcomes_updated_at
  BEFORE UPDATE ON flip_outcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS (for calibration dashboard)
-- ============================================

CREATE OR REPLACE VIEW flip_performance AS
SELECT
  user_id,
  COUNT(*) as total_flips,
  COUNT(*) FILTER (WHERE status = 'sold') as completed_flips,
  COUNT(*) FILTER (WHERE profit > 0) as profitable_flips,
  COUNT(*) FILTER (WHERE profit <= 0 AND sell_price IS NOT NULL) as unprofitable_flips,
  ROUND(AVG(roi_percent) FILTER (WHERE sell_price IS NOT NULL), 1) as avg_roi,
  ROUND(AVG(days_to_sell) FILTER (WHERE sell_price IS NOT NULL), 0) as avg_days_to_sell,
  SUM(profit) FILTER (WHERE sell_price IS NOT NULL) as total_profit,
  SUM(purchase_price) as total_invested,
  ROUND(
    COUNT(*) FILTER (WHERE profit > 0)::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE sell_price IS NOT NULL), 0) * 100, 1
  ) as win_rate
FROM flip_outcomes
GROUP BY user_id;

COMMENT ON TABLE flip_outcomes IS 'Tracks domain buy-to-sell performance for scoring calibration';
COMMENT ON TABLE review_queue IS 'High-value domains requiring manual approval before bidding';
