-- Rollback Migration: Remove includes_sensitive_data column and metadata
-- Date: 2025-11-15
-- Description: Rollback changes from 0014_add_share_links_sensitive_data_column.sql

-- Remove index
DROP INDEX IF EXISTS share_links_includes_sensitive_data_idx;

-- Remove columns (data will be lost!)
ALTER TABLE share_links DROP COLUMN IF EXISTS includes_sensitive_data;
ALTER TABLE share_link_access_log DROP COLUMN IF EXISTS metadata;

-- Restore original column comments
COMMENT ON COLUMN share_links.expires_at IS
  'Default 7 days from creation, configurable up to 90 days';

-- Rollback complete
-- Run with: psql -d teei_csr -f rollback/0014_rollback_share_links_sensitive_data.sql
