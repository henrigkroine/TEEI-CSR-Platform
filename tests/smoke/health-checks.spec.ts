import { test, expect } from '@playwright/test';

/**
 * Smoke Test: Health Checks
 *
 * Quick validation that all service health endpoints respond.
 * Should complete in <30 seconds.
 *
 * Run: pnpm exec playwright test tests/smoke/health-checks.spec.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:6509';
const TIMEOUT = 5000; // 5 seconds per check

interface ServiceEndpoint {
  name: string;
  path: string;
  expectedStatus?: number;
}

const SERVICES: ServiceEndpoint[] = [
  { name: 'Corporate Cockpit UI', path: '/health' },
  { name: 'API Gateway', path: '/api/health' },
  { name: 'Reporting Service', path: '/api/reporting/health' },
  { name: 'Impact Calculator', path: '/api/impact/health' },
  { name: 'Q2Q AI Service', path: '/api/q2q/health' },
  { name: 'Analytics Service', path: '/api/analytics/health' },
  { name: 'Journey Engine', path: '/api/journey/health' },
  { name: 'Notifications Service', path: '/api/notifications/health' },
  { name: 'Unified Profile', path: '/api/profile/health' },
  { name: 'Discord Bot', path: '/api/discord/health' },
];

test.describe('Smoke: Health Checks', () => {
  test.setTimeout(TIMEOUT * SERVICES.length + 5000); // Total timeout for all checks

  SERVICES.forEach((service) => {
    test(`${service.name} health endpoint responds`, async ({ request }) => {
      const url = `${BASE_URL}${service.path}`;
      const expectedStatus = service.expectedStatus || 200;

      console.log(`[Smoke] Checking ${service.name}: ${url}`);

      const response = await request.get(url, {
        timeout: TIMEOUT,
        failOnStatusCode: false,
      });

      expect(response.status()).toBe(expectedStatus);

      // Verify response is JSON
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');

      // Verify health response structure
      const body = await response.json();
      expect(body).toHaveProperty('status');
      expect(body.status).toMatch(/ok|healthy|up/i);

      console.log(`[Smoke] ✓ ${service.name} is healthy`);
    });
  });

  test('All services respond within timeout', async ({ request }) => {
    const startTime = Date.now();
    const results: Record<string, boolean> = {};

    // Check all services in parallel
    await Promise.all(
      SERVICES.map(async (service) => {
        try {
          const response = await request.get(`${BASE_URL}${service.path}`, {
            timeout: TIMEOUT,
            failOnStatusCode: false,
          });
          results[service.name] = response.status() === 200;
        } catch (error) {
          results[service.name] = false;
        }
      })
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`[Smoke] Total health check time: ${totalTime}ms`);
    console.log('[Smoke] Results:', results);

    // Verify all passed
    const failedServices = Object.entries(results)
      .filter(([_, passed]) => !passed)
      .map(([name, _]) => name);

    expect(failedServices).toHaveLength(0);

    // Verify completed quickly (smoke tests should be fast)
    expect(totalTime).toBeLessThan(30000); // <30 seconds

    console.log('[Smoke] ✓ All services healthy');
  });

  test('Readiness probes respond', async ({ request }) => {
    const readinessEndpoints = [
      { name: 'API Gateway', path: '/api/ready' },
      { name: 'Corporate Cockpit', path: '/ready' },
    ];

    for (const endpoint of readinessEndpoints) {
      const url = `${BASE_URL}${endpoint.path}`;

      const response = await request.get(url, {
        timeout: TIMEOUT,
        failOnStatusCode: false,
      });

      // Readiness can be 200 (ready) or 503 (not ready), but should respond
      expect([200, 503]).toContain(response.status());

      if (response.status() === 200) {
        console.log(`[Smoke] ✓ ${endpoint.name} is ready`);
      } else {
        console.warn(`[Smoke] ⚠ ${endpoint.name} is not ready (503)`);
      }
    }
  });

  test('Metrics endpoints are accessible', async ({ request }) => {
    const metricsEndpoints = [
      { name: 'API Gateway', path: '/api/metrics' },
      { name: 'Reporting Service', path: '/api/reporting/metrics' },
    ];

    for (const endpoint of metricsEndpoints) {
      const url = `${BASE_URL}${endpoint.path}`;

      const response = await request.get(url, {
        timeout: TIMEOUT,
        failOnStatusCode: false,
      });

      // Metrics may require auth (401) or be disabled (404), but should respond
      expect([200, 401, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.text();

        // Verify Prometheus metrics format
        expect(body).toMatch(/# HELP|# TYPE/);
        expect(body).toContain('http_request');

        console.log(`[Smoke] ✓ ${endpoint.name} metrics available`);
      } else {
        console.log(`[Smoke] ⚠ ${endpoint.name} metrics: HTTP ${response.status()}`);
      }
    }
  });
});
