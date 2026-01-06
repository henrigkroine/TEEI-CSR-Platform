/**
 * ClickHouse Writer for Synthetic Monitoring Results
 *
 * Writes synthetic probe results to ClickHouse for long-term storage and analysis
 * Supports batch writes and automatic retries
 *
 * @module synthetics/clickhouse-writer
 */

import axios from 'axios';

export interface SyntheticProbeResult {
  timestamp?: string; // ISO 8601 format, defaults to now
  probe_id?: string; // UUID, auto-generated if not provided
  monitor_type: string;
  region: string;
  tenant_id: string;

  success: 0 | 1;
  response_time_ms: number;
  error_message?: string;

  status_code?: number;
  dns_lookup_ms?: number;
  tcp_connection_ms?: number;
  tls_handshake_ms?: number;
  first_byte_ms?: number;
  content_transfer_ms?: number;

  within_performance_gate: 0 | 1;
  performance_gate_ms: number;

  file_size_bytes?: number;
  content_hash?: string;
  components_count?: number;
  components_failed?: number;

  tags?: Record<string, string>;
}

export interface ConnectorHealthResult {
  timestamp?: string;
  connector_name: string;
  region: string;

  healthy: 0 | 1;
  response_time_ms: number;
  status_code?: number;

  database_healthy: 0 | 1;
  redis_healthy: 0 | 1;
  queue_healthy: 0 | 1;
  external_api_healthy: 0 | 1;

  version?: string;
  uptime_seconds?: number;
  last_sync?: string;

  error_message?: string;
}

export interface SyntheticIncident {
  incident_id?: string; // UUID
  started_at?: string;
  resolved_at?: string;

  monitor_type: string;
  region: string;
  tenant_id: string;

  severity: 'critical' | 'warning';
  consecutive_failures: number;
  error_message: string;

  resolved?: 0 | 1;
  resolution_notes?: string;
}

export class ClickHouseWriter {
  private readonly url: string;
  private readonly database: string;
  private readonly username: string;
  private readonly password: string;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  private probesBatch: SyntheticProbeResult[] = [];
  private connectorsBatch: ConnectorHealthResult[] = [];
  private incidentsBatch: SyntheticIncident[] = [];

  constructor(config?: {
    url?: string;
    database?: string;
    username?: string;
    password?: string;
    batchSize?: number;
    maxRetries?: number;
  }) {
    this.url = config?.url || process.env.CLICKHOUSE_URL || 'http://localhost:8123';
    this.database = config?.database || process.env.CLICKHOUSE_DATABASE || 'teei_observability';
    this.username = config?.username || process.env.CLICKHOUSE_USER || 'default';
    this.password = config?.password || process.env.CLICKHOUSE_PASSWORD || '';
    this.batchSize = config?.batchSize || 100;
    this.maxRetries = config?.maxRetries || 3;
  }

  /**
   * Add a synthetic probe result to the batch
   */
  public addProbeResult(result: SyntheticProbeResult): void {
    this.probesBatch.push({
      ...result,
      timestamp: result.timestamp || new Date().toISOString(),
    });

    // Auto-flush if batch size reached
    if (this.probesBatch.length >= this.batchSize) {
      void this.flushProbes();
    }
  }

  /**
   * Add a connector health result to the batch
   */
  public addConnectorHealth(result: ConnectorHealthResult): void {
    this.connectorsBatch.push({
      ...result,
      timestamp: result.timestamp || new Date().toISOString(),
    });

    // Auto-flush if batch size reached
    if (this.connectorsBatch.length >= this.batchSize) {
      void this.flushConnectors();
    }
  }

  /**
   * Add an incident to the batch
   */
  public addIncident(incident: SyntheticIncident): void {
    this.incidentsBatch.push({
      ...incident,
      started_at: incident.started_at || new Date().toISOString(),
    });

    // Auto-flush if batch size reached
    if (this.incidentsBatch.length >= this.batchSize) {
      void this.flushIncidents();
    }
  }

