import type { FastifyPluginAsync } from 'fastify';
import { testConnection } from '../db/connection.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            database: { type: 'string' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const dbConnected = await testConnection();

      return reply.code(200).send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbConnected ? 'connected' : 'disconnected',
      });
    },
  });

  fastify.get('/ready', {
    schema: {
      description: 'Readiness check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      const dbConnected = await testConnection();
      if (!dbConnected) {
        return reply.code(503).send({ ready: false });
      }
      return reply.code(200).send({ ready: true });
    },
  });
};
