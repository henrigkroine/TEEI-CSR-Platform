/**
 * FinOps Cost Aggregators
 * Pull from telemetry tables and aggregate into cost_facts
 */

import { getClickHouseClient } from '../lib/clickhouse-client.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('finops:aggregators');

/**
 * Aggregate AI token usage into daily cost facts
 * Pulls from ai_token_telemetry and aggregates by tenant, day, model
 */
export async function aggregateAITokenCosts(
  fromDate: string,
  toDate: string
): Promise<{ recordsAggregated: number }> {
  const client = getClickHouseClient();

  try {
    logger.info({ fromDate, toDate }, 'Aggregating AI token costs');

    // Insert aggregated costs into cost_facts
    const query = `
      INSERT INTO cost_facts
        (tenant_id, day, category, subcategory, region, service, amount, currency, metadata, created_at, updated_at)
      SELECT
        tenant_id,
        toDate(timestamp) AS day,
        'AI' AS category,
        model AS subcategory,
        region,
        service,
        sum(cost_usd) AS amount,
        'USD' AS currency,
        JSONExtractString(
          concat(
            '{"total_input_tokens": ', toString(sum(input_tokens)),
            ', "total_output_tokens": ', toString(sum(output_tokens)),
            ', "request_count": ', toString(count()),
            ', "avg_latency_ms": ', toString(round(avg(latency_ms), 2)), '}'
          )
        ) AS metadata,
        now() AS created_at,
        now() AS updated_at
      FROM ai_token_telemetry
      WHERE toDate(timestamp) >= toDate('${fromDate}')
        AND toDate(timestamp) <= toDate('${toDate}')
      GROUP BY tenant_id, day, model, region, service
    `;

    const result = await client.exec({ query });

    // Get count of aggregated records
    const countQuery = `
      SELECT count(*) AS count
      FROM (
        SELECT tenant_id, toDate(timestamp) AS day, model
        FROM ai_token_telemetry
        WHERE toDate(timestamp) >= toDate('${fromDate}')
          AND toDate(timestamp) <= toDate('${toDate}')
        GROUP BY tenant_id, day, model
      )
    `;

    const countResult = await client.query({ query: countQuery, format: 'JSONEachRow' });
    const countData = await countResult.json();
    const recordsAggregated = countData.length > 0 ? countData[0].count : 0;

    logger.info({ recordsAggregated }, 'AI token costs aggregated successfully');

    return { recordsAggregated };
  } catch (error) {
    logger.error({ error }, 'Failed to aggregate AI token costs');
    throw error;
  }
}

/**
 * Aggregate compute usage into daily cost facts
 */
export async function aggregateComputeCosts(
  fromDate: string,
  toDate: string
): Promise<{ recordsAggregated: number }> {
  const client = getClickHouseClient();

  try {
    logger.info({ fromDate, toDate }, 'Aggregating compute costs');

    const query = `
      INSERT INTO cost_facts
        (tenant_id, day, category, subcategory, region, service, amount, currency, metadata, created_at, updated_at)
      SELECT
        tenant_id,
        toDate(timestamp) AS day,
        'COMPUTE' AS category,
        instance_type AS subcategory,
        region,
        service,
        sum(cost_usd) AS amount,
        'USD' AS currency,
        JSONExtractString(
          concat(
            '{"total_runtime_seconds": ', toString(sum(runtime_seconds)),
            ', "job_count": ', toString(count()), '}'
          )
        ) AS metadata,
        now() AS created_at,
        now() AS updated_at
      FROM compute_telemetry
      WHERE toDate(timestamp) >= toDate('${fromDate}')
        AND toDate(timestamp) <= toDate('${toDate}')
      GROUP BY tenant_id, day, instance_type, region, service
    `;

    await client.exec({ query });

    const countQuery = `
      SELECT count(*) AS count
      FROM (
        SELECT tenant_id, toDate(timestamp) AS day
        FROM compute_telemetry
        WHERE toDate(timestamp) >= toDate('${fromDate}')
          AND toDate(timestamp) <= toDate('${toDate}')
        GROUP BY tenant_id, day
      )
    `;

    const countResult = await client.query({ query: countQuery, format: 'JSONEachRow' });
    const countData = await countResult.json();
    const recordsAggregated = countData.length > 0 ? countData[0].count : 0;

    logger.info({ recordsAggregated }, 'Compute costs aggregated successfully');

    return { recordsAggregated };
  } catch (error) {
    logger.error({ error }, 'Failed to aggregate compute costs');
    throw error;
  }
}

