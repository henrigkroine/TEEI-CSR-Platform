import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { AnalyticsQueryBuilder, DimensionSchema, CompareWithSchema } from '../lib/query-builder.js';
import { generateCacheKey, withCache } from '../lib/cache.js';
import { enforceQueryBudget, QueryBudgetError } from '../lib/query-budgets.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:benchmarks');

const BenchmarksQuerySchema = z.object({
  companyId: z.string().uuid(),
  compareWith: CompareWithSchema,
  dimension: DimensionSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
            };
          }

          const companyAvgScore = rows[0]?.company_avg_score
            ? parseFloat(rows[0].company_avg_score)
            : 0;

          const benchmarks = rows.map((row: any) => ({
            cohort: row.cohort || 'unknown',
            benchmarkAvgScore: parseFloat(row.benchmark_avg_score || '0'),
            medianScore: parseFloat(row.median_score || '0'),
            difference: parseFloat(row.difference || '0'),
            percentageDifference: parseFloat(row.percentage_difference || '0'),
          }));

          return {
            companyScore: companyAvgScore,
            benchmarks,
            compareWith: params.compareWith,
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
          benchmarksCompared: data.benchmarks.length,
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
