import { FastifyInstance } from 'fastify';
import fastifyHttpProxy from '@fastify/http-proxy';

/**
 * Service endpoints mapping
 */
const SERVICE_ENDPOINTS = {
  UNIFIED_PROFILE: process.env.UNIFIED_PROFILE_URL || 'http://localhost:3001',
  KINTELL_CONNECTOR: process.env.KINTELL_CONNECTOR_URL || 'http://localhost:3002',
  BUDDY_SERVICE: process.env.BUDDY_SERVICE_URL || 'http://localhost:3003',
  UPSKILLING_CONNECTOR: process.env.UPSKILLING_CONNECTOR_URL || 'http://localhost:3004',
  Q2Q_AI: process.env.Q2Q_AI_URL || 'http://localhost:3005',
  SAFETY_MODERATION: process.env.SAFETY_MODERATION_URL || 'http://localhost:3006'
};

/**
 * Register reverse proxy routes for all microservices
 *
 * @param fastify - Fastify instance
 */
export async function registerProxyRoutes(fastify: FastifyInstance): Promise<void> {
  // Unified Profile Service - User profiles, authentication, authorization
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.UNIFIED_PROFILE,
    prefix: '/profile',
    rewritePrefix: '/profile',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Unified Profile: ${request.url}`);
    }
  });

  // Kintell Connector - External skills taxonomy integration
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.KINTELL_CONNECTOR,
    prefix: '/kintell',
    rewritePrefix: '/kintell',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Kintell Connector: ${request.url}`);
    }
  });

  // Buddy Service - Peer support and mentorship matching
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.BUDDY_SERVICE,
    prefix: '/buddy',
    rewritePrefix: '/buddy',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Buddy Service: ${request.url}`);
    }
  });

  // Upskilling Connector - External learning platform integration
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.UPSKILLING_CONNECTOR,
    prefix: '/upskilling',
    rewritePrefix: '/upskilling',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Upskilling Connector: ${request.url}`);
    }
  });

  // Q2Q AI Service - Conversational AI for career guidance
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.Q2Q_AI,
    prefix: '/q2q',
    rewritePrefix: '/q2q',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Q2Q AI: ${request.url}`);
    }
  });

  // Safety & Moderation Service - Content moderation and safety checks
  await fastify.register(fastifyHttpProxy, {
    upstream: SERVICE_ENDPOINTS.SAFETY_MODERATION,
    prefix: '/safety',
    rewritePrefix: '/safety',
    http2: false,
    preHandler: async (request, reply) => {
      fastify.log.info(`Proxying request to Safety & Moderation: ${request.url}`);
    }
  });

  fastify.log.info('All proxy routes registered successfully');
}

/**
 * Get service endpoints configuration
 */
export function getServiceEndpoints() {
  return SERVICE_ENDPOINTS;
}
