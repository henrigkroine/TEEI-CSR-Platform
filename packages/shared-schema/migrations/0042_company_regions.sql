-- Migration: Add company regions for data residency enforcement
-- Author: residency-policy-enforcer
-- Date: 2025-11-15
-- Description: Implements tenant→region mapping with GDPR-compliant strict residency enforcement

-- =====================================================
-- Table: company_regions
-- Purpose: Maps each company/tenant to their data residency region
-- =====================================================

CREATE TABLE IF NOT EXISTS company_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  region VARCHAR(20) NOT NULL CHECK (region IN ('eu-central-1', 'us-east-1')),
  residency_type VARCHAR(10) NOT NULL CHECK (residency_type IN ('strict', 'flexible')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_company_regions_company_id ON company_regions(company_id);
CREATE INDEX idx_company_regions_region ON company_regions(region);
CREATE INDEX idx_company_regions_residency_type ON company_regions(residency_type);

-- Comments for documentation
COMMENT ON TABLE company_regions IS 'Maps companies to their assigned data residency region for GDPR/compliance';
COMMENT ON COLUMN company_regions.region IS 'AWS region where company data must reside (eu-central-1 or us-east-1)';
COMMENT ON COLUMN company_regions.residency_type IS 'strict: data must stay in region (GDPR), flexible: can use any region';

-- =====================================================
-- Table: residency_audit_logs
-- Purpose: Audit trail for all residency validation checks
-- IMPORTANT: NO PII - company_id is hashed with SHA-256
-- =====================================================

CREATE TABLE IF NOT EXISTS residency_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of company_id
  requested_region VARCHAR(20) NOT NULL,
  assigned_region VARCHAR(20) NOT NULL,
  residency_type VARCHAR(10) NOT NULL,
  allowed VARCHAR(5) NOT NULL CHECK (allowed IN ('true', 'false')),
  operation VARCHAR(100),
  request_id VARCHAR(100),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit querying
CREATE INDEX idx_residency_audit_logs_timestamp ON residency_audit_logs(timestamp DESC);
CREATE INDEX idx_residency_audit_logs_allowed ON residency_audit_logs(allowed);
CREATE INDEX idx_residency_audit_logs_company_hash ON residency_audit_logs(company_id_hash);

-- Comments for documentation
COMMENT ON TABLE residency_audit_logs IS 'Audit trail for data residency validation checks (PII-free)';
COMMENT ON COLUMN residency_audit_logs.company_id_hash IS 'SHA-256 hash of company_id to prevent PII in audit logs';
COMMENT ON COLUMN residency_audit_logs.allowed IS 'Whether the residency check passed (true) or failed (false)';

-- =====================================================
-- Seed Data: Initial company region mappings
-- =====================================================

-- Example EU companies (strict GDPR residency)
-- Note: Replace these UUIDs with actual company IDs from your system
INSERT INTO company_regions (company_id, region, residency_type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'eu-central-1', 'strict'),  -- Example EU Company 1
  ('00000000-0000-0000-0000-000000000002', 'eu-central-1', 'strict'),  -- Example EU Company 2
  ('00000000-0000-0000-0000-000000000003', 'eu-central-1', 'strict')   -- Example EU Company 3
ON CONFLICT (company_id) DO NOTHING;

-- Example US companies (flexible residency - can use any region)
INSERT INTO company_regions (company_id, region, residency_type) VALUES
  ('00000000-0000-0000-0000-000000000101', 'us-east-1', 'flexible'),   -- Example US Company 1
  ('00000000-0000-0000-0000-000000000102', 'us-east-1', 'flexible'),   -- Example US Company 2
  ('00000000-0000-0000-0000-000000000103', 'us-east-1', 'flexible')    -- Example US Company 3
ON CONFLICT (company_id) DO NOTHING;

-- =====================================================
-- Trigger: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_company_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_regions_updated_at
  BEFORE UPDATE ON company_regions
  FOR EACH ROW
  EXECUTE FUNCTION update_company_regions_updated_at();

-- =====================================================
-- Views for reporting (optional)
-- =====================================================

-- View: Company region distribution
CREATE OR REPLACE VIEW v_company_region_distribution AS
SELECT
  region,
  residency_type,
  COUNT(*) as company_count
FROM company_regions
GROUP BY region, residency_type
ORDER BY region, residency_type;

COMMENT ON VIEW v_company_region_distribution IS 'Summary of company distribution across regions and residency types';

-- View: Recent residency violations (for security monitoring)
CREATE OR REPLACE VIEW v_recent_residency_violations AS
SELECT
  company_id_hash,
  requested_region,
  assigned_region,
  residency_type,
  operation,
  timestamp
FROM residency_audit_logs
WHERE allowed = 'false'
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 1000;

COMMENT ON VIEW v_recent_residency_violations IS 'Recent residency policy violations (last 7 days) for security monitoring';

-- =====================================================
-- Grant permissions (adjust roles as needed)
-- =====================================================

-- Grant read access to data-residency service
-- GRANT SELECT ON company_regions TO teei_data_residency_service;
-- GRANT SELECT, INSERT ON residency_audit_logs TO teei_data_residency_service;

-- Grant update access to admin service (for region migrations)
-- GRANT UPDATE ON company_regions TO teei_admin_service;

-- =====================================================
-- Migration complete
-- =====================================================
