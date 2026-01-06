-- AI Token Budget Tracking Tables
-- Part of FinOps Phase G: AI Cost Controls

-- Table: ai_token_budgets
-- Purpose: Store monthly token budget limits per tenant and model
CREATE TABLE IF NOT EXISTS ai_token_budgets (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  monthly_limit_usd DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
  current_usage_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  token_count_input BIGINT NOT NULL DEFAULT 0,
  token_count_output BIGINT NOT NULL DEFAULT 0,
  reset_date TIMESTAMP NOT NULL,
  soft_limit_notified BOOLEAN NOT NULL DEFAULT FALSE,
  hard_limit_reached BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, model)
);

-- Indexes for fast lookups
CREATE INDEX idx_ai_budgets_tenant ON ai_token_budgets(tenant_id);
CREATE INDEX idx_ai_budgets_reset_date ON ai_token_budgets(reset_date);
CREATE INDEX idx_ai_budgets_hard_limit ON ai_token_budgets(hard_limit_reached) WHERE hard_limit_reached = TRUE;

-- Table: ai_token_usage
-- Purpose: Audit log of every AI API call with token counts and costs
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  report_type VARCHAR(100),
  user_id VARCHAR(255),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for analytics and auditing
CREATE INDEX idx_ai_usage_tenant ON ai_token_usage(tenant_id, timestamp DESC);
CREATE INDEX idx_ai_usage_request ON ai_token_usage(request_id);
CREATE INDEX idx_ai_usage_model ON ai_token_usage(model, timestamp DESC);
CREATE INDEX idx_ai_usage_timestamp ON ai_token_usage(timestamp DESC);

-- Partitioning by month for efficient data retention
-- Create partitions for current month and next 3 months
-- (In production, use pg_partman or similar for automatic partition management)

-- Function to reset monthly budgets
CREATE OR REPLACE FUNCTION reset_monthly_budgets()
RETURNS void AS $$
BEGIN
  -- Reset budgets where reset_date has passed
  UPDATE ai_token_budgets
  SET
    current_usage_usd = 0.00,
    token_count_input = 0,
    token_count_output = 0,
    reset_date = reset_date + INTERVAL '1 month',
    soft_limit_notified = FALSE,
    hard_limit_reached = FALSE,
    updated_at = NOW()
  WHERE reset_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Cron job to run daily (requires pg_cron extension)
-- SELECT cron.schedule('reset-ai-budgets', '0 0 * * *', 'SELECT reset_monthly_budgets()');

-- Function to get budget status for a tenant
CREATE OR REPLACE FUNCTION get_budget_status(p_tenant_id VARCHAR(255))
RETURNS TABLE(
  model VARCHAR(100),
  monthly_limit_usd DECIMAL(10, 2),
  current_usage_usd DECIMAL(10, 2),
  percentage_used DECIMAL(5, 2),
  token_count_input BIGINT,
  token_count_output BIGINT,
  reset_date TIMESTAMP,
  status VARCHAR(20),
  soft_limit_notified BOOLEAN,
  hard_limit_reached BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.model,
    b.monthly_limit_usd,
    b.current_usage_usd,
    ROUND((b.current_usage_usd / b.monthly_limit_usd * 100)::NUMERIC, 2) AS percentage_used,
    b.token_count_input,
    b.token_count_output,
    b.reset_date,
    CASE
      WHEN b.hard_limit_reached THEN 'exceeded'
      WHEN b.current_usage_usd >= b.monthly_limit_usd * 0.8 THEN 'warning'
      ELSE 'ok'
    END AS status,
    b.soft_limit_notified,
    b.hard_limit_reached
  FROM ai_token_budgets b
  WHERE b.tenant_id = p_tenant_id
  ORDER BY b.current_usage_usd DESC;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for fast budget analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_budget_summary AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  tenant_id,
  model,
  COUNT(*) AS request_count,
  SUM(prompt_tokens) AS total_input_tokens,
  SUM(completion_tokens) AS total_output_tokens,
  SUM(cost_usd) AS total_cost_usd,
  AVG(cost_usd) AS avg_cost_per_request
FROM ai_token_usage
GROUP BY DATE_TRUNC('day', timestamp), tenant_id, model;

CREATE UNIQUE INDEX idx_ai_budget_summary ON ai_budget_summary(date, tenant_id, model);

-- Refresh materialized view (run hourly via cron)
-- SELECT cron.schedule('refresh-ai-budget-summary', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY ai_budget_summary');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ai_token_budgets TO reporting_service;
GRANT SELECT, INSERT ON ai_token_usage TO reporting_service;
GRANT SELECT ON ai_budget_summary TO reporting_service;
GRANT USAGE, SELECT ON SEQUENCE ai_token_budgets_id_seq TO reporting_service;
GRANT USAGE, SELECT ON SEQUENCE ai_token_usage_id_seq TO reporting_service;

-- Sample data for testing
INSERT INTO ai_token_budgets (tenant_id, model, monthly_limit_usd, reset_date)
VALUES
  ('tenant-demo', 'claude-3-5-sonnet-20241022', 5000.00, DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  ('tenant-enterprise', 'claude-3-5-sonnet-20241022', 50000.00, DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  ('tenant-startup', 'claude-3-haiku-20240307', 500.00, DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
ON CONFLICT (tenant_id, model) DO NOTHING;
