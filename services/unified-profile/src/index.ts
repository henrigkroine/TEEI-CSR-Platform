import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { getEventBus } from '@teei/shared-utils';
import { profileRoutes } from './routes/profile.js';
import { setupSubscribers } from './subscribers/index.js';

const logger = createServiceLogger('unified-profile');
const PORT = parseInt(process.env.PORT_UNIFIED_PROFILE || '3001');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', service: 'unified-profile', timestamp: new Date().toISOString() };
  });

  // Register routes with API versioning
  app.register(profileRoutes, { prefix: '/v1/profile' });

  // Connect to event bus and setup subscribers
  const eventBus = getEventBus();
  await eventBus.connect();
  await setupSubscribers(eventBus);

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Unified Profile Service running on port ${PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await eventBus.disconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
