/**
 * Audit Logging Middleware
 * Writes tamper-proof audit events to audit_logs table and publishes to NATS
 */

import { FastifyRequest } from 'fastify';
import { Pool } from 'pg';
import { getEventBus } from '@teei/shared-utils';

// Database connection (should be initialized at startup)
let dbPool: Pool | null = null;

export function initAuditLog(pool: Pool): void {
  dbPool = pool;
}

/**
 * Audit event structure
 */
export interface AuditEvent {
  companyId: string;
  userId?: string;
  apiKeyId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  durationMs?: number;
  request?: FastifyRequest;
}

/**
 * Audit log action types
 */
export enum AuditAction {
  // Authentication
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  API_KEY_AUTH = 'API_KEY_AUTH',
  AUTH_FAILED = 'AUTH_FAILED',

  // Authorization
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHECK_FAILED = 'ROLE_CHECK_FAILED',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_INVITED = 'USER_INVITED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_REACTIVATED = 'USER_REACTIVATED',

  // API Key Management
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  API_KEY_REGENERATED = 'API_KEY_REGENERATED',

  // Data Operations
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  DATA_DELETE = 'DATA_DELETE',

  // GDPR/Privacy
  DSAR_EXPORT_REQUESTED = 'DSAR_EXPORT_REQUESTED',
  DSAR_DELETE_REQUESTED = 'DSAR_DELETE_REQUESTED',
  DSAR_EXPORT_COMPLETED = 'DSAR_EXPORT_COMPLETED',
  DSAR_DELETE_COMPLETED = 'DSAR_DELETE_COMPLETED',
  DSAR_REQUEST_CANCELLED = 'DSAR_REQUEST_CANCELLED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_WITHDRAWN = 'CONSENT_WITHDRAWN',

  // Reports
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_EXPORTED = 'REPORT_EXPORTED',
  REPORT_SHARED = 'REPORT_SHARED',

  // System
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

/**
 * Write audit log to database and emit to NATS
 */
export async function auditLog(event: AuditEvent): Promise<void> {
  if (!dbPool) {
    console.error('[AuditLog] Database pool not initialized. Call initAuditLog() first.');
    return;
  }

  try {
    // Extract request metadata
    const ipAddress = event.request?.ip || null;
    const userAgent = event.request?.headers['user-agent'] || null;
    const requestMethod = event.request?.method || null;
    const requestPath = event.request?.url || null;
    const requestId = (event.request?.headers['x-request-id'] as string) || null;

    // Insert into audit_logs table
    await dbPool.query(
      `INSERT INTO audit_logs (
        company_id, user_id, api_key_id, action, resource_type, resource_id,
        ip_address, user_agent, request_method, request_path, request_id,
        success, error_code, error_message, metadata, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        event.companyId,
        event.userId || null,
        event.apiKeyId || null,
        event.action,
        event.resourceType,
        event.resourceId || null,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath,
        requestId,
        event.success,
        event.errorCode || null,
        event.errorMessage || null,
        JSON.stringify(event.metadata || {}),
        event.durationMs || null
      ]
    );

    // Emit to NATS for real-time monitoring
    try {
      const eventBus = getEventBus();
      await eventBus.publish('audit.log.created', {
        companyId: event.companyId,
        userId: event.userId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        success: event.success,
        timestamp: new Date().toISOString(),
        metadata: event.metadata
      });
    } catch (natsError) {
      // Log NATS error but don't fail the audit
      console.error('[AuditLog] Failed to publish to NATS:', natsError);
    }
  } catch (error) {
    console.error('[AuditLog] Failed to write audit log:', error);
    // Don't throw - audit failures should not block requests
  }
}

/**
 * Audit log decorator for route handlers
 * Automatically logs request start/end with duration
 */
export function auditRoute(action: string, resourceType: string) {
  return async (request: FastifyRequest, _reply: any, done: Function) => {
    const startTime = Date.now();
    const companyId = (request as any).tenant?.companyId;
    const userId = (request as any).user?.userId;

    // Wait for route handler to complete
    request.server.addHook('onResponse', async (req, reply) => {
      if (req.id !== request.id) return; // Only process this request

      const durationMs = Date.now() - startTime;
      const success = reply.statusCode < 400;

      await auditLog({
        companyId: companyId || 'unknown',
        userId,
        action,
        resourceType,
        success,
        durationMs,
        request
      });
    });

    done();
  };
}

/**
 * Middleware to audit failed access attempts
 */
export async function auditFailedAccess(
  request: FastifyRequest,
  action: string,
  reason: string
): Promise<void> {
  const companyId = (request as any).tenant?.companyId || (request.params as any).companyId || 'unknown';
  const userId = (request as any).user?.userId;

  await auditLog({
    companyId,
    userId,
    action,
    resourceType: 'access',
    success: false,
    errorMessage: reason,
    request
  });
}

/**
 * Get audit logs for a company (for admin view)
 */
export async function getAuditLogs(
  companyId: string,
  options: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    onlyFailed?: boolean;
  } = {}
): Promise<any[]> {
  if (!dbPool) {
    throw new Error('Database pool not initialized');
  }

  const conditions: string[] = ['company_id = $1'];
  const params: any[] = [companyId];
  let paramIndex = 2;

  if (options.userId) {
    conditions.push(`user_id = $${paramIndex}`);
    params.push(options.userId);
    paramIndex++;
  }

  if (options.action) {
    conditions.push(`action = $${paramIndex}`);
    params.push(options.action);
    paramIndex++;
  }

  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(options.startDate);
    paramIndex++;
  }

  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(options.endDate);
    paramIndex++;
  }

  if (options.onlyFailed) {
    conditions.push('success = false');
  }

  const query = `
    SELECT
      id, company_id, user_id, action, resource_type, resource_id,
      ip_address, request_method, request_path, success, error_message,
      duration_ms, created_at
    FROM audit_logs
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(options.limit || 100);
  params.push(options.offset || 0);

  const result = await dbPool.query(query, params);
  return result.rows;
}

/**
 * Get failed access attempts (security monitoring)
 */
export async function getFailedAccessAttempts(
  companyId: string,
  hoursBack: number = 24
): Promise<any[]> {
  if (!dbPool) {
    throw new Error('Database pool not initialized');
  }

  const result = await dbPool.query(
    `SELECT
      id, user_id, action, resource_type, ip_address, error_message, created_at
    FROM audit_logs
    WHERE company_id = $1
      AND success = false
      AND created_at > NOW() - INTERVAL '${hoursBack} hours'
    ORDER BY created_at DESC
    LIMIT 100`,
    [companyId]
  );

  return result.rows;
}
