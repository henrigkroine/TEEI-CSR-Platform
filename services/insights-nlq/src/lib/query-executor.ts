/**
 * Query Executor - Execute validated SQL/CHQL with safety and performance guarantees
 *
 * Features:
 * - Executes validated SQL against PostgreSQL
 * - Executes validated CHQL against ClickHouse
 * - Handles connection pooling (via db-client)
 * - Implements query timeouts (default: 30s)
 * - Tracks execution metrics (rows, time, bytes)
 * - Normalizes result formatting
 * - Handles NULL values gracefully
 *
 * CRITICAL: Only execute queries that have passed safety validation!
 */

import { getPostgresClient, getClickHouseClient } from './db-client.js';
import type { PostgresClient, ClickHouse } from './db-client.js';

/**
 * Query execution options
 */
export interface QueryExecutionOptions {
  /**
   * Prefer ClickHouse if CHQL is available (for performance)
   * Default: true
   */
  preferClickHouse?: boolean;

  /**
   * Query timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Maximum number of rows to return (safety limit)
   * Default: 10000
   */
  maxRows?: number;

  /**
   * Request ID for tracking/debugging
   */
  requestId?: string;

  /**
   * Query parameters for parameterized queries
   */
  parameters?: Record<string, any>;
}

/**
 * Query execution result with metadata
 */
export interface QueryResult<T = any> {
  /**
   * Query result rows
   */
  rows: T[];

  /**
   * Execution metadata
   */
  metadata: {
    rowCount: number;
    executionTimeMs: number;
    estimatedBytes: number;
    database: 'postgres' | 'clickhouse';
    cached: boolean;
    requestId?: string;
  };

  /**
   * Column metadata (if available)
   */
  columns?: {
    name: string;
    type: string;
  }[];
}

/**
 * Query execution error with context
 */
export class QueryExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly database: 'postgres' | 'clickhouse',
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'QueryExecutionError';
  }
}

/**
 * Execute a validated query against PostgreSQL or ClickHouse
 *
 * @param sql - Validated SQL query for PostgreSQL
 * @param chql - Optional validated CHQL query for ClickHouse
 * @param options - Execution options
 * @returns Query result with metadata
 */
export async function executeQuery<T = any>(
  sql: string,
  chql: string | undefined,
  options: QueryExecutionOptions = {}
): Promise<QueryResult<T>> {
  const {
    preferClickHouse = true,
    timeout = 30000,
    maxRows = 10000,
    requestId,
    parameters = {},
  } = options;

  // Decide which database to use
  const useClickHouse = preferClickHouse && chql !== undefined;

  if (useClickHouse) {
    return executeClickHouseQuery<T>(chql!, { timeout, maxRows, requestId, parameters });
  } else {
    return executePostgresQuery<T>(sql, { timeout, maxRows, requestId, parameters });
  }
}

/**
 * Execute query against PostgreSQL
 */
