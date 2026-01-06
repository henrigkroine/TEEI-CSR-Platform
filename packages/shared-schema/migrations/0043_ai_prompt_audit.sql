-- Migration: AI Prompt Audit Trail
-- Worker 10: AI/ML Explainability & Guardrails
-- Purpose: Store audit trail for all AI operations with explainability data
-- Related: packages/shared-types/ai/prompt-record.ts, services/safety-moderation, services/ai-budget

-- ============================================================================
-- ai_prompt_audit table
-- ============================================================================
-- Stores complete audit trail for each AI generation request
-- Includes prompt hash, output hash, evidence IDs, costs, and guardrail outcomes

CREATE TABLE IF NOT EXISTS ai_prompt_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request metadata
  request_id VARCHAR(255) NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Model and configuration
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  provider VARCHAR(50) NOT NULL, -- openai, anthropic, google
  region VARCHAR(50), -- us-east-1, eu-west-1, etc.

  -- Prompt details (masked, no PII)
  prompt_template VARCHAR(255), -- template identifier (e.g., 'quarterly-report.en')
  prompt_hash VARCHAR(64) NOT NULL, -- SHA256 of full prompt
  prompt_variables JSONB, -- variable map (PII-masked)

  -- Output details
  output_hash VARCHAR(64) NOT NULL, -- SHA256 of output
  output_summary TEXT, -- first 500 chars of output (masked)

  -- Evidence and citations
  evidence_ids TEXT[], -- array of evidence snippet IDs used
  citation_count INTEGER DEFAULT 0,
  top_k INTEGER, -- number of evidence items retrieved

  -- Token usage and costs
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,

  -- Performance metrics
  latency_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Guardrail outcomes
  safety_check_passed BOOLEAN NOT NULL DEFAULT false,
  safety_check_details JSONB, -- {categories_checked, violations, rationale}

  evidence_gate_passed BOOLEAN NOT NULL DEFAULT false,
  evidence_gate_details JSONB, -- {min_citations, actual_citations, density}

  budget_check_passed BOOLEAN NOT NULL DEFAULT true,
  budget_check_details JSONB, -- {limit_usd, used_usd, remaining_usd}

  -- Overall status
  status VARCHAR(50) NOT NULL DEFAULT 'success', -- success, failed, blocked_safety, blocked_evidence, blocked_budget
  error_message TEXT,

  -- Explainability data
  section_explanations JSONB, -- {section_type: why_this_section}
  retry_count INTEGER DEFAULT 0,
  parent_request_id VARCHAR(255), -- if this is a retry

  -- Indexing
  operation VARCHAR(100) NOT NULL, -- report-generation, nlq-query, q2q-classification

  -- Audit trail
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Primary query patterns
CREATE INDEX idx_ai_prompt_audit_company_created ON ai_prompt_audit(company_id, created_at DESC);
CREATE INDEX idx_ai_prompt_audit_request_id ON ai_prompt_audit(request_id);
CREATE INDEX idx_ai_prompt_audit_status ON ai_prompt_audit(status);
CREATE INDEX idx_ai_prompt_audit_operation ON ai_prompt_audit(operation);
CREATE INDEX idx_ai_prompt_audit_model ON ai_prompt_audit(model_name);

-- Guardrail monitoring
CREATE INDEX idx_ai_prompt_audit_safety_failed ON ai_prompt_audit(safety_check_passed) WHERE safety_check_passed = false;
CREATE INDEX idx_ai_prompt_audit_evidence_failed ON ai_prompt_audit(evidence_gate_passed) WHERE evidence_gate_passed = false;
CREATE INDEX idx_ai_prompt_audit_budget_failed ON ai_prompt_audit(budget_check_passed) WHERE budget_check_passed = false;

-- Cost tracking
CREATE INDEX idx_ai_prompt_audit_cost ON ai_prompt_audit(company_id, created_at DESC, cost_usd);

