import { z } from 'zod';

export const DimensionSchema = z.enum([
  'confidence',
  'belonging',
  'lang_level_proxy',
  'job_readiness',
  'well_being',
]);

export const GranularitySchema = z.enum(['day', 'week', 'month']);

export const GroupBySchema = z.enum(['program', 'location', 'demographic']);

export const CompareWithSchema = z.enum(['industry', 'region', 'size_cohort']);

export type Dimension = z.infer<typeof DimensionSchema>;
export type Granularity = z.infer<typeof GranularitySchema>;
export type GroupBy = z.infer<typeof GroupBySchema>;
export type CompareWith = z.infer<typeof CompareWithSchema>;

export interface TrendsQueryParams {
  companyId: string;
  dimension: Dimension;
  startDate?: string;
  endDate?: string;
  granularity: Granularity;
  page: number;
  pageSize: number;
}

export interface CohortsQueryParams {
  companyIds: string[];
  dimension: Dimension;
  startDate?: string;
  endDate?: string;
  groupBy?: GroupBy;
}

export interface FunnelsQueryParams {
  companyId: string;
  stages: string[];
  startDate?: string;
  endDate?: string;
}

export interface BenchmarksQueryParams {
  companyId: string;
  compareWith: CompareWith;
  dimension: Dimension;
  startDate?: string;
  endDate?: string;
}

export class AnalyticsQueryBuilder {
  /**
   * Build trends query with proper materialized view selection
   */
  static buildTrendsQuery(params: TrendsQueryParams): string {
    const { companyId, dimension, startDate, endDate, granularity, page, pageSize } = params;

    // Select appropriate materialized view based on granularity
    let viewName: string;
    let dateColumn: string;

    switch (granularity) {
      case 'day':
        viewName = 'outcome_scores_daily_mv';
        dateColumn = 'date';
        break;
      case 'week':
        viewName = 'outcome_scores_weekly_mv';
        dateColumn = 'week_start';
        break;
      case 'month':
        viewName = 'outcome_scores_monthly_mv';
        dateColumn = 'month_start';
        break;
    }

    const offset = (page - 1) * pageSize;

    let query = `
      SELECT
        ${dateColumn} AS period,
        dimension,
        avg_score / score_count AS avg_score,
        min_score,
        max_score,
        score_count,
        stddev_score
      FROM ${viewName}
      WHERE company_id = {companyId: UUID}
        AND dimension = {dimension: String}
    `;

    if (startDate) {
      query += ` AND ${dateColumn} >= {startDate: Date}`;
    }

    if (endDate) {
      query += ` AND ${dateColumn} <= {endDate: Date}`;
    }

    query += `
      GROUP BY ${dateColumn}, dimension, avg_score, min_score, max_score, score_count, stddev_score
      ORDER BY ${dateColumn} DESC
      LIMIT {pageSize: UInt32}
      OFFSET {offset: UInt32}
    `;

    return query.trim();
  }

  /**
   * Build count query for pagination
   */
  static buildTrendsCountQuery(params: TrendsQueryParams): string {
    const { companyId, dimension, startDate, endDate, granularity } = params;

    let viewName: string;
    let dateColumn: string;

    switch (granularity) {
      case 'day':
        viewName = 'outcome_scores_daily_mv';
        dateColumn = 'date';
        break;
      case 'week':
        viewName = 'outcome_scores_weekly_mv';
        dateColumn = 'week_start';
        break;
      case 'month':
        viewName = 'outcome_scores_monthly_mv';
        dateColumn = 'month_start';
        break;
    }

    let query = `
      SELECT COUNT(DISTINCT ${dateColumn}) AS total
      FROM ${viewName}
      WHERE company_id = {companyId: UUID}
        AND dimension = {dimension: String}
    `;

    if (startDate) {
      query += ` AND ${dateColumn} >= {startDate: Date}`;
    }

    if (endDate) {
      query += ` AND ${dateColumn} <= {endDate: Date}`;
    }

    return query.trim();
  }

