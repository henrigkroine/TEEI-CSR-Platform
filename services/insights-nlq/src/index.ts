/**
 * Insights NLQ Service - Main Entry Point
 *
 * Natural Language Query service with guard-railed NL→SQL/CHQL conversion.
 * Provides AI-powered query generation with safety checks and caching.
 *
 * Architecture:
 * - Fastify server with plugins for auth, rate limiting, CORS
 * - PostgreSQL for metadata and query templates
 * - Redis for query caching and rate limiting
 * - ClickHouse (optional) for analytics queries
 * - NATS for event publishing
 * - Claude/GPT for NL→SQL translation
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createServiceLogger } from '@teei/shared-utils';
import { config } from './config.js';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { createErrorHandler, createRequestLogger } from './middleware/error-handler.js';
import { initPostgres, closePostgres } from './lib/postgres.js';
import { initRedis, closeRedis } from './cache/redis.js';
import { getCacheWarmer, stopCacheWarmer } from './cache/cache-warmer.js';

// Route imports
import { nlqRoutes } from './routes/nlq.js';
import { templatesRoutes } from './routes/templates.js';
import { feedbackRoutes } from './routes/feedback.js';
import { adminRoutes } from './routes/admin.js';

// Optional imports
let initClickHouse: (() => Promise<void>) | null = null;
let closeClickHouse: (() => Promise<void>) | null = null;
let initNats: (() => Promise<void>) | null = null;
let closeNats: (() => Promise<void>) | null = null;

// Logger
const logger = createServiceLogger('insights-nlq');

// Health manager
const healthManager = createHealthManager();

// Cache warmer instance
let cacheWarmer: ReturnType<typeof getCacheWarmer> | null = null;

/**
 * Initialize the Fastify application
 */
async function createApp() {
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register CORS
  await app.register(cors, {
    origin: config.security.corsOrigin,
    credentials: true,
  });

  // Register rate limiting
  if (config.rateLimit.enabled) {
    await app.register(rateLimit, {
      max: config.rateLimit.maxRequests,
      timeWindow: config.rateLimit.windowMs,
      cache: 10000, // Cache size
      skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
      keyGenerator: (request) => {
        // Use user ID if authenticated, otherwise IP
        const authRequest = request as any;
        return authRequest.user?.userId || request.ip;
      },
      errorResponseBuilder: (request, context) => {
        return {
          success: false,
          error: 'RateLimitError',
          message: `Too many requests. Try again in ${Math.ceil(context.after / 1000)} seconds.`,
          retryAfter: Math.ceil(context.after / 1000),
          timestamp: new Date().toISOString(),
        };
      },
    });
  }

  // Register JWT authentication (optional - can be enabled with JWT_SECRET)
  if (config.security.jwtSecret) {
    const jwt = await import('@fastify/jwt');
    await app.register(jwt.default, {
      secret: config.security.jwtSecret,
    });
    logger.info('JWT authentication enabled');
  }

  // Setup health check routes first
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Register middleware
  app.addHook('onRequest', createRequestLogger());

  // Register error handler
  app.setErrorHandler(createErrorHandler());

  // Register API routes with versioning
  await app.register(async (instance) => {
    await instance.register(nlqRoutes);
    await instance.register(templatesRoutes);
    await instance.register(feedbackRoutes);
    await instance.register(adminRoutes);
  }, { prefix: '/v1/nlq' });

  // Prometheus metrics endpoint (if enabled)
  if (config.features.enablePrometheusMetrics) {
    try {
      const metricsPlugin = await import('./lib/metrics.js');
      await app.register(metricsPlugin.metricsRoutes);
      logger.info('Prometheus metrics enabled at /metrics');
    } catch (err) {
      logger.warn('Failed to enable Prometheus metrics', err);
    }
  }

  // Root endpoint
  app.get('/', async (request, reply) => {
    return {
      service: 'insights-nlq',
      version: '1.0.0',
      status: 'running',
      documentation: '/v1/nlq/docs',
      health: '/health',
      metrics: config.features.enablePrometheusMetrics ? '/metrics' : undefined,
    };
  });

  return app;
}

/**
 * Initialize all dependencies
 */
async function initDependencies() {
  logger.info('Initializing dependencies...');

  // Initialize PostgreSQL
  await initPostgres();
  logger.info('PostgreSQL connected');

  // Initialize Redis
  await initRedis();
  logger.info('Redis connected');

  // Initialize ClickHouse (optional)
  if (config.features.enableClickHouse && config.clickhouse) {
    try {
      const clickhouse = await import('./lib/clickhouse.js');
      initClickHouse = clickhouse.initClickHouse;
      closeClickHouse = clickhouse.closeClickHouse;
      await initClickHouse();
      logger.info('ClickHouse connected');
    } catch (err) {
      logger.warn('ClickHouse initialization failed', err);
    }
  }

  // Initialize NATS (optional)
  if (config.features.enableNatsEvents) {
    try {
      const nats = await import('./lib/nats.js');
      initNats = nats.initNats;
      closeNats = nats.closeNats;
      await initNats();
      logger.info('NATS connected');
    } catch (err) {
      logger.warn('NATS initialization failed', err);
    }
  }

  // Start cache warmer (optional)
  if (config.features.enableCacheWarming) {
    cacheWarmer = getCacheWarmer();
    await cacheWarmer.start();
    logger.info('Cache warmer started');
  }

  logger.info('All dependencies initialized');
}

