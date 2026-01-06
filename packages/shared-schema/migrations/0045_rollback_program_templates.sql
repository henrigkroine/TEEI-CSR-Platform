-- Rollback Migration 0045: Drop Program Templates Table
-- Purpose: Rollback program templates table and enums
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)

-- =============================================================================
-- ROLLBACK ORDER
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS program_templates_updated_at_trigger ON program_templates;

-- Drop function
DROP FUNCTION IF EXISTS update_program_templates_timestamp();

-- Drop indexes
DROP INDEX IF EXISTS program_templates_type_idx;
DROP INDEX IF EXISTS program_templates_active_public_idx;
DROP INDEX IF EXISTS program_templates_version_idx;
DROP INDEX IF EXISTS program_templates_created_at_idx;
DROP INDEX IF EXISTS program_templates_created_by_idx;
DROP INDEX IF EXISTS program_templates_tags_gin_idx;
DROP INDEX IF EXISTS program_templates_suitable_for_groups_gin_idx;
DROP INDEX IF EXISTS program_templates_outcome_metrics_gin_idx;
DROP INDEX IF EXISTS program_templates_default_config_gin_idx;

-- Drop table
DROP TABLE IF EXISTS program_templates CASCADE;

-- Drop enums
DROP TYPE IF EXISTS program_type;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
