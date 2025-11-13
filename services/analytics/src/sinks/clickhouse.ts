/**
 * ClickHouse Event Sink
 * Subscribes to NATS events and writes them to ClickHouse
 * Implements batching, retries, and dead letter queue
 */

import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type { JsMsg } from 'nats';
import { getClickHouseClient, isClickHouseEnabled } from './clickhouse-client.js';

const logger = createServiceLogger('clickhouse-sink');

// Batching configuration
const BATCH_SIZE = parseInt(process.env.CLICKHOUSE_BATCH_SIZE || '1000');
const BATCH_TIMEOUT_MS = parseInt(process.env.CLICKHOUSE_BATCH_TIMEOUT_MS || '10000'); // 10 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface EventRecord {
  event_id: string;
  event_type: string;
  company_id: string;
  user_id: string | null;
  timestamp: string;
  payload: string;
}

interface MetricRecord {
  company_id: string;
  metric_name: string;
  metric_value: number;
  period_start: string;
  timestamp: string;
  dimensions: string;
}

class ClickHouseSink {
  private eventBatch: EventRecord[] = [];
  private metricBatch: MetricRecord[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private deadLetterQueue: Array<{ type: string; data: any; error: string }> = [];

  /**
   * Start the sink
   */
  async start(): Promise<void> {
    if (!isClickHouseEnabled()) {
      logger.info('ClickHouse sink disabled by configuration');
      return;
    }

    logger.info('Starting ClickHouse event sink');

    // Verify ClickHouse connection
    const client = getClickHouseClient();
    const isConnected = await client.ping();

    if (!isConnected) {
      throw new Error('Failed to connect to ClickHouse');
    }

    logger.info('ClickHouse connection verified');

    // Subscribe to all NATS events
    const eventBus = getEventBus();
    await eventBus.connect();

    // Subscribe to all subjects
    await eventBus.subscribe(
      '*.*', // All subjects
      async (msg) => {
        await this.handleEvent(msg);
      },
      {
        durable: 'clickhouse-sink',
        deliverSubject: 'clickhouse.sink',
        ackWait: 60000, // 60 seconds
        maxDeliver: MAX_RETRIES,
      }
    );

    // Start batch timer
    this.startBatchTimer();

    logger.info('ClickHouse event sink started');
  }

  /**
   * Handle incoming NATS event
   */
  private async handleEvent(msg: JsMsg): Promise<void> {
    try {
      const subject = msg.subject;
      const payload = msg.json();

      // Extract event data
      const eventRecord: EventRecord = {
        event_id: `${subject}-${msg.seq}-${Date.now()}`,
        event_type: subject,
        company_id: payload.companyId || '',
        user_id: payload.userId || null,
        timestamp: new Date().toISOString(),
        payload: JSON.stringify(payload),
      };

      // Add to batch
      this.eventBatch.push(eventRecord);

      // Check if this is a metric event
      if (subject.startsWith('metrics.') && payload.metricName && payload.value !== undefined) {
        const metricRecord: MetricRecord = {
          company_id: payload.companyId || '',
          metric_name: payload.metricName,
          metric_value: payload.value,
          period_start: payload.periodStart || new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          dimensions: JSON.stringify(payload.dimensions || {}),
        };

        this.metricBatch.push(metricRecord);
      }

      // Acknowledge message
      msg.ack();

      // Flush if batch is full
      if (this.eventBatch.length >= BATCH_SIZE) {
        await this.flushBatches();
      }
    } catch (error) {
      logger.error({ error, subject: msg.subject }, 'Failed to handle event');
      // NAK to retry
      msg.nak(RETRY_DELAY_MS);
    }
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(async () => {
      await this.flushBatches();
      this.startBatchTimer(); // Restart timer
    }, BATCH_TIMEOUT_MS);
  }

  /**
   * Flush batches to ClickHouse
   */
  private async flushBatches(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    if (this.eventBatch.length === 0 && this.metricBatch.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const client = getClickHouseClient();

      // Flush events
      if (this.eventBatch.length > 0) {
        const events = [...this.eventBatch];
        this.eventBatch = [];

        await this.insertWithRetry('events', events);
        logger.info({ count: events.length }, 'Events flushed to ClickHouse');
      }

      // Flush metrics
      if (this.metricBatch.length > 0) {
        const metrics = [...this.metricBatch];
        this.metricBatch = [];

        await this.insertWithRetry('metrics_timeseries', metrics);
        logger.info({ count: metrics.length }, 'Metrics flushed to ClickHouse');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to flush batches to ClickHouse');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Insert with retry logic
   */
  private async insertWithRetry(
    table: string,
    rows: Record<string, any>[],
    retries = 0
  ): Promise<void> {
    try {
      const client = getClickHouseClient();
      await client.insertJSON(table, rows);
    } catch (error) {
      if (retries < MAX_RETRIES) {
        logger.warn(
          { table, rows: rows.length, retries, error },
          'Retrying ClickHouse insert'
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

        return this.insertWithRetry(table, rows, retries + 1);
      } else {
        logger.error(
          { table, rows: rows.length, error },
          'Max retries exceeded, moving to dead letter queue'
        );

        // Add to dead letter queue
        this.deadLetterQueue.push({
          type: table,
          data: rows,
          error: String(error),
        });

        // Limit DLQ size
        if (this.deadLetterQueue.length > 1000) {
          this.deadLetterQueue.shift();
        }
      }
    }
  }

  /**
   * Stop the sink
   */
  async stop(): Promise<void> {
    logger.info('Stopping ClickHouse event sink');

    // Stop batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining batches
    await this.flushBatches();

    logger.info('ClickHouse event sink stopped');
  }

  /**
   * Get statistics
   */
  getStats(): {
    eventBatchSize: number;
    metricBatchSize: number;
    deadLetterQueueSize: number;
  } {
    return {
      eventBatchSize: this.eventBatch.length,
      metricBatchSize: this.metricBatch.length,
      deadLetterQueueSize: this.deadLetterQueue.length,
    };
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): Array<{ type: string; data: any; error: string }> {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }
}

// Singleton instance
let clickhouseSink: ClickHouseSink | null = null;

/**
 * Initialize and start ClickHouse sink
 */
export async function initClickHouseSink(): Promise<ClickHouseSink> {
  if (!clickhouseSink) {
    clickhouseSink = new ClickHouseSink();
    await clickhouseSink.start();
  }
  return clickhouseSink;
}

/**
 * Get ClickHouse sink instance
 */
export function getClickHouseSink(): ClickHouseSink | null {
  return clickhouseSink;
}

/**
 * Stop ClickHouse sink
 */
export async function stopClickHouseSink(): Promise<void> {
  if (clickhouseSink) {
    await clickhouseSink.stop();
    clickhouseSink = null;
  }
}
