/**
 * Cold-Start Optimizer
 * Reduces cold-start latency through connection pooling, JIT caching, and lazy loading
 */

import { createServiceLogger } from '@teei/shared-utils';
import { AIProvider } from '../inference/types.js';

const logger = createServiceLogger('cold-start-optimizer');

export interface ConnectionPool {
  provider: AIProvider;
  connections: any[];
  maxSize: number;
  minSize: number;
  activeConnections: number;
  totalRequests: number;
  avgInitTimeMs: number;
}

export interface ColdStartMetrics {
  firstRequestMs: number;
  subsequentAvgMs: number;
  improvement: number; // Percentage improvement
  ttft: number; // Time to first token
  poolWarmupMs: number;
  lazyLoadMs: number;
}

export interface OptimizationResult {
  optimized: boolean;
  technique: 'pool' | 'jit_cache' | 'lazy_load' | 'preconnect';
  latencyMs: number;
  savings: number; // Milliseconds saved
}

/**
 * Cold-Start Optimizer Service
 * Minimizes latency for first requests after service startup
 */
export class ColdStartOptimizer {
  private pools: Map<AIProvider, ConnectionPool> = new Map();
  private lazyModules: Map<string, { loaded: boolean; module: any }> = new Map();
  private jitCache: Map<string, any> = new Map();
  private coldStartMetrics: Map<string, number[]> = new Map(); // requestType -> latencies
  private firstRequestTime: Map<string, number> = new Map(); // requestType -> timestamp

  // Pool configuration
  private readonly POOL_CONFIG = {
    [AIProvider.OPENAI]: { min: 2, max: 10 },
    [AIProvider.CLAUDE]: { min: 2, max: 10 },
    [AIProvider.GEMINI]: { min: 1, max: 5 },
  };

  // Modules to lazy load
  private readonly LAZY_MODULES = [
    'tiktoken', // Token counting (heavy)
    'pdf-lib', // PDF generation
    'sharp', // Image processing
    'zod', // Schema validation (already loaded, but example)
  ];

  constructor() {
    logger.info('Cold-start optimizer initialized');
  }

