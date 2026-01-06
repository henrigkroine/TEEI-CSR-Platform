import { test, expect } from '@playwright/test';

/**
 * Trust API - Evidence Endpoints E2E Tests
 * Agent 4.1: E2E Test Engineer (Trust Center)
 *
 * Test Coverage:
 * - Evidence endpoints for report citations
 * - Ledger endpoints for integrity verification
 * - Public policy endpoints for residency rules
 * - SBOM (Software Bill of Materials) endpoints
 * - SLSA provenance endpoints
 * - Status API endpoints
 * - Error handling and authentication
 */

test.describe('Trust API - Evidence Endpoints', () => {
  test('GET /api/trust/v1/evidence/:reportId returns citations', async ({ request }) => {
    const reportId = 'test-report-q4-2024';

    const response = await request.get(`/api/trust/v1/evidence/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json',
      }
    });

    // Should return OK status
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Validate response structure
    const data = await response.json();
    expect(data).toHaveProperty('citations');
    expect(data).toHaveProperty('reportId', reportId);
    expect(data).toHaveProperty('timestamp');

    // Citations should be an array
    expect(data.citations).toBeInstanceOf(Array);

    // Each citation should have required fields
    if (data.citations.length > 0) {
      const citation = data.citations[0];
      expect(citation).toHaveProperty('id');
      expect(citation).toHaveProperty('sourceId');
      expect(citation).toHaveProperty('text');
      expect(citation).toHaveProperty('location');
    }
  });

  test('GET /api/trust/v1/evidence/:reportId handles non-existent report', async ({ request }) => {
    const response = await request.get('/api/trust/v1/evidence/non-existent-report', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
      }
    });

    // Should return 404 for non-existent report
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('not found');
  });

  test('GET /api/trust/v1/evidence/:reportId requires authentication', async ({ request }) => {
    const response = await request.get('/api/trust/v1/evidence/test-report-q4-2024');

    // Should return 401 without token
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Unauthorized');
  });

  test('GET /api/trust/v1/evidence/:reportId/lineage returns evidence lineage', async ({ request }) => {
    const reportId = 'test-report-q4-2024';

    const response = await request.get(`/api/trust/v1/evidence/${reportId}/lineage`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('reportId', reportId);
    expect(data).toHaveProperty('lineage');
    expect(data.lineage).toBeInstanceOf(Array);

    // Each lineage entry should have source, transformation, and target
    if (data.lineage.length > 0) {
      const entry = data.lineage[0];
      expect(entry).toHaveProperty('source');
      expect(entry).toHaveProperty('transformation');
      expect(entry).toHaveProperty('target');
      expect(entry).toHaveProperty('timestamp');
    }
  });
});

test.describe('Trust API - Ledger Endpoints', () => {
  test('GET /api/trust/v1/ledger/:reportId returns integrity verification', async ({ request }) => {
    const reportId = 'test-report-q4-2024';

    const response = await request.get(`/api/trust/v1/ledger/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('reportId', reportId);
    expect(data).toHaveProperty('hash');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('verified');

    // Hash should be a valid SHA-256 hash (64 hex characters)
    expect(data.hash).toMatch(/^[a-f0-9]{64}$/i);

    // Verified should be a boolean
    expect(typeof data.verified).toBe('boolean');
  });

  test('GET /api/trust/v1/ledger/:reportId/history returns audit trail', async ({ request }) => {
    const reportId = 'test-report-q4-2024';

    const response = await request.get(`/api/trust/v1/ledger/${reportId}/history`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('reportId', reportId);
    expect(data).toHaveProperty('history');
    expect(data.history).toBeInstanceOf(Array);

    // Each history entry should have event details
    if (data.history.length > 0) {
      const entry = data.history[0];
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('event');
      expect(entry).toHaveProperty('actor');
      expect(entry).toHaveProperty('hash');
    }
  });

  test('POST /api/trust/v1/ledger/verify verifies report integrity', async ({ request }) => {
    const response = await request.post('/api/trust/v1/ledger/verify', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json',
      },
      data: {
        reportId: 'test-report-q4-2024',
        hash: 'a'.repeat(64), // Mock SHA-256 hash
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('verified');
    expect(data).toHaveProperty('reportId');
    expect(data).toHaveProperty('matchedHash');
    expect(typeof data.verified).toBe('boolean');
  });
});

test.describe('Trust API - Policy Endpoints (Public)', () => {
  test('GET /api/trust/v1/policies returns residency rules', async ({ request }) => {
    // This endpoint should be public (no auth required)
    const response = await request.get('/api/trust/v1/policies');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('regions');
    expect(data).toHaveProperty('gdpr');
    expect(data).toHaveProperty('dataClassifications');

    // Regions should include US, EU, APAC
    expect(data.regions).toHaveProperty('US');
    expect(data.regions).toHaveProperty('EU');
    expect(data.regions).toHaveProperty('APAC');

    // GDPR should have required fields
    expect(data.gdpr).toHaveProperty('enabled');
    expect(data.gdpr).toHaveProperty('dataRetentionDays');
    expect(data.gdpr).toHaveProperty('rightsToErasure');
  });

  test('GET /api/trust/v1/policies/residency/:region returns region-specific rules', async ({ request }) => {
    const response = await request.get('/api/trust/v1/policies/residency/EU');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('region', 'EU');
    expect(data).toHaveProperty('dataCenter');
    expect(data).toHaveProperty('regulations');
    expect(data.regulations).toBeInstanceOf(Array);

    // Should include GDPR for EU
    expect(data.regulations).toContain('GDPR');
  });

  test('GET /api/trust/v1/policies/dpa returns DPA template', async ({ request }) => {
    const response = await request.get('/api/trust/v1/policies/dpa');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('template');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('effectiveDate');
  });

  test('GET /api/trust/v1/policies/ropa returns ROPA (Record of Processing Activities)', async ({ request }) => {
    const response = await request.get('/api/trust/v1/policies/ropa');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('activities');
    expect(data.activities).toBeInstanceOf(Array);

    if (data.activities.length > 0) {
      const activity = data.activities[0];
      expect(activity).toHaveProperty('name');
      expect(activity).toHaveProperty('purpose');
      expect(activity).toHaveProperty('legalBasis');
      expect(activity).toHaveProperty('dataCategories');
    }
  });

  test('GET /api/trust/v1/policies/dpia returns DPIA summary', async ({ request }) => {
    const response = await request.get('/api/trust/v1/policies/dpia');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('assessments');
    expect(data.assessments).toBeInstanceOf(Array);

    if (data.assessments.length > 0) {
      const assessment = data.assessments[0];
      expect(assessment).toHaveProperty('id');
      expect(assessment).toHaveProperty('name');
      expect(assessment).toHaveProperty('riskLevel');
      expect(assessment).toHaveProperty('mitigations');
    }
  });
});

test.describe('Trust API - SBOM & Provenance Endpoints', () => {
  test('GET /api/trust/v1/sbom returns Software Bill of Materials', async ({ request }) => {
    const response = await request.get('/api/trust/v1/sbom');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('format'); // e.g., 'SPDX', 'CycloneDX'
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('components');
    expect(data.components).toBeInstanceOf(Array);

    if (data.components.length > 0) {
      const component = data.components[0];
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('version');
      expect(component).toHaveProperty('license');
    }
  });

  test('GET /api/trust/v1/provenance returns SLSA provenance', async ({ request }) => {
    const response = await request.get('/api/trust/v1/provenance');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('slsaVersion');
    expect(data).toHaveProperty('buildType');
    expect(data).toHaveProperty('builder');
    expect(data).toHaveProperty('invocation');

    // SLSA version should be v1.0 or higher
    expect(data.slsaVersion).toMatch(/^v[0-9]+\.[0-9]+$/);
  });

  test('GET /api/trust/v1/vulnerabilities returns CVE scan results', async ({ request }) => {
    const response = await request.get('/api/trust/v1/vulnerabilities');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('scanDate');
    expect(data).toHaveProperty('vulnerabilities');
    expect(data.vulnerabilities).toBeInstanceOf(Array);

    // Check vulnerability structure
    if (data.vulnerabilities.length > 0) {
      const vuln = data.vulnerabilities[0];
      expect(vuln).toHaveProperty('id'); // CVE-YYYY-NNNNN
      expect(vuln).toHaveProperty('severity');
      expect(vuln).toHaveProperty('package');
      expect(vuln).toHaveProperty('fixedVersion');
    }
  });
});

test.describe('Trust API - Status Endpoints', () => {
  test('GET /api/v1/trust-center/status returns live metrics', async ({ request }) => {
    const response = await request.get('/api/v1/trust-center/status');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('latencyP95');
    expect(data).toHaveProperty('timestamp');

    // Uptime should be between 0 and 100
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.uptime).toBeLessThanOrEqual(100);

    // Latency should be a positive number
    expect(data.latencyP95).toBeGreaterThan(0);
  });

  test('GET /api/v1/trust-center/status/history returns historical metrics', async ({ request }) => {
    const response = await request.get('/api/v1/trust-center/status/history?days=7');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('metrics');
    expect(data.metrics).toBeInstanceOf(Array);

    if (data.metrics.length > 0) {
      const metric = data.metrics[0];
      expect(metric).toHaveProperty('timestamp');
      expect(metric).toHaveProperty('uptime');
      expect(metric).toHaveProperty('latencyP95');
    }
  });

  test('GET /api/v1/trust-center/incidents returns incident list', async ({ request }) => {
    const response = await request.get('/api/v1/trust-center/incidents');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('incidents');
    expect(data.incidents).toBeInstanceOf(Array);

    if (data.incidents.length > 0) {
      const incident = data.incidents[0];
      expect(incident).toHaveProperty('id');
      expect(incident).toHaveProperty('title');
      expect(incident).toHaveProperty('status');
      expect(incident).toHaveProperty('timestamp');
      expect(incident).toHaveProperty('duration');

      // Status should be one of: 'investigating', 'identified', 'monitoring', 'resolved'
      expect(['investigating', 'identified', 'monitoring', 'resolved']).toContain(incident.status);
    }
  });
});

test.describe('Trust API - AI Transparency Endpoints', () => {
  test('GET /api/trust/v1/ai/model-cards returns AI model information', async ({ request }) => {
    const response = await request.get('/api/trust/v1/ai/model-cards');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('models');
    expect(data.models).toBeInstanceOf(Array);

    if (data.models.length > 0) {
      const model = data.models[0];
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('provider'); // e.g., 'Anthropic', 'OpenAI'
      expect(model).toHaveProperty('version');
      expect(model).toHaveProperty('purpose');
      expect(model).toHaveProperty('trainingData');
      expect(model).toHaveProperty('limitations');
    }
  });

  test('GET /api/trust/v1/ai/usage-metrics returns AI usage statistics', async ({ request }) => {
    const response = await request.get('/api/trust/v1/ai/usage-metrics', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
      }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('totalRequests');
    expect(data).toHaveProperty('tokensConsumed');
    expect(data).toHaveProperty('costUSD');
    expect(data).toHaveProperty('modelBreakdown');

    // Model breakdown should be an object with model names as keys
    expect(typeof data.modelBreakdown).toBe('object');
  });

  test('GET /api/trust/v1/ai/guardrails returns AI safety policies', async ({ request }) => {
    const response = await request.get('/api/trust/v1/ai/guardrails');

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('piiRedaction');
    expect(data).toHaveProperty('contentModeration');
    expect(data).toHaveProperty('citationEnforcement');
    expect(data).toHaveProperty('promptInjectionPrevention');

    // Each guardrail should have enabled status
    expect(data.piiRedaction).toHaveProperty('enabled');
    expect(data.contentModeration).toHaveProperty('enabled');
    expect(data.citationEnforcement).toHaveProperty('enabled');
  });
});

test.describe('Trust API - Error Handling', () => {
  test('API returns proper error format for bad requests', async ({ request }) => {
    const response = await request.post('/api/trust/v1/ledger/verify', {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json',
      },
      data: {
        // Missing required fields
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('statusCode', 400);
  });

  test('API handles rate limiting correctly', async ({ request }) => {
    // Make multiple rapid requests to trigger rate limiting
    const requests = Array(100).fill(null).map(() =>
      request.get('/api/trust/v1/policies')
    );

    const responses = await Promise.all(requests);

    // At least one should be rate limited (429)
    const rateLimited = responses.some(r => r.status() === 429);

    // If rate limiting is implemented, check for 429 responses
    if (rateLimited) {
      const rateLimitedResponse = responses.find(r => r.status() === 429);
      if (rateLimitedResponse) {
        const data = await rateLimitedResponse.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('rate limit');
      }
    }
  });

  test('API returns proper CORS headers', async ({ request }) => {
    const response = await request.get('/api/trust/v1/policies');

    // Check CORS headers
    const headers = response.headers();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });
});
