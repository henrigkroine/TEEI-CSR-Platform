import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { AnalyticsQueryBuilder, DimensionSchema, CompareWithSchema } from '../lib/query-builder.js';
import { generateCacheKey, withCache } from '../lib/cache.js';
import { enforceQueryBudget, QueryBudgetError } from '../lib/query-budgets.js';
import { checkCohortMetricsSize, logCohortAccess } from '../lib/k-anonymity.js';
import { applyDPToAggregates, getRecommendedEpsilon, generatePrivacyNotice } from '../lib/dp-noise.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:benchmarks');

const BenchmarksQuerySchema = z.object({
  companyId: z.string().uuid(),
  compareWith: CompareWithSchema,
  dimension: DimensionSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Privacy controls
  kAnonymityThreshold: z.number().int().min(3).max(20).optional().default(5),
  applyDPNoise: z.boolean().optional().default(true),
  epsilon: z.number().min(0.01).max(1.0).optional(), // Auto-calculated if not provided
});

export async function benchmarksRoutes(app: FastifyInstance) {
  /**
   * GET /v1/analytics/benchmarks
   * Compare company performance against industry/region/size cohort benchmarks
   */
  app.get('/benchmarks', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    try {
      // Validate query parameters
      const params = BenchmarksQuerySchema.parse(request.query);

      logger.info('Benchmarks query', {
        companyId: params.companyId,
        compareWith: params.compareWith,
        dimension: params.dimension,
      });

      // Enforce query budget
      let budgetRemaining = 0;
      try {
        const budgetResult = await enforceQueryBudget(params.companyId, 'daily');
        budgetRemaining = budgetResult.remaining;
      } catch (error) {
        if (error instanceof QueryBudgetError) {
          return reply.status(429).send({
            error: 'Query budget exceeded',
            message: error.message,
            budgetRemaining: error.budgetRemaining,
          });
        }
        throw error;
      }

      // Generate cache key
      const cacheKey = generateCacheKey('benchmarks', params.companyId, params);

      // Execute query with caching (6 hours TTL for benchmarks)
      const { data, cached } = await withCache(
        cacheKey,
        async () => {
          const client = getClickHouseClient();

          // Build cohort ID based on compareWith dimension
          const cohortId = `${params.compareWith}-cohort`;

          // Check k-anonymity before executing expensive query
          const kAnonymityCheck = await checkCohortMetricsSize(
            client,
            cohortId,
            params.startDate || '2020-01-01',
            params.endDate || new Date().toISOString(),
            params.kAnonymityThreshold
          );

          // If cohort too small, suppress data
          if (!kAnonymityCheck.valid) {
            logger.warn('Cohort too small for benchmarking', {
              cohortId,
              size: kAnonymityCheck.size,
              threshold: kAnonymityCheck.threshold,
            });

            // Log suppression for audit
            await logCohortAccess(client, {
              cohortId,
              requestingCompanyId: params.companyId,
              queryHash: crypto
                .createHash('sha256')
                .update(JSON.stringify(params))
                .digest('hex'),
              kAnonymityPassed: false,
              dpNoiseApplied: false,
              suppressed: true,
              recordCount: 0,
              companyCount: kAnonymityCheck.size,
            });

            return {
              companyScore: 0,
              benchmarks: [],
              suppressed: true,
              suppressionReason: `Cohort size (${kAnonymityCheck.size}) below privacy threshold (${kAnonymityCheck.threshold})`,
              privacyNote: 'Data suppressed to protect company privacy.',
            };
          }

          // Build query
          const query = AnalyticsQueryBuilder.buildBenchmarksQuery({
            companyId: params.companyId,
            compareWith: params.compareWith,
            dimension: params.dimension,
            startDate: params.startDate,
            endDate: params.endDate,
          });

          // Execute query
          const result = await client.query({
            query,
            query_params: {
              companyId: params.companyId,
              dimension: params.dimension,
              startDate: params.startDate
                ? new Date(params.startDate).toISOString().replace('T', ' ').substring(0, 19)
                : '1970-01-01 00:00:00',
              endDate: params.endDate
                ? new Date(params.endDate).toISOString().replace('T', ' ').substring(0, 19)
                : '2099-12-31 23:59:59',
            },
            format: 'JSONEachRow',
          });

          const rows = await result.json<any>();

          if (rows.length === 0) {
            return {
              companyScore: 0,
              benchmarks: [],
              suppressed: false,
            };
          }

          const companyAvgScore = rows[0]?.company_avg_score
            ? parseFloat(rows[0].company_avg_score)
            : 0;

          // Determine epsilon for DP noise
          const epsilon = params.epsilon || getRecommendedEpsilon(kAnonymityCheck.size);

          // Apply differential privacy noise to benchmarks
          const benchmarks = rows.map((row: any) => {
            const rawStats = {
              avg: parseFloat(row.benchmark_avg_score || '0'),
              p10: parseFloat(row.p25_score || '0'), // Use p25 as proxy for p10
              p50: parseFloat(row.median_score || '0'),
              p90: parseFloat(row.p75_score || '0'), // Use p75 as proxy for p90
              count: parseInt(row.score_count || '0', 10),
            };

            // Apply DP noise if enabled
            const noisedStats = params.applyDPNoise
              ? applyDPToAggregates(rawStats, { epsilon, sensitivity: 1 })
              : { value: rawStats, noiseApplied: false, epsilon: 0, sensitivity: 1 };

            return {
              cohort: row.cohort || 'unknown',
              benchmarkAvgScore: noisedStats.value.avg,
              medianScore: noisedStats.value.p50,
              p10Score: noisedStats.value.p10,
              p90Score: noisedStats.value.p90,
              sampleSize: noisedStats.value.count,
              difference: companyAvgScore - noisedStats.value.avg,
              percentageDifference:
                noisedStats.value.avg > 0
                  ? ((companyAvgScore - noisedStats.value.avg) / noisedStats.value.avg) * 100
                  : 0,
              dpApplied: noisedStats.noiseApplied,
            };
          });

          // Generate privacy notice
          const privacyNote = params.applyDPNoise
            ? generatePrivacyNotice(epsilon, kAnonymityCheck.size)
            : 'No differential privacy applied.';

          // Log access for audit
          await logCohortAccess(client, {
            cohortId,
            requestingCompanyId: params.companyId,
            queryHash: crypto
              .createHash('sha256')
              .update(JSON.stringify(params))
              .digest('hex'),
            kAnonymityPassed: true,
            dpNoiseApplied: params.applyDPNoise,
            suppressed: false,
            recordCount: benchmarks.reduce((sum, b) => sum + b.sampleSize, 0),
            companyCount: kAnonymityCheck.size,
          });

          return {
            companyScore: companyAvgScore,
            benchmarks,
            compareWith: params.compareWith,
            suppressed: false,
            privacyNote,
            cohortSize: kAnonymityCheck.size,
            epsilon: params.applyDPNoise ? epsilon : undefined,
          };
        },
        { ttl: 21600 } // 6 hours cache
      );

      const queryTimeMs = Date.now() - startTime;

      return reply.send({
        data,
        metadata: {
          cached,
          queryTimeMs,
          budgetRemaining,
          benchmarksCompared: data.benchmarks?.length || 0,
          privacyProtections: {
            kAnonymityThreshold: params.kAnonymityThreshold,
            dpNoiseApplied: params.applyDPNoise,
            epsilon: data.epsilon,
            cohortSize: data.cohortSize,
            suppressed: data.suppressed,
          },
        },
      });
    } catch (error) {
      logger.error('Benchmarks query failed', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
