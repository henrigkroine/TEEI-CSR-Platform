/**
 * Database Optimizer
 *
 * Connection pooling, query optimization utilities, and performance monitoring.
 * Features:
 * - Advanced connection pool configuration with circuit breaker
 * - Query performance monitoring and logging
 * - Index suggestion based on slow query analysis
 * - Connection health checks and automatic recovery
 *
 * @module optimizer
 */

import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';

export interface OptimizerConfig extends PoolConfig {
  /** Enable query logging */
  enableQueryLogging?: boolean;
  /** Log queries slower than threshold (ms) */
  slowQueryThreshold?: number;
  /** Enable connection metrics */
  enableMetrics?: boolean;
  /** Circuit breaker threshold (failures before opening) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker timeout (ms) before retry */
  circuitBreakerTimeout?: number;
}

export interface QueryMetrics {
  queryCount: number;
  slowQueryCount: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  errors: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingRequests: number;
}

/**
 * Optimized database connection pool with monitoring and circuit breaker
 */
export class DatabaseOptimizer {
  private pool: Pool;
  private config: OptimizerConfig;
  private metrics: QueryMetrics;
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  private circuitBreakerFailures: number;
  private circuitBreakerOpenedAt: number;

  constructor(config: OptimizerConfig) {
    this.config = {
      // Default pool configuration for optimal performance
      max: 20, // Maximum pool size
      min: 5, // Minimum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 5000, // Timeout for acquiring connection
      maxUses: 7500, // Close connection after 7500 uses (prevent memory leaks)
      allowExitOnIdle: true, // Allow pool to close if all connections idle

      // Override with user config
      ...config,

      // Defaults for optimizer features
      enableQueryLogging: config.enableQueryLogging ?? true,
      slowQueryThreshold: config.slowQueryThreshold ?? 1000, // 1 second
      enableMetrics: config.enableMetrics ?? true,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout ?? 60000, // 1 minute
    };

    this.pool = new Pool(this.config);
    this.metrics = this.resetMetrics();
    this.circuitBreakerState = 'CLOSED';
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpenedAt = 0;

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for connection pool monitoring
   */
  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      if (this.config.enableQueryLogging) {
        console.log('[DB Pool] New client connected');
      }
    });

    this.pool.on('acquire', (client) => {
      if (this.config.enableQueryLogging) {
        console.log('[DB Pool] Client acquired from pool');
      }
    });

    this.pool.on('remove', (client) => {
      if (this.config.enableQueryLogging) {
        console.log('[DB Pool] Client removed from pool');
      }
    });

    this.pool.on('error', (err, client) => {
      console.error('[DB Pool] Unexpected error on idle client:', err);
      this.handleCircuitBreakerError();
    });
  }

  /**
   * Execute a query with performance monitoring and circuit breaker
   *
   * @param query - SQL query string or query config
   * @param params - Query parameters
   * @returns Query result
   */
  async query<T = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    // Check circuit breaker state
    if (this.circuitBreakerState === 'OPEN') {
      const now = Date.now();
      if (now - this.circuitBreakerOpenedAt > this.config.circuitBreakerTimeout!) {
        console.log('[DB Circuit Breaker] Transitioning to HALF_OPEN');
        this.circuitBreakerState = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN. Database queries are temporarily disabled.');
      }
    }

    const startTime = Date.now();

    try {
      const result = await this.pool.query<T>(query, params);
      const duration = Date.now() - startTime;

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateMetrics(duration, false);
      }

      // Log slow queries
      if (this.config.enableQueryLogging && duration > this.config.slowQueryThreshold!) {
        console.warn(`[DB Slow Query] ${duration}ms - ${query.substring(0, 100)}...`);
      }

      // Reset circuit breaker on success in HALF_OPEN state
      if (this.circuitBreakerState === 'HALF_OPEN') {
        console.log('[DB Circuit Breaker] Transitioning to CLOSED');
        this.circuitBreakerState = 'CLOSED';
        this.circuitBreakerFailures = 0;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.config.enableMetrics) {
        this.updateMetrics(duration, true);
      }

      if (this.config.enableQueryLogging) {
        console.error(`[DB Query Error] ${duration}ms - ${query.substring(0, 100)}...`, error);
      }

      this.handleCircuitBreakerError();
      throw error;
    }
  }

  /**
   * Acquire a client from the pool for transaction handling
   *
   * @returns Pool client
   */
  async getClient(): Promise<PoolClient> {
    if (this.circuitBreakerState === 'OPEN') {
      throw new Error('Circuit breaker is OPEN. Database connections are temporarily disabled.');
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      this.handleCircuitBreakerError();
      throw error;
    }
  }

  /**
   * Execute a function within a transaction
   *
   * @param callback - Function to execute within transaction
   * @returns Result of callback function
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle circuit breaker error
   */
  private handleCircuitBreakerError(): void {
    this.circuitBreakerFailures++;

    if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold!) {
      console.error('[DB Circuit Breaker] Opening circuit breaker due to consecutive failures');
      this.circuitBreakerState = 'OPEN';
      this.circuitBreakerOpenedAt = Date.now();
    }
  }

  /**
   * Update query metrics
   */
  private updateMetrics(duration: number, isError: boolean): void {
    this.metrics.queryCount++;
    this.metrics.totalDuration += duration;
    this.metrics.avgDuration = this.metrics.totalDuration / this.metrics.queryCount;
    this.metrics.maxDuration = Math.max(this.metrics.maxDuration, duration);

    if (isError) {
      this.metrics.errors++;
    }

    if (duration > this.config.slowQueryThreshold!) {
      this.metrics.slowQueryCount++;
    }
  }

  /**
   * Reset query metrics
   */
  private resetMetrics(): QueryMetrics {
    return {
      queryCount: 0,
      slowQueryCount: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      errors: 0,
    };
  }

  /**
   * Get current query metrics
   *
   * @returns Query metrics
   */
  getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection pool metrics
   *
   * @returns Connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      waitingRequests: this.pool.waitingCount,
    };
  }

  /**
   * Get circuit breaker status
   *
   * @returns Circuit breaker state and metrics
   */
  getCircuitBreakerStatus(): {
    state: string;
    failures: number;
    threshold: number;
  } {
    return {
      state: this.circuitBreakerState,
      failures: this.circuitBreakerFailures,
      threshold: this.config.circuitBreakerThreshold!,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(): void {
    console.log('[DB Circuit Breaker] Manual reset');
    this.circuitBreakerState = 'CLOSED';
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpenedAt = 0;
  }

  /**
   * Test database connection health
   *
   * @returns True if connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 AS health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      console.error('[DB Health Check] Failed:', error);
      return false;
    }
  }

  /**
   * Analyze query patterns and suggest indexes
   *
   * @returns Array of index suggestions
   */
  async analyzeAndSuggestIndexes(): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Query pg_stat_statements for slow queries (requires pg_stat_statements extension)
      const result = await this.query(`
        SELECT
          query,
          calls,
          total_exec_time,
          mean_exec_time
        FROM pg_stat_statements
        WHERE mean_exec_time > $1
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `, [this.config.slowQueryThreshold]);

      for (const row of result.rows) {
        suggestions.push(`Consider analyzing: ${row.query.substring(0, 100)}... (avg: ${row.mean_exec_time}ms, calls: ${row.calls})`);
      }
    } catch (error) {
      console.warn('[DB Analyzer] pg_stat_statements not available or error:', error);
    }

    return suggestions;
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    console.log('[DB Pool] Closing connection pool');
    await this.pool.end();
  }
}

