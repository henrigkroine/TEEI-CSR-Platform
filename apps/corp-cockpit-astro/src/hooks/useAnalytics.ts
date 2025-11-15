/**
 * Analytics Hooks for Phase 3.4
 *
 * React hooks for consuming analytics APIs with:
 * - Feature flag integration
 * - React Query caching and retry logic
 * - Graceful error handling
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { analyticsService } from '../lib/api-services';
import type {
  TrendsRequest,
  TrendsResponse,
  EngagementRequest,
  EngagementResponse,
  AnalyticsHealthResponse,
} from '../types/analytics';
import type { ApiError } from '../lib/api';

/**
 * Extended query result with feature flag awareness
 */
export interface AnalyticsQueryResult<T> extends Omit<UseQueryResult<T, ApiError>, 'data'> {
  data: T | undefined;
  isEnabled: boolean;
}

/**
 * Check if trends analytics feature is enabled
 */
function isTrendsFeatureEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_ANALYTICS_TRENDS === 'true';
}

/**
 * Check if engagement analytics feature is enabled
 */
function isEngagementFeatureEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_ANALYTICS_ENGAGEMENT === 'true';
}

/**
 * Hook: useTrendsAnalytics
 *
 * Fetches trends analytics data for a given metric, period, and bucket.
 * Respects VITE_FEATURE_ANALYTICS_TRENDS feature flag.
 *
 * @param params - Trends request parameters
 * @returns Query result with data, loading, and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, isEnabled } = useTrendsAnalytics({
 *   metric: 'recordings',
 *   period: '30d',
 *   bucket: 'day',
 * });
 *
 * if (!isEnabled) return <FeatureDisabled />;
 * if (isLoading) return <Loading />;
 * if (isError) return <Error />;
 * return <TrendsChart data={data} />;
 * ```
 */
export function useTrendsAnalytics(
  params: TrendsRequest
): AnalyticsQueryResult<TrendsResponse> {
  const isFeatureEnabled = isTrendsFeatureEnabled();

  const queryResult = useQuery<TrendsResponse, ApiError>({
    queryKey: ['analytics', 'trends', params.metric, params.period, params.bucket],
    queryFn: () => analyticsService.getTrends(params),
    enabled: isFeatureEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });

  return {
    ...queryResult,
    isEnabled: isFeatureEnabled,
  };
}

/**
 * Hook: useEngagementAnalytics
 *
 * Fetches engagement analytics data (DAU/WAU/MAU, retention) for a given period.
 * Respects VITE_FEATURE_ANALYTICS_ENGAGEMENT feature flag.
 *
 * @param params - Engagement request parameters
 * @returns Query result with data, loading, and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, isEnabled } = useEngagementAnalytics({
 *   period: '30d',
 * });
 *
 * if (!isEnabled) return <FeatureDisabled />;
 * if (isLoading) return <Loading />;
 * if (isError) return <Error />;
 * return <EngagementMetrics data={data} />;
 * ```
 */
export function useEngagementAnalytics(
  params: EngagementRequest
): AnalyticsQueryResult<EngagementResponse> {
  const isFeatureEnabled = isEngagementFeatureEnabled();

  const queryResult = useQuery<EngagementResponse, ApiError>({
    queryKey: ['analytics', 'engagement', params.period],
    queryFn: () => analyticsService.getEngagement(params),
    enabled: isFeatureEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  return {
    ...queryResult,
    isEnabled: isFeatureEnabled,
  };
}

/**
 * Hook: useAnalyticsHealth
 *
 * Fetches analytics system health metrics for the Live Ops dashboard.
 * Always enabled (not gated by feature flag).
 * Polls every minute for fresh data.
 *
 * @returns Query result with health data, loading, and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useAnalyticsHealth();
 *
 * if (isLoading) return <Loading />;
 * if (isError) return <Error />;
 * return <LiveOpsDashboard health={data} />;
 * ```
 */
export function useAnalyticsHealth(): UseQueryResult<AnalyticsHealthResponse, ApiError> {
  return useQuery<AnalyticsHealthResponse, ApiError>({
    queryKey: ['analytics', 'health'],
    queryFn: () => analyticsService.getHealth(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Poll every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Helper: Get feature flag status for analytics features
 *
 * @returns Object with feature flag status for trends and engagement
 */
export function useAnalyticsFeatureFlags() {
  return {
    trends: isTrendsFeatureEnabled(),
    engagement: isEngagementFeatureEnabled(),
  };
}