/**
 * Graceful shutdown handler
 */
async function shutdown(app: Awaited<ReturnType<typeof createApp>>) {
  logger.info('Shutting down gracefully...');
  healthManager.setShuttingDown(true);

  // Stop accepting new requests
  await app.close();
  logger.info('Fastify server closed');

  // Stop cache warmer
  if (cacheWarmer) {
    stopCacheWarmer();
    logger.info('Cache warmer stopped');
  }

  // Close connections in parallel
  const closePromises: Promise<void>[] = [
    closePostgres(),
    closeRedis(),
  ];

  if (closeClickHouse) {
    closePromises.push(closeClickHouse());
  }

  if (closeNats) {
    closePromises.push(closeNats());
  }

  await Promise.all(closePromises);
  logger.info('All connections closed');

  logger.info('Shutdown complete');
  process.exit(0);
}

/**
 * Start the service
 */
async function start() {
  try {
    // Log startup banner
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  Insights NLQ Service - Natural Language Query Engine');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');

    // Initialize dependencies
    await initDependencies();

    // Create Fastify app
    const app = await createApp();

    // Start server
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    // Mark as ready
    healthManager.setReady(true);

    // Log startup info
    logger.info('');
    logger.info(`✓ Insights NLQ Service running on port ${config.server.port}`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info('  Health:');
    logger.info('    GET  /health - Health check');
    logger.info('    GET  /health/live - Liveness probe');
    logger.info('    GET  /health/ready - Readiness probe');
    logger.info('    GET  /health/dependencies - Dependencies health');
    logger.info('    GET  /health/cache - Cache statistics');
    logger.info('');
    logger.info('  NLQ APIs:');
    logger.info('    POST /v1/nlq/query - Natural language query');
    logger.info('    POST /v1/nlq/explain - Explain generated SQL');
    logger.info('    GET  /v1/nlq/history - Query history');
    logger.info('');
    logger.info('  Templates:');
    logger.info('    GET  /v1/nlq/templates - List templates');
    logger.info('    POST /v1/nlq/templates/:id/use - Use template');
    logger.info('');
    logger.info('  Feedback:');
    logger.info('    POST /v1/nlq/feedback - Submit feedback');
    logger.info('');
    logger.info('  Admin:');
    logger.info('    GET  /v1/nlq/admin/stats - Service statistics');
    logger.info('    GET  /v1/nlq/admin/queries - Recent queries');
    logger.info('    POST /v1/nlq/admin/cache/clear - Clear cache');
    logger.info('');
    logger.info('Environment:');
    logger.info(`  Environment: ${config.server.env}`);
    logger.info(`  LLM Provider: ${config.llm.defaultProvider}`);
    logger.info(`  LLM Model: ${config.llm.defaultModel}`);
    logger.info(`  PostgreSQL: ${config.database.postgresUrl.split('@')[1] || 'configured'}`);
    logger.info(`  Redis: ${config.redis.url.split('@')[1] || 'configured'}`);
    if (config.clickhouse?.enabled) {
      logger.info(`  ClickHouse: ${config.clickhouse.url}`);
    }
    if (config.features.enableNatsEvents) {
      logger.info(`  NATS: ${config.nats.url}`);
    }
    logger.info('');
    logger.info('Features:');
    logger.info(`  ClickHouse: ${config.features.enableClickHouse ? '✓' : '✗'}`);
    logger.info(`  Cache Warming: ${config.features.enableCacheWarming ? '✓' : '✗'}`);
    logger.info(`  NATS Events: ${config.features.enableNatsEvents ? '✓' : '✗'}`);
    logger.info(`  Prometheus: ${config.features.enablePrometheusMetrics ? '✓' : '✗'}`);
    logger.info(`  Safety Checks: ${config.features.enableSafetyChecks ? '✓' : '✗'}`);
    logger.info(`  Rate Limiting: ${config.rateLimit.enabled ? '✓' : '✗'}`);
    logger.info('');
    logger.info('Performance:');
    logger.info(`  Max Concurrent Queries: ${config.performance.maxConcurrentQueries}`);
    logger.info(`  Query Timeout: ${config.performance.queryTimeout}ms`);
    logger.info(`  Max Result Rows: ${config.performance.maxResultRows}`);
    logger.info('');

    // Setup graceful shutdown
    process.on('SIGINT', () => shutdown(app));
    process.on('SIGTERM', () => shutdown(app));

  } catch (err) {
    logger.error(err, 'Failed to start service');
    process.exit(1);
  }
}

// Start the service
start();
