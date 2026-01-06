/**
 * FinOps Cost Anomaly Detection
 * Threshold-based and statistical (std-dev) anomaly detection
 */

import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { createServiceLogger } from '@teei/shared-utils';
import type {
  AnomalyQueryParams,
  AnomalyResponse,
  CostAnomaly,
  Currency,
} from '@teei/shared-types';

const logger = createServiceLogger('finops:anomalies');

/**
 * Severity thresholds for anomaly classification
 */
const SEVERITY_THRESHOLDS = {
  HIGH: 50, // >50% deviation
  MEDIUM: 25, // >25% deviation
  LOW: 10, // >10% deviation
};

/**
 * Detect anomalies using statistical method (standard deviation)
 * Compares each day's cost against historical mean and standard deviation
 */
async function detectStatisticalAnomalies(
  tenantId: string,
  from: string,
  to: string,
  category?: string
): Promise<CostAnomaly[]> {
  const client = getClickHouseClient();

  try {
    // Build WHERE clause for category filter
    const categoryFilter = category ? `AND category = '${category}'` : '';

    // Get daily costs with historical statistics
    const query = `
      WITH historical_stats AS (
        SELECT
          tenant_id,
          category,
          subcategory,
          avg(amount) AS mean_amount,
          stddevPop(amount) AS stddev_amount
        FROM cost_facts
        WHERE tenant_id = '${tenantId}'
          AND day >= toDate('${from}') - INTERVAL 30 DAY
          AND day < toDate('${from}')
          ${categoryFilter}
        GROUP BY tenant_id, category, subcategory
      ),
      daily_costs AS (
        SELECT
          tenant_id,
          day,
          category,
          subcategory,
          sum(amount) AS amount,
          any(currency) AS currency
        FROM cost_facts
        WHERE tenant_id = '${tenantId}'
          AND day >= toDate('${from}')
          AND day <= toDate('${to}')
          ${categoryFilter}
        GROUP BY tenant_id, day, category, subcategory
      )
      SELECT
        dc.day,
        dc.category,
        dc.subcategory,
        dc.amount AS actual_amount,
        hs.mean_amount AS expected_amount,
        hs.stddev_amount,
        dc.currency,
        abs((dc.amount - hs.mean_amount) / hs.mean_amount * 100) AS deviation_percentage
      FROM daily_costs dc
      LEFT JOIN historical_stats hs
        ON dc.tenant_id = hs.tenant_id
        AND dc.category = hs.category
        AND dc.subcategory = hs.subcategory
      WHERE hs.mean_amount > 0
        AND abs(dc.amount - hs.mean_amount) > (hs.stddev_amount * 2)
      ORDER BY deviation_percentage DESC
    `;

    const result = await client.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    // Map to CostAnomaly type
    const anomalies: CostAnomaly[] = data.map((row: any) => {
      const deviation = parseFloat(row.deviation_percentage || '0');
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (deviation >= SEVERITY_THRESHOLDS.HIGH) {
        severity = 'high';
      } else if (deviation >= SEVERITY_THRESHOLDS.MEDIUM) {
        severity = 'medium';
      }

      return {
        id: `${tenantId}-${row.day}-${row.category}-${row.subcategory}`,
        tenantId,
        date: row.day,
        category: row.category,
        subcategory: row.subcategory,
        expectedAmount: parseFloat(row.expected_amount || '0'),
        actualAmount: parseFloat(row.actual_amount || '0'),
        deviation,
        severity,
        currency: row.currency as Currency,
        detectedAt: new Date(),
      };
    });

    return anomalies;
  } catch (error) {
    logger.error({ error, tenantId, from, to }, 'Failed to detect statistical anomalies');
    throw error;
  }
}

/**
 * Detect anomalies using threshold method
 * Compares against a fixed threshold (e.g., daily budget)
 */
async function detectThresholdAnomalies(
  tenantId: string,
  from: string,
  to: string,
  dailyThreshold: number,
  category?: string
): Promise<CostAnomaly[]> {
  const client = getClickHouseClient();

  try {
    const categoryFilter = category ? `AND category = '${category}'` : '';

    const query = `
      SELECT
        day,
        category,
        subcategory,
        sum(amount) AS actual_amount,
        any(currency) AS currency,
        abs((sum(amount) - ${dailyThreshold}) / ${dailyThreshold} * 100) AS deviation_percentage
      FROM cost_facts
      WHERE tenant_id = '${tenantId}'
        AND day >= toDate('${from}')
        AND day <= toDate('${to}')
        ${categoryFilter}
      GROUP BY day, category, subcategory
      HAVING sum(amount) > ${dailyThreshold}
      ORDER BY deviation_percentage DESC
    `;

    const result = await client.query({ query, format: 'JSONEachRow' });
    const data = await result.json();

    const anomalies: CostAnomaly[] = data.map((row: any) => {
      const deviation = parseFloat(row.deviation_percentage || '0');
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (deviation >= SEVERITY_THRESHOLDS.HIGH) {
        severity = 'high';
      } else if (deviation >= SEVERITY_THRESHOLDS.MEDIUM) {
        severity = 'medium';
      }

      return {
        id: `${tenantId}-${row.day}-${row.category}-${row.subcategory}`,
        tenantId,
        date: row.day,
        category: row.category,
        subcategory: row.subcategory,
        expectedAmount: dailyThreshold,
        actualAmount: parseFloat(row.actual_amount || '0'),
        deviation,
        severity,
        currency: row.currency as Currency,
        detectedAt: new Date(),
      };
    });

    return anomalies;
  } catch (error) {
    logger.error({ error, tenantId, from, to }, 'Failed to detect threshold anomalies');
    throw error;
  }
}

