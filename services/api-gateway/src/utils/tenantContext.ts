import { FastifyRequest } from 'fastify';
import { TenantContext, getTenantContext as getContext } from '../middleware/tenantScope.js';
import crypto from 'crypto';

/**
 * Database query scope for tenant isolation
 */
export interface QueryScope {
  companyId: string;
  userId?: string;
}

/**
 * Get tenant ID from request (convenience wrapper)
 */
export function getTenantId(request: FastifyRequest): string {
  const context = getContext(request);
  return context.companyId;
}

/**
 * Get full tenant context from request (convenience wrapper)
 */
export function getTenantContext(request: FastifyRequest): TenantContext {
  return getContext(request);
}

/**
 * Create scoped WHERE clause for SQL queries
 * Automatically adds tenant isolation to queries
 *
 * @example
 * const scope = createQueryScope(request);
 * const query = `SELECT * FROM activities WHERE ${scope.whereClause}`;
 * db.query(query, scope.params);
 */
export function createQueryScope(request: FastifyRequest): {
  whereClause: string;
  params: Record<string, string>;
  companyId: string;
} {
  const tenantId = getTenantId(request);

  return {
    whereClause: 'company_id = :companyId',
    params: { companyId: tenantId },
    companyId: tenantId
  };
}

/**
 * Scoped query builder for tenant-safe database operations
 */
export class TenantQueryBuilder {
  private request: FastifyRequest;
  private companyId: string;

  constructor(request: FastifyRequest) {
    this.request = request;
    this.companyId = getTenantId(request);
  }

  /**
   * Add tenant scope to WHERE conditions
   */
  scopeWhere(conditions: string[] = []): string {
    const tenantCondition = 'company_id = :companyId';
    const allConditions = [tenantCondition, ...conditions.filter(Boolean)];
    return allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';
  }

  /**
   * Get tenant-scoped parameters
   */
  getParams(additionalParams: Record<string, any> = {}): Record<string, any> {
    return {
      companyId: this.companyId,
      ...additionalParams
    };
  }

  /**
   * Build SELECT query with tenant scope
   */
  select(table: string, columns: string[] = ['*'], conditions: string[] = []): {
    query: string;
    params: Record<string, any>;
  } {
    const cols = columns.join(', ');
    const where = this.scopeWhere(conditions);
    const query = `SELECT ${cols} FROM ${table} ${where}`;

    return {
      query,
      params: this.getParams()
    };
  }

  /**
   * Build INSERT query with tenant scope
   */
  insert(table: string, data: Record<string, any>): {
    query: string;
    params: Record<string, any>;
  } {
    const columns = ['company_id', ...Object.keys(data)];
    const placeholders = columns.map(col => `:${col}`);

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    return {
      query,
      params: this.getParams(data)
    };
  }

  /**
   * Build UPDATE query with tenant scope
   */
  update(table: string, data: Record<string, any>, conditions: string[] = []): {
    query: string;
    params: Record<string, any>;
  } {
    const setClause = Object.keys(data)
      .map(key => `${key} = :${key}`)
      .join(', ');

    const where = this.scopeWhere(conditions);
    const query = `UPDATE ${table} SET ${setClause} ${where} RETURNING *`;

    return {
      query,
      params: this.getParams(data)
    };
  }

  /**
   * Build DELETE query with tenant scope
   */
  delete(table: string, conditions: string[] = []): {
    query: string;
    params: Record<string, any>;
  } {
    const where = this.scopeWhere(conditions);
    const query = `DELETE FROM ${table} ${where} RETURNING *`;

    return {
      query,
      params: this.getParams()
    };
  }

  /**
   * Get company ID
   */
  getCompanyId(): string {
    return this.companyId;
  }
}

/**
 * Audit log entry for tracking tenant actions
 */
