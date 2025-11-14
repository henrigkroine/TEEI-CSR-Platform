/**
 * API Key Management Routes
 *
 * Provides endpoints for companies to manage programmatic access via API keys.
 * Features:
 * - Create API keys with scopes and rate limits
 * - Rotate/regenerate keys
 * - Revoke keys
 * - List and view key usage
 *
 * Security:
 * - Keys are hashed before storage (SHA-256)
 * - Only prefix is stored for identification
 * - Scoped permissions per key
 * - Rate limiting per key
 *
 * Ref: Mission § API Key Management (create/rotate/revoke)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'crypto';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('api-gateway:api-keys');

// Validation schemas
const createKeySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  scopes: z.array(z.string()).min(1).max(50),
  rateLimitPerMinute: z.number().int().min(1).max(1000).default(60),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const revokeKeySchema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const listKeysSchema = z.object({
  companyId: z.string().uuid(),
  includeRevoked: z.coerce.boolean().default(false),
});

/**
 * Generate a new API key
 * Format: teei_live_<random_24_chars>
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomPart = randomBytes(18).toString('base64url'); // 24 chars
  const key = `teei_live_${randomPart}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 16); // teei_live_XXXXXX

  return { key, hash, prefix };
}

/**
 * Hash an API key for verification
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Register API key management routes
 */
