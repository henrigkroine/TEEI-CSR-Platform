-- Rollback Migration: Unified Profile Linking (Buddy ↔ CSR)
-- Created: 2025-11-14
-- Description: Rollback user_external_ids table and journey flags
-- Task: TASK-A-05

-- ================================================
-- DROP TRIGGER
-- ================================================
DROP TRIGGER IF EXISTS audit_identity_linking_trigger ON user_external_ids;

-- ================================================
-- DROP FUNCTIONS
-- ================================================
DROP FUNCTION IF EXISTS audit_identity_linking();
DROP FUNCTION IF EXISTS get_profile_by_external_id(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS increment_journey_counter(UUID, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS update_journey_flag(UUID, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS link_external_id(UUID, VARCHAR, VARCHAR, JSONB);

-- ================================================
-- DROP TABLES
-- ================================================
DROP TABLE IF EXISTS identity_linking_audit;
DROP TABLE IF EXISTS user_external_ids;

-- ================================================
-- DROP COLUMN
-- ================================================
DROP INDEX IF EXISTS idx_users_journey_flags;
ALTER TABLE users DROP COLUMN IF EXISTS journey_flags;

-- ================================================
-- COMMENTS
-- ================================================
-- Migration 0010 has been rolled back
-- All identity linking infrastructure removed
