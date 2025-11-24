-- Migration 0046: Create Campaigns Table
-- Purpose: Sellable CSR products linking templates, beneficiary groups, and commercial terms
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)
-- Dependencies: companies, program_templates, beneficiary_groups, l2i_subscriptions

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Campaign lifecycle states
CREATE TYPE campaign_status AS ENUM (
  'draft',
  'planned',
  'recruiting',
  'active',
  'paused',
  'completed',
  'closed'
);

-- Pricing models for campaign monetization
CREATE TYPE pricing_model AS ENUM (
  'seats',
  'credits',
  'bundle',
  'iaas',
  'custom'
);

-- Campaign priority levels
CREATE TYPE campaign_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- =============================================================================
-- 2. CAMPAIGNS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Relationships
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE RESTRICT,
  beneficiary_group_id UUID NOT NULL REFERENCES beneficiary_groups(id) ON DELETE RESTRICT,

  -- Campaign Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  quarter VARCHAR(10), -- "2025-Q1" for reporting alignment

  -- Lifecycle & Priority
  status campaign_status NOT NULL DEFAULT 'draft',
  priority campaign_priority DEFAULT 'medium',

  -- Capacity & Quotas
  target_volunteers INTEGER NOT NULL,
  current_volunteers INTEGER NOT NULL DEFAULT 0,
  target_beneficiaries INTEGER NOT NULL,
  current_beneficiaries INTEGER NOT NULL DEFAULT 0,
  max_sessions INTEGER,
  current_sessions INTEGER NOT NULL DEFAULT 0,

  -- Budget Tracking
  budget_allocated DECIMAL(12, 2) NOT NULL,
  budget_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR', -- ISO 4217

  -- Monetization Model
  pricing_model pricing_model NOT NULL,

  -- SEATS MODEL
  committed_seats INTEGER,
  seat_price_per_month DECIMAL(10, 2),

  -- CREDITS MODEL
  credit_allocation INTEGER,
  credit_consumption_rate DECIMAL(10, 4),
  credits_remaining INTEGER,

  -- IAAS MODEL
  iaas_metrics JSONB, -- { learnersCommitted, pricePerLearner, outcomesGuaranteed, outcomeThresholds }

  -- BUNDLE MODEL
  l2i_subscription_id UUID REFERENCES l2i_subscriptions(id),
  bundle_allocation_percentage DECIMAL(5, 4), -- 0.2500 = 25%

  -- CUSTOM PRICING
  custom_pricing_terms JSONB, -- { description, fixedFee, variableComponents, milestonePayments }

  -- Configuration Overrides (from template)
  config_overrides JSONB DEFAULT '{}'::jsonb,

  -- Impact Metrics (Aggregated from ProgramInstances)
  cumulative_sroi DECIMAL(10, 2),
  average_vis DECIMAL(10, 2),
  total_hours_logged DECIMAL(12, 2) DEFAULT 0,
  total_sessions_completed INTEGER DEFAULT 0,

  -- Upsell Indicators
  capacity_utilization DECIMAL(5, 4) DEFAULT 0, -- 0.8500 = 85%
  is_near_capacity BOOLEAN DEFAULT false,
  is_over_capacity BOOLEAN DEFAULT false,
  is_high_value BOOLEAN DEFAULT false,
  upsell_opportunity_score INTEGER DEFAULT 0, -- 0-100

  -- Lineage & Evidence
  evidence_snippet_ids JSONB DEFAULT '[]'::jsonb,

  -- Metadata & Tags
  tags JSONB DEFAULT '[]'::jsonb,
  internal_notes TEXT,

  -- Status Flags
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,

  -- Audit Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_metrics_update_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,

  -- Constraints
  CONSTRAINT campaigns_date_range_check CHECK (end_date >= start_date),
  CONSTRAINT campaigns_capacity_non_negative CHECK (
    target_volunteers >= 0 AND
    current_volunteers >= 0 AND
    target_beneficiaries >= 0 AND
    current_beneficiaries >= 0
  ),
  CONSTRAINT campaigns_budget_non_negative CHECK (
    budget_allocated >= 0 AND
    budget_spent >= 0
  )
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS campaigns_company_id_idx
  ON campaigns(company_id);

CREATE INDEX IF NOT EXISTS campaigns_status_idx
  ON campaigns(status);

CREATE INDEX IF NOT EXISTS campaigns_template_id_idx
  ON campaigns(program_template_id);

CREATE INDEX IF NOT EXISTS campaigns_group_id_idx
  ON campaigns(beneficiary_group_id);

CREATE INDEX IF NOT EXISTS campaigns_dates_idx
  ON campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS campaigns_pricing_model_idx
  ON campaigns(pricing_model);

CREATE INDEX IF NOT EXISTS campaigns_l2i_subscription_id_idx
  ON campaigns(l2i_subscription_id)
  WHERE l2i_subscription_id IS NOT NULL;

-- Upsell query optimization
CREATE INDEX IF NOT EXISTS campaigns_capacity_utilization_idx
  ON campaigns(capacity_utilization)
  WHERE capacity_utilization > 0.7;

CREATE INDEX IF NOT EXISTS campaigns_upsell_score_idx
  ON campaigns(upsell_opportunity_score DESC)
  WHERE upsell_opportunity_score > 0;

CREATE INDEX IF NOT EXISTS campaigns_high_value_idx
  ON campaigns(is_high_value)
  WHERE is_high_value = true;

