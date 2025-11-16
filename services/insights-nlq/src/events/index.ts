/**
 * NLQ Events Module
 *
 * Exports all event-related functionality for the insights-nlq service
 */

// Event publishers
export {
  publishQueryStarted,
  publishQueryCompleted,
  publishQueryFailed,
  publishQueryRejected,
  publishCacheInvalidated,
  type QueryStartedPayload,
  type QueryCompletedPayload,
  type QueryFailedPayload,
  type QueryRejectedPayload,
  type CacheInvalidatedPayload,
} from './nlq-events.js';

// Event subscribers
export {
  subscribeToQueryStarted,
  subscribeToQueryCompleted,
  subscribeToQueryFailed,
  subscribeToQueryRejected,
  subscribeToCacheInvalidated,
  type QueryStartedHandler,
  type QueryCompletedHandler,
  type QueryFailedHandler,
  type QueryRejectedHandler,
  type CacheInvalidatedHandler,
} from './nlq-events.js';

// Cache invalidation handlers
export {
  handleMetricsUpdated,
  handleOutcomesClassified,
  handleReportsGenerated,
  manuallyInvalidateCompany,
  invalidateTemplateGlobally,
  scheduledCacheRefresh,
} from './cache-invalidation.js';

// Cross-service subscribers
export {
  initializeSubscribers,
  shutdownSubscribers,
  checkSubscribersHealth,
  getEventStats,
  resetEventStats,
} from './subscribers.js';