  /**
   * Initialize connection pools for all providers
   */
  async initializePools(): Promise<void> {
    logger.info('Initializing connection pools...');

    const start = Date.now();

    for (const [provider, config] of Object.entries(this.POOL_CONFIG)) {
      await this.createPool(provider as AIProvider, config.min, config.max);
    }

    const duration = Date.now() - start;
    logger.info(`Connection pools initialized in ${duration}ms`);
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(provider: AIProvider): Promise<any> {
    let pool = this.pools.get(provider);

    if (!pool) {
      // Create pool on-demand if not exists
      const config = this.POOL_CONFIG[provider] || { min: 1, max: 5 };
      pool = await this.createPool(provider, config.min, config.max);
    }

    // Get or create connection
    if (pool.connections.length > 0) {
      const connection = pool.connections.pop();
      pool.activeConnections++;
      pool.totalRequests++;

      logger.debug(`Got connection from pool for ${provider} (${pool.activeConnections} active)`);
      return connection;
    }

    // Pool exhausted, create new connection if under max
    if (pool.activeConnections < pool.maxSize) {
      const start = Date.now();
      const connection = await this.createConnection(provider);
      const initTime = Date.now() - start;

      // Update average init time
      const total = pool.totalRequests;
      pool.avgInitTimeMs = (pool.avgInitTimeMs * total + initTime) / (total + 1);

      pool.activeConnections++;
      pool.totalRequests++;

      logger.debug(`Created new connection for ${provider} in ${initTime}ms`);
      return connection;
    }

    // Wait for a connection to be released (or timeout)
    logger.warn(`Connection pool exhausted for ${provider}, waiting...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getConnection(provider);
  }

  /**
   * Release a connection back to the pool
   */
  async releaseConnection(provider: AIProvider, connection: any): Promise<void> {
    const pool = this.pools.get(provider);

    if (!pool) {
      logger.warn(`No pool found for ${provider}, discarding connection`);
      return;
    }

    pool.activeConnections--;

    // Return to pool if under max size
    if (pool.connections.length < pool.maxSize) {
      pool.connections.push(connection);
      logger.debug(`Released connection back to pool for ${provider}`);
    } else {
      // Pool full, discard connection
      logger.debug(`Pool full for ${provider}, discarding connection`);
    }
  }

  /**
   * Lazy load a module
   */
  async lazyLoad(moduleName: string): Promise<any> {
    const cached = this.lazyModules.get(moduleName);

    if (cached?.loaded) {
      logger.debug(`Using cached module: ${moduleName}`);
      return cached.module;
    }

    logger.info(`Lazy loading module: ${moduleName}`);
    const start = Date.now();

    try {
      // In production, would actually import the module
      // For now, simulate loading time
      await new Promise(resolve => setTimeout(resolve, 50));

      const module = {}; // Placeholder

      const loadTime = Date.now() - start;
      logger.info(`Lazy loaded ${moduleName} in ${loadTime}ms`);

      this.lazyModules.set(moduleName, { loaded: true, module });
      return module;
    } catch (error: any) {
      logger.error(`Failed to lazy load ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * JIT cache for first request
   */
  async jitCache(key: string, generator: () => Promise<any>): Promise<any> {
    const cached = this.jitCache.get(key);

    if (cached !== undefined) {
      logger.debug(`JIT cache hit: ${key}`);
      return cached;
    }

    logger.debug(`JIT cache miss: ${key}, generating...`);
    const start = Date.now();

    const value = await generator();
    const genTime = Date.now() - start;

    this.jitCache.set(key, value);

    logger.info(`JIT cached ${key} in ${genTime}ms`);
    return value;
  }

  /**
   * Track cold-start metrics
   */
  recordColdStart(requestType: string, latencyMs: number): void {
    if (!this.firstRequestTime.has(requestType)) {
      this.firstRequestTime.set(requestType, latencyMs);
      logger.info(`First ${requestType} request: ${latencyMs}ms`);
    }

    const latencies = this.coldStartMetrics.get(requestType) || [];
    latencies.push(latencyMs);

    // Keep last 100 requests
    if (latencies.length > 100) {
      latencies.shift();
    }

    this.coldStartMetrics.set(requestType, latencies);
  }

  /**
   * Get cold-start metrics
   */
  getMetrics(requestType?: string): ColdStartMetrics | Map<string, ColdStartMetrics> {
    if (requestType) {
      return this.calculateMetrics(requestType);
    }

    // Return metrics for all request types
    const allMetrics = new Map<string, ColdStartMetrics>();

    for (const type of this.coldStartMetrics.keys()) {
      allMetrics.set(type, this.calculateMetrics(type));
    }

    return allMetrics;
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): Map<AIProvider, ConnectionPool> {
    return new Map(this.pools);
  }

  /**
   * Pre-connect to providers
   */
  async preConnect(providers: AIProvider[]): Promise<OptimizationResult[]> {
    logger.info(`Pre-connecting to ${providers.length} providers...`);

    const results: OptimizationResult[] = [];

    for (const provider of providers) {
      const start = Date.now();

      try {
        await this.getConnection(provider);

        const latency = Date.now() - start;
        const pool = this.pools.get(provider);
        const savings = pool ? pool.avgInitTimeMs - latency : 0;

        results.push({
          optimized: true,
          technique: 'preconnect',
          latencyMs: latency,
          savings,
        });

        logger.info(`Pre-connected to ${provider} in ${latency}ms`);
      } catch (error: any) {
        logger.error(`Failed to pre-connect to ${provider}:`, error);

        results.push({
          optimized: false,
          technique: 'preconnect',
          latencyMs: 0,
          savings: 0,
        });
      }
    }

    return results;
  }

  /**
   * Warm up all optimizations
   */
  async warmupAll(): Promise<{
    pools: number;
    modules: number;
    totalTimeMs: number;
  }> {
    logger.info('Warming up cold-start optimizer...');

    const start = Date.now();

    // Initialize pools
    await this.initializePools();

    // Lazy load common modules
    const modulePromises = this.LAZY_MODULES.map(m => this.lazyLoad(m).catch(err => {
      logger.error(`Failed to preload ${m}:`, err);
    }));

    await Promise.all(modulePromises);

    const totalTime = Date.now() - start;

    logger.info(`Cold-start optimizer warmed up in ${totalTime}ms`);

    return {
      pools: this.pools.size,
      modules: this.lazyModules.size,
      totalTimeMs: totalTime,
    };
  }

  /**
   * Clear all caches and pools
   */
  async clear(): Promise<void> {
    this.pools.clear();
    this.lazyModules.clear();
    this.jitCache.clear();
    this.coldStartMetrics.clear();
    this.firstRequestTime.clear();

    logger.info('Cleared all caches and pools');
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    logger.info('Closing all connection pools...');

    for (const [provider, pool] of this.pools.entries()) {
      logger.info(`Closing pool for ${provider} (${pool.connections.length} connections)`);
      // In production, would close actual connections
      pool.connections = [];
      pool.activeConnections = 0;
    }

    this.pools.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async createPool(provider: AIProvider, minSize: number, maxSize: number): Promise<ConnectionPool> {
    logger.info(`Creating connection pool for ${provider} (min: ${minSize}, max: ${maxSize})`);

    const start = Date.now();
    const connections: any[] = [];

    // Create minimum connections
    for (let i = 0; i < minSize; i++) {
      const connection = await this.createConnection(provider);
      connections.push(connection);
    }

    const initTime = Date.now() - start;
    const avgInitTime = minSize > 0 ? initTime / minSize : 0;

    const pool: ConnectionPool = {
      provider,
      connections,
      maxSize,
      minSize,
      activeConnections: 0,
      totalRequests: 0,
      avgInitTimeMs: avgInitTime,
    };

    this.pools.set(provider, pool);

    logger.info(`Created pool for ${provider} with ${minSize} connections in ${initTime}ms`);

    return pool;
  }

  private async createConnection(provider: AIProvider): Promise<any> {
    // In production, would create actual API client connection
    // For now, simulate connection time
    const connectionTime = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, connectionTime));

    return {
      provider,
      createdAt: new Date(),
      id: Math.random().toString(36).substring(7),
    };
  }

  private calculateMetrics(requestType: string): ColdStartMetrics {
    const latencies = this.coldStartMetrics.get(requestType) || [];
    const firstRequest = this.firstRequestTime.get(requestType) || 0;

    if (latencies.length === 0) {
      return {
        firstRequestMs: 0,
        subsequentAvgMs: 0,
        improvement: 0,
        ttft: 0,
        poolWarmupMs: 0,
        lazyLoadMs: 0,
      };
    }

    // Calculate subsequent average (exclude first request)
    const subsequent = latencies.slice(1);
    const subsequentAvg = subsequent.length > 0
      ? subsequent.reduce((a, b) => a + b, 0) / subsequent.length
      : latencies[0];

    const improvement = firstRequest > 0
      ? ((firstRequest - subsequentAvg) / firstRequest) * 100
      : 0;

    // Estimate TTFT (time to first token) as ~60% of total latency
    const ttft = subsequentAvg * 0.6;

    // Estimate pool warmup savings
    const avgPoolInit = Array.from(this.pools.values())
      .reduce((sum, p) => sum + p.avgInitTimeMs, 0) / this.pools.size;

    return {
      firstRequestMs: firstRequest,
      subsequentAvgMs: subsequentAvg,
      improvement,
      ttft,
      poolWarmupMs: avgPoolInit,
      lazyLoadMs: 0, // Would track actual lazy load times
    };
  }
}

/**
 * Singleton instance
 */
let coldStartOptimizer: ColdStartOptimizer | null = null;

export function getColdStartOptimizer(): ColdStartOptimizer {
  if (!coldStartOptimizer) {
    coldStartOptimizer = new ColdStartOptimizer();
  }
  return coldStartOptimizer;
}

export function resetColdStartOptimizer(): void {
  coldStartOptimizer = null;
}
