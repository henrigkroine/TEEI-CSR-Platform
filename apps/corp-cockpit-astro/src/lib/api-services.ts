/**
 * Analytics API Services for Phase 3.4
 *
 * Service layer for calling analytics endpoints:
 * - Trends analytics
 * - Engagement metrics
 * - Analytics health (Live Ops)
 */

import { createApiClient, type ApiError } from './api';
import type {
  TrendsRequest,
  TrendsResponse,
  EngagementRequest,
  EngagementResponse,
  AnalyticsHealthResponse,
} from '../types/analytics';

/**
 * Analytics Service
 *
 * Provides methods to interact with analytics endpoints.
 * Uses the existing ApiClient from src/lib/api.ts.
 */
export class AnalyticsService {
  private api = createApiClient();

  /**
   * Get trends analytics
   *
   * @param params - Trends request parameters
   * @returns Trends data with time series and summary
   * @throws ApiError if request fails
   */
  async getTrends(params: TrendsRequest): Promise<TrendsResponse> {
    const queryParams = new URLSearchParams({
      metric: params.metric,
      period: params.period,
      bucket: params.bucket,
    });

    try {
      const response = await this.api.get<TrendsResponse>(
        `/api/admin/analytics/trends?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      console.error('[AnalyticsService] getTrends failed:', apiError);
      throw apiError;
    }
  }

  /**
   * Get engagement analytics
   *
   * @param params - Engagement request parameters
   * @returns Engagement metrics (DAU/WAU/MAU, retention, chart data)
   * @throws ApiError if request fails
   */
  async getEngagement(params: EngagementRequest): Promise<EngagementResponse> {
    const queryParams = new URLSearchParams({
      period: params.period,
    });

    try {
      const response = await this.api.get<EngagementResponse>(
        `/api/admin/analytics/engagement?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      console.error('[AnalyticsService] getEngagement failed:', apiError);
      throw apiError;
    }
  }

  /**
   * Get analytics system health (Live Ops)
   *
   * @returns Analytics health metrics (endpoint status, cache, DQ remediation)
   * @throws ApiError if request fails
   */
  async getHealth(): Promise<AnalyticsHealthResponse> {
    try {
      const response = await this.api.get<AnalyticsHealthResponse>(
        `/api/admin/analytics/health`
      );
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      console.error('[AnalyticsService] getHealth failed:', apiError);
      throw apiError;
    }
  }
}

/**
 * Singleton analytics service instance
 */
export const analyticsService = new AnalyticsService();

/**
 * Convenience functions for direct access
 */
export const getTrends = (params: TrendsRequest) => analyticsService.getTrends(params);
export const getEngagement = (params: EngagementRequest) => analyticsService.getEngagement(params);
export const getAnalyticsHealth = () => analyticsService.getHealth();
