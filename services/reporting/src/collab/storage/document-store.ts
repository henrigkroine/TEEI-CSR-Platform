/**
 * Document Storage Layer for Real-Time Collaboration
 *
 * Manages persistence of document snapshots, operations, and metadata
 * using PostgreSQL. Provides optimized queries for common operations.
 */

import type { Pool, PoolClient } from 'pg';
import type {
  DocumentId,
  DocumentSnapshot,
  Operation,
  OperationLog,
  Comment,
  Suggestion,
  CollabSession,
  AuditLog,
  UserPresence,
  CollabRole
} from '@teei/shared-types';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('collab-store');

export class DocumentStore {
  constructor(private pool: Pool) {}

  /**
   * Create or get document snapshot
   */
  async getOrCreateSnapshot(
    docId: DocumentId,
    userId: string,
    initialContent: string = ''
  ): Promise<DocumentSnapshot> {
    const result = await this.pool.query<{
      doc_id: string;
      version: number;
      content: string;
      attributes: any;
      clock: string;
      created_at: Date;
      created_by: string;
      is_published: boolean;
    }>(
      `INSERT INTO collab_snapshots (doc_id, content, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (doc_id) DO UPDATE SET doc_id = EXCLUDED.doc_id
       RETURNING *`,
      [docId, initialContent, userId]
    );

    const row = result.rows[0];
    return {
      docId: row.doc_id,
      version: row.version,
      content: row.content,
      attributes: row.attributes || {},
      clock: parseInt(row.clock, 10),
      createdAt: row.created_at,
      createdBy: row.created_by,
      isPublished: row.is_published
    };
  }

  /**
   * Get snapshot with operations since a given clock
   */
  async getDocumentState(
    docId: DocumentId,
    sinceClock: number = 0
  ): Promise<{ snapshot: DocumentSnapshot; operations: Operation[] }> {
    const result = await this.pool.query<{
      content: string;
      version: number;
      clock: string;
      operations: any;
      attributes: any;
      created_at: Date;
      created_by: string;
      is_published: boolean;
    }>(
      `SELECT
        s.content,
        s.version,
        s.clock,
        s.attributes,
        s.created_at,
        s.created_by,
        s.is_published,
        COALESCE(
          jsonb_agg(
            o.operation ORDER BY o.clock
          ) FILTER (WHERE o.clock > $2 AND o.is_tombstone = FALSE),
          '[]'::jsonb
        ) AS operations
      FROM collab_snapshots s
      LEFT JOIN collab_operations o ON s.doc_id = o.doc_id
      WHERE s.doc_id = $1
      GROUP BY s.doc_id, s.content, s.version, s.clock, s.attributes, s.created_at, s.created_by, s.is_published`,
      [docId, sinceClock]
    );

    if (result.rows.length === 0) {
      throw new Error(`Document not found: ${docId}`);
    }

    const row = result.rows[0];
    const snapshot: DocumentSnapshot = {
      docId,
      version: row.version,
      content: row.content,
      attributes: row.attributes || {},
      clock: parseInt(row.clock, 10),
      createdAt: row.created_at,
      createdBy: row.created_by,
      isPublished: row.is_published
    };

    const operations: Operation[] = Array.isArray(row.operations)
      ? row.operations
      : [];

    return { snapshot, operations };
  }

