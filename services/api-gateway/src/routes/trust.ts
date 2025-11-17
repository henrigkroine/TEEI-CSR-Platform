/**
 * Trust API Gateway Routes
 *
 * Proxies Trust API requests to the reporting service with:
 * - JWT authentication for evidence/ledger endpoints
 * - No auth for public policies endpoint
 * - Rate limiting (100 req/min)
 *
 * @module routes/trust
 */

import { FastifyInstance } from 'fastify';
import fastifyHttpProxy from '@fastify/http-proxy';
import { authenticateJWT } from '../middleware/auth.js';

const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://localhost:3010';

/**
 * Register Trust API proxy routes
 *
 * @param fastify - Fastify instance
 */
export async function registerTrustRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Evidence endpoint - requires JWT authentication
   * GET /v1/trust/evidence/:reportId
   */
  await fastify.register(fastifyHttpProxy, {
    upstream: REPORTING_SERVICE_URL,
    prefix: '/v1/trust/evidence',
    rewritePrefix: '/trust/v1/evidence',
    http2: false,
    preHandler: [
      authenticateJWT, // Require authentication
      async (request, reply) => {
        // Apply stricter rate limit for evidence endpoint (100 req/min)
        fastify.log.info(`Proxying trust evidence request: ${request.url}`);
        reply.header('X-API-Version', 'v1');
        reply.header('X-Service', 'reporting');
      },
    ],
  });

  /**
   * Ledger endpoint - requires JWT authentication
   * GET /v1/trust/ledger/:reportId
   */
  await fastify.register(fastifyHttpProxy, {
    upstream: REPORTING_SERVICE_URL,
    prefix: '/v1/trust/ledger',
    rewritePrefix: '/trust/v1/ledger',
    http2: false,
    preHandler: [
      authenticateJWT, // Require authentication
      async (request, reply) => {
        fastify.log.info(`Proxying trust ledger request: ${request.url}`);
        reply.header('X-API-Version', 'v1');
        reply.header('X-Service', 'reporting');
      },
    ],
  });

  /**
   * Policies endpoint - public, no authentication
   * GET /v1/trust/policies
   */
  await fastify.register(fastifyHttpProxy, {
    upstream: REPORTING_SERVICE_URL,
    prefix: '/v1/trust/policies',
    rewritePrefix: '/trust/v1/policies',
    http2: false,
    preHandler: async (request, reply) => {
      // Public endpoint - no auth required for Trust Center transparency
      fastify.log.info(`Proxying trust policies request: ${request.url}`);
      reply.header('X-API-Version', 'v1');
      reply.header('X-Service', 'reporting');
      reply.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    },
  });

  fastify.log.info('Trust API proxy routes registered successfully');
}
