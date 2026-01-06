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
export var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["UNHEALTHY"] = "unhealthy";
    HealthStatus["DEGRADED"] = "degraded";
})(HealthStatus || (HealthStatus = {}));
/**
 * Health check manager
 */
export class HealthCheckManager {
    serviceName;
    serviceVersion;
    startTime;
    checks;
    ready;
    alive;
    shutdownInProgress;
    constructor(serviceName, serviceVersion = '1.0.0') {
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
    registerCheck(name, checkFn) {
        this.checks.set(name, checkFn);
    }
    /**
     * Mark service as ready to accept traffic
     */
    setReady(ready = true) {
        this.ready = ready;
    }
    /**
     * Mark service as alive/dead
     */
    setAlive(alive = true) {
        this.alive = alive;
    }
    /**
     * Mark shutdown in progress
     */
    setShuttingDown(shuttingDown = true) {
        this.shutdownInProgress = shuttingDown;
        if (shuttingDown) {
            this.ready = false; // Stop accepting new traffic
        }
    }
    /**
     * Liveness probe - is the service running?
     * Returns 200 if alive, 503 if dead
     */
    async liveness() {
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
    async readiness() {
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
        let status;
        if (hasUnhealthy) {
            status = HealthStatus.UNHEALTHY;
        }
        else if (hasDegraded) {
            status = HealthStatus.DEGRADED;
        }
        else {
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
    async startup() {
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
    async health() {
        return this.readiness();
    }
    /**
     * Check all registered dependencies
     */
    async checkDependencies() {
        const results = [];
        for (const [name, checkFn] of this.checks.entries()) {
            try {
                const result = await Promise.race([
                    checkFn(),
                    this.timeout(5000, name), // 5 second timeout
                ]);
                results.push(result);
            }
            catch (error) {
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
    async timeout(ms, checkName) {
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
export function createDatabaseHealthCheck(name, checkFn) {
    return async () => {
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
        }
        catch (error) {
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
export function createNatsHealthCheck(name, checkFn) {
    return async () => {
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
        }
        catch (error) {
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
export function createHttpHealthCheck(name, url, timeoutMs = 3000) {
    return async () => {
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
        }
        catch (error) {
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
export function createRedisHealthCheck(name, checkFn) {
    return async () => {
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
        }
        catch (error) {
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
export function registerHealthRoutes(fastify, healthManager) {
    // Liveness probe
    fastify.get('/health/liveness', async (_request, reply) => {
        const health = await healthManager.liveness();
        const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
        reply.code(statusCode).send(health);
    });
    // Readiness probe
    fastify.get('/health/readiness', async (_request, reply) => {
        const health = await healthManager.readiness();
        const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
        reply.code(statusCode).send(health);
    });
    // Startup probe
    fastify.get('/health/startup', async (_request, reply) => {
        const health = await healthManager.startup();
        const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
        reply.code(statusCode).send(health);
    });
    // Detailed health check
    fastify.get('/health', async (_request, reply) => {
        const health = await healthManager.health();
        const statusCode = health.status === HealthStatus.UNHEALTHY ? 503 : 200;
        reply.code(statusCode).send(health);
    });
    // Kubernetes-style aliases
    fastify.get('/healthz', async (_request, reply) => {
        const health = await healthManager.health();
        const statusCode = health.status === HealthStatus.UNHEALTHY ? 503 : 200;
        reply.code(statusCode).send(health);
    });
    fastify.get('/readyz', async (_request, reply) => {
        const health = await healthManager.readiness();
        const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
        reply.code(statusCode).send(health);
    });
    fastify.get('/livez', async (_request, reply) => {
        const health = await healthManager.liveness();
        const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
        reply.code(statusCode).send(health);
    });
}
//# sourceMappingURL=health.js.map