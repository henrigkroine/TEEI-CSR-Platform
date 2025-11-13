import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';
import { metricsRoutes } from './routes/metrics.js';
import { initRedis, healthCheck as redisHealthCheck, disconnect as redisDisconnect } from './cache/redis.js';
import { subscribeToInvalidationEvents } from './cache/invalidation.js';

const logger = createServiceLogger('analytics');
const PORT = parseInt(process.env.PORT_ANALYTICS || '3007');

async function start() {
  const app = Fastify({
    logger: logger as any,
  });

  // Register CORS
  app.register(cors, {
    origin: true, // Allow all origins in development
  });

  // Initialize Redis
  try {
    initRedis();
    logger.info('Redis client initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Redis - caching will be disabled');
  }

  // Health check
  app.get('/health', async () => {
    const redis = await redisHealthCheck();
    return {
      status: 'ok',
      service: 'analytics',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: redis.healthy ? 'ok' : 'degraded',
      },
    };
  });

  // Register routes
  app.register(metricsRoutes, { prefix: '/metrics' });

  // Connect to event bus
  const eventBus = getEventBus();
  await eventBus.connect();

  // Subscribe to cache invalidation events
  try {
    await subscribeToInvalidationEvents();
    logger.info('Cache invalidation event subscriptions established');
  } catch (error) {
    logger.error({ error }, 'Failed to subscribe to invalidation events - cache may become stale');
  }

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Analytics Service running on port ${PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await eventBus.disconnect();
    await redisDisconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
