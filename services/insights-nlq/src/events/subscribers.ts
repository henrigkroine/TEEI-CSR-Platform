/**
 * Cross-Service Event Subscribers
 *
 * Subscribes to events from other services and handles them appropriately:
 * - Analytics service: metrics.updated
 * - Q2Q AI service: outcomes.classified
 * - Reporting service: reports.generated
 *
 * Initializes NATS connection and sets up all event handlers on service startup
 */

import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import {
  handleMetricsUpdated,
  handleOutcomesClassified,
  handleReportsGenerated,
} from './cache-invalidation.js';

const logger = createServiceLogger('insights-nlq:subscribers');

// ===== EVENT PAYLOAD TYPES =====

interface MetricsUpdatedEvent {
  id: string;
  type: 'metrics.updated';
  version: string;
  timestamp: string;
  data: {
    companyId: string;
    metricType: string;
    period: string;
    updatedAt: string;
    metricValue?: number;
  };
}

interface OutcomesClassifiedEvent {
  id: string;
  type: 'outcomes.classified';
  version: string;
  timestamp: string;
  data: {
    companyId: string;
    feedbackId: string;
    outcomeScores: Record<string, number>;
    classifiedAt: string;
  };
}

interface ReportsGeneratedEvent {
  id: string;
  type: 'reports.generated';
  version: string;
  timestamp: string;
  data: {
    companyId: string;
    reportId: string;
    reportType: string;
    generatedAt: string;
  };
}

// ===== SUBSCRIBER INITIALIZATION =====

/**
 * Initialize all cross-service event subscriptions
 * Call this on service startup after NATS connection is established
 */
export async function initializeSubscribers(): Promise<void> {
  logger.info('Initializing cross-service event subscribers');

  const eventBus = getEventBus();

  // Ensure event bus is connected
  if (!eventBus['nc']) {
    logger.info('Event bus not connected, connecting now...');
    await eventBus.connect();
  }

  try {
    // Subscribe to metrics.updated events from analytics service
    await subscribeToMetricsUpdated();

    // Subscribe to outcomes.classified events from Q2Q service
    await subscribeToOutcomesClassified();

    // Subscribe to reports.generated events from reporting service
    await subscribeToReportsGenerated();

    logger.info('All cross-service event subscribers initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize event subscribers');
    throw error;
  }
}

/**
 * Shutdown all event subscriptions
 * Call this on service shutdown for graceful cleanup
 */
export async function shutdownSubscribers(): Promise<void> {
  logger.info('Shutting down event subscribers');

  const eventBus = getEventBus();

  try {
    await eventBus.disconnect();
    logger.info('Event subscribers shut down successfully');
  } catch (error) {
    logger.error({ error }, 'Error shutting down event subscribers');
  }
}

// ===== INDIVIDUAL SUBSCRIBERS =====

/**
 * Subscribe to metrics.updated events from analytics service
 *
 * Subject: metrics.updated
 * Queue group: insights-nlq-metrics
 */
async function subscribeToMetricsUpdated(): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<MetricsUpdatedEvent>(
    'metrics.updated' as any,
    async (event) => {
      try {
        logger.debug(
          {
            eventId: event.id,
            companyId: event.data.companyId,
            metricType: event.data.metricType,
          },
          'Received metrics.updated event'
        );

        await handleMetricsUpdated({
          companyId: event.data.companyId,
          metricType: event.data.metricType,
          period: event.data.period,
          updatedAt: event.data.updatedAt,
        });
      } catch (error) {
        logger.error(
          { error, eventId: event.id, companyId: event.data.companyId },
          'Error processing metrics.updated event'
        );
        // Error is logged but not thrown - prevents event from being NACKed
      }
    },
    {
      queue: 'insights-nlq-metrics', // Queue group for load balancing
    }
  );

  logger.info('Subscribed to metrics.updated events');
}

/**
 * Subscribe to outcomes.classified events from Q2Q AI service
 *
 * Subject: outcomes.classified
 * Queue group: insights-nlq-outcomes
 */
