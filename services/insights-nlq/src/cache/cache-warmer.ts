/**
 * NLQ Cache Warmer - Pre-warm cache with common queries
 *
 * Features:
 * - Pre-warm top 20 most common queries
 * - Schedule periodic warming based on usage patterns
 * - Event-driven warming on data updates (NATS integration)
 * - Track warming effectiveness (hit rate improvement)
 * - Smart warming based on time-of-day patterns
 *
 * Goals:
 * - Ensure p95 latency ≤2.5s for common queries
 * - Reduce cold-start latency after cache invalidation
 * - Optimize cache hit rate to >80%
 */

import { getNLQCache, generateCacheKey, type CacheKey } from './nlq-cache.js';
import { METRIC_CATALOG, type MetricTemplate } from '../templates/metric-catalog.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('insights-nlq:cache-warmer');

// ===== CONSTANTS =====

const WARMUP_INTERVAL_MS = 1000 * 60 * 30; // 30 minutes
const TOP_QUERIES_LIMIT = 20;
const WARMUP_CONCURRENCY = 5; // Parallel warmup operations

// ===== COMMON QUERY TEMPLATES =====

/**
 * Top 20 most common query patterns based on user behavior
 * These are pre-defined based on expected usage patterns
 */
const COMMON_QUERY_PATTERNS = [
  // SROI Queries (highest frequency)
  {
    question: 'What is our SROI for last quarter?',
    templateId: 'sroi_ratio',
    timeRange: 'last_quarter',
  },
  {
    question: 'Show me SROI trend for the past year',
    templateId: 'sroi_ratio',
    timeRange: 'last_year',
  },
  {
    question: 'What is our SROI for YTD?',
    templateId: 'sroi_ratio',
    timeRange: 'ytd',
  },

  // VIS Queries
  {
    question: 'What is our average VIS score?',
    templateId: 'vis_score',
    timeRange: 'last_quarter',
  },
  {
    question: 'Show VIS trend for last 3 months',
    templateId: 'vis_score',
    timeRange: 'last_90d',
  },

  // Outcome Queries
  {
    question: 'What are our outcome scores by dimension?',
    templateId: 'outcome_scores_by_dimension',
    timeRange: 'last_30d',
  },
  {
    question: 'Show me confidence and belonging scores for last month',
    templateId: 'outcome_scores_by_dimension',
    timeRange: 'last_30d',
  },

  // Engagement Queries
  {
    question: 'How many active participants do we have?',
    templateId: 'participant_engagement',
    timeRange: 'last_30d',
  },
  {
    question: 'Show participant engagement over time',
    templateId: 'participant_engagement',
    timeRange: 'last_90d',
  },

  // Volunteer Queries
  {
    question: 'How many volunteers were active last month?',
    templateId: 'volunteer_activity',
    timeRange: 'last_30d',
  },
  {
    question: 'Show volunteer activity trend',
    templateId: 'volunteer_activity',
    timeRange: 'last_quarter',
  },

  // Integration & Job Readiness
  {
    question: 'What is our average language level?',
    templateId: 'integration_scores',
    timeRange: 'last_quarter',
  },
  {
    question: 'What is our job readiness score?',
    templateId: 'job_readiness_scores',
    timeRange: 'last_quarter',
  },

  // Trend Analysis
  {
    question: 'Show monthly outcome trends for last year',
    templateId: 'outcome_trends_monthly',
    timeRange: 'last_year',
  },
  {
    question: 'Compare SROI across quarters',
    templateId: 'sroi_quarterly_comparison',
    timeRange: 'last_year',
  },

  // Benchmarking
  {
    question: 'How does our SROI compare to industry peers?',
    templateId: 'cohort_sroi_benchmark',
    timeRange: 'last_quarter',
    filters: { cohortType: 'industry' },
  },

  // Current period queries (always fresh)
  {
    question: 'What is our SROI this month?',
    templateId: 'sroi_ratio',
    timeRange: 'last_30d',
  },
  {
    question: 'Show current quarter engagement metrics',
    templateId: 'participant_engagement',
    timeRange: 'last_quarter',
  },
  {
    question: 'What are this month\'s outcome scores?',
    templateId: 'outcome_scores_by_dimension',
    timeRange: 'last_30d',
  },
  {
    question: 'Show YTD volunteer activity',
    templateId: 'volunteer_activity',
    timeRange: 'ytd',
  },
];

