-- Migration: Add evidence ledger for tamper detection
-- Author: evidence-ledger-engineer (Agent 1.2)
-- Date: 2025-11-17
-- Description: Implements append-only ledger with hash chaining and HMAC signatures for evidence tampering detection

-- =====================================================
-- Table: evidence_ledger
-- Purpose: Append-only ledger tracking all evidence/citation modifications
-- Security: Hash chain + HMAC signatures for tamper detection
-- Privacy: NO PII - only IDs and hashes
-- =====================================================

CREATE TABLE IF NOT EXISTS evidence_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  citation_id UUID NOT NULL,

  -- Action type
  action VARCHAR(20) NOT NULL CHECK (action IN ('ADDED', 'MODIFIED', 'REMOVED')),

  -- Hash chain for integrity
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 of citation text
  previous_hash VARCHAR(64), -- SHA-256 of previous entry (NULL for first entry)

  -- HMAC signature for authentication
  signature VARCHAR(64) NOT NULL, -- HMAC-SHA256(id + reportId + citationId + action + contentHash + previousHash + timestamp)

  -- Actor tracking (NO PII)
  editor VARCHAR(100) NOT NULL, -- userId or 'system'

  -- Request context
  metadata JSONB, -- { ip: string, userAgent: string, reason: string, requestId: string }

  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Indexes for performance
-- =====================================================

-- Primary lookup by report_id
CREATE INDEX idx_evidence_ledger_report_id ON evidence_ledger(report_id);

-- Lookup citations in a report
CREATE INDEX idx_evidence_ledger_citation_id ON evidence_ledger(citation_id);

-- Temporal queries (chronological order is critical for hash chain)
CREATE INDEX idx_evidence_ledger_timestamp ON evidence_ledger(timestamp);

-- Composite index for report-specific queries with time range
CREATE INDEX idx_evidence_ledger_report_timestamp ON evidence_ledger(report_id, timestamp DESC);

-- Action-based queries for audit
CREATE INDEX idx_evidence_ledger_action ON evidence_ledger(action);

-- =====================================================
-- Append-only constraint enforcement
-- =====================================================

-- Prevent updates and deletes on evidence_ledger table
-- This ensures immutability for tamper detection
CREATE OR REPLACE FUNCTION prevent_evidence_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'UPDATE operations are not allowed on evidence_ledger (append-only table)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DELETE operations are not allowed on evidence_ledger (append-only table)';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce append-only constraint
CREATE TRIGGER trigger_prevent_evidence_ledger_update
  BEFORE UPDATE ON evidence_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evidence_ledger_modification();

CREATE TRIGGER trigger_prevent_evidence_ledger_delete
  BEFORE DELETE ON evidence_ledger
  FOR EACH ROW
  EXECUTE FUNCTION prevent_evidence_ledger_modification();

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE evidence_ledger IS 'Append-only tamper-evident ledger for tracking all evidence/citation modifications';
COMMENT ON COLUMN evidence_ledger.report_id IS 'Report to which this citation belongs';
COMMENT ON COLUMN evidence_ledger.citation_id IS 'Citation/evidence snippet that was modified';
COMMENT ON COLUMN evidence_ledger.action IS 'Type of modification: ADDED, MODIFIED, or REMOVED';
COMMENT ON COLUMN evidence_ledger.content_hash IS 'SHA-256 hash of citation text for integrity verification';
COMMENT ON COLUMN evidence_ledger.previous_hash IS 'SHA-256 hash of previous ledger entry, forming a hash chain (NULL for first entry)';
COMMENT ON COLUMN evidence_ledger.signature IS 'HMAC-SHA256 signature of entry for authentication';
COMMENT ON COLUMN evidence_ledger.editor IS 'User ID who made the change or "system" for automated changes (NO PII)';
COMMENT ON COLUMN evidence_ledger.metadata IS 'Additional context: IP, user agent, reason, request ID (NO PII - only IDs and technical data)';
COMMENT ON COLUMN evidence_ledger.timestamp IS 'When this entry was created (append-only, cannot be modified)';

-- =====================================================
-- Views for monitoring and audit
-- =====================================================

-- View: Recent evidence modifications (last 7 days)
CREATE OR REPLACE VIEW v_recent_evidence_modifications AS
SELECT
  id,
  report_id,
  citation_id,
  action,
  editor,
  timestamp,
  metadata->>'requestId' as request_id
FROM evidence_ledger
WHERE timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 1000;

COMMENT ON VIEW v_recent_evidence_modifications IS 'Recent evidence/citation modifications for audit monitoring (last 7 days)';

-- View: Evidence modification counts by report
CREATE OR REPLACE VIEW v_evidence_modifications_by_report AS
SELECT
  report_id,
  COUNT(*) as total_modifications,
  COUNT(*) FILTER (WHERE action = 'ADDED') as added_count,
  COUNT(*) FILTER (WHERE action = 'MODIFIED') as modified_count,
  COUNT(*) FILTER (WHERE action = 'REMOVED') as removed_count,
  MIN(timestamp) as first_modification,
  MAX(timestamp) as last_modification
FROM evidence_ledger
GROUP BY report_id;

COMMENT ON VIEW v_evidence_modifications_by_report IS 'Aggregated evidence modification statistics per report';

-- =====================================================
-- Grant permissions (adjust roles as needed)
-- =====================================================

-- Grant read/insert to reporting service (no update/delete allowed)
-- GRANT SELECT, INSERT ON evidence_ledger TO teei_reporting_service;

-- Grant read-only access to audit/compliance team
-- GRANT SELECT ON evidence_ledger TO teei_audit_service;
-- GRANT SELECT ON v_recent_evidence_modifications TO teei_audit_service;
-- GRANT SELECT ON v_evidence_modifications_by_report TO teei_audit_service;

-- =====================================================
-- Migration complete
-- =====================================================
