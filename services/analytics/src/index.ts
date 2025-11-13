import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';
import { metricsRoutes } from './routes/metrics.js';
import { cohortRoutes } from './routes/cohort.js';
import { streamRoutes } from './routes/stream.js';
import { initRedis, healthCheck as redisHealthCheck, disconnect as redisDisconnect } from './cache/redis.js';
import { subscribeToInvalidationEvents } from './cache/invalidation.js';
import { initNATSBridge, shutdownNATSBridge } from './stream/nats-bridge.js';
import { initClickHouseSink, stopClickHouseSink } from './sinks/clickhouse.js';
import { getClickHouseClient, isClickHouseEnabled } from './sinks/clickhouse-client.js';

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

    // Check ClickHouse health if enabled
    let clickhouseHealthy = false;
    if (isClickHouseEnabled()) {
      try {
        const ch = getClickHouseClient();
        clickhouseHealthy = await ch.ping();
      } catch (error) {
        logger.error({ error }, 'ClickHouse health check failed');
      }
    }

    return {
      status: 'ok',
      service: 'analytics',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: redis.healthy ? 'ok' : 'degraded',
        clickhouse: isClickHouseEnabled()
          ? (clickhouseHealthy ? 'ok' : 'degraded')
          : 'disabled',
      },
      features: {
        streaming: process.env.STREAMING_ENABLED === 'true',
        clickhouse: isClickHouseEnabled(),
      },
    };
  });

  // Register routes
  app.register(metricsRoutes, { prefix: '/metrics' });
  app.register(cohortRoutes, { prefix: '/cohort' });
  app.register(streamRoutes, { prefix: '/stream' });

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

  // Initialize SSE streaming (if enabled)
  if (process.env.STREAMING_ENABLED === 'true') {
    try {
      await initNATSBridge();
      logger.info('SSE streaming initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize SSE streaming');
    }
  } else {
    logger.info('SSE streaming disabled by configuration');
  }

  // Initialize ClickHouse sink (if enabled)
  if (isClickHouseEnabled()) {
    try {
      await initClickHouseSink();
      logger.info('ClickHouse event sink initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize ClickHouse sink - analytics DW will not be populated');
    }
  } else {
    logger.info('ClickHouse analytics disabled by configuration');
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

    // Shutdown SSE streaming
    if (process.env.STREAMING_ENABLED === 'true') {
      try {
        await shutdownNATSBridge();
      } catch (error) {
        logger.error({ error }, 'Error shutting down SSE streaming');
      }
    }

    // Shutdown ClickHouse sink
    if (isClickHouseEnabled()) {
      try {
        await stopClickHouseSink();
      } catch (error) {
        logger.error({ error }, 'Error shutting down ClickHouse sink');
      }
    }

    await eventBus.disconnect();
    await redisDisconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
