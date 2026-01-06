/**
 * FinOps Cost Query Functions
 * Query cost_facts and materialized views for cost explorer
 */

import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { createServiceLogger } from '@teei/shared-utils';
import type {
  CostQueryParams,
  CostResponse,
  CostBreakdown,
  CostTimeSeriesPoint,
  Currency,
} from '@teei/shared-types';

const logger = createServiceLogger('finops:queries');

/**
 * Query costs with flexible grouping and filtering
 */
export async function queryCosts(params: CostQueryParams): Promise<CostResponse> {
  const client = getClickHouseClient();
  const startTime = Date.now();

  try {
    const {
      tenantId,
      from,
      to,
      groupBy = ['day'],
      category,
      region,
      service,
    } = params;

    // Build WHERE clause
    const whereClauses: string[] = [];
    if (tenantId) whereClauses.push(`tenant_id = '${tenantId}'`);
    whereClauses.push(`day >= toDate('${from}')`);
    whereClauses.push(`day <= toDate('${to}')`);
    if (category) whereClauses.push(`category = '${category}'`);
    if (region) whereClauses.push(`region = '${region}'`);
    if (service) whereClauses.push(`service = '${service}'`);

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total amount
    const totalQuery = `
      SELECT sum(amount) AS total, any(currency) AS currency
      FROM cost_facts
      ${whereClause}
    `;

    const totalResult = await client.query({ query: totalQuery, format: 'JSONEachRow' });
    const totalData = await totalResult.json();
    const totalAmount = totalData.length > 0 ? parseFloat(totalData[0].total || '0') : 0;
    const currency = (totalData.length > 0 ? totalData[0].currency : 'USD') as Currency;

    // Get time-series data
    const timeSeriesQuery = `
      SELECT
        day,
        sum(amount) AS amount,
        any(currency) AS currency
      FROM cost_facts
      ${whereClause}
      GROUP BY day
      ORDER BY day ASC
    `;

    const timeSeriesResult = await client.query({ query: timeSeriesQuery, format: 'JSONEachRow' });
    const timeSeriesData = await timeSeriesResult.json();

    const timeSeries: CostTimeSeriesPoint[] = timeSeriesData.map((row: any) => ({
      date: row.day,
      amount: parseFloat(row.amount || '0'),
      currency: row.currency as Currency,
    }));

    // Get breakdown by primary groupBy dimension
    let breakdownQuery = '';
    let breakdownDimension = 'category';

    if (groupBy.includes('category')) {
      breakdownDimension = 'category';
      breakdownQuery = `
        SELECT
          category AS label,
          sum(amount) AS amount,
          any(currency) AS currency
        FROM cost_facts
        ${whereClause}
        GROUP BY category
        ORDER BY amount DESC
      `;
    } else if (groupBy.includes('subcategory') || groupBy.includes('model')) {
      breakdownDimension = 'subcategory';
      breakdownQuery = `
        SELECT
          subcategory AS label,
          sum(amount) AS amount,
          any(currency) AS currency
        FROM cost_facts
        ${whereClause}
        GROUP BY subcategory
        ORDER BY amount DESC
      `;
    } else if (groupBy.includes('region')) {
      breakdownDimension = 'region';
      breakdownQuery = `
        SELECT
          region AS label,
          sum(amount) AS amount,
          any(currency) AS currency
        FROM cost_facts
        ${whereClause}
        AND region IS NOT NULL
        GROUP BY region
        ORDER BY amount DESC
      `;
    } else if (groupBy.includes('service')) {
      breakdownDimension = 'service';
      breakdownQuery = `
        SELECT
          service AS label,
          sum(amount) AS amount,
          any(currency) AS currency
        FROM cost_facts
        ${whereClause}
        AND service IS NOT NULL
        GROUP BY service
        ORDER BY amount DESC
      `;
    } else {
      // Default to category
      breakdownQuery = `
        SELECT
          category AS label,
          sum(amount) AS amount,
          any(currency) AS currency
        FROM cost_facts
        ${whereClause}
        GROUP BY category
        ORDER BY amount DESC
      `;
    }

    const breakdownResult = await client.query({ query: breakdownQuery, format: 'JSONEachRow' });
    const breakdownData = await breakdownResult.json();

    const breakdown: CostBreakdown[] = breakdownData.map((row: any) => ({
      label: row.label || 'Unknown',
      amount: parseFloat(row.amount || '0'),
      percentage: totalAmount > 0 ? parseFloat(((parseFloat(row.amount || '0') / totalAmount) * 100).toFixed(2)) : 0,
      currency: row.currency as Currency,
    }));

    const queryDurationMs = Date.now() - startTime;

    logger.info(
      {
        tenantId,
        from,
        to,
        groupBy,
        totalAmount,
        dataPoints: timeSeries.length,
        breakdownItems: breakdown.length,
        queryDurationMs,
      },
      'Cost query completed'
    );

    return {
      tenantId,
      dateRange: { from, to },
      totalAmount,
      currency,
      timeSeries,
      breakdown,
      metadata: {
        queryDurationMs,
        dataPoints: timeSeries.length,
      },
    };
  } catch (error) {
    logger.error({ error, params }, 'Failed to query costs');
    throw error;
  }
}

/**
 * Query top cost drivers (top N by spend)
 */