-- Reporting indexes
CREATE INDEX IF NOT EXISTS campaigns_quarter_idx
  ON campaigns(quarter)
  WHERE quarter IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaigns_active_idx
  ON campaigns(is_active, status)
  WHERE is_active = true;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS campaigns_company_status_idx
  ON campaigns(company_id, status);

CREATE INDEX IF NOT EXISTS campaigns_company_active_idx
  ON campaigns(company_id, is_active, status);

CREATE INDEX IF NOT EXISTS campaigns_template_group_idx
  ON campaigns(program_template_id, beneficiary_group_id);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS campaigns_tags_gin_idx
  ON campaigns USING GIN (tags jsonb_path_ops);

CREATE INDEX IF NOT EXISTS campaigns_evidence_snippet_ids_gin_idx
  ON campaigns USING GIN (evidence_snippet_ids jsonb_path_ops);

CREATE INDEX IF NOT EXISTS campaigns_config_overrides_gin_idx
  ON campaigns USING GIN (config_overrides jsonb_path_ops);

-- =============================================================================
-- 4. UPDATE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at_trigger
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_timestamp();

-- =============================================================================
-- 5. TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE campaigns IS 'Sellable CSR products linking program templates, beneficiary groups, and commercial terms. A campaign = Template + Group + Company + Period + Pricing.';
COMMENT ON COLUMN campaigns.company_id IS 'Company that owns this campaign';
COMMENT ON COLUMN campaigns.program_template_id IS 'Program template this campaign instantiates';
COMMENT ON COLUMN campaigns.beneficiary_group_id IS 'Target beneficiary group for this campaign';
COMMENT ON COLUMN campaigns.start_date IS 'Campaign start date';
COMMENT ON COLUMN campaigns.end_date IS 'Campaign end date (must be >= start_date)';
COMMENT ON COLUMN campaigns.quarter IS 'Reporting quarter (e.g., "2025-Q1")';
COMMENT ON COLUMN campaigns.status IS 'Lifecycle state: draft → planned → recruiting → active → paused → completed → closed';
COMMENT ON COLUMN campaigns.priority IS 'Resource allocation priority: low, medium, high, critical';
COMMENT ON COLUMN campaigns.target_volunteers IS 'Planned volunteer capacity';
COMMENT ON COLUMN campaigns.current_volunteers IS 'Actually enrolled volunteers';
COMMENT ON COLUMN campaigns.target_beneficiaries IS 'Planned beneficiary capacity';
COMMENT ON COLUMN campaigns.current_beneficiaries IS 'Actually enrolled beneficiaries';
COMMENT ON COLUMN campaigns.pricing_model IS 'Monetization model: seats, credits, bundle, iaas, custom';
COMMENT ON COLUMN campaigns.committed_seats IS 'Purchased volunteer seats (for seats pricing model)';
COMMENT ON COLUMN campaigns.seat_price_per_month IS 'Price per volunteer seat per month';
COMMENT ON COLUMN campaigns.credit_allocation IS 'Total impact credits allocated (for credits pricing model)';
COMMENT ON COLUMN campaigns.credit_consumption_rate IS 'Credits consumed per hour/session';
COMMENT ON COLUMN campaigns.credits_remaining IS 'Impact credits remaining';
COMMENT ON COLUMN campaigns.iaas_metrics IS 'Impact-as-a-Service metrics: learners committed, price per learner, outcome guarantees';
COMMENT ON COLUMN campaigns.l2i_subscription_id IS 'L2I subscription this campaign is part of (for bundle pricing)';
COMMENT ON COLUMN campaigns.bundle_allocation_percentage IS 'Percentage of L2I bundle allocated to this campaign (0.25 = 25%)';
COMMENT ON COLUMN campaigns.custom_pricing_terms IS 'Custom/negotiated pricing terms';
COMMENT ON COLUMN campaigns.config_overrides IS 'Company-specific overrides to program template defaults';
COMMENT ON COLUMN campaigns.cumulative_sroi IS 'Cumulative Social Return on Investment (aggregated from instances)';
COMMENT ON COLUMN campaigns.average_vis IS 'Average Volunteer Impact Score (aggregated from instances)';
COMMENT ON COLUMN campaigns.total_hours_logged IS 'Total volunteer hours logged';
COMMENT ON COLUMN campaigns.total_sessions_completed IS 'Total sessions completed';
COMMENT ON COLUMN campaigns.capacity_utilization IS 'Current volunteers / target volunteers ratio (0.85 = 85%)';
COMMENT ON COLUMN campaigns.is_near_capacity IS 'Flag for campaigns >80% capacity (upsell trigger)';
COMMENT ON COLUMN campaigns.is_over_capacity IS 'Flag for campaigns >100% capacity (expansion needed)';
COMMENT ON COLUMN campaigns.is_high_value IS 'High-value campaign indicator (based on SROI, VIS, engagement)';
COMMENT ON COLUMN campaigns.upsell_opportunity_score IS 'Composite score (0-100) for sales prioritization';
COMMENT ON COLUMN campaigns.evidence_snippet_ids IS 'Top evidence snippets demonstrating campaign impact';
COMMENT ON COLUMN campaigns.tags IS 'Tags for categorization and search';
COMMENT ON COLUMN campaigns.internal_notes IS 'Internal notes for sales/CS (not visible to customer)';
COMMENT ON COLUMN campaigns.last_metrics_update_at IS 'Last time metrics were aggregated from program instances';
