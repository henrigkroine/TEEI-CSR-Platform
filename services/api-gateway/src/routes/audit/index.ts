/**
 * API Gateway Audit Routes
 *
 * Proxies audit requests to the analytics service with authentication and rate limiting.
 * Enforces RBAC (AuditViewer, AuditAdmin) and tenant isolation.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fetch from 'node-fetch';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3008';

/**
 * Proxy request to analytics service
 */
async function proxyToAnalytics(
  path: string,
  method: 'GET' | 'POST',
  query?: Record<string, any>,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any; headers?: any }> {
  const url = new URL(path, ANALYTICS_SERVICE_URL);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

/**
 * Rate limiter for audit endpoints
 */
const auditRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = auditRateLimits.get(userId);

  if (!userLimit || userLimit.resetAt < now) {
    auditRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Register audit gateway routes
 */
export async function registerAuditRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/audit/events
   *
   * Query audit events with filters
   */
  fastify.get('/v1/audit/events', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get authenticated user
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions. Required role: AuditViewer or AuditAdmin',
        });
      }

      // Rate limiting
      if (!checkRateLimit(user.userId, 100, 60000)) {
        return reply.status(429).send({
          success: false,
          error: 'TooManyRequests',
          message: 'Rate limit exceeded. Max 100 requests per minute.',
        });
      }

      // Proxy to analytics service
      const result = await proxyToAnalytics('/v1/audit/events', 'GET', request.query as any, null, {
        'x-user-id': user.userId,
        'x-user-role': user.role,
        'x-tenant-id': user.tenantId || '',
      });

      return reply.status(result.status).send(result.data);
    } catch (error) {
      request.log.error({ error }, 'Audit query proxy failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to query audit events',
      });
    }
  });

  /**
   * GET /v1/audit/events/:id
   *
   * Get single audit event by ID
   */
  fastify.get('/v1/audit/events/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      // Rate limiting
      if (!checkRateLimit(user.userId, 200, 60000)) {
        return reply.status(429).send({
          success: false,
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      const { id } = request.params as { id: string };

      // Proxy to analytics service
      const result = await proxyToAnalytics(`/v1/audit/events/${id}`, 'GET', null, null, {
        'x-user-id': user.userId,
        'x-user-role': user.role,
        'x-tenant-id': user.tenantId || '',
      });

      return reply.status(result.status).send(result.data);
    } catch (error) {
      request.log.error({ error }, 'Audit event get proxy failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to retrieve audit event',
      });
    }
  });

  /**
   * GET /v1/audit/timeline
   *
   * Timeline aggregation for heatmap
   */
  fastify.get('/v1/audit/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      // Rate limiting
      if (!checkRateLimit(user.userId, 50, 60000)) {
        return reply.status(429).send({
          success: false,
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      // Proxy to analytics service
      const result = await proxyToAnalytics('/v1/audit/timeline', 'GET', request.query as any, null, {
        'x-user-id': user.userId,
        'x-user-role': user.role,
        'x-tenant-id': user.tenantId || '',
      });

      return reply.status(result.status).send(result.data);
    } catch (error) {
      request.log.error({ error }, 'Timeline query proxy failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to generate timeline',
      });
    }
  });

  /**
   * GET /v1/audit/stats
   *
   * Audit statistics
   */
  fastify.get('/v1/audit/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      // Rate limiting
      if (!checkRateLimit(user.userId, 50, 60000)) {
        return reply.status(429).send({
          success: false,
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      // Proxy to analytics service
      const result = await proxyToAnalytics('/v1/audit/stats', 'GET', request.query as any, null, {
        'x-user-id': user.userId,
        'x-user-role': user.role,
        'x-tenant-id': user.tenantId || '',
      });

      return reply.status(result.status).send(result.data);
    } catch (error) {
      request.log.error({ error }, 'Stats query proxy failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to generate statistics',
      });
    }
  });

  /**
   * POST /v1/audit/export
   *
   * Create compliance export bundle
   */
  fastify.post('/v1/audit/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user || !user.userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC: AuditAdmin only
      if (!user.role || !['AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions. Required role: AuditAdmin',
        });
      }

      // Strict rate limiting for exports (5 per hour)
      if (!checkRateLimit(`${user.userId}:export`, 5, 3600000)) {
        return reply.status(429).send({
          success: false,
          error: 'TooManyRequests',
          message: 'Rate limit exceeded. Max 5 exports per hour.',
        });
      }

      // Audit the export request itself
      request.log.info(
        {
          userId: user.userId,
          tenantId: user.tenantId,
          body: request.body,
        },
        'Compliance export requested'
      );

      // Proxy to analytics service (streaming)
      const url = new URL('/v1/audit/export', ANALYTICS_SERVICE_URL);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'x-user-role': user.role,
          'x-tenant-id': user.tenantId || '',
        },
        body: JSON.stringify(request.body),
      });

      // Forward headers
      reply.header('Content-Type', response.headers.get('Content-Type') || 'application/zip');
      reply.header(
        'Content-Disposition',
        response.headers.get('Content-Disposition') || 'attachment'
      );
      reply.header('X-Export-ID', response.headers.get('X-Export-ID') || '');
      reply.header('X-Export-Event-Count', response.headers.get('X-Export-Event-Count') || '0');
      reply.header('X-Export-SHA256', response.headers.get('X-Export-SHA256') || '');

      // Stream response
      return reply.status(response.status).send(response.body);
    } catch (error) {
      request.log.error({ error }, 'Export proxy failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to create compliance export',
      });
    }
  });

  fastify.log.info('Audit gateway routes registered');
}
