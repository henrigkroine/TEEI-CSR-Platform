import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { getEventBus } from '@teei/shared-utils';
import { screenRoutes } from './routes/screen.js';

const logger = createServiceLogger('safety-moderation');
const PORT = parseInt(process.env.PORT_SAFETY_MODERATION || '3006');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'safety-moderation',
      timestamp: new Date().toISOString(),
    };
  });

  // Register screening routes
  app.register(screenRoutes);

  // Connect to event bus
  const eventBus = getEventBus();
  await eventBus.connect();

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Safety Moderation Service running on port ${PORT}`);
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
