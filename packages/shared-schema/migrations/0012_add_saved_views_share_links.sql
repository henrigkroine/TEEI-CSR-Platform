-- Migration: Add saved views and share links tables
-- Date: 2025-11-14
-- Description: Creates tables for saved dashboard views and secure share links
--              with TTL, HMAC signing, and tenant scoping

-- Saved Views Table
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL, -- Tenant scoping
  user_id UUID NOT NULL, -- Owner of the view
  view_name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  filter_config JSONB NOT NULL, -- Dashboard filter state (date range, cohorts, programs, etc.)
  is_default BOOLEAN DEFAULT FALSE, -- User's default view
  is_shared BOOLEAN DEFAULT FALSE, -- Shared with company team
  view_count INTEGER DEFAULT 0, -- Usage tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_view_name UNIQUE (user_id, view_name)
);

-- Indexes for saved views
CREATE INDEX IF NOT EXISTS saved_views_company_idx
  ON saved_views(company_id);
CREATE INDEX IF NOT EXISTS saved_views_user_idx
  ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS saved_views_created_at_idx
  ON saved_views(created_at DESC);

-- Share Links Table
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id VARCHAR(64) UNIQUE NOT NULL, -- URL-safe unique identifier
  company_id UUID NOT NULL, -- Tenant scoping
  created_by UUID NOT NULL, -- User who created the link
  saved_view_id UUID, -- Optional: link to saved view, NULL for ad-hoc share
  filter_config JSONB NOT NULL, -- Snapshot of filter state at creation
  signature VARCHAR(128) NOT NULL, -- HMAC signature for validation
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- TTL enforcement
  revoked_at TIMESTAMP WITH TIME ZONE, -- Manual revocation
  access_count INTEGER DEFAULT 0, -- Track usage
  last_accessed_at TIMESTAMP WITH TIME ZONE, -- Last view time
  boardroom_mode BOOLEAN DEFAULT FALSE, -- Enable presentation mode
  includes_sensitive_data BOOLEAN DEFAULT FALSE, -- Whether link includes sensitive PII
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_saved_view FOREIGN KEY (saved_view_id) REFERENCES saved_views(id) ON DELETE SET NULL
);

-- Indexes for share links
CREATE INDEX IF NOT EXISTS share_links_link_id_idx
  ON share_links(link_id);
CREATE INDEX IF NOT EXISTS share_links_company_idx
  ON share_links(company_id);
CREATE INDEX IF NOT EXISTS share_links_created_by_idx
  ON share_links(created_by);
CREATE INDEX IF NOT EXISTS share_links_expires_at_idx
  ON share_links(expires_at);
CREATE INDEX IF NOT EXISTS share_links_created_at_idx
  ON share_links(created_at DESC);

-- Share Link Access Log Table (audit trail)
CREATE TABLE IF NOT EXISTS share_link_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address INET,
  user_agent VARCHAR(500),
  referer VARCHAR(500),
  access_granted BOOLEAN NOT NULL, -- FALSE if expired/revoked
  failure_reason VARCHAR(100), -- 'expired', 'revoked', 'invalid_signature'
  metadata JSONB, -- Additional metadata (redaction stats, etc.)
  CONSTRAINT fk_share_link FOREIGN KEY (share_link_id) REFERENCES share_links(id) ON DELETE CASCADE
);

-- Indexes for access log
CREATE INDEX IF NOT EXISTS share_link_access_log_share_link_idx
  ON share_link_access_log(share_link_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS share_link_access_log_accessed_at_idx
  ON share_link_access_log(accessed_at DESC);

-- View count constraints
ALTER TABLE saved_views ADD CONSTRAINT max_views_per_user
  CHECK ((SELECT COUNT(*) FROM saved_views sv WHERE sv.user_id = saved_views.user_id) <= 10);

-- Add trigger to update view count on share link access
CREATE OR REPLACE FUNCTION increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_granted THEN
    UPDATE share_links
    SET access_count = access_count + 1,
        last_accessed_at = NEW.accessed_at
    WHERE id = NEW.share_link_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_view_count
  AFTER INSERT ON share_link_access_log
  FOR EACH ROW
  EXECUTE FUNCTION increment_view_count();

-- Add trigger to update saved_views.updated_at
CREATE OR REPLACE FUNCTION update_saved_views_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_views_timestamp
  BEFORE UPDATE ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_views_timestamp();

-- Add comments for documentation
COMMENT ON TABLE saved_views IS 'Stores named dashboard filter configurations for quick access and team sharing';
COMMENT ON TABLE share_links IS 'Secure, time-limited read-only links for sharing dashboard views with external stakeholders';
COMMENT ON TABLE share_link_access_log IS 'Audit trail of all share link access attempts for security and compliance';

COMMENT ON COLUMN saved_views.filter_config IS 'JSON object containing all dashboard filter state (dates, programs, cohorts, metrics)';
COMMENT ON COLUMN saved_views.is_default IS 'Only one view per user can be marked as default';
COMMENT ON COLUMN saved_views.is_shared IS 'When true, view is visible to all users in the same company';
COMMENT ON COLUMN share_links.signature IS 'HMAC-SHA256 signature of link_id + expires_at + filter_config for tamper detection';
COMMENT ON COLUMN share_links.expires_at IS 'Default 7 days from creation, configurable up to 90 days';
COMMENT ON COLUMN share_links.boardroom_mode IS 'Enables auto-refresh and large typography for presentations';
COMMENT ON COLUMN share_links.includes_sensitive_data IS 'When FALSE, PII and names are redacted; when TRUE, individual-level data is shared';
COMMENT ON COLUMN share_link_access_log.access_granted IS 'TRUE if link was valid and not expired/revoked';
COMMENT ON COLUMN share_link_access_log.metadata IS 'Additional metadata like redaction counts (no PII stored)';

-- Insert sample saved views for testing (optional)
-- Commented out for production, uncomment for development
/*
INSERT INTO saved_views (company_id, user_id, view_name, description, filter_config, is_default)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Q4 2024 Overview', 'Fourth quarter performance across all programs',
   '{"dateRange": {"start": "2024-10-01", "end": "2024-12-31"}, "programs": ["buddy", "upskilling"], "cohorts": []}',
   true),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Buddy Program Deep Dive', 'Detailed metrics for buddy matching program',
   '{"dateRange": {"start": "2024-01-01", "end": "2024-12-31"}, "programs": ["buddy"], "metrics": ["sroi", "vis", "retention"]}',
   false);
*/
