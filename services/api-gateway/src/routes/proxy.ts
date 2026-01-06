import { FastifyInstance } from 'fastify';
import fastifyHttpProxy from '@fastify/http-proxy';

/**
 * Service endpoints mapping
 */
const SERVICE_ENDPOINTS = {
  UNIFIED_PROFILE: process.env.UNIFIED_PROFILE_URL || 'http://localhost:3018',
  KINTELL_CONNECTOR: process.env.KINTELL_CONNECTOR_URL || 'http://localhost:3027',
  BUDDY_SERVICE: process.env.BUDDY_SERVICE_URL || 'http://localhost:3019',
  UPSKILLING_CONNECTOR: process.env.UPSKILLING_CONNECTOR_URL || 'http://localhost:3028',
  Q2Q_AI: process.env.Q2Q_AI_URL || 'http://localhost:3021',
  SAFETY_MODERATION: process.env.SAFETY_MODERATION_URL || 'http://localhost:3022',
  IMPACT_IN: process.env.IMPACT_IN_URL || 'http://localhost:3025'
};

/**
 * Register reverse proxy routes for all microservices
 *
 * @param fastify - Fastify instance
 */
export async function registerProxyRoutes(fastify: FastifyInstance): Promise<void> {
  // Unified Profile Service - User profiles, authentication, authorization (v1)
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.UNIFIED_PROFILE,
    prefix: '/v1/profile',
    rewritePrefix: '/v1/profile',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Unified Profile: ${request.url}`);
      reply.header('X-API-Version', 'v1');
    }
  });

  // Kintell Connector - External skills taxonomy integration (v1)
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.KINTELL_CONNECTOR,
    prefix: '/v1/kintell',
    rewritePrefix: '/v1',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Kintell Connector: ${request.url}`);
      reply.header('X-API-Version', 'v1');
    }
  });

  // Buddy Service - Peer support and mentorship matching (v1)
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.BUDDY_SERVICE,
    prefix: '/v1/buddy',
    rewritePrefix: '/v1',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Buddy Service: ${request.url}`);
      reply.header('X-API-Version', 'v1');
    }
  });

  // Upskilling Connector - External learning platform integration (v1)
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.UPSKILLING_CONNECTOR,
    prefix: '/v1/upskilling',
    rewritePrefix: '/v1',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Upskilling Connector: ${request.url}`);
      reply.header('X-API-Version', 'v1');
    }
  });

  // Q2Q AI Service - Conversational AI for career guidance (v1)
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.Q2Q_AI,
    prefix: '/v1/q2q',
    rewritePrefix: '/v1',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Q2Q AI: ${request.url}`);
      reply.header('X-API-Version', 'v1');
    }
  });

  // Safety & Moderation Service - Content moderation and safety checks (v1)
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.SAFETY_MODERATION,
    prefix: '/v1/safety',
    rewritePrefix: '/v1',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Safety & Moderation: ${request.url}`);
      reply.header('X-API-Version', 'v1');
    }
  });

  // Impact-In Service - Data importer and external CSR platform delivery (v1)
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.IMPACT_IN,
    prefix: '/v1/imports',
    rewritePrefix: '/v1/impact-in/imports',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Impact-In (Imports): ${request.url}`);
      reply.header('X-API-Version', 'v1');
    }
  });

  fastify.log.info('All v1 proxy routes registered successfully');
}

/**
 * Get service endpoints configuration
 */
export function getServiceEndpoints() {
  return SERVICE_ENDPOINTS;
}
