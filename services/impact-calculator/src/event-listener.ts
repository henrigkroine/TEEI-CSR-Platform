/**
 * VIS Event Listener
 *
 * Listens to buddy_system_events and updates VIS scores in real-time (approximate).
 * This provides fast updates without full recalculation. The batch job will
 * apply proper decay weighting nightly.
 *
 * @module event-listener
 */

import { Pool } from 'pg';
import { EVENT_TYPE_POINTS } from './vis-calculator.js';

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  /** Database connection string */
  databaseUrl: string;
  /** Poll interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Enable detailed logging (default: true) */
  verbose?: boolean;
}

/**
 * Processed event data
 */
interface ProcessedEvent {
  id: string;
  event_id: string;
  event_type: string;
  user_id: string;
  timestamp: Date;
}

/**
 * VIS Event Listener
 *
 * Monitors buddy_system_events table for new events and updates VIS scores
 * in real-time with approximate calculations (no decay update).
 */
export class VISEventListener {
  private pool: Pool;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastProcessedId: string | null = null;

  constructor(private config: EventListenerConfig) {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
    });
  }

  /**
   * Start listening for new events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Event listener is already running');
    }

    this.isRunning = true;
    this.log('Starting VIS event listener...');

    // Get the last processed event ID
    await this.initializeLastProcessedId();

    // Start polling loop
    const pollInterval = this.config.pollInterval || 5000;
    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        this.log(`Poll error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      });
    }, pollInterval);

    this.log(`Event listener started (polling every ${pollInterval}ms)`);
  }

  /**
   * Stop listening for events
   */
  async stop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.isRunning = false;
    this.log('Event listener stopped');
  }

  /**
   * Initialize the last processed event ID from database
   */
  private async initializeLastProcessedId(): Promise<void> {
    const result = await this.pool.query(`
      SELECT id
      FROM buddy_system_events
      WHERE processing_status = 'completed'
      ORDER BY received_at DESC
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      this.lastProcessedId = result.rows[0].id;
      this.log(`Initialized with last processed ID: ${this.lastProcessedId}`);
    } else {
      this.log('No previous events found, starting fresh');
    }
  }

  /**
   * Poll for new events and process them
   */
  private async poll(): Promise<void> {
    try {
      const newEvents = await this.fetchNewEvents();

      if (newEvents.length > 0) {
        this.log(`Found ${newEvents.length} new events`);
        await this.processEvents(newEvents);

        // Update last processed ID
        this.lastProcessedId = newEvents[newEvents.length - 1].id;
      }
    } catch (error) {
      this.log(`Error during poll: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  /**
   * Fetch new events from database
   */
  private async fetchNewEvents(): Promise<ProcessedEvent[]> {
    const query = this.lastProcessedId
      ? `SELECT id, event_id, event_type, user_id, timestamp
         FROM buddy_system_events
         WHERE processing_status = 'completed'
         AND id > $1
         ORDER BY id ASC
         LIMIT 100`
      : `SELECT id, event_id, event_type, user_id, timestamp
         FROM buddy_system_events
         WHERE processing_status = 'completed'
         ORDER BY id ASC
         LIMIT 100`;

    const params = this.lastProcessedId ? [this.lastProcessedId] : [];
    const result = await this.pool.query<ProcessedEvent>(query, params);

    return result.rows;
  }

  /**
   * Process events and update VIS scores
   */
  private async processEvents(events: ProcessedEvent[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const event of events) {
        await this.updateVISForEvent(client, event);
      }

      await client.query('COMMIT');
      this.log(`Successfully processed ${events.length} events`);
    } catch (error) {
      await client.query('ROLLBACK');
      this.log(`Error processing events: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update VIS for a single event (approximate, no decay)
   */
  private async updateVISForEvent(client: any, event: ProcessedEvent): Promise<void> {
    const points = EVENT_TYPE_POINTS[event.event_type] || 0;

    if (points === 0) {
      // No points for this event type (e.g., match.ended)
      return;
    }

    // Get the activity breakdown field name
    const activityField = this.getActivityFieldName(event.event_type);

    // Upsert VIS score with approximate update
    await client.query(
      `INSERT INTO vis_scores (
        user_id, current_vis, raw_points, decay_adjusted_points,
        activity_breakdown, last_activity_date, calculated_at
      )
      VALUES (
        $1, $2, $2, $2,
        jsonb_build_object($3, 1),
        $4, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        current_vis = vis_scores.current_vis + $2,
        raw_points = vis_scores.raw_points + $2,
        decay_adjusted_points = vis_scores.decay_adjusted_points + $2,
        activity_breakdown = jsonb_set(
          vis_scores.activity_breakdown,
          ARRAY[$3],
          to_jsonb(COALESCE((vis_scores.activity_breakdown->>$3)::int, 0) + 1)
        ),
        last_activity_date = GREATEST(vis_scores.last_activity_date, $4),
        calculated_at = NOW()`,
      [event.user_id, points, activityField, event.timestamp]
    );

    this.log(`Updated VIS for user ${event.user_id}: +${points} points (${event.event_type})`);
  }

  /**
   * Get the activity breakdown field name for an event type
   */
  private getActivityFieldName(eventType: string): string {
    switch (eventType) {
      case 'buddy.match.created':
        return 'matches';
      case 'buddy.event.attended':
      case 'buddy.event.logged':
        return 'events';
      case 'buddy.skill_share.completed':
        return 'skill_shares';
      case 'buddy.feedback.submitted':
        return 'feedback';
      case 'buddy.milestone.reached':
        return 'milestones';
      case 'buddy.checkin.completed':
        return 'checkins';
      default:
        return 'unknown';
    }
  }

  /**
   * Close database connections and stop listener
   */
  async close(): Promise<void> {
    await this.stop();
    await this.pool.end();
    this.log('Event listener closed');
  }

  /**
   * Log a message
   */
  private log(message: string, level: 'info' | 'error' = 'info'): void {
    if (this.config.verbose !== false) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [VIS Event Listener] ${message}`;

      if (level === 'error') {
        console.error(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }
}

/**
 * Create and start a VIS event listener
 */
export function createEventListener(config: EventListenerConfig): VISEventListener {
  const listener = new VISEventListener(config);
  listener.start().catch(console.error);
  return listener;
}

// Main entry point (if run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: EventListenerConfig = {
    databaseUrl: process.env.DATABASE_URL || '',
    pollInterval: parseInt(process.env.VIS_POLL_INTERVAL || '5000'),
    verbose: process.env.VIS_VERBOSE !== 'false',
  };

  console.log('Starting VIS Event Listener...');
  console.log('Configuration:', {
    pollInterval: config.pollInterval,
    verbose: config.verbose,
  });

  const listener = createEventListener(config);

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    console.log(`Received signal ${signal}, closing gracefully`);
    await listener.close();
    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
}
