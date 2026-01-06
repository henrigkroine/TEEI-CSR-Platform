/**
 * Audit Logger SDK
 *
 * Centralized audit logging for compliance, security monitoring, and forensic investigation.
 * Implements GDPR Article 30 record-keeping requirements.
 *
 * Usage:
 * ```typescript
 * const auditLogger = new AuditLogger(db);
 * await auditLogger.log({
 *   actorId: user.id,
 *   actorEmail: user.email,
 *   action: 'UPDATE',
 *   resourceType: 'users',
 *   resourceId: user.id,
 *   beforeState: oldData,
 *   afterState: newData,
 * });
 * ```
 */

import { sql } from 'drizzle-orm';
import { auditLogs } from '@teei/shared-schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Audit Action Categories
 */
export enum AuditActionCategory {
  AUTH = 'AUTH',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  PRIVACY = 'PRIVACY',
  ADMIN = 'ADMIN',
  SECURITY = 'SECURITY',
}

/**
 * Common Audit Actions
 */
export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',

  // Data operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  BULK_DELETE = 'BULK_DELETE',

  // Privacy operations
  EXPORT_DATA = 'EXPORT_DATA',
  REQUEST_DELETION = 'REQUEST_DELETION',
  CONFIRM_DELETION = 'CONFIRM_DELETION',
  CONSENT_GIVEN = 'CONSENT_GIVEN',
  CONSENT_WITHDRAWN = 'CONSENT_WITHDRAWN',

  // Administrative
  ROLE_CHANGE = 'ROLE_CHANGE',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',

  // Security
  ACCESS_DENIED = 'ACCESS_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  KEY_ROTATION = 'KEY_ROTATION',
}

/**
 * GDPR Legal Bases
 */
export enum GdprBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTEREST = 'legitimate_interest',
}

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  // Tenant
  companyId?: string;

  // Actor
  actorId: string;
  actorEmail: string;
  actorRole: string;
  actorIp?: string;

  // Action
  action: string;
  actionCategory: AuditActionCategory;

  // Resource
  resourceType: string;
  resourceId?: string;
  resourceIdentifier?: string;

  // State
  beforeState?: any;
  afterState?: any;

  // Context
  requestId?: string;
  userAgent?: string;
  endpoint?: string;

  // Metadata
  metadata?: Record<string, any>;

  // Compliance
  gdprBasis?: GdprBasis;
  retentionUntil?: Date;
}

/**
 * Audit Logger
 */
export class AuditLogger {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        companyId: entry.companyId,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        actorRole: entry.actorRole,
        actorIp: entry.actorIp,
        action: entry.action,
        actionCategory: entry.actionCategory,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        resourceIdentifier: entry.resourceIdentifier,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
        requestId: entry.requestId,
        userAgent: entry.userAgent,
        endpoint: entry.endpoint,
        metadata: entry.metadata,
        gdprBasis: entry.gdprBasis,
        retentionUntil: entry.retentionUntil,
        timestamp: new Date(),
      });
    } catch (error) {
      // Never fail the main operation due to audit logging failure
      // Log to stderr for monitoring
      console.error('Failed to write audit log:', error);
      console.error('Audit entry:', JSON.stringify(entry));
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(params: {
    actorId: string;
    actorEmail: string;
    action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.LOGIN_FAILED;
    actorIp?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      actorRole: 'user',
      actionCategory: AuditActionCategory.AUTH,
      resourceType: 'authentication',
      resourceId: params.actorId,
      gdprBasis: GdprBasis.LEGITIMATE_INTEREST,
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(params: {
    companyId?: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    resourceType: string;
    resourceId: string;
    resourceIdentifier?: string;
    requestId?: string;
    endpoint?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      action: AuditAction.READ,
      actionCategory: AuditActionCategory.DATA_ACCESS,
      gdprBasis: GdprBasis.LEGITIMATE_INTEREST,
    });
  }

  /**
   * Log data modification event
   */
  async logDataModification(params: {
    companyId?: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: AuditAction.CREATE | AuditAction.UPDATE | AuditAction.DELETE;
    resourceType: string;
    resourceId: string;
    resourceIdentifier?: string;
    beforeState?: any;
    afterState?: any;
    requestId?: string;
    endpoint?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      actionCategory: AuditActionCategory.DATA_MODIFICATION,
      gdprBasis: GdprBasis.CONTRACT,
    });
  }

  /**
   * Log privacy-related event
   */
  async logPrivacyEvent(params: {
    companyId?: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action:
      | AuditAction.EXPORT_DATA
      | AuditAction.REQUEST_DELETION
      | AuditAction.CONSENT_GIVEN
      | AuditAction.CONSENT_WITHDRAWN;
    resourceType: string;
    resourceId: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      actionCategory: AuditActionCategory.PRIVACY,
      gdprBasis: GdprBasis.LEGAL_OBLIGATION,
    });
  }

  /**
   * Log administrative event
   */
  async logAdmin(params: {
    companyId?: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    beforeState?: any;
    afterState?: any;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      ...params,
      actionCategory: AuditActionCategory.ADMIN,
      gdprBasis: GdprBasis.LEGITIMATE_INTEREST,
    });
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    companyId?: string;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    actionCategory?: AuditActionCategory;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    const conditions: any[] = [];

    if (filters.companyId) {
      conditions.push(sql`company_id = ${filters.companyId}`);
    }
    if (filters.actorId) {
      conditions.push(sql`actor_id = ${filters.actorId}`);
    }
    if (filters.resourceType) {
      conditions.push(sql`resource_type = ${filters.resourceType}`);
    }
    if (filters.resourceId) {
      conditions.push(sql`resource_id = ${filters.resourceId}`);
    }
    if (filters.actionCategory) {
      conditions.push(sql`action_category = ${filters.actionCategory}`);
    }
    if (filters.startDate) {
      conditions.push(sql`timestamp >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`timestamp <= ${filters.endDate}`);
    }

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const limit = filters.limit || 100;

    const result = await this.db.execute(
      sql`SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT ${limit}`
    );

    return result.rows;
  }

  /**
   * Delete old audit logs based on retention policy
   */
  async purgeExpiredLogs(): Promise<number> {
    const result = await this.db.execute(
      sql`DELETE FROM audit_logs WHERE retention_until IS NOT NULL AND retention_until < NOW()`
    );

    return result.rowCount || 0;
  }
}

/**
 * Create audit logger instance
 */
export function createAuditLogger(db: PostgresJsDatabase): AuditLogger {
  return new AuditLogger(db);
}
