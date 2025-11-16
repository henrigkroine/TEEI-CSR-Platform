import type { FastifyInstance } from 'fastify';

export interface HealthManager {
  isAlive: boolean;
  isReady: boolean;
  isShuttingDown: boolean;
  dependencies: Map<string, boolean>;
  setAlive(alive: boolean): void;
  setReady(ready: boolean): void;
  setShuttingDown(shuttingDown: boolean): void;
  setDependencyHealth(name: string, healthy: boolean): void;
  getDependencyHealth(name: string): boolean;
}

export function createHealthManager(): HealthManager {
  return {
    isAlive: false,
    isReady: false,
    isShuttingDown: false,
    dependencies: new Map(),
    setAlive(alive: boolean) {
      this.isAlive = alive;
    },
    setReady(ready: boolean) {
      this.isReady = ready;
    },
    setShuttingDown(shuttingDown: boolean) {
      this.isShuttingDown = shuttingDown;
    },
    setDependencyHealth(name: string, healthy: boolean) {
      this.dependencies.set(name, healthy);
    },
    getDependencyHealth(name: string): boolean {
      return this.dependencies.get(name) ?? false;
    },
  };
}

export function setupHealthRoutes(app: FastifyInstance, healthManager: HealthManager) {
  // Kubernetes liveness probe - is the service running?
  app.get('/health/live', async (request, reply) => {
    if (healthManager.isAlive && !healthManager.isShuttingDown) {
      return reply.code(200).send({ status: 'alive' });
    }
    return reply.code(503).send({ status: 'not alive' });
  });

  // Kubernetes readiness probe - is the service ready to accept traffic?
  app.get('/health/ready', async (request, reply) => {
    if (healthManager.isReady && !healthManager.isShuttingDown) {
      return reply.code(200).send({ status: 'ready' });
    }
    return reply.code(503).send({ status: 'not ready' });
  });

  // General health check
  app.get('/health', async (request, reply) => {
    const status = healthManager.isAlive && healthManager.isReady ? 'healthy' : 'unhealthy';
    const code = status === 'healthy' ? 200 : 503;

    return reply.code(code).send({
      status,
      alive: healthManager.isAlive,
      ready: healthManager.isReady,
      shuttingDown: healthManager.isShuttingDown,
    });
  });

  // Dependencies health check
  app.get('/health/dependencies', async (request, reply) => {
    const deps: Record<string, boolean> = {};
    healthManager.dependencies.forEach((healthy, name) => {
      deps[name] = healthy;
    });

    const allHealthy = Array.from(healthManager.dependencies.values()).every((h) => h);
    const code = allHealthy ? 200 : 503;

    return reply.code(code).send({
      status: allHealthy ? 'healthy' : 'degraded',
      dependencies: deps,
    });
  });

  // Residency-specific health check
  app.get('/health/residency', async (request, reply) => {
    const dbHealthy = healthManager.getDependencyHealth('database');
    const cacheHealthy = healthManager.getDependencyHealth('cache');

    const residencyHealthy = dbHealthy; // Cache is optional
    const code = residencyHealthy ? 200 : 503;

    return reply.code(code).send({
      status: residencyHealthy ? 'healthy' : 'unhealthy',
      database: dbHealthy,
      cache: cacheHealthy,
      cacheRequired: false,
    });
  });
}
