/**
 * Contract test: API Gateway → Reporting Service
 *
 * Verifies that the API Gateway correctly proxies requests to the Reporting Service
 * and that both services agree on the request/response contract.
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/Pact Author
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

const { like, uuid, string, integer, decimal, eachLike, iso8601DateTimeWithMillis } = Matchers;

describe('API Gateway → Reporting Service Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'reporting-service',
    port: 8084,
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

  describe('POST /v1/gen-reports/generate', () => {
    it('should generate report with citations when company has outcome data', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';

      await provider.addInteraction({
        state: 'company has outcome data for period',
        uponReceiving: 'a request to generate AI report',
        withRequest: {
          method: 'POST',
          path: '/v1/gen-reports/generate',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: {
            companyId,
            period: {
              start: '2024-01-01',
              end: '2024-12-31',
            },
            locale: 'en',
            sections: ['impact-summary', 'sroi-narrative'],
            deterministic: false,
            temperature: 0.7,
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            reportId: like('rpt_7f8a9b0c1d2e3f4a'),
            sections: eachLike({
              type: string('impact-summary'),
              content: like('Sample Company achieved remarkable impact in 2024...'),
              citations: eachLike({
                id: like('cite-0'),
                snippetId: like('snip_abc123'),
                text: string('150 young participants completed the program'),
                relevanceScore: decimal(0.95),
              }),
              wordCount: integer(52),
              characterCount: integer(378),
            }),
            lineage: {
              modelName: string('gpt-4-turbo'),
              promptVersion: string('v2.1.0'),
              timestamp: iso8601DateTimeWithMillis(),
              tokensUsed: integer(1500),
              tokensInput: integer(800),
              tokensOutput: integer(700),
              estimatedCostUsd: like('0.0195'),
            },
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/gen-reports/generate`,
        {
          companyId,
          period: { start: '2024-01-01', end: '2024-12-31' },
          locale: 'en',
          sections: ['impact-summary', 'sroi-narrative'],
          deterministic: false,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.reportId).toBeDefined();
      expect(response.data.sections).toBeInstanceOf(Array);
      expect(response.data.sections.length).toBeGreaterThan(0);
      expect(response.data.sections[0].citations).toBeInstanceOf(Array);
      expect(response.data.lineage).toBeDefined();
      expect(response.data.lineage.tokensUsed).toBeGreaterThan(0);

      await provider.verify();
    });

    it('should return warnings when insufficient evidence found', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440001';

      await provider.addInteraction({
        state: 'company has insufficient outcome data',
        uponReceiving: 'a request to generate report with limited data',
        withRequest: {
          method: 'POST',
          path: '/v1/gen-reports/generate',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            companyId,
            period: { start: '2024-01-01', end: '2024-12-31' },
            sections: ['impact-summary'],
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            reportId: like('rpt_limited'),
            sections: eachLike({
              type: string('impact-summary'),
              content: string('Limited data available...'),
              citations: [],
              wordCount: integer(20),
              characterCount: integer(150),
            }),
            lineage: like({
              modelName: 'gpt-4-turbo',
              promptVersion: 'v2.1.0',
              timestamp: '2024-11-14T10:30:00.000Z',
              tokensUsed: 500,
              tokensInput: 300,
              tokensOutput: 200,
              estimatedCostUsd: '0.0065',
            }),
            warnings: eachLike(
              'Insufficient evidence found for the period. Report quality may be limited.'
            ),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/gen-reports/generate`,
        {
          companyId,
          period: { start: '2024-01-01', end: '2024-12-31' },
          sections: ['impact-summary'],
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.warnings).toBeDefined();
      expect(response.data.warnings.length).toBeGreaterThan(0);

      await provider.verify();
    });

    it('should return 400 for invalid request parameters', async () => {
      await provider.addInteraction({
        state: 'any state',
        uponReceiving: 'a request with invalid companyId',
        withRequest: {
          method: 'POST',
          path: '/v1/gen-reports/generate',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            companyId: 'invalid-uuid',
            period: { start: '2024-01-01', end: '2024-12-31' },
            sections: ['impact-summary'],
          },
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'Validation error',
            details: like([
              {
                field: 'companyId',
                message: 'Invalid UUID format',
              },
            ]),
          },
        },
      });

      try {
        await axios.post(
          `${provider.mockService.baseUrl}/v1/gen-reports/generate`,
          {
            companyId: 'invalid-uuid',
            period: { start: '2024-01-01', end: '2024-12-31' },
            sections: ['impact-summary'],
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Validation error');
      }

      await provider.verify();
    });
  });

  describe('GET /v1/gen-reports/cost-summary', () => {
    it('should return cost summary with model breakdown', async () => {
      await provider.addInteraction({
        state: 'reports have been generated',
        uponReceiving: 'a request for cost summary',
        withRequest: {
          method: 'GET',
          path: '/v1/gen-reports/cost-summary',
          headers: {
            'Accept': 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            totalCostUsd: like('45.67'),
            requestsCount: integer(234),
            totalTokens: integer(567890),
            avgCostPerRequest: like('0.195'),
            byModel: eachLike({
              modelName: string('gpt-4-turbo'),
              requestsCount: integer(200),
              totalCostUsd: like('40.00'),
              totalTokens: integer(500000),
            }),
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/gen-reports/cost-summary`,
        { headers: { Accept: 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.totalCostUsd).toBeDefined();
      expect(response.data.requestsCount).toBeGreaterThan(0);
      expect(response.data.byModel).toBeInstanceOf(Array);

      await provider.verify();
    });
  });
});
