-- Real-Time Collaboration Schema for TEEI CSR Platform
--
-- Tables for document snapshots, operations, comments, suggestions,
-- sessions, and audit logs for collaborative editing.

-- Document snapshots (base state + version)
CREATE TABLE IF NOT EXISTS collab_snapshots (
  doc_id VARCHAR(255) PRIMARY KEY,  -- Format: "reportId:sectionKey"
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  attributes JSONB DEFAULT '{}'::jsonb,  -- Position-based attributes
  clock BIGINT NOT NULL DEFAULT 0,       -- Lamport clock
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,

  -- Indexes
  CONSTRAINT version_positive CHECK (version > 0),
  CONSTRAINT clock_non_negative CHECK (clock >= 0)
);

CREATE INDEX idx_snapshots_updated ON collab_snapshots(updated_at);
CREATE INDEX idx_snapshots_published ON collab_snapshots(is_published);

-- Operation log (incremental changes)
CREATE TABLE IF NOT EXISTS collab_operations (
  id VARCHAR(36) PRIMARY KEY,  -- UUID
  doc_id VARCHAR(255) NOT NULL REFERENCES collab_snapshots(doc_id) ON DELETE CASCADE,
  operation JSONB NOT NULL,    -- Full operation object
  user_id VARCHAR(255) NOT NULL,
  clock BIGINT NOT NULL,
  transformed_from TEXT[],     -- IDs of ops this was transformed against
  is_tombstone BOOLEAN NOT NULL DEFAULT FALSE,  -- Marked for GC
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT clock_non_negative_op CHECK (clock >= 0)
);

CREATE INDEX idx_operations_doc ON collab_operations(doc_id, created_at);
CREATE INDEX idx_operations_clock ON collab_operations(doc_id, clock);
CREATE INDEX idx_operations_tombstone ON collab_operations(is_tombstone) WHERE is_tombstone = TRUE;
CREATE INDEX idx_operations_user ON collab_operations(user_id);

-- Comments (threaded, text-anchored)
CREATE TABLE IF NOT EXISTS collab_comments (
  id VARCHAR(36) PRIMARY KEY,  -- UUID
  doc_id VARCHAR(255) NOT NULL REFERENCES collab_snapshots(doc_id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  anchor_start INTEGER NOT NULL,   -- Text selection start
  anchor_end INTEGER NOT NULL,     -- Text selection end
  parent_id VARCHAR(36) REFERENCES collab_comments(id) ON DELETE CASCADE,  -- For threading
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),

  -- Indexes
  CONSTRAINT anchor_valid CHECK (anchor_start >= 0 AND anchor_end >= anchor_start)
);

CREATE INDEX idx_comments_doc ON collab_comments(doc_id, created_at);
CREATE INDEX idx_comments_parent ON collab_comments(parent_id);
CREATE INDEX idx_comments_resolved ON collab_comments(resolved_at) WHERE resolved_at IS NULL;

