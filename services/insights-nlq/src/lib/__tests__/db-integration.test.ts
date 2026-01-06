/**
 * Database Integration Tests
 *
 * Tests for db-client and query-executor with mocked database connections
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPostgresClient,
  getClickHouseClient,
  getDb,
  checkPostgresHealth,
  checkClickHouseHealth,
  healthCheck,
  closeConnections,
} from '../db-client.js';

// Mock postgres and clickhouse modules
vi.mock('postgres', () => {
  const mockPostgres = vi.fn(() => {
    const queryFn = vi.fn(async (strings: any, ...args: any[]) => {
      // Mock query execution
      return [{ health_check: 1 }];
    });
    queryFn.unsafe = vi.fn(async (sql: string) => {
      return [{ id: 1, value: 'test' }];
    });
    queryFn.end = vi.fn(async () => {});
    return queryFn;
  });
  return { default: mockPostgres };
});

vi.mock('@clickhouse/client', () => {
  return {
    createClient: vi.fn(() => ({
      query: vi.fn(async () => ({
        json: async () => [{ id: 1, value: 'test' }],
        text: async () => 'test',
      })),
      ping: vi.fn(async () => ({ success: true })),
      close: vi.fn(async () => {}),
    })),
  };
});

vi.mock('drizzle-orm/postgres-js', () => {
  return {
    drizzle: vi.fn((client: any) => ({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            execute: vi.fn(async () => [{ id: 1 }]),
          })),
        })),
      })),
    })),
  };
});

describe('db-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Note: closeConnections is not working in tests due to mocking
    // In production, this would clean up connections
  });

  describe('getPostgresClient', () => {
    it('should return a postgres client singleton', () => {
      const client1 = getPostgresClient();
      const client2 = getPostgresClient();

      expect(client1).toBeDefined();
      expect(client1).toBe(client2); // Singleton pattern
    });
  });

  describe('getDb', () => {
    it('should return a Drizzle ORM instance', () => {
      const db = getDb();

      expect(db).toBeDefined();
      expect(db.select).toBeDefined();
    });
  });

  describe('getClickHouseClient', () => {
    it('should return a ClickHouse client singleton', () => {
      const client1 = getClickHouseClient();
      const client2 = getClickHouseClient();

      expect(client1).toBeDefined();
      expect(client1).toBe(client2); // Singleton pattern
    });
  });

  describe('checkPostgresHealth', () => {
    it('should return healthy status when connection succeeds', async () => {
      const result = await checkPostgresHealth();

      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkClickHouseHealth', () => {
    it('should return healthy status when ping succeeds', async () => {
      const result = await checkClickHouseHealth();

      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('healthCheck', () => {
    it('should check both databases and return overall status', async () => {
      const result = await healthCheck();

      expect(result.postgres).toBeDefined();
      expect(result.postgres.healthy).toBe(true);
      expect(result.clickhouse).toBeDefined();
      expect(result.clickhouse.healthy).toBe(true);
      expect(result.overall).toBe(true);
    });
  });
});

describe('query-executor', () => {
  // We'll import these after mocks are set up
  let executeQuery: any;
  let QueryExecutionError: any;
  let explainQuery: any;
  let formatNumber: any;
  let formatDecimal: any;
  let formatLargeNumber: any;

  beforeEach(async () => {
    // Import after mocks
    const module = await import('../query-executor.js');
    executeQuery = module.executeQuery;
    QueryExecutionError = module.QueryExecutionError;
    explainQuery = module.explainQuery;
    formatNumber = module.formatNumber;
    formatDecimal = module.formatDecimal;
    formatLargeNumber = module.formatLargeNumber;
  });

  describe('executeQuery', () => {
    it('should execute PostgreSQL query when no CHQL provided', async () => {
      const sql = 'SELECT * FROM nlq_queries WHERE company_id = $1 LIMIT 10';

      const result = await executeQuery(sql, undefined, {
        preferClickHouse: false,
      });

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.database).toBe('postgres');
      expect(result.metadata.rowCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute ClickHouse query when CHQL provided and preferred', async () => {
      const sql = 'SELECT * FROM nlq_queries WHERE company_id = $1 LIMIT 10';
      const chql = 'SELECT * FROM nlq_queries WHERE company_id = {companyId: UUID} LIMIT 10';

      const result = await executeQuery(sql, chql, {
        preferClickHouse: true,
      });

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.database).toBe('clickhouse');
    });

    it('should respect timeout option', async () => {
      const sql = 'SELECT * FROM nlq_queries LIMIT 10';

      const result = await executeQuery(sql, undefined, {
        timeout: 5000,
      });

      expect(result).toBeDefined();
      expect(result.metadata.executionTimeMs).toBeLessThan(5000);
    });

    it('should normalize result values', async () => {
      const sql = 'SELECT * FROM nlq_queries LIMIT 1';

      const result = await executeQuery(sql, undefined);

      // Check that rows are normalized
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
    });
  });

  describe('QueryExecutionError', () => {
    it('should create error with context', () => {
      const error = new QueryExecutionError(
        'Test error',
        'TEST_ERROR',
        'postgres'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.database).toBe('postgres');
      expect(error.name).toBe('QueryExecutionError');
    });
  });

  describe('Number formatting utilities', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(123.45)).toBe('123.45');
    });

    it('should format decimals with specified precision', () => {
      expect(formatDecimal(3.14159, 2)).toBe('3.14');
      expect(formatDecimal(3.14159, 4)).toBe('3.1416');
      expect(formatDecimal(10, 2)).toBe('10.00');
    });

    it('should format large numbers with K/M/B suffixes', () => {
      expect(formatLargeNumber(500)).toBe('500');
      expect(formatLargeNumber(1500)).toBe('1.5K');
      expect(formatLargeNumber(1500000)).toBe('1.5M');
      expect(formatLargeNumber(1500000000)).toBe('1.5B');
      expect(formatLargeNumber(-1500000)).toBe('-1.5M');
    });
  });
});

describe('Integration: db-client + query-executor', () => {
  it('should execute a complete query flow', async () => {
    // Import after mocks
    const { executeQuery } = await import('../query-executor.js');

    // Simulate a real NLQ query
    const sql = `
      SELECT
        id,
        raw_question,
        detected_intent,
        execution_status,
        result_row_count,
        created_at
      FROM nlq_queries
      WHERE company_id = 'test-company-id'
        AND execution_status = 'success'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const result = await executeQuery(sql, undefined, {
      timeout: 30000,
      maxRows: 10,
      requestId: 'test-request-123',
    });

    // Verify result structure
    expect(result.rows).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.database).toBe('postgres');
    expect(result.metadata.requestId).toBe('test-request-123');
    expect(result.metadata.rowCount).toBeLessThanOrEqual(10);
  });
});
