/**
 * Program Service - Main Entry Point
 * Agent: template-registry-implementer (Agent 13)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';

config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

// Health check
fastify.get('/health', async () => ({
  status: 'ok',
  service: 'program-service',
  timestamp: new Date().toISOString(),
}));

// Routes
import { templatesRoutes } from './routes/templates.js';
import { programsRoutes } from './routes/programs.js';
import { campaignsRoutes } from './routes/campaigns.js';

await fastify.register(templatesRoutes, { prefix: '/templates' });
await fastify.register(programsRoutes, { prefix: '/programs' });
await fastify.register(campaignsRoutes, { prefix: '/campaigns' });

// Start server
const PORT = parseInt(process.env.PORT_PROGRAM_SERVICE || '3021', 10);
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`🚀 Program Service listening on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
