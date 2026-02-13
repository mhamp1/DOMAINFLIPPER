-- Add notification webhook support and scoring weights to pipeline_settings
-- February 2026

ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS notification_webhook TEXT;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS review_threshold DECIMAL(10,2) DEFAULT 50.00;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS min_score INTEGER DEFAULT 40;
ALTER TABLE pipeline_settings ADD COLUMN IF NOT EXISTS scoring_weights JSONB DEFAULT '{}';

COMMENT ON COLUMN pipeline_settings.notification_webhook IS 'Discord or Slack webhook URL for bot notifications';
COMMENT ON COLUMN pipeline_settings.review_threshold IS 'Domains above this price require manual review before bidding';
COMMENT ON COLUMN pipeline_settings.min_score IS 'Minimum score threshold for any bid consideration';
COMMENT ON COLUMN pipeline_settings.scoring_weights IS 'Custom scoring factor weights from calibration (empty = defaults)';
