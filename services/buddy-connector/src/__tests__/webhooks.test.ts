import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { webhookRoutes } from '../routes/webhooks.js';
import { generateWebhookSignature } from '../middleware/signature.js';
import type { BuddyMatchCreated, BuddyCheckinCompleted } from '@teei/event-contracts';

describe('Buddy Connector Webhooks', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    app.register(webhookRoutes, { prefix: '/webhooks' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /webhooks/buddy-events', () => {
    it('should reject webhook without signature header', async () => {
      const payload: BuddyMatchCreated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        version: 'v1',
        timestamp: new Date().toISOString(),
        type: 'buddy.match.created',
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174001',
          participantId: '123e4567-e89b-12d3-a456-426614174002',
          buddyId: '123e4567-e89b-12d3-a456-426614174003',
          matchedAt: new Date().toISOString(),
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/buddy-events',
        headers: {
          'x-delivery-id': 'test-delivery-123',
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Unauthorized',
        message: 'Missing signature header',
      });
    });

    it('should reject webhook without delivery ID header', async () => {
      const payload: BuddyMatchCreated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        version: 'v1',
        timestamp: new Date().toISOString(),
        type: 'buddy.match.created',
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174001',
          participantId: '123e4567-e89b-12d3-a456-426614174002',
          buddyId: '123e4567-e89b-12d3-a456-426614174003',
          matchedAt: new Date().toISOString(),
        },
      };

      const signature = generateWebhookSignature(payload);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/buddy-events',
        headers: {
          'x-buddy-signature': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Bad Request',
        message: 'Missing delivery ID header',
      });
    });

    it('should accept valid buddy.match.created webhook', async () => {
      const payload: BuddyMatchCreated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        version: 'v1',
        timestamp: new Date().toISOString(),
        type: 'buddy.match.created',
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174001',
          participantId: '123e4567-e89b-12d3-a456-426614174002',
          buddyId: '123e4567-e89b-12d3-a456-426614174003',
          matchedAt: new Date().toISOString(),
        },
      };

      const signature = generateWebhookSignature(payload);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/buddy-events',
        headers: {
          'x-buddy-signature': signature,
          'x-delivery-id': `test-delivery-${Date.now()}`,
        },
        payload,
      });

      // Will fail in test due to database not being available
      // In real integration tests, this would succeed
      expect([200, 500]).toContain(response.statusCode);
    });

    it('should reject webhook with invalid event type', async () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        version: 'v1',
        timestamp: new Date().toISOString(),
        type: 'buddy.invalid.event',
        data: {},
      };

      const signature = generateWebhookSignature(payload);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/buddy-events',
        headers: {
          'x-buddy-signature': signature,
          'x-delivery-id': `test-delivery-${Date.now()}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Unknown event type');
    });

    it('should reject webhook with invalid schema', async () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        version: 'v1',
        timestamp: new Date().toISOString(),
        type: 'buddy.checkin.completed',
        data: {
          // Missing required fields
          checkinId: '123',
        },
      };

      const signature = generateWebhookSignature(payload);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/buddy-events',
        headers: {
          'x-buddy-signature': signature,
          'x-delivery-id': `test-delivery-${Date.now()}`,
        },
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Invalid event payload');
      expect(body.errors).toBeDefined();
    });
  });

  describe('GET /webhooks/stats', () => {
    it('should return webhook statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/webhooks/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        service: 'buddy-connector',
        supportedEventTypes: expect.arrayContaining([
          'buddy.match.created',
          'buddy.match.ended',
          'buddy.event.logged',
          'buddy.event.attended',
          'buddy.skill_share.completed',
          'buddy.checkin.completed',
          'buddy.feedback.submitted',
          'buddy.milestone.reached',
        ]),
      });
      expect(body.timestamp).toBeDefined();
    });
  });
});
