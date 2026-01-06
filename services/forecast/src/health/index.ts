import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { healthCheck as redisHealthCheck } from '../lib/cache.js';

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

export function setupHealthRoutes(
  app: FastifyInstance,
  manager: ReturnType<typeof createHealthManager>
) {
  /**
   * GET /health
   * Basic health check
   */
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
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
  app.get('/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
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
  app.get('/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const state = manager.getState();

    if (!state.ready || state.shuttingDown) {
      return reply.status(503).send({
        status: 'not ready',
        ready: false,
      });
    }

    // Check Redis dependency
    const redisOk = await redisHealthCheck();

    if (!redisOk) {
      return reply.status(503).send({
        status: 'not ready',
        ready: false,
        dependencies: {
          redis: redisOk,
        },
      });
    }

    return reply.send({
      status: 'ready',
      ready: true,
      dependencies: {
        redis: redisOk,
      },
    });
  });

  /**
   * GET /health/dependencies
   * Detailed dependency health check
   */
  app.get('/health/dependencies', async (_request: FastifyRequest, reply: FastifyReply) => {
    const redisOk = await redisHealthCheck();

    return reply.status(redisOk ? 200 : 503).send({
      status: redisOk ? 'healthy' : 'degraded',
      dependencies: {
        redis: {
          status: redisOk ? 'healthy' : 'unhealthy',
          required: true,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });
}
