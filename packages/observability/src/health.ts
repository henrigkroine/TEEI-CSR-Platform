/**
 * Health Check Standards
 *
 * Provides standardized health check endpoints with:
 * - Liveness probes (is the service running?)
 * - Readiness probes (can the service accept traffic?)
 * - Startup probes (has the service finished initializing?)
 * - Dependency health checks
 * - Graceful shutdown coordination
 *
 * Ref: MULTI_AGENT_PLAN.md § Reliability Lead / Health Check Engineer
 */

/**
 * Health check status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
}

/**
 * Dependency health check result
 */
export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  latency?: number; // milliseconds
  metadata?: Record<string, any>;
}

/**
 * Overall health check response
 */
export interface HealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  timestamp: string;
  uptime: number; // seconds
  dependencies?: DependencyHealth[];
  metadata?: Record<string, any>;
}

/**
 * Health check function type
 */
export type HealthCheckFn = () => Promise<DependencyHealth>;

/**
 * Health check manager
 */
export class HealthCheckManager {
  private serviceName: string;
  private serviceVersion: string;
  private startTime: number;
  private checks: Map<string, HealthCheckFn>;
  private ready: boolean;
  private alive: boolean;
  private shutdownInProgress: boolean;

  constructor(serviceName: string, serviceVersion: string = '1.0.0') {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
    this.startTime = Date.now();
    this.checks = new Map();
    this.ready = false;
    this.alive = true;
    this.shutdownInProgress = false;
  }

  /**
   * Register a health check for a dependency
   */
  registerCheck(name: string, checkFn: HealthCheckFn): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Mark service as ready to accept traffic
   */
  setReady(ready: boolean = true): void {
    this.ready = ready;
  }

  /**
   * Mark service as alive/dead
   */
  setAlive(alive: boolean = true): void {
    this.alive = alive;
  }

  /**
   * Mark shutdown in progress
   */
  setShuttingDown(shuttingDown: boolean = true): void {
    this.shutdownInProgress = shuttingDown;
    if (shuttingDown) {
      this.ready = false; // Stop accepting new traffic
    }
  }

  /**
   * Liveness probe - is the service running?
   * Returns 200 if alive, 503 if dead
   */
  async liveness(): Promise<HealthResponse> {
    const status = this.alive ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY;

    return {
      status,
      service: this.serviceName,
      version: this.serviceVersion,
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      metadata: {
        alive: this.alive,
      },
    };
  }

  /**
   * Readiness probe - can the service accept traffic?
   * Returns 200 if ready, 503 if not ready
   */
  async readiness(): Promise<HealthResponse> {
    // Not ready if shutting down or explicitly marked not ready
    if (this.shutdownInProgress || !this.ready) {
      return {
        status: HealthStatus.UNHEALTHY,
        service: this.serviceName,
        version: this.serviceVersion,
        timestamp: new Date().toISOString(),
        uptime: (Date.now() - this.startTime) / 1000,
        metadata: {
          ready: this.ready,
          shuttingDown: this.shutdownInProgress,
        },
      };
    }

    // Check all dependencies
    const dependencies = await this.checkDependencies();

    // Determine overall status
    const hasUnhealthy = dependencies.some(d => d.status === HealthStatus.UNHEALTHY);
    const hasDegraded = dependencies.some(d => d.status === HealthStatus.DEGRADED);

    let status: HealthStatus;
    if (hasUnhealthy) {
      status = HealthStatus.UNHEALTHY;
    } else if (hasDegraded) {
      status = HealthStatus.DEGRADED;
    } else {
      status = HealthStatus.HEALTHY;
    }

    return {
      status,
      service: this.serviceName,
      version: this.serviceVersion,
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      dependencies,
      metadata: {
        ready: this.ready,
        checksCount: dependencies.length,
      },
    };
  }

  /**
   * Startup probe - has the service finished initializing?
   * Returns 200 if started, 503 if still starting
   */
  async startup(): Promise<HealthResponse> {
    const status = this.ready ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY;

    return {
      status,
      service: this.serviceName,
      version: this.serviceVersion,
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      metadata: {
        ready: this.ready,
        startTime: new Date(this.startTime).toISOString(),
      },
    };
  }

