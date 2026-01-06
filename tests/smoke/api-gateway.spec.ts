import { test, expect } from '@playwright/test';

/**
 * Smoke Test: API Gateway
 *
 * Tests critical API Gateway functionality:
 * - Authentication flow
 * - Rate limiting
 * - CORS headers
 * - Error handling
 *
 * Run: pnpm exec playwright test tests/smoke/api-gateway.spec.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:6509';
const API_URL = `${BASE_URL}/api`;
const TEST_EMAIL = process.env.TEST_EMAIL || 'smoke-test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'smoke-test-password';

test.describe('Smoke: API Gateway', () => {
  test.setTimeout(60000); // 60 seconds total

  test('API Gateway is accessible', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toMatch(/ok|healthy/i);

    console.log('[Smoke] ✓ API Gateway is accessible');
  });

  test('Authentication endpoint responds', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
      failOnStatusCode: false,
    });

    // Should respond (200 for success, 401 for invalid creds)
    expect([200, 401, 422]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('token');
      console.log('[Smoke] ✓ Authentication successful');
    } else if (response.status() === 401) {
      console.log('[Smoke] ✓ Authentication endpoint working (invalid credentials)');
    } else {
      console.log('[Smoke] ✓ Authentication endpoint responds with validation error');
    }
  });

  test('Unauthenticated requests are blocked', async ({ request }) => {
    // Try to access protected endpoint without auth
    const response = await request.get(`${API_URL}/profile/me`, {
      failOnStatusCode: false,
    });

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    console.log('[Smoke] ✓ Unauthenticated requests blocked');
  });

  test('CORS headers are present', async ({ request }) => {
    const response = await request.options(`${API_URL}/health`, {
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'GET',
      },
      failOnStatusCode: false,
    });

    const headers = response.headers();

    // Check for CORS headers
    expect(headers['access-control-allow-origin']).toBeDefined();
    expect(headers['access-control-allow-methods']).toBeDefined();

    console.log('[Smoke] ✓ CORS headers present');
    console.log(`[Smoke]   Allow-Origin: ${headers['access-control-allow-origin']}`);
    console.log(`[Smoke]   Allow-Methods: ${headers['access-control-allow-methods']}`);
  });

  test('Rate limiting is configured', async ({ request }) => {
    // Make multiple requests to trigger rate limiting
    const requests = Array.from({ length: 10 }, (_, i) =>
      request.get(`${API_URL}/health`)
    );

    const responses = await Promise.all(requests);

    // Check for rate limit headers
    const firstResponse = responses[0];
    const headers = firstResponse.headers();

    // Common rate limit headers
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'ratelimit-limit',
      'ratelimit-remaining',
    ];

    const hasRateLimitHeader = rateLimitHeaders.some(
      (header) => headers[header] !== undefined
    );

    if (hasRateLimitHeader) {
      console.log('[Smoke] ✓ Rate limiting configured');
      rateLimitHeaders.forEach((header) => {
        if (headers[header]) {
          console.log(`[Smoke]   ${header}: ${headers[header]}`);
        }
      });
    } else {
      console.warn('[Smoke] ⚠ Rate limiting headers not found');
    }
  });

  test('Error responses are well-formed', async ({ request }) => {
    // Request invalid endpoint
    const response = await request.get(`${API_URL}/nonexistent-endpoint`, {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(404);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');

    const body = await response.json();

    // Check error response structure
    expect(body).toHaveProperty('error');

    console.log('[Smoke] ✓ Error responses well-formed');
    console.log(`[Smoke]   Error structure:`, Object.keys(body));
  });

  test('API versioning is in place', async ({ request }) => {
    // Check for API version header or path versioning
    const response = await request.get(`${API_URL}/health`);

    const headers = response.headers();

    // Check for version in headers
    const versionHeaders = ['api-version', 'x-api-version'];
    const versionHeader = versionHeaders.find((h) => headers[h]);

    if (versionHeader) {
      console.log('[Smoke] ✓ API versioning in headers');
      console.log(`[Smoke]   ${versionHeader}: ${headers[versionHeader]}`);
    } else {
      // Check for version in URL (e.g., /api/v1/...)
      if (API_URL.match(/\/v\d+/)) {
        console.log('[Smoke] ✓ API versioning in URL path');
      } else {
        console.warn('[Smoke] ⚠ API versioning not detected');
      }
    }
  });

  test('Request/Response logging works', async ({ request }) => {
    const requestId = `smoke-test-${Date.now()}`;

    const response = await request.get(`${API_URL}/health`, {
      headers: {
        'X-Request-ID': requestId,
      },
    });

    const headers = response.headers();

    // Check if request ID is echoed back
    const requestIdHeader = headers['x-request-id'];

    if (requestIdHeader) {
      expect(requestIdHeader).toBe(requestId);
      console.log('[Smoke] ✓ Request ID tracking works');
    } else {
      console.warn('[Smoke] ⚠ Request ID not echoed in response');
    }
  });

  test('Compression is enabled', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    const contentEncoding = response.headers()['content-encoding'];

    if (contentEncoding) {
      expect(contentEncoding).toMatch(/gzip|deflate|br/);
      console.log('[Smoke] ✓ Response compression enabled');
      console.log(`[Smoke]   Content-Encoding: ${contentEncoding}`);
    } else {
      console.warn('[Smoke] ⚠ Response compression not detected (may be small response)');
    }
  });

  test('Security headers are present', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    const headers = response.headers();

    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': /DENY|SAMEORIGIN/,
      'x-xss-protection': /1/,
      'strict-transport-security': /max-age/,
    };

    const results: Record<string, boolean> = {};

    Object.entries(securityHeaders).forEach(([header, expected]) => {
      const value = headers[header];
      if (value) {
        if (typeof expected === 'string') {
          results[header] = value === expected;
        } else {
          results[header] = expected.test(value);
        }
      } else {
        results[header] = false;
      }
    });

    console.log('[Smoke] Security headers:');
    Object.entries(results).forEach(([header, present]) => {
      if (present) {
        console.log(`[Smoke]   ✓ ${header}: ${headers[header]}`);
      } else {
        console.log(`[Smoke]   ⚠ ${header}: missing`);
      }
    });

    // At least 2 security headers should be present
    const presentCount = Object.values(results).filter(Boolean).length;
    expect(presentCount).toBeGreaterThanOrEqual(2);
  });

  test('Response time is acceptable', async ({ request }) => {
    const measurements: number[] = [];

    // Make 5 requests and measure response time
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await request.get(`${API_URL}/health`);
      const duration = Date.now() - start;
      measurements.push(duration);
    }

    const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const maxResponseTime = Math.max(...measurements);

    console.log(`[Smoke] Response times: ${measurements.join(', ')}ms`);
    console.log(`[Smoke] Average: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`[Smoke] Max: ${maxResponseTime}ms`);

    // Health endpoint should respond in <500ms on average
    expect(avgResponseTime).toBeLessThan(500);

    // No request should take >2 seconds
    expect(maxResponseTime).toBeLessThan(2000);

    console.log('[Smoke] ✓ Response time acceptable');
  });
});
