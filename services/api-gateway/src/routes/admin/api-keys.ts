import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  getApiKeyStats,
} from '../../services/api-keys.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('api-keys-admin');

/**
 * Admin API Keys Management Routes
 *
 * IMPORTANT: These routes should be protected by admin authentication
 * and only accessible to company_admin or system_admin roles.
 */

// Request schemas
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  scopes: z.array(z.enum(['data:read', 'data:write', 'report:view', 'report:create', 'admin'])).optional(),
  rateLimitPerMinute: z.number().int().min(10).max(10000).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const RevokeApiKeySchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * Register API key admin routes
 */
export async function registerApiKeyAdminRoutes(fastify: FastifyInstance) {
  /**
   * POST /admin/api-keys
   * Create a new API key
   */
  fastify.post('/admin/api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    // In production, extract from authenticated session
    const userId = (request as any).session?.userId || 'system';
    const companyId = (request as any).session?.companyId;

    if (!companyId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Company ID required',
      });
    }

    // Validate request body
    let body: z.infer<typeof CreateApiKeySchema>;
    try {
      body = CreateApiKeySchema.parse(request.body);
    } catch (error) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Invalid request body',
        details: error,
      });
    }

    try {
      // Calculate expiration date
      const expiresAt = body.expiresInDays
        ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const apiKey = await createApiKey({
        companyId,
        name: body.name,
        description: body.description,
        scopes: body.scopes,
        rateLimitPerMinute: body.rateLimitPerMinute,
        expiresAt,
        createdBy: userId,
      });

      logger.info('API key created', {
        keyId: apiKey.id,
        companyId,
        name: body.name,
        createdBy: userId,
      });

      return reply.code(201).send({
        ...apiKey,
        warning: 'Save this API key securely. It will not be shown again.',
      });
    } catch (error: any) {
      logger.error('Failed to create API key', {
        error: error.message,
        companyId,
      });

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create API key',
      });
    }
  });

  /**
   * GET /admin/api-keys
   * List all API keys for the company
   */
  fastify.get('/admin/api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = (request as any).session?.companyId;

    if (!companyId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Company ID required',
      });
    }

    try {
      const keys = await listApiKeys(companyId);
      const stats = await getApiKeyStats(companyId);

      return reply.send({
        keys,
        stats,
      });
    } catch (error: any) {
      logger.error('Failed to list API keys', {
        error: error.message,
        companyId,
      });

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list API keys',
      });
    }
  });

  /**
   * DELETE /admin/api-keys/:keyId
   * Revoke an API key
   */
  fastify.delete('/admin/api-keys/:keyId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { keyId } = request.params as { keyId: string };
    const userId = (request as any).session?.userId || 'system';
    const companyId = (request as any).session?.companyId;

    if (!companyId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Company ID required',
      });
    }

    // Validate request body
    let body: z.infer<typeof RevokeApiKeySchema> | undefined;
    try {
      body = request.body ? RevokeApiKeySchema.parse(request.body) : undefined;
    } catch (error) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Invalid request body',
        details: error,
      });
    }

    try {
      await revokeApiKey({
        keyId,
        companyId,
        revokedBy: userId,
        reason: body?.reason,
      });

      logger.info('API key revoked', {
        keyId,
        companyId,
        revokedBy: userId,
        reason: body?.reason,
      });

      return reply.code(204).send();
    } catch (error: any) {
      logger.error('Failed to revoke API key', {
        error: error.message,
        keyId,
        companyId,
      });

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to revoke API key',
      });
    }
  });

  /**
   * POST /admin/api-keys/:keyId/rotate
   * Rotate an API key (create new, revoke old)
   */
  fastify.post('/admin/api-keys/:keyId/rotate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { keyId } = request.params as { keyId: string };
    const userId = (request as any).session?.userId || 'system';
    const companyId = (request as any).session?.companyId;

    if (!companyId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Company ID required',
      });
    }

    try {
      const newKey = await rotateApiKey(keyId, companyId, userId);

      logger.info('API key rotated', {
        oldKeyId: keyId,
        newKeyId: newKey.id,
        companyId,
        rotatedBy: userId,
      });

      return reply.code(201).send({
        ...newKey,
        warning: 'Save this new API key securely. The old key has been revoked.',
      });
    } catch (error: any) {
      logger.error('Failed to rotate API key', {
        error: error.message,
        keyId,
        companyId,
      });

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to rotate API key',
      });
    }
  });

  /**
   * GET /admin/api-keys/stats
   * Get API key usage statistics
   */
  fastify.get('/admin/api-keys/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const companyId = (request as any).session?.companyId;

    if (!companyId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Company ID required',
      });
    }

    try {
      const stats = await getApiKeyStats(companyId);
      return reply.send(stats);
    } catch (error: any) {
      logger.error('Failed to get API key stats', {
        error: error.message,
        companyId,
      });

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get API key stats',
      });
    }
  });
}
