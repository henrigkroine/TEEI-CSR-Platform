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
export declare enum HealthStatus {
    HEALTHY = "healthy",
    UNHEALTHY = "unhealthy",
    DEGRADED = "degraded"
}
/**
 * Dependency health check result
 */
export interface DependencyHealth {
    name: string;
    status: HealthStatus;
    message?: string;
    latency?: number;
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
    uptime: number;
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
export declare class HealthCheckManager {
    private serviceName;
    private serviceVersion;
    private startTime;
    private checks;
    private ready;
    private alive;
    private shutdownInProgress;
    constructor(serviceName: string, serviceVersion?: string);
    /**
     * Register a health check for a dependency
     */
    registerCheck(name: string, checkFn: HealthCheckFn): void;
    /**
     * Mark service as ready to accept traffic
     */
    setReady(ready?: boolean): void;
    /**
     * Mark service as alive/dead
     */
    setAlive(alive?: boolean): void;
    /**
     * Mark shutdown in progress
     */
    setShuttingDown(shuttingDown?: boolean): void;
    /**
     * Liveness probe - is the service running?
     * Returns 200 if alive, 503 if dead
     */
    liveness(): Promise<HealthResponse>;
    /**
     * Readiness probe - can the service accept traffic?
     * Returns 200 if ready, 503 if not ready
     */
    readiness(): Promise<HealthResponse>;
    /**
     * Startup probe - has the service finished initializing?
     * Returns 200 if started, 503 if still starting
     */
    startup(): Promise<HealthResponse>;
    /**
     * Detailed health check with all dependencies
     */
    health(): Promise<HealthResponse>;
    /**
     * Check all registered dependencies
     */
    private checkDependencies;
    /**
     * Timeout helper for health checks
     */
    private timeout;
}
/**
 * Common health check implementations
 */
/**
 * Database health check
 */
export declare function createDatabaseHealthCheck(name: string, checkFn: () => Promise<boolean>): HealthCheckFn;
/**
 * NATS health check
 */
export declare function createNatsHealthCheck(name: string, checkFn: () => Promise<boolean>): HealthCheckFn;
/**
 * HTTP service health check
 */
export declare function createHttpHealthCheck(name: string, url: string, timeoutMs?: number): HealthCheckFn;
/**
 * Redis health check
 */
export declare function createRedisHealthCheck(name: string, checkFn: () => Promise<boolean>): HealthCheckFn;
/**
 * Fastify plugin for health checks
 */
export declare function registerHealthRoutes(fastify: any, healthManager: HealthCheckManager): void;
//# sourceMappingURL=health.d.ts.map