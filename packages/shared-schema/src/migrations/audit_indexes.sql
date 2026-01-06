-- Audit Log Indexes and Partitioning
--
-- Optimized for the Audit Log Explorer query patterns:
-- 1. Time-range queries with tenant isolation
-- 2. Actor-based filtering
-- 3. Resource type and action filtering
-- 4. Full-text search in metadata

-- Create composite indexes for common query patterns
-- Tenant + timestamp (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_ts
  ON audit_logs(company_id, timestamp DESC)
  WHERE company_id IS NOT NULL;

-- Actor queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_ts
  ON audit_logs(actor_id, timestamp DESC);

-- Resource queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id, timestamp DESC);

-- Action category queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_category
  ON audit_logs(action_category, timestamp DESC);

-- Action type queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action, timestamp DESC);

-- Retention policy queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention
  ON audit_logs(retention_until)
  WHERE retention_until IS NOT NULL;

-- Request ID for correlation
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id
  ON audit_logs(request_id)
  WHERE request_id IS NOT NULL;

-- Full-text search on metadata (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin
  ON audit_logs USING GIN (metadata jsonb_path_ops);

-- Full-text search on before/after states
CREATE INDEX IF NOT EXISTS idx_audit_logs_before_state_gin
  ON audit_logs USING GIN (before_state jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_audit_logs_after_state_gin
  ON audit_logs USING GIN (after_state jsonb_path_ops);

-- Composite index for compliance export queries
-- (tenant + time range + action category)
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance_export
  ON audit_logs(company_id, timestamp DESC, action_category)
  WHERE company_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_audit_logs_tenant_ts IS
  'Optimized for tenant-scoped time-range queries (p95 ≤250ms for 30-day ranges)';

COMMENT ON INDEX idx_audit_logs_resource IS
  'Supports resource-specific audit trail lookups';

COMMENT ON INDEX idx_audit_logs_compliance_export IS
  'Optimized for compliance export queries with filtering';

-- Partitioning setup (declarative partitioning by day)
-- Note: This requires the table to be created as partitioned.
-- For existing tables, this would require table recreation.
-- We'll document the partitioning strategy for future implementations.

COMMENT ON TABLE audit_logs IS
  'Audit log table. Consider partitioning by (company_id, timestamp) for tables >100M rows.
   Partition by RANGE on timestamp (daily partitions) with subpartitioning by LIST on company_id.
   TTL policy: Retain verbose fields (before_state, after_state, metadata) for 90 days,
   then archive to compliance storage with digests only.';
