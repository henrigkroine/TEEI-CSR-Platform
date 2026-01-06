import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { getEventBus } from '@teei/shared-utils';
import { screenRoutes } from './routes/screen.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';

const logger = createServiceLogger('safety-moderation');
const PORT = parseInt(process.env.PORT_SAFETY_MODERATION || '3022');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register screening routes with API versioning
  app.register(screenRoutes, { prefix: '/v1' });

  // Connect to event bus
  const eventBus = getEventBus();
  await eventBus.connect();

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);
    logger.info(`Safety Moderation Service running on port ${PORT}`);
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
