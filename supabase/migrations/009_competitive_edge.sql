-- 009: Competitive Edge — Autonomous phase system + closeout tracking
-- Apply after migrations 001-008

-- Phase system (autonomous rollout)
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS operating_phase TEXT DEFAULT 'observe';
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS phase_changed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS phase_change_reason TEXT;
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS phase_locked BOOLEAN DEFAULT false;

-- Closeout tracking (daily counters reset by daily-report cron)
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS closeout_buys_today INTEGER DEFAULT 0;
ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS closeout_spend_today DECIMAL(10,2) DEFAULT 0;

-- Add source column to transactions for tracking acquisition channel
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source TEXT;

-- Performance indexes for closeout and generation tracking
CREATE INDEX IF NOT EXISTS idx_owned_domains_acquired_via ON owned_domains(acquired_via);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);

-- Partial index for observe-mode log queries (used by phase evaluator)
CREATE INDEX IF NOT EXISTS idx_bot_logs_observe_picks
  ON bot_logs(user_id, created_at)
  WHERE message ILIKE '%[OBSERVE]%';

-- Index for buyer leads lookup by domain + recency
CREATE INDEX IF NOT EXISTS idx_buyer_leads_domain_recent
  ON buyer_leads(user_id, domain, created_at DESC);