/**
 * Aggregate storage usage into daily cost facts
 */
export async function aggregateStorageCosts(
  fromDate: string,
  toDate: string
): Promise<{ recordsAggregated: number }> {
  const client = getClickHouseClient();

  try {
    logger.info({ fromDate, toDate }, 'Aggregating storage costs');

    const query = `
      INSERT INTO cost_facts
        (tenant_id, day, category, subcategory, region, service, amount, currency, metadata, created_at, updated_at)
      SELECT
        tenant_id,
        snapshot_date AS day,
        'STORAGE' AS category,
        storage_type AS subcategory,
        region,
        NULL AS service,
        sum(cost_usd) AS amount,
        'USD' AS currency,
        JSONExtractString(
          concat(
            '{"total_bytes_stored": ', toString(sum(bytes_stored)), '}'
          )
        ) AS metadata,
        now() AS created_at,
        now() AS updated_at
      FROM storage_telemetry
      WHERE snapshot_date >= toDate('${fromDate}')
        AND snapshot_date <= toDate('${toDate}')
      GROUP BY tenant_id, snapshot_date, storage_type, region
    `;

    await client.exec({ query });

    const countQuery = `
      SELECT count(*) AS count
      FROM (
        SELECT tenant_id, snapshot_date
        FROM storage_telemetry
        WHERE snapshot_date >= toDate('${fromDate}')
          AND snapshot_date <= toDate('${toDate}')
        GROUP BY tenant_id, snapshot_date
      )
    `;

    const countResult = await client.query({ query: countQuery, format: 'JSONEachRow' });
    const countData = await countResult.json();
    const recordsAggregated = countData.length > 0 ? countData[0].count : 0;

    logger.info({ recordsAggregated }, 'Storage costs aggregated successfully');

    return { recordsAggregated };
  } catch (error) {
    logger.error({ error }, 'Failed to aggregate storage costs');
    throw error;
  }
}

/**
 * Aggregate export usage into daily cost facts
 */
export async function aggregateExportCosts(
  fromDate: string,
  toDate: string
): Promise<{ recordsAggregated: number }> {
  const client = getClickHouseClient();

  try {
    logger.info({ fromDate, toDate }, 'Aggregating export costs');

    const query = `
      INSERT INTO cost_facts
        (tenant_id, day, category, subcategory, region, service, amount, currency, metadata, created_at, updated_at)
      SELECT
        tenant_id,
        toDate(timestamp) AS day,
        'EXPORT' AS category,
        export_type AS subcategory,
        NULL AS region,
        NULL AS service,
        sum(cost_usd) AS amount,
        'USD' AS currency,
        JSONExtractString(
          concat(
            '{"export_count": ', toString(count()),
            ', "total_bytes": ', toString(sum(file_size_bytes)), '}'
          )
        ) AS metadata,
        now() AS created_at,
        now() AS updated_at
      FROM export_telemetry
      WHERE toDate(timestamp) >= toDate('${fromDate}')
        AND toDate(timestamp) <= toDate('${toDate}')
      GROUP BY tenant_id, day, export_type
    `;

    await client.exec({ query });

    const countQuery = `
      SELECT count(*) AS count
      FROM (
        SELECT tenant_id, toDate(timestamp) AS day
        FROM export_telemetry
        WHERE toDate(timestamp) >= toDate('${fromDate}')
          AND toDate(timestamp) <= toDate('${toDate}')
        GROUP BY tenant_id, day
      )
    `;

    const countResult = await client.query({ query: countQuery, format: 'JSONEachRow' });
    const countData = await countResult.json();
    const recordsAggregated = countData.length > 0 ? countData[0].count : 0;

    logger.info({ recordsAggregated }, 'Export costs aggregated successfully');

    return { recordsAggregated };
  } catch (error) {
    logger.error({ error }, 'Failed to aggregate export costs');
    throw error;
  }
}

