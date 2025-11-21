/**
 * Prometheus Metrics Query Library
 *
 * Provides utilities to query Prometheus HTTP API for:
 * - p95/p99 latency metrics
 * - Error rates
 * - Request throughput
 * - Web Vitals (if tracked)
 *
 * Ref: AGENTS.md § Trust Boardroom Implementation / Status API Engineer
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('metrics-query');

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export interface PrometheusMetrics {
  http_request_duration_p95: number;
  http_request_duration_p99: number;
  error_rate: number;
  requests_per_minute: number;
  lcp_p75: number | null; // Largest Contentful Paint
  fid_p75: number | null; // First Input Delay
  cls_p75: number | null; // Cumulative Layout Shift
  http_requests_total: number;
  http_requests_errors: number;
}

/**
 * Query Prometheus for a specific metric
 */
async function queryPrometheus(query: string): Promise<any> {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error({ status: response.status, query }, 'Prometheus query failed');
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success' || !data.data?.result?.length) {
      return null;
    }

    // Return the value of the first result
    return parseFloat(data.data.result[0].value[1]);
  } catch (error) {
    logger.error({ error, query }, 'Error querying Prometheus');
    return null;
  }
}

/**
 * Get all metrics from Prometheus
 */
export async function getPrometheusMetrics(): Promise<PrometheusMetrics> {
  try {
    // Query p95 latency (in seconds, convert to ms)
    const p95 = await queryPrometheus(
      'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'
    );

    // Query p99 latency (in seconds, convert to ms)
    const p99 = await queryPrometheus(
      'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'
    );

    // Query error rate (percentage)
    const errorRate = await queryPrometheus(
      'sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100'
    );

    // Query requests per minute
    const rpm = await queryPrometheus(
      'sum(rate(http_requests_total[1m])) * 60'
    );

    // Query total requests (30 days)
    const totalRequests = await queryPrometheus(
      'sum(increase(http_requests_total[30d]))'
    );

    // Query error requests (30 days)
    const errorRequests = await queryPrometheus(
      'sum(increase(http_requests_total{status_code=~"5.."}[30d]))'
    );

    // Query Web Vitals if available (these might not exist)
    const lcp = await queryPrometheus(
      'histogram_quantile(0.75, sum(rate(web_vitals_lcp_bucket[5m])) by (le))'
    );

    const fid = await queryPrometheus(
      'histogram_quantile(0.75, sum(rate(web_vitals_fid_bucket[5m])) by (le))'
    );

    const cls = await queryPrometheus(
      'histogram_quantile(0.75, sum(rate(web_vitals_cls_bucket[5m])) by (le))'
    );

    return {
      http_request_duration_p95: p95 ? p95 * 1000 : 0, // Convert to ms
      http_request_duration_p99: p99 ? p99 * 1000 : 0, // Convert to ms
      error_rate: errorRate || 0,
      requests_per_minute: rpm || 0,
      lcp_p75: lcp ? lcp * 1000 : null, // Convert to ms
      fid_p75: fid ? fid * 1000 : null, // Convert to ms
      cls_p75: cls,
      http_requests_total: totalRequests || 0,
      http_requests_errors: errorRequests || 0,
    };
  } catch (error) {
    logger.error({ error }, 'Error getting Prometheus metrics');
    // Return zeros on error
    return {
      http_request_duration_p95: 0,
      http_request_duration_p99: 0,
      error_rate: 0,
      requests_per_minute: 0,
      lcp_p75: null,
      fid_p75: null,
      cls_p75: null,
      http_requests_total: 0,
      http_requests_errors: 0,
    };
  }
}

/**
 * Get historical metrics data for a time range
 */
export async function getHistoricalMetrics(days: number = 7): Promise<any[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const start = now - days * 24 * 60 * 60;
    const step = days > 7 ? '1h' : '30m'; // Hourly for >7 days, 30min otherwise

    // Query uptime percentage over time
    const query = `(sum(rate(http_requests_total[1h])) - sum(rate(http_requests_total{status_code=~"5.."}[1h]))) / sum(rate(http_requests_total[1h])) * 100`;

    const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(
      query
    )}&start=${start}&end=${now}&step=${step}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error({ status: response.status }, 'Historical metrics query failed');
      return [];
    }

    const data = await response.json();

    if (data.status !== 'success' || !data.data?.result?.length) {
      return [];
    }

    // Transform to time-series data
    return data.data.result[0].values.map((point: [number, string]) => ({
      timestamp: point[0] * 1000, // Convert to ms
      uptime: parseFloat(point[1]),
    }));
  } catch (error) {
    logger.error({ error, days }, 'Error getting historical metrics');
    return [];
  }
}

/**
 * Check Prometheus health
 */
export async function checkPrometheusHealth(): Promise<boolean> {
  try {
    const url = `${PROMETHEUS_URL}/-/healthy`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    logger.error({ error }, 'Prometheus health check failed');
    return false;
  }
}
