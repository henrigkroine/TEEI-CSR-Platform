/**
 * Query Executor Unit Tests
 *
 * Tests for query execution logic, error handling, and result normalization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db-client module
vi.mock('../db-client.js', () => {
  const mockPostgresQuery = vi.fn(async (sql: string) => {
    // Simulate different query results based on SQL
    if (sql.includes('test_timeout')) {
      return new Promise((resolve) => setTimeout(() => resolve([]), 100000));
    }
    if (sql.includes('test_error')) {
      throw new Error('Database error');
    }
    if (sql.includes('test_large_result')) {
      return Array(20000).fill({ id: 1, value: 'test' });
    }
    return [
      { id: 1, name: 'Test', score: 3.14159, date: '2025-01-15', count: 42 },
      { id: 2, name: null, score: 2.71828, date: '2025-01-16', count: 100 },
    ];
  });

  const mockClickHouseQuery = vi.fn(async (options: any) => {
    return {
      json: async () => [
        { id: 1, metric: 'sroi', value: 125.5, timestamp: '2025-01-15T10:00:00Z' },
        { id: 2, metric: 'vis', value: 87.3, timestamp: '2025-01-15T11:00:00Z' },
      ],
      text: async () => 'id\tmetric\tvalue\n1\tsroi\t125.5\n',
    };
  });

  return {
    getPostgresClient: vi.fn(() => ({
      unsafe: mockPostgresQuery,
    })),
    getClickHouseClient: vi.fn(() => ({
      query: mockClickHouseQuery,
      ping: vi.fn(async () => ({ success: true })),
    })),
  };
});

describe('query-executor', () => {
  let executeQuery: any;
  let QueryExecutionError: any;
  let explainQuery: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../query-executor.js');
    executeQuery = module.executeQuery;
    QueryExecutionError = module.QueryExecutionError;
    explainQuery = module.explainQuery;
  });

  describe('executeQuery - PostgreSQL', () => {
    it('should execute SQL query and return normalized results', async () => {
      const sql = 'SELECT * FROM test_table LIMIT 10';

      const result = await executeQuery(sql, undefined, {
        preferClickHouse: false,
      });

      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBe(2);
      expect(result.metadata.database).toBe('postgres');
      expect(result.metadata.rowCount).toBe(2);
      expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should normalize decimal values to 4 decimal places', async () => {
      const sql = 'SELECT score FROM test_table';

      const result = await executeQuery(sql, undefined);

      // Check that decimals are rounded
      expect(result.rows[0].score).toBe(3.1416); // 3.14159 -> 3.1416
      expect(result.rows[1].score).toBe(2.7183); // 2.71828 -> 2.7183
    });

    it('should handle NULL values gracefully', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined);

      // Check that NULL is preserved
      expect(result.rows[1].name).toBe(null);
    });

    it('should normalize date strings to ISO format', async () => {
      const sql = 'SELECT date FROM test_table';

      const result = await executeQuery(sql, undefined);

      // Dates should be converted to ISO strings
      expect(result.rows[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should estimate result size in bytes', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined);

      expect(result.metadata.estimatedBytes).toBeGreaterThan(0);
    });

    it('should throw error when query fails', async () => {
      const sql = 'SELECT * FROM test_error';

      await expect(executeQuery(sql, undefined)).rejects.toThrow(QueryExecutionError);
    });

    it('should throw error when result exceeds maxRows', async () => {
      const sql = 'SELECT * FROM test_large_result';

      await expect(
        executeQuery(sql, undefined, { maxRows: 100 })
      ).rejects.toThrow('MAX_ROWS_EXCEEDED');
    });

    it('should timeout long-running queries', async () => {
      const sql = 'SELECT * FROM test_timeout';

      await expect(
        executeQuery(sql, undefined, { timeout: 100 })
      ).rejects.toThrow();
    }, 10000);
  });

  describe('executeQuery - ClickHouse', () => {
    it('should execute CHQL query when provided', async () => {
      const sql = 'SELECT * FROM test_table';
      const chql = 'SELECT * FROM test_table_ch';

      const result = await executeQuery(sql, chql, {
        preferClickHouse: true,
      });

      expect(result.rows).toBeDefined();
      expect(result.metadata.database).toBe('clickhouse');
      expect(result.rows[0].metric).toBe('sroi');
      expect(result.rows[0].value).toBe(125.5);
    });

    it('should fall back to SQL when CHQL not provided', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined, {
        preferClickHouse: true,
      });

      expect(result.metadata.database).toBe('postgres');
    });

    it('should use SQL when preferClickHouse is false', async () => {
      const sql = 'SELECT * FROM test_table';
      const chql = 'SELECT * FROM test_table_ch';

      const result = await executeQuery(sql, chql, {
        preferClickHouse: false,
      });

      expect(result.metadata.database).toBe('postgres');
    });
  });

  describe('QueryExecutionError', () => {
    it('should include database context', () => {
      const error = new QueryExecutionError(
        'Query failed',
        'PG_ERROR',
        'postgres',
        new Error('Original error')
      );

      expect(error.message).toBe('Query failed');
      expect(error.code).toBe('PG_ERROR');
      expect(error.database).toBe('postgres');
      expect(error.originalError).toBeDefined();
    });
  });

  describe('Result normalization', () => {
    it('should normalize various data types', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined);

      // Check different types
      expect(typeof result.rows[0].id).toBe('number'); // Integer
      expect(typeof result.rows[0].score).toBe('number'); // Decimal (rounded)
      expect(typeof result.rows[0].date).toBe('string'); // Date -> ISO string
      expect(result.rows[1].name).toBe(null); // NULL
    });

    it('should handle edge cases in normalization', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined);

      // Verify specific normalizations
      expect(result.rows[0].count).toBe(42); // Integer stays integer
      expect(result.rows[0].score).toBeLessThan(3.142); // Rounded down
      expect(result.rows[0].score).toBeGreaterThan(3.141); // But not too much
    });
  });

  describe('Request tracking', () => {
    it('should include requestId in metadata', async () => {
      const sql = 'SELECT * FROM test_table';
      const requestId = 'test-request-abc123';

      const result = await executeQuery(sql, undefined, { requestId });

      expect(result.metadata.requestId).toBe(requestId);
    });

    it('should work without requestId', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined);

      expect(result.metadata.requestId).toBeUndefined();
    });
  });

  describe('Performance metrics', () => {
    it('should track execution time', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined);

      expect(result.metadata.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.executionTimeMs).toBeLessThan(10000); // Should be fast in tests
    });

    it('should estimate bytes transferred', async () => {
      const sql = 'SELECT * FROM test_table';

      const result = await executeQuery(sql, undefined);

      expect(result.metadata.estimatedBytes).toBeGreaterThan(0);
      // Should be reasonable for 2 rows
      expect(result.metadata.estimatedBytes).toBeLessThan(100000);
    });
  });
});

describe('Number formatting utilities', () => {
  let formatNumber: any;
  let formatDecimal: any;
  let formatLargeNumber: any;

  beforeEach(async () => {
    const module = await import('../query-executor.js');
    formatNumber = module.formatNumber;
    formatDecimal = module.formatDecimal;
    formatLargeNumber = module.formatLargeNumber;
  });

  describe('formatNumber', () => {
    it('should format integers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle decimals', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatDecimal', () => {
    it('should format with default 2 decimals', () => {
      expect(formatDecimal(3.14159)).toBe('3.14');
      expect(formatDecimal(10)).toBe('10.00');
    });

    it('should format with custom decimals', () => {
      expect(formatDecimal(3.14159, 4)).toBe('3.1416');
      expect(formatDecimal(3.14159, 0)).toBe('3');
    });

    it('should handle negative numbers', () => {
      expect(formatDecimal(-3.14159, 2)).toBe('-3.14');
    });
  });

  describe('formatLargeNumber', () => {
    it('should not format small numbers', () => {
      expect(formatLargeNumber(999)).toBe('999');
      expect(formatLargeNumber(500)).toBe('500');
    });

    it('should format thousands with K', () => {
      expect(formatLargeNumber(1000)).toBe('1.0K');
      expect(formatLargeNumber(1500)).toBe('1.5K');
      expect(formatLargeNumber(999999)).toBe('1000.0K');
    });

    it('should format millions with M', () => {
      expect(formatLargeNumber(1000000)).toBe('1.0M');
      expect(formatLargeNumber(2500000)).toBe('2.5M');
    });

    it('should format billions with B', () => {
      expect(formatLargeNumber(1000000000)).toBe('1.0B');
      expect(formatLargeNumber(3500000000)).toBe('3.5B');
    });

    it('should handle negative numbers', () => {
      expect(formatLargeNumber(-1500000)).toBe('-1.5M');
      expect(formatLargeNumber(-2500000000)).toBe('-2.5B');
    });
  });
});