/**
 * Aggregate egress/network usage into daily cost facts
 */
export async function aggregateEgressCosts(
  fromDate: string,
  toDate: string
): Promise<{ recordsAggregated: number }> {
  const client = getClickHouseClient();

  try {
    logger.info({ fromDate, toDate }, 'Aggregating egress costs');

    const query = `
      INSERT INTO cost_facts
        (tenant_id, day, category, subcategory, region, service, amount, currency, metadata, created_at, updated_at)
      SELECT
        tenant_id,
        toDate(timestamp) AS day,
        'EGRESS' AS category,
        concat(source_region, '->', destination_region) AS subcategory,
        source_region AS region,
        NULL AS service,
        sum(cost_usd) AS amount,
        'USD' AS currency,
        JSONExtractString(
          concat(
            '{"total_bytes_transferred": ', toString(sum(bytes_transferred)), '}'
          )
        ) AS metadata,
        now() AS created_at,
        now() AS updated_at
      FROM egress_telemetry
      WHERE toDate(timestamp) >= toDate('${fromDate}')
        AND toDate(timestamp) <= toDate('${toDate}')
      GROUP BY tenant_id, day, source_region, destination_region
    `;

    await client.exec({ query });

    const countQuery = `
      SELECT count(*) AS count
      FROM (
        SELECT tenant_id, toDate(timestamp) AS day
        FROM egress_telemetry
        WHERE toDate(timestamp) >= toDate('${fromDate}')
          AND toDate(timestamp) <= toDate('${toDate}')
        GROUP BY tenant_id, day
      )
    `;

    const countResult = await client.query({ query: countQuery, format: 'JSONEachRow' });
    const countData = await countResult.json();
    const recordsAggregated = countData.length > 0 ? countData[0].count : 0;

    logger.info({ recordsAggregated }, 'Egress costs aggregated successfully');

    return { recordsAggregated };
  } catch (error) {
    logger.error({ error }, 'Failed to aggregate egress costs');
    throw error;
  }
}

/**
 * Run all cost aggregations for a date range
 * Idempotent - can be run multiple times for same date range
 */
export async function aggregateAllCosts(
  fromDate: string,
  toDate: string
): Promise<{
  ai: { recordsAggregated: number };
  compute: { recordsAggregated: number };
  storage: { recordsAggregated: number };
  export: { recordsAggregated: number };
  egress: { recordsAggregated: number };
  totalRecords: number;
}> {
  logger.info({ fromDate, toDate }, 'Running all cost aggregations');

  const [ai, compute, storage, exportResults, egress] = await Promise.all([
    aggregateAITokenCosts(fromDate, toDate),
    aggregateComputeCosts(fromDate, toDate),
    aggregateStorageCosts(fromDate, toDate),
    aggregateExportCosts(fromDate, toDate),
    aggregateEgressCosts(fromDate, toDate),
  ]);

  const totalRecords =
    ai.recordsAggregated +
    compute.recordsAggregated +
    storage.recordsAggregated +
    exportResults.recordsAggregated +
    egress.recordsAggregated;

  logger.info({ totalRecords }, 'All cost aggregations completed');

  return {
    ai,
    compute,
    storage,
    export: exportResults,
    egress,
    totalRecords,
  };
}

/**
 * Scheduled aggregation job - runs daily for previous day
 */
export async function runDailyAggregation(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const fromDate = yesterday.toISOString().split('T')[0];
  const toDate = fromDate;

  logger.info({ date: fromDate }, 'Running daily cost aggregation');

  try {
    const result = await aggregateAllCosts(fromDate, toDate);

    // Update sync status
    const client = getClickHouseClient();
    await client.exec({
      query: `
        INSERT INTO finops_sync_status (table_name, last_synced_at, last_synced_day, records_synced)
        VALUES ('cost_facts', now(), toDate('${fromDate}'), ${result.totalRecords})
      `,
    });

    logger.info({ result }, 'Daily cost aggregation completed successfully');
  } catch (error) {
    logger.error({ error }, 'Daily cost aggregation failed');
    throw error;
  }
}
