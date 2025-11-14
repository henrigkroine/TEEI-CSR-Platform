/**
 * Contract test: API Gateway → Analytics Service
 *
 * Verifies contract for analytics endpoints (trends, cohorts, funnels, benchmarks)
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/Pact Author
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

const { like, integer, decimal, eachLike, string } = Matchers;

describe('API Gateway → Analytics Service Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'analytics-service',
    port: 8085,
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

  describe('GET /v1/analytics/trends', () => {
    it('should return time-series trends data', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';

      await provider.addInteraction({
        state: 'company has analytics data',
        uponReceiving: 'a request for trends',
        withRequest: {
          method: 'GET',
          path: '/v1/analytics/trends',
          query: {
            companyId,
            metrics: 'participants,sessions',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            interval: 'month',
            page: '1',
            limit: '100',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            data: eachLike({
              period: string('2024-01'),
              participants: integer(120),
              sessions: integer(340),
            }),
            pagination: {
              page: integer(1),
              limit: integer(100),
              total: integer(12),
              hasNext: like(false),
            },
            metadata: {
              companyId,
              interval: string('month'),
              queryDurationMs: integer(45),
              cacheHit: like(true),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/analytics/trends`,
        {
          params: {
            companyId,
            metrics: 'participants,sessions',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            interval: 'month',
            page: 1,
            limit: 100,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.pagination).toBeDefined();
      expect(response.data.metadata.queryDurationMs).toBeGreaterThanOrEqual(0);

      await provider.verify();
    });
  });

  describe('GET /v1/analytics/cohorts', () => {
    it('should return cohort comparison data', async () => {
      await provider.addInteraction({
        state: 'company has cohort data',
        uponReceiving: 'a request for cohort analysis',
        withRequest: {
          method: 'GET',
          path: '/v1/analytics/cohorts',
          query: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            metrics: 'avg_confidence,avg_belonging',
            cohortDimension: 'program',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            data: eachLike({
              cohort: string('Mentorship'),
              participantsCount: integer(450),
              avg_confidence: decimal(0.82),
              avg_belonging: decimal(0.85),
            }),
            metadata: like({
              companyId: '550e8400-e29b-41d4-a716-446655440000',
              cohortDimension: 'program',
              periodStart: '2024-01-01',
              periodEnd: '2024-12-31',
              queryDurationMs: 62,
            }),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/analytics/cohorts`,
        {
          params: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            metrics: 'avg_confidence,avg_belonging',
            cohortDimension: 'program',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);

      await provider.verify();
    });
  });

  describe('GET /v1/analytics/funnels', () => {
    it('should return funnel analysis', async () => {
      await provider.addInteraction({
        state: 'company has funnel data',
        uponReceiving: 'a request for funnel analysis',
        withRequest: {
          method: 'GET',
          path: '/v1/analytics/funnels',
          query: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            funnelType: 'enrollment',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            data: {
              stages: eachLike({
                stage: string('Registered'),
                count: integer(1000),
                percentage: decimal(100.0),
                dropoffRate: decimal(0.0),
              }),
              overallConversionRate: decimal(45.0),
            },
            metadata: like({
              companyId: '550e8400-e29b-41d4-a716-446655440000',
              funnelType: 'enrollment',
              queryDurationMs: 78,
            }),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/analytics/funnels`,
        {
          params: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            funnelType: 'enrollment',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.stages).toBeInstanceOf(Array);
      expect(response.data.data.overallConversionRate).toBeGreaterThanOrEqual(0);

      await provider.verify();
    });
  });
});
