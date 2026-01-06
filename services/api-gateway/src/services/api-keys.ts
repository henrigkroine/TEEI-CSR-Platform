import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, or, isNull, gt, desc } from 'drizzle-orm';
import { z } from 'zod';

/**
 * API Key Management Service
 *
 * Implements secure API key generation, validation, and lifecycle management
 * following OWASP API Security best practices.
 *
 * Key format: teei_live_ABC123XYZ... (prefix + random secure token)
 * Storage: Only SHA-256 hash stored in database, never plaintext
 */

// Initialize DB connection
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/teei';
const queryClient = postgres(connectionString);
const db = drizzle(queryClient);

// Schemas (these should match the migration 0013 tables)
export const companyApiKeysSchema = {
  id: 'uuid',
  companyId: 'uuid',
  keyHash: 'varchar(64)',
  keyPrefix: 'varchar(12)',
  name: 'varchar(255)',
  description: 'text',
  scopes: 'jsonb',
  rateLimitPerMinute: 'integer',
  lastUsedAt: 'timestamp',
  lastUsedIp: 'inet',
  usageCount: 'bigint',
  expiresAt: 'timestamp',
  createdBy: 'uuid',
  revokedAt: 'timestamp',
  revokedBy: 'uuid',
  revocationReason: 'text',
  metadata: 'jsonb',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

/**
 * API Key creation parameters
 */
export interface CreateApiKeyParams {
  companyId: string;
  name: string;
  description?: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  expiresAt?: Date;
  createdBy: string;
}

/**
 * API Key response (includes plaintext key ONLY on creation)
 */
export interface ApiKeyResponse {
  id: string;
  companyId: string;
  keyPrefix: string;
  name: string;
  description?: string;
  scopes: string[];
  rateLimitPerMinute: number;
  expiresAt?: Date;
  createdAt: Date;
  // Only returned on creation!
  plaintextKey?: string;
}

/**
 * API Key validation result
 */
export interface ApiKeyValidation {
  valid: boolean;
  keyId?: string;
  companyId?: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  error?: string;
}

/**
 * Generate a secure API key with prefix
 * Format: teei_{env}_{random}
 */
export function generateApiKey(environment: 'live' | 'test' = 'live'): {
  plaintextKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  // Generate 32 bytes of random data (256 bits)
  const randomBytes = crypto.randomBytes(32);
  const randomToken = randomBytes.toString('base64url'); // URL-safe base64

  // Create key with prefix
  const plaintextKey = `teei_${environment}_${randomToken}`;

  // Generate SHA-256 hash for storage
  const keyHash = crypto
    .createHash('sha256')
    .update(plaintextKey)
    .digest('hex');

  // Extract prefix for identification (first 12 chars)
  const keyPrefix = plaintextKey.substring(0, 12);

  return {
    plaintextKey,
    keyHash,
    keyPrefix,
  };
}

/**
 * Create a new API key for a company
 */
export async function createApiKey(params: CreateApiKeyParams): Promise<ApiKeyResponse> {
  const { plaintextKey, keyHash, keyPrefix } = generateApiKey();

  // Validate scopes
  const validScopes = ['data:read', 'data:write', 'report:view', 'report:create', 'admin'];
  const scopes = params.scopes || ['data:read'];
  const invalidScopes = scopes.filter(s => !validScopes.includes(s));

  if (invalidScopes.length > 0) {
    throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
  }

  // Insert into database (using raw SQL for now; use Drizzle in production)
  const result = await queryClient`
    INSERT INTO company_api_keys (
      company_id,
      key_hash,
      key_prefix,
      name,
      description,
      scopes,
      rate_limit_per_minute,
      expires_at,
      created_by
    ) VALUES (
      ${params.companyId},
      ${keyHash},
      ${keyPrefix},
      ${params.name},
      ${params.description || null},
      ${JSON.stringify(scopes)},
      ${params.rateLimitPerMinute || 60},
      ${params.expiresAt || null},
      ${params.createdBy}
    )
    RETURNING id, company_id, key_prefix, name, description, scopes, rate_limit_per_minute, expires_at, created_at
  `;

  const row = result[0];

  return {
    id: row.id,
    companyId: row.company_id,
    keyPrefix: row.key_prefix,
    name: row.name,
    description: row.description,
    scopes: row.scopes,
    rateLimitPerMinute: row.rate_limit_per_minute,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    plaintextKey, // ONLY returned on creation!
  };
}

/**
 * Validate an API key and return associated company info
 */
export async function validateApiKey(plaintextKey: string): Promise<ApiKeyValidation> {
  // Hash the provided key
  const keyHash = crypto
    .createHash('sha256')
    .update(plaintextKey)
    .digest('hex');

  // Look up by hash
  const result = await queryClient`
    SELECT
      id,
      company_id,
      scopes,
      rate_limit_per_minute,
      expires_at,
      revoked_at,
      last_used_at,
      usage_count
    FROM company_api_keys
    WHERE key_hash = ${keyHash}
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `;

  if (result.length === 0) {
    return {
      valid: false,
      error: 'Invalid or revoked API key',
    };
  }

  const key = result[0];

  // Update last_used_at and usage_count asynchronously (don't block)
  queryClient`
    UPDATE company_api_keys
    SET
      last_used_at = NOW(),
      usage_count = usage_count + 1
    WHERE id = ${key.id}
  `.catch(err => {
    console.error('Failed to update key usage:', err);
  });

  return {
    valid: true,
    keyId: key.id,
    companyId: key.company_id,
    scopes: key.scopes,
    rateLimitPerMinute: key.rate_limit_per_minute,
  };
}

/**
 * Record API key usage (IP address)
 */
export async function recordApiKeyUsage(keyId: string, ipAddress: string): Promise<void> {
  await queryClient`
    UPDATE company_api_keys
    SET
      last_used_at = NOW(),
      last_used_ip = ${ipAddress},
      usage_count = usage_count + 1
    WHERE id = ${keyId}
  `;
}

/**
 * List API keys for a company
 */
export async function listApiKeys(companyId: string): Promise<ApiKeyResponse[]> {
  const result = await queryClient`
    SELECT
      id,
      company_id,
      key_prefix,
      name,
      description,
      scopes,
      rate_limit_per_minute,
      expires_at,
      last_used_at,
      usage_count,
      created_at
    FROM company_api_keys
    WHERE company_id = ${companyId}
      AND revoked_at IS NULL
    ORDER BY created_at DESC
  `;

  return result.map(row => ({
    id: row.id,
    companyId: row.company_id,
    keyPrefix: row.key_prefix,
    name: row.name,
    description: row.description,
    scopes: row.scopes,
    rateLimitPerMinute: row.rate_limit_per_minute,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

/**
 * Revoke an API key
 */
export interface RevokeApiKeyParams {
  keyId: string;
  companyId: string;
  revokedBy: string;
  reason?: string;
}

export async function revokeApiKey(params: RevokeApiKeyParams): Promise<void> {
  await queryClient`
    UPDATE company_api_keys
    SET
      revoked_at = NOW(),
      revoked_by = ${params.revokedBy},
      revocation_reason = ${params.reason || 'Revoked by admin'}
    WHERE id = ${params.keyId}
      AND company_id = ${params.companyId}
      AND revoked_at IS NULL
  `;
}

/**
 * Rotate an API key (revoke old, create new)
 */
export async function rotateApiKey(
  oldKeyId: string,
  companyId: string,
  createdBy: string
): Promise<ApiKeyResponse> {
  // Get old key details
  const oldKeyResult = await queryClient`
    SELECT name, description, scopes, rate_limit_per_minute, expires_at
    FROM company_api_keys
    WHERE id = ${oldKeyId} AND company_id = ${companyId}
    LIMIT 1
  `;

  if (oldKeyResult.length === 0) {
    throw new Error('API key not found');
  }

  const oldKey = oldKeyResult[0];

  // Create new key with same settings
  const newKey = await createApiKey({
    companyId,
    name: `${oldKey.name} (rotated)`,
    description: oldKey.description,
    scopes: oldKey.scopes,
    rateLimitPerMinute: oldKey.rate_limit_per_minute,
    expiresAt: oldKey.expires_at,
    createdBy,
  });

  // Revoke old key
  await revokeApiKey({
    keyId: oldKeyId,
    companyId,
    revokedBy: createdBy,
    reason: 'Key rotated',
  });

  return newKey;
}

/**
 * Get API key usage stats
 */
export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  revokedKeys: number;
  expiredKeys: number;
  totalUsage: number;
}

export async function getApiKeyStats(companyId: string): Promise<ApiKeyStats> {
  const result = await queryClient`
    SELECT
      COUNT(*) FILTER (WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())) as active_keys,
      COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_keys,
      COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW() AND revoked_at IS NULL) as expired_keys,
      COUNT(*) as total_keys,
      COALESCE(SUM(usage_count), 0) as total_usage
    FROM company_api_keys
    WHERE company_id = ${companyId}
  `;

  const stats = result[0];

  return {
    totalKeys: parseInt(stats.total_keys),
    activeKeys: parseInt(stats.active_keys),
    revokedKeys: parseInt(stats.revoked_keys),
    expiredKeys: parseInt(stats.expired_keys),
    totalUsage: parseInt(stats.total_usage),
  };
}
