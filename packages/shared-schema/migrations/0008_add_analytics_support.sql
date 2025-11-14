-- Migration: Add analytics support
-- Add user_id and company_id to outcome_scores for analytics
-- Create query_budgets table for per-tenant query limits

-- Add user_id and company_id to outcome_scores
ALTER TABLE outcome_scores
  ADD COLUMN user_id UUID REFERENCES users(id),
  ADD COLUMN company_id UUID REFERENCES companies(id);

-- Create indexes for analytics queries
CREATE INDEX idx_outcome_scores_company_created ON outcome_scores(company_id, created_at);
CREATE INDEX idx_outcome_scores_dimension ON outcome_scores(dimension);
CREATE INDEX idx_outcome_scores_user ON outcome_scores(user_id);

-- Create query_budgets table
CREATE TABLE query_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  budget_type VARCHAR(20) NOT NULL, -- 'daily' | 'monthly'
  query_limit INTEGER NOT NULL, -- max queries allowed
  queries_used INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for query budgets
CREATE INDEX idx_query_budgets_company ON query_budgets(company_id);
CREATE INDEX idx_query_budgets_reset ON query_budgets(reset_at);

-- Add default budgets for existing companies
INSERT INTO query_budgets (company_id, budget_type, query_limit, queries_used, reset_at)
SELECT
  id,
  'daily',
  10000, -- Default 10k queries per day
  0,
  CURRENT_DATE + INTERVAL '1 day'
FROM companies;
