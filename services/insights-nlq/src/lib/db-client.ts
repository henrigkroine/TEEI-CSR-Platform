/**
 * Database Client Configuration for NLQ Service
 *
 * Provides connection pooling and health checks for:
 * - PostgreSQL (primary data store for NLQ metadata)
 * - ClickHouse (optional analytics queries for performance)
 *
 * Connection pooling configuration:
 * - PostgreSQL: Max 10 connections (configurable via DATABASE_POOL_MAX)
 * - ClickHouse: Single client with connection reuse
 * - Idle timeout: 20s for PostgreSQL
 * - Connect timeout: 10s for both databases
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createClient, ClickHouseClient } from '@clickhouse/client';
// Note: Import from shared-schema package (workspace dependency)
// If build fails, ensure @teei/shared-schema is properly built first
import * as schema from '@teei/shared-schema';

// Logger placeholder (replace with proper logger if available)
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
};

/**
 * PostgreSQL connection configuration
 */
const connectionString = process.env.DATABASE_URL || 'postgresql://teei:teei_dev_password@localhost:5432/teei_platform';

const postgresConfig = {
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  idle_timeout: 20, // seconds
  connect_timeout: 10, // seconds
  onnotice: () => {}, // Suppress notices
};

// Create postgres connection singleton
let sqlInstance: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get PostgreSQL client (singleton pattern)
 */
export function getPostgresClient(): ReturnType<typeof postgres> {
  if (!sqlInstance) {
    sqlInstance = postgres(connectionString, postgresConfig);
    logger.info('PostgreSQL client initialized', {
      database: connectionString.split('/').pop()?.split('?')[0],
      maxConnections: postgresConfig.max,
    });
  }
  return sqlInstance;
}

/**
 * Get Drizzle ORM instance for type-safe queries
 */
export function getDb(): ReturnType<typeof drizzle> {
  if (!dbInstance) {
    const sql = getPostgresClient();
    dbInstance = drizzle(sql, { schema });
    logger.info('Drizzle ORM initialized');
  }
  return dbInstance;
}

/**
 * ClickHouse connection configuration
 */
const clickhouseConfig = {
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'teei',
  password: process.env.CLICKHOUSE_PASSWORD || 'teei_dev_password',
  database: process.env.CLICKHOUSE_DB || 'teei_analytics',
  request_timeout: 30000, // 30 seconds (configurable)
  compression: {
    request: true,
    response: true,
  },
};

// ClickHouse client singleton
let clickhouseInstance: ClickHouseClient | null = null;

/**
 * Get ClickHouse client (singleton pattern)
 */
export function getClickHouseClient(): ClickHouseClient {
  if (!clickhouseInstance) {
    clickhouseInstance = createClient(clickhouseConfig);
    logger.info('ClickHouse client initialized', {
      url: clickhouseConfig.url,
      database: clickhouseConfig.database,
    });
  }
  return clickhouseInstance;
}

/**
 * Database health check results
 */
export interface HealthCheckResult {
  postgres: {
    healthy: boolean;
    latencyMs?: number;
    error?: string;
  };
  clickhouse: {
    healthy: boolean;
    latencyMs?: number;
    error?: string;
  };
  overall: boolean;
}

/**
 * Check PostgreSQL connection health
 */
export async function checkPostgresHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now();
  try {
    const sql = getPostgresClient();
    // Simple query to check connection
    await sql`SELECT 1 as health_check`;
    const latencyMs = Date.now() - startTime;

    logger.info('PostgreSQL health check passed', { latencyMs });
    return { healthy: true, latencyMs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('PostgreSQL health check failed', { error: errorMessage });
    return {
      healthy: false,
      error: errorMessage,
    };
  }
}

/**
 * Check ClickHouse connection health
 */
export async function checkClickHouseHealth(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now();
  try {
    const client = getClickHouseClient();
    const result = await client.ping();
    const latencyMs = Date.now() - startTime;

    if (result.success) {
      logger.info('ClickHouse health check passed', { latencyMs });
      return { healthy: true, latencyMs };
    } else {
      logger.warn('ClickHouse ping returned unsuccessful');
      return {
        healthy: false,
        error: 'Ping unsuccessful',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('ClickHouse health check failed', { error: errorMessage });
    return {
      healthy: false,
      error: errorMessage,
    };
  }
}

/**
 * Comprehensive health check for both databases
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const [postgres, clickhouse] = await Promise.all([
    checkPostgresHealth(),
    checkClickHouseHealth(),
  ]);

  const overall = postgres.healthy && clickhouse.healthy;

  return {
    postgres,
    clickhouse,
    overall,
  };
}

/**
 * Close all database connections gracefully
 * Should be called on application shutdown
 */
export async function closeConnections(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (sqlInstance) {
    logger.info('Closing PostgreSQL connection...');
    promises.push(sqlInstance.end().then(() => {
      sqlInstance = null;
      dbInstance = null;
      logger.info('PostgreSQL connection closed');
    }));
  }

  if (clickhouseInstance) {
    logger.info('Closing ClickHouse connection...');
    promises.push(clickhouseInstance.close().then(() => {
      clickhouseInstance = null;
      logger.info('ClickHouse connection closed');
    }));
  }

  await Promise.all(promises);
  logger.info('All database connections closed');
}

/**
 * Database client types export for convenience
 */
export type PostgresClient = ReturnType<typeof postgres>;
export type DrizzleDb = ReturnType<typeof drizzle>;
export type ClickHouse = ClickHouseClient;

/**
 * Configuration export for testing/debugging
 */
export const dbConfig = {
  postgres: {
    connectionString: connectionString.replace(/:[^:@]+@/, ':***@'), // Mask password
    ...postgresConfig,
  },
  clickhouse: {
    url: clickhouseConfig.url,
    database: clickhouseConfig.database,
    timeout: clickhouseConfig.request_timeout,
  },
};
