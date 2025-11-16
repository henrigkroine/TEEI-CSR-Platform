/**
 * Cache Invalidation Event Handlers
 *
 * Listens to cross-service events and invalidates NLQ cache when data changes:
 * - metrics.updated (from analytics service)
 * - outcomes.classified (from Q2Q service)
 * - reports.generated (from reporting service)
 *
 * Implements smart invalidation:
 * - Invalidate only affected cache entries (company-scoped)
 * - Re-warm affected queries after invalidation
 * - Track invalidation metrics for observability
 */

import { createServiceLogger } from '@teei/shared-utils';
import { getNLQCache } from '../cache/nlq-cache.js';
import { getCacheWarmer } from '../cache/cache-warmer.js';
import { publishCacheInvalidated } from './nlq-events.js';

const logger = createServiceLogger('insights-nlq:cache-invalidation');

// ===== TEMPLATE MAPPING =====

/**
 * Map metric types to affected NLQ templates
 * When a metric is updated, we invalidate all queries using templates that depend on it
 */
const METRIC_TO_TEMPLATES: Record<string, string[]> = {
  sroi: ['sroi_ratio', 'sroi_quarterly_comparison', 'cohort_sroi_benchmark'],
  vis: ['vis_score'],
  outcomes: ['outcome_scores_by_dimension', 'outcome_trends_monthly'],
  engagement: ['participant_engagement'],
  volunteer: ['volunteer_activity'],
  integration: ['integration_scores'],
  job_readiness: ['job_readiness_scores'],
};

/**
 * All template IDs for full invalidation
 */
const ALL_TEMPLATE_IDS = Object.values(METRIC_TO_TEMPLATES).flat();

// ===== EVENT HANDLERS =====

/**
 * Handle metrics.updated event from analytics service
 *
 * Event payload example:
 * {
 *   companyId: "uuid",
 *   metricType: "sroi",
 *   period: "2024-Q1",
 *   updatedAt: "2024-01-15T10:00:00Z"
 * }
 */
export async function handleMetricsUpdated(event: {
  companyId: string;
  metricType: string;
  period: string;
  updatedAt: string;
}): Promise<void> {
  logger.info(
    {
      companyId: event.companyId,
      metricType: event.metricType,
      period: event.period,
    },
    'Handling metrics.updated event'
  );

  const cache = getNLQCache();
  const warmer = getCacheWarmer();

  try {
    // Get affected templates for this metric type
    const affectedTemplates = METRIC_TO_TEMPLATES[event.metricType] || [];

    if (affectedTemplates.length === 0) {
      logger.warn({ metricType: event.metricType }, 'No templates mapped for metric type');
      return;
    }

    // Invalidate cache for affected company
    const keysInvalidated = await cache.invalidateByCompany(event.companyId);

    logger.info(
      {
        companyId: event.companyId,
        metricType: event.metricType,
        keysInvalidated,
        affectedTemplates,
      },
      'Cache invalidated for metrics update'
    );

    // Publish cache invalidation event
    await publishCacheInvalidated({
      companyId: event.companyId,
      keysInvalidated,
      reason: 'metrics_updated',
    });

    // Re-warm affected queries in background (fire-and-forget)
    warmer.warmupTemplates(affectedTemplates, event.companyId).catch((error) => {
      logger.error(
        { error, companyId: event.companyId, affectedTemplates },
        'Failed to warm cache after metrics update'
      );
    });
  } catch (error) {
    logger.error(
      { error, companyId: event.companyId, metricType: event.metricType },
      'Failed to handle metrics.updated event'
    );
  }
}

/**
 * Handle outcomes.classified event from Q2Q AI service
 *
 * Event payload example:
 * {
 *   companyId: "uuid",
 *   feedbackId: "uuid",
 *   outcomeScores: {
 *     confidence: 0.85,
 *     belonging: 0.72,
 *     ...
 *   },
 *   classifiedAt: "2024-01-15T10:00:00Z"
 * }
 */
export async function handleOutcomesClassified(event: {
  companyId: string;
  feedbackId: string;
  outcomeScores: Record<string, number>;
  classifiedAt: string;
}): Promise<void> {
  logger.info(
    {
      companyId: event.companyId,
      feedbackId: event.feedbackId,
    },
    'Handling outcomes.classified event'
  );

  const cache = getNLQCache();
  const warmer = getCacheWarmer();

  try {
    // Outcomes affect multiple templates
    const affectedTemplates = METRIC_TO_TEMPLATES.outcomes || [];

    // Invalidate cache for affected company
    const keysInvalidated = await cache.invalidateByCompany(event.companyId);

    logger.info(
      {
        companyId: event.companyId,
        feedbackId: event.feedbackId,
        keysInvalidated,
        affectedTemplates,
      },
      'Cache invalidated for outcomes classification'
    );

    // Publish cache invalidation event
    await publishCacheInvalidated({
      companyId: event.companyId,
      keysInvalidated,
      reason: 'data_update',
    });

    // Re-warm affected queries
    warmer.warmupTemplates(affectedTemplates, event.companyId).catch((error) => {
      logger.error(
        { error, companyId: event.companyId, affectedTemplates },
        'Failed to warm cache after outcomes classification'
      );
    });
  } catch (error) {
    logger.error(
      { error, companyId: event.companyId, feedbackId: event.feedbackId },
      'Failed to handle outcomes.classified event'
    );
  }
}

