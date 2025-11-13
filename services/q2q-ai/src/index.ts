import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { classifyRoutes } from './routes/classify.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';

const logger = createServiceLogger('q2q-ai');
const PORT = parseInt(process.env.PORT_Q2Q_AI || '3005');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register routes with API versioning
  app.register(classifyRoutes, { prefix: '/v1' });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Q2Q AI Service running on port ${PORT}`);
    logger.info('Available endpoints:');
    logger.info(`  GET  /health - Health check`);
    logger.info(`  POST /classify/text - Classify text and store outcome scores`);
    logger.info(`  GET  /taxonomy - Get outcome dimension definitions`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
