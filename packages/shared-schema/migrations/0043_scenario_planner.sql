-- Migration: Add Scenario Planner support
-- Create scenarios table for "what-if" modeling of VIS/SROI/SDG metrics

-- Create scenarios table
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL, -- ScenarioParameters JSON
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_executed_at TIMESTAMPTZ,
  result JSONB, -- ScenarioResult JSON (cached)
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for scenarios
CREATE INDEX idx_scenarios_company ON scenarios(company_id);
CREATE INDEX idx_scenarios_company_archived ON scenarios(company_id, is_archived);
CREATE INDEX idx_scenarios_created_by ON scenarios(created_by);
CREATE INDEX idx_scenarios_created_at ON scenarios(created_at DESC);
CREATE INDEX idx_scenarios_tags ON scenarios USING GIN(tags);

-- Add metrics_company_period table if not exists (for SROI baseline data)
CREATE TABLE IF NOT EXISTS metrics_company_period (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sroi_ratio NUMERIC(10,2),
  total_investment NUMERIC(12,2),
  total_social_value NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, period_start, period_end)
);

-- Create indexes for metrics_company_period
CREATE INDEX IF NOT EXISTS idx_metrics_company_period_company ON metrics_company_period(company_id);
CREATE INDEX IF NOT EXISTS idx_metrics_company_period_dates ON metrics_company_period(period_start, period_end);

-- Add program_enrollments table if not exists (for program mix data)
CREATE TABLE IF NOT EXISTS program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('buddy', 'language', 'mentorship', 'upskilling')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for program_enrollments
CREATE INDEX IF NOT EXISTS idx_program_enrollments_company ON program_enrollments(company_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_user ON program_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_type ON program_enrollments(program_type);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_dates ON program_enrollments(enrolled_at);

-- Add companies table reference if needed (for company_name in exports)
-- Assuming companies table already exists with name column

-- Add comment for documentation
COMMENT ON TABLE scenarios IS 'Scenario Planner: "What-if" modeling for VIS/SROI/SDG metrics with parameterized adjustments';
COMMENT ON COLUMN scenarios.parameters IS 'JSON object containing scenario parameter adjustments (volunteer hours, grant amounts, cohort sizes, program mix, etc.)';
COMMENT ON COLUMN scenarios.result IS 'Cached JSON result from last scenario execution (metric deltas, SDG coverage, etc.)';
COMMENT ON COLUMN scenarios.tags IS 'User-defined tags for scenario organization and filtering';
