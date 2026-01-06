# Database Migration Runbook - Phase C

## Overview

This document provides detailed procedures for running Phase C database migrations safely. Migrations add support for multi-tenant routing, RBAC, admin console features, and audit logging.

**Target Databases**: PostgreSQL 15.x
**Migration Tool**: Kysely or custom SQL scripts
**Rollback Strategy**: Transaction-based with savepoints

---

## Pre-Migration Checklist

- [ ] Database backup completed (see staging_rollout.md Step 1)
- [ ] Database connection credentials verified
- [ ] No active user sessions (or maintenance mode enabled)
- [ ] Migration scripts reviewed and tested locally
- [ ] Rollback scripts prepared
- [ ] Migration log file initialized

---

## Phase C Migrations

### Migration 001: Tenant Routing Support

**File**: `001_add_tenant_routing.sql`
**Purpose**: Add tenant context and routing validation
**Tables Modified**: `companies`, `users`, `sessions`
**Risk Level**: 🟡 Medium (adds columns, no data loss)

```sql
-- Add tenant routing columns
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS tenant_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tenant_config JSONB DEFAULT '{}'::jsonb;

-- Add tenant scoping to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS allowed_tenants TEXT[] DEFAULT ARRAY[company_id];

-- Add session tenant validation
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_tenant_switch_at TIMESTAMP WITH TIME ZONE;

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);

-- Update existing companies with slugs (derived from ID)
UPDATE companies
SET slug = LOWER(REPLACE(name, ' ', '-'))
WHERE slug IS NULL;
```

**Verification**:
```sql
-- Check columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'companies' AND column_name IN ('slug', 'tenant_enabled');

-- Verify all companies have slugs
SELECT COUNT(*) FROM companies WHERE slug IS NULL;  -- Should be 0
```

**Rollback**:
```sql
ALTER TABLE companies DROP COLUMN IF EXISTS slug;
ALTER TABLE companies DROP COLUMN IF EXISTS tenant_enabled;
ALTER TABLE companies DROP COLUMN IF EXISTS tenant_config;
ALTER TABLE users DROP COLUMN IF EXISTS allowed_tenants;
ALTER TABLE sessions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS last_tenant_switch_at;
DROP INDEX IF EXISTS idx_companies_slug;
DROP INDEX IF EXISTS idx_sessions_tenant_id;
```

---

### Migration 002: RBAC Role System

**File**: `002_add_rbac_roles.sql`
**Purpose**: Expand role system from 2 roles to 4 roles with hierarchy
**Tables Modified**: `users`, `user_roles` (new), `role_permissions` (new)
**Risk Level**: 🟢 Low (additive only)

```sql
-- Create role enum with new roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM ('VIEWER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');
  END IF;
END
$$;

-- Update users table with new role type
ALTER TABLE users
  ALTER COLUMN role TYPE user_role_enum USING role::text::user_role_enum;

-- Create role hierarchy table
CREATE TABLE IF NOT EXISTS role_hierarchy (
  role user_role_enum PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO role_hierarchy (role, level, description) VALUES
  ('SUPER_ADMIN', 4, 'Full system access across all companies'),
  ('ADMIN', 3, 'Company administrator with full access to all features'),
  ('MANAGER', 2, 'Can view, export, and generate reports'),
  ('VIEWER', 1, 'Read-only access to dashboard and reports')
ON CONFLICT (role) DO UPDATE SET
  level = EXCLUDED.level,
  description = EXCLUDED.description;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role user_role_enum NOT NULL,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- Migrate existing roles
UPDATE users SET role = 'ADMIN' WHERE role::text = 'admin';
UPDATE users SET role = 'VIEWER' WHERE role::text = 'viewer';
```

**Verification**:
```sql
-- Check role enum created
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role_enum'::regtype ORDER BY enumsortorder;

-- Verify role hierarchy
SELECT * FROM role_hierarchy ORDER BY level DESC;

-- Check no NULL roles
SELECT COUNT(*) FROM users WHERE role IS NULL;  -- Should be 0
```

**Rollback**:
```sql
-- Revert to old role type (simplified - may need adjustment)
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS role_hierarchy;
DROP TYPE IF EXISTS user_role_enum;
```

---

### Migration 003: API Keys Table

**File**: `003_add_api_keys_table.sql`
**Purpose**: Add API key management for programmatic access
**Tables Added**: `api_keys`
**Risk Level**: 🟢 Low (new table, no existing data affected)

```sql
-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,  -- bcrypt hash of actual key
  key_prefix VARCHAR(16) NOT NULL,         -- First 8 chars for display
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:metrics'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT valid_revocation CHECK (revoked_at IS NULL OR revoked_at > created_at)
);

-- Create indexes
CREATE INDEX idx_api_keys_company_id ON api_keys(company_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Create API key usage tracking table
CREATE TABLE IF NOT EXISTS api_key_usage (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  endpoint VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  request_count INTEGER DEFAULT 1
);

-- Partition by month for efficient archival
CREATE INDEX idx_api_key_usage_api_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_used_at ON api_key_usage(used_at);
```

