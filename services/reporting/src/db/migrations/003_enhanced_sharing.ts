/**
 * Migration: Enhanced Sharing System
 *
 * Phase H - Cockpit GA
 * Adds IP allowlists, watermark policies, org/group sharing with RBAC
 *
 * Features:
 * - IP allowlist for share links
 * - Watermark policy configuration
 * - Organization and group-based sharing
 * - RBAC-based access control
 * - Enhanced audit trail
 */

export const up = `
-- Share Links Table (enhanced)
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id VARCHAR(64) UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  saved_view_id UUID NULL,
  filter_config JSONB NULL,
  signature VARCHAR(512) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  boardroom_mode BOOLEAN DEFAULT FALSE,

  -- Phase H Enhancements
  access_type VARCHAR(50) DEFAULT 'public_link' CHECK (access_type IN ('public_link', 'org_share', 'group_share')),
  allowed_ips JSONB NULL,  -- Array of IP addresses/CIDR ranges
  ip_allowlist_enabled BOOLEAN DEFAULT FALSE,
  watermark_policy VARCHAR(50) DEFAULT 'standard' CHECK (watermark_policy IN ('none', 'standard', 'strict')),
  watermark_text VARCHAR(500) NULL,
  group_ids JSONB NULL,  -- Array of group UUIDs for group sharing
  role_restrictions JSONB NULL,  -- Array of required roles for access

  -- Metadata
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_links_company ON share_links(company_id);
CREATE INDEX idx_share_links_link_id ON share_links(link_id);
CREATE INDEX idx_share_links_created_by ON share_links(created_by);
CREATE INDEX idx_share_links_expires_at ON share_links(expires_at);
CREATE INDEX idx_share_links_access_type ON share_links(access_type);

-- Share Link Access Log (enhanced)
CREATE TABLE IF NOT EXISTS share_link_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT NULL,
  referer TEXT NULL,
  user_id UUID NULL,  -- If accessed by authenticated user
  access_granted BOOLEAN NOT NULL,
  failure_reason VARCHAR(100) NULL,
  watermark_applied BOOLEAN DEFAULT FALSE,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_log_share_link ON share_link_access_log(share_link_id);
CREATE INDEX idx_access_log_accessed_at ON share_link_access_log(accessed_at);
CREATE INDEX idx_access_log_ip ON share_link_access_log(ip_address);
CREATE INDEX idx_access_log_granted ON share_link_access_log(access_granted);

-- Organization Groups Table (for group-based sharing)
CREATE TABLE IF NOT EXISTS organization_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  parent_group_id UUID NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX idx_org_groups_company ON organization_groups(company_id);
CREATE INDEX idx_org_groups_parent ON organization_groups(parent_group_id);

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  added_by UUID NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- Watermark Policy Configuration Table
CREATE TABLE IF NOT EXISTS watermark_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  policy_type VARCHAR(50) DEFAULT 'standard' CHECK (policy_type IN ('none', 'standard', 'strict', 'custom')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX idx_watermark_policies_company ON watermark_policies(company_id);

-- Audit Log Enhancement for sharing actions
CREATE TABLE IF NOT EXISTS sharing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  share_link_id UUID NULL REFERENCES share_links(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,  -- 'created', 'updated', 'revoked', 'accessed', 'ip_blocked'
  actor_id UUID NOT NULL,
  target_user_id UUID NULL,
  ip_address INET NULL,
  changes JSONB NULL,  -- JSON diff of changes
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sharing_audit_company ON sharing_audit_log(company_id);
CREATE INDEX idx_sharing_audit_share_link ON sharing_audit_log(share_link_id);
CREATE INDEX idx_sharing_audit_action ON sharing_audit_log(action);
CREATE INDEX idx_sharing_audit_created ON sharing_audit_log(created_at);

-- Function to validate IP against allowlist (CIDR support)
CREATE OR REPLACE FUNCTION is_ip_in_allowlist(
  p_ip INET,
  p_allowlist JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  allowed_ip TEXT;
  ip_range CIDR;
BEGIN
  IF p_allowlist IS NULL OR jsonb_array_length(p_allowlist) = 0 THEN
    RETURN TRUE;  -- Empty allowlist means all IPs allowed
  END IF;

  FOR allowed_ip IN SELECT jsonb_array_elements_text(p_allowlist)
  LOOP
    BEGIN
      ip_range := allowed_ip::CIDR;
      IF p_ip << ip_range OR p_ip = ip_range THEN
        RETURN TRUE;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip invalid CIDR notation
        CONTINUE;
    END;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_share_links_updated_at
  BEFORE UPDATE ON share_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_groups_updated_at
  BEFORE UPDATE ON organization_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watermark_policies_updated_at
  BEFORE UPDATE ON watermark_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample watermark policies
INSERT INTO watermark_policies (company_id, name, policy_type, config, created_by)
SELECT
  id,
  'Standard Watermark',
  'standard',
  jsonb_build_object(
    'text', 'CONFIDENTIAL - For Authorized Use Only',
    'position', 'bottom-right',
    'opacity', 0.3,
    'fontSize', 12,
    'includeTimestamp', true,
    'includeUserInfo', false
  ),
  id  -- Use company_id as created_by for system-generated policies
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM watermark_policies WHERE company_id = companies.id
)
LIMIT 1;

-- Comments
COMMENT ON TABLE share_links IS 'Enhanced share links with IP allowlist, watermark policies, and org/group sharing';
COMMENT ON COLUMN share_links.access_type IS 'Type of share: public_link, org_share, or group_share';
COMMENT ON COLUMN share_links.allowed_ips IS 'JSON array of allowed IP addresses or CIDR ranges';
COMMENT ON COLUMN share_links.watermark_policy IS 'Watermark policy to apply when sharing';
COMMENT ON COLUMN share_links.group_ids IS 'JSON array of group UUIDs for group-based sharing';
COMMENT ON COLUMN share_links.role_restrictions IS 'JSON array of required roles for access';

COMMENT ON TABLE organization_groups IS 'Groups for organizing users and managing group-based sharing';
COMMENT ON TABLE watermark_policies IS 'Reusable watermark policy configurations';
COMMENT ON TABLE sharing_audit_log IS 'Comprehensive audit trail for all sharing actions';
`;

export const down = `
DROP TRIGGER IF EXISTS update_watermark_policies_updated_at ON watermark_policies;
DROP TRIGGER IF EXISTS update_organization_groups_updated_at ON organization_groups;
DROP TRIGGER IF EXISTS update_share_links_updated_at ON share_links;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS is_ip_in_allowlist(INET, JSONB);
DROP TABLE IF EXISTS sharing_audit_log CASCADE;
DROP TABLE IF EXISTS watermark_policies CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS organization_groups CASCADE;
DROP TABLE IF EXISTS share_link_access_log CASCADE;
DROP TABLE IF EXISTS share_links CASCADE;
`;
