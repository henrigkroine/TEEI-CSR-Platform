-- Migration 0013: Add RBAC and Privacy Tables
-- Purpose: Database-backed tenant access control, API keys, audit trails, GDPR compliance
-- Date: 2025-11-14
-- Worker: Phase D Backend Criticals

-- =============================================================================
-- 1. COMPANY USERS (Tenant Membership Registry)
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'system_admin',
    'company_admin',
    'company_user',
    'participant',
    'volunteer',
    'api_client'
  )),
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_access_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Unique constraint: user can only have one role per company
  CONSTRAINT unique_user_company UNIQUE (user_id, company_id)
);

-- Indexes for tenant membership lookups (critical path)
CREATE INDEX idx_company_users_lookup ON company_users(user_id, company_id)
  WHERE is_active = true;

CREATE INDEX idx_company_users_by_company ON company_users(company_id, role)
  WHERE is_active = true;

CREATE INDEX idx_company_users_by_role ON company_users(role)
  WHERE is_active = true;

CREATE INDEX idx_company_users_last_access ON company_users(last_access_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_company_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_users_updated_at_trigger
  BEFORE UPDATE ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION update_company_users_timestamp();

COMMENT ON TABLE company_users IS 'Tenant membership registry for RBAC - maps users to companies with roles';
COMMENT ON COLUMN company_users.role IS 'System-wide role within this company context';
COMMENT ON COLUMN company_users.permissions IS 'Fine-grained permissions array (e.g., ["data:export", "report:create"])';
COMMENT ON COLUMN company_users.is_active IS 'Deactivated users cannot access company resources';
COMMENT ON COLUMN company_users.last_access_at IS 'Updated asynchronously on each authenticated request';

-- =============================================================================
-- 2. COMPANY API KEYS (Programmatic Access)
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(12) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_used_at TIMESTAMP,
  last_used_ip INET,
  usage_count BIGINT DEFAULT 0,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for API key verification (hot path)
CREATE UNIQUE INDEX idx_api_keys_hash_lookup ON company_api_keys(key_hash)
  WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());

CREATE INDEX idx_api_keys_by_company ON company_api_keys(company_id, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_api_keys_expired ON company_api_keys(expires_at)
  WHERE revoked_at IS NULL AND expires_at IS NOT NULL;

CREATE INDEX idx_api_keys_usage ON company_api_keys(company_id, usage_count DESC);

-- Trigger to update updated_at
CREATE TRIGGER company_api_keys_updated_at_trigger
  BEFORE UPDATE ON company_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_company_users_timestamp();

COMMENT ON TABLE company_api_keys IS 'API keys for programmatic access to company data';
COMMENT ON COLUMN company_api_keys.key_hash IS 'SHA-256 hash of the API key (store hash, not plaintext)';
COMMENT ON COLUMN company_api_keys.key_prefix IS 'First 12 chars for identification (e.g., "teei_live_abc")';
COMMENT ON COLUMN company_api_keys.scopes IS 'Allowed operations (e.g., ["data:read", "report:view"])';
COMMENT ON COLUMN company_api_keys.rate_limit_per_minute IS 'Max requests per minute for this key';

-- =============================================================================
-- 3. AUDIT LOGS (Tamper-Proof Audit Trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES company_api_keys(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  request_id VARCHAR(100),
  success BOOLEAN NOT NULL DEFAULT true,
  error_code VARCHAR(50),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Partition by month for performance (future optimization)
-- CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
--   FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Indexes for audit queries
CREATE INDEX idx_audit_logs_company_time ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_failed ON audit_logs(success, created_at DESC) WHERE success = false;
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id) WHERE request_id IS NOT NULL;

-- GIN index for JSON metadata queries
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata jsonb_path_ops);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all access and modifications';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., "TENANT_ACCESS_DENIED", "DATA_EXPORT", "USER_INVITED")';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource accessed (e.g., "company", "report", "user")';
COMMENT ON COLUMN audit_logs.request_id IS 'Correlation ID for tracing across services';
COMMENT ON COLUMN audit_logs.duration_ms IS 'Request duration in milliseconds';

-- Prevent updates and deletes on audit logs (append-only)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs are immutable. Operation % not allowed.', TG_OP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable_trigger
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- =============================================================================
-- 4. CONSENT RECORDS (GDPR Consent Tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL CHECK (consent_type IN (
    'necessary',
    'analytics',
    'marketing',
    'data_processing',
    'data_sharing',
    'data_retention'
  )),
  granted BOOLEAN NOT NULL,
  version VARCHAR(20) NOT NULL,
  consent_text TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  granted_at TIMESTAMP,
  withdrawn_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for consent queries
CREATE INDEX idx_consent_user_type ON consent_records(user_id, consent_type, granted);
CREATE INDEX idx_consent_company ON consent_records(company_id, consent_type);
CREATE INDEX idx_consent_granted_at ON consent_records(granted_at DESC) WHERE granted = true;
CREATE INDEX idx_consent_withdrawn_at ON consent_records(withdrawn_at DESC) WHERE withdrawn_at IS NOT NULL;

COMMENT ON TABLE consent_records IS 'GDPR consent tracking with audit trail';
COMMENT ON COLUMN consent_records.consent_type IS 'Type of consent (necessary, analytics, marketing, etc.)';
COMMENT ON COLUMN consent_records.granted IS 'True if consent granted, false if withdrawn';
COMMENT ON COLUMN consent_records.version IS 'Version of terms/policy (e.g., "2.1", "2025-Q1")';
COMMENT ON COLUMN consent_records.consent_text IS 'Snapshot of consent text shown to user';

-- =============================================================================
-- 5. DSAR REQUESTS (Data Subject Access Requests)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('export', 'delete', 'rectify', 'portability')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
  )),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Export-specific fields
  export_url TEXT,
  export_size_bytes BIGINT,
  export_expires_at TIMESTAMP,
  encryption_key_id VARCHAR(100),

  -- Delete-specific fields
  cancellation_deadline TIMESTAMP,
  deletion_scheduled_at TIMESTAMP,

  -- Progress tracking
  services_total INTEGER,
  services_completed INTEGER DEFAULT 0,
  services_failed INTEGER DEFAULT 0,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for DSAR queries