export async function queryTopDrivers(
  tenantId: string,
  from: string,
  to: string,
  limit: number = 10
): Promise<CostBreakdown[]> {
  const client = getClickHouseClient();

  try {
    const query = `
      SELECT
        concat(category, ' - ', subcategory) AS label,
        sum(amount) AS amount,
        any(currency) AS currency
      FROM cost_facts
      WHERE tenant_id = '${tenantId}'
        AND day >= toDate('${from}')
        AND day <= toDate('${to}')
      GROUP BY category, subcategory
      ORDER BY amount DESC
      LIMIT ${limit}
    `;

    const result = await client.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    // Calculate total for percentages
    const total = data.reduce((sum: number, row: any) => sum + parseFloat(row.amount || '0'), 0);

    return data.map((row: any) => ({
      label: row.label,
      amount: parseFloat(row.amount || '0'),
      percentage: total > 0 ? parseFloat(((parseFloat(row.amount || '0') / total) * 100).toFixed(2)) : 0,
      currency: row.currency as Currency,
    }));
  } catch (error) {
    logger.error({ error, tenantId, from, to }, 'Failed to query top drivers');
    throw error;
  }
}

/**
 * Query costs by model (AI subcategory)
 */
export async function queryCostsByModel(
  tenantId: string,
  from: string,
  to: string
): Promise<{ model: string; amount: number; currency: Currency }[]> {
  const client = getClickHouseClient();

  try {
    const query = `
      SELECT
        subcategory AS model,
        sum(amount) AS amount,
        any(currency) AS currency
      FROM cost_facts
      WHERE tenant_id = '${tenantId}'
        AND day >= toDate('${from}')
        AND day <= toDate('${to}')
        AND category = 'AI'
      GROUP BY subcategory
      ORDER BY amount DESC
    `;

    const result = await client.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    return data.map((row: any) => ({
      model: row.model,
      amount: parseFloat(row.amount || '0'),
      currency: row.currency as Currency,
    }));
  } catch (error) {
    logger.error({ error, tenantId, from, to }, 'Failed to query costs by model');
    throw error;
  }
}

/**
 * Query costs by region
 */
export async function queryCostsByRegion(
  tenantId: string,
  from: string,
  to: string
): Promise<{ region: string; amount: number; currency: Currency }[]> {
  const client = getClickHouseClient();

  try {
    const query = `
      SELECT
        region,
        sum(amount) AS amount,
        any(currency) AS currency
      FROM cost_facts
      WHERE tenant_id = '${tenantId}'
        AND day >= toDate('${from}')
        AND day <= toDate('${to}')
        AND region IS NOT NULL
      GROUP BY region
      ORDER BY amount DESC
    `;

    const result = await client.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    return data.map((row: any) => ({
      region: row.region,
      amount: parseFloat(row.amount || '0'),
      currency: row.currency as Currency,
    }));
  } catch (error) {
    logger.error({ error, tenantId, from, to }, 'Failed to query costs by region');
    throw error;
  }
}

/**
 * Query costs by service
 */
export async function queryCostsByService(
  tenantId: string,
  from: string,
  to: string
): Promise<{ service: string; amount: number; currency: Currency }[]> {
  const client = getClickHouseClient();

  try {
    const query = `
      SELECT
        service,
        sum(amount) AS amount,
        any(currency) AS currency
      FROM cost_facts
      WHERE tenant_id = '${tenantId}'
        AND day >= toDate('${from}')
        AND day <= toDate('${to}')
        AND service IS NOT NULL
      GROUP BY service
      ORDER BY amount DESC
    `;

    const result = await client.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    return data.map((row: any) => ({
      service: row.service,
      amount: parseFloat(row.amount || '0'),
      currency: row.currency as Currency,
    }));
  } catch (error) {
    logger.error({ error, tenantId, from, to }, 'Failed to query costs by service');
    throw error;
  }
}

/**
 * Get cost summary for tenant (for dashboard overview)
 */
export async function getCostSummary(
  tenantId: string,
  from: string,
  to: string
): Promise<{
  totalCost: number;
  currency: Currency;
  byCategory: Record<string, number>;
  topDriver: { label: string; amount: number } | null;
  dailyAverage: number;
}> {
  const client = getClickHouseClient();

  try {
    // Get total and by category
    const query = `
      SELECT
        category,
        sum(amount) AS amount,
        any(currency) AS currency
      FROM cost_facts
      WHERE tenant_id = '${tenantId}'
        AND day >= toDate('${from}')
        AND day <= toDate('${to}')
      GROUP BY category
    `;

    const result = await client.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    const byCategory: Record<string, number> = {};
    let totalCost = 0;
    let currency: Currency = 'USD';

    data.forEach((row: any) => {
      const amount = parseFloat(row.amount || '0');
      byCategory[row.category] = amount;
      totalCost += amount;
      currency = row.currency as Currency;
    });

    // Get top driver
    const topDrivers = await queryTopDrivers(tenantId, from, to, 1);
    const topDriver = topDrivers.length > 0 ? topDrivers[0] : null;

    // Calculate daily average
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const days = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const dailyAverage = totalCost / days;

    return {
      totalCost,
      currency,
      byCategory,
      topDriver: topDriver ? { label: topDriver.label, amount: topDriver.amount } : null,
      dailyAverage,
    };
  } catch (error) {
    logger.error({ error, tenantId, from, to }, 'Failed to get cost summary');
    throw error;
  }
}