  /**
   * Detailed health check with all dependencies
   */
  async health(): Promise<HealthResponse> {
    return this.readiness();
  }

  /**
   * Check all registered dependencies
   */
  private async checkDependencies(): Promise<DependencyHealth[]> {
    const results: DependencyHealth[] = [];

    for (const [name, checkFn] of this.checks.entries()) {
      try {
        const result = await Promise.race([
          checkFn(),
          this.timeout(5000, name), // 5 second timeout
        ]);
        results.push(result);
      } catch (error) {
        results.push({
          name,
          status: HealthStatus.UNHEALTHY,
          message: error instanceof Error ? error.message : 'Check failed',
        });
      }
    }

    return results;
  }

  /**
   * Timeout helper for health checks
   */
  private async timeout(ms: number, checkName: string): Promise<DependencyHealth> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout for ${checkName}`));
      }, ms);
    });
  }
}

/**
 * Common health check implementations
 */

/**
 * Database health check
 */
export function createDatabaseHealthCheck(
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheckFn {
  return async (): Promise<DependencyHealth> => {
    const startTime = Date.now();
    try {
      const isHealthy = await checkFn();
      const latency = Date.now() - startTime;

      return {
        name,
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        latency,
        message: isHealthy ? 'Database connection OK' : 'Database connection failed',
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        latency,
        message: error instanceof Error ? error.message : 'Database check failed',
      };
    }
  };
}

/**
 * NATS health check
 */
export function createNatsHealthCheck(
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheckFn {
  return async (): Promise<DependencyHealth> => {
    const startTime = Date.now();
    try {
      const isHealthy = await checkFn();
      const latency = Date.now() - startTime;

      return {
        name,
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        latency,
        message: isHealthy ? 'NATS connection OK' : 'NATS connection failed',
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        latency,
        message: error instanceof Error ? error.message : 'NATS check failed',
      };
    }
  };
}

/**
 * HTTP service health check
 */
export function createHttpHealthCheck(
  name: string,
  url: string,
  timeoutMs: number = 3000
): HealthCheckFn {
  return async (): Promise<DependencyHealth> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latency = Date.now() - startTime;

      const isHealthy = response.ok;

      return {
        name,
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        latency,
        message: isHealthy ? 'Service responding' : `HTTP ${response.status}`,
        metadata: {
          statusCode: response.status,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        latency,
        message: error instanceof Error ? error.message : 'Service unreachable',
      };
    }
  };
}

/**
 * Redis health check
 */
export function createRedisHealthCheck(
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheckFn {
  return async (): Promise<DependencyHealth> => {
    const startTime = Date.now();
    try {
      const isHealthy = await checkFn();
      const latency = Date.now() - startTime;

      return {
        name,
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        latency,
        message: isHealthy ? 'Redis connection OK' : 'Redis connection failed',
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        latency,
        message: error instanceof Error ? error.message : 'Redis check failed',
      };
    }
  };
}

/**
 * Fastify plugin for health checks
 */
export function registerHealthRoutes(
  fastify: any,
  healthManager: HealthCheckManager
): void {
  // Liveness probe
  fastify.get('/health/liveness', async (_request: any, reply: any) => {
    const health = await healthManager.liveness();
    const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
    reply.code(statusCode).send(health);
  });

  // Readiness probe
  fastify.get('/health/readiness', async (_request: any, reply: any) => {
    const health = await healthManager.readiness();
    const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
    reply.code(statusCode).send(health);
  });

  // Startup probe
  fastify.get('/health/startup', async (_request: any, reply: any) => {
    const health = await healthManager.startup();
    const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
    reply.code(statusCode).send(health);
  });

  // Detailed health check
  fastify.get('/health', async (_request: any, reply: any) => {
    const health = await healthManager.health();
    const statusCode = health.status === HealthStatus.UNHEALTHY ? 503 : 200;
    reply.code(statusCode).send(health);
  });
}
