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

