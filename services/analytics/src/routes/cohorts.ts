import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { AnalyticsQueryBuilder, DimensionSchema, GroupBySchema } from '../lib/query-builder.js';
import { generateCacheKey, withCache } from '../lib/cache.js';
import { enforceQueryBudget, QueryBudgetError } from '../lib/query-budgets.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:cohorts');

const CohortsQuerySchema = z.object({
  companyIds: z.string().transform((val) => val.split(',')),
  dimension: DimensionSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: GroupBySchema.optional(),
});

export async function cohortsRoutes(app: FastifyInstance) {
  /**
   * GET /v1/analytics/cohorts
   * Compare multiple companies/cohorts for a specific dimension
   */
  app.get('/cohorts', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    try {
      // Validate query parameters
      const params = CohortsQuerySchema.parse(request.query);

      // Validate array
      if (!Array.isArray(params.companyIds) || params.companyIds.length === 0) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          message: 'companyIds must be a non-empty array',
        });
      }

      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const id of params.companyIds) {
        if (!uuidRegex.test(id)) {
          return reply.status(400).send({
            error: 'Invalid query parameters',
            message: `Invalid UUID: ${id}`,
          });
        }
      }

      logger.info('Cohorts query', {
        companyIds: params.companyIds,
        dimension: params.dimension,
        groupBy: params.groupBy,
      });

      // Enforce query budget for the first company (representative)
      let budgetRemaining = 0;
      try {
        const budgetResult = await enforceQueryBudget(params.companyIds[0], 'daily');
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
      const cacheKey = generateCacheKey('cohorts', params.companyIds.join(','), params);

      // Execute query with caching (6 hours TTL for cohort comparisons)
      const { data, cached } = await withCache(
        cacheKey,
        async () => {
          const client = getClickHouseClient();

          // Build query
          const query = AnalyticsQueryBuilder.buildCohortsQuery({
            companyIds: params.companyIds,
            dimension: params.dimension,
            startDate: params.startDate,
            endDate: params.endDate,
            groupBy: params.groupBy,
          });

          // Execute query
          const result = await client.query({
            query,
            query_params: {
              companyIds: params.companyIds,
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

          return rows.map((row: any) => ({
            companyId: row.company_id,
            avgScore: parseFloat(row.avg_score),
            scoreCount: parseInt(row.score_count),
            minScore: parseFloat(row.min_score),
            maxScore: parseFloat(row.max_score),
            medianScore: parseFloat(row.median_score),
            p25Score: parseFloat(row.p25_score),
            p75Score: parseFloat(row.p75_score),
          }));
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
          cohortsCompared: params.companyIds.length,
        },
      });
    } catch (error) {
      logger.error('Cohorts query failed', { error });

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
