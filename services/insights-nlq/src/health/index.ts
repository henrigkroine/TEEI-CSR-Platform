/**
 * Health Check System for Insights NLQ Service
 *
 * Provides Kubernetes-compatible health probes and dependency monitoring.
 * Follows patterns from analytics and reporting services.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { healthCheck as postgresHealthCheck } from '../lib/postgres.js';
import { healthCheck as redisHealthCheck, getCacheStats } from '../cache/redis.js';
import { config } from '../config.js';

// ClickHouse health check (conditional)
let clickhouseHealthCheck: (() => Promise<boolean>) | null = null;
if (config.features.enableClickHouse && config.clickhouse) {
  import('../lib/clickhouse.js').then(module => {
    clickhouseHealthCheck = module.healthCheck;
  }).catch(() => {
    console.warn('ClickHouse module not available');
  });
}

// NATS health check (conditional)
let natsHealthCheck: (() => Promise<boolean>) | null = null;
if (config.features.enableNatsEvents) {
  import('../lib/nats.js').then(module => {
    natsHealthCheck = module.healthCheck;
  }).catch(() => {
    console.warn('NATS module not available');
  });
}

interface HealthState {
  alive: boolean;
  ready: boolean;
  shuttingDown: boolean;
  startTime: Date;
}

let healthState: HealthState = {
  alive: false,
  ready: false,
  shuttingDown: false,
  startTime: new Date(),
};

/**
 * Health Manager API
 * Controls service health state for graceful startup/shutdown
 */
export function createHealthManager() {
  return {
    setAlive: (alive: boolean) => {
      healthState.alive = alive;
    },
    setReady: (ready: boolean) => {
      healthState.ready = ready;
    },
    setShuttingDown: (shuttingDown: boolean) => {
      healthState.shuttingDown = shuttingDown;
      if (shuttingDown) {
        healthState.ready = false;
      }
    },
    getState: () => ({ ...healthState }),
  };
}

/**
 * Register all health check routes
 */
export function setupHealthRoutes(
  app: FastifyInstance,
  manager: ReturnType<typeof createHealthManager>
) {
  /**
   * GET /health
   * Basic health check - returns service status
   */
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = manager.getState();

    if (!state.alive) {
      return reply.status(503).send({
        status: 'unavailable',
        alive: false,
        service: 'insights-nlq',
      });
    }

    const uptime = Date.now() - state.startTime.getTime();

    return reply.send({
      status: 'ok',
      alive: true,
      ready: state.ready,
      service: 'insights-nlq',
      version: '1.0.0',
      uptime: Math.floor(uptime / 1000), // seconds
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/live
   * Kubernetes liveness probe
   * Returns 200 if service is alive, 503 if dead or shutting down
   */
  app.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = manager.getState();

    if (!state.alive || state.shuttingDown) {
      return reply.status(503).send({
        status: 'not alive',
        alive: false,
        shuttingDown: state.shuttingDown,
      });
    }

    return reply.send({
      status: 'alive',
      alive: true,
    });
  });

  /**
   * GET /health/ready
   * Kubernetes readiness probe
   * Returns 200 if service is ready to accept traffic, 503 otherwise
   */
  app.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = manager.getState();

    if (!state.ready || state.shuttingDown) {
      return reply.status(503).send({
        status: 'not ready',
        ready: false,
        shuttingDown: state.shuttingDown,
      });
    }

    // Check critical dependencies
    const [postgresOk, redisOk] = await Promise.all([
      postgresHealthCheck().catch(() => false),
      redisHealthCheck().catch(() => false),
    ]);

    const criticalDepsOk = postgresOk && redisOk;

    if (!criticalDepsOk) {
      return reply.status(503).send({
        status: 'not ready',
        ready: false,
        reason: 'Critical dependencies unhealthy',
        dependencies: {
          postgres: postgresOk,
          redis: redisOk,
        },
      });
    }

    return reply.send({
      status: 'ready',
      ready: true,
      dependencies: {
        postgres: postgresOk,
        redis: redisOk,
      },
    });
  });

  /**
   * GET /health/dependencies
   * Detailed dependency health check
   * Returns status of all connected services
   */
  app.get('/health/dependencies', async (request: FastifyRequest, reply: FastifyReply) => {
    const checks = await Promise.allSettled([
      postgresHealthCheck(),
      redisHealthCheck(),
      clickhouseHealthCheck ? clickhouseHealthCheck() : Promise.resolve(null),
      natsHealthCheck ? natsHealthCheck() : Promise.resolve(null),
      getCacheStats().catch(() => ({ hits: 0, misses: 0, keys: 0, memory: '0B' })),
    ]);

    const [postgresResult, redisResult, clickhouseResult, natsResult, cacheStatsResult] = checks;

    const postgresOk = postgresResult.status === 'fulfilled' && postgresResult.value === true;
    const redisOk = redisResult.status === 'fulfilled' && redisResult.value === true;
    const clickhouseOk = clickhouseResult.status === 'fulfilled' && clickhouseResult.value === true;
    const natsOk = natsResult.status === 'fulfilled' && natsResult.value === true;
    const cacheStats = cacheStatsResult.status === 'fulfilled'
      ? cacheStatsResult.value
      : { hits: 0, misses: 0, keys: 0, memory: '0B' };

    // Critical dependencies: PostgreSQL, Redis
    const criticalDepsOk = postgresOk && redisOk;

    // Optional dependencies: ClickHouse, NATS
    const optionalDepsOk = (
      (!config.features.enableClickHouse || clickhouseOk) &&
      (!config.features.enableNatsEvents || natsOk)
    );

    const allHealthy = criticalDepsOk && optionalDepsOk;

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'degraded',
      dependencies: {
        postgres: {
          status: postgresOk ? 'healthy' : 'unhealthy',
          required: true,
        },
        redis: {
          status: redisOk ? 'healthy' : 'unhealthy',
          required: true,
          stats: cacheStats,
        },
        clickhouse: config.features.enableClickHouse ? {
          status: clickhouseOk ? 'healthy' : 'unhealthy',
          required: false,
          enabled: true,
        } : {
          status: 'disabled',
          required: false,
          enabled: false,
        },
        nats: config.features.enableNatsEvents ? {
          status: natsOk ? 'healthy' : 'unhealthy',
          required: false,
          enabled: true,
        } : {
          status: 'disabled',
          required: false,
          enabled: false,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/cache
   * Cache statistics endpoint
   * Returns Redis cache performance metrics
   */
  app.get('/health/cache', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await getCacheStats();

      const hitRate = stats.hits + stats.misses > 0
        ? (stats.hits / (stats.hits + stats.misses)) * 100
        : 0;

      return reply.send({
        status: 'ok',
        stats: {
          ...stats,
          hitRate: parseFloat(hitRate.toFixed(2)),
          hitRatePercent: `${hitRate.toFixed(2)}%`,
        },
        config: {
          defaultTTL: config.redis.defaultTTL,
          keyPrefix: config.redis.keyPrefix,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch cache stats');
      return reply.status(500).send({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
