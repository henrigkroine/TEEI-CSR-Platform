-- FinOps Budget Management Schema Extension
-- Extends existing AI token budgets with comprehensive budget policies

-- Table: finops_budgets
-- Comprehensive budget configuration with policies and enforcement
CREATE TABLE IF NOT EXISTS finops_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  period VARCHAR(20) NOT NULL, -- monthly, quarterly, annual
  categories TEXT[], -- Array of cost categories (AI, COMPUTE, STORAGE, EXPORT, EGRESS)

  -- Policy configuration
  notify_threshold INTEGER NOT NULL DEFAULT 80, -- Percentage (e.g., 80%)
  enforce_threshold INTEGER NOT NULL DEFAULT 100, -- Percentage (e.g., 100%)
  actions TEXT[], -- Array of PolicyAction (notify, rate_limit, block_ai, block_export, alert_admins)
  notify_emails TEXT[], -- Array of email addresses for notifications
  rate_limit_factor DECIMAL(3, 2), -- Rate limit multiplier (e.g., 0.5 for 50% reduction)

  -- Period tracking
  start_date DATE NOT NULL,
  end_date DATE, -- Optional end date for budget
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,

  -- Current spend tracking
  current_spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  projected_spend DECIMAL(12, 2), -- Projected end-of-period spend based on trend

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ok', -- ok, warning, exceeded
  triggered_actions TEXT[], -- Actions that have been triggered

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),

  UNIQUE(tenant_id, name)
);