async function subscribeToOutcomesClassified(): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<OutcomesClassifiedEvent>(
    'outcomes.classified' as any,
    async (event) => {
      try {
        logger.debug(
          {
            eventId: event.id,
            companyId: event.data.companyId,
            feedbackId: event.data.feedbackId,
          },
          'Received outcomes.classified event'
        );

        await handleOutcomesClassified({
          companyId: event.data.companyId,
          feedbackId: event.data.feedbackId,
          outcomeScores: event.data.outcomeScores,
          classifiedAt: event.data.classifiedAt,
        });
      } catch (error) {
        logger.error(
          { error, eventId: event.id, companyId: event.data.companyId },
          'Error processing outcomes.classified event'
        );
      }
    },
    {
      queue: 'insights-nlq-outcomes',
    }
  );

  logger.info('Subscribed to outcomes.classified events');
}

/**
 * Subscribe to reports.generated events from reporting service
 *
 * Subject: reports.generated
 * Queue group: insights-nlq-reports
 */
async function subscribeToReportsGenerated(): Promise<void> {
  const eventBus = getEventBus();

  await eventBus.subscribe<ReportsGeneratedEvent>(
    'reports.generated' as any,
    async (event) => {
      try {
        logger.debug(
          {
            eventId: event.id,
            companyId: event.data.companyId,
            reportId: event.data.reportId,
            reportType: event.data.reportType,
          },
          'Received reports.generated event'
        );

        await handleReportsGenerated({
          companyId: event.data.companyId,
          reportId: event.data.reportId,
          reportType: event.data.reportType,
          generatedAt: event.data.generatedAt,
        });
      } catch (error) {
        logger.error(
          { error, eventId: event.id, companyId: event.data.companyId },
          'Error processing reports.generated event'
        );
      }
    },
    {
      queue: 'insights-nlq-reports',
    }
  );

  logger.info('Subscribed to reports.generated events');
}

// ===== HEALTH CHECK =====

/**
 * Check if event subscribers are healthy
 * Returns true if NATS connection is active
 */
export async function checkSubscribersHealth(): Promise<{
  healthy: boolean;
  connected: boolean;
  subscriptions: number;
}> {
  const eventBus = getEventBus();

  try {
    const isConnected = eventBus['nc'] !== null;
    const subscriptionCount = eventBus['subscriptions']?.size || 0;

    return {
      healthy: isConnected && subscriptionCount >= 3, // Should have at least 3 subscriptions
      connected: isConnected,
      subscriptions: subscriptionCount,
    };
  } catch (error) {
    logger.error({ error }, 'Error checking subscribers health');
    return {
      healthy: false,
      connected: false,
      subscriptions: 0,
    };
  }
}

// ===== MONITORING & METRICS =====

let eventStats = {
  metricsUpdated: 0,
  outcomesClassified: 0,
  reportsGenerated: 0,
  totalProcessed: 0,
  totalErrors: 0,
  lastEventAt: null as Date | null,
};

/**
 * Get event processing statistics
 */
export function getEventStats(): typeof eventStats {
  return { ...eventStats };
}

/**
 * Reset event statistics
 * Useful for testing or periodic resets
 */
export function resetEventStats(): void {
  eventStats = {
    metricsUpdated: 0,
    outcomesClassified: 0,
    reportsGenerated: 0,
    totalProcessed: 0,
    totalErrors: 0,
    lastEventAt: null,
  };
  logger.info('Event stats reset');
}

/**
 * Increment event stat counters
 * Called by handlers to track processing
 */
function incrementEventStat(eventType: 'metrics' | 'outcomes' | 'reports', error: boolean = false): void {
  eventStats.totalProcessed++;
  eventStats.lastEventAt = new Date();

  if (error) {
    eventStats.totalErrors++;
  } else {
    switch (eventType) {
      case 'metrics':
        eventStats.metricsUpdated++;
        break;
      case 'outcomes':
        eventStats.outcomesClassified++;
        break;
      case 'reports':
        eventStats.reportsGenerated++;
        break;
    }
  }
}
