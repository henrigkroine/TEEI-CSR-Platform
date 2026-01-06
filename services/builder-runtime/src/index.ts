/**
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
}

start();
