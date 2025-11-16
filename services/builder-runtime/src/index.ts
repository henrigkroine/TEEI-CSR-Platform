/**
<<<<<<< HEAD
 * Builder Runtime Service v2
 *
 * Canvas builder with versioning and export capabilities
 */

import Fastify from 'fastify';
import { Pool } from 'pg';
import { registerCanvasRoutes } from './routes/canvas.js';

const PORT = parseInt(process.env.PORT || '3009', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

function initDatabase(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DATABASE || 'teei_csr',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    max: 20
  });
}

async function start() {
  try {
    const db = initDatabase();

    // Mock auth middleware
    fastify.addHook('preHandler', async (request, reply) => {
      if (request.url === '/health') return;

      const userId = request.headers['x-user-id'] as string;
      const companyId = request.headers['x-company-id'] as string;

      if (!userId || !companyId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      (request as any).tenant = { userId, companyId, role: 'analyst' };
    });

    registerCanvasRoutes(fastify, db);

    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`🚀 Builder Runtime v2 listening on ${HOST}:${PORT}`);
  } catch (error) {
    fastify.log.error({ error }, 'Failed to start');
    process.exit(1);
  }
=======
 * Builder Runtime Service
 * Compiles Builder JSON to query graphs, provides SSE streams, and generates export payloads
 */

import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { builderRoutes } from './routes/builder.js';

const logger = createServiceLogger('builder-runtime');
const PORT = parseInt(process.env.PORT_BUILDER_RUNTIME || '3016');

async function start() {
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register API routes
  app.register(async (instance) => {
    await instance.register(builderRoutes);
  });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);

    logger.info(`Builder Runtime Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info('  Health:');
    logger.info('    GET  /health - Health check');
    logger.info('    GET  /health/live - Liveness probe');
    logger.info('    GET  /health/ready - Readiness probe');
    logger.info('');
    logger.info('  Builder APIs:');
    logger.info('    POST /v1/builder/compile - Compile dashboard to query graph');
    logger.info('    POST /v1/builder/execute - Execute dashboard with SSE');
    logger.info('    POST /v1/builder/export/pdf - Generate PDF export payload');
    logger.info('    POST /v1/builder/export/pptx - Generate PPTX export payload');
    logger.info('    GET  /v1/builder/schema - Get schema version and docs');
    logger.info('');
    logger.info('Features:');
    logger.info('  - Builder JSON schema v1.0.0');
    logger.info('  - Query graph compilation');
    logger.info('  - SSE live updates');
    logger.info('  - PDF/PPTX export payloads with citations');
    logger.info('  - RBAC enforcement');
    logger.info('  - PII tracking');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);

    await app.close();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
>>>>>>> origin/claude/worker2-phaseG-nlq-builder-hil-013afuWXrNQq3R3P2SRcTM9M
}

start();
