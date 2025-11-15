/**
 * Privacy Orchestrator Service
 *
 * Production-grade DSAR orchestration with:
 * - Regional execution
 * - SLA tracking
 * - Job queue with retries
 * - Audit logging
 * - Metrics and monitoring
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Redis } from 'ioredis';
import { createRegionalExecutor } from './lib/regional-executor.js';
import { createQueueManager } from './jobs/queue-manager.js';
import { createSlaTracker } from './lib/sla-tracker.js';
import { registerPrivacyRoutes } from './routes/privacy.js';
import pino from 'pino';

const logger = pino({ name: 'privacy-orchestrator' });

/**
 * Configuration
 */
const config = {
  port: parseInt(process.env.PORT || '3010', 10),
  host: process.env.HOST || '0.0.0.0',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
};

/**
 * Create app
 */
async function createApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register plugins
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  // Create Redis connection
  const redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redis.on('error', (err) => {
    logger.error({ error: err }, 'Redis connection error');
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  // Create regional executor
  const regionalExecutor = createRegionalExecutor();
  logger.info(
    { regions: regionalExecutor.getEnabledRegions() },
    'Regional executor initialized'
  );

  // Create SLA tracker
  const slaTracker = createSlaTracker();
  logger.info('SLA tracker initialized');

  // Create queue manager
  const queueManager = createQueueManager(redis, regionalExecutor);
  logger.info('Queue manager initialized');

  // Register routes
  await registerPrivacyRoutes(app, queueManager, slaTracker);
  logger.info('Privacy routes registered');

  // Root endpoint
  app.get('/', async (request, reply) => {
    reply.send({
      service: 'Privacy Orchestrator',
      version: '1.0.0',
      status: 'healthy',
      endpoints: [
        'POST /privacy/export - Export user data',
        'POST /privacy/delete - Delete user data',
        'GET /privacy/status/:jobId - Get job status',
        'POST /privacy/consent - Update consent',
        'GET /privacy/consent/:userId - Get consent status',
        'GET /privacy/metrics/sla - Get SLA metrics',
        'GET /privacy/metrics/queue - Get queue metrics',
        'GET /privacy/health - Health check',
      ],
    });
  });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error({ error, url: request.url }, 'Request error');

    if (error.validation) {
      reply.code(400).send({
        success: false,
        error: 'Validation error',
        details: error.validation,
      });
      return;
    }

    reply.code(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal server error',
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');

    try {
      await queueManager.close();
      await regionalExecutor.close();
      await redis.quit();
      await app.close();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return app;
}

/**
 * Start server
 */
async function start() {
  try {
    const app = await createApp();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(
      { port: config.port, host: config.host },
      'Privacy Orchestrator started'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { createApp };
