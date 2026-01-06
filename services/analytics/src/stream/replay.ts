/**
 * Event Replay Mechanism
 * Stores recent events for SSE reconnection replay
 * Uses Redis for fast access and 24-hour TTL
 */

import { createServiceLogger } from '@teei/shared-utils';
import { getRedisClient } from '../cache/redis.js';
import type { SSEEventType } from './sse.js';

const logger = createServiceLogger('event-replay');

// Redis key prefix for replay cache
const REPLAY_KEY_PREFIX = 'sse:replay';

// Event retention period (24 hours)
const EVENT_TTL = 24 * 60 * 60; // seconds

export interface ReplayEvent {
  id: string;
  type: SSEEventType;
  companyId: string;
  data: any;
  timestamp: string;
}

/**
 * Save event to replay cache
 * Events are stored with 24-hour TTL
 */
export async function saveEventForReplay(
  eventId: string,
  companyId: string,
  eventType: SSEEventType,
  data: any
): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.debug('Redis not available, skipping replay cache');
      return;
    }

    const event: ReplayEvent = {
      id: eventId,
      type: eventType,
      companyId,
      data,
      timestamp: new Date().toISOString(),
    };

    // Store event in a sorted set by timestamp for each company
    const key = `${REPLAY_KEY_PREFIX}:${companyId}`;
    const score = Date.now(); // Use timestamp as score for sorting

    await redis.zadd(key, score, JSON.stringify(event));

    // Set expiration on the key (renews on each add)
    await redis.expire(key, EVENT_TTL);

    logger.debug({ eventId, companyId, key }, 'Event saved to replay cache');
  } catch (error) {
    logger.error({ error, eventId, companyId }, 'Failed to save event to replay cache');
    // Don't throw - replay is best-effort
  }
}

/**
 * Get events since a specific event ID for replay
 * Returns events in chronological order
 */
export async function getEventsSince(lastEventId: string, companyId: string): Promise<ReplayEvent[]> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      logger.debug('Redis not available, returning empty replay events');
      return [];
    }

    const key = `${REPLAY_KEY_PREFIX}:${companyId}`;

    // Get all events from the sorted set
    const rawEvents = await redis.zrange(key, 0, -1);

    if (!rawEvents || rawEvents.length === 0) {
      return [];
    }

    // Parse events
    const events: ReplayEvent[] = [];
    let foundLastEvent = false;

    for (const rawEvent of rawEvents) {
      try {
        const event = JSON.parse(rawEvent) as ReplayEvent;

        // If we haven't found the last event ID yet, skip events
        if (!foundLastEvent) {
          if (event.id === lastEventId) {
            foundLastEvent = true;
          }
          continue; // Skip this event and earlier ones
        }

        events.push(event);
      } catch (parseError) {
        logger.error({ error: parseError, rawEvent }, 'Failed to parse replay event');
      }
    }

    logger.info(
      { companyId, lastEventId, totalInCache: rawEvents.length, replayCount: events.length },
      'Retrieved events for replay'
    );

    return events;
  } catch (error) {
    logger.error({ error, lastEventId, companyId }, 'Failed to retrieve replay events');
    return [];
  }
}

/**
 * Get recent events (for debugging/monitoring)
 */
export async function getRecentEvents(
  companyId: string,
  limit: number = 100
): Promise<ReplayEvent[]> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return [];
    }

    const key = `${REPLAY_KEY_PREFIX}:${companyId}`;

    // Get most recent events (negative index for reverse order)
    const rawEvents = await redis.zrange(key, -limit, -1);

    const events: ReplayEvent[] = [];
    for (const rawEvent of rawEvents) {
      try {
        events.push(JSON.parse(rawEvent) as ReplayEvent);
      } catch (parseError) {
        logger.error({ error: parseError }, 'Failed to parse replay event');
      }
    }

    return events.reverse(); // Return in chronological order
  } catch (error) {
    logger.error({ error, companyId }, 'Failed to retrieve recent events');
    return [];
  }
}

/**
 * Clean up old events (called periodically)
 * Redis TTL should handle this, but this provides explicit cleanup
 */
export async function cleanupOldEvents(): Promise<number> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return 0;
    }

    // Get all replay keys
    const keys = await redis.keys(`${REPLAY_KEY_PREFIX}:*`);

    let totalCleaned = 0;
    const cutoffTime = Date.now() - EVENT_TTL * 1000;

    for (const key of keys) {
      // Remove events older than cutoff time
      const removed = await redis.zremrangebyscore(key, 0, cutoffTime);
      totalCleaned += removed;
    }

    if (totalCleaned > 0) {
      logger.info({ cleaned: totalCleaned }, 'Cleaned up old replay events');
    }

    return totalCleaned;
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup old events');
    return 0;
  }
}

/**
 * Get replay cache statistics
 */
export async function getReplayCacheStats(): Promise<{
  companies: number;
  totalEvents: number;
  eventsByCompany: Record<string, number>;
}> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return { companies: 0, totalEvents: 0, eventsByCompany: {} };
    }

    const keys = await redis.keys(`${REPLAY_KEY_PREFIX}:*`);

    const eventsByCompany: Record<string, number> = {};
    let totalEvents = 0;

    for (const key of keys) {
      const companyId = key.replace(`${REPLAY_KEY_PREFIX}:`, '');
      const count = await redis.zcard(key);
      eventsByCompany[companyId] = count;
      totalEvents += count;
    }

    return {
      companies: keys.length,
      totalEvents,
      eventsByCompany,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get replay cache stats');
    return { companies: 0, totalEvents: 0, eventsByCompany: {} };
  }
}

// Periodic cleanup (run every hour)
setInterval(async () => {
  await cleanupOldEvents();
}, 60 * 60 * 1000);
