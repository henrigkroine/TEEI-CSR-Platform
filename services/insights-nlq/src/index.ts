/**
<<<<<<< HEAD
<<<<<<< HEAD
 * Insights NLQ Service v2
 *
 * Natural Language Query service with RLS, multilingual support, and safety guardrails
 */

import Fastify from 'fastify';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { NLQDriver } from './inference/nlq-driver.js';
import { registerQueryRoutes } from './routes/query.js';
import { tenantScope } from './middleware/tenantScope.js';

const PORT = parseInt(process.env.PORT || '3008', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname'
            }
          }
        : undefined
  }
});

/**
 * Initialize database connections
 */
function initDatabase(): Pool {
  const pool = new Pool({
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT || '9000', 10),
    database: process.env.CLICKHOUSE_DATABASE || 'teei_csr',
    user: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  fastify.log.info('ClickHouse connection pool initialized');
  return pool;
}

/**
 * Initialize Redis cache
 */
function initRedis(): Redis {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('connect', () => {
    fastify.log.info('Redis cache connected');
  });

  redis.on('error', (error) => {
    fastify.log.error({ error }, 'Redis error');
  });

  return redis;
}

/**
 * Start server
 */
async function start() {
  try {
    // Initialize dependencies
    const clickhouse = initDatabase();
    const redis = initRedis();
    const nlqDriver = new NLQDriver();

    // Global error handler
    fastify.setErrorHandler((error, request, reply) => {
      request.log.error({ error }, 'Unhandled error');

      reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      });
    });

    // Mock authentication middleware (replace with actual auth in production)
    fastify.addHook('preHandler', async (request, reply) => {
      // Skip auth for health endpoint
      if (request.url === '/health') {
        return;
      }

      // Mock user from header (in production, validate JWT)
      const userId = request.headers['x-user-id'] as string;
      const companyId = request.headers['x-company-id'] as string;
      const role = request.headers['x-role'] as string || 'analyst';

      if (!userId || !companyId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Missing authentication headers (X-User-ID, X-Company-ID)'
        });
      }

      (request as any).user = {
        userId,
        companyId,
        role
      };
    });

    // Apply tenant scope middleware to all routes except health
    fastify.addHook('preHandler', async (request, reply) => {
      if (request.url === '/health') {
        return;
      }
      return tenantScope(request, reply);
    });

    // Register routes
    registerQueryRoutes(fastify, nlqDriver, clickhouse, redis);

    // Graceful shutdown
    const gracefulShutdown = async () => {
      fastify.log.info('Shutting down gracefully...');

      try {
        await fastify.close();
        await clickhouse.end();
        await redis.quit();
        process.exit(0);
      } catch (error) {
        fastify.log.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start listening
    await fastify.listen({ port: PORT, host: HOST });

    fastify.log.info(
      `🚀 Insights NLQ v2 service listening on ${HOST}:${PORT}`
    );
  } catch (error) {
    fastify.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
=======
 * Insights NLQ Service
 * Natural Language Query with guardrails, evidence linking, and safety verification
 */

import Fastify from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { createHealthManager, setupHealthRoutes } from './health/index.js';
import { nlqRoutes } from './routes/nlq.js';

const logger = createServiceLogger('insights-nlq');
const PORT = parseInt(process.env.PORT_INSIGHTS_NLQ || '3015');

async function start() {
=======
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
>>>>>>> origin/claude/worker2-phaseG2-insights-ga-01FXrGnKtHgmcZG2d8jpPRMf
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
<<<<<<< HEAD
  });

  // Setup health check manager
  const healthManager = createHealthManager();
  setupHealthRoutes(app, healthManager);
  healthManager.setAlive(true);

  // Check dependencies
  try {
    // Check ClickHouse
    if (process.env.CLICKHOUSE_URL) {
      healthManager.setDependency('clickhouse', true);
    }

    // Check Redis
    if (process.env.REDIS_URL) {
      healthManager.setDependency('redis', true);
    }

    // Check Anthropic API key
    if (process.env.ANTHROPIC_API_KEY) {
      healthManager.setDependency('anthropic', true);
    } else {
      logger.warn('ANTHROPIC_API_KEY not configured - NLQ planning will fail');
    }
  } catch (err) {
    logger.error('Failed to check dependencies:', err);
  }

  // Register API routes
  app.register(async (instance) => {
    await instance.register(nlqRoutes);
  });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    healthManager.setReady(true);

    logger.info(`Insights NLQ Service running on port ${PORT}`);
=======
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
>>>>>>> origin/claude/worker2-phaseG2-insights-ga-01FXrGnKtHgmcZG2d8jpPRMf
    logger.info('Available endpoints:');
    logger.info('  Health:');
    logger.info('    GET  /health - Health check');
    logger.info('    GET  /health/live - Liveness probe');
    logger.info('    GET  /health/ready - Readiness probe');
    logger.info('    GET  /health/dependencies - Dependencies health');
<<<<<<< HEAD
    logger.info('');
    logger.info('  NLQ APIs:');
    logger.info('    POST /v1/insights/nlq/query - Execute natural language query');
    logger.info('    POST /v1/insights/nlq/plan - Get query plan (debug)');
    logger.info('    GET  /v1/insights/nlq/metrics - List available metrics');
    logger.info('');
    logger.info('Environment:');
    logger.info(`  ClickHouse: ${process.env.CLICKHOUSE_URL || 'NOT configured'}`);
    logger.info(`  Redis: ${process.env.REDIS_URL || 'NOT configured'}`);
    logger.info(`  Anthropic: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT configured'}`);
    logger.info('');
    logger.info('Performance Targets:');
    logger.info('  - Plan time: ≤350ms avg');
    logger.info('  - End-to-end: ≤2.5s p95');
    logger.info('  - Citation: ≥1 per answer');
    logger.info('  - Safety: 100% verification pass rate');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    healthManager.setShuttingDown(true);

    await app.close();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
>>>>>>> origin/claude/worker2-phaseG-nlq-builder-hil-013afuWXrNQq3R3P2SRcTM9M
}

=======
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
>>>>>>> origin/claude/worker2-phaseG2-insights-ga-01FXrGnKtHgmcZG2d8jpPRMf
start();
