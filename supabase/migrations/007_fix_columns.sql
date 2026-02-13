-- Fix missing columns for owned_domains, spend_records, and transactions
-- February 2026

-- owned_domains needs 'status' column for manage-listings + portfolio stats
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'owned';
ALTER TABLE owned_domains ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- spend_records from 001 has different schema than what scan.ts expects
-- Add the columns scan.ts writes to
ALTER TABLE spend_records ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE spend_records ADD COLUMN IF NOT EXISTS spent DECIMAL(12,2) DEFAULT 0;
ALTER TABLE spend_records ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0;

-- transactions needs metadata column for scan bid details
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
