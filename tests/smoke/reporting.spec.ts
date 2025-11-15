import { test, expect } from '@playwright/test';

/**
 * Smoke Test: Reporting Service
 *
 * Tests basic reporting functionality:
 * - Health check
 * - Basic SROI calculation
 * - Basic VIS calculation
 * - Metrics endpoint
 *
 * Run: pnpm exec playwright test tests/smoke/reporting.spec.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const API_URL = `${BASE_URL}/api/reporting`;
const TEST_TOKEN = process.env.TEST_TOKEN || ''; // Auth token for API

test.describe('Smoke: Reporting Service', () => {
  test.setTimeout(60000); // 60 seconds

  test('Reporting service is healthy', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toMatch(/ok|healthy/i);

    console.log('[Smoke] ✓ Reporting service is healthy');
  });

  test('SROI calculation endpoint responds', async ({ request }) => {
    const testPayload = {
      investment: 100000, // $100k investment
      socialValue: 500000, // $500k social value generated
      periodMonths: 12,
    };

    const response = await request.post(`${API_URL}/sroi/calculate`, {
      data: testPayload,
      headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
      failOnStatusCode: false,
    });

    // Should respond (200 for success, 401 if auth required, 422 for validation)
    expect([200, 401, 422]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();

      // Verify SROI calculation structure
      expect(body).toHaveProperty('sroi');
      expect(typeof body.sroi).toBe('number');

      // SROI = socialValue / investment = 500000 / 100000 = 5.0
      expect(body.sroi).toBeGreaterThan(0);
      expect(body.sroi).toBeLessThan(100); // Sanity check

      console.log(`[Smoke] ✓ SROI calculation works: ${body.sroi}x return`);
    } else if (response.status() === 401) {
      console.log('[Smoke] ✓ SROI endpoint requires authentication');
    } else {
      const body = await response.json();
      console.log('[Smoke] ✓ SROI endpoint validates input:', body.error || body.message);
    }
  });

  test('VIS calculation endpoint responds', async ({ request }) => {
    const testPayload = {
      volunteers: 50,
      hoursPerVolunteer: 10,
      skillLevel: 'intermediate', // entry, intermediate, expert
    };

    const response = await request.post(`${API_URL}/vis/calculate`, {
      data: testPayload,
      headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
      failOnStatusCode: false,
    });

    // Should respond
    expect([200, 401, 422]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();

      // Verify VIS calculation structure
      expect(body).toHaveProperty('visScore');
      expect(typeof body.visScore).toBe('number');
      expect(body.visScore).toBeGreaterThan(0);

      console.log(`[Smoke] ✓ VIS calculation works: ${body.visScore} score`);
    } else if (response.status() === 401) {
      console.log('[Smoke] ✓ VIS endpoint requires authentication');
    } else {
      console.log('[Smoke] ✓ VIS endpoint validates input');
    }
  });

  test('Report listing endpoint responds', async ({ request }) => {
    const response = await request.get(`${API_URL}/reports`, {
      headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
      failOnStatusCode: false,
    });

    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();

      // Should return array of reports (even if empty)
      expect(Array.isArray(body) || Array.isArray(body.reports)).toBe(true);

      const reports = Array.isArray(body) ? body : body.reports || [];

      console.log(`[Smoke] ✓ Report listing works (${reports.length} reports)`);

      if (reports.length > 0) {
        const firstReport = reports[0];
        expect(firstReport).toHaveProperty('id');
        console.log(`[Smoke]   First report ID: ${firstReport.id}`);
      }
    } else {
      console.log('[Smoke] ✓ Report listing requires authentication');
    }
  });

  test('Metrics endpoint is accessible', async ({ request }) => {
    const response = await request.get(`${API_URL}/metrics`, {
      failOnStatusCode: false,
    });

    // Metrics may require auth (401) or be public (200)
    expect([200, 401, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.text();

      // Verify Prometheus metrics format
      expect(body).toMatch(/# HELP|# TYPE/);

      // Check for reporting-specific metrics
      const expectedMetrics = [
        'http_request_duration_seconds',
        'http_requests_total',
        'sroi_calculations_total',
        'vis_calculations_total',
      ];

      const foundMetrics = expectedMetrics.filter((metric) => body.includes(metric));

      console.log('[Smoke] ✓ Reporting metrics available');
      console.log(`[Smoke]   Found metrics: ${foundMetrics.join(', ')}`);
    } else {
      console.log(`[Smoke] ⚠ Metrics endpoint: HTTP ${response.status()}`);
    }
  });

  test('Database connectivity check', async ({ request }) => {
    // Some services expose database health
    const response = await request.get(`${API_URL}/health/db`, {
      failOnStatusCode: false,
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('database');
      expect(body.database).toMatch(/connected|ok/i);

      console.log('[Smoke] ✓ Database connectivity verified');
    } else if (response.status() === 404) {
      console.log('[Smoke] ⚠ Database health check not exposed');
    } else {
      console.warn('[Smoke] ⚠ Database health check failed');
    }
  });

  test('Error handling for invalid input', async ({ request }) => {
    const invalidPayload = {
      investment: -1000, // Negative investment (invalid)
      socialValue: 'not-a-number', // String instead of number
      periodMonths: 0, // Zero months (invalid)
    };

    const response = await request.post(`${API_URL}/sroi/calculate`, {
      data: invalidPayload,
      headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
      failOnStatusCode: false,
    });

    // Should return validation error (422) or auth error (401)
    expect([401, 422, 400]).toContain(response.status());

    if (response.status() === 422 || response.status() === 400) {
      const body = await response.json();

      // Should have error details
      expect(body).toHaveProperty('error');

      console.log('[Smoke] ✓ Invalid input rejected with proper error');
      console.log(`[Smoke]   Error: ${body.error || body.message}`);
    } else {
      console.log('[Smoke] ✓ Request blocked by authentication');
    }
  });

  test('Response time for calculations', async ({ request }) => {
    const testPayload = {
      investment: 100000,
      socialValue: 500000,
      periodMonths: 12,
    };

    const measurements: number[] = [];

    // Make 3 calculation requests
    for (let i = 0; i < 3; i++) {
      const start = Date.now();

      await request.post(`${API_URL}/sroi/calculate`, {
        data: testPayload,
        headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
        failOnStatusCode: false,
      });

      const duration = Date.now() - start;
      measurements.push(duration);
    }

    const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;

    console.log(`[Smoke] SROI calculation times: ${measurements.join(', ')}ms`);
    console.log(`[Smoke] Average: ${avgResponseTime.toFixed(0)}ms`);

    // Calculations should be fast (<1 second)
    expect(avgResponseTime).toBeLessThan(1000);

    console.log('[Smoke] ✓ Calculation performance acceptable');
  });

  test('Report export functionality check', async ({ request }) => {
    // Check if export endpoints exist
    const exportFormats = ['pdf', 'csv', 'json'];

    for (const format of exportFormats) {
      const response = await request.get(`${API_URL}/reports/export/${format}`, {
        headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
        failOnStatusCode: false,
      });

      // Should respond (200, 401, 404, or 422 if report ID required)
      expect([200, 400, 401, 404, 422]).toContain(response.status());

      if (response.status() === 200) {
        console.log(`[Smoke] ✓ ${format.toUpperCase()} export available`);
      } else if (response.status() === 401) {
        console.log(`[Smoke] ✓ ${format.toUpperCase()} export requires auth`);
      } else if (response.status() === 422) {
        console.log(`[Smoke] ✓ ${format.toUpperCase()} export requires report ID`);
      } else {
        console.log(`[Smoke] ⚠ ${format.toUpperCase()} export: HTTP ${response.status()}`);
      }
    }
  });

  test('Concurrent calculation handling', async ({ request }) => {
    const testPayload = {
      investment: 100000,
      socialValue: 500000,
      periodMonths: 12,
    };

    // Make 5 concurrent requests
    const requests = Array.from({ length: 5 }, () =>
      request.post(`${API_URL}/sroi/calculate`, {
        data: testPayload,
        headers: TEST_TOKEN ? { Authorization: `Bearer ${TEST_TOKEN}` } : {},
        failOnStatusCode: false,
      })
    );

    const responses = await Promise.all(requests);

    // All should succeed (or all require auth)
    const statuses = responses.map((r) => r.status());
    const uniqueStatuses = [...new Set(statuses)];

    console.log(`[Smoke] Concurrent requests statuses: ${statuses.join(', ')}`);

    // All requests should have same status (consistent behavior)
    expect(uniqueStatuses.length).toBe(1);

    console.log('[Smoke] ✓ Concurrent requests handled consistently');
  });
});
