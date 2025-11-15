import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateApiKey, recordApiKeyUsage } from '../services/api-keys.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('api-key-auth');

/**
 * API Key Authentication Middleware
 *
 * Validates API keys from request headers and attaches company context.
 * Supports multiple header formats:
 * - Authorization: Bearer teei_live_...
 * - X-API-Key: teei_live_...
 */

export interface ApiKeyContext {
  keyId: string;
  companyId: string;
  scopes: string[];
  rateLimitPerMinute: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKeyContext;
  }
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: FastifyRequest): string | null {
  // Check Authorization: Bearer header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers['x-api-key'] as string;
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * API Key authentication middleware
 */
export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    logger.warn('API key missing from request', {
      path: request.url,
      ip: request.ip,
    });

    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API key required. Provide key via Authorization: Bearer header or X-API-Key header.',
    });
  }

  // Validate API key
  const validation = await validateApiKey(apiKey);

  if (!validation.valid) {
    logger.warn('Invalid API key attempt', {
      path: request.url,
      ip: request.ip,
      error: validation.error,
    });

    return reply.code(401).send({
      error: 'Unauthorized',
      message: validation.error || 'Invalid API key',
    });
  }

  // Attach API key context to request
  request.apiKey = {
    keyId: validation.keyId!,
    companyId: validation.companyId!,
    scopes: validation.scopes!,
    rateLimitPerMinute: validation.rateLimitPerMinute!,
  };

  // Record usage (async, don't block)
  recordApiKeyUsage(validation.keyId!, request.ip).catch(err => {
    logger.error('Failed to record API key usage', { error: err });
  });

  logger.debug('API key authenticated', {
    keyId: validation.keyId,
    companyId: validation.companyId,
    path: request.url,
  });
}

/**
 * Require specific scopes for an endpoint
 */
export function requireScopes(...requiredScopes: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.apiKey) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'API key required',
      });
    }

    const { scopes } = request.apiKey;

    // Check if user has admin scope (grants all permissions)
    if (scopes.includes('admin')) {
      return;
    }

    // Check if user has all required scopes
    const missingScopes = requiredScopes.filter(scope => !scopes.includes(scope));

    if (missingScopes.length > 0) {
      logger.warn('Insufficient API key scopes', {
        keyId: request.apiKey.keyId,
        companyId: request.apiKey.companyId,
        requiredScopes,
        actualScopes: scopes,
        missingScopes,
      });

      return reply.code(403).send({
        error: 'Forbidden',
        message: `Missing required scopes: ${missingScopes.join(', ')}`,
        requiredScopes,
        yourScopes: scopes,
      });
    }
  };
}

/**
 * Rate limiting based on API key limits
 * Uses in-memory store (in production, use Redis)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function apiKeyRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.apiKey) {
    return; // No rate limit if not authenticated
  }

  const { keyId, rateLimitPerMinute } = request.apiKey;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  // Get or create rate limit entry
  let entry = rateLimitStore.get(keyId);

  if (!entry || now >= entry.resetAt) {
    // Create new window
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(keyId, entry);
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > rateLimitPerMinute) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    logger.warn('Rate limit exceeded', {
      keyId,
      companyId: request.apiKey.companyId,
      limit: rateLimitPerMinute,
      count: entry.count,
      retryAfter,
    });

    return reply
      .code(429)
      .header('Retry-After', retryAfter.toString())
      .header('X-RateLimit-Limit', rateLimitPerMinute.toString())
      .header('X-RateLimit-Remaining', '0')
      .header('X-RateLimit-Reset', Math.floor(entry.resetAt / 1000).toString())
      .send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${rateLimitPerMinute} requests per minute.`,
        retryAfter,
      });
  }

  // Add rate limit headers
  const remaining = Math.max(0, rateLimitPerMinute - entry.count);
  reply.header('X-RateLimit-Limit', rateLimitPerMinute.toString());
  reply.header('X-RateLimit-Remaining', remaining.toString());
  reply.header('X-RateLimit-Reset', Math.floor(entry.resetAt / 1000).toString());
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [keyId, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(keyId);
    }
  }
}, 60 * 1000); // Every minute