  /**
   * Flush all probe results to ClickHouse
   */
  public async flushProbes(): Promise<void> {
    if (this.probesBatch.length === 0) {
      return;
    }

    const batch = [...this.probesBatch];
    this.probesBatch = [];

    try {
      await this.insertBatch('synthetic_probes', batch);
      console.log(`✓ Flushed ${batch.length} synthetic probe results to ClickHouse`);
    } catch (error) {
      console.error('Failed to flush synthetic probes to ClickHouse:', error);
      // Re-add to batch on failure (with limit to avoid infinite growth)
      if (this.probesBatch.length < this.batchSize * 10) {
        this.probesBatch.push(...batch);
      }
      throw error;
    }
  }

  /**
   * Flush all connector health results to ClickHouse
   */
  public async flushConnectors(): Promise<void> {
    if (this.connectorsBatch.length === 0) {
      return;
    }

    const batch = [...this.connectorsBatch];
    this.connectorsBatch = [];

    try {
      await this.insertBatch('connector_health', batch);
      console.log(`✓ Flushed ${batch.length} connector health results to ClickHouse`);
    } catch (error) {
      console.error('Failed to flush connector health to ClickHouse:', error);
      if (this.connectorsBatch.length < this.batchSize * 10) {
        this.connectorsBatch.push(...batch);
      }
      throw error;
    }
  }

  /**
   * Flush all incidents to ClickHouse
   */
  public async flushIncidents(): Promise<void> {
    if (this.incidentsBatch.length === 0) {
      return;
    }

    const batch = [...this.incidentsBatch];
    this.incidentsBatch = [];

    try {
      await this.insertBatch('synthetic_incidents', batch);
      console.log(`✓ Flushed ${batch.length} incidents to ClickHouse`);
    } catch (error) {
      console.error('Failed to flush incidents to ClickHouse:', error);
      if (this.incidentsBatch.length < this.batchSize * 10) {
        this.incidentsBatch.push(...batch);
      }
      throw error;
    }
  }

  /**
   * Flush all pending batches
   */
  public async flushAll(): Promise<void> {
    await Promise.all([
      this.flushProbes(),
      this.flushConnectors(),
      this.flushIncidents(),
    ]);
  }

  /**
   * Insert a batch of records into a table
   */
  private async insertBatch(
    table: string,
    records: Array<Record<string, any>>
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    // Convert to JSON lines format (one JSON object per line)
    const jsonLines = records
      .map((record) => JSON.stringify(this.sanitizeRecord(record)))
      .join('\n');

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      try {
        const response = await axios.post(
          `${this.url}/?database=${this.database}&query=INSERT%20INTO%20${table}%20FORMAT%20JSONEachRow`,
          jsonLines,
          {
            auth: {
              username: this.username,
              password: this.password,
            },
            headers: {
              'Content-Type': 'application/x-ndjson',
            },
            timeout: 10000,
          }
        );

        if (response.status === 200) {
          return; // Success
        }

        throw new Error(`ClickHouse returned status ${response.status}`);
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.warn(
            `ClickHouse insert failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to insert into ClickHouse after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Sanitize a record for ClickHouse insertion
   * - Remove undefined values
   * - Convert tags map to proper format
   */
  private sanitizeRecord(record: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      if (value !== undefined && value !== null) {
        // Convert tags object to ClickHouse Map format
        if (key === 'tags' && typeof value === 'object') {
          sanitized[key] = value;
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Query ClickHouse and return results
   */
  public async query<T = any>(sql: string): Promise<T[]> {
    try {
      const response = await axios.post(
        `${this.url}/?database=${this.database}&query=${encodeURIComponent(sql)}%20FORMAT%20JSON`,
        '',
        {
          auth: {
            username: this.username,
            password: this.password,
          },
          timeout: 30000,
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('ClickHouse query failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let writerInstance: ClickHouseWriter | null = null;

/**
 * Get or create the ClickHouse writer singleton
 */
export function getClickHouseWriter(): ClickHouseWriter {
  if (!writerInstance) {
    writerInstance = new ClickHouseWriter();
  }
  return writerInstance;
}

/**
 * Graceful shutdown - flush all pending writes
 */
export async function shutdownClickHouseWriter(): Promise<void> {
  if (writerInstance) {
    console.log('Flushing ClickHouse writer before shutdown...');
    await writerInstance.flushAll();
  }
}

// Auto-flush on process exit
process.on('beforeExit', () => {
  void shutdownClickHouseWriter();
});

process.on('SIGINT', async () => {
  await shutdownClickHouseWriter();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownClickHouseWriter();
  process.exit(0);
});
