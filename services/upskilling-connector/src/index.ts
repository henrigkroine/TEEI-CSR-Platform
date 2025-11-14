import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';
import { importRoutes } from './routes/import.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';

const logger = createServiceLogger('upskilling-connector');
const PORT = parseInt(process.env.PORT_UPSKILLING_CONNECTOR || '3004');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Register multipart for file uploads
  app.register(multipart);

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register routes with API versioning
  app.register(importRoutes, { prefix: '/v1/import' });

  // Connect to event bus
  const eventBus = getEventBus();
  await eventBus.connect();

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Upskilling Connector Service running on port ${PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);
    await eventBus.disconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
