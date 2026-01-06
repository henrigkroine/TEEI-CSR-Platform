/**
 * NLQ Event Publishers and Subscribers
 *
 * Publishes query lifecycle events:
 * - nlq.query.started - Query execution began
 * - nlq.query.completed - Query finished successfully
 * - nlq.query.failed - Query failed with error
 * - nlq.query.rejected - Safety check failed
 * - nlq.cache.invalidated - Cache entries cleared
 *
 * Integration with NATS event bus for cross-service communication
 */

import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import type {
  NLQQueryStarted,
  NLQQueryCompleted,
  NLQQueryFailed,
  NLQQueryRejected,
  NLQCacheInvalidated,
} from '@teei/event-contracts';
import { randomUUID } from 'crypto';

const logger = createServiceLogger('insights-nlq:events');

// ===== EVENT PUBLISHERS =====

export interface QueryStartedPayload {
  queryId: string;
  companyId: string;
  userId?: string;
  normalizedQuestion: string;
  templateId?: string;
}

export interface QueryCompletedPayload {
  queryId: string;
  companyId: string;
  userId?: string;
  templateId: string;
  executionTimeMs: number;
  cached: boolean;
  resultRowCount: number;
  confidence: number;
  safetyPassed: boolean;
}

export interface QueryFailedPayload {
  queryId: string;
  companyId: string;
  userId?: string;
  normalizedQuestion: string;
  templateId?: string;
  errorMessage: string;
  errorType: 'validation' | 'execution' | 'timeout' | 'unknown';
  executionTimeMs: number;
}

export interface QueryRejectedPayload {
  queryId: string;
  companyId: string;
  userId?: string;
  normalizedQuestion: string;
  rejectionReason:
    | 'unsafe_content'
    | 'pii_detected'
    | 'rate_limit'
    | 'invalid_intent'
    | 'blacklisted_pattern';
  safetyScore?: number;
}

export interface CacheInvalidatedPayload {
  companyId?: string;
  templateId?: string;
  pattern?: string;
  keysInvalidated: number;
  reason: 'manual' | 'data_update' | 'metrics_updated' | 'scheduled';
}

/**
 * Publish query started event
 */
export async function publishQueryStarted(payload: QueryStartedPayload): Promise<void> {
  const eventBus = getEventBus();

  const event: NLQQueryStarted = {
    id: randomUUID(),
    type: 'nlq.query.started',
    version: 'v1',
    timestamp: new Date().toISOString(),
    data: {
      ...payload,
      startedAt: new Date().toISOString(),
    },
  };

  try {
    await eventBus.publish(event);
    logger.debug({ queryId: payload.queryId, companyId: payload.companyId }, 'Query started event published');
  } catch (error) {
    logger.error({ error, queryId: payload.queryId }, 'Failed to publish query started event');
    // Don't throw - event publishing failures should not break query execution
  }
}

/**
 * Publish query completed event
 */
export async function publishQueryCompleted(payload: QueryCompletedPayload): Promise<void> {
  const eventBus = getEventBus();

  const event: NLQQueryCompleted = {
    id: randomUUID(),
    type: 'nlq.query.completed',
    version: 'v1',
    timestamp: new Date().toISOString(),
    data: {
      ...payload,
      completedAt: new Date().toISOString(),
    },
  };

  try {
    await eventBus.publish(event);
    logger.info(
      {
        queryId: payload.queryId,
        companyId: payload.companyId,
        executionTimeMs: payload.executionTimeMs,
        cached: payload.cached,
      },
      'Query completed event published'
    );
  } catch (error) {
    logger.error({ error, queryId: payload.queryId }, 'Failed to publish query completed event');
  }
}

/**
 * Publish query failed event
 */
export async function publishQueryFailed(payload: QueryFailedPayload): Promise<void> {
  const eventBus = getEventBus();

  const event: NLQQueryFailed = {
    id: randomUUID(),
    type: 'nlq.query.failed',
    version: 'v1',
    timestamp: new Date().toISOString(),
    data: {
      ...payload,
      failedAt: new Date().toISOString(),
    },
  };

  try {
    await eventBus.publish(event);
    logger.warn(
      {
        queryId: payload.queryId,
        companyId: payload.companyId,
        errorType: payload.errorType,
        errorMessage: payload.errorMessage,
      },
      'Query failed event published'
    );
  } catch (error) {
    logger.error({ error, queryId: payload.queryId }, 'Failed to publish query failed event');
  }
}

