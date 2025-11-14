/**
 * Analytics Service Client
 * ClickHouse-powered analytics (trends, cohorts, funnels, benchmarks)
 */

import { TEEIClient } from './client';
import {
  TrendsQuery,
  TrendsResponse,
  CohortsQuery,
  CohortsResponse,
  FunnelsQuery,
  FunnelsResponse,
  BenchmarksQuery,
  BenchmarksResponse,
} from './types';

export class AnalyticsService {
  constructor(private client: TEEIClient) {}

  /**
   * Query time-series trends
   *
   * Query time-series data for CSR metrics with aggregation and grouping.
   * Supports multiple metrics, custom intervals, and dimension breakdowns.
   *
   * @param query - Trends query parameters
   * @returns Time-series data with pagination and metadata
   *
   * @example
   * ```typescript
   * const trends = await sdk.analytics.getTrends({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   metrics: 'participants,sessions,avg_confidence',
   *   startDate: '2024-01-01',
   *   endDate: '2024-12-31',
   *   interval: 'month',
   *   page: 1,
   *   limit: 100,
   * });
   *
   * console.log(`Query time: ${trends.metadata.queryDurationMs}ms`);
   * console.log(`Cache hit: ${trends.metadata.cacheHit}`);
   * ```
   */
  async getTrends(query: TrendsQuery): Promise<TrendsResponse> {
    return this.client.get<TrendsResponse>('/analytics/trends', { params: query });
  }

  /**
   * Query cohort comparisons
   *
   * Compare metrics across different cohorts (e.g., program types, regions, time periods).
   * Useful for identifying best-performing segments.
   *
   * @param query - Cohorts query parameters
   * @returns Cohort comparison data
   *
   * @example
   * ```typescript
   * const cohorts = await sdk.analytics.getCohorts({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   metrics: 'avg_confidence,avg_belonging',
   *   cohortDimension: 'program',
   *   startDate: '2024-01-01',
   *   endDate: '2024-12-31',
   * });
   *
   * cohorts.data.forEach(cohort => {
   *   console.log(`${cohort.cohort}: ${cohort.participantsCount} participants`);
   * });
   * ```
   */
  async getCohorts(query: CohortsQuery): Promise<CohortsResponse> {
    return this.client.get<CohortsResponse>('/analytics/cohorts', { params: query });
  }

  /**
   * Query conversion funnels
   *
   * Analyze participant progression through program stages.
   * Identifies drop-off points and conversion rates.
   *
   * @param query - Funnels query parameters
   * @returns Funnel stages with counts and drop-off rates
   *
   * @example
   * ```typescript
   * const funnel = await sdk.analytics.getFunnels({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   funnelType: 'enrollment',
   *   startDate: '2024-01-01',
   *   endDate: '2024-12-31',
   * });
   *
   * console.log(`Overall conversion: ${funnel.data.overallConversionRate}%`);
   * funnel.data.stages.forEach(stage => {
   *   console.log(`${stage.stage}: ${stage.count} (${stage.percentage}%)`);
   * });
   * ```
   */
  async getFunnels(query: FunnelsQuery): Promise<FunnelsResponse> {
    return this.client.get<FunnelsResponse>('/analytics/funnels', { params: query });
  }

  /**
   * Query industry benchmarks
   *
   * Compare company metrics against industry benchmarks and peer cohorts.
   * Uses materialized views for fast aggregation.
   *
   * @param query - Benchmarks query parameters
   * @returns Benchmark comparisons with percentile rankings
   *
   * @example
   * ```typescript
   * const benchmarks = await sdk.analytics.getBenchmarks({
   *   companyId: '550e8400-e29b-41d4-a716-446655440000',
   *   metrics: 'avg_confidence,avg_belonging,sroi_ratio',
   *   peerGroup: 'industry',
   *   period: 'current_quarter',
   * });
   *
   * benchmarks.data.benchmarks.forEach(metric => {
   *   console.log(`${metric.metric}: ${metric.performance} (${metric.percentile}th percentile)`);
   * });
   * ```
   */
  async getBenchmarks(query: BenchmarksQuery): Promise<BenchmarksResponse> {
    return this.client.get<BenchmarksResponse>('/analytics/benchmarks', { params: query });
  }
}
