import { delPattern } from './redis.js';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';

const logger = createServiceLogger('cache-invalidation');

/**
 * Invalidate all cached metrics for a specific company
 *
 * This will delete all cache keys matching the pattern:
 * - metrics:company:{companyId}:*
 * - metrics:sroi:{companyId}*
 * - metrics:vis:{companyId}*
 * - metrics:q2q-feed:{companyId}:*
 *
 * @param companyId - Company ID to invalidate cache for
 */
export async function invalidateCompanyCache(companyId: string): Promise<void> {
  logger.info({ companyId }, 'Invalidating company cache');

  try {
    // Delete all metrics cache patterns for this company
    await Promise.all([
      delPattern(`metrics:company:${companyId}:*`),
      delPattern(`metrics:sroi:${companyId}*`),
      delPattern(`metrics:vis:${companyId}*`),
      delPattern(`metrics:q2q-feed:${companyId}:*`),
    ]);

    logger.info({ companyId }, 'Company cache invalidated successfully');
  } catch (error) {
    logger.error({ error, companyId }, 'Failed to invalidate company cache');
  }
}

/**
 * Invalidate cached metrics for a specific period
 *
 * This will delete cache keys matching:
 * - metrics:company:{companyId}:period:{period}
 *
 * @param companyId - Company ID
 * @param period - Period string (e.g., "2024-01" or "2024-Q1")
 */
export async function invalidatePeriodCache(
  companyId: string,
  period: string
): Promise<void> {
  logger.info({ companyId, period }, 'Invalidating period cache');

  try {
    await delPattern(`metrics:company:${companyId}:period:${period}`);
    logger.info({ companyId, period }, 'Period cache invalidated successfully');
  } catch (error) {
    logger.error({ error, companyId, period }, 'Failed to invalidate period cache');
  }
}

/**
 * Invalidate SROI cache for a company
 *
 * This will delete all SROI cache keys for the company:
 * - metrics:sroi:{companyId}*
 *
 * @param companyId - Company ID
 */
export async function invalidateSROICache(companyId: string): Promise<void> {
  logger.info({ companyId }, 'Invalidating SROI cache');

  try {
    await delPattern(`metrics:sroi:${companyId}*`);
    logger.info({ companyId }, 'SROI cache invalidated successfully');
  } catch (error) {
    logger.error({ error, companyId }, 'Failed to invalidate SROI cache');
  }
}

/**
 * Invalidate VIS cache for a company
 *
 * This will delete all VIS cache keys for the company:
 * - metrics:vis:{companyId}*
 *
 * @param companyId - Company ID
 */
export async function invalidateVISCache(companyId: string): Promise<void> {
  logger.info({ companyId }, 'Invalidating VIS cache');

  try {
    await delPattern(`metrics:vis:${companyId}*`);
    logger.info({ companyId }, 'VIS cache invalidated successfully');
  } catch (error) {
    logger.error({ error, companyId }, 'Failed to invalidate VIS cache');
  }
}

/**
 * Invalidate evidence cache for a specific metric
 *
 * @param metricId - Metric ID
 */
export async function invalidateEvidenceCache(metricId: string): Promise<void> {
  logger.info({ metricId }, 'Invalidating evidence cache');

  try {
    await delPattern(`metrics:evidence:${metricId}`);
    logger.info({ metricId }, 'Evidence cache invalidated successfully');
  } catch (error) {
    logger.error({ error, metricId }, 'Failed to invalidate evidence cache');
  }
}

/**
 * Subscribe to NATS events and invalidate cache automatically
 *
 * This function subscribes to events that indicate data changes
 * and automatically invalidates the relevant cache entries.
 *
 * Events monitored:
 * - kintell.session.completed - Invalidate company cache
 * - buddy.feedback.submitted - Invalidate company cache
 * - buddy.match.created - Invalidate company cache
 * - upskilling.course.completed - Invalidate company cache
 * - metrics.aggregated - Invalidate specific period cache
 */
export async function subscribeToInvalidationEvents(): Promise<void> {
  try {
    const eventBus = getEventBus();

    logger.info('Subscribing to cache invalidation events...');

    // Subscribe to Kintell events
    await eventBus.subscribe('kintell.session.completed', async (data: any) => {
      logger.debug({ event: 'kintell.session.completed', data }, 'Received event');

      if (data.companyId) {
        await invalidateCompanyCache(data.companyId);
      }
    });

    // Subscribe to Buddy events
    await eventBus.subscribe('buddy.feedback.submitted', async (data: any) => {
      logger.debug({ event: 'buddy.feedback.submitted', data }, 'Received event');

      if (data.companyId) {
        await invalidateCompanyCache(data.companyId);
      }
    });

    await eventBus.subscribe('buddy.match.created', async (data: any) => {
      logger.debug({ event: 'buddy.match.created', data }, 'Received event');

      if (data.companyId) {
        await invalidateCompanyCache(data.companyId);
      }
    });

    // Subscribe to Upskilling events
    await eventBus.subscribe('upskilling.course.completed', async (data: any) => {
      logger.debug({ event: 'upskilling.course.completed', data }, 'Received event');

      if (data.companyId) {
        await invalidateCompanyCache(data.companyId);
      }
    });

    // Subscribe to metrics aggregation events
    await eventBus.subscribe('metrics.aggregated', async (data: any) => {
      logger.debug({ event: 'metrics.aggregated', data }, 'Received event');

      if (data.companyId && data.period) {
        await invalidatePeriodCache(data.companyId, data.period);
      } else if (data.companyId) {
        await invalidateCompanyCache(data.companyId);
      }
    });

    logger.info('Cache invalidation event subscriptions established');
  } catch (error) {
    logger.error({ error }, 'Failed to subscribe to invalidation events');
    throw error;
  }
}

/**
 * Trigger cache invalidation after metrics aggregation
 *
 * This should be called after POST /metrics/aggregate completes
 *
 * @param companyId - Optional company ID (if specific company was aggregated)
 */
export async function invalidateAfterAggregation(companyId?: string): Promise<void> {
  if (companyId) {
    logger.info({ companyId }, 'Invalidating cache after aggregation for specific company');
    await invalidateCompanyCache(companyId);
  } else {
    logger.info('Invalidating all company caches after global aggregation');
    // For global aggregation, we invalidate all metric caches
    await delPattern('metrics:*');
  }
}
