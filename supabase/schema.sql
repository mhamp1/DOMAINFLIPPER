-- DomainFlipper Database Schema
-- Supabase PostgreSQL Schema

-- Owned Domains Table
CREATE TABLE IF NOT EXISTS owned_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_value DECIMAL(12, 2) NOT NULL,
  current_value DECIMAL(12, 2) NOT NULL,
  strategy_id TEXT NOT NULL,
  listed BOOLEAN DEFAULT FALSE,
  sold BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(12, 2),
  sale_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  domain TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  strategy_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  marketplace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Configurations Table (encrypted)
CREATE TABLE IF NOT EXISTS api_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('godaddy', 'namecheap', 'dropcatch', 'afternic', 'sedo', 'flippa')),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT,
  sandbox BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_owned_domains_domain ON owned_domains(domain);
CREATE INDEX IF NOT EXISTS idx_owned_domains_strategy ON owned_domains(strategy_id);
CREATE INDEX IF NOT EXISTS idx_owned_domains_sold ON owned_domains(sold);
CREATE INDEX IF NOT EXISTS idx_transactions_domain ON transactions(domain);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Row Level Security (RLS)
ALTER TABLE owned_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_configs ENABLE ROW LEVEL SECURITY;

-- Policies (users can only see their own data)
CREATE POLICY "Users can view own domains" ON owned_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domains" ON owned_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains" ON owned_domains
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains" ON owned_domains
  FOR DELETE USING (auth.uid() = user_id);

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- API config policies
CREATE POLICY "Users can view own api configs" ON api_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api configs" ON api_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api configs" ON api_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api configs" ON api_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_owned_domains_updated_at BEFORE UPDATE ON owned_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_configs_updated_at BEFORE UPDATE ON api_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