async function executePostgresQuery<T = any>(
  sql: string,
  options: {
    timeout: number;
    maxRows: number;
    requestId?: string;
    parameters: Record<string, any>;
  }
): Promise<QueryResult<T>> {
  const { timeout, maxRows, requestId } = options;
  const startTime = Date.now();

  try {
    const client = getPostgresClient();

    // Execute with timeout
    const result = await executeWithTimeout(
      () => client.unsafe(sql),
      timeout,
      'PostgreSQL query timeout'
    );

    const executionTimeMs = Date.now() - startTime;

    // Validate row count
    if (result.length > maxRows) {
      throw new QueryExecutionError(
        `Query returned too many rows: ${result.length} (max: ${maxRows})`,
        'MAX_ROWS_EXCEEDED',
        'postgres'
      );
    }

    // Format and normalize results
    const rows = normalizeResults<T>(result);

    // Estimate result size in bytes (approximate)
    const estimatedBytes = estimateResultSize(rows);

    return {
      rows,
      metadata: {
        rowCount: rows.length,
        executionTimeMs,
        estimatedBytes,
        database: 'postgres',
        cached: false,
        requestId,
      },
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    if (error instanceof QueryExecutionError) {
      throw error;
    }

    // Handle postgres-specific errors
    const pgError = error as any;
    const errorCode = pgError.code || 'UNKNOWN_ERROR';
    const errorMessage = pgError.message || String(error);

    throw new QueryExecutionError(
      `PostgreSQL query failed: ${errorMessage}`,
      errorCode,
      'postgres',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Execute query against ClickHouse
 */
async function executeClickHouseQuery<T = any>(
  chql: string,
  options: {
    timeout: number;
    maxRows: number;
    requestId?: string;
    parameters: Record<string, any>;
  }
): Promise<QueryResult<T>> {
  const { timeout, maxRows, requestId, parameters } = options;
  const startTime = Date.now();

  try {
    const client = getClickHouseClient();

    // Execute with timeout
    const resultSet = await executeWithTimeout(
      () => client.query({
        query: chql,
        query_params: parameters,
        format: 'JSONEachRow',
      }),
      timeout,
      'ClickHouse query timeout'
    );

    const executionTimeMs = Date.now() - startTime;

    // Parse JSON result
    const jsonResult = await resultSet.json<T>();
    const rows: T[] = Array.isArray(jsonResult) ? jsonResult : [jsonResult as T];

    // Validate row count
    if (rows.length > maxRows) {
      throw new QueryExecutionError(
        `Query returned too many rows: ${rows.length} (max: ${maxRows})`,
        'MAX_ROWS_EXCEEDED',
        'clickhouse'
      );
    }

    // Normalize results
    const normalizedRows = normalizeResults<T>(rows);

    // Estimate result size
    const estimatedBytes = estimateResultSize(normalizedRows);

    return {
      rows: normalizedRows,
      metadata: {
        rowCount: normalizedRows.length,
        executionTimeMs,
        estimatedBytes,
        database: 'clickhouse',
        cached: false,
        requestId,
      },
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    if (error instanceof QueryExecutionError) {
      throw error;
    }

    // Handle ClickHouse-specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    throw new QueryExecutionError(
      `ClickHouse query failed: ${errorMessage}`,
      'CH_QUERY_ERROR',
      'clickhouse',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Execute a function with a timeout
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Normalize query results:
 * - Format dates/timestamps consistently (ISO 8601)
 * - Round decimals to 2-4 places
 * - Format large numbers with commas
 * - Handle NULL values gracefully
 */
function normalizeResults<T>(rows: any[]): T[] {
  return rows.map(row => {
    const normalized: any = {};

    for (const [key, value] of Object.entries(row)) {
      normalized[key] = normalizeValue(value);
    }

    return normalized as T;
  });
}

/**
 * Normalize a single value
 */
function normalizeValue(value: any): any {
  // Handle NULL/undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Handle dates/timestamps
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle date strings (PostgreSQL returns ISO strings)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Handle numbers
  if (typeof value === 'number') {
    // Check if it's a decimal
    if (!Number.isInteger(value)) {
      // Round to 4 decimal places for precision metrics
      return Math.round(value * 10000) / 10000;
    }
    return value;
  }

  // Handle BigInt (ClickHouse UInt64, etc.)
  if (typeof value === 'bigint') {
    return Number(value);
  }

  // Return as-is for other types
  return value;
}

/**
 * Format a number with commas for display
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a decimal with specified precision
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format a large number with K/M/B suffixes
 */
export function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${formatDecimal(abs / 1_000_000_000, 1)}B`;
  } else if (abs >= 1_000_000) {
    return `${sign}${formatDecimal(abs / 1_000_000, 1)}M`;
  } else if (abs >= 1_000) {
    return `${sign}${formatDecimal(abs / 1_000, 1)}K`;
  }

  return formatNumber(value);
}

/**
 * Estimate result size in bytes (approximate)
 */
function estimateResultSize(rows: any[]): number {
  if (rows.length === 0) return 0;

  // Estimate based on JSON serialization of first row
  const sampleRow = rows[0];
  const sampleJson = JSON.stringify(sampleRow);
  const bytesPerRow = sampleJson.length;

  return bytesPerRow * rows.length;
}

/**
 * Dry-run query validation (explain plan without execution)
 */
export async function explainQuery(
  sql: string,
  database: 'postgres' | 'clickhouse' = 'postgres'
): Promise<{
  estimatedRows: number;
  estimatedCost: number;
  plan: string;
}> {
  if (database === 'postgres') {
    const client = getPostgresClient();
    const result = await client.unsafe(`EXPLAIN (FORMAT JSON) ${sql}`);

    const plan = result[0]?.['QUERY PLAN'];
    const estimatedRows = plan?.[0]?.['Plan']?.['Plan Rows'] || 0;
    const estimatedCost = plan?.[0]?.['Plan']?.['Total Cost'] || 0;

    return {
      estimatedRows,
      estimatedCost,
      plan: JSON.stringify(plan, null, 2),
    };
  } else {
    // ClickHouse EXPLAIN
    const client = getClickHouseClient();
    const result = await client.query({
      query: `EXPLAIN ${sql}`,
      format: 'TabSeparated',
    });

    const plan = await result.text();

    return {
      estimatedRows: 0, // ClickHouse doesn't provide row estimates
      estimatedCost: 0,
      plan,
    };
  }
}

/**
 * Test connection to databases
 */
export async function testConnection(): Promise<{
  postgres: boolean;
  clickhouse: boolean;
}> {
  const results = {
    postgres: false,
    clickhouse: false,
  };

  try {
    const pgClient = getPostgresClient();
    await pgClient`SELECT 1`;
    results.postgres = true;
  } catch (error) {
    console.error('PostgreSQL connection test failed:', error);
  }

  try {
    const chClient = getClickHouseClient();
    const ping = await chClient.ping();
    results.clickhouse = ping.success;
  } catch (error) {
    console.error('ClickHouse connection test failed:', error);
  }

  return results;
}
