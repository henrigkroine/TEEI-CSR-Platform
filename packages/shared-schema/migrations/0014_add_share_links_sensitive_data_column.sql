-- Migration: Add includes_sensitive_data column and metadata to share links
-- Date: 2025-11-15
-- Description: Adds PII redaction control and access logging metadata

-- Add includes_sensitive_data column to share_links table
-- This column controls whether individual-level data (names, IDs) is included
-- Default: false (only aggregated metrics shared, PII redacted)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'share_links'
    AND column_name = 'includes_sensitive_data'
  ) THEN
    ALTER TABLE share_links
    ADD COLUMN includes_sensitive_data BOOLEAN DEFAULT FALSE;

    COMMENT ON COLUMN share_links.includes_sensitive_data IS
      'When FALSE (default), PII and names are redacted; when TRUE, individual-level data is shared';
  END IF;
END $$;

-- Add metadata column to share_link_access_log table
-- Stores redaction statistics and other metadata (no PII)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'share_link_access_log'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE share_link_access_log
    ADD COLUMN metadata JSONB;

    COMMENT ON COLUMN share_link_access_log.metadata IS
      'Additional metadata like redaction counts (no PII stored)';
  END IF;
END $$;

-- Create index on includes_sensitive_data for filtering
CREATE INDEX IF NOT EXISTS share_links_includes_sensitive_data_idx
  ON share_links(includes_sensitive_data)
  WHERE includes_sensitive_data = true;

-- Add check constraint to encourage shorter TTL for sensitive links
-- This is a soft constraint (warning) via comment, not enforced
COMMENT ON COLUMN share_links.expires_at IS
  'Default 7 days from creation, configurable up to 90 days. Consider shorter TTL (1-7 days) when includes_sensitive_data is true.';

-- Migration complete
-- Run with: psql -d teei_csr -f 0014_add_share_links_sensitive_data_column.sql
