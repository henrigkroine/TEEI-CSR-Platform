/**
 * Incremental Loader for ClickHouse
 * Loads historical events from Postgres and new events from NATS
 * Tracks processing checkpoints for resumability
 */

import { createServiceLogger, getEventBus } from '@teei/shared-utils';
import { getClickHouseClient } from './clickhouse-client.js';
import type { JsMsg } from 'nats';

const logger = createServiceLogger('clickhouse-loader');

// Checkpoint configuration
const CHECKPOINT_INTERVAL = 10000; // Save checkpoint every 10K events
const CONSUMER_NAME = 'clickhouse-loader';

interface LoaderCheckpoint {
  lastEventId: string;
  lastProcessedAt: Date;
  eventsProcessed: number;
}

class IncrementalLoader {
  private eventsProcessed = 0;
  private lastCheckpoint: LoaderCheckpoint | null = null;
  private isRunning = false;

  /**
   * Start the loader
   */
  async start(mode: 'incremental' | 'backfill' = 'incremental'): Promise<void> {
    if (this.isRunning) {
      logger.warn('Loader already running');
      return;
    }

    this.isRunning = true;
    logger.info({ mode }, 'Starting incremental loader');

    if (mode === 'backfill') {
      await this.runBackfill();
    } else {
      await this.runIncremental();
    }
  }

  /**
   * Run incremental loading from NATS
   */
  private async runIncremental(): Promise<void> {
    // Load last checkpoint
    this.lastCheckpoint = await this.loadCheckpoint();

    logger.info({ checkpoint: this.lastCheckpoint }, 'Starting incremental load');

    // Subscribe to NATS with durable consumer
    const eventBus = getEventBus();
    await eventBus.connect();

    await eventBus.subscribe(
      '*.*', // All subjects
      async (msg) => {
        await this.processEvent(msg);
      },
      {
        durable: CONSUMER_NAME,
        deliverSubject: `loader.${CONSUMER_NAME}`,
        ackWait: 60000,
        maxDeliver: 3,
        startSequence: this.lastCheckpoint?.eventsProcessed || undefined,
      }
    );

    logger.info('Incremental loader subscribed to NATS');
  }

  /**
   * Run backfill from Postgres
   */
  private async runBackfill(): Promise<void> {
    logger.info('Starting backfill from Postgres');

    // TODO: Implement Postgres to ClickHouse backfill
    // This would query historical data from Postgres tables and load into ClickHouse
    // Example:
    // 1. Query metrics_company_period table
    // 2. Transform to ClickHouse format
    // 3. Batch insert to metrics_timeseries table
    // 4. Save checkpoint after each batch

    logger.warn('Backfill not implemented yet - would load from Postgres tables');

    // For now, switch to incremental mode
    await this.runIncremental();
  }

  /**
   * Process a single event
   */
  private async processEvent(msg: JsMsg): Promise<void> {
    try {
      const subject = msg.subject;
      const payload = msg.json();

      const clickhouse = getClickHouseClient();

      // Insert to events table
      await clickhouse.insert('events', {
        event_id: `${subject}-${msg.seq}`,
        event_type: subject,
        company_id: payload.companyId || '',
        user_id: payload.userId || null,
        timestamp: new Date().toISOString(),
        payload: JSON.stringify(payload),
      });

      // If it's a metric event, also insert to metrics_timeseries
      if (subject.startsWith('metrics.') && payload.metricName && payload.value !== undefined) {
        await clickhouse.insert('metrics_timeseries', {
          company_id: payload.companyId || '',
          metric_name: payload.metricName,
          metric_value: payload.value,
          period_start: payload.periodStart || new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          dimensions: JSON.stringify(payload.dimensions || {}),
        });
      }

      this.eventsProcessed++;
      msg.ack();

      // Save checkpoint periodically
      if (this.eventsProcessed % CHECKPOINT_INTERVAL === 0) {
        await this.saveCheckpoint(`${subject}-${msg.seq}`);
        logger.info({ eventsProcessed: this.eventsProcessed }, 'Checkpoint saved');
      }
    } catch (error) {
      logger.error({ error, subject: msg.subject }, 'Failed to process event');
      msg.nak(5000); // Retry after 5 seconds
    }
  }

  /**
   * Load checkpoint from ClickHouse
   */
  private async loadCheckpoint(): Promise<LoaderCheckpoint | null> {
    try {
      const clickhouse = getClickHouseClient();
      const results = await clickhouse.query<{
        last_event_id: string;
        last_processed_at: string;
        events_processed: number;
      }>(
        `SELECT last_event_id, last_processed_at, events_processed
         FROM processing_checkpoints
         WHERE consumer_name = '${CONSUMER_NAME}'
         ORDER BY last_processed_at DESC
         LIMIT 1`
      );

      if (results.length > 0) {
        const row = results[0];
        return {
          lastEventId: row.last_event_id,
          lastProcessedAt: new Date(row.last_processed_at),
          eventsProcessed: row.events_processed,
        };
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Failed to load checkpoint');
      return null;
    }
  }

  /**
   * Save checkpoint to ClickHouse
   */
  private async saveCheckpoint(lastEventId: string): Promise<void> {
    try {
      const clickhouse = getClickHouseClient();

      await clickhouse.insert('processing_checkpoints', {
        consumer_name: CONSUMER_NAME,
        last_event_id: lastEventId,
        last_processed_at: new Date().toISOString(),
        events_processed: this.eventsProcessed,
      });

      this.lastCheckpoint = {
        lastEventId,
        lastProcessedAt: new Date(),
        eventsProcessed: this.eventsProcessed,
      };
    } catch (error) {
      logger.error({ error, lastEventId }, 'Failed to save checkpoint');
    }
  }

  /**
   * Stop the loader
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping incremental loader');

    // Save final checkpoint
    if (this.lastCheckpoint) {
      await this.saveCheckpoint(this.lastCheckpoint.lastEventId);
    }

    this.isRunning = false;
    logger.info({ eventsProcessed: this.eventsProcessed }, 'Incremental loader stopped');
  }

  /**
   * Get loader statistics
   */
  getStats(): {
    isRunning: boolean;
    eventsProcessed: number;
    lastCheckpoint: LoaderCheckpoint | null;
  } {
    return {
      isRunning: this.isRunning,
      eventsProcessed: this.eventsProcessed,
      lastCheckpoint: this.lastCheckpoint,
    };
  }
}

// Singleton instance
let loader: IncrementalLoader | null = null;

/**
 * Initialize and start loader
 */
export async function initLoader(mode: 'incremental' | 'backfill' = 'incremental'): Promise<IncrementalLoader> {
  if (!loader) {
    loader = new IncrementalLoader();
    await loader.start(mode);
  }
  return loader;
}

/**
 * Get loader instance
 */
export function getLoader(): IncrementalLoader | null {
  return loader;
}

/**
 * Stop loader
 */
export async function stopLoader(): Promise<void> {
  if (loader) {
    await loader.stop();
    loader = null;
  }
}
