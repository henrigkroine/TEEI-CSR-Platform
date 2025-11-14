import { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { verifySendGridConfig } from '../providers/sendgrid.js';
import { verifyTwilioConfig } from '../providers/twilio-stub.js';
import { verifyFCMConfig } from '../providers/fcm-stub.js';
import { checkRedisHealth } from '../lib/rate-limiter.js';
import { getQueueStatus } from '../workers/email-worker.js';

const logger = createServiceLogger('notifications:health');

interface HealthStatus {
  alive: boolean;
  ready: boolean;
  shuttingDown: boolean;
}

/**
 * Health manager for service health checks
 */
export class HealthManager {
  private status: HealthStatus = {
    alive: false,
    ready: false,
    shuttingDown: false,
  };

  setAlive(alive: boolean): void {
    this.status.alive = alive;
    logger.info(`Health status - alive: ${alive}`);
  }

  setReady(ready: boolean): void {
    this.status.ready = ready;
    logger.info(`Health status - ready: ${ready}`);
  }

  setShuttingDown(shuttingDown: boolean): void {
    this.status.shuttingDown = shuttingDown;
    logger.info(`Health status - shutting down: ${shuttingDown}`);
  }

  getStatus(): HealthStatus {
    return { ...this.status };
  }

  isHealthy(): boolean {
    return this.status.alive && this.status.ready && !this.status.shuttingDown;
  }
}

/**
 * Create health manager instance
 */
export function createHealthManager(): HealthManager {
  return new HealthManager();
}

/**
 * Setup health check routes
 */
export function setupHealthRoutes(
  app: FastifyInstance,
  healthManager: HealthManager
): void {
  /**
   * GET /health - Basic health check
   */
  app.get('/health', async (request, reply) => {
    const status = healthManager.getStatus();
    const isHealthy = healthManager.isHealthy();

    reply.code(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'healthy' : 'unhealthy',
      alive: status.alive,
      ready: status.ready,
      shuttingDown: status.shuttingDown,
      timestamp: new Date().toISOString(),
      service: 'notifications',
    });
  });

  /**
   * GET /health/live - Liveness probe (for K8s)
   */
  app.get('/health/live', async (request, reply) => {
    const status = healthManager.getStatus();
    reply.code(status.alive ? 200 : 503).send({
      alive: status.alive,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/ready - Readiness probe (for K8s)
   */
  app.get('/health/ready', async (request, reply) => {
    const status = healthManager.getStatus();
    const isReady = status.ready && !status.shuttingDown;

    reply.code(isReady ? 200 : 503).send({
      ready: isReady,
      shuttingDown: status.shuttingDown,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/dependencies - Check external dependencies
   */
  app.get('/health/dependencies', async (request, reply) => {
    const dependencies = {
      database: await checkDatabase(),
      redis: await checkRedisHealth(),
      sendgrid: await verifySendGridConfig(),
      twilio: await verifyTwilioConfig(),
      fcm: await verifyFCMConfig(),
      queue: await checkQueue(),
    };

    const allHealthy = Object.values(dependencies).every(d => d.healthy || d.configured);

    reply.code(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'unhealthy',
      dependencies,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/queue - Queue status
   */
  app.get('/health/queue', async (request, reply) => {
    try {
      const queueStatus = await getQueueStatus();

      reply.send({
        status: 'ok',
        queue: queueStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      reply.code(500).send({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  logger.info('Health check routes registered');
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ healthy: boolean; message?: string }> {
  try {
    const db = getDb();
    // Simple query to check connection
    await db.execute('SELECT 1');
    return {
      healthy: true,
      message: 'Database connected',
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: error.message,
    };
  }
}

/**
 * Check queue health
 */
async function checkQueue(): Promise<{ healthy: boolean; message?: string }> {
  try {
    const status = await getQueueStatus();

    // Consider unhealthy if too many failures
    if (status.failed > 100) {
      return {
        healthy: false,
        message: `Too many failed jobs: ${status.failed}`,
      };
    }

    return {
      healthy: true,
      message: `Queue operational: ${status.waiting} waiting, ${status.active} active`,
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: error.message,
    };
  }
}
