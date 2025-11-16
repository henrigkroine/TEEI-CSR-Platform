/**
 * Health Check Manager for insights-nlq service
 */

import type { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('health');

export interface HealthStatus {
  alive: boolean;
  ready: boolean;
  shuttingDown: boolean;
  dependencies: {
    clickhouse: boolean;
    redis: boolean;
    anthropic: boolean;
  };
}

export class HealthManager {
  private status: HealthStatus = {
    alive: false,
    ready: false,
    shuttingDown: false,
    dependencies: {
      clickhouse: false,
      redis: false,
      anthropic: false,
    },
  };

  setAlive(alive: boolean) {
    this.status.alive = alive;
  }

  setReady(ready: boolean) {
    this.status.ready = ready;
  }

  setShuttingDown(shuttingDown: boolean) {
    this.status.shuttingDown = shuttingDown;
  }

  setDependency(name: keyof HealthStatus['dependencies'], healthy: boolean) {
    this.status.dependencies[name] = healthy;
  }

  getStatus(): HealthStatus {
    return { ...this.status };
  }
}

export function createHealthManager(): HealthManager {
  return new HealthManager();
}

export function setupHealthRoutes(fastify: FastifyInstance, healthManager: HealthManager) {
  // Combined health check
  fastify.get('/health', async (request, reply) => {
    const status = healthManager.getStatus();
    const isHealthy = status.alive && status.ready && !status.shuttingDown;

    return reply.code(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'healthy' : 'unhealthy',
      alive: status.alive,
      ready: status.ready,
      shuttingDown: status.shuttingDown,
      timestamp: new Date().toISOString(),
    });
  });

  // Liveness probe (for k8s)
  fastify.get('/health/live', async (request, reply) => {
    const status = healthManager.getStatus();
    return reply.code(status.alive ? 200 : 503).send({
      alive: status.alive,
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe (for k8s)
  fastify.get('/health/ready', async (request, reply) => {
    const status = healthManager.getStatus();
    const isReady = status.ready && !status.shuttingDown;
    return reply.code(isReady ? 200 : 503).send({
      ready: isReady,
      shuttingDown: status.shuttingDown,
      timestamp: new Date().toISOString(),
    });
  });

  // Dependencies health
  fastify.get('/health/dependencies', async (request, reply) => {
    const status = healthManager.getStatus();
    const allHealthy = Object.values(status.dependencies).every((d) => d);

    return reply.code(allHealthy ? 200 : 503).send({
      healthy: allHealthy,
      dependencies: status.dependencies,
      timestamp: new Date().toISOString(),
    });
  });
}