-- Suggestions (track changes)
CREATE TABLE IF NOT EXISTS collab_suggestions (
  id VARCHAR(36) PRIMARY KEY,  -- UUID
  doc_id VARCHAR(255) NOT NULL REFERENCES collab_snapshots(doc_id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  operation JSONB NOT NULL,    -- Proposed operation
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(255),

  -- Constraints
  CONSTRAINT status_valid CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX idx_suggestions_doc ON collab_suggestions(doc_id, status);
CREATE INDEX idx_suggestions_user ON collab_suggestions(user_id);
CREATE INDEX idx_suggestions_status ON collab_suggestions(status);

-- Collaboration sessions (active users)
CREATE TABLE IF NOT EXISTS collab_sessions (
  id VARCHAR(36) PRIMARY KEY,  -- UUID
  doc_id VARCHAR(255) NOT NULL REFERENCES collab_snapshots(doc_id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,   -- owner | editor | commenter | viewer
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  transport VARCHAR(20) NOT NULL,  -- websocket | sse | rest
  connection_id VARCHAR(255),      -- WS/SSE connection identifier

  -- Constraints
  CONSTRAINT role_valid CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')),
  CONSTRAINT transport_valid CHECK (transport IN ('websocket', 'sse', 'rest'))
);

CREATE INDEX idx_sessions_doc ON collab_sessions(doc_id, last_activity);
CREATE INDEX idx_sessions_user ON collab_sessions(user_id);
CREATE INDEX idx_sessions_connection ON collab_sessions(connection_id);

-- Audit log (all collaboration actions)
CREATE TABLE IF NOT EXISTS collab_audit_log (
  id BIGSERIAL PRIMARY KEY,
  doc_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,  -- join | leave | operation | comment | suggestion | publish
  metadata JSONB,               -- Action-specific details (no PII)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Indexes (for compliance queries)
  CONSTRAINT action_valid CHECK (action IN ('join', 'leave', 'operation', 'comment', 'suggestion', 'publish', 'accept_suggestion', 'reject_suggestion'))
);

CREATE INDEX idx_audit_doc ON collab_audit_log(doc_id, created_at);
CREATE INDEX idx_audit_user ON collab_audit_log(user_id, created_at);
CREATE INDEX idx_audit_action ON collab_audit_log(action);

-- User presence (ephemeral, can be Redis in production)
CREATE TABLE IF NOT EXISTS collab_presence (
  user_id VARCHAR(255) NOT NULL,
  doc_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(7) NOT NULL,  -- Hex color
  cursor_start INTEGER,
  cursor_end INTEGER,
  is_typing BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, doc_id)
);

CREATE INDEX idx_presence_doc ON collab_presence(doc_id, last_seen);

-- Cleanup old presence (> 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM collab_presence
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Snapshot compaction metadata
CREATE TABLE IF NOT EXISTS collab_compaction_log (
  doc_id VARCHAR(255) PRIMARY KEY REFERENCES collab_snapshots(doc_id) ON DELETE CASCADE,
  last_compaction TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ops_before INTEGER NOT NULL,
  ops_after INTEGER NOT NULL,
  tombstones_removed INTEGER NOT NULL DEFAULT 0
);

-- Helper function: Get document with ops since snapshot
CREATE OR REPLACE FUNCTION get_document_state(p_doc_id VARCHAR, p_since_clock BIGINT DEFAULT 0)
RETURNS TABLE (
  content TEXT,
  version INTEGER,
  clock BIGINT,
  operations JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.content,
    s.version,
    s.clock,
    COALESCE(
      jsonb_agg(
        o.operation ORDER BY o.clock
      ) FILTER (WHERE o.clock > p_since_clock),
      '[]'::jsonb
    ) AS operations
  FROM collab_snapshots s
  LEFT JOIN collab_operations o ON s.doc_id = o.doc_id
  WHERE s.doc_id = p_doc_id
    AND o.is_tombstone = FALSE
  GROUP BY s.doc_id, s.content, s.version, s.clock;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Count active users on document
CREATE OR REPLACE FUNCTION count_active_users(p_doc_id VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id)
    FROM collab_sessions
    WHERE doc_id = p_doc_id
      AND last_activity > NOW() - INTERVAL '5 minutes'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update snapshot updated_at on operation
CREATE OR REPLACE FUNCTION update_snapshot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collab_snapshots
  SET updated_at = NEW.created_at
  WHERE doc_id = NEW.doc_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_snapshot
AFTER INSERT ON collab_operations
FOR EACH ROW
EXECUTE FUNCTION update_snapshot_timestamp();

-- Comments: Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON collab_snapshots TO reporting_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON collab_operations TO reporting_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON collab_comments TO reporting_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON collab_suggestions TO reporting_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON collab_sessions TO reporting_service;
GRANT SELECT, INSERT ON collab_audit_log TO reporting_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON collab_presence TO reporting_service;
GRANT SELECT, INSERT, UPDATE ON collab_compaction_log TO reporting_service;
GRANT USAGE ON SEQUENCE collab_audit_log_id_seq TO reporting_service;
