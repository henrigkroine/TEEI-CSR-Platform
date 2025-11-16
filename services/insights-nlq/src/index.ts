/**
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
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
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
    logger.info('Available endpoints:');
    logger.info('  Health:');
    logger.info('    GET  /health - Health check');
    logger.info('    GET  /health/live - Liveness probe');
    logger.info('    GET  /health/ready - Readiness probe');
    logger.info('    GET  /health/dependencies - Dependencies health');
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

start();
