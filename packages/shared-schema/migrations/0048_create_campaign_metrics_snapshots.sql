-- Migration 0048: Create Campaign Metrics Snapshots Table
-- Purpose: Time-series tracking for campaign performance over time
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)
-- Dependencies: campaigns

-- =============================================================================
-- 1. CAMPAIGN METRICS SNAPSHOTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaign_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to campaigns table
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Snapshot timestamp (UTC)
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Capacity Metrics - Volunteers
  volunteers_target INTEGER NOT NULL,
  volunteers_current INTEGER NOT NULL,
  volunteers_utilization DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000+

  -- Capacity Metrics - Beneficiaries
  beneficiaries_target INTEGER NOT NULL,
  beneficiaries_current INTEGER NOT NULL,
  beneficiaries_utilization DECIMAL(5, 4) NOT NULL,

  -- Capacity Metrics - Sessions
  sessions_target INTEGER,
  sessions_current INTEGER NOT NULL,
  sessions_utilization DECIMAL(5, 4),

  -- Financial Metrics
  budget_allocated DECIMAL(12, 2) NOT NULL,
  budget_spent DECIMAL(12, 2) NOT NULL,
  budget_remaining DECIMAL(12, 2) NOT NULL,
  budget_utilization DECIMAL(5, 4) NOT NULL,

  -- Impact Metrics
  sroi_score DECIMAL(10, 2),
  average_vis_score DECIMAL(10, 2),
  total_hours_logged DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_sessions_completed INTEGER NOT NULL DEFAULT 0,

  -- Monetization Metrics (pricing model specific)
  seats_used INTEGER,
  seats_committed INTEGER,
  credits_consumed DECIMAL(12, 2),
  credits_allocated DECIMAL(12, 2),
  learners_served INTEGER,
  learners_committed INTEGER,

  -- Full snapshot JSONB for flexibility
  full_snapshot JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT campaign_metrics_snapshots_utilization_valid CHECK (
    volunteers_utilization >= 0 AND
    beneficiaries_utilization >= 0 AND
    budget_utilization >= 0
  ),
  CONSTRAINT campaign_metrics_snapshots_budget_non_negative CHECK (
    budget_allocated >= 0 AND
    budget_spent >= 0 AND
    budget_remaining >= 0
  ),
  CONSTRAINT campaign_metrics_snapshots_unique_snapshot UNIQUE (campaign_id, snapshot_date)
);

-- =============================================================================
-- 2. INDEXES
-- =============================================================================

-- Primary index: Campaign + Date (for time-series queries)
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_campaign_date_idx
  ON campaign_metrics_snapshots(campaign_id, snapshot_date DESC);

-- Date-based queries (all campaigns at specific time)
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_snapshot_date_idx
  ON campaign_metrics_snapshots(snapshot_date DESC);

-- Capacity alert queries (find campaigns near capacity)
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_volunteers_util_idx
  ON campaign_metrics_snapshots(volunteers_utilization DESC)
  WHERE volunteers_utilization > 0.7;

CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_beneficiaries_util_idx
  ON campaign_metrics_snapshots(beneficiaries_utilization DESC)
  WHERE beneficiaries_utilization > 0.7;

-- Budget tracking queries
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_budget_util_idx
  ON campaign_metrics_snapshots(budget_utilization DESC)
  WHERE budget_utilization > 0.7;

-- Impact metric queries (find high-performing campaigns)
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_sroi_idx
  ON campaign_metrics_snapshots(sroi_score DESC NULLS LAST)
  WHERE sroi_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_vis_idx
  ON campaign_metrics_snapshots(average_vis_score DESC NULLS LAST)
  WHERE average_vis_score IS NOT NULL;

-- Composite index for common dashboard query pattern
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_campaign_date_created_idx
  ON campaign_metrics_snapshots(campaign_id, snapshot_date DESC, created_at DESC);

-- Recent snapshots query
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_created_at_idx
  ON campaign_metrics_snapshots(created_at DESC);

-- GIN index for full_snapshot JSONB queries
CREATE INDEX IF NOT EXISTS campaign_metrics_snapshots_full_snapshot_gin_idx
  ON campaign_metrics_snapshots USING GIN (full_snapshot jsonb_path_ops);

-- =============================================================================
-- 3. TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE campaign_metrics_snapshots IS 'Time-series snapshots of campaign metrics for historical analysis, trend visualization, and capacity planning. Snapshots taken daily (or hourly for high-activity campaigns).';
COMMENT ON COLUMN campaign_metrics_snapshots.campaign_id IS 'Campaign this snapshot belongs to';
COMMENT ON COLUMN campaign_metrics_snapshots.snapshot_date IS 'UTC timestamp when this snapshot was taken';
COMMENT ON COLUMN campaign_metrics_snapshots.volunteers_target IS 'Target volunteer capacity at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.volunteers_current IS 'Current enrolled volunteers at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.volunteers_utilization IS 'Volunteer capacity utilization ratio (current/target)';
COMMENT ON COLUMN campaign_metrics_snapshots.beneficiaries_target IS 'Target beneficiary capacity at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.beneficiaries_current IS 'Current enrolled beneficiaries at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.beneficiaries_utilization IS 'Beneficiary capacity utilization ratio';
COMMENT ON COLUMN campaign_metrics_snapshots.sessions_target IS 'Target sessions at snapshot time (may be null)';
COMMENT ON COLUMN campaign_metrics_snapshots.sessions_current IS 'Current sessions held at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.sessions_utilization IS 'Session capacity utilization ratio';
COMMENT ON COLUMN campaign_metrics_snapshots.budget_allocated IS 'Total allocated budget at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.budget_spent IS 'Budget spent at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.budget_remaining IS 'Budget remaining at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.budget_utilization IS 'Budget utilization ratio (spent/allocated)';
COMMENT ON COLUMN campaign_metrics_snapshots.sroi_score IS 'Social Return on Investment at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.average_vis_score IS 'Average Volunteer Impact Score at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.total_hours_logged IS 'Cumulative volunteer hours at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.total_sessions_completed IS 'Cumulative sessions completed at snapshot time';
COMMENT ON COLUMN campaign_metrics_snapshots.seats_used IS 'Volunteer seats used (for seats pricing model)';
COMMENT ON COLUMN campaign_metrics_snapshots.seats_committed IS 'Volunteer seats committed (for seats pricing model)';
COMMENT ON COLUMN campaign_metrics_snapshots.credits_consumed IS 'Impact credits consumed (for credits pricing model)';
COMMENT ON COLUMN campaign_metrics_snapshots.credits_allocated IS 'Impact credits allocated (for credits pricing model)';
COMMENT ON COLUMN campaign_metrics_snapshots.learners_served IS 'Learners served (for IAAS pricing model)';
COMMENT ON COLUMN campaign_metrics_snapshots.learners_committed IS 'Learners committed (for IAAS pricing model)';
COMMENT ON COLUMN campaign_metrics_snapshots.full_snapshot IS 'Complete campaign state snapshot (JSONB) including extended metrics, engagement, outcomes, alerts';
