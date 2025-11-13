import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';
import { importRoutes } from './routes/import.js';

const logger = createServiceLogger('upskilling-connector');
const PORT = parseInt(process.env.PORT_UPSKILLING_CONNECTOR || '3004');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Register multipart for file uploads
  app.register(multipart);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', service: 'upskilling-connector', timestamp: new Date().toISOString() };
  });

  // Register routes
  app.register(importRoutes, { prefix: '/import' });

  // Connect to event bus
  const eventBus = getEventBus();
  await eventBus.connect();

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Upskilling Connector Service running on port ${PORT}`);
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
