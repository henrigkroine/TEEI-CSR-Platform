/**
 * Health Check Endpoints for Impact-In Service
 * Provides liveness, readiness, and startup probes
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:health');

export interface HealthManager {
  setAlive: (alive: boolean) => void;
  setReady: (ready: boolean) => void;
  setShuttingDown: (shuttingDown: boolean) => void;
  getStatus: () => HealthStatus;
}

export interface HealthStatus {
  alive: boolean;
  ready: boolean;
  shuttingDown: boolean;
  uptime: number;
  timestamp: string;
}

/**
 * Create health check manager
 */
export function createHealthManager(): HealthManager {
  const startTime = Date.now();
  let alive = false;
  let ready = false;
  let shuttingDown = false;

  return {
    setAlive: (value: boolean) => {
      alive = value;
      logger.info('Health status changed', { alive: value });
    },
    setReady: (value: boolean) => {
      ready = value;
      logger.info('Readiness status changed', { ready: value });
    },
    setShuttingDown: (value: boolean) => {
      shuttingDown = value;
      if (value) {
        ready = false; // Not ready when shutting down
      }
      logger.info('Shutdown status changed', { shuttingDown: value });
    },
    getStatus: () => ({
      alive,
      ready,
      shuttingDown,
      uptime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Setup health check routes
 */
export function setupHealthRoutes(app: FastifyInstance, healthManager: HealthManager) {
  /**
   * GET /health/liveness
   * Kubernetes liveness probe - indicates if the service is running
   */
  app.get('/health/liveness', async (request: FastifyRequest, reply: FastifyReply) => {
    const status = healthManager.getStatus();

    if (!status.alive) {
      return reply.status(503).send({
        status: 'down',
        alive: false,
        timestamp: status.timestamp,
      });
    }

    return reply.status(200).send({
      status: 'ok',
      alive: true,
      uptime: status.uptime,
      timestamp: status.timestamp,
    });
  });

  /**
   * GET /health/readiness
   * Kubernetes readiness probe - indicates if the service can accept traffic
   */
  app.get('/health/readiness', async (request: FastifyRequest, reply: FastifyReply) => {
    const status = healthManager.getStatus();

    if (!status.ready || status.shuttingDown) {
      return reply.status(503).send({
        status: 'not_ready',
        ready: false,
        shuttingDown: status.shuttingDown,
        timestamp: status.timestamp,
      });
    }

    return reply.status(200).send({
      status: 'ready',
      ready: true,
      uptime: status.uptime,
      timestamp: status.timestamp,
    });
  });

  /**
   * GET /health/startup
   * Kubernetes startup probe - indicates if the service has finished starting up
   */
  app.get('/health/startup', async (request: FastifyRequest, reply: FastifyReply) => {
    const status = healthManager.getStatus();

    if (!status.ready) {
      return reply.status(503).send({
        status: 'starting',
        ready: false,
        timestamp: status.timestamp,
      });
    }

    return reply.status(200).send({
      status: 'started',
      ready: true,
      uptime: status.uptime,
      timestamp: status.timestamp,
    });
  });

  /**
   * GET /health
   * Detailed health check with all statuses
   */
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const status = healthManager.getStatus();

    return reply.status(status.ready ? 200 : 503).send({
      service: 'impact-in',
      version: '1.0.0',
      status: status.ready ? 'healthy' : 'unhealthy',
      checks: {
        alive: status.alive,
        ready: status.ready,
        shuttingDown: status.shuttingDown,
      },
      uptime: status.uptime,
      timestamp: status.timestamp,
    });
  });
}
