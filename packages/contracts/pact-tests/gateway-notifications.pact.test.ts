/**
 * Contract test: API Gateway → Notifications Service
 *
 * Verifies contract for notification endpoints (send, schedule, history, quotas)
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/Pact Author
 */

import { Pact, Matchers } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import axios from 'axios';
import path from 'path';

const { like, uuid, integer, string, eachLike, iso8601DateTimeWithMillis } = Matchers;

describe('API Gateway → Notifications Service Contract', () => {
  const provider = new Pact({
    consumer: 'api-gateway',
    provider: 'notifications-service',
    port: 8087,
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

  describe('POST /v1/notifications/send', () => {
    it('should queue notification for sending', async () => {
      await provider.addInteraction({
        state: 'notification quota available',
        uponReceiving: 'a request to send notification',
        withRequest: {
          method: 'POST',
          path: '/v1/notifications/send',
          headers: { 'Content-Type': 'application/json' },
          body: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            type: 'email',
            templateId: 'report-ready',
            recipient: 'user@example.com',
            subject: 'Your Report is Ready',
            payload: {
              userName: 'John Doe',
              reportUrl: 'https://app.teei.io/reports/rpt_123',
            },
          },
        },
        willRespondWith: {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: like(true),
            notificationId: like('ntf_7f8a9b0c1d2e3f4a'),
            status: string('queued'),
            message: string('Notification queued for sending'),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/notifications/send`,
        {
          companyId: '550e8400-e29b-41d4-a716-446655440000',
          type: 'email',
          templateId: 'report-ready',
          recipient: 'user@example.com',
          subject: 'Your Report is Ready',
          payload: {
            userName: 'John Doe',
            reportUrl: 'https://app.teei.io/reports/rpt_123',
          },
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(202);
      expect(response.data.success).toBe(true);
      expect(response.data.notificationId).toBeDefined();
      expect(response.data.status).toBe('queued');

      await provider.verify();
    });
  });

  describe('POST /v1/notifications/schedule', () => {
    it('should schedule notification for future delivery', async () => {
      await provider.addInteraction({
        state: 'notification quota available',
        uponReceiving: 'a request to schedule notification',
        withRequest: {
          method: 'POST',
          path: '/v1/notifications/schedule',
          headers: { 'Content-Type': 'application/json' },
          body: {
            type: 'email',
            templateId: 'weekly-digest',
            recipient: 'admin@example.com',
            subject: 'Weekly Digest',
            payload: {},
            scheduledAt: '2024-11-18T09:00:00Z',
          },
        },
        willRespondWith: {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: like(true),
            notificationId: like('ntf_scheduled'),
            scheduledAt: string('2024-11-18T09:00:00Z'),
            message: string('Notification scheduled successfully'),
          },
        },
      });

      const response = await axios.post(
        `${provider.mockService.baseUrl}/v1/notifications/schedule`,
        {
          type: 'email',
          templateId: 'weekly-digest',
          recipient: 'admin@example.com',
          subject: 'Weekly Digest',
          payload: {},
          scheduledAt: '2024-11-18T09:00:00Z',
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.scheduledAt).toBe('2024-11-18T09:00:00Z');

      await provider.verify();
    });
  });

  describe('GET /v1/notifications/history', () => {
    it('should return notification history', async () => {
      await provider.addInteraction({
        state: 'notifications exist',
        uponReceiving: 'a request for notification history',
        withRequest: {
          method: 'GET',
          path: '/v1/notifications/history',
          query: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            type: 'email',
            limit: '50',
            offset: '0',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: like(true),
            notifications: eachLike({
              id: like('ntf_123'),
              type: string('email'),
              templateId: string('report-ready'),
              recipient: string('user@example.com'),
              status: string('sent'),
              scheduledAt: null,
              sentAt: iso8601DateTimeWithMillis(),
              failureReason: null,
              retryCount: integer(0),
              createdAt: iso8601DateTimeWithMillis(),
            }),
            pagination: {
              limit: integer(50),
              offset: integer(0),
              total: integer(234),
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/notifications/history`,
        {
          params: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            type: 'email',
            limit: 50,
            offset: 0,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.notifications).toBeInstanceOf(Array);

      await provider.verify();
    });
  });

  describe('GET /v1/notifications/quota', () => {
    it('should return quota status', async () => {
      await provider.addInteraction({
        state: 'company has quota limits',
        uponReceiving: 'a request for quota status',
        withRequest: {
          method: 'GET',
          path: '/v1/notifications/quota',
          query: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: like(true),
            companyId: '550e8400-e29b-41d4-a716-446655440000',
            quotas: {
              email: {
                limit: integer(10000),
                used: integer(2340),
                remaining: integer(7660),
                resetAt: iso8601DateTimeWithMillis(),
              },
              sms: {
                limit: integer(1000),
                used: integer(45),
                remaining: integer(955),
                resetAt: iso8601DateTimeWithMillis(),
              },
              push: {
                limit: integer(50000),
                used: integer(8920),
                remaining: integer(41080),
                resetAt: iso8601DateTimeWithMillis(),
              },
            },
          },
        },
      });

      const response = await axios.get(
        `${provider.mockService.baseUrl}/v1/notifications/quota`,
        {
          params: {
            companyId: '550e8400-e29b-41d4-a716-446655440000',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.quotas).toBeDefined();
      expect(response.data.quotas.email.limit).toBeGreaterThan(0);

      await provider.verify();
    });
  });
});
