import Fastify from 'fastify';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';
import { webhookRoutes } from './routes/webhooks.js';

const logger = createServiceLogger('buddy-connector');
const PORT = parseInt(process.env.PORT_BUDDY_CONNECTOR || '3010');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'buddy-connector',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Register webhook routes
  app.register(webhookRoutes, { prefix: '/webhooks' });

  // Connect to event bus
  const eventBus = getEventBus();
  await eventBus.connect();

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Buddy Connector Service running on port ${PORT}`);
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