**Verification**:
```sql
-- Check tables created
SELECT tablename FROM pg_tables WHERE tablename IN ('api_keys', 'api_key_usage');

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'api_keys';

-- Verify constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'api_keys'::regclass;
```

**Rollback**:
```sql
DROP TABLE IF EXISTS api_key_usage;
DROP TABLE IF EXISTS api_keys;
```

---

### Migration 004: Audit Log Table

**File**: `004_add_audit_log_table.sql`
**Purpose**: Track all admin actions for compliance
**Tables Added**: `audit_log`
**Risk Level**: 🟢 Low (new table, append-only)

```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role user_role_enum,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),

  CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'error'))
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_company_id ON audit_log(company_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_severity ON audit_log(severity) WHERE severity != 'info';

-- Create audit retention policy function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create automated cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs(90)');
```

**Verification**:
```sql
-- Check table created
SELECT tablename FROM pg_tables WHERE tablename = 'audit_log';

-- Verify function created
SELECT proname FROM pg_proc WHERE proname = 'cleanup_old_audit_logs';

-- Test audit log insertion
INSERT INTO audit_log (company_id, user_email, action, resource, severity)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  'test@example.com',
  'TEST_ACTION',
  'TEST_RESOURCE',
  'info'
);

SELECT COUNT(*) FROM audit_log WHERE action = 'TEST_ACTION';  -- Should be 1

-- Cleanup test data
DELETE FROM audit_log WHERE action = 'TEST_ACTION';
```

**Rollback**:
```sql
DROP FUNCTION IF EXISTS cleanup_old_audit_logs;
DROP TABLE IF EXISTS audit_log;
```

---

### Migration 005: Weight Overrides Table

**File**: `005_add_weight_overrides_table.sql`
**Purpose**: Store custom SROI/VIS weight configurations per company
**Tables Added**: `weight_overrides`, `weight_override_history`
**Risk Level**: 🟢 Low (new table, no existing data affected)

```sql
-- Create weight overrides table
CREATE TABLE IF NOT EXISTS weight_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('sroi', 'vis')),
  weights JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE (company_id, category)
);

-- Create weight override history for audit trail
CREATE TABLE IF NOT EXISTS weight_override_history (
  id BIGSERIAL PRIMARY KEY,
  weight_override_id UUID NOT NULL REFERENCES weight_overrides(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  category VARCHAR(20) NOT NULL,
  old_weights JSONB,
  new_weights JSONB NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_reason TEXT
);

-- Indexes
CREATE INDEX idx_weight_overrides_company_id ON weight_overrides(company_id);
CREATE INDEX idx_weight_override_history_weight_override_id ON weight_override_history(weight_override_id);
CREATE INDEX idx_weight_override_history_changed_at ON weight_override_history(changed_at DESC);

-- Function to automatically track weight changes
CREATE OR REPLACE FUNCTION track_weight_override_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO weight_override_history (
    weight_override_id,
    company_id,
    category,
    old_weights,
    new_weights,
    changed_by
  ) VALUES (
    NEW.id,
    NEW.company_id,
    NEW.category,
    OLD.weights,
    NEW.weights,
    NEW.updated_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for weight changes
CREATE TRIGGER weight_override_update_trigger
AFTER UPDATE OF weights ON weight_overrides
FOR EACH ROW
WHEN (OLD.weights IS DISTINCT FROM NEW.weights)
EXECUTE FUNCTION track_weight_override_changes();
```

**Verification**:
```sql
-- Check tables created
SELECT tablename FROM pg_tables WHERE tablename LIKE 'weight_override%';

-- Verify trigger created
SELECT tgname FROM pg_trigger WHERE tgrelid = 'weight_overrides'::regclass;

-- Test weight override insert
INSERT INTO weight_overrides (company_id, category, weights)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  'sroi',
  '{"volunteer_hour_value": 35.00}'::jsonb
);

SELECT * FROM weight_overrides WHERE category = 'sroi';

-- Cleanup test data
DELETE FROM weight_overrides WHERE category = 'sroi';
```

**Rollback**:
```sql
DROP TRIGGER IF EXISTS weight_override_update_trigger ON weight_overrides;
DROP FUNCTION IF EXISTS track_weight_override_changes;
DROP TABLE IF EXISTS weight_override_history;
DROP TABLE IF EXISTS weight_overrides;
```

---

### Migration 006: Integration Configs Table

**File**: `006_add_integration_configs_table.sql`
**Purpose**: Store Impact-In platform configurations
**Tables Added**: `integration_configs`, `integration_delivery_log`
**Risk Level**: 🟢 Low (new tables)

