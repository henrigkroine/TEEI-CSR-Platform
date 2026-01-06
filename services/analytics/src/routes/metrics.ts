import { FastifyPluginAsync } from 'fastify';
import { db, metricsCompanyPeriod } from '@teei/shared-schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { calculateSROIForCompany, calculateVISForCompany } from '../pipelines/aggregate.js';
import { getEvidenceForMetric, getEvidenceForPeriod } from '../queries/evidence.js';
import { redactPII } from '../utils/redaction.js';
import { cacheMiddleware, cacheKeyGenerators, TTL } from '../middleware/cache.js';
import { invalidateAfterAggregation } from '../cache/invalidation.js';
import { getCacheStats, getKeyCount } from '../cache/redis.js';

/**
 * Metrics API Routes
 */
export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /metrics/company/:companyId/period/:period
   * Get time-series metrics for a company over a specific period
   *
   * @param companyId - UUID of the company
   * @param period - Period format: YYYY-MM (e.g., 2024-01) or YYYY-Q1/Q2/Q3/Q4
   */
  fastify.get<{
    Params: { companyId: string; period: string };
  }>(
    '/company/:companyId/period/:period',
    {
      preHandler: cacheMiddleware({
        keyGenerator: cacheKeyGenerators.companyPeriod,
        ttl: TTL.ONE_HOUR,
      }),
    },
    async (request, reply) => {
    const { companyId, period } = request.params;

    try {
      // Parse period into date range
      const { startDate, endDate } = parsePeriod(period);

      // Query metrics for the period
      const metrics = await db
        .select()
        .from(metricsCompanyPeriod)
        .where(
          and(
            eq(metricsCompanyPeriod.companyId, companyId),
            gte(metricsCompanyPeriod.periodStart, startDate),
            lte(metricsCompanyPeriod.periodEnd, endDate)
          )
        )
        .orderBy(metricsCompanyPeriod.periodStart);

      if (metrics.length === 0) {
        return reply.code(404).send({
          error: 'No metrics found for the specified period',
          companyId,
          period,
        });
      }

      return {
        companyId,
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        metrics: metrics.map((m: any) => ({
          id: m.id,
          periodStart: m.periodStart,
          periodEnd: m.periodEnd,
          participantsCount: m.participantsCount,
          volunteersCount: m.volunteersCount,
          sessionsCount: m.sessionsCount,
          avgIntegrationScore: m.avgIntegrationScore ? parseFloat(m.avgIntegrationScore) : null,
          avgLanguageLevel: m.avgLanguageLevel ? parseFloat(m.avgLanguageLevel) : null,
          avgJobReadiness: m.avgJobReadiness ? parseFloat(m.avgJobReadiness) : null,
          sroiRatio: m.sroiRatio ? parseFloat(m.sroiRatio) : null,
          visScore: m.visScore ? parseFloat(m.visScore) : null,
          createdAt: m.createdAt,
        })),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching period metrics');
      return reply.code(500).send({
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  );

  /**
   * GET /metrics/sroi/:companyId
   * Calculate and return SROI report for a company
   *
   * @param companyId - UUID of the company
   * @query startDate - Optional start date (ISO format)
   * @query endDate - Optional end date (ISO format)
   */
  fastify.get<{
    Params: { companyId: string };
    Querystring: { startDate?: string; endDate?: string };
  }>(
    '/sroi/:companyId',
    {
      preHandler: cacheMiddleware({
        keyGenerator: cacheKeyGenerators.sroi,
        ttl: TTL.ONE_DAY,
      }),
    },
    async (request, reply) => {
    const { companyId } = request.params;
    const { startDate, endDate } = request.query;

    try {
      const sroiReport = await calculateSROIForCompany(companyId, startDate, endDate);

      return {
        companyId,
        dateRange: {
          start: startDate || 'inception',
          end: endDate || 'now',
        },
        sroi: sroiReport,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error calculating SROI');
      return reply.code(500).send({
        error: 'Failed to calculate SROI',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  );

  /**
   * GET /metrics/vis/:companyId
   * Calculate and return VIS report for a company
   *
   * @param companyId - UUID of the company
   * @query startDate - Optional start date (ISO format)
   * @query endDate - Optional end date (ISO format)
   */
  fastify.get<{
    Params: { companyId: string };
    Querystring: { startDate?: string; endDate?: string };
  }>(
    '/vis/:companyId',
    {
      preHandler: cacheMiddleware({
        keyGenerator: cacheKeyGenerators.vis,
        ttl: TTL.ONE_DAY,
      }),
    },
    async (request, reply) => {
    const { companyId } = request.params;
    const { startDate, endDate } = request.query;

    try {
      const visReport = await calculateVISForCompany(companyId, startDate, endDate);

      return {
        companyId,
        dateRange: {
          start: startDate || 'inception',
          end: endDate || 'now',
        },
        vis: visReport,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error calculating VIS');
      return reply.code(500).send({
        error: 'Failed to calculate VIS',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  );

  /**
   * GET /metrics/:metricId/evidence
   * Get evidence snippets for a specific metric
   *
   * @param metricId - UUID of the metric
   * @query limit - Maximum number of evidence items (default: 20)
   */
  fastify.get<{
    Params: { metricId: string };
    Querystring: { limit?: string };
  }>(
    '/:metricId/evidence',
    {
      preHandler: cacheMiddleware({
        keyGenerator: cacheKeyGenerators.evidence,
        ttl: TTL.TEN_MINUTES,
      }),
    },
    async (request, reply) => {
    const { metricId } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 20;

    try {
      const evidence = await getEvidenceForMetric(metricId, limit);

      // Server-side redaction of all snippets
      const redactedEvidence = evidence.map((item) => ({
        ...item,
        snippetText: redactPII(item.snippetText),
        // Include provenance information
        provenance: {
          sourceType: item.textType,
          date: item.createdAt,
          classificationMethod: item.method,
        },
        // Include Q2Q scores
        q2qScores: {
          dimension: item.dimension,
          score: parseFloat(item.score),
          confidence: parseFloat(item.confidence),
        },
      }));

      return {
        metricId,
        evidenceCount: redactedEvidence.length,
        evidence: redactedEvidence,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching evidence for metric');
      return reply.code(500).send({
        error: 'Failed to fetch evidence',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  );

  /**
   * GET /metrics/company/:companyId/period/:period/evidence
   * Get all evidence for a company in a specific period
   *
   * @param companyId - UUID of the company
   * @param period - Period format: YYYY-MM or YYYY-Q1/Q2/Q3/Q4
   * @query limit - Maximum number of evidence items (default: 20)
   */
  fastify.get<{
    Params: { companyId: string; period: string };
    Querystring: { limit?: string };
  }>('/company/:companyId/period/:period/evidence', async (request, reply) => {
    const { companyId, period } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit) : 20;

    try {
      // Parse period into date range
      const { startDate, endDate } = parsePeriod(period);

      // Get evidence for the period
      const evidence = await getEvidenceForPeriod(
        companyId,
        startDate,
        endDate,
        limit
      );

      // Server-side redaction of all snippets
      const redactedEvidence = evidence.map((item) => ({
        id: item.id,
        snippetText: redactPII(item.snippetText),
        provenance: {
          sourceType: item.textType,
          date: item.createdAt,
          classificationMethod: item.method,
          sourceRef: item.sourceRef,
        },
        q2qScores: {
          dimension: item.dimension,
          score: parseFloat(item.score),
          confidence: parseFloat(item.confidence),
        },
      }));

      return {
        companyId,
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        evidenceCount: redactedEvidence.length,
        evidence: redactedEvidence,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching evidence for period');
      return reply.code(500).send({
        error: 'Failed to fetch evidence',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /metrics/aggregate
   * Trigger metrics aggregation for all companies or a specific company
   *
   * @body companyId - Optional UUID of specific company to aggregate
   * @body period - Period to aggregate (YYYY-MM format)
   */
  fastify.post<{
    Body: { companyId?: string; period?: string };
  }>('/aggregate', async (request, reply) => {
    const { companyId, period } = request.body || {};

    try {
      // This would trigger an aggregation job
      // For now, return a stub response
      fastify.log.info({ companyId, period }, 'Aggregation triggered');

      // Invalidate cache for the company after aggregation
      // This runs asynchronously to not block the response
      invalidateAfterAggregation(companyId).catch((err) => {
        fastify.log.error({ error: err }, 'Failed to invalidate cache after aggregation');
      });

      return {
        status: 'queued',
        message: 'Aggregation job queued for processing',
        params: {
          companyId: companyId || 'all',
          period: period || 'current',
        },
        queuedAt: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error triggering aggregation');
      return reply.code(500).send({
        error: 'Failed to trigger aggregation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /cache/stats
   * Get cache performance statistics
   *
   * Returns:
   * - hits: Number of cache hits
   * - misses: Number of cache misses
   * - hitRate: Cache hit rate percentage
   * - total: Total cache operations
   * - keyCount: Number of cached keys
   */
  fastify.get('/cache/stats', async (request, reply) => {
    try {
      const stats = getCacheStats();
      const keyCount = await getKeyCount('metrics:*');

      return {
        cache: {
          hits: stats.hits,
          misses: stats.misses,
          hitRate: `${stats.hitRate}%`,
          total: stats.total,
          keyCount,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching cache stats');
      return reply.code(500).send({
        error: 'Failed to fetch cache stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /metrics/company/:companyId/history
   * Get historical time-series data for forecasting
   *
   * @param companyId - UUID of the company
   * @query metric - Metric to retrieve (sroi_ratio or vis_score)
   * @query months - Number of months to retrieve (default: 24)
   * @returns Historical time-series data points
   */
  fastify.get<{
    Params: { companyId: string };
    Querystring: { metric?: string; months?: string };
  }>('/company/:companyId/history', async (request, reply) => {
    const { companyId } = request.params;
    const metric = request.query.metric || 'sroi_ratio';
    const months = parseInt(request.query.months || '24');

    try {
      // Validate metric
      if (!['sroi_ratio', 'vis_score'].includes(metric)) {
        return reply.code(400).send({
          error: 'Invalid metric',
          message: `Metric must be 'sroi_ratio' or 'vis_score'`,
        });
      }

      // Validate months
      if (months < 1 || months > 120) {
        return reply.code(400).send({
          error: 'Invalid months',
          message: 'Months must be between 1 and 120',
        });
      }

      // Calculate start date
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - months);

      // Query metrics from database
      const metrics = await db
        .select()
        .from(metricsCompanyPeriod)
        .where(
          and(
            eq(metricsCompanyPeriod.companyId, companyId),
            gte(
              metricsCompanyPeriod.periodStart,
              startDate.toISOString().split('T')[0]
            ),
            lte(
              metricsCompanyPeriod.periodEnd,
              endDate.toISOString().split('T')[0]
            )
          )
        )
        .orderBy(metricsCompanyPeriod.periodStart);

      // Transform to time-series format
      const timeSeries = metrics.map((m: any) => ({
        date: m.periodStart,
        value:
          metric === 'sroi_ratio'
            ? parseFloat(m.sroiRatio) || 0
            : parseFloat(m.visScore) || 0,
      }));

      return {
        companyId,
        metric,
        dataPoints: timeSeries.length,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        data: timeSeries,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching historical metrics');
      return reply.code(500).send({
        error: 'Failed to fetch historical metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

/**
 * Parse period string into date range
 *
 * Supports:
 * - YYYY-MM: Monthly (e.g., "2024-01" -> Jan 1 to Jan 31, 2024)
 * - YYYY-Q1/Q2/Q3/Q4: Quarterly (e.g., "2024-Q1" -> Jan 1 to Mar 31, 2024)
 *
 * @param period - Period string
 * @returns Start and end dates
 */
function parsePeriod(period: string): { startDate: string; endDate: string } {
  // Match YYYY-MM format
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const [, year, month] = monthMatch;
    const startDate = `${year}-${month}-01`;
    const endDate = getLastDayOfMonth(parseInt(year), parseInt(month));
    return { startDate, endDate };
  }

  // Match YYYY-Q[1-4] format
  const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (quarterMatch) {
    const [, year, quarter] = quarterMatch;
    const q = parseInt(quarter);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const startDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`;
    const endDate = getLastDayOfMonth(parseInt(year), endMonth);
    return { startDate, endDate };
  }

  throw new Error(
    `Invalid period format: ${period}. Expected YYYY-MM or YYYY-Q[1-4]`
  );
}

/**
 * Get last day of month
 */
function getLastDayOfMonth(year: number, month: number): string {
  const date = new Date(year, month, 0);
  const day = date.getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
