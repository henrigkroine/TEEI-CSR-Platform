/**
 * Cohort Analytics API Routes
 * RESTful API for cohort queries
 */

import type { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import {
  getCohortMetrics,
  getCohortTrends,
  compareCohorts,
  getCohortOverview,
  getTopCohorts,
} from '../queries/cohort.js';
import { isClickHouseEnabled } from '../sinks/clickhouse-client.js';

const logger = createServiceLogger('cohort-routes');

export async function cohortRoutes(app: FastifyInstance) {
  /**
   * GET /cohort/:id/metrics
   * Get metrics for a specific cohort
   */
  app.get<{
    Params: { id: string };
    Querystring: {
      metric: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/:id/metrics', async (request, reply) => {
    if (!isClickHouseEnabled()) {
      return reply.code(501).send({
        error: 'Not Implemented',
        message: 'ClickHouse analytics is not enabled',
      });
    }

    const { id } = request.params;
    const { metric, startDate, endDate } = request.query;

    if (!metric) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'metric query parameter is required',
      });
    }

    try {
      const metrics = await getCohortMetrics(id, metric, startDate, endDate);

      return reply.send({
        cohortId: id,
        metricName: metric,
        data: metrics,
        count: metrics.length,
      });
    } catch (error) {
      logger.error({ error, cohortId: id, metric }, 'Failed to get cohort metrics');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve cohort metrics',
      });
    }
  });

  /**
   * GET /cohort/:id/trends
   * Get trend data for a cohort metric
   */
  app.get<{
    Params: { id: string };
    Querystring: {
      metric: string;
      periods?: number;
    };
  }>('/:id/trends', async (request, reply) => {
    if (!isClickHouseEnabled()) {
      return reply.code(501).send({
        error: 'Not Implemented',
        message: 'ClickHouse analytics is not enabled',
      });
    }

    const { id } = request.params;
    const { metric, periods } = request.query;

    if (!metric) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'metric query parameter is required',
      });
    }

    try {
      const trends = await getCohortTrends(id, metric, periods);

      return reply.send({
        cohortId: id,
        metricName: metric,
        trends,
        count: trends.length,
      });
    } catch (error) {
      logger.error({ error, cohortId: id, metric }, 'Failed to get cohort trends');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve cohort trends',
      });
    }
  });

  /**
   * GET /cohort/:id/overview
   * Get overview of all metrics for a cohort
   */
  app.get<{
    Params: { id: string };
    Querystring: {
      periodStart?: string;
    };
  }>('/:id/overview', async (request, reply) => {
    if (!isClickHouseEnabled()) {
      return reply.code(501).send({
        error: 'Not Implemented',
        message: 'ClickHouse analytics is not enabled',
      });
    }

    const { id } = request.params;
    const { periodStart } = request.query;

    try {
      const overview = await getCohortOverview(id, periodStart);

      return reply.send({
        cohortId: id,
        periodStart: periodStart || 'latest',
        metrics: overview,
      });
    } catch (error) {
      logger.error({ error, cohortId: id }, 'Failed to get cohort overview');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve cohort overview',
      });
    }
  });

  /**
   * POST /cohort/compare
   * Compare multiple cohorts on a specific metric
   */
  app.post<{
    Body: {
      cohortIds: string[];
      metric: string;
      periodStart?: string;
    };
  }>('/compare', async (request, reply) => {
    if (!isClickHouseEnabled()) {
      return reply.code(501).send({
        error: 'Not Implemented',
        message: 'ClickHouse analytics is not enabled',
      });
    }

    const { cohortIds, metric, periodStart } = request.body;

    if (!cohortIds || cohortIds.length === 0) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'cohortIds array is required and must not be empty',
      });
    }

    if (!metric) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'metric is required',
      });
    }

    try {
      const comparison = await compareCohorts(cohortIds, metric, periodStart);

      return reply.send({
        comparison,
        cohortCount: cohortIds.length,
      });
    } catch (error) {
      logger.error({ error, cohortIds, metric }, 'Failed to compare cohorts');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to compare cohorts',
      });
    }
  });

  /**
   * GET /cohort/top
   * Get top performing cohorts for a metric
   */
  app.get<{
    Querystring: {
      metric: string;
      limit?: number;
      periodStart?: string;
    };
  }>('/top', async (request, reply) => {
    if (!isClickHouseEnabled()) {
      return reply.code(501).send({
        error: 'Not Implemented',
        message: 'ClickHouse analytics is not enabled',
      });
    }

    const { metric, limit, periodStart } = request.query;

    if (!metric) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'metric query parameter is required',
      });
    }

    try {
      const topCohorts = await getTopCohorts(metric, limit, periodStart);

      return reply.send({
        metricName: metric,
        cohorts: topCohorts,
        count: topCohorts.length,
      });
    } catch (error) {
      logger.error({ error, metric }, 'Failed to get top cohorts');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve top cohorts',
      });
    }
  });
}
