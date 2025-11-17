/**
 * FinOps Cost Explorer API Routes
 * Endpoints for cost tracking, forecasting, and anomaly detection
 */

import { FastifyPluginAsync } from 'fastify';
import { queryCosts, queryTopDrivers, queryCostsByModel, queryCostsByRegion, queryCostsByService, getCostSummary } from '../finops/queries.js';
import { generateForecast } from '../finops/forecast.js';
import { queryAnomalies } from '../finops/anomalies.js';
import { aggregateAllCosts } from '../finops/aggregators.js';
import { cacheMiddleware, cacheKeyGenerators, TTL } from '../middleware/cache.js';
import type { CostQueryParams, ForecastQueryParams, AnomalyQueryParams } from '@teei/shared-types';

/**
 * FinOps routes
 */
export const finopsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /finops/costs
   * Query costs with flexible filtering and grouping
   *
   * Query params:
   * - tenantId: Tenant ID (optional - returns all if omitted)
   * - from: Start date (ISO format, required)
   * - to: End date (ISO format, required)
   * - groupBy: Comma-separated list of dimensions (category, subcategory, model, region, service, day, week, month)
   * - category: Filter by category (AI, COMPUTE, STORAGE, EXPORT, EGRESS)
   * - region: Filter by region
   * - service: Filter by service
   */
  fastify.get<{
    Querystring: {
      tenantId?: string;
      from: string;
      to: string;
      groupBy?: string;
      category?: string;
      region?: string;
      service?: string;
    };
  }>(
    '/costs',
    {
      preHandler: cacheMiddleware({
        keyGenerator: (req) => `finops:costs:${req.query.tenantId || 'all'}:${req.query.from}:${req.query.to}:${req.query.groupBy || 'day'}:${req.query.category || ''}:${req.query.region || ''}:${req.query.service || ''}`,
        ttl: TTL.TEN_MINUTES,
      }),
    },
    async (request, reply) => {
      const { tenantId, from, to, groupBy, category, region, service } = request.query;

      // Validate required params
      if (!from || !to) {
        return reply.code(400).send({
          error: 'Missing required parameters',
          message: 'from and to dates are required',
        });
      }

      try {
        const params: CostQueryParams = {
          tenantId,
          from,
          to,
          groupBy: groupBy ? (groupBy.split(',') as any) : ['day'],
          category: category as any,
          region: region as any,
          service,
        };

        const result = await queryCosts(params);

        return result;
      } catch (error) {
        fastify.log.error({ error }, 'Error querying costs');
        return reply.code(500).send({
          error: 'Failed to query costs',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /finops/costs/summary
   * Get cost summary for dashboard overview
   *
   * Query params:
   * - tenantId: Tenant ID (required)
   * - from: Start date (required)
   * - to: End date (required)
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      from: string;
      to: string;
    };
  }>('/costs/summary', async (request, reply) => {
    const { tenantId, from, to } = request.query;

    if (!tenantId || !from || !to) {
      return reply.code(400).send({
        error: 'Missing required parameters',
        message: 'tenantId, from, and to are required',
      });
    }

    try {
      const summary = await getCostSummary(tenantId, from, to);

      return {
        tenantId,
        dateRange: { from, to },
        ...summary,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error getting cost summary');
      return reply.code(500).send({
        error: 'Failed to get cost summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /finops/costs/top-drivers
   * Get top cost drivers
   *
   * Query params:
   * - tenantId: Tenant ID (required)
   * - from: Start date (required)
   * - to: End date (required)
   * - limit: Number of top drivers to return (default: 10)
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      from: string;
      to: string;
      limit?: string;
    };
  }>('/costs/top-drivers', async (request, reply) => {
    const { tenantId, from, to, limit } = request.query;

    if (!tenantId || !from || !to) {
      return reply.code(400).send({
        error: 'Missing required parameters',
        message: 'tenantId, from, and to are required',
      });
    }

    try {
      const topDrivers = await queryTopDrivers(
        tenantId,
        from,
        to,
        limit ? parseInt(limit) : 10
      );

      return {
        tenantId,
        dateRange: { from, to },
        topDrivers,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error getting top drivers');
      return reply.code(500).send({
        error: 'Failed to get top drivers',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /finops/costs/by-model
   * Get costs broken down by AI model
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      from: string;
      to: string;
    };
  }>('/costs/by-model', async (request, reply) => {
    const { tenantId, from, to } = request.query;

    if (!tenantId || !from || !to) {
      return reply.code(400).send({
        error: 'Missing required parameters',
        message: 'tenantId, from, and to are required',
      });
    }

    try {
      const costsByModel = await queryCostsByModel(tenantId, from, to);

      return {
        tenantId,
        dateRange: { from, to },
        models: costsByModel,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error getting costs by model');
      return reply.code(500).send({
        error: 'Failed to get costs by model',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /finops/costs/by-region
   * Get costs broken down by region
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      from: string;
      to: string;
    };
  }>('/costs/by-region', async (request, reply) => {
    const { tenantId, from, to } = request.query;

    if (!tenantId || !from || !to) {
      return reply.code(400).send({
        error: 'Missing required parameters',
        message: 'tenantId, from, and to are required',
      });
    }

    try {
      const costsByRegion = await queryCostsByRegion(tenantId, from, to);

      return {
        tenantId,
        dateRange: { from, to },
        regions: costsByRegion,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error getting costs by region');
      return reply.code(500).send({
        error: 'Failed to get costs by region',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /finops/costs/by-service
   * Get costs broken down by service
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      from: string;
      to: string;
    };
  }>('/costs/by-service', async (request, reply) => {
    const { tenantId, from, to } = request.query;

    if (!tenantId || !from || !to) {
      return reply.code(400).send({
        error: 'Missing required parameters',
        message: 'tenantId, from, and to are required',
      });
    }

    try {
      const costsByService = await queryCostsByService(tenantId, from, to);

      return {
        tenantId,
        dateRange: { from, to },
        services: costsByService,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error getting costs by service');
      return reply.code(500).send({
        error: 'Failed to get costs by service',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /finops/forecast
   * Generate cost forecast
   *
   * Query params:
   * - tenantId: Tenant ID (required)
   * - from: Historical start date (required)
   * - to: Historical end date (required)
   * - forecastDays: Number of days to forecast (default: 30)
   * - method: Forecast method - 'simple' or 'holtwinters' (default: 'simple')
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      from: string;
      to: string;
      forecastDays?: string;
      method?: 'simple' | 'holtwinters';
    };
  }>(
    '/forecast',
    {
      preHandler: cacheMiddleware({
        keyGenerator: (req) => `finops:forecast:${req.query.tenantId}:${req.query.from}:${req.query.to}:${req.query.forecastDays || 30}:${req.query.method || 'simple'}`,
        ttl: TTL.ONE_HOUR,
      }),
    },
    async (request, reply) => {
      const { tenantId, from, to, forecastDays, method } = request.query;

      if (!tenantId || !from || !to) {
        return reply.code(400).send({
          error: 'Missing required parameters',
          message: 'tenantId, from, and to are required',
        });
      }

      try {
        const params: ForecastQueryParams = {
          tenantId,
          from,
          to,
          forecastDays: forecastDays ? parseInt(forecastDays) : 30,
          method: method || 'simple',
        };

        const forecast = await generateForecast(params);

        return forecast;
      } catch (error) {
        fastify.log.error({ error }, 'Error generating forecast');
        return reply.code(500).send({
          error: 'Failed to generate forecast',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /finops/anomalies
   * Detect cost anomalies
   *
   * Query params:
   * - tenantId: Tenant ID (required)
   * - from: Start date (required)
   * - to: End date (required)
   * - minSeverity: Minimum severity (low, medium, high)
   * - category: Filter by category
   */
  fastify.get<{
    Querystring: {
      tenantId: string;
      from: string;
      to: string;
      minSeverity?: 'low' | 'medium' | 'high';
      category?: string;
    };
  }>(
    '/anomalies',
    {
      preHandler: cacheMiddleware({
        keyGenerator: (req) => `finops:anomalies:${req.query.tenantId}:${req.query.from}:${req.query.to}:${req.query.minSeverity || ''}:${req.query.category || ''}`,
        ttl: TTL.TEN_MINUTES,
      }),
    },
    async (request, reply) => {
      const { tenantId, from, to, minSeverity, category } = request.query;

      if (!tenantId || !from || !to) {
        return reply.code(400).send({
          error: 'Missing required parameters',
          message: 'tenantId, from, and to are required',
        });
      }

      try {
        const params: AnomalyQueryParams = {
          tenantId,
          from,
          to,
          minSeverity,
          category: category as any,
        };

        const anomalies = await queryAnomalies(params);

        return anomalies;
      } catch (error) {
        fastify.log.error({ error }, 'Error querying anomalies');
        return reply.code(500).send({
          error: 'Failed to query anomalies',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /finops/aggregate
   * Trigger cost aggregation for a date range
   * Admin endpoint for manual aggregation or backfilling
   *
   * Body:
   * - fromDate: Start date (required)
   * - toDate: End date (required)
   */
  fastify.post<{
    Body: {
      fromDate: string;
      toDate: string;
    };
  }>('/aggregate', async (request, reply) => {
    const { fromDate, toDate } = request.body || {};

    if (!fromDate || !toDate) {
      return reply.code(400).send({
        error: 'Missing required parameters',
        message: 'fromDate and toDate are required',
      });
    }

    try {
      fastify.log.info({ fromDate, toDate }, 'Manual cost aggregation triggered');

      const result = await aggregateAllCosts(fromDate, toDate);

      return {
        status: 'completed',
        message: 'Cost aggregation completed successfully',
        dateRange: { from: fromDate, to: toDate },
        ...result,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Error triggering cost aggregation');
      return reply.code(500).send({
        error: 'Failed to trigger cost aggregation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};
