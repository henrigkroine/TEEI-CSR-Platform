import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { AnalyticsQueryBuilder, DimensionSchema, GranularitySchema } from '../lib/query-builder.js';
import { generateCacheKey, withCache } from '../lib/cache.js';
import { enforceQueryBudget, QueryBudgetError } from '../lib/query-budgets.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:trends');

const TrendsQuerySchema = z.object({
  companyId: z.string().uuid(),
  dimension: DimensionSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  granularity: GranularitySchema.default('day'),
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('20'),
});

export async function trendsRoutes(app: FastifyInstance) {
  /**
   * GET /v1/analytics/trends
   * Get time-series trends for a specific dimension
   */
  app.get('/trends', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    try {
      // Validate query parameters
      const params = TrendsQuerySchema.parse(request.query);

      logger.info('Trends query', {
        companyId: params.companyId,
        dimension: params.dimension,
        granularity: params.granularity,
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
      const cacheKey = generateCacheKey('trends', params.companyId, params);

      // Execute query with caching (1 hour TTL)
      const { data, cached } = await withCache(
        cacheKey,
        async () => {
          const client = getClickHouseClient();

          // Build query
          const query = AnalyticsQueryBuilder.buildTrendsQuery({
            companyId: params.companyId,
            dimension: params.dimension,
            startDate: params.startDate,
            endDate: params.endDate,
            granularity: params.granularity,
            page: params.page,
            pageSize: params.pageSize,
          });

          // Execute main query
          const result = await client.query({
            query,
            query_params: {
              companyId: params.companyId,
              dimension: params.dimension,
              startDate: params.startDate || '1970-01-01',
              endDate: params.endDate || '2099-12-31',
              pageSize: params.pageSize,
              offset: (params.page - 1) * params.pageSize,
            },
            format: 'JSONEachRow',
          });

          const rows = await result.json<any>();

          // Get total count
          const countQuery = AnalyticsQueryBuilder.buildTrendsCountQuery({
            companyId: params.companyId,
            dimension: params.dimension,
            startDate: params.startDate,
            endDate: params.endDate,
            granularity: params.granularity,
            page: params.page,
            pageSize: params.pageSize,
          });

          const countResult = await client.query({
            query: countQuery,
            query_params: {
              companyId: params.companyId,
              dimension: params.dimension,
              startDate: params.startDate || '1970-01-01',
              endDate: params.endDate || '2099-12-31',
            },
            format: 'JSONEachRow',
          });

          const countRows = await countResult.json<any>();
          const total = countRows[0]?.total || 0;

          return {
            data: rows.map((row: any) => ({
              period: row.period,
              dimension: row.dimension,
              avgScore: parseFloat(row.avg_score),
              minScore: parseFloat(row.min_score),
              maxScore: parseFloat(row.max_score),
              scoreCount: parseInt(row.score_count),
              stddevScore: row.stddev_score ? parseFloat(row.stddev_score) : null,
            })),
            pagination: {
              page: params.page,
              pageSize: params.pageSize,
              total,
            },
          };
        },
        { ttl: 3600 } // 1 hour cache
      );

      const queryTimeMs = Date.now() - startTime;

      return reply.send({
        ...data,
        metadata: {
          cached,
          queryTimeMs,
          budgetRemaining,
        },
      });
    } catch (error) {
      logger.error('Trends query failed', { error });

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
