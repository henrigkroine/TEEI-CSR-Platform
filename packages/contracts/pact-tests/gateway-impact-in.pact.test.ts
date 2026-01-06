/**
 * Contract test: API Gateway → Impact-In Service
 *
 * Verifies contract for delivery tracking and replay endpoints
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/Pact Author
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

const { like, uuid, integer, string, eachLike, iso8601DateTimeWithMillis } = Matchers;

describe('API Gateway → Impact-In Service Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'impact-in-service',
    port: 8086,
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

  describe('GET /v1/impact-in/deliveries', () => {
    it('should list deliveries with pagination', async () => {
      await provider.addInteraction({
        state: 'deliveries exist',
        uponReceiving: 'a request to list deliveries',
        withRequest: {
          method: 'GET',
          path: '/v1/impact-in/deliveries',
          query: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            provider: 'benevity',
            status: 'success',
            page: '1',
            limit: '20',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            data: eachLike({
              id: uuid(),
              deliveryId: like('dlv_7f8a9b0c1d2e3f4a'),
              companyId: '550e8400-e29b-41d4-a716-446655440000',
              provider: string('benevity'),
              status: string('success'),
              attemptCount: integer(1),
              payload: like({}),
              lastError: null,
              providerResponse: like({}),
              deliveredAt: iso8601DateTimeWithMillis(),
              createdAt: iso8601DateTimeWithMillis(),
              updatedAt: iso8601DateTimeWithMillis(),
            }),
            pagination: {
              page: integer(1),
              limit: integer(20),
              total: integer(145),
              totalPages: integer(8),
              hasNext: like(true),
              hasPrev: like(false),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/impact-in/deliveries`,
        {
          params: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            provider: 'benevity',
            status: 'success',
            page: 1,
            limit: 20,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toBeInstanceOf(Array);
      expect(response.data.pagination).toBeDefined();

      await provider.verify();
    });
  });

  describe('GET /v1/impact-in/deliveries/:id', () => {
    it('should return delivery details', async () => {
      const deliveryId = '650e8400-e29b-41d4-a716-446655440000';

      await provider.addInteraction({
        state: 'delivery exists',
        uponReceiving: 'a request for delivery details',
        withRequest: {
          method: 'GET',
          path: `/v1/impact-in/deliveries/${deliveryId}`,
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            data: {
              id: deliveryId,
              deliveryId: like('dlv_abc123'),
              companyId: uuid(),
              provider: string('benevity'),
              status: string('success'),
              attemptCount: integer(1),
              payload: like({}),
              lastError: null,
              providerResponse: like({}),
              deliveredAt: iso8601DateTimeWithMillis(),
              createdAt: iso8601DateTimeWithMillis(),
              updatedAt: iso8601DateTimeWithMillis(),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/impact-in/deliveries/${deliveryId}`
      );

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(deliveryId);

      await provider.verify();
    });
  });

  describe('POST /v1/impact-in/deliveries/:id/replay', () => {
    it('should replay failed delivery successfully', async () => {
      const deliveryId = '650e8400-e29b-41d4-a716-446655440001';

      await provider.addInteraction({
        state: 'delivery failed and can be replayed',
        uponReceiving: 'a request to replay delivery',
        withRequest: {
          method: 'POST',
          path: `/v1/impact-in/deliveries/${deliveryId}/replay`,
          headers: { 'Content-Type': 'application/json' },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: like(true),
            message: string('Delivery replayed successfully'),
            newStatus: string('success'),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/impact-in/deliveries/${deliveryId}/replay`,
        {},
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.newStatus).toBe('success');

      await provider.verify();
    });
  });

  describe('GET /v1/impact-in/stats', () => {
    it('should return delivery statistics', async () => {
      await provider.addInteraction({
        state: 'deliveries exist',
        uponReceiving: 'a request for delivery stats',
        withRequest: {
          method: 'GET',
          path: '/v1/impact-in/stats',
          query: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            data: {
              overall: {
                total: integer(1000),
                successful: integer(950),
                failed: integer(30),
                pending: integer(10),
                retrying: integer(10),
              },
              byProvider: eachLike({
                provider: string('benevity'),
                status: string('success'),
                count: integer(320),
                avgAttempts: like(1.2),
              }),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/impact-in/stats`,
        {
          params: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.overall).toBeDefined();
      expect(response.data.data.byProvider).toBeInstanceOf(Array);

      await provider.verify();
    });
  });
});
