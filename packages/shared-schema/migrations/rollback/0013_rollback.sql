-- Rollback Migration 0013: Remove RBAC and Privacy Tables
-- Purpose: Safely revert database changes from migration 0013
-- Date: 2025-11-14
-- WARNING: This will delete all RBAC, audit, and GDPR data!

-- =============================================================================
-- Drop views first (depend on tables)
-- =============================================================================

DROP VIEW IF EXISTS v_pending_dsar_requests CASCADE;
DROP VIEW IF EXISTS v_recent_audit_logs CASCADE;
DROP VIEW IF EXISTS v_active_api_keys CASCADE;
DROP VIEW IF EXISTS v_active_company_users CASCADE;

-- =============================================================================
-- Drop triggers and functions
-- =============================================================================

-- audit_logs immutable trigger
DROP TRIGGER IF EXISTS audit_logs_immutable_trigger ON audit_logs;
DROP FUNCTION IF EXISTS prevent_audit_log_modification();

-- company_api_keys updated_at trigger
DROP TRIGGER IF EXISTS company_api_keys_updated_at_trigger ON company_api_keys;

-- dsar_requests updated_at trigger
DROP TRIGGER IF EXISTS dsar_requests_updated_at_trigger ON dsar_requests;

-- company_users updated_at trigger
DROP TRIGGER IF EXISTS company_users_updated_at_trigger ON company_users;
DROP FUNCTION IF EXISTS update_company_users_timestamp();

-- =============================================================================
-- Drop tables (in reverse dependency order)
-- =============================================================================

-- 5. DSAR requests (no foreign key dependencies from other tables)
DROP TABLE IF EXISTS dsar_requests CASCADE;

-- 4. Consent records (no foreign key dependencies from other tables)
DROP TABLE IF EXISTS consent_records CASCADE;

-- 3. Audit logs (references company_api_keys, drop before api_keys)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 2. Company API keys (references companies and users)
DROP TABLE IF EXISTS company_api_keys CASCADE;

-- 1. Company users (references companies and users)
DROP TABLE IF EXISTS company_users CASCADE;

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Rollback 0013 complete. All RBAC and privacy tables removed.';
  RAISE WARNING 'All tenant memberships, API keys, audit logs, consent records, and DSAR requests have been permanently deleted.';
END $$;
