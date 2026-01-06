-- Rollback Migration 0046: Drop Campaigns Table
-- Purpose: Rollback campaigns table and enums
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)

-- =============================================================================
-- ROLLBACK ORDER
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS campaigns_updated_at_trigger ON campaigns;

-- Drop function
DROP FUNCTION IF EXISTS update_campaigns_timestamp();

-- Drop indexes
DROP INDEX IF EXISTS campaigns_company_id_idx;
DROP INDEX IF EXISTS campaigns_status_idx;
DROP INDEX IF EXISTS campaigns_template_id_idx;
DROP INDEX IF EXISTS campaigns_group_id_idx;
DROP INDEX IF EXISTS campaigns_dates_idx;
DROP INDEX IF EXISTS campaigns_pricing_model_idx;
DROP INDEX IF EXISTS campaigns_l2i_subscription_id_idx;
DROP INDEX IF EXISTS campaigns_capacity_utilization_idx;
DROP INDEX IF EXISTS campaigns_upsell_score_idx;
DROP INDEX IF EXISTS campaigns_high_value_idx;
DROP INDEX IF EXISTS campaigns_quarter_idx;
DROP INDEX IF EXISTS campaigns_active_idx;
DROP INDEX IF EXISTS campaigns_company_status_idx;
DROP INDEX IF EXISTS campaigns_company_active_idx;
DROP INDEX IF EXISTS campaigns_template_group_idx;
DROP INDEX IF EXISTS campaigns_tags_gin_idx;
DROP INDEX IF EXISTS campaigns_evidence_snippet_ids_gin_idx;
DROP INDEX IF EXISTS campaigns_config_overrides_gin_idx;

-- Drop table
DROP TABLE IF EXISTS campaigns CASCADE;

-- Drop enums
DROP TYPE IF EXISTS campaign_priority;
DROP TYPE IF EXISTS pricing_model;
DROP TYPE IF EXISTS campaign_status;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
