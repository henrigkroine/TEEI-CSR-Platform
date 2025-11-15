/**
 * Health Check Manager for builder-runtime service
 */

import type { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('health');

export interface HealthStatus {
  alive: boolean;
  ready: boolean;
  shuttingDown: boolean;
}

export class HealthManager {
  private status: HealthStatus = {
    alive: false,
    ready: false,
    shuttingDown: false,
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

  getStatus(): HealthStatus {
    return { ...this.status };
  }
}

export function createHealthManager(): HealthManager {
  return new HealthManager();
}

export function setupHealthRoutes(fastify: FastifyInstance, healthManager: HealthManager) {
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

  fastify.get('/health/live', async (request, reply) => {
    const status = healthManager.getStatus();
    return reply.code(status.alive ? 200 : 503).send({
      alive: status.alive,
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/health/ready', async (request, reply) => {
    const status = healthManager.getStatus();
    const isReady = status.ready && !status.shuttingDown;
    return reply.code(isReady ? 200 : 503).send({
      ready: isReady,
      shuttingDown: status.shuttingDown,
      timestamp: new Date().toISOString(),
    });
  });
}
