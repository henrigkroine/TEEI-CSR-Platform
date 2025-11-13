/**
 * Pact Contract Test: API Gateway → Analytics Service
 *
 * This test ensures that the contract between the API Gateway (consumer)
 * and Analytics Service (provider) remains stable across changes.
 *
 * Install: npm install --save-dev @pact-foundation/pact
 * Run: npm test -- gateway-analytics.pact.ts
 */

import { Pact } from '@pact-foundation/pact';
import { like, regex } from '@pact-foundation/pact/src/dsl/matchers';
import * as path from 'path';

describe('API Gateway → Analytics Service', () => {
  // Configure Pact
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'analytics-service',
    port: 8080,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  beforeAll(async () => {
    await provider.setup();
  });

  afterAll(async () => {
    await provider.finalize();
  });

  afterEach(async () => {
    await provider.verify();
  });

  describe('GET /v1/metrics/:companyId', () => {
    it('returns company metrics successfully', async () => {
      const companyId = 'c1111111-1111-1111-1111-111111111111';

      // Define the expected interaction
      await provider.addInteraction({
        state: 'company has metrics data',
        uponReceiving: 'a request for company metrics',
        withRequest: {
          method: 'GET',
          path: `/v1/metrics/${companyId}`,
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            metrics: {
              sroi: like(7.5),
              vis: like(8.2),
              totalParticipants: like(1500),
              totalSessions: like(8500),
              avgEngagement: like(85),
              impactScore: like(7.8),
            },
            period: {
              start: regex(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '2025-11-01T00:00:00Z'),
              end: regex(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '2025-11-13T23:59:59Z'),
            },
          },
        },
      });

      // Make the request (in production, use your actual HTTP client)
      const response = await fetch(`http://localhost:8080/v1/metrics/${companyId}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toHaveProperty('sroi');
      expect(data.metrics).toHaveProperty('vis');
      expect(data.metrics.totalParticipants).toBeGreaterThan(0);
    });

    it('returns 404 when company not found', async () => {
      const companyId = 'invalid-company-id';

      await provider.addInteraction({
        state: 'company does not exist',
        uponReceiving: 'a request for non-existent company',
        withRequest: {
          method: 'GET',
          path: `/v1/metrics/${companyId}`,
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            error: 'Company not found',
          },
        },
      });

      const response = await fetch(`http://localhost:8080/v1/metrics/${companyId}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /v1/metrics/:companyId/sroi', () => {
    it('returns SROI value', async () => {
      const companyId = 'c1111111-1111-1111-1111-111111111111';

      await provider.addInteraction({
        state: 'company has SROI data',
        uponReceiving: 'a request for SROI',
        withRequest: {
          method: 'GET',
          path: `/v1/metrics/${companyId}/sroi`,
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            sroi: like(7.5),
          },
        },
      });

      const response = await fetch(`http://localhost:8080/v1/metrics/${companyId}/sroi`, {
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(typeof data.sroi).toBe('number');
    });
  });

  describe('GET /v1/cohort/:companyId/:cohortId', () => {
    it('returns cohort metrics', async () => {
      const companyId = 'c1111111-1111-1111-1111-111111111111';
      const cohortId = 'engineering';

      await provider.addInteraction({
        state: 'cohort exists with metrics',
        uponReceiving: 'a request for cohort metrics',
        withRequest: {
          method: 'GET',
          path: `/v1/cohort/${companyId}/${cohortId}`,
          headers: {
            Accept: 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            cohort: cohortId,
            metrics: {
              participantCount: like(250),
              avgSROI: like(8.2),
              avgVIS: like(8.5),
              completionRate: like(87.5),
            },
          },
        },
      });

      const response = await fetch(`http://localhost:8080/v1/cohort/${companyId}/${cohortId}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cohort).toBe(cohortId);
      expect(data.metrics.participantCount).toBeGreaterThan(0);
    });
  });
});

/**
 * Provider Verification
 *
 * The Analytics Service should verify it can satisfy these contracts:
 *
 * ```typescript
 * import { Verifier } from '@pact-foundation/pact';
 *
 * const verifier = new Verifier({
 *   providerBaseUrl: 'http://localhost:3004',
 *   provider: 'analytics-service',
 *   pactUrls: ['./pacts/api-gateway-analytics-service.json'],
 * });
 *
 * verifier.verifyProvider().then(() => {
 *   console.log('Pact verification successful');
 * });
 * ```
 */
