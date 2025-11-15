/**
 * Analytics API Types for Phase 3.4
 *
 * Type definitions for trends, engagement, and analytics health endpoints.
 */

// ============================================================================
// Trends API Types
// ============================================================================

export type TrendsPeriod = '7d' | '30d' | '90d' | '1y';
export type TrendsBucket = 'day' | 'week' | 'month';
export type TrendsMetric = 'recordings' | 'sessions' | 'users' | 'projects';

export interface TrendsRequest {
  metric: TrendsMetric;
  period: TrendsPeriod;
  bucket: TrendsBucket;
}

export interface TrendsDataPoint {
  timestamp: string; // ISO 8601
  value: number;
  change_pct: number; // % change from previous bucket
}

export interface TrendsSummary {
  total: number;
  average: number;
  peak: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export interface TrendsResponse {
  metric: TrendsMetric;
  period: TrendsPeriod;
  bucket: TrendsBucket;
  data: TrendsDataPoint[];
  summary: TrendsSummary;
}

// ============================================================================
// Engagement API Types
// ============================================================================

export type EngagementPeriod = '7d' | '30d' | '90d' | '1y';

export interface EngagementRequest {
  period: EngagementPeriod;
}

export interface EngagementMetric {
  current: number;
  previous: number;
  change_pct: number;
}

export interface RetentionMetrics {
  day_1: number; // % returning after 1 day
  day_7: number; // % returning after 7 days
  day_30: number; // % returning after 30 days
}

export interface EngagementChartDataPoint {
  date: string; // YYYY-MM-DD
  dau: number;
  wau: number;
}

export interface EngagementResponse {
  period: EngagementPeriod;
  dau: EngagementMetric;
  wau: EngagementMetric;
  mau: EngagementMetric;
  retention: RetentionMetrics;
  chart_data: EngagementChartDataPoint[];
}

// ============================================================================
// Analytics Health API Types (Live Ops)
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'down';
export type EndpointStatus = 'up' | 'down';

export interface EndpointHealth {
  status: EndpointStatus;
  latency_p50: number; // milliseconds
  latency_p95: number; // milliseconds
  error_rate: number; // 0-1 (0 = 0%, 1 = 100%)
  last_success: string; // ISO 8601
}

export interface CacheHealth {
  hit_rate: number; // 0-1 (0 = 0%, 1 = 100%)
  size_mb: number;
  eviction_count: number;
}

export interface DQRemediationHealth {
  runs_24h: number;
  checks_passed: number;
  checks_failed: number;
  last_run: string; // ISO 8601
}

export interface AnalyticsHealthResponse {
  status: HealthStatus;
  endpoints: {
    trends: EndpointHealth;
    engagement: EndpointHealth;
    data_quality: EndpointHealth;
  };
  cache: CacheHealth;
  dq_remediation: DQRemediationHealth;
}

// ============================================================================
// SLO Thresholds (for UI color coding)
// ============================================================================

export interface SLOThresholds {
  latency_p95: {
    good: number; // < 500ms
    degraded: number; // < 1000ms
    critical: number; // >= 1000ms
  };
  error_rate: {
    good: number; // < 0.01 (1%)
    degraded: number; // < 0.05 (5%)
    critical: number; // >= 0.05 (5%)
  };
  cache_hit_rate: {
    good: number; // > 0.80 (80%)
    degraded: number; // > 0.50 (50%)
    critical: number; // <= 0.50 (50%)
  };
}

export const SLO_THRESHOLDS: SLOThresholds = {
  latency_p95: {
    good: 500,
    degraded: 1000,
    critical: 1000,
  },
  error_rate: {
    good: 0.01,
    degraded: 0.05,
    critical: 0.05,
  },
  cache_hit_rate: {
    good: 0.80,
    degraded: 0.50,
    critical: 0.50,
  },
};

// ============================================================================
// Helper Types
// ============================================================================

export type SLOStatus = 'good' | 'degraded' | 'critical';

export interface SLOEvaluation {
  status: SLOStatus;
  value: number;
  threshold: number;
  message: string;
}

/**
 * Evaluate latency against SLO thresholds
 */
export function evaluateLatencySLO(latency_p95: number): SLOEvaluation {
  if (latency_p95 < SLO_THRESHOLDS.latency_p95.good) {
    return {
      status: 'good',
      value: latency_p95,
      threshold: SLO_THRESHOLDS.latency_p95.good,
      message: `Latency is healthy (${latency_p95.toFixed(0)}ms < ${SLO_THRESHOLDS.latency_p95.good}ms)`,
    };
  } else if (latency_p95 < SLO_THRESHOLDS.latency_p95.degraded) {
    return {
      status: 'degraded',
      value: latency_p95,
      threshold: SLO_THRESHOLDS.latency_p95.degraded,
      message: `Latency is degraded (${latency_p95.toFixed(0)}ms)`,
    };
  } else {
    return {
      status: 'critical',
      value: latency_p95,
      threshold: SLO_THRESHOLDS.latency_p95.critical,
      message: `Latency is critical (${latency_p95.toFixed(0)}ms >= ${SLO_THRESHOLDS.latency_p95.critical}ms)`,
    };
  }
}

/**
 * Evaluate error rate against SLO thresholds
 */
export function evaluateErrorRateSLO(error_rate: number): SLOEvaluation {
  const errorPct = (error_rate * 100).toFixed(2);

  if (error_rate < SLO_THRESHOLDS.error_rate.good) {
    return {
      status: 'good',
      value: error_rate,
      threshold: SLO_THRESHOLDS.error_rate.good,
      message: `Error rate is healthy (${errorPct}%)`,
    };
  } else if (error_rate < SLO_THRESHOLDS.error_rate.degraded) {
    return {
      status: 'degraded',
      value: error_rate,
      threshold: SLO_THRESHOLDS.error_rate.degraded,
      message: `Error rate is elevated (${errorPct}%)`,
    };
  } else {
    return {
      status: 'critical',
      value: error_rate,
      threshold: SLO_THRESHOLDS.error_rate.critical,
      message: `Error rate is critical (${errorPct}%)`,
    };
  }
}

/**
 * Evaluate cache hit rate against SLO thresholds
 */
export function evaluateCacheHitRateSLO(hit_rate: number): SLOEvaluation {
  const hitPct = (hit_rate * 100).toFixed(1);

  if (hit_rate > SLO_THRESHOLDS.cache_hit_rate.good) {
    return {
      status: 'good',
      value: hit_rate,
      threshold: SLO_THRESHOLDS.cache_hit_rate.good,
      message: `Cache hit rate is healthy (${hitPct}%)`,
    };
  } else if (hit_rate > SLO_THRESHOLDS.cache_hit_rate.degraded) {
    return {
      status: 'degraded',
      value: hit_rate,
      threshold: SLO_THRESHOLDS.cache_hit_rate.degraded,
      message: `Cache hit rate is degraded (${hitPct}%)`,
    };
  } else {
    return {
      status: 'critical',
      value: hit_rate,
      threshold: SLO_THRESHOLDS.cache_hit_rate.critical,
      message: `Cache hit rate is critical (${hitPct}%)`,
    };
  }
}