/**
 * Create a singleton database optimizer instance
 */
let optimizerInstance: DatabaseOptimizer | null = null;

export function createOptimizer(config: OptimizerConfig): DatabaseOptimizer {
  if (optimizerInstance) {
    console.warn('[DB Optimizer] Instance already exists, returning existing instance');
    return optimizerInstance;
  }

  optimizerInstance = new DatabaseOptimizer(config);
  return optimizerInstance;
}

export function getOptimizer(): DatabaseOptimizer {
  if (!optimizerInstance) {
    throw new Error('Database optimizer not initialized. Call createOptimizer() first.');
  }
  return optimizerInstance;
}

/**
 * Example usage
 */
if (require.main === module) {
  (async () => {
    const optimizer = createOptimizer({
      connectionString: process.env.DATABASE_URL || 'postgresql://teei:teei_dev_password@localhost:5432/teei_platform',
      enableQueryLogging: true,
      slowQueryThreshold: 100,
      max: 10,
    });

    // Health check
    const isHealthy = await optimizer.healthCheck();
    console.log(`Database health: ${isHealthy ? 'OK' : 'FAILED'}`);

    // Query metrics
    console.log('Query metrics:', optimizer.getMetrics());
    console.log('Connection metrics:', optimizer.getConnectionMetrics());
    console.log('Circuit breaker:', optimizer.getCircuitBreakerStatus());

    // Cleanup
    await optimizer.close();
  })();
}
