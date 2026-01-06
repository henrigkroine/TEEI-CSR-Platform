-- Rollback Migration 0047: Drop Program Instances Table
-- Purpose: Rollback program instances table and enums
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)

-- =============================================================================
-- ROLLBACK ORDER
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS program_instances_updated_at_trigger ON program_instances;

-- Drop function
DROP FUNCTION IF EXISTS update_program_instances_timestamp();

-- Drop indexes
DROP INDEX IF EXISTS program_instances_campaign_id_idx;
DROP INDEX IF EXISTS program_instances_company_id_idx;
DROP INDEX IF EXISTS program_instances_status_idx;
DROP INDEX IF EXISTS program_instances_date_range_idx;
DROP INDEX IF EXISTS program_instances_template_id_idx;
DROP INDEX IF EXISTS program_instances_beneficiary_group_id_idx;
DROP INDEX IF EXISTS program_instances_active_idx;
DROP INDEX IF EXISTS program_instances_company_status_date_idx;
DROP INDEX IF EXISTS program_instances_campaign_status_idx;
DROP INDEX IF EXISTS program_instances_last_activity_idx;
DROP INDEX IF EXISTS program_instances_config_gin_idx;
DROP INDEX IF EXISTS program_instances_outcome_scores_gin_idx;

-- Drop table
DROP TABLE IF EXISTS program_instances CASCADE;

-- Drop enums
DROP TYPE IF EXISTS program_instance_status;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
