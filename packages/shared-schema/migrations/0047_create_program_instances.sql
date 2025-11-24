-- Migration 0047: Create Program Instances Table
-- Purpose: Runtime execution of campaigns with inherited configuration and capacity tracking
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)
-- Dependencies: campaigns, program_templates, beneficiary_groups, companies

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Program instance lifecycle status
CREATE TYPE program_instance_status AS ENUM (
  'planned',
  'active',
  'paused',
  'completed'
);

-- =============================================================================
-- 2. PROGRAM INSTANCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,

  -- Relationships
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Denormalized relationships (from campaign) for query performance
  program_template_id UUID NOT NULL REFERENCES program_templates(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  beneficiary_group_id UUID NOT NULL REFERENCES beneficiary_groups(id) ON DELETE RESTRICT,

  -- Execution Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Status
  status program_instance_status NOT NULL DEFAULT 'planned',

  -- Configuration (merged template defaults + campaign overrides)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Participant Counts (Aggregate only, no PII)
  enrolled_volunteers INTEGER NOT NULL DEFAULT 0,
  enrolled_beneficiaries INTEGER NOT NULL DEFAULT 0,

  -- Program-specific participant tracking
  active_pairs INTEGER, -- For buddy/mentorship programs
  active_groups INTEGER, -- For language/group programs

  -- Activity Tracking
  total_sessions_held INTEGER NOT NULL DEFAULT 0,
  total_hours_logged DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

  -- Impact Metrics (Instance-specific)
  sroi_score DECIMAL(10, 2),
  average_vis_score DECIMAL(10, 2),
  outcome_scores JSONB DEFAULT '{}'::jsonb, -- { integration: 0.65, language: 0.78 }

  -- Capacity Consumption (for Campaign Quota Tracking)
  volunteers_consumed INTEGER NOT NULL DEFAULT 0,
  credits_consumed DECIMAL(10, 2),
  learners_served INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT program_instances_date_range_check CHECK (end_date >= start_date),
  CONSTRAINT program_instances_participants_non_negative CHECK (
    enrolled_volunteers >= 0 AND
    enrolled_beneficiaries >= 0 AND
    volunteers_consumed >= 0 AND
    learners_served >= 0
  )
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- Primary query patterns: fetch all instances for a campaign
CREATE INDEX IF NOT EXISTS program_instances_campaign_id_idx
  ON program_instances(campaign_id);

-- Query pattern: fetch all instances for a company (denormalized for performance)
CREATE INDEX IF NOT EXISTS program_instances_company_id_idx
  ON program_instances(company_id);

-- Query pattern: filter instances by status
CREATE INDEX IF NOT EXISTS program_instances_status_idx
  ON program_instances(status);

-- Query pattern: find instances by date range (for reporting)
CREATE INDEX IF NOT EXISTS program_instances_date_range_idx
  ON program_instances(start_date, end_date);

-- Query pattern: aggregate metrics by template type
CREATE INDEX IF NOT EXISTS program_instances_template_id_idx
  ON program_instances(program_template_id);

-- Query pattern: analyze impact by beneficiary group
CREATE INDEX IF NOT EXISTS program_instances_beneficiary_group_id_idx
  ON program_instances(beneficiary_group_id);

-- Query pattern: find active instances
CREATE INDEX IF NOT EXISTS program_instances_active_idx
  ON program_instances(status)
  WHERE status = 'active';

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS program_instances_company_status_date_idx
  ON program_instances(company_id, status, start_date);

CREATE INDEX IF NOT EXISTS program_instances_campaign_status_idx
  ON program_instances(campaign_id, status);

CREATE INDEX IF NOT EXISTS program_instances_last_activity_idx
  ON program_instances(last_activity_at DESC)
  WHERE last_activity_at IS NOT NULL;

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS program_instances_config_gin_idx
  ON program_instances USING GIN (config jsonb_path_ops);

CREATE INDEX IF NOT EXISTS program_instances_outcome_scores_gin_idx
  ON program_instances USING GIN (outcome_scores jsonb_path_ops);

-- =============================================================================
-- 4. UPDATE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_program_instances_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER program_instances_updated_at_trigger
  BEFORE UPDATE ON program_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_program_instances_timestamp();

-- =============================================================================
-- 5. TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE program_instances IS 'Runtime execution of campaigns with inherited configuration, participant tracking, and impact metrics. Instances consume capacity from parent campaigns.';
COMMENT ON COLUMN program_instances.campaign_id IS 'Parent campaign this instance belongs to';
COMMENT ON COLUMN program_instances.program_template_id IS 'Program template (denormalized from campaign for query performance)';
COMMENT ON COLUMN program_instances.company_id IS 'Company (denormalized from campaign for query performance)';
COMMENT ON COLUMN program_instances.beneficiary_group_id IS 'Beneficiary group (denormalized from campaign for query performance)';
COMMENT ON COLUMN program_instances.start_date IS 'Instance start date';
COMMENT ON COLUMN program_instances.end_date IS 'Instance end date (must be >= start_date)';
COMMENT ON COLUMN program_instances.status IS 'Lifecycle state: planned → active → paused → completed';
COMMENT ON COLUMN program_instances.config IS 'Merged configuration from template.defaultConfig + campaign.configOverrides';
COMMENT ON COLUMN program_instances.enrolled_volunteers IS 'Number of enrolled volunteers (aggregate count, no PII)';
COMMENT ON COLUMN program_instances.enrolled_beneficiaries IS 'Number of enrolled beneficiaries (aggregate count, no PII)';
COMMENT ON COLUMN program_instances.active_pairs IS 'Number of active buddy/mentor pairs';
COMMENT ON COLUMN program_instances.active_groups IS 'Number of active language/learning groups';
COMMENT ON COLUMN program_instances.total_sessions_held IS 'Total number of sessions held';
COMMENT ON COLUMN program_instances.total_hours_logged IS 'Total volunteer hours logged';
COMMENT ON COLUMN program_instances.sroi_score IS 'Social Return on Investment score for this instance';
COMMENT ON COLUMN program_instances.average_vis_score IS 'Average Volunteer Impact Score for this instance';
COMMENT ON COLUMN program_instances.outcome_scores IS 'Outcome scores by dimension (e.g., {"integration": 0.65, "language": 0.78})';
COMMENT ON COLUMN program_instances.volunteers_consumed IS 'Volunteer seats consumed (counts toward campaign.committedSeats)';
COMMENT ON COLUMN program_instances.credits_consumed IS 'Impact credits consumed (counts toward campaign.creditAllocation)';
COMMENT ON COLUMN program_instances.learners_served IS 'Unique beneficiaries served (counts toward IAAS commitments)';
COMMENT ON COLUMN program_instances.last_activity_at IS 'Timestamp of last session/event for this instance';