  /**
   * Build cohorts comparison query
   */
  static buildCohortsQuery(params: CohortsQueryParams): string {
    const { companyIds, dimension, startDate, endDate } = params;

    let query = `
      SELECT
        company_id,
        avg(score) AS avg_score,
        count() AS score_count,
        min(score) AS min_score,
        max(score) AS max_score,
        quantile(0.5)(score) AS median_score,
        quantile(0.25)(score) AS p25_score,
        quantile(0.75)(score) AS p75_score
      FROM outcome_scores_ch
      WHERE company_id IN ({companyIds: Array(UUID)})
        AND dimension = {dimension: String}
    `;

    if (startDate) {
      query += ` AND created_at >= {startDate: DateTime}`;
    }

    if (endDate) {
      query += ` AND created_at <= {endDate: DateTime}`;
    }

    query += `
      GROUP BY company_id
      ORDER BY avg_score DESC
    `;

    return query.trim();
  }

  /**
   * Build funnels query for conversion analysis
   */
  static buildFunnelsQuery(params: FunnelsQueryParams): string {
    const { companyId, stages, startDate, endDate } = params;

    // Build dynamic funnel with uniqIf for each stage
    const stageClauses = stages.map((stage, index) => {
      return `uniqIf(user_id, event_type = '${stage}') AS stage_${index}_${stage}`;
    }).join(',\n        ');

    let query = `
      SELECT
        company_id,
        ${stageClauses},
        count(DISTINCT user_id) AS total_users
      FROM user_events_ch
      WHERE company_id = {companyId: UUID}
    `;

    if (startDate) {
      query += ` AND event_timestamp >= {startDate: DateTime}`;
    }

    if (endDate) {
      query += ` AND event_timestamp <= {endDate: DateTime}`;
    }

    query += `
      GROUP BY company_id
    `;

    return query.trim();
  }

  /**
   * Build benchmarks query for industry/region/size comparison
   */
  static buildBenchmarksQuery(params: BenchmarksQueryParams): string {
    const { companyId, compareWith, dimension, startDate, endDate } = params;

    let viewName: string;
    let groupColumn: string;

    switch (compareWith) {
      case 'industry':
        viewName = 'industry_benchmarks_mv';
        groupColumn = 'industry';
        break;
      case 'region':
        viewName = 'region_benchmarks_mv';
        groupColumn = 'country';
        break;
      case 'size_cohort':
        viewName = 'size_benchmarks_mv';
        groupColumn = 'employee_size';
        break;
    }

    let query = `
      WITH company_data AS (
        SELECT
          avg(score) AS company_avg_score,
          count() AS company_score_count
        FROM outcome_scores_ch
        WHERE company_id = {companyId: UUID}
          AND dimension = {dimension: String}
    `;

    if (startDate) {
      query += ` AND created_at >= {startDate: DateTime}`;
    }

    if (endDate) {
      query += ` AND created_at <= {endDate: DateTime}`;
    }

    query += `
      ),
      benchmark_data AS (
        SELECT
          ${groupColumn},
          avg_score / score_count AS benchmark_avg_score,
          score_count,
          median_score
        FROM ${viewName}
        WHERE dimension = {dimension: String}
    `;

    if (startDate) {
      query += ` AND date >= {startDate: Date}`;
    }

    if (endDate) {
      query += ` AND date <= {endDate: Date}`;
    }

    query += `
        GROUP BY ${groupColumn}, avg_score, score_count, median_score
      )
      SELECT
        cd.company_avg_score,
        cd.company_score_count,
        bd.${groupColumn} AS cohort,
        bd.benchmark_avg_score,
        bd.median_score,
        (cd.company_avg_score - bd.benchmark_avg_score) AS difference,
        ((cd.company_avg_score - bd.benchmark_avg_score) / bd.benchmark_avg_score * 100) AS percentage_difference
      FROM company_data cd
      CROSS JOIN benchmark_data bd
      ORDER BY bd.benchmark_avg_score DESC
    `;

    return query.trim();
  }
}
