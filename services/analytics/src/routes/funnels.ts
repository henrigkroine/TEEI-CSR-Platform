import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { AnalyticsQueryBuilder } from '../lib/query-builder.js';
import { generateCacheKey, withCache } from '../lib/cache.js';
import { enforceQueryBudget, QueryBudgetError } from '../lib/query-budgets.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:funnels');

const FunnelsQuerySchema = z.object({
  companyId: z.string().uuid(),
  stages: z.string().transform((val) => val.split(',')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function funnelsRoutes(app: FastifyInstance) {
  /**
   * GET /v1/analytics/funnels
   * Analyze conversion funnels for user journeys
   */
  app.get('/funnels', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    try {
      // Validate query parameters
      const params = FunnelsQuerySchema.parse(request.query);

      // Validate stages array
      if (!Array.isArray(params.stages) || params.stages.length === 0) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          message: 'stages must be a non-empty array',
        });
      }

      logger.info('Funnels query', {
        companyId: params.companyId,
        stages: params.stages,
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
      const cacheKey = generateCacheKey('funnels', params.companyId, params);

      // Execute query with caching (1 hour TTL)
      const { data, cached } = await withCache(
        cacheKey,
        async () => {
          const client = getClickHouseClient();

          // Build query
          const query = AnalyticsQueryBuilder.buildFunnelsQuery({
            companyId: params.companyId,
            stages: params.stages,
            startDate: params.startDate,
            endDate: params.endDate,
          });

          // Execute query
          const result = await client.query({
            query,
            query_params: {
              companyId: params.companyId,
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
              stages: params.stages.map((stage) => ({
                stage,
                users: 0,
                dropoff: 0,
                conversionRate: 0,
              })),
              totalUsers: 0,
            };
          }

          const row = rows[0];

          // Extract stage counts
          const stageCounts: number[] = [];
          params.stages.forEach((stage, index) => {
            const key = `stage_${index}_${stage}`;
            stageCounts.push(parseInt(row[key] || '0'));
          });

          const totalUsers = parseInt(row.total_users || '0');

          // Calculate funnel metrics
          const funnelData = params.stages.map((stage, index) => {
            const currentCount = stageCounts[index];
            const previousCount = index > 0 ? stageCounts[index - 1] : totalUsers;
            const dropoff = previousCount > 0 ? previousCount - currentCount : 0;
            const conversionRate = previousCount > 0 ? (currentCount / previousCount) * 100 : 0;

            return {
              stage,
              users: currentCount,
              dropoff,
              conversionRate: parseFloat(conversionRate.toFixed(2)),
            };
          });

          // Calculate overall conversion rate (first stage to last stage)
          const overallConversionRate = stageCounts[0] > 0
            ? (stageCounts[stageCounts.length - 1] / stageCounts[0]) * 100
            : 0;

          return {
            stages: funnelData,
            totalUsers,
            overallConversionRate: parseFloat(overallConversionRate.toFixed(2)),
          };
        },
        { ttl: 3600 } // 1 hour cache
      );

      const queryTimeMs = Date.now() - startTime;

      return reply.send({
        data,
        metadata: {
          cached,
          queryTimeMs,
          budgetRemaining,
          stagesAnalyzed: params.stages.length,
        },
      });
    } catch (error) {
      logger.error('Funnels query failed', { error });

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
