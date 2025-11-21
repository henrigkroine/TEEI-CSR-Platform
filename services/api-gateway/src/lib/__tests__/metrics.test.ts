/**
 * Prometheus Metrics Query Tests
 *
 * Tests for Prometheus HTTP API query utilities
 * Target: ≥90% coverage
 *
 * Ref: AGENTS.md § Trust Boardroom Implementation / Status API Engineer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPrometheusMetrics, getHistoricalMetrics, checkPrometheusHealth } from '../metrics.js';

// Mock logger
vi.mock('@teei/shared-utils', () => ({
  createServiceLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('Prometheus Metrics Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PROMETHEUS_URL = 'http://localhost:9090';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPrometheusMetrics', () => {
    it('should query all metrics successfully', async () => {
      // Mock successful Prometheus responses
      (global.fetch as any).mockImplementation((url: string) => {
        // Different responses based on query
        if (url.includes('histogram_quantile(0.95')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '0.045'] }], // 45ms
              },
            }),
          });
        } else if (url.includes('histogram_quantile(0.99')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '0.089'] }], // 89ms
              },
            }),
          });
        } else if (url.includes('error_rate') || url.includes('5..')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '0.0015'] }], // 0.15%
              },
            }),
          });
        } else if (url.includes('rate(http_requests_total[1m])')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '20.83'] }], // 1250/min
              },
            }),
          });
        } else if (url.includes('increase(http_requests_total[30d])')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '1000000'] }],
              },
            }),
          });
        } else if (url.includes('increase(http_requests_total{status_code=~"5.."}[30d])')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '150'] }],
              },
            }),
          });
        } else if (url.includes('lcp')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '1.2'] }], // 1200ms
              },
            }),
          });
        } else if (url.includes('fid')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '0.08'] }], // 80ms
              },
            }),
          });
        } else if (url.includes('cls')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '0.05'] }],
              },
            }),
          });
        }

        // Default: no data
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'success',
            data: { result: [] },
          }),
        });
      });

      const metrics = await getPrometheusMetrics();

      expect(metrics).toMatchObject({
        http_request_duration_p95: 45, // Converted to ms
        http_request_duration_p99: 89, // Converted to ms
        error_rate: 0.15,
        requests_per_minute: 1250,
        lcp_p75: 1200, // Converted to ms
        fid_p75: 80, // Converted to ms
        cls_p75: 0.05,
        http_requests_total: 1000000,
        http_requests_errors: 150,
      });
    });

    it('should return zeros when Prometheus is unavailable', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

      const metrics = await getPrometheusMetrics();

      expect(metrics).toMatchObject({
        http_request_duration_p95: 0,
        http_request_duration_p99: 0,
        error_rate: 0,
        requests_per_minute: 0,
        lcp_p75: null,
        fid_p75: null,
        cls_p75: null,
        http_requests_total: 0,
        http_requests_errors: 0,
      });
    });

    it('should handle empty query results', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { result: [] }, // No data
        }),
      });

      const metrics = await getPrometheusMetrics();

      expect(metrics).toMatchObject({
        http_request_duration_p95: 0,
        http_request_duration_p99: 0,
        error_rate: 0,
        requests_per_minute: 0,
      });
    });

    it('should handle query timeout', async () => {
      (global.fetch as any).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Timeout'));
          }, 6000);
        });
      });

      const metrics = await getPrometheusMetrics();

      expect(metrics).toMatchObject({
        http_request_duration_p95: 0,
        http_request_duration_p99: 0,
      });
    }, 10000);

    it('should handle non-OK HTTP responses', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service Unavailable' }),
      });

      const metrics = await getPrometheusMetrics();

      expect(metrics).toMatchObject({
        http_request_duration_p95: 0,
        http_request_duration_p99: 0,
      });
    });

    it('should convert seconds to milliseconds for latency metrics', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('histogram_quantile(0.95')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: 'success',
              data: {
                result: [{ value: [Date.now() / 1000, '0.123'] }], // 123ms
              },
            }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'success',
            data: { result: [] },
          }),
        });
      });

      const metrics = await getPrometheusMetrics();

      expect(metrics.http_request_duration_p95).toBe(123);
    });

    it('should handle null Web Vitals gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { result: [] }, // No Web Vitals data
        }),
      });

      const metrics = await getPrometheusMetrics();

      expect(metrics.lcp_p75).toBeNull();
      expect(metrics.fid_p75).toBeNull();
      expect(metrics.cls_p75).toBeNull();
    });
  });

  describe('getHistoricalMetrics', () => {
    it('should query historical data for specified days', async () => {
      const now = Math.floor(Date.now() / 1000);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            result: [
              {
                values: [
                  [now - 86400, '99.98'],
                  [now - 43200, '99.99'],
                  [now, '99.97'],
                ],
              },
            ],
          },
        }),
      });

      const history = await getHistoricalMetrics(7);

      expect(history).toHaveLength(3);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('uptime');
      expect(history[0].uptime).toBeCloseTo(99.98, 2);
    });

    it('should use correct step size for different day ranges', async () => {
      let capturedUrl = '';

      (global.fetch as any).mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'success',
            data: { result: [{ values: [] }] },
          }),
        });
      });

      // Query for 7 days (should use 30m step)
      await getHistoricalMetrics(7);
      expect(capturedUrl).toContain('step=30m');

      // Query for 30 days (should use 1h step)
      await getHistoricalMetrics(30);
      expect(capturedUrl).toContain('step=1h');
    });

    it('should handle empty historical results', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { result: [] },
        }),
      });

      const history = await getHistoricalMetrics(7);

      expect(history).toEqual([]);
    });

    it('should handle Prometheus query failures', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection timeout'));

      const history = await getHistoricalMetrics(7);

      expect(history).toEqual([]);
    });

    it('should convert timestamps to milliseconds', async () => {
      const now = Math.floor(Date.now() / 1000);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            result: [
              {
                values: [[now, '99.98']],
              },
            ],
          },
        }),
      });

      const history = await getHistoricalMetrics(7);

      expect(history[0].timestamp).toBeGreaterThan(now); // Should be in milliseconds
      expect(history[0].timestamp).toBe(now * 1000);
    });
  });

  describe('checkPrometheusHealth', () => {
    it('should return true when Prometheus is healthy', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const isHealthy = await checkPrometheusHealth();

      expect(isHealthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:9090/-/healthy',
        expect.any(Object)
      );
    });

    it('should return false when Prometheus is unhealthy', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
      });

      const isHealthy = await checkPrometheusHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false when Prometheus is unreachable', async () => {
      (global.fetch as any).mockRejectedValue(new Error('ECONNREFUSED'));

      const isHealthy = await checkPrometheusHealth();

      expect(isHealthy).toBe(false);
    });

    it('should timeout after 3 seconds', async () => {
      (global.fetch as any).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true });
          }, 5000);
        });
      });

      const isHealthy = await checkPrometheusHealth();

      // Should timeout and return false
      expect(isHealthy).toBe(false);
    }, 6000);

    it('should use configured Prometheus URL', async () => {
      process.env.PROMETHEUS_URL = 'http://custom-prometheus:9090';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await checkPrometheusHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom-prometheus:9090/-/healthy',
        expect.any(Object)
      );
    });
  });

  describe('Query URL Construction', () => {
    it('should properly encode query parameters', async () => {
      let capturedUrl = '';

      (global.fetch as any).mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'success',
            data: { result: [] },
          }),
        });
      });

      await getPrometheusMetrics();

      // Check that URLs are properly encoded
      expect(capturedUrl).toContain('query=');
      expect(capturedUrl).toContain(encodeURIComponent('histogram_quantile'));
    });

    it('should include time range in historical queries', async () => {
      let capturedUrl = '';

      (global.fetch as any).mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'success',
            data: { result: [{ values: [] }] },
          }),
        });
      });

      await getHistoricalMetrics(7);

      expect(capturedUrl).toContain('start=');
      expect(capturedUrl).toContain('end=');
      expect(capturedUrl).toContain('step=');
    });
  });
});
