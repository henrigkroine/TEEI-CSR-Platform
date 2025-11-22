-- Rollback Migration 0044: Drop Beneficiary Groups Table
-- Purpose: Rollback beneficiary groups table and enums
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)

-- =============================================================================
-- ROLLBACK ORDER
-- =============================================================================

-- Drop trigger
DROP TRIGGER IF EXISTS beneficiary_groups_updated_at_trigger ON beneficiary_groups;

-- Drop function
DROP FUNCTION IF EXISTS update_beneficiary_groups_timestamp();

-- Drop indexes (will be dropped automatically with table, but explicit for clarity)
DROP INDEX IF EXISTS beneficiary_groups_group_type_idx;
DROP INDEX IF EXISTS beneficiary_groups_country_code_idx;
DROP INDEX IF EXISTS beneficiary_groups_is_active_idx;
DROP INDEX IF EXISTS beneficiary_groups_is_public_idx;
DROP INDEX IF EXISTS beneficiary_groups_created_at_idx;
DROP INDEX IF EXISTS beneficiary_groups_country_type_idx;
DROP INDEX IF EXISTS beneficiary_groups_active_public_idx;
DROP INDEX IF EXISTS beneficiary_groups_tags_gin_idx;
DROP INDEX IF EXISTS beneficiary_groups_eligible_program_types_gin_idx;

-- Drop table
DROP TABLE IF EXISTS beneficiary_groups CASCADE;

-- Drop enums (must be done after table is dropped)
DROP TYPE IF EXISTS eligible_program_type;
DROP TYPE IF EXISTS legal_status_category;
DROP TYPE IF EXISTS language_requirement;
DROP TYPE IF EXISTS gender_focus;
DROP TYPE IF EXISTS beneficiary_group_type;

-- =============================================================================
-- ROLLBACK COMPLETE
-- =============================================================================