  /**
   * Append operation to log
   */
  async appendOperation(
    op: Operation,
    transformedFrom: string[] = []
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO collab_operations (id, doc_id, operation, user_id, clock, transformed_from)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        op.id,
        op.docId,
        JSON.stringify(op),
        op.userId,
        op.clock,
        transformedFrom
      ]
    );

    logger.info({
      opId: op.id,
      docId: op.docId,
      type: op.type,
      clock: op.clock
    }, 'Operation appended');
  }

  /**
   * Batch append operations (for flush)
   */
  async appendOperations(ops: Operation[]): Promise<void> {
    if (ops.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const op of ops) {
        await client.query(
          `INSERT INTO collab_operations (id, doc_id, operation, user_id, clock, transformed_from)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [op.id, op.docId, JSON.stringify(op), op.userId, op.clock, []]
        );
      }

      await client.query('COMMIT');
      logger.info({ count: ops.length }, 'Operations batch appended');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get operations in range
   */
  async getOperations(
    docId: DocumentId,
    fromClock: number,
    toClock?: number
  ): Promise<Operation[]> {
    const query = toClock
      ? `SELECT operation FROM collab_operations
         WHERE doc_id = $1 AND clock >= $2 AND clock <= $3 AND is_tombstone = FALSE
         ORDER BY clock`
      : `SELECT operation FROM collab_operations
         WHERE doc_id = $1 AND clock >= $2 AND is_tombstone = FALSE
         ORDER BY clock`;

    const params = toClock ? [docId, fromClock, toClock] : [docId, fromClock];
    const result = await this.pool.query<{ operation: Operation }>(query, params);

    return result.rows.map(row => row.operation);
  }

  /**
   * Update snapshot (after compaction)
   */
  async updateSnapshot(
    docId: DocumentId,
    content: string,
    attributes: any,
    clock: number
  ): Promise<void> {
    await this.pool.query(
      `UPDATE collab_snapshots
       SET content = $2, attributes = $3, clock = $4, updated_at = NOW()
       WHERE doc_id = $1`,
      [docId, content, JSON.stringify(attributes), clock]
    );

    logger.info({ docId, clock }, 'Snapshot updated');
  }

  /**
   * Mark operations as tombstones (for GC)
   */
  async markTombstones(opIds: string[]): Promise<void> {
    if (opIds.length === 0) return;

    await this.pool.query(
      `UPDATE collab_operations SET is_tombstone = TRUE WHERE id = ANY($1)`,
      [opIds]
    );

    logger.info({ count: opIds.length }, 'Operations marked as tombstones');
  }

  /**
   * Delete tombstoned operations (GC)
   */
  async garbageCollect(docId: DocumentId, olderThan: Date): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM collab_operations
       WHERE doc_id = $1 AND is_tombstone = TRUE AND created_at < $2`,
      [docId, olderThan]
    );

    const count = result.rowCount || 0;
    logger.info({ docId, count }, 'Garbage collected tombstones');
    return count;
  }

  /**
   * Log compaction metadata
   */
  async logCompaction(
    docId: DocumentId,
    opsBefore: number,
    opsAfter: number,
    tombstonesRemoved: number
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO collab_compaction_log (doc_id, ops_before, ops_after, tombstones_removed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (doc_id) DO UPDATE
       SET last_compaction = NOW(), ops_before = $2, ops_after = $3, tombstones_removed = $4`,
      [docId, opsBefore, opsAfter, tombstonesRemoved]
    );
  }

  /**
   * Comments CRUD
   */
  async addComment(comment: Comment): Promise<void> {
    await this.pool.query(
      `INSERT INTO collab_comments (id, doc_id, user_id, user_name, content, anchor_start, anchor_end, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        comment.id,
        comment.docId,
        comment.userId,
        comment.userName,
        comment.content,
        comment.anchor.start,
        comment.anchor.end,
        comment.parentId || null
      ]
    );
  }

  async getComments(docId: DocumentId): Promise<Comment[]> {
    const result = await this.pool.query<{
      id: string;
      user_id: string;
      user_name: string;
      content: string;
      anchor_start: number;
      anchor_end: number;
      parent_id: string | null;
      created_at: Date;
      updated_at: Date | null;
      resolved_at: Date | null;
      resolved_by: string | null;
    }>(
      `SELECT * FROM collab_comments WHERE doc_id = $1 ORDER BY created_at`,
      [docId]
    );

    return result.rows.map(row => ({
      id: row.id,
      docId,
      userId: row.user_id,
      userName: row.user_name,
      content: row.content,
      anchor: {
        start: row.anchor_start,
        end: row.anchor_end,
        isCollapsed: row.anchor_start === row.anchor_end
      },
      parentId: row.parent_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
      resolvedAt: row.resolved_at || undefined,
      resolvedBy: row.resolved_by || undefined
    }));
  }

  async resolveComment(commentId: string, userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE collab_comments SET resolved_at = NOW(), resolved_by = $2 WHERE id = $1`,
      [commentId, userId]
    );
  }

  /**
   * Suggestions CRUD
   */
  async addSuggestion(suggestion: Suggestion): Promise<void> {
    await this.pool.query(
      `INSERT INTO collab_suggestions (id, doc_id, user_id, user_name, operation, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        suggestion.id,
        suggestion.docId,
        suggestion.userId,
        suggestion.userName,
        JSON.stringify(suggestion.operation),
        suggestion.status
      ]
    );
  }

  async getSuggestions(docId: DocumentId, status?: string): Promise<Suggestion[]> {
    const query = status
      ? `SELECT * FROM collab_suggestions WHERE doc_id = $1 AND status = $2 ORDER BY created_at`
      : `SELECT * FROM collab_suggestions WHERE doc_id = $1 ORDER BY created_at`;

    const params = status ? [docId, status] : [docId];
    const result = await this.pool.query<any>(query, params);

    return result.rows.map(row => ({
      id: row.id,
      docId: row.doc_id,
      userId: row.user_id,
      userName: row.user_name,
      operation: row.operation,
      status: row.status,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at || undefined,
      reviewedBy: row.reviewed_by || undefined
    }));
  }

  async updateSuggestionStatus(
    suggestionId: string,
    status: string,
    reviewedBy: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE collab_suggestions
       SET status = $2, reviewed_at = NOW(), reviewed_by = $3
       WHERE id = $1`,
      [suggestionId, status, reviewedBy]
    );
  }

  /**
   * Session management
   */
  async createSession(session: CollabSession): Promise<void> {
    await this.pool.query(
      `INSERT INTO collab_sessions (id, doc_id, user_id, role, transport, connection_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session.id,
        session.docId,
        session.userId,
        session.role,
        session.transport,
        session.connectionId
      ]
    );
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE collab_sessions SET last_activity = NOW() WHERE id = $1`,
      [sessionId]
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.pool.query(`DELETE FROM collab_sessions WHERE id = $1`, [sessionId]);
  }

  async getActiveSessions(docId: DocumentId): Promise<CollabSession[]> {
    const result = await this.pool.query<any>(
      `SELECT * FROM collab_sessions
       WHERE doc_id = $1 AND last_activity > NOW() - INTERVAL '5 minutes'`,
      [docId]
    );

    return result.rows.map(row => ({
      id: row.id,
      docId: row.doc_id,
      userId: row.user_id,
      role: row.role,
      connectedAt: row.connected_at,
      lastActivity: row.last_activity,
      transport: row.transport,
      connectionId: row.connection_id
    }));
  }

  /**
   * Presence management
   */
  async upsertPresence(presence: UserPresence): Promise<void> {
    await this.pool.query(
      `INSERT INTO collab_presence (user_id, doc_id, user_name, user_email, avatar_color, cursor_start, cursor_end, is_typing)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, doc_id) DO UPDATE
       SET cursor_start = $6, cursor_end = $7, is_typing = $8, last_seen = NOW()`,
      [
        presence.userId,
        '',  // docId will be derived from context
        presence.userName,
        presence.userEmail,
        presence.avatarColor,
        presence.cursor?.start || null,
        presence.cursor?.end || null,
        presence.isTyping
      ]
    );
  }

  async getPresence(docId: DocumentId): Promise<UserPresence[]> {
    const result = await this.pool.query<any>(
      `SELECT * FROM collab_presence WHERE doc_id = $1 AND last_seen > NOW() - INTERVAL '30 seconds'`,
      [docId]
    );

    return result.rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      avatarColor: row.avatar_color,
      cursor: row.cursor_start !== null ? {
        start: row.cursor_start,
        end: row.cursor_end,
        isCollapsed: row.cursor_start === row.cursor_end
      } : undefined,
      isTyping: row.is_typing,
      lastSeen: new Date(row.last_seen).getTime()
    }));
  }

  /**
   * Audit logging
   */
  async auditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    await this.pool.query(
      `INSERT INTO collab_audit_log (doc_id, user_id, action, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        log.docId,
        log.userId,
        log.action,
        JSON.stringify(log.metadata),
        log.ipAddress,
        log.userAgent
      ]
    );
  }
}
