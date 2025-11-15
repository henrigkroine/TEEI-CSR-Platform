/**
 * Pact Contract Test - pact-contractor
 * Consumer: Cockpit Builder UI
 * Provider: Insights NLQ Service
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pact } from '@pact-foundation/pact';
import { resolve } from 'path';

// Mock HTTP client
async function fetchNlqQuery(baseUrl: string, query: string, tenantId: string) {
  const response = await fetch(`${baseUrl}/v1/insights/nlq/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, tenantId, includeEvidence: true }),
  });
  return response.json();
}

describe('Cockpit → Insights NLQ Pact', () => {
  let provider: Pact;

  beforeAll(async () => {
    provider = new Pact({
      consumer: 'CockpitBuilderUI',
      provider: 'InsightsNLQService',
      port: 3015,
      log: resolve(process.cwd(), 'tests/pact/logs', 'pact.log'),
      dir: resolve(process.cwd(), 'tests/pact/pacts'),
      logLevel: 'warn',
    });

    await provider.setup();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  it('should return query results with citations', async () => {
    // Set up expected interaction
    await provider.addInteraction({
      state: 'tenant has volunteer data',
      uponReceiving: 'a query for volunteer hours',
      withRequest: {
        method: 'POST',
        path: '/v1/insights/nlq/query',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          query: 'How many volunteer hours in Q1 2024?',
          tenantId: 'tenant_123',
          includeEvidence: true,
        },
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          success: true,
          answer: 'Based on the analysis of Volunteer Hours: 1,500 hours...',
          data: [{ volunteer_hours: 1500, time_bucket: '2024-01-01' }],
          citations: [
            {
              id: 'cite_volunteer_hours_tenant_12_1234567890',
              sourceSystem: 'impact-in',
              metricId: 'volunteer_hours',
              confidence: 1.0,
            },
          ],
          metadata: {
            planTimeMs: 250,
            totalTimeMs: 1800,
            citationCount: 1,
            meetsStandards: true,
          },
        },
      },
    });

    // Execute test
    const response = await fetchNlqQuery(provider.mockService.baseUrl, 'How many volunteer hours in Q1 2024?', 'tenant_123');

    // Verify
    expect(response.success).toBe(true);
    expect(response.citations).toBeDefined();
    expect(response.citations.length).toBeGreaterThanOrEqual(1);
    expect(response.metadata.meetsStandards).toBe(true);

    await provider.verify();
  });

  it('should reject invalid queries with 400', async () => {
    await provider.addInteraction({
      state: 'any state',
      uponReceiving: 'a malformed query request',
      withRequest: {
        method: 'POST',
        path: '/v1/insights/nlq/query',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          query: '',
          tenantId: 'tenant_123',
        },
      },
      willRespondWith: {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          success: false,
          error: 'Query validation failed',
        },
      },
    });

    const response = await fetchNlqQuery(provider.mockService.baseUrl, '', 'tenant_123');

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();

    await provider.verify();
  });
});

describe('Cockpit → Builder Runtime Pact', () => {
  let provider: Pact;

  beforeAll(async () => {
    provider = new Pact({
      consumer: 'CockpitBuilderUI',
      provider: 'BuilderRuntimeService',
      port: 3016,
      log: resolve(process.cwd(), 'tests/pact/logs', 'pact-builder.log'),
      dir: resolve(process.cwd(), 'tests/pact/pacts'),
      logLevel: 'warn',
    });

    await provider.setup();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  it('should compile valid dashboard JSON', async () => {
    const dashboardPayload = {
      version: '1.0.0',
      id: 'dash_123',
      name: 'Test Dashboard',
      tenantId: 'tenant_123',
      createdBy: 'user_1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      blocks: [
        {
          type: 'kpi',
          id: 'kpi_1',
          title: 'Volunteer Hours',
          metricId: 'volunteer_hours',
          aggregation: 'sum',
          timeRange: { start: '2024-01-01', end: '2024-12-31' },
          dataSource: { type: 'metric', config: {}, cache: true },
          piiSensitive: false,
        },
      ],
      layout: {
        cols: 12,
        rowHeight: 80,
        items: [{ blockId: 'kpi_1', x: 0, y: 0, w: 4, h: 2 }],
        responsive: true,
      },
      rbac: { roles: [], users: [], minPermission: 'view' },
    };

    await provider.addInteraction({
      state: 'tenant has valid dashboard',
      uponReceiving: 'a dashboard compilation request',
      withRequest: {
        method: 'POST',
        path: '/v1/builder/compile',
        headers: {
          'Content-Type': 'application/json',
        },
        body: dashboardPayload,
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          success: true,
          graph: {
            dashboardId: 'dash_123',
            nodes: [{ id: 'node_kpi_1', blockId: 'kpi_1' }],
          },
          validation: {
            valid: true,
            violations: [],
          },
          metadata: {
            compileTimeMs: 150,
            nodeCount: 1,
          },
        },
      },
    });

    const response = await fetch(`${provider.mockService.baseUrl}/v1/builder/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dashboardPayload),
    }).then((r) => r.json());

    expect(response.success).toBe(true);
    expect(response.validation.valid).toBe(true);

    await provider.verify();
  });
});
