/**
 * Cohort Query Module
 * Query cohort metrics and trends from ClickHouse
 */

import { createServiceLogger } from '@teei/shared-utils';
import { getClickHouseClient } from '../sinks/clickhouse-client.js';

const logger = createServiceLogger('cohort-queries');

export interface CohortMetric {
  cohortId: string;
  metricName: string;
  periodStart: string;
  avgValue: number;
  sampleSize: number;
  p50: number;
  p75: number;
  p95: number;
  minValue: number;
  maxValue: number;
  stdDev: number;
}

export interface CohortTrend {
  cohortId: string;
  metricName: string;
  periodStart: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface CohortComparison {
  metricName: string;
  cohorts: Array<{
    cohortId: string;
    cohortName: string;
    value: number;
    rank: number;
  }>;
}

/**
 * Get metrics for a specific cohort
 */
export async function getCohortMetrics(
  cohortId: string,
  metricName: string,
  startDate?: string,
  endDate?: string
): Promise<CohortMetric[]> {
  try {
    const clickhouse = getClickHouseClient();

    let whereClause = `WHERE cohort_id = '${cohortId}' AND metric_name = '${metricName}'`;

    if (startDate) {
      whereClause += ` AND period_start >= '${startDate}'`;
    }

    if (endDate) {
      whereClause += ` AND period_start <= '${endDate}'`;
    }

    const query = `
      SELECT
        cohort_id as cohortId,
        metric_name as metricName,
        period_start as periodStart,
        avg_value as avgValue,
        sample_size as sampleSize,
        p50,
        p75,
        p95,
        min_value as minValue,
        max_value as maxValue,
        std_dev as stdDev
      FROM cohort_metrics_mv
      ${whereClause}
      ORDER BY period_start ASC
    `;

    const results = await clickhouse.query<CohortMetric>(query);

    logger.debug({ cohortId, metricName, results: results.length }, 'Cohort metrics retrieved');

    return results;
  } catch (error) {
    logger.error({ error, cohortId, metricName }, 'Failed to get cohort metrics');
    throw error;
  }
}

/**
 * Get trend data for a cohort metric
 */
export async function getCohortTrends(
  cohortId: string,
  metricName: string,
  periods: number = 12
): Promise<CohortTrend[]> {
  try {
    const clickhouse = getClickHouseClient();

    const query = `
      SELECT
        cohort_id as cohortId,
        metric_name as metricName,
        period_start as periodStart,
        avg_value as value,
        CASE
          WHEN lag(avg_value) OVER (ORDER BY period_start) = 0 THEN 'stable'
          WHEN avg_value > lag(avg_value) OVER (ORDER BY period_start) * 1.05 THEN 'up'
          WHEN avg_value < lag(avg_value) OVER (ORDER BY period_start) * 0.95 THEN 'down'
          ELSE 'stable'
        END as trend,
        CASE
          WHEN lag(avg_value) OVER (ORDER BY period_start) = 0 THEN 0
          ELSE ((avg_value - lag(avg_value) OVER (ORDER BY period_start)) / lag(avg_value) OVER (ORDER BY period_start)) * 100
        END as changePercent
      FROM cohort_metrics_mv
      WHERE cohort_id = '${cohortId}' AND metric_name = '${metricName}'
      ORDER BY period_start DESC
      LIMIT ${periods}
    `;

    const results = await clickhouse.query<CohortTrend>(query);

    logger.debug({ cohortId, metricName, results: results.length }, 'Cohort trends retrieved');

    return results.reverse(); // Return in chronological order
  } catch (error) {
    logger.error({ error, cohortId, metricName }, 'Failed to get cohort trends');
    throw error;
  }
}

/**
 * Compare multiple cohorts on a specific metric
 */
export async function compareCohorts(
  cohortIds: string[],
  metricName: string,
  periodStart?: string
): Promise<CohortComparison> {
  try {
    const clickhouse = getClickHouseClient();

    // If no period specified, use the most recent period
    let periodClause = '';
    if (periodStart) {
      periodClause = `AND period_start = '${periodStart}'`;
    } else {
      periodClause = `AND period_start = (SELECT MAX(period_start) FROM cohort_metrics_mv WHERE metric_name = '${metricName}')`;
    }

    const cohortIdsStr = cohortIds.map((id) => `'${id}'`).join(', ');

    const query = `
      SELECT
        cm.cohort_id as cohortId,
        c.name as cohortName,
        cm.avg_value as value,
        rank() OVER (ORDER BY cm.avg_value DESC) as rank
      FROM cohort_metrics_mv cm
      INNER JOIN cohorts c ON cm.cohort_id = c.cohort_id
      WHERE cm.cohort_id IN (${cohortIdsStr})
        AND cm.metric_name = '${metricName}'
        ${periodClause}
      ORDER BY value DESC
    `;

    const results = await clickhouse.query<{
      cohortId: string;
      cohortName: string;
      value: number;
      rank: number;
    }>(query);

    logger.debug(
      { cohortIds, metricName, results: results.length },
      'Cohort comparison retrieved'
    );

    return {
      metricName,
      cohorts: results,
    };
  } catch (error) {
    logger.error({ error, cohortIds, metricName }, 'Failed to compare cohorts');
    throw error;
  }
}

/**
 * Get all metrics for a cohort (overview)
 */
export async function getCohortOverview(
  cohortId: string,
  periodStart?: string
): Promise<Record<string, number>> {
  try {
    const clickhouse = getClickHouseClient();

    let periodClause = '';
    if (periodStart) {
      periodClause = `AND period_start = '${periodStart}'`;
    } else {
      periodClause = `AND period_start = (SELECT MAX(period_start) FROM cohort_metrics_mv WHERE cohort_id = '${cohortId}')`;
    }

    const query = `
      SELECT
        metric_name as metricName,
        avg_value as value
      FROM cohort_metrics_mv
      WHERE cohort_id = '${cohortId}'
        ${periodClause}
      ORDER BY metric_name
    `;

    const results = await clickhouse.query<{
      metricName: string;
      value: number;
    }>(query);

    // Convert to key-value object
    const overview: Record<string, number> = {};
    for (const row of results) {
      overview[row.metricName] = row.value;
    }

    logger.debug({ cohortId, metrics: results.length }, 'Cohort overview retrieved');

    return overview;
  } catch (error) {
    logger.error({ error, cohortId }, 'Failed to get cohort overview');
    throw error;
  }
}

/**
 * Get top performing cohorts for a metric
 */
export async function getTopCohorts(
  metricName: string,
  limit: number = 10,
  periodStart?: string
): Promise<Array<{ cohortId: string; cohortName: string; value: number; rank: number }>> {
  try {
    const clickhouse = getClickHouseClient();

    let periodClause = '';
    if (periodStart) {
      periodClause = `AND period_start = '${periodStart}'`;
    } else {
      periodClause = `AND period_start = (SELECT MAX(period_start) FROM cohort_metrics_mv WHERE metric_name = '${metricName}')`;
    }

    const query = `
      SELECT
        cm.cohort_id as cohortId,
        c.name as cohortName,
        cm.avg_value as value,
        rank() OVER (ORDER BY cm.avg_value DESC) as rank
      FROM cohort_metrics_mv cm
      INNER JOIN cohorts c ON cm.cohort_id = c.cohort_id
      WHERE cm.metric_name = '${metricName}'
        ${periodClause}
      ORDER BY value DESC
      LIMIT ${limit}
    `;

    const results = await clickhouse.query<{
      cohortId: string;
      cohortName: string;
      value: number;
      rank: number;
    }>(query);

    logger.debug({ metricName, limit, results: results.length }, 'Top cohorts retrieved');

    return results;
  } catch (error) {
    logger.error({ error, metricName }, 'Failed to get top cohorts');
    throw error;
  }
}