-- Indexes for budget queries
CREATE INDEX idx_finops_budgets_tenant ON finops_budgets(tenant_id);
CREATE INDEX idx_finops_budgets_enabled ON finops_budgets(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_finops_budgets_status ON finops_budgets(status);
CREATE INDEX idx_finops_budgets_period ON finops_budgets(current_period_start, current_period_end);

-- Table: finops_budget_events
-- Audit trail of budget threshold breaches and policy enforcement
CREATE TABLE IF NOT EXISTS finops_budget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES finops_budgets(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- threshold_reached, limit_exceeded, policy_enforced
  threshold INTEGER NOT NULL, -- Percentage threshold that was crossed
  current_spend DECIMAL(12, 2) NOT NULL,
  budget_amount DECIMAL(12, 2) NOT NULL,
  actions TEXT[], -- Actions that were triggered
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for event queries
CREATE INDEX idx_budget_events_budget ON finops_budget_events(budget_id, triggered_at DESC);
CREATE INDEX idx_budget_events_tenant ON finops_budget_events(tenant_id, triggered_at DESC);
CREATE INDEX idx_budget_events_type ON finops_budget_events(event_type);

-- Table: finops_budget_spend_history
-- Historical spend snapshots for trend analysis
CREATE TABLE IF NOT EXISTS finops_budget_spend_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES finops_budgets(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  snapshot_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cumulative_spend DECIMAL(12, 2) NOT NULL,
  daily_spend DECIMAL(12, 2) NOT NULL,
  projected_spend DECIMAL(12, 2),
  percentage_used DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(budget_id, snapshot_date)
);

-- Indexes for spend history
CREATE INDEX idx_spend_history_budget ON finops_budget_spend_history(budget_id, snapshot_date DESC);
CREATE INDEX idx_spend_history_tenant ON finops_budget_spend_history(tenant_id, snapshot_date DESC);

-- Function to calculate current spend for a budget
CREATE OR REPLACE FUNCTION calculate_budget_spend(
  p_tenant_id VARCHAR(255),
  p_period_start DATE,
  p_period_end DATE,
  p_categories TEXT[]
)
RETURNS DECIMAL(12, 2) AS $$
BEGIN
  -- This function would query the cost_facts table in ClickHouse
  -- For now, return 0 as placeholder
  -- In production, this would be called via a service that queries ClickHouse
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Function to update budget status and trigger events
CREATE OR REPLACE FUNCTION update_budget_status()
RETURNS TRIGGER AS $$
DECLARE
  percentage_used DECIMAL(5, 2);
  should_notify BOOLEAN DEFAULT FALSE;
  should_enforce BOOLEAN DEFAULT FALSE;
BEGIN
  -- Calculate percentage used
  IF NEW.amount > 0 THEN
    percentage_used := (NEW.current_spend / NEW.amount * 100);
  ELSE
    percentage_used := 0;
  END IF;

  -- Determine status
  IF percentage_used >= NEW.enforce_threshold THEN
    NEW.status := 'exceeded';
    should_enforce := TRUE;
  ELSIF percentage_used >= NEW.notify_threshold THEN
    NEW.status := 'warning';
    should_notify := TRUE;
  ELSE
    NEW.status := 'ok';
  END IF;

  -- Update triggered_actions based on thresholds
  IF should_enforce AND NEW.actions IS NOT NULL THEN
    NEW.triggered_actions := NEW.actions;
  ELSIF should_notify THEN
    -- Only trigger notify actions, not enforcement actions
    NEW.triggered_actions := ARRAY(
      SELECT unnest(NEW.actions)
      WHERE unnest(NEW.actions) IN ('notify', 'alert_admins')
    );
  ELSE
    NEW.triggered_actions := ARRAY[]::TEXT[];
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update budget status when spend changes
CREATE TRIGGER trigger_update_budget_status
  BEFORE UPDATE OF current_spend ON finops_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_status();

-- Function to advance budget period (for monthly/quarterly/annual resets)
CREATE OR REPLACE FUNCTION advance_budget_period(p_budget_id UUID)
RETURNS VOID AS $$
DECLARE
  budget_record finops_budgets%ROWTYPE;
  new_period_start DATE;
  new_period_end DATE;
BEGIN
  SELECT * INTO budget_record FROM finops_budgets WHERE id = p_budget_id;

  IF budget_record.period = 'monthly' THEN
    new_period_start := budget_record.current_period_end + INTERVAL '1 day';
    new_period_end := (new_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSIF budget_record.period = 'quarterly' THEN
    new_period_start := budget_record.current_period_end + INTERVAL '1 day';
    new_period_end := (new_period_start + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
  ELSIF budget_record.period = 'annual' THEN
    new_period_start := budget_record.current_period_end + INTERVAL '1 day';
    new_period_end := (new_period_start + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
  ELSE
    RAISE EXCEPTION 'Invalid period: %', budget_record.period;
  END IF;

  UPDATE finops_budgets
  SET
    current_period_start = new_period_start,
    current_period_end = new_period_end,
    current_spend = 0,
    projected_spend = NULL,
    status = 'ok',
    triggered_actions = ARRAY[]::TEXT[],
    updated_at = NOW()
  WHERE id = p_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Function to run daily budget checks (called by scheduler)
CREATE OR REPLACE FUNCTION run_daily_budget_checks()
RETURNS VOID AS $$
DECLARE
  budget_record finops_budgets%ROWTYPE;
BEGIN
  -- Check all enabled budgets
  FOR budget_record IN
    SELECT * FROM finops_budgets WHERE enabled = TRUE
  LOOP
    -- Check if period has ended
    IF budget_record.current_period_end < CURRENT_DATE THEN
      PERFORM advance_budget_period(budget_record.id);
    END IF;

    -- Update spend from ClickHouse (via external service call)
    -- This would be handled by the application layer
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON finops_budgets TO reporting_service;
GRANT SELECT, INSERT ON finops_budget_events TO reporting_service;
GRANT SELECT, INSERT ON finops_budget_spend_history TO reporting_service;

-- Sample data for testing
INSERT INTO finops_budgets (
  tenant_id, name, description, amount, period, categories,
  notify_threshold, enforce_threshold, actions, notify_emails,
  start_date, current_period_start, current_period_end
)
VALUES
  (
    'tenant-demo',
    'Monthly AI Budget',
    'Budget for AI token usage across all models',
    5000,
    'monthly',
    ARRAY['AI'],
    80,
    100,
    ARRAY['notify', 'alert_admins', 'block_ai'],
    ARRAY['admin@demo.com'],
    '2025-01-01',
    '2025-01-01',
    '2025-01-31'
  ),
  (
    'tenant-enterprise',
    'Quarterly Total Budget',
    'Budget for all cost categories',
    50000,
    'quarterly',
    ARRAY['AI', 'COMPUTE', 'STORAGE', 'EXPORT', 'EGRESS'],
    75,
    95,
    ARRAY['notify', 'alert_admins', 'rate_limit'],
    ARRAY['finops@enterprise.com', 'cto@enterprise.com'],
    '2025-01-01',
    '2025-01-01',
    '2025-03-31'
  )
ON CONFLICT (tenant_id, name) DO NOTHING;
