-- Rollback Migration 0048: Drop Campaign Metrics Snapshots Table
-- Purpose: Rollback campaign metrics snapshots table
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)

-- =============================================================================
-- ROLLBACK ORDER
-- =============================================================================

-- Drop indexes
DROP INDEX IF EXISTS campaign_metrics_snapshots_campaign_date_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_snapshot_date_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_volunteers_util_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_beneficiaries_util_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_budget_util_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_sroi_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_vis_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_campaign_date_created_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_created_at_idx;
DROP INDEX IF EXISTS campaign_metrics_snapshots_full_snapshot_gin_idx;

-- Drop table
DROP TABLE IF EXISTS campaign_metrics_snapshots CASCADE;

-- Note: No enums to drop for this table

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
