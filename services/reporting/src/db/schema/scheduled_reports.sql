-- Scheduled Reports Schema
-- Manages automated report generation schedules and execution history

-- Report Schedules Table
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(255) NOT NULL,
  template_id VARCHAR(255) NOT NULL,
  schedule_name VARCHAR(500) NOT NULL,
  description TEXT,

  -- Cron expression (e.g., "0 0 1 * *" for monthly on 1st)
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Report configuration
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'html', 'csv', 'xlsx')),
  parameters JSONB NOT NULL,

  -- Email delivery settings
  recipients TEXT[] NOT NULL, -- Array of email addresses
  email_subject VARCHAR(500) NOT NULL,
  email_body TEXT,
  include_attachment BOOLEAN DEFAULT true,

  -- Schedule status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  -- Metadata
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_template CHECK (template_id IN (
    'executive-summary',
    'detailed-impact',
    'stakeholder-briefing',
    'csrd-compliance'
  )),

  -- Max 10 schedules per company
  CONSTRAINT max_schedules_per_company
    CHECK ((SELECT COUNT(*) FROM report_schedules WHERE company_id = report_schedules.company_id) <= 10)
);

-- Index for querying active schedules by company
CREATE INDEX idx_schedules_company_active ON report_schedules(company_id, is_active);

-- Index for finding schedules due to run
CREATE INDEX idx_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;

-- Schedule Executions Table
CREATE TABLE IF NOT EXISTS schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
  report_id VARCHAR(500),

  -- Execution status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'generating',
    'generated',
    'emailing',
    'completed',
    'failed',
    'retrying'
  )),

  -- Retry tracking
  attempt_number INT NOT NULL DEFAULT 1,
  max_attempts INT NOT NULL DEFAULT 3,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INT,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Email delivery
  email_sent_at TIMESTAMPTZ,
  email_recipients TEXT[],
  email_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying executions by schedule
CREATE INDEX idx_executions_schedule ON schedule_executions(schedule_id, created_at DESC);

-- Index for monitoring failed executions
CREATE INDEX idx_executions_failed ON schedule_executions(status, started_at)
  WHERE status IN ('failed', 'retrying');

-- Index for recent execution history
CREATE INDEX idx_executions_recent ON schedule_executions(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for report_schedules
CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for schedule_executions
CREATE TRIGGER update_schedule_executions_updated_at
  BEFORE UPDATE ON schedule_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next run time based on cron expression
-- (Note: This is a placeholder. In production, use pg_cron or calculate in application)
CREATE OR REPLACE FUNCTION calculate_next_run(
  cron_expr VARCHAR,
  last_run TIMESTAMPTZ,
  tz VARCHAR
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_run TIMESTAMPTZ;
BEGIN
  -- This is a simplified version. Real implementation would parse cron expression.
  -- For now, we'll handle this in the application layer using node-cron.
  RETURN NOW() + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- View for schedule overview with execution stats
CREATE OR REPLACE VIEW schedule_overview AS
SELECT
  s.id,
  s.company_id,
  s.schedule_name,
  s.template_id,
  s.cron_expression,
  s.is_active,
  s.last_run_at,
  s.next_run_at,
  s.created_at,
  COUNT(e.id) as total_executions,
  COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as successful_executions,
  COUNT(CASE WHEN e.status = 'failed' THEN 1 END) as failed_executions,
  MAX(e.created_at) as last_execution_at,
  AVG(e.duration_seconds) as avg_duration_seconds
FROM report_schedules s
LEFT JOIN schedule_executions e ON s.id = e.schedule_id
GROUP BY s.id;

-- Comments for documentation
COMMENT ON TABLE report_schedules IS 'Automated report generation schedules with email delivery';
COMMENT ON TABLE schedule_executions IS 'Execution history and status tracking for scheduled reports';
COMMENT ON COLUMN report_schedules.cron_expression IS 'Cron expression for schedule frequency (e.g., "0 0 1 * *" for monthly)';
COMMENT ON COLUMN report_schedules.parameters IS 'JSON configuration for report generation (sections, filters, options)';
COMMENT ON COLUMN schedule_executions.attempt_number IS 'Current retry attempt (max 3 attempts with exponential backoff)';