/**
 * Handle reports.generated event from reporting service
 *
 * Event payload example:
 * {
 *   companyId: "uuid",
 *   reportId: "uuid",
 *   reportType: "quarterly",
 *   generatedAt: "2024-01-15T10:00:00Z"
 * }
 */
export async function handleReportsGenerated(event: {
  companyId: string;
  reportId: string;
  reportType: string;
  generatedAt: string;
}): Promise<void> {
  logger.info(
    {
      companyId: event.companyId,
      reportId: event.reportId,
      reportType: event.reportType,
    },
    'Handling reports.generated event'
  );

  // Reports don't necessarily invalidate NLQ cache
  // But we can warm common queries that might be used to verify report data
  const warmer = getCacheWarmer();

  try {
    // Warm top queries for the company (helps users verify report data)
    const templatesForReportType = getTemplatesForReportType(event.reportType);

    if (templatesForReportType.length > 0) {
      logger.info(
        {
          companyId: event.companyId,
          reportType: event.reportType,
          templates: templatesForReportType,
        },
        'Warming cache for report verification queries'
      );

      await warmer.warmupTemplates(templatesForReportType, event.companyId);
    }
  } catch (error) {
    logger.error(
      { error, companyId: event.companyId, reportId: event.reportId },
      'Failed to handle reports.generated event'
    );
  }
}

/**
 * Get templates relevant for a report type
 */
function getTemplatesForReportType(reportType: string): string[] {
  switch (reportType) {
    case 'quarterly':
    case 'annual':
      return ['sroi_ratio', 'vis_score', 'outcome_scores_by_dimension', 'participant_engagement'];
    case 'investor':
      return ['sroi_ratio', 'sroi_quarterly_comparison', 'cohort_sroi_benchmark'];
    case 'impact':
      return ['outcome_scores_by_dimension', 'outcome_trends_monthly', 'volunteer_activity'];
    default:
      return [];
  }
}

// ===== INVALIDATION UTILITIES =====

/**
 * Manually invalidate cache for a company
 * Used for admin operations or data corrections
 */
export async function manuallyInvalidateCompany(companyId: string): Promise<number> {
  logger.info({ companyId }, 'Manual cache invalidation requested');

  const cache = getNLQCache();
  const warmer = getCacheWarmer();

  try {
    const keysInvalidated = await cache.invalidateByCompany(companyId);

    logger.info({ companyId, keysInvalidated }, 'Manual cache invalidation completed');

    // Publish event
    await publishCacheInvalidated({
      companyId,
      keysInvalidated,
      reason: 'manual',
    });

    // Re-warm all templates for the company
    warmer.warmup([companyId]).catch((error) => {
      logger.error({ error, companyId }, 'Failed to warm cache after manual invalidation');
    });

    return keysInvalidated;
  } catch (error) {
    logger.error({ error, companyId }, 'Failed to manually invalidate cache');
    throw error;
  }
}

/**
 * Invalidate cache for a specific template across all companies
 * Used when template logic changes
 */
export async function invalidateTemplateGlobally(templateId: string): Promise<number> {
  logger.info({ templateId }, 'Global template invalidation requested');

  const cache = getNLQCache();

  try {
    const keysInvalidated = await cache.invalidateByTemplate(templateId);

    logger.info({ templateId, keysInvalidated }, 'Global template invalidation completed');

    // Publish event
    await publishCacheInvalidated({
      templateId,
      keysInvalidated,
      reason: 'manual',
    });

    return keysInvalidated;
  } catch (error) {
    logger.error({ error, templateId }, 'Failed to invalidate template globally');
    throw error;
  }
}

/**
 * Scheduled cache refresh (run daily)
 * Invalidates stale entries and warms common queries
 */
export async function scheduledCacheRefresh(): Promise<void> {
  logger.info('Running scheduled cache refresh');

  const cache = getNLQCache();
  const warmer = getCacheWarmer();

  try {
    // Get cache stats to determine if refresh is needed
    const stats = await cache.getStats();

    logger.info(
      {
        totalKeys: stats.totalKeys,
        hitRate: stats.hitRate,
        memoryUsed: stats.memoryUsed,
      },
      'Cache stats before refresh'
    );

    // If cache is too large or hit rate is low, invalidate all
    const shouldFullRefresh = stats.totalKeys > 10000 || stats.hitRate < 50;

    if (shouldFullRefresh) {
      const keysInvalidated = await cache.invalidateAll();
      logger.info({ keysInvalidated }, 'Full cache refresh completed');

      await publishCacheInvalidated({
        keysInvalidated,
        reason: 'scheduled',
      });
    }

    // Warm common queries for all active companies
    await warmer.warmup();

    logger.info('Scheduled cache refresh completed');
  } catch (error) {
    logger.error({ error }, 'Failed to run scheduled cache refresh');
  }
}