/**
 * Publish query rejected event
 */
export async function publishQueryRejected(payload: QueryRejectedPayload): Promise<void> {
  const eventBus = getEventBus();

  const event: NLQQueryRejected = {
    id: randomUUID(),
    type: 'nlq.query.rejected',
    version: 'v1',
    timestamp: new Date().toISOString(),
    data: {
      ...payload,
      rejectedAt: new Date().toISOString(),
    },
  };

  try {
    await eventBus.publish(event);
    logger.warn(
      {
        queryId: payload.queryId,
        companyId: payload.companyId,
        rejectionReason: payload.rejectionReason,
        safetyScore: payload.safetyScore,
      },
      'Query rejected event published'
    );
  } catch (error) {
    logger.error({ error, queryId: payload.queryId }, 'Failed to publish query rejected event');
  }
}

/**
 * Publish cache invalidated event
 */
export async function publishCacheInvalidated(payload: CacheInvalidatedPayload): Promise<void> {
  const eventBus = getEventBus();

  const event: NLQCacheInvalidated = {
    id: randomUUID(),
    type: 'nlq.cache.invalidated',
    version: 'v1',
    timestamp: new Date().toISOString(),
    data: {
      ...payload,
      invalidatedAt: new Date().toISOString(),
    },
  };

  try {
    await eventBus.publish(event);
    logger.info(
      {
        companyId: payload.companyId,
        templateId: payload.templateId,
        keysInvalidated: payload.keysInvalidated,
        reason: payload.reason,
      },
      'Cache invalidated event published'
    );
  } catch (error) {
    logger.error({ error, payload }, 'Failed to publish cache invalidated event');
  }
}

// ===== EVENT SUBSCRIBERS =====

export type QueryStartedHandler = (event: NLQQueryStarted) => Promise<void> | void;
export type QueryCompletedHandler = (event: NLQQueryCompleted) => Promise<void> | void;
export type QueryFailedHandler = (event: NLQQueryFailed) => Promise<void> | void;
export type QueryRejectedHandler = (event: NLQQueryRejected) => Promise<void> | void;
export type CacheInvalidatedHandler = (event: NLQCacheInvalidated) => Promise<void> | void;

/**
 * Subscribe to query started events
 */
export async function subscribeToQueryStarted(handler: QueryStartedHandler): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<NLQQueryStarted>(
    'nlq.query.started',
    async (event) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error handling query started event');
      }
    },
    {
      queue: 'nlq-query-started', // Queue group for load balancing
    }
  );

  logger.info('Subscribed to nlq.query.started events');
}

/**
 * Subscribe to query completed events
 */
export async function subscribeToQueryCompleted(handler: QueryCompletedHandler): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<NLQQueryCompleted>(
    'nlq.query.completed',
    async (event) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error handling query completed event');
      }
    },
    {
      queue: 'nlq-query-completed',
    }
  );

  logger.info('Subscribed to nlq.query.completed events');
}

/**
 * Subscribe to query failed events
 */
export async function subscribeToQueryFailed(handler: QueryFailedHandler): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<NLQQueryFailed>(
    'nlq.query.failed',
    async (event) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error handling query failed event');
      }
    },
    {
      queue: 'nlq-query-failed',
    }
  );

  logger.info('Subscribed to nlq.query.failed events');
}

/**
 * Subscribe to query rejected events
 */
export async function subscribeToQueryRejected(handler: QueryRejectedHandler): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<NLQQueryRejected>(
    'nlq.query.rejected',
    async (event) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error handling query rejected event');
      }
    },
    {
      queue: 'nlq-query-rejected',
    }
  );

  logger.info('Subscribed to nlq.query.rejected events');
}

/**
 * Subscribe to cache invalidated events
 */
export async function subscribeToCacheInvalidated(handler: CacheInvalidatedHandler): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<NLQCacheInvalidated>(
    'nlq.cache.invalidated',
    async (event) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ error, eventId: event.id }, 'Error handling cache invalidated event');
      }
    },
    {
      queue: 'nlq-cache-invalidated',
    }
  );

  logger.info('Subscribed to nlq.cache.invalidated events');
}
