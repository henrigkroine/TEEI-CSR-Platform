import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { healthCheck as clickhouseHealthCheck } from '../lib/clickhouse-client.js';
import { healthCheck as redisHealthCheck, getCacheStats } from '../lib/cache.js';

interface HealthState {
  alive: boolean;
  ready: boolean;
  shuttingDown: boolean;
}

let healthState: HealthState = {
  alive: false,
  ready: false,
  shuttingDown: false,
};

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

export function setupHealthRoutes(app: FastifyInstance, manager: ReturnType<typeof createHealthManager>) {
  /**
   * GET /health
   * Basic health check
   */
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = manager.getState();

    if (!state.alive) {
      return reply.status(503).send({
        status: 'unavailable',
        alive: false,
      });
    }

    return reply.send({
      status: 'ok',
      alive: true,
      ready: state.ready,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/live
   * Kubernetes liveness probe
   */
  app.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = manager.getState();

    if (!state.alive || state.shuttingDown) {
      return reply.status(503).send({
        status: 'not alive',
        alive: false,
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
   */
  app.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const state = manager.getState();

    if (!state.ready || state.shuttingDown) {
      return reply.status(503).send({
        status: 'not ready',
        ready: false,
      });
    }

    // Check dependencies
    const clickhouseOk = await clickhouseHealthCheck();
    const redisOk = await redisHealthCheck();

    if (!clickhouseOk || !redisOk) {
      return reply.status(503).send({
        status: 'not ready',
        ready: false,
        dependencies: {
          clickhouse: clickhouseOk,
          redis: redisOk,
        },
      });
    }

    return reply.send({
      status: 'ready',
      ready: true,
      dependencies: {
        clickhouse: clickhouseOk,
        redis: redisOk,
      },
    });
  });

  /**
   * GET /health/dependencies
   * Detailed dependency health check
   */
  app.get('/health/dependencies', async (request: FastifyRequest, reply: FastifyReply) => {
    const [clickhouseOk, redisOk, cacheStats] = await Promise.all([
      clickhouseHealthCheck(),
      redisHealthCheck(),
      getCacheStats().catch(() => ({ hits: 0, misses: 0, keys: 0, memory: '0B' })),
    ]);

    const allHealthy = clickhouseOk && redisOk;

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'degraded',
      dependencies: {
        clickhouse: {
          status: clickhouseOk ? 'healthy' : 'unhealthy',
          required: true,
        },
        redis: {
          status: redisOk ? 'healthy' : 'unhealthy',
          required: true,
          stats: cacheStats,
        },
        postgres: {
          status: 'unknown', // Could add Postgres health check
          required: true,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/cache
   * Cache statistics endpoint
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
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return reply.status(500).send({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
