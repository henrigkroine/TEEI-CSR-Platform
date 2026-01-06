/**
 * ClickHouse Client
 * HTTP-based client for ClickHouse data warehouse
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('clickhouse-client');

// ClickHouse connection configuration
const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST || 'localhost';
const CLICKHOUSE_PORT = parseInt(process.env.CLICKHOUSE_PORT || '8123');
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'teei';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || 'teei_dev_password';
const CLICKHOUSE_DATABASE = process.env.CLICKHOUSE_DATABASE || 'teei_analytics';

interface ClickHouseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

class ClickHouseClient {
  private config: ClickHouseConfig;
  private baseUrl: string;

  constructor(config?: Partial<ClickHouseConfig>) {
    this.config = {
      host: config?.host || CLICKHOUSE_HOST,
      port: config?.port || CLICKHOUSE_PORT,
      user: config?.user || CLICKHOUSE_USER,
      password: config?.password || CLICKHOUSE_PASSWORD,
      database: config?.database || CLICKHOUSE_DATABASE,
    };

    this.baseUrl = `http://${this.config.host}:${this.config.port}`;

    logger.info(
      {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
      },
      'ClickHouse client initialized'
    );
  }

  /**
   * Execute a query
   */
  async query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
    try {
      let processedSql = sql;

      // Replace parameters if provided
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          const placeholder = `{${key}}`;
          const escapedValue = this.escapeValue(value);
          processedSql = processedSql.replace(new RegExp(placeholder, 'g'), escapedValue);
        }
      }

      const url = `${this.baseUrl}/?database=${this.config.database}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-ClickHouse-User': this.config.user,
          'X-ClickHouse-Key': this.config.password,
        },
        body: processedSql + ' FORMAT JSON',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickHouse query failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // ClickHouse returns data in { data: [...] } format
      return result.data || [];
    } catch (error) {
      logger.error({ error, sql }, 'Failed to execute ClickHouse query');
      throw error;
    }
  }

  /**
   * Insert data (single row)
   */
  async insert(table: string, data: Record<string, any>): Promise<void> {
    return this.insertBatch(table, [data]);
  }

  /**
   * Insert data in batch
   */
  async insertBatch(table: string, rows: Record<string, any>[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    try {
      // Build INSERT statement
      const columns = Object.keys(rows[0]);
      const values = rows
        .map((row) => {
          const rowValues = columns.map((col) => this.escapeValue(row[col]));
          return `(${rowValues.join(', ')})`;
        })
        .join(', ');

      const sql = `INSERT INTO ${this.config.database}.${table} (${columns.join(', ')}) VALUES ${values}`;

      const url = `${this.baseUrl}/?database=${this.config.database}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-ClickHouse-User': this.config.user,
          'X-ClickHouse-Key': this.config.password,
        },
        body: sql,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickHouse insert failed: ${response.status} - ${errorText}`);
      }

      logger.debug({ table, rows: rows.length }, 'Batch insert successful');
    } catch (error) {
      logger.error({ error, table, rows: rows.length }, 'Failed to insert batch to ClickHouse');
      throw error;
    }
  }

  /**
   * Insert data using JSON format (more efficient for large batches)
   */
  async insertJSON(table: string, rows: Record<string, any>[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    try {
      const url = `${this.baseUrl}/?query=INSERT INTO ${this.config.database}.${table} FORMAT JSONEachRow`;

      const body = rows.map((row) => JSON.stringify(row)).join('\n');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-ClickHouse-User': this.config.user,
          'X-ClickHouse-Key': this.config.password,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickHouse JSON insert failed: ${response.status} - ${errorText}`);
      }

      logger.debug({ table, rows: rows.length }, 'JSON batch insert successful');
    } catch (error) {
      logger.error({ error, table, rows: rows.length }, 'Failed to insert JSON batch to ClickHouse');
      throw error;
    }
  }

  /**
   * Execute a command (DDL, etc.)
   */
  async execute(sql: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/?database=${this.config.database}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'X-ClickHouse-User': this.config.user,
          'X-ClickHouse-Key': this.config.password,
        },
        body: sql,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickHouse command failed: ${response.status} - ${errorText}`);
      }

      logger.debug({ sql: sql.substring(0, 100) }, 'Command executed successfully');
    } catch (error) {
      logger.error({ error, sql }, 'Failed to execute ClickHouse command');
      throw error;
    }
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/ping`;
      const response = await fetch(url, { method: 'GET' });
      return response.ok;
    } catch (error) {
      logger.error({ error }, 'ClickHouse ping failed');
      return false;
    }
  }

  /**
   * Escape value for SQL
   */
  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`;
    }

    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "\\'")}'`;
    }

    return String(value);
  }
}

// Singleton instance
let clickhouseClient: ClickHouseClient | null = null;

/**
 * Get ClickHouse client instance
 */
export function getClickHouseClient(): ClickHouseClient {
  if (!clickhouseClient) {
    clickhouseClient = new ClickHouseClient();
  }
  return clickhouseClient;
}

/**
 * Initialize ClickHouse client with custom config
 */
export function initClickHouseClient(config?: Partial<ClickHouseConfig>): ClickHouseClient {
  clickhouseClient = new ClickHouseClient(config);
  return clickhouseClient;
}

/**
 * Check if ClickHouse is enabled
 */
export function isClickHouseEnabled(): boolean {
  return process.env.CLICKHOUSE_ENABLED === 'true';
}