```sql
-- Create integration configs table
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('benevity', 'goodera', 'workday')),
  enabled BOOLEAN DEFAULT false,
  api_endpoint TEXT,
  credentials_encrypted TEXT,  -- Encrypted JSON containing API keys
  config JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(20) CHECK (last_sync_status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (company_id, platform)
);

-- Create delivery log table
CREATE TABLE IF NOT EXISTS integration_delivery_log (
  id BIGSERIAL PRIMARY KEY,
  integration_config_id UUID NOT NULL REFERENCES integration_configs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  platform VARCHAR(50) NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'sending', 'success', 'failed', 'retrying')),
  payload_hash VARCHAR(64),  -- SHA256 hash of payload for deduplication
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  response_status INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_integration_configs_company_id ON integration_configs(company_id);
CREATE INDEX idx_integration_configs_platform ON integration_configs(platform);
CREATE INDEX idx_integration_delivery_log_config_id ON integration_delivery_log(integration_config_id);
CREATE INDEX idx_integration_delivery_log_delivered_at ON integration_delivery_log(delivered_at DESC);
CREATE INDEX idx_integration_delivery_log_status ON integration_delivery_log(status);
```

**Verification**:
```sql
-- Check tables created
SELECT tablename FROM pg_tables WHERE tablename LIKE 'integration_%';

-- Verify platform enum constraint
SELECT conname FROM pg_constraint WHERE conrelid = 'integration_configs'::regclass AND conname LIKE '%platform%';

-- Test integration config insert
INSERT INTO integration_configs (company_id, platform, enabled)
VALUES (
  (SELECT id FROM companies LIMIT 1),
  'benevity',
  true
);

SELECT * FROM integration_configs WHERE platform = 'benevity';

-- Cleanup test data
DELETE FROM integration_configs WHERE platform = 'benevity';
```

**Rollback**:
```sql
DROP TABLE IF EXISTS integration_delivery_log;
DROP TABLE IF EXISTS integration_configs;
```

---

## Migration Execution Procedure

### Step 1: Verify Database State

```bash
# Check current schema version
psql -h localhost -U teei_admin -d teei_cockpit_staging -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# Check for pending migrations
ls -1 migrations/*.sql | while read migration; do
  version=$(basename "$migration" .sql)
  exists=$(psql -h localhost -U teei_admin -d teei_cockpit_staging -t -c \
    "SELECT COUNT(*) FROM schema_migrations WHERE version='$version';")
  if [ "$exists" -eq 0 ]; then
    echo "Pending: $migration"
  fi
done
```

### Step 2: Run Migrations in Transaction

```bash
# Run each migration in a transaction for safety
for migration in migrations/00{1..6}_*.sql; do
  echo "Applying: $migration"

  psql -h localhost -U teei_admin -d teei_cockpit_staging <<EOF
    BEGIN;
    \i $migration
    INSERT INTO schema_migrations (version, applied_at)
    VALUES ('$(basename $migration .sql)', NOW());
    COMMIT;
EOF

  if [ $? -eq 0 ]; then
    echo "✅ Success: $migration"
  else
    echo "❌ Failed: $migration"
    exit 1
  fi
done
```

### Step 3: Verify Migrations Applied

```bash
# Check all migrations recorded
psql -h localhost -U teei_admin -d teei_cockpit_staging -c \
  "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;"
```

---

## Rollback Procedure

If a migration fails:

1. **Identify failed migration**:
   ```bash
   psql -d teei_cockpit_staging -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;"
   ```

2. **Run rollback script**:
   ```bash
   psql -d teei_cockpit_staging < rollback/006_rollback.sql
   ```

3. **Remove migration record**:
   ```bash
   psql -d teei_cockpit_staging -c "DELETE FROM schema_migrations WHERE version='006_add_integration_configs_table';"
   ```

4. **Verify rollback**:
   ```bash
   # Check table doesn't exist
   psql -d teei_cockpit_staging -c "\\dt integration_*"
   ```

---

## Post-Migration Validation

```sql
-- Verify all Phase C tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'api_keys',
  'api_key_usage',
  'audit_log',
  'weight_overrides',
  'weight_override_history',
  'integration_configs',
  'integration_delivery_log'
);  -- Should return 7 rows

-- Check indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename LIKE '%audit%' OR tablename LIKE '%api_key%'
ORDER BY tablename, indexname;

-- Verify foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('api_keys', 'audit_log', 'weight_overrides', 'integration_configs');
```

---

## Troubleshooting

### Issue: Duplicate Key Error

**Symptom**: `ERROR: duplicate key value violates unique constraint`

**Resolution**:
```sql
-- Find duplicates
SELECT column_name, COUNT(*)
FROM table_name
GROUP BY column_name
HAVING COUNT(*) > 1;

-- Remove duplicates (carefully!)
DELETE FROM table_name a USING (
  SELECT MIN(ctid) as ctid, column_name
  FROM table_name
  GROUP BY column_name
  HAVING COUNT(*) > 1
) b
WHERE a.column_name = b.column_name
AND a.ctid <> b.ctid;
```

### Issue: Migration Timeout

**Symptom**: Migration hangs or times out

**Resolution**:
```sql
-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Kill blocking queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active' AND query LIKE 'ALTER TABLE%';
```

### Issue: Foreign Key Violation

**Symptom**: `ERROR: insert or update on table violates foreign key constraint`

**Resolution**:
```sql
-- Check referential integrity
SELECT * FROM orphaned_table
WHERE parent_id NOT IN (SELECT id FROM parent_table);

-- Fix orphaned records
DELETE FROM orphaned_table
WHERE parent_id NOT IN (SELECT id FROM parent_table);
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Review Before Each Migration**: Yes