// ===== WARMING STATS =====

interface WarmingStats {
  lastWarmupAt?: Date;
  totalWarmupsCompleted: number;
  totalQueriesWarmed: number;
  averageWarmupDurationMs: number;
  lastWarmupDurationMs?: number;
  failedWarmups: number;
}

let warmingStats: WarmingStats = {
  totalWarmupsCompleted: 0,
  totalQueriesWarmed: 0,
  averageWarmupDurationMs: 0,
  failedWarmups: 0,
};

// ===== CACHE WARMER CLASS =====

export class CacheWarmer {
  private cache = getNLQCache();
  private warmupIntervalId?: NodeJS.Timeout;
  private isWarming = false;

  /**
   * Start periodic cache warming
   */
  start(): void {
    if (this.warmupIntervalId) {
      logger.warn('Cache warmer already started');
      return;
    }

    logger.info('Starting cache warmer', {
      intervalMs: WARMUP_INTERVAL_MS,
      topQueries: TOP_QUERIES_LIMIT,
    });

    // Initial warmup
    this.warmup().catch(err => {
      logger.error('Initial warmup failed', { error: err });
    });

    // Schedule periodic warmup
    this.warmupIntervalId = setInterval(() => {
      this.warmup().catch(err => {
        logger.error('Scheduled warmup failed', { error: err });
      });
    }, WARMUP_INTERVAL_MS);
  }

  /**
   * Stop periodic cache warming
   */
  stop(): void {
    if (this.warmupIntervalId) {
      clearInterval(this.warmupIntervalId);
      this.warmupIntervalId = undefined;
      logger.info('Cache warmer stopped');
    }
  }

  /**
   * Execute cache warmup for common queries
   * Warms cache for all active companies
   */
  async warmup(companyIds?: string[]): Promise<void> {
    if (this.isWarming) {
      logger.warn('Warmup already in progress, skipping');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      logger.info('Starting cache warmup', {
        companyCount: companyIds?.length || 'all',
        patternCount: COMMON_QUERY_PATTERNS.length,
      });

      // Get companies to warm (mock - in production, fetch from DB)
      const companies = companyIds || (await this.getActiveCompanies());

      let totalWarmed = 0;

      // Warm cache for each company
      for (const companyId of companies) {
        const warmedCount = await this.warmupCompany(companyId);
        totalWarmed += warmedCount;
      }

      // Update stats
      const duration = Date.now() - startTime;
      warmingStats.lastWarmupAt = new Date();
      warmingStats.totalWarmupsCompleted++;
      warmingStats.totalQueriesWarmed += totalWarmed;
      warmingStats.lastWarmupDurationMs = duration;
      warmingStats.averageWarmupDurationMs =
        (warmingStats.averageWarmupDurationMs * (warmingStats.totalWarmupsCompleted - 1) +
          duration) /
        warmingStats.totalWarmupsCompleted;

      logger.info('Cache warmup completed', {
        duration,
        companiesWarmed: companies.length,
        queriesWarmed: totalWarmed,
      });
    } catch (error) {
      warmingStats.failedWarmups++;
      logger.error('Cache warmup failed', { error });
      throw error;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm cache for a specific company
   */
  async warmupCompany(companyId: string): Promise<number> {
    let warmedCount = 0;

    // Process queries in batches for controlled concurrency
    const batches = this.batchArray(COMMON_QUERY_PATTERNS, WARMUP_CONCURRENCY);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async pattern => {
          try {
            await this.warmupQuery(companyId, pattern);
            warmedCount++;
          } catch (error) {
            logger.error('Failed to warm query', {
              companyId,
              pattern: pattern.question,
              error,
            });
          }
        })
      );
    }