-- Evidence lineage
CREATE INDEX idx_ai_prompt_audit_evidence_ids ON ai_prompt_audit USING GIN(evidence_ids);

-- ============================================================================
-- ai_budget_config table
-- ============================================================================
-- Stores per-tenant AI budget limits and usage

CREATE TABLE IF NOT EXISTS ai_budget_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  -- Budget limits
  daily_limit_usd DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  monthly_limit_usd DECIMAL(10, 2) NOT NULL DEFAULT 100.00,

  -- Current usage (reset periodically)
  daily_used_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  monthly_used_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- Reset tracking
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('day', NOW() + INTERVAL '1 day'),
  monthly_reset_at TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),

  -- Alert thresholds
  alert_threshold_pct INTEGER NOT NULL DEFAULT 80, -- alert at 80% usage

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

CREATE INDEX idx_ai_budget_config_company ON ai_budget_config(company_id);
CREATE INDEX idx_ai_budget_config_enabled ON ai_budget_config(enabled) WHERE enabled = true;

-- ============================================================================
-- ai_safety_policy table
-- ============================================================================
-- Stores safety policy configurations per tenant

CREATE TABLE IF NOT EXISTS ai_safety_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Policy scope (null company_id = global policy)
  is_global BOOLEAN NOT NULL DEFAULT false,

  -- Policy configuration
  blocked_categories TEXT[] NOT NULL DEFAULT ARRAY['hate', 'violence', 'self-harm', 'sexual/minors'],
  warning_categories TEXT[] NOT NULL DEFAULT ARRAY['sexual'],

  -- Sensitivity levels
  min_confidence_threshold DECIMAL(3, 2) NOT NULL DEFAULT 0.7, -- block if confidence >= threshold

  -- Actions
  block_on_violation BOOLEAN NOT NULL DEFAULT true,
  log_violations BOOLEAN NOT NULL DEFAULT true,

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),

  CONSTRAINT safety_policy_global_or_tenant CHECK (
    (is_global = true AND company_id IS NULL) OR
    (is_global = false AND company_id IS NOT NULL)
  )
);

CREATE INDEX idx_ai_safety_policy_company ON ai_safety_policy(company_id);
CREATE INDEX idx_ai_safety_policy_global ON ai_safety_policy(is_global) WHERE is_global = true;
CREATE UNIQUE INDEX idx_ai_safety_policy_global_unique ON ai_safety_policy(is_global) WHERE is_global = true;

-- ============================================================================
-- Insert default global safety policy
-- ============================================================================

INSERT INTO ai_safety_policy (is_global, blocked_categories, warning_categories, created_by)
VALUES (
  true,
  ARRAY['hate', 'violence', 'self-harm', 'sexual/minors'],
  ARRAY['sexual'],
  'system'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE ai_prompt_audit IS 'Audit trail for all AI operations with explainability data';
COMMENT ON COLUMN ai_prompt_audit.request_id IS 'Unique request identifier for correlation';
COMMENT ON COLUMN ai_prompt_audit.prompt_hash IS 'SHA256 hash of full prompt (for deduplication)';
COMMENT ON COLUMN ai_prompt_audit.output_hash IS 'SHA256 hash of output (for change detection)';
COMMENT ON COLUMN ai_prompt_audit.evidence_ids IS 'Array of evidence snippet IDs used in generation';
COMMENT ON COLUMN ai_prompt_audit.safety_check_details IS 'Detailed safety check results including categories and violations';
COMMENT ON COLUMN ai_prompt_audit.evidence_gate_details IS 'Citation validation results';
COMMENT ON COLUMN ai_prompt_audit.budget_check_details IS 'Budget enforcement results';
COMMENT ON COLUMN ai_prompt_audit.section_explanations IS 'Explainability data: why each section was generated';

COMMENT ON TABLE ai_budget_config IS 'Per-tenant AI budget limits and usage tracking';
COMMENT ON TABLE ai_safety_policy IS 'Safety policy configurations for content moderation';