export interface AuditLogEntry {
  companyId: string;
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create audit log entry for tenant action
 * Automatically captures request metadata
 *
 * @example
 * await logTenantAction(request, {
 *   action: 'update_settings',
 *   resourceType: 'company',
 *   resourceId: companyId,
 *   changes: { theme: 'dark' }
 * });
 */
export async function logTenantAction(
  request: FastifyRequest,
  action: Partial<AuditLogEntry> & { action: string }
): Promise<void> {
  try {
    const context = getTenantContext(request);

    const logEntry: AuditLogEntry = {
      companyId: context.companyId,
      userId: context.userId,
      action: action.action,
      resourceType: action.resourceType,
      resourceId: action.resourceId,
      changes: action.changes,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown'
    };

    // Log to console (replace with actual database insert)
    request.log.info({
      type: 'audit_log',
      ...logEntry
    }, `Tenant action: ${action.action}`);

    // TODO: Insert into tenant_audit_logs table
    /*
    const query = `
      INSERT INTO tenant_audit_logs
        (company_id, user_id, action, resource_type, resource_id, changes, ip_address, user_agent)
      VALUES
        (:companyId, :userId, :action, :resourceType, :resourceId, :changes, :ipAddress, :userAgent)
    `;
    await db.execute(query, logEntry);
    */
  } catch (error) {
    request.log.error({ error }, 'Failed to log tenant action');
  }
}

/**
 * Encrypt sensitive data for tenant storage
 * Used for API keys, secrets, etc.
 */
export function encryptTenantData(data: string, secret?: string): string {
  const encryptionKey = secret || process.env.TENANT_ENCRYPTION_KEY || 'default-key-change-in-production';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt tenant data
 */
export function decryptTenantData(encryptedData: string, secret?: string): string {
  const encryptionKey = secret || process.env.TENANT_ENCRYPTION_KEY || 'default-key-change-in-production';
  const [ivHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate secure API key for tenant
 */
export function generateTenantAPIKey(companyId: string, prefix: string = 'teei'): {
  apiKey: string;
  keyHash: string;
} {
  // Generate random key
  const randomPart = crypto.randomBytes(32).toString('hex');
  const apiKey = `${prefix}_${companyId.slice(0, 8)}_${randomPart}`;

  // Create hash for storage
  const keyHash = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');

  return { apiKey, keyHash };
}

/**
 * Verify API key hash
 */
export function verifyTenantAPIKey(apiKey: string, keyHash: string): boolean {
  const computedHash = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');

  return computedHash === keyHash;
}

/**
 * Tenant settings helper
 */
export class TenantSettings {
  private settings: Record<string, any>;

  constructor(settingsJson: string | Record<string, any>) {
    this.settings = typeof settingsJson === 'string'
      ? JSON.parse(settingsJson)
      : settingsJson;
  }

  /**
   * Get setting value with default
   */
  get<T>(key: string, defaultValue?: T): T {
    const keys = key.split('.');
    let value: any = this.settings;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return defaultValue as T;
      }
    }

    return value;
  }

  /**
   * Set setting value
   */
  set(key: string, value: any): void {
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    let current: any = this.settings;

    for (const k of keys) {
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }

    current[lastKey] = value;
  }

  /**
   * Get all settings
   */
  getAll(): Record<string, any> {
    return this.settings;
  }

  /**
   * Convert to JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.settings);
  }
}

/**
 * Check if feature is enabled for tenant
 */
export function isFeatureEnabled(
  request: FastifyRequest,
  featureName: string,
  companySettings?: Record<string, any>
): boolean {
  if (companySettings) {
    const settings = new TenantSettings(companySettings);
    return settings.get(`feature_flags.${featureName}`, false);
  }

  // If no settings provided, feature is disabled by default
  return false;
}

/**
 * Get SROI override for tenant
 */
export function getSROIOverride(
  request: FastifyRequest,
  activityType: string,
  companySettings?: Record<string, any>
): number | null {
  if (companySettings) {
    const settings = new TenantSettings(companySettings);
    return settings.get(`sroi_overrides.${activityType}`, null);
  }

  return null;
}