/**
 * Query anomalies
 * Uses statistical method by default, or threshold if provided
 */
export async function queryAnomalies(
  params: AnomalyQueryParams,
  dailyThreshold?: number
): Promise<AnomalyResponse> {
  const { tenantId, from, to, minSeverity, category } = params;

  try {
    logger.info({ tenantId, from, to, minSeverity, category, dailyThreshold }, 'Querying anomalies');

    // Detect anomalies
    let anomalies: CostAnomaly[];

    if (dailyThreshold !== undefined && dailyThreshold > 0) {
      anomalies = await detectThresholdAnomalies(tenantId, from, to, dailyThreshold, category);
    } else {
      anomalies = await detectStatisticalAnomalies(tenantId, from, to, category);
    }

    // Filter by minimum severity if specified
    if (minSeverity) {
      const severityOrder = { low: 1, medium: 2, high: 3 };
      const minSeverityLevel = severityOrder[minSeverity];

      anomalies = anomalies.filter((anomaly) => {
        return severityOrder[anomaly.severity] >= minSeverityLevel;
      });
    }

    // Calculate summary
    const summary = {
      total: anomalies.length,
      high: anomalies.filter((a) => a.severity === 'high').length,
      medium: anomalies.filter((a) => a.severity === 'medium').length,
      low: anomalies.filter((a) => a.severity === 'low').length,
    };

    logger.info(
      {
        tenantId,
        from,
        to,
        summary,
      },
      'Anomalies queried successfully'
    );

    return {
      tenantId,
      dateRange: { from, to },
      anomalies,
      summary,
    };
  } catch (error) {
    logger.error({ error, params }, 'Failed to query anomalies');
    throw error;
  }
}

/**
 * Store detected anomalies in ClickHouse for historical tracking
 */
export async function storeAnomalies(anomalies: CostAnomaly[]): Promise<void> {
  if (anomalies.length === 0) {
    return;
  }

  const client = getClickHouseClient();

  try {
    logger.info({ count: anomalies.length }, 'Storing anomalies');

    // Build INSERT query
    const values = anomalies.map((anomaly) => {
      return `(
        generateUUIDv4(),
        '${anomaly.tenantId}',
        toDate('${anomaly.date}'),
        '${anomaly.category}',
        '${anomaly.subcategory || ''}',
        ${anomaly.expectedAmount},
        ${anomaly.actualAmount},
        ${anomaly.deviation},
        '${anomaly.severity}',
        '${anomaly.currency}',
        now(),
        false,
        NULL,
        NULL
      )`;
    });

    const query = `
      INSERT INTO cost_anomalies
        (id, tenant_id, day, category, subcategory, expected_amount, actual_amount, deviation_percentage, severity, currency, detected_at, acknowledged, acknowledged_at, acknowledged_by)
      VALUES
        ${values.join(',')}
    `;

    await client.exec({ query });

    logger.info({ count: anomalies.length }, 'Anomalies stored successfully');
  } catch (error) {
    logger.error({ error, count: anomalies.length }, 'Failed to store anomalies');
    throw error;
  }
}

/**
 * Acknowledge an anomaly (mark as reviewed)
 */
export async function acknowledgeAnomaly(
  tenantId: string,
  date: string,
  category: string,
  subcategory: string,
  acknowledgedBy: string
): Promise<void> {
  const client = getClickHouseClient();

  try {
    const query = `
      ALTER TABLE cost_anomalies
      UPDATE
        acknowledged = true,
        acknowledged_at = now(),
        acknowledged_by = '${acknowledgedBy}'
      WHERE tenant_id = '${tenantId}'
        AND day = toDate('${date}')
        AND category = '${category}'
        AND subcategory = '${subcategory}'
    `;

    await client.exec({ query });

    logger.info({ tenantId, date, category, subcategory, acknowledgedBy }, 'Anomaly acknowledged');
  } catch (error) {
    logger.error({ error, tenantId, date, category, subcategory }, 'Failed to acknowledge anomaly');
    throw error;
  }
}

/**
 * Scheduled anomaly detection job - runs daily
 */
export async function runDailyAnomalyDetection(tenantIds: string[]): Promise<void> {
  logger.info({ tenantCount: tenantIds.length }, 'Running daily anomaly detection');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const from = yesterday.toISOString().split('T')[0];
  const to = from;

  try {
    const allAnomalies: CostAnomaly[] = [];

    for (const tenantId of tenantIds) {
      const result = await queryAnomalies({ tenantId, from, to });
      allAnomalies.push(...result.anomalies);
    }

    // Store anomalies
    await storeAnomalies(allAnomalies);

    logger.info(
      {
        date: from,
        tenantCount: tenantIds.length,
        totalAnomalies: allAnomalies.length,
        highSeverity: allAnomalies.filter((a) => a.severity === 'high').length,
      },
      'Daily anomaly detection completed'
    );
  } catch (error) {
    logger.error({ error }, 'Daily anomaly detection failed');
    throw error;
  }
}
