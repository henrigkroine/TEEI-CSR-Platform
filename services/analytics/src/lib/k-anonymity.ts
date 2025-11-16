/**
 * k-Anonymity Enforcement for Privacy-Preserving Benchmarking
 *
 * k-anonymity ensures that each cohort has at least k members, preventing
 * identification of individual companies in small groups.
 *
 * Default k=5 based on industry best practices for corporate benchmarking.
 */

import type { ClickHouseClient } from '@clickhouse/client';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:k-anonymity');

export interface KAnonymityResult<T> {
  data: T[];
  suppressed: boolean;
  cohortSize: number;
  threshold: number;
}

export interface CohortSizeCheck {
  valid: boolean;
  size: number;
  threshold: number;
  suppressed: boolean;
}

/**
 * Enforces k-anonymity: cohort must have ≥k members
 *
 * @param data - Array of data to protect
 * @param k - Minimum cohort size (default: 5)
 * @returns Result with data (empty if suppressed), suppression flag, and metadata
 *
 * @example
 * const result = enforceKAnonymity(benchmarkData, 5);
 * if (result.suppressed) {
 *   return { error: 'Cohort too small to preserve privacy' };
 * }
 * return result.data;
 */
export function enforceKAnonymity<T>(
  data: T[],
  k: number = 5
): KAnonymityResult<T> {
  const cohortSize = data.length;
  const suppressed = cohortSize < k;

  if (suppressed) {
    logger.warn('Data suppressed due to k-anonymity violation', {
      cohortSize,
      threshold: k,
      deficit: k - cohortSize,
    });
  }

  return {
    data: suppressed ? [] : data,
    suppressed,
    cohortSize,
    threshold: k,
  };
}

/**
 * Check if cohort meets k-anonymity threshold
 *
 * @param clickhouse - ClickHouse client instance
 * @param cohortId - UUID of the cohort to check
 * @param k - Minimum cohort size (default: 5)
 * @returns Validation result with size and suppression flag
 *
 * @example
 * const check = await checkCohortSize(client, 'cohort-uuid', 5);
 * if (!check.valid) {
 *   throw new Error(`Cohort too small: ${check.size} < ${check.threshold}`);
 * }
 */
export async function checkCohortSize(
  clickhouse: ClickHouseClient,
  cohortId: string,
  k: number = 5
): Promise<CohortSizeCheck> {
  const query = `
    SELECT count(*) AS size
    FROM cohort_memberships
    WHERE cohort_id = {cohortId:String}
  `;

  const result = await clickhouse.query({
    query,
    query_params: { cohortId },
    format: 'JSONEachRow',
  });

  const rows = await result.json<Array<{ size: string }>>();
  const size = rows.length > 0 ? parseInt(rows[0].size, 10) : 0;
  const valid = size >= k;
  const suppressed = !valid;

  logger.info('Cohort size check', {
    cohortId,
    size,
    threshold: k,
    valid,
    suppressed,
  });

  return {
    valid,
    size,
    threshold: k,
    suppressed,
  };
}

/**
 * Check if cohort metrics meet k-anonymity (distinct companies)
 *
 * @param clickhouse - ClickHouse client instance
 * @param cohortId - UUID of the cohort
 * @param startDate - Start date for metrics (ISO string)
 * @param endDate - End date for metrics (ISO string)
 * @param k - Minimum distinct companies (default: 5)
 * @returns Validation result
 *
 * @example
 * const check = await checkCohortMetricsSize(
 *   client,
 *   'cohort-uuid',
 *   '2025-01-01',
 *   '2025-11-15',
 *   5
 * );
 */
export async function checkCohortMetricsSize(
  clickhouse: ClickHouseClient,
  cohortId: string,
  startDate: string,
  endDate: string,
  k: number = 5
): Promise<CohortSizeCheck> {
  const query = `
    SELECT uniq(company_id) AS distinct_companies
    FROM cohort_memberships AS cm
    INNER JOIN outcome_scores_ch AS os ON cm.company_id = os.company_id
    WHERE cm.cohort_id = {cohortId:String}
      AND os.created_at >= {startDate:DateTime}
      AND os.created_at <= {endDate:DateTime}
  `;

  const result = await clickhouse.query({
    query,
    query_params: {
      cohortId,
      startDate: new Date(startDate).toISOString().replace('T', ' ').substring(0, 19),
      endDate: new Date(endDate).toISOString().replace('T', ' ').substring(0, 19),
    },
    format: 'JSONEachRow',
  });

  const rows = await result.json<Array<{ distinct_companies: string }>>();
  const size = rows.length > 0 ? parseInt(rows[0].distinct_companies, 10) : 0;
  const valid = size >= k;
  const suppressed = !valid;

  logger.info('Cohort metrics size check', {
    cohortId,
    distinctCompanies: size,
    threshold: k,
    dateRange: { startDate, endDate },
    valid,
    suppressed,
  });

  return {
    valid,
    size,
    threshold: k,
    suppressed,
  };
}

/**
 * Enforce k-anonymity on aggregated metrics
 *
 * Checks if company_count in aggregated data meets threshold.
 * Used for materialized view results that include company_count.
 *
 * @param metrics - Array of metrics with company_count field
 * @param k - Minimum company count (default: 5)
 * @returns Filtered metrics (only those meeting k-anonymity)
 *
 * @example
 * const metrics = await queryMetrics();
 * const safe = enforceKAnonymityOnMetrics(metrics, 5);
 */
export function enforceKAnonymityOnMetrics<T extends { company_count: number }>(
  metrics: T[],
  k: number = 5
): KAnonymityResult<T> {
  const filtered = metrics.filter(m => m.company_count >= k);
  const suppressed = filtered.length < metrics.length;

  if (suppressed) {
    logger.warn('Some metrics suppressed due to k-anonymity', {
      originalCount: metrics.length,
      filteredCount: filtered.length,
      suppressedCount: metrics.length - filtered.length,
      threshold: k,
    });
  }

  return {
    data: filtered,
    suppressed,
    cohortSize: filtered.length,
    threshold: k,
  };
}

/**
 * Log cohort access for audit trail
 *
 * @param clickhouse - ClickHouse client instance
 * @param params - Access log parameters
 */
export async function logCohortAccess(
  clickhouse: ClickHouseClient,
  params: {
    cohortId: string;
    requestingCompanyId: string;
    queryHash: string;
    kAnonymityPassed: boolean;
    dpNoiseApplied: boolean;
    suppressed: boolean;
    recordCount: number;
    companyCount: number;
  }
): Promise<void> {
  const query = `
    INSERT INTO cohort_access_log (
      cohort_id,
      requesting_company_id,
      accessed_at,
      query_hash,
      k_anonymity_passed,
      dp_noise_applied,
      suppressed,
      record_count,
      company_count
    ) VALUES (
      {cohortId:String},
      {requestingCompanyId:String},
      now(),
      {queryHash:String},
      {kAnonymityPassed:Bool},
      {dpNoiseApplied:Bool},
      {suppressed:Bool},
      {recordCount:UInt32},
      {companyCount:UInt32}
    )
  `;

  await clickhouse.insert({
    table: 'cohort_access_log',
    values: [{
      cohort_id: params.cohortId,
      requesting_company_id: params.requestingCompanyId,
      accessed_at: new Date(),
      query_hash: params.queryHash,
      k_anonymity_passed: params.kAnonymityPassed,
      dp_noise_applied: params.dpNoiseApplied,
      suppressed: params.suppressed,
      record_count: params.recordCount,
      company_count: params.companyCount,
    }],
    format: 'JSONEachRow',
  });

  logger.info('Cohort access logged', params);
}
