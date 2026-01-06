-- Board Pack Scheduler Tables
-- Migration: 008_board_pack_scheduler

-- Board pack schedules
CREATE TABLE IF NOT EXISTS board_pack_schedules (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule VARCHAR(100) NOT NULL, -- cron expression
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of email addresses
  include_reports JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of report types
  include_ics BOOLEAN NOT NULL DEFAULT true,
  include_watermark BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT valid_recipients CHECK (jsonb_typeof(recipients) = 'array'),
  CONSTRAINT valid_reports CHECK (jsonb_typeof(include_reports) = 'array')
);

-- Execution history for board pack deliveries
CREATE TABLE IF NOT EXISTS board_pack_execution_history (
  id VARCHAR(64) PRIMARY KEY,
  schedule_id VARCHAR(64) NOT NULL REFERENCES board_pack_schedules(id) ON DELETE CASCADE,
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  duration INTEGER, -- milliseconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Email delivery receipts (tracks individual email deliveries)
CREATE TABLE IF NOT EXISTS board_pack_delivery_receipts (
  id VARCHAR(64) PRIMARY KEY,
  execution_id VARCHAR(64) NOT NULL REFERENCES board_pack_execution_history(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
  sendgrid_message_id VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  bounce_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_receipt_status CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_pack_schedules_company ON board_pack_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_board_pack_schedules_tenant ON board_pack_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_board_pack_schedules_enabled ON board_pack_schedules(enabled);

CREATE INDEX IF NOT EXISTS idx_board_pack_execution_schedule ON board_pack_execution_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_board_pack_execution_time ON board_pack_execution_history(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_board_pack_execution_status ON board_pack_execution_history(status);

CREATE INDEX IF NOT EXISTS idx_board_pack_receipts_execution ON board_pack_delivery_receipts(execution_id);
CREATE INDEX IF NOT EXISTS idx_board_pack_receipts_recipient ON board_pack_delivery_receipts(recipient);
CREATE INDEX IF NOT EXISTS idx_board_pack_receipts_status ON board_pack_delivery_receipts(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_board_pack_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER board_pack_schedule_updated
  BEFORE UPDATE ON board_pack_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_board_pack_schedule_timestamp();

-- Sample data for testing (optional)
-- INSERT INTO board_pack_schedules (
--   id, company_id, tenant_id, name, description, schedule, timezone,
--   recipients, include_reports, include_ics, include_watermark, created_by
-- ) VALUES (
--   'sched-demo-001',
--   'demo-company',
--   'tenant-001',
--   'Quarterly Board Pack',
--   'Automated quarterly board pack delivery',
--   '0 9 1 */3 *', -- First day of every quarter at 9 AM
--   'America/New_York',
--   '["board@example.com", "ceo@example.com"]'::jsonb,
--   '["quarterly", "investor"]'::jsonb,
--   true,
--   true,
--   'admin-user'
-- );