CREATE INDEX idx_dsar_status ON dsar_requests(status, requested_at);
CREATE INDEX idx_dsar_user ON dsar_requests(user_id, request_type, status);
CREATE INDEX idx_dsar_company ON dsar_requests(company_id, status) WHERE company_id IS NOT NULL;
CREATE INDEX idx_dsar_scheduled_deletions ON dsar_requests(deletion_scheduled_at)
  WHERE request_type = 'delete' AND status = 'pending' AND deletion_scheduled_at IS NOT NULL;
CREATE INDEX idx_dsar_expired_exports ON dsar_requests(export_expires_at)
  WHERE export_url IS NOT NULL AND export_expires_at IS NOT NULL;

-- Trigger to update updated_at
CREATE TRIGGER dsar_requests_updated_at_trigger
  BEFORE UPDATE ON dsar_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_company_users_timestamp();

COMMENT ON TABLE dsar_requests IS 'Data Subject Access Requests for GDPR compliance';
COMMENT ON COLUMN dsar_requests.request_type IS 'Type of request: export (download data), delete (erasure), rectify (correction), portability';
COMMENT ON COLUMN dsar_requests.status IS 'Current status of the request';
COMMENT ON COLUMN dsar_requests.export_url IS 'Pre-signed S3 URL for data export (TTL: 30 days)';
COMMENT ON COLUMN dsar_requests.encryption_key_id IS 'KMS key ID or GPG key fingerprint used for encryption';
COMMENT ON COLUMN dsar_requests.cancellation_deadline IS 'User can cancel delete request before this timestamp (typically 30 days)';
COMMENT ON COLUMN dsar_requests.services_total IS 'Number of services to fan-out to';
COMMENT ON COLUMN dsar_requests.services_completed IS 'Number of services that completed successfully';

-- =============================================================================
-- 6. HELPER VIEWS
-- =============================================================================

-- Active company users with full details
CREATE OR REPLACE VIEW v_active_company_users AS
SELECT
  cu.id,
  cu.user_id,
  cu.company_id,
  cu.role,
  cu.permissions,
  cu.joined_at,
  cu.last_access_at,
  u.email,
  u.name AS user_name,
  c.name AS company_name
FROM company_users cu
JOIN users u ON cu.user_id = u.id
JOIN companies c ON cu.company_id = c.id
WHERE cu.is_active = true;

COMMENT ON VIEW v_active_company_users IS 'Active company memberships with user and company details';

-- Active API keys with company details
CREATE OR REPLACE VIEW v_active_api_keys AS
SELECT
  k.id,
  k.company_id,
  k.key_prefix,
  k.name,
  k.scopes,
  k.rate_limit_per_minute,
  k.last_used_at,
  k.usage_count,
  k.expires_at,
  c.name AS company_name
FROM company_api_keys k
JOIN companies c ON k.company_id = c.id
WHERE k.revoked_at IS NULL
  AND (k.expires_at IS NULL OR k.expires_at > NOW());

COMMENT ON VIEW v_active_api_keys IS 'Active API keys that are not revoked or expired';

-- Recent audit events (last 7 days)
CREATE OR REPLACE VIEW v_recent_audit_logs AS
SELECT
  a.id,
  a.company_id,
  a.user_id,
  a.action,
  a.resource_type,
  a.resource_id,
  a.success,
  a.created_at,
  c.name AS company_name,
  u.email AS user_email
FROM audit_logs a
LEFT JOIN companies c ON a.company_id = c.id
LEFT JOIN users u ON a.user_id = u.id
WHERE a.created_at > NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;

COMMENT ON VIEW v_recent_audit_logs IS 'Audit events from the last 7 days';

-- Pending DSAR requests
CREATE OR REPLACE VIEW v_pending_dsar_requests AS
SELECT
  d.id,
  d.user_id,
  d.company_id,
  d.request_type,
  d.status,
  d.requested_at,
  d.cancellation_deadline,
  u.email AS user_email,
  c.name AS company_name
FROM dsar_requests d
JOIN users u ON d.user_id = u.id
LEFT JOIN companies c ON d.company_id = c.id
WHERE d.status IN ('pending', 'in_progress')
ORDER BY d.requested_at ASC;

COMMENT ON VIEW v_pending_dsar_requests IS 'DSAR requests awaiting processing';

-- =============================================================================
-- 7. ROLLBACK PREPARATION
-- =============================================================================

-- Create rollback script
DO $$
BEGIN
  -- Rollback SQL will be in separate file: rollback/0013_rollback.sql
  RAISE NOTICE 'Migration 0013 complete. Run rollback/0013_rollback.sql to revert.';
END $$;