export async function apiKeyRoutes(app: FastifyInstance, dbPool: Pool): Promise<void> {
  /**
   * POST /api/keys
   * Create a new API key
   */
  app.post('/keys', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Only company admins can create API keys
      if (tenant.role !== 'company_admin' && tenant.role !== 'system_admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only company administrators can create API keys',
        });
      }

      const body = createKeySchema.parse(request.body);
      const { name, description, scopes, rateLimitPerMinute, expiresInDays } = body;

      // Generate API key
      const { key, hash, prefix } = generateApiKey();

      // Calculate expiration date
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Insert into database
      const result = await dbPool.query(
        `INSERT INTO company_api_keys (
          company_id, key_hash, key_prefix, name, description,
          scopes, rate_limit_per_minute, expires_at,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, key_prefix, name, scopes, rate_limit_per_minute, expires_at, created_at`,
        [
          tenant.companyId,
          hash,
          prefix,
          name,
          description || null,
          JSON.stringify(scopes),
          rateLimitPerMinute,
          expiresAt,
          user.userId,
        ]
      );

      const apiKey = result.rows[0];

      logger.info('API key created', {
        companyId: tenant.companyId,
        keyId: apiKey.id,
        prefix,
        createdBy: user.userId,
      });

      // Audit log
      await dbPool.query(
        `INSERT INTO audit_logs (
          company_id, user_id, action, resource_type, resource_id,
          success, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          tenant.companyId,
          user.userId,
          'API_KEY_CREATED',
          'api_key',
          apiKey.id,
          true,
          JSON.stringify({ name, scopes, rateLimitPerMinute }),
        ]
      );

      return reply.status(201).send({
        success: true,
        message: 'API key created successfully. Save the key securely - it will not be shown again.',
        data: {
          id: apiKey.id,
          key, // Only returned once!
          prefix,
          name: apiKey.name,
          scopes: JSON.parse(apiKey.scopes),
          rateLimitPerMinute: apiKey.rate_limit_per_minute,
          expiresAt: apiKey.expires_at,
          createdAt: apiKey.created_at,
        },
      });
    } catch (error: any) {
      logger.error('Failed to create API key', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create API key',
      });
    }
  });

  /**
   * GET /api/keys
   * List all API keys for a company
   */
  app.get('/keys', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const query = listKeysSchema.parse(request.query);
      const { companyId, includeRevoked } = query;

      // Verify tenant access
      if (tenant.companyId !== companyId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this company\'s API keys',
        });
      }

      // Fetch API keys
      const revokedFilter = includeRevoked ? '' : 'AND revoked_at IS NULL';

      const result = await dbPool.query(
        `SELECT
          id, key_prefix, name, description, scopes,
          rate_limit_per_minute, last_used_at, last_used_ip,
          usage_count, expires_at, revoked_at, revoked_by,
          revocation_reason, created_at, updated_at
        FROM company_api_keys
        WHERE company_id = $1 ${revokedFilter}
        ORDER BY created_at DESC`,
        [companyId]
      );

      const keys = result.rows.map((row) => ({
        ...row,
        scopes: JSON.parse(row.scopes),
        isExpired: row.expires_at && new Date(row.expires_at) < new Date(),
        isRevoked: !!row.revoked_at,
      }));

      return reply.send({
        success: true,
        data: { keys },
      });
    } catch (error: any) {
      logger.error('Failed to list API keys', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to list API keys',
      });
    }
  });

  /**
   * GET /api/keys/:id
   * Get details of a specific API key
   */
  app.get('/keys/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { id } = request.params as { id: string };

      // Fetch API key
      const result = await dbPool.query(
        `SELECT
          id, company_id, key_prefix, name, description, scopes,
          rate_limit_per_minute, last_used_at, last_used_ip,
          usage_count, expires_at, revoked_at, revoked_by,
          revocation_reason, created_at, updated_at
        FROM company_api_keys
        WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'API key not found',
        });
      }

      const apiKey = result.rows[0];

      // Verify tenant access
      if (tenant.companyId !== apiKey.company_id) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this API key',
        });
      }

      return reply.send({
        success: true,
        data: {
          ...apiKey,
          scopes: JSON.parse(apiKey.scopes),
          isExpired: apiKey.expires_at && new Date(apiKey.expires_at) < new Date(),
          isRevoked: !!apiKey.revoked_at,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get API key', { error: error.message });

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get API key',
      });
    }
  });

  /**
   * POST /api/keys/:id/revoke
   * Revoke an API key
   */
  app.post('/keys/:id/revoke', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Only company admins can revoke API keys
      if (tenant.role !== 'company_admin' && tenant.role !== 'system_admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only company administrators can revoke API keys',
        });
      }

      const { id } = request.params as { id: string };
      const body = revokeKeySchema.parse({ id, ...(request.body || {}) });
      const { reason } = body;

      // Fetch API key
      const result = await dbPool.query(
        `SELECT company_id, name, revoked_at FROM company_api_keys WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'API key not found',
        });
      }

      const apiKey = result.rows[0];

      // Verify tenant access
      if (tenant.companyId !== apiKey.company_id) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this API key',
        });
      }

      // Check if already revoked
      if (apiKey.revoked_at) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'API key is already revoked',
        });
      }

      // Revoke the key
      await dbPool.query(
        `UPDATE company_api_keys
        SET revoked_at = NOW(), revoked_by = $1, revocation_reason = $2, updated_at = NOW()
        WHERE id = $3`,
        [user.userId, reason || null, id]
      );

      logger.info('API key revoked', {
        companyId: tenant.companyId,
        keyId: id,
        revokedBy: user.userId,
        reason,
      });

      // Audit log
      await dbPool.query(
        `INSERT INTO audit_logs (
          company_id, user_id, action, resource_type, resource_id,
          success, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          tenant.companyId,
          user.userId,
          'API_KEY_REVOKED',
          'api_key',
          id,
          true,
          JSON.stringify({ name: apiKey.name, reason }),
        ]
      );

      return reply.send({
        success: true,
        message: 'API key revoked successfully',
        data: {
          id,
          revokedAt: new Date(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to revoke API key', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation Error',
          message: error.errors,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to revoke API key',
      });
    }
  });

  /**
   * POST /api/keys/:id/rotate
   * Rotate an API key (revoke old, create new)
   */
  app.post('/keys/:id/rotate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const tenant = (request as any).tenant;

      if (!user || !tenant) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Only company admins can rotate API keys
      if (tenant.role !== 'company_admin' && tenant.role !== 'system_admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only company administrators can rotate API keys',
        });
      }

      const { id } = request.params as { id: string };

      // Fetch existing key
      const result = await dbPool.query(
        `SELECT company_id, name, description, scopes, rate_limit_per_minute, expires_at, revoked_at
        FROM company_api_keys
        WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'API key not found',
        });
      }

      const oldKey = result.rows[0];

      // Verify tenant access
      if (tenant.companyId !== oldKey.company_id) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Access denied to this API key',
        });
      }

      // Check if already revoked
      if (oldKey.revoked_at) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Cannot rotate a revoked API key',
        });
      }

      // Generate new API key
      const { key: newKey, hash, prefix } = generateApiKey();

      // Start transaction
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');

        // Revoke old key
        await client.query(
          `UPDATE company_api_keys
          SET revoked_at = NOW(), revoked_by = $1, revocation_reason = $2, updated_at = NOW()
          WHERE id = $3`,
          [user.userId, 'Rotated', id]
        );

        // Create new key with same settings
        const insertResult = await client.query(
          `INSERT INTO company_api_keys (
            company_id, key_hash, key_prefix, name, description,
            scopes, rate_limit_per_minute, expires_at,
            created_by, created_at, updated_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
          RETURNING id, key_prefix, name, scopes, rate_limit_per_minute, expires_at, created_at`,
          [
            tenant.companyId,
            hash,
            prefix,
            oldKey.name + ' (Rotated)',
            oldKey.description,
            oldKey.scopes,
            oldKey.rate_limit_per_minute,
            oldKey.expires_at,
            user.userId,
            JSON.stringify({ rotatedFrom: id }),
          ]
        );

        const newApiKey = insertResult.rows[0];

        // Audit log
        await client.query(
          `INSERT INTO audit_logs (
            company_id, user_id, action, resource_type, resource_id,
            success, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            tenant.companyId,
            user.userId,
            'API_KEY_ROTATED',
            'api_key',
            newApiKey.id,
            true,
            JSON.stringify({ oldKeyId: id, newKeyId: newApiKey.id }),
          ]
        );

        await client.query('COMMIT');

        logger.info('API key rotated', {
          companyId: tenant.companyId,
          oldKeyId: id,
          newKeyId: newApiKey.id,
          userId: user.userId,
        });

        return reply.status(201).send({
          success: true,
          message:
            'API key rotated successfully. Save the new key securely - it will not be shown again.',
          data: {
            oldKeyId: id,
            newKey: {
              id: newApiKey.id,
              key: newKey, // Only returned once!
              prefix,
              name: newApiKey.name,
              scopes: JSON.parse(newApiKey.scopes),
              rateLimitPerMinute: newApiKey.rate_limit_per_minute,
              expiresAt: newApiKey.expires_at,
              createdAt: newApiKey.created_at,
            },
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Failed to rotate API key', { error: error.message });

      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to rotate API key',
      });
    }
  });
}
