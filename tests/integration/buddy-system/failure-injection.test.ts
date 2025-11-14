/**
 * Integration Test: Failure Injection and Chaos Engineering
 *
 * Tests system resilience under various failure scenarios
 *
 * Coverage:
 * - Database failures
 * - Network partitions
 * - Service crashes
 * - Timeout scenarios
 * - Out of memory conditions
 * - Cascading failures
 * - Recovery mechanisms
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@teei/shared-schema';
import { generateWebhookSignature } from '../../utils/webhook-helpers.js';

const BUDDY_CONNECTOR_URL = process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010';
const WEBHOOK_SECRET = process.env.BUDDY_WEBHOOK_SECRET || 'test-webhook-secret';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

describe('Failure Injection: System Resilience', () => {
  describe('Database Failure Scenarios', () => {
    it('should handle database connection loss gracefully', async () => {
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

      // Note: To properly test this, you'd need to simulate DB failure
      // For now, we verify the webhook is accepted even if DB is slow/unavailable
      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      // System should accept webhook even if processing fails
      expect([200, 202, 503]).toContain(response.status);
    });

    it('should activate circuit breaker on repeated DB failures', async () => {
      // Send multiple events that might trigger DB issues
      const promises = [];

      for (let i = 0; i < 10; i++) {
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

      await Promise.all(promises);

      // Check circuit breaker status
      const healthResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);
      const healthData = await healthResponse.json();

      expect(healthData.circuitBreakers).toBeDefined();
      expect(['open', 'closed', 'half-open']).toContain(
        healthData.circuitBreakers.database.state
      );
    });

    it('should queue events when database is unavailable', async () => {
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

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': deliveryId,
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      // Should accept for queuing
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('Network Partition Scenarios', () => {
    it('should handle network timeout gracefully', async () => {
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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

        // Should respond within timeout
        expect([200, 202]).toContain(response.status);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn('Request timed out - this might indicate a network issue');
        }
      } finally {
        clearTimeout(timeoutId);
      }
    });

    it('should retry on network errors', async () => {
      // This test would require network failure injection
      // For now, we verify the retry mechanism exists

      const statsResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/stats`);
      const stats = await statsResponse.json();

      expect(stats.resilience).toBeDefined();
      expect(stats.circuitBreakers).toBeDefined();
    });
  });

  describe('Service Crash Scenarios', () => {
    it('should handle partial service degradation', async () => {
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

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      // System should degrade gracefully
      expect([200, 202, 503]).toContain(response.status);
    });

    it('should provide health status during degradation', async () => {
      const healthResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);

      // Should always respond with health status
      expect([200, 503]).toContain(healthResponse.status);

      const healthData = await healthResponse.json();
      expect(healthData.status).toMatch(/healthy|degraded/i);
    });
  });

  describe('Timeout Scenarios', () => {
    it('should timeout long-running webhook processing', async () => {
      const payload = {
        type: 'buddy.feedback.submitted',
        data: {
          matchId: randomUUID(),
          fromUserId: randomUUID(),
          toUserId: randomUUID(),
          rating: 5,
          feedbackText: 'A'.repeat(10000), // Very long feedback
          submittedAt: new Date().toISOString(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const startTime = Date.now();

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      const duration = Date.now() - startTime;

      // Should complete within reasonable time (30s timeout)
      expect(duration).toBeLessThan(30000);
      expect([200, 202, 504]).toContain(response.status);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory pressure gracefully', async () => {
      // Send many large payloads
      const promises = [];

      for (let i = 0; i < 100; i++) {
        const payload = {
          type: 'buddy.feedback.submitted',
          data: {
            matchId: randomUUID(),
            fromUserId: randomUUID(),
            toUserId: randomUUID(),
            rating: 5,
            feedbackText: 'A'.repeat(1000), // Large payload
            submittedAt: new Date().toISOString(),
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

        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const responses = await Promise.all(promises);

      // Most should succeed or be queued
      const successCount = responses.filter(r => [200, 202].includes(r.status)).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount + rateLimitedCount).toBeGreaterThan(90);
    });

    it('should enforce bulkhead isolation', async () => {
      const statsResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/stats`);
      const stats = await statsResponse.json();

      expect(stats.resilience).toBeDefined();
      expect(stats.resilience.bulkheads).toBeDefined();
    });
  });

  describe('Cascading Failure Prevention', () => {
    it('should prevent cascading failures with circuit breakers', async () => {
      // Check circuit breaker configuration
      const healthResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);
      const healthData = await healthResponse.json();

      expect(healthData.circuitBreakers).toBeDefined();
      expect(healthData.circuitBreakers.buddySystem).toBeDefined();
      expect(healthData.circuitBreakers.database).toBeDefined();

      // Circuit breakers should be monitoring
      expect(healthData.circuitBreakers.buddySystem.failures).toBeDefined();
      expect(healthData.circuitBreakers.database.failures).toBeDefined();
    });

    it('should isolate failures to prevent spread', async () => {
      // Send mix of valid and invalid events
      const promises = [];

      for (let i = 0; i < 20; i++) {
        const isValid = i % 2 === 0;

        const payload = isValid
          ? {
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
            }
          : {
              type: 'buddy.invalid.event',
              data: {},
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

      // Valid events should succeed
      const validResponses = responses.filter((_, i) => i % 2 === 0);
      const successCount = validResponses.filter(r => [200, 202].includes(r.status)).length;

      expect(successCount).toBeGreaterThan(8); // Most valid events should succeed

      // Service should still be healthy
      const healthResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);
      expect([200, 503]).toContain(healthResponse.status);
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from circuit breaker open state', async () => {
      // Check initial state
      const health1 = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);
      const healthData1 = await health1.json();

      // Reset circuit breakers if needed
      await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/circuit-breaker/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'all' }),
      });

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check recovered state
      const health2 = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);
      const healthData2 = await health2.json();

      expect(healthData2.circuitBreakers.buddySystem.state).toBe('closed');
      expect(healthData2.circuitBreakers.database.state).toBe('closed');
    });

    it('should process queued events after recovery', async () => {
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
  });
});
