/**
 * Audit Query Builder
 *
 * Builds optimized SQL queries for the Audit Log Explorer.
 * Performance target: p95 ≤250ms for queries over 30-day ranges.
 */

import type { Pool } from 'pg';
import type {
  AuditEvent,
  AuditEventFilters,
  AuditEventQueryResult,
  AuditTimelineBucket,
  AuditStats,
} from '@teei/shared-types';

/**
 * Query builder for audit events
 */
export class AuditQueryBuilder {
  constructor(private db: Pool) {}

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(filters: AuditEventFilters): {
    where: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Tenant isolation (CRITICAL for security)
    if (filters.tenantId) {
      conditions.push(`company_id = $${paramIndex++}`);
      params.push(filters.tenantId);
    }

    // Time range
    if (filters.from) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.from);
    }

    if (filters.to) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.to);
    }

    // Actor filters
    if (filters.actorId) {
      conditions.push(`actor_id = $${paramIndex++}`);
      params.push(filters.actorId);
    }

    if (filters.actorEmail) {
      conditions.push(`actor_email ILIKE $${paramIndex++}`);
      params.push(`%${filters.actorEmail}%`);
    }

    // Resource filters
    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      params.push(filters.resourceType);
    }

    if (filters.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      params.push(filters.resourceId);
    }

    // Action filters
    if (filters.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }

    if (filters.actionCategory) {
      conditions.push(`action_category = $${paramIndex++}`);
      params.push(filters.actionCategory);
    }

    // Full-text search in metadata
    if (filters.search) {
      conditions.push(
        `(
          metadata::text ILIKE $${paramIndex} OR
          resource_identifier ILIKE $${paramIndex} OR
          actor_email ILIKE $${paramIndex}
        )`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { where, params };
  }

  /**
   * Query audit events with filters and pagination
   */
  async queryEvents(filters: AuditEventFilters): Promise<AuditEventQueryResult> {
    const limit = Math.min(filters.limit || 100, 1000); // Max 1000 results per query
    const offset = filters.offset || 0;

    const { where, params } = this.buildWhereClause(filters);

    // Count total matching events
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${where}`;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Fetch paginated events
    const dataQuery = `
      SELECT
        id,
        company_id as "tenantId",
        actor_id as "actorId",
        actor_email as "actorEmail",
        actor_role as "actorRole",
        actor_ip as "actorIp",
        action,
        action_category as "actionCategory",
        resource_type as "resourceType",
        resource_id as "resourceId",
        resource_identifier as "resourceIdentifier",
        before_state as "beforeState",
        after_state as "afterState",
        request_id as "requestId",
        user_agent as "userAgent",
        endpoint,
        metadata,
        gdpr_basis as "gdprBasis",
        retention_until as "retentionUntil",
        timestamp
      FROM audit_logs
      ${where}
      ORDER BY timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await this.db.query(dataQuery, [...params, limit, offset]);

    const events: AuditEvent[] = dataResult.rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      tenantId: row.tenantId,
      actor: {
        id: row.actorId,
        email: row.actorEmail,
        role: row.actorRole,
      },
      resource: {
        type: row.resourceType,
        id: row.resourceId,
        identifier: row.resourceIdentifier,
      },
      action: row.action,
      actionCategory: row.actionCategory,
      before: row.beforeState,
      after: row.afterState,
      origin: {
        ip: row.actorIp,
        userAgent: row.userAgent,
        endpoint: row.endpoint,
        requestId: row.requestId,
      },
      metadata: row.metadata,
      gdprBasis: row.gdprBasis,
      retentionUntil: row.retentionUntil,
    }));

    return {
      events,
      total,
      hasMore: offset + events.length < total,
      nextOffset: offset + events.length < total ? offset + limit : undefined,
    };
  }

  /**
   * Get a single audit event by ID
   */
  async getEventById(eventId: string, tenantId?: string): Promise<AuditEvent | null> {
    let query = `
      SELECT
        id,
        company_id as "tenantId",
        actor_id as "actorId",
        actor_email as "actorEmail",
        actor_role as "actorRole",
        actor_ip as "actorIp",
        action,
        action_category as "actionCategory",
        resource_type as "resourceType",
        resource_id as "resourceId",
        resource_identifier as "resourceIdentifier",
        before_state as "beforeState",
        after_state as "afterState",
        request_id as "requestId",
        user_agent as "userAgent",
        endpoint,
        metadata,
        gdpr_basis as "gdprBasis",
        retention_until as "retentionUntil",
        timestamp
      FROM audit_logs
      WHERE id = $1
    `;

    const params: any[] = [eventId];

    // Enforce tenant isolation if tenantId provided
    if (tenantId) {
      query += ` AND company_id = $2`;
      params.push(tenantId);
    }

    const result = await this.db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      timestamp: row.timestamp,
      tenantId: row.tenantId,
      actor: {
        id: row.actorId,
        email: row.actorEmail,
        role: row.actorRole,
      },
      resource: {
        type: row.resourceType,
        id: row.resourceId,
        identifier: row.resourceIdentifier,
      },
      action: row.action,
      actionCategory: row.actionCategory,
      before: row.beforeState,
      after: row.afterState,
      origin: {
        ip: row.actorIp,
        userAgent: row.userAgent,
        endpoint: row.endpoint,
        requestId: row.requestId,
      },
      metadata: row.metadata,
      gdprBasis: row.gdprBasis,
      retentionUntil: row.retentionUntil,
    };
  }

  /**
   * Generate timeline aggregation (heatmap data)
   */
  async getTimeline(
    filters: AuditEventFilters,
    bucketSize: 'hour' | 'day' | 'week' = 'day'
  ): Promise<AuditTimelineBucket[]> {
    const { where, params } = this.buildWhereClause(filters);

    // Determine time bucket truncation
    const truncation = bucketSize === 'hour' ? 'hour' : bucketSize === 'week' ? 'week' : 'day';

    const query = `
      SELECT
        date_trunc('${truncation}', timestamp) as bucket,
        COUNT(*) as count,
        jsonb_object_agg(action, action_count) as action_counts
      FROM (
        SELECT
          timestamp,
          action,
          COUNT(*) OVER (PARTITION BY date_trunc('${truncation}', timestamp), action) as action_count
        FROM audit_logs
        ${where}
      ) sub
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const result = await this.db.query(query, params);

    return result.rows.map((row) => ({
      timestamp: row.bucket,
      count: parseInt(row.count, 10),
      actionCounts: row.action_counts || {},
    }));
  }

  /**
   * Get audit statistics for a given filter
   */
  async getStats(filters: AuditEventFilters): Promise<AuditStats> {
    const { where, params } = this.buildWhereClause(filters);

    // Get overall counts and aggregations
    const statsQuery = `
      SELECT
        COUNT(*) as total_events,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        jsonb_object_agg(action_category, category_count) FILTER (WHERE action_category IS NOT NULL) as by_category,
        jsonb_object_agg(action, action_count) FILTER (WHERE action IS NOT NULL) as by_action,
        jsonb_object_agg(resource_type, resource_count) FILTER (WHERE resource_type IS NOT NULL) as by_resource
      FROM (
        SELECT
          timestamp,
          action_category,
          COUNT(*) OVER (PARTITION BY action_category) as category_count,
          action,
          COUNT(*) OVER (PARTITION BY action) as action_count,
          resource_type,
          COUNT(*) OVER (PARTITION BY resource_type) as resource_count
        FROM audit_logs
        ${where}
      ) sub
    `;

    const statsResult = await this.db.query(statsQuery, params);
    const stats = statsResult.rows[0] || {};

    // Get top actors
    const topActorsQuery = `
      SELECT
        actor_id as "actorId",
        actor_email as "actorEmail",
        COUNT(*) as count
      FROM audit_logs
      ${where}
      GROUP BY actor_id, actor_email
      ORDER BY count DESC
      LIMIT 10
    `;

    const actorsResult = await this.db.query(topActorsQuery, params);

    return {
      totalEvents: parseInt(stats.total_events || '0', 10),
      eventsByCategory: stats.by_category || {},
      eventsByAction: stats.by_action || {},
      eventsByResourceType: stats.by_resource || {},
      topActors: actorsResult.rows.map((row) => ({
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        count: parseInt(row.count, 10),
      })),
      dateRange: {
        from: stats.earliest || new Date(),
        to: stats.latest || new Date(),
      },
    };
  }

  /**
   * Stream audit events (for large exports)
   * Returns an async generator for memory-efficient processing
   */
  async *streamEvents(
    filters: AuditEventFilters,
    batchSize = 1000
  ): AsyncGenerator<AuditEvent[], void, unknown> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.queryEvents({
        ...filters,
        limit: batchSize,
        offset,
      });

      if (result.events.length > 0) {
        yield result.events;
      }

      hasMore = result.hasMore;
      offset = result.nextOffset || offset + batchSize;

      // Safety break
      if (offset > 1000000) {
        throw new Error('Stream limit exceeded: cannot export more than 1M events at once');
      }
    }
  }
}