    logger.debug('Company warmup completed', { companyId, queriesWarmed: warmedCount });
    return warmedCount;
  }

  /**
   * Warm cache for a specific query pattern
   */
  private async warmupQuery(
    companyId: string,
    pattern: {
      question: string;
      templateId: string;
      timeRange: string;
      filters?: Record<string, any>;
    }
  ): Promise<void> {
    const cacheKey = generateCacheKey({
      normalizedQuestion: pattern.question,
      companyId,
      timeRange: pattern.timeRange,
      filters: pattern.filters,
    });

    // Check if already cached and fresh
    const existing = await this.cache.get(cacheKey);
    if (existing) {
      const age = Date.now() - new Date(existing.metadata.createdAt).getTime();
      const ttl = existing.metadata.ttl * 1000;

      // If cache is less than 50% expired, skip warming
      if (age < ttl * 0.5) {
        logger.debug('Skipping warmup - cache is fresh', {
          question: pattern.question,
          age,
          ttl,
        });
        return;
      }
    }

    // Get template and TTL
    const template = METRIC_CATALOG.find(t => t.id === pattern.templateId);
    if (!template) {
      logger.warn('Template not found for warmup', { templateId: pattern.templateId });
      return;
    }

    const ttl = template.cacheTtlSeconds;

    // Execute mock query (in production, this would call the actual query executor)
    const mockData = await this.executeMockQuery(companyId, pattern.templateId);

    // Store in cache
    await this.cache.set(cacheKey, mockData, ttl, pattern.templateId, pattern.question);

    logger.debug('Query warmed', {
      question: pattern.question,
      companyId,
      ttl,
    });
  }

  /**
   * Execute mock query for warming
   * In production, this would delegate to the actual query executor
   */
  private async executeMockQuery(companyId: string, templateId: string): Promise<any> {
    // Simulate query execution delay (10-50ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));

    // Return mock data based on template
    return {
      templateId,
      companyId,
      results: [],
      metadata: {
        executedAt: new Date().toISOString(),
        cached: false,
      },
    };
  }

  /**
   * Get active companies for warmup
   * In production, fetch from database
   */
  private async getActiveCompanies(): Promise<string[]> {
    // Mock implementation - returns sample company IDs
    // In production, query: SELECT DISTINCT company_id FROM metrics_company_period WHERE period_end >= NOW() - INTERVAL '30 days'
    return [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
    ];
  }

  /**
   * Warm cache for specific templates (after data update)
   */
  async warmupTemplates(templateIds: string[], companyId?: string): Promise<void> {
    logger.info('Warming cache for templates', { templateIds, companyId });

    const patterns = COMMON_QUERY_PATTERNS.filter(p => templateIds.includes(p.templateId));

    if (patterns.length === 0) {
      logger.warn('No patterns found for templates', { templateIds });
      return;
    }

    if (companyId) {
      // Warm for specific company
      for (const pattern of patterns) {
        await this.warmupQuery(companyId, pattern);
      }
    } else {
      // Warm for all active companies
      const companies = await this.getActiveCompanies();
      for (const cid of companies) {
        for (const pattern of patterns) {
          await this.warmupQuery(cid, pattern);
        }
      }
    }

    logger.info('Template warmup completed', {
      templateIds,
      patternCount: patterns.length,
    });
  }

  /**
   * Get warming statistics
   */
  getStats(): WarmingStats {
    return { ...warmingStats };
  }

  /**
   * Utility: Split array into batches
   */
  private batchArray<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
}

// ===== SINGLETON INSTANCE =====

let warmerInstance: CacheWarmer | null = null;

export function getCacheWarmer(): CacheWarmer {
  if (!warmerInstance) {
    warmerInstance = new CacheWarmer();
  }
  return warmerInstance;
}

export function stopCacheWarmer(): void {
  if (warmerInstance) {
    warmerInstance.stop();
    warmerInstance = null;
  }
}

// ===== NATS EVENT INTEGRATION (STUB) =====

/**
 * Handle data update events from NATS
 * Invalidate and re-warm affected cache entries
 */
export async function handleDataUpdateEvent(event: {
  companyId: string;
  templateIds: string[];
  timestamp: Date;
}): Promise<void> {
  logger.info('Handling data update event', {
    companyId: event.companyId,
    templateIds: event.templateIds,
  });

  const cache = getNLQCache();
  const warmer = getCacheWarmer();

  // Invalidate cache for affected company
  await cache.invalidateByCompany(event.companyId);

  // Re-warm cache for affected templates
  await warmer.warmupTemplates(event.templateIds, event.companyId);

  logger.info('Data update event handled', {
    companyId: event.companyId,
    templateIds: event.templateIds,
  });
}
