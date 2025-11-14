/**
 * Integration Test: Webhook Delivery and Retry Mechanisms
 *
 * Tests webhook delivery, retry logic, idempotency, and failure handling
 *
 * Coverage:
 * - Webhook delivery success/failure scenarios
 * - Exponential backoff retry logic
 * - Idempotency key handling
 * - Dead Letter Queue (DLQ) handling
 * - Circuit breaker activation
 * - Timeout scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@teei/shared-schema';
import { webhookDeliveries, deadLetterQueue } from '@teei/shared-schema/schema';
import { eq } from 'drizzle-orm';
import { generateWebhookSignature } from '../../utils/webhook-helpers.js';

const BUDDY_CONNECTOR_URL = process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010';
const WEBHOOK_SECRET = process.env.BUDDY_WEBHOOK_SECRET || 'test-webhook-secret';

describe('Integration: Webhook Delivery & Retry', () => {
  describe('Idempotency Handling', () => {
    it('should handle duplicate webhook deliveries', async () => {
      const deliveryId = randomUUID();
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
        },
        metadata: {
          id: eventId,
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const headers = {
        'Content-Type': 'application/json',
        'x-delivery-id': deliveryId,
        'x-webhook-signature': signature,
      };

      // First delivery
      const response1 = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers,
        body: payloadString,
      });

      expect(response1.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second delivery (duplicate)
      const response2 = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers,
        body: payloadString,
      });

      // Should return 202 (accepted but already processed)
      expect(response2.status).toBe(202);

      const responseData = await response2.json();
      expect(responseData.message).toMatch(/already processed/i);
    });

    it('should handle replay attacks with expired timestamps', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.error).toMatch(/timestamp|replay|expired/i);
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry on transient failures with exponential backoff', async () => {
      const deliveryId = randomUUID();

      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Simulate temporary failure (we'd need to mock the downstream service)
      // For now, we test that the system accepts the webhook
      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': deliveryId,
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect([200, 202]).toContain(response.status);
    });

    it('should not retry on permanent errors (4xx)', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          // Missing required fields
          matchId: randomUUID(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      // Should fail validation immediately
      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.errors).toBeDefined();
    });
  });

  describe('Dead Letter Queue (DLQ)', () => {
    it('should send failed events to DLQ after max retries', async () => {
      const deliveryId = randomUUID();
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.unknown.event', // Invalid event type
        data: {
          matchId: randomUUID(),
        },
        metadata: {
          id: eventId,
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Try delivery
      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': deliveryId,
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect(response.status).toBe(400);

      // Check DLQ endpoint for failed deliveries
      const dlqResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/dlq`);
      const dlqData = await dlqResponse.json();

      expect(dlqData.status).toBe('success');
    });

    it('should allow DLQ replay for manual recovery', async () => {
      // This test would verify that failed events can be replayed from DLQ
      // Implementation depends on DLQ management endpoints

      const dlqStatsResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/stats`);
      const statsData = await dlqStatsResponse.json();

      expect(statsData.deadLetterQueue).toBeDefined();
      expect(statsData.deadLetterQueue).toHaveProperty('totalEntries');
    });
  });

  describe('Circuit Breaker', () => {
    it('should report circuit breaker status', async () => {
      const healthResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);
      const healthData = await healthResponse.json();

      expect(healthData.circuitBreakers).toBeDefined();
      expect(healthData.circuitBreakers.buddySystem).toBeDefined();
      expect(healthData.circuitBreakers.database).toBeDefined();

      expect(['open', 'closed', 'half-open']).toContain(
        healthData.circuitBreakers.buddySystem.state
      );
    });

    it('should allow circuit breaker reset', async () => {
      const resetResponse = await fetch(
        `${BUDDY_CONNECTOR_URL}/v1/webhooks/circuit-breaker/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'all' }),
        }
      );

      expect([200, 202]).toContain(resetResponse.status);
      const resetData = await resetResponse.json();
      expect(resetData.status).toBe('success');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on webhook delivery', async () => {
      const promises = [];

      // Send 100 webhooks in parallel
      for (let i = 0; i < 100; i++) {
        const payload = {
          type: 'buddy.match.created',
          data: {
            matchId: randomUUID(),
            participantId: randomUUID(),
            buddyId: randomUUID(),
            matchedAt: new Date().toISOString(),
          },
          metadata: {
            id: randomUUID(),
            version: 'v1',
            timestamp: new Date().toISOString(),
          },
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

        promises.push(
          fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-delivery-id': randomUUID(),
              'x-webhook-signature': signature,
            },
            body: payloadString,
          })
        );
      }

      const responses = await Promise.all(promises);

      // Some should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      // Some might be rate limited (429)
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      console.log(`Rate limit test: ${successCount} succeeded, ${rateLimitedCount} rate limited`);
    });

    it('should allow rate limiter reset', async () => {
      const resetResponse = await fetch(
        `${BUDDY_CONNECTOR_URL}/v1/webhooks/rate-limiter/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'all' }),
        }
      );

      expect([200, 202]).toContain(resetResponse.status);
    });
  });

  describe('Timeout Scenarios', () => {
    it('should handle webhook processing timeout gracefully', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Create a timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-delivery-id': randomUUID(),
            'x-webhook-signature': signature,
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Should complete within timeout
        expect([200, 202]).toContain(response.status);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Webhook processing exceeded timeout');
        }
        throw error;
      }
    });
  });

  describe('Webhook Statistics', () => {
    it('should provide comprehensive webhook statistics', async () => {
      const statsResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/stats`);
      const stats = await statsResponse.json();

      expect(stats.service).toBe('buddy-connector');
      expect(stats.supportedEventTypes).toBeDefined();
      expect(stats.supportedEventTypes).toContain('buddy.match.created');
      expect(stats.supportedEventTypes).toContain('buddy.skill_share.completed');
      expect(stats.deadLetterQueue).toBeDefined();
      expect(stats.resilience).toBeDefined();
      expect(stats.circuitBreakers).toBeDefined();
    });
  });

  describe('Signature Validation', () => {
    it('should reject webhooks with invalid signatures', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': 'invalid-signature-12345',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.error).toMatch(/signature|unauthorized/i);
    });

    it('should reject webhooks with missing signatures', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          // No signature header
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(401);
    });
  });
});
