-- Database Schema for Notification Integrations
-- Add these tables to the shared schema

-- Slack channel configurations
CREATE TABLE IF NOT EXISTS slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL,
  channel_type VARCHAR(50) NOT NULL, -- 'alerts', 'approvals', 'monitoring', 'reports'
  channel_name VARCHAR(255), -- For reference only (e.g., '#teei-alerts')
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, channel_type)
);

CREATE INDEX idx_slack_channels_company ON slack_channels(company_id);
CREATE INDEX idx_slack_channels_enabled ON slack_channels(enabled);

-- Microsoft Teams channel configurations
CREATE TABLE IF NOT EXISTS teams_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL,
  channel_type VARCHAR(50) NOT NULL, -- 'alerts', 'approvals', 'monitoring', 'reports'
  channel_name VARCHAR(255), -- For reference only
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, channel_type)
);

CREATE INDEX idx_teams_channels_company ON teams_channels(company_id);
CREATE INDEX idx_teams_channels_enabled ON teams_channels(enabled);

-- SMTP domain configurations
CREATE TABLE IF NOT EXISTS smtp_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  dkim_public_key TEXT,
  dkim_private_key TEXT,
  dkim_selector VARCHAR(100) NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  reputation_score INTEGER DEFAULT 100, -- 0-100
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, domain)
);

CREATE INDEX idx_smtp_domains_company ON smtp_domains(company_id);
CREATE INDEX idx_smtp_domains_verified ON smtp_domains(verified);

-- Email reputation metrics (bounces, complaints)
CREATE TABLE IF NOT EXISTS email_reputation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'bounce', 'complaint', 'sent', 'delivered'
  bounce_type VARCHAR(20), -- 'hard', 'soft' (for bounces)
  recipient VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_reputation_company ON email_reputation_metrics(company_id);
CREATE INDEX idx_email_reputation_domain ON email_reputation_metrics(domain);
CREATE INDEX idx_email_reputation_type ON email_reputation_metrics(metric_type);
CREATE INDEX idx_email_reputation_created ON email_reputation_metrics(created_at);

-- Notification delivery logs (for all channels)
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL,
  channel_type VARCHAR(50) NOT NULL, -- 'slack', 'teams', 'email', 'sms'
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  deduplication_key VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_company ON notification_delivery_logs(company_id);
CREATE INDEX idx_notification_logs_channel ON notification_delivery_logs(channel_type);
CREATE INDEX idx_notification_logs_success ON notification_delivery_logs(success);
CREATE INDEX idx_notification_logs_created ON notification_delivery_logs(created_at);
CREATE INDEX idx_notification_logs_dedup ON notification_delivery_logs(deduplication_key);

-- Comments
COMMENT ON TABLE slack_channels IS 'Slack webhook configurations per tenant';
COMMENT ON TABLE teams_channels IS 'Microsoft Teams webhook configurations per tenant';
COMMENT ON TABLE smtp_domains IS 'Custom SMTP domain configurations with DKIM/SPF';
COMMENT ON TABLE email_reputation_metrics IS 'Email bounce and complaint tracking for reputation scoring';
COMMENT ON TABLE notification_delivery_logs IS 'Audit log for all notification deliveries across channels';
