import { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:health');

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
      service: 'reporting',
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
      llmProvider: await checkLLMProvider(),
    };

    const allHealthy = Object.values(dependencies).every(d => d.healthy);

    reply.code(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'unhealthy',
      dependencies,
      timestamp: new Date().toISOString(),
    });
  });

  logger.info('Health check routes registered');
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ healthy: boolean; message?: string }> {
  try {
    // TODO: Implement actual database health check
    // For now, just check if DATABASE_URL is set
    const hasConfig = !!process.env.DATABASE_URL;
    return {
      healthy: hasConfig,
      message: hasConfig ? 'Database configured' : 'Database URL not configured',
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: error.message,
    };
  }
}

/**
 * Check LLM provider connectivity
 */
async function checkLLMProvider(): Promise<{ healthy: boolean; message?: string }> {
  try {
    const provider = process.env.LLM_PROVIDER || 'openai';
    const hasApiKey = provider === 'openai'
      ? !!process.env.OPENAI_API_KEY
      : !!process.env.ANTHROPIC_API_KEY;

    return {
      healthy: hasApiKey,
      message: hasApiKey
        ? `${provider} API key configured`
        : `${provider} API key not configured`,
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: error.message,
    };
  }
}
