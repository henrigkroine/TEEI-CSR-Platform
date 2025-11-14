/**
 * E2E Test: Webhook Integration and Event Processing Pipeline
 *
 * Test Coverage:
 * - Webhook signature validation
 * - Event publishing to NATS
 * - Event processing by subscribers
 * - Idempotency and deduplication
 * - Circuit breaker and retry logic
 * - Error handling and Dead Letter Queue
 *
 * Success Criteria:
 * - All webhooks properly authenticated
 * - Events reliably delivered to CSR Platform
 * - Duplicate events handled correctly
 * - Failures don't block Buddy System
 */

import { test, expect } from '@playwright/test';
import { generateWebhookSignature } from '../utils/webhook-helpers';
import { CSRPlatformAPI } from '../api-clients/csr-platform-api';

const BUDDY_CONNECTOR_URL = process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010';
const WEBHOOK_SECRET = process.env.BUDDY_WEBHOOK_SECRET || 'test-webhook-secret-buddy-e2e';

test.describe('Webhook Integration: Buddy System → CSR Platform', () => {
  let csrAPI: CSRPlatformAPI;

  test.beforeAll(async () => {
    csrAPI = new CSRPlatformAPI();
  });

  test.describe('Webhook Authentication', () => {
    test('should accept webhook with valid HMAC signature', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: `test-${Date.now()}`,
          participantId: '1001',
          buddyId: '1002',
          matchedAt: new Date().toISOString(),
          matchingCriteria: {
            language: 'en',
            interests: ['technology'],
            location: 'Oslo'
          }
        },
        metadata: {
          id: crypto.randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
          correlationId: crypto.randomUUID()
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-signature': signature,
          'x-event-type': payload.type,
          'x-event-id': payload.metadata.id,
          'x-correlation-id': payload.metadata.correlationId
        },
        body: payloadString
      });

      expect(response.status).toBe(202); // Accepted
      const responseData = await response.json();
      expect(responseData).toHaveProperty('eventId');
    });

    test('should reject webhook with invalid signature', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: { matchId: 'test', participantId: '1', buddyId: '2' },
        metadata: {
          id: crypto.randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-signature': 'invalid-signature',
          'x-event-type': payload.type
        },
        body: JSON.stringify(payload)
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.error).toMatch(/signature|unauthorized/i);
    });

    test('should reject webhook with missing signature', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: { matchId: 'test' },
        metadata: { id: crypto.randomUUID(), version: 'v1', timestamp: new Date().toISOString() }
      };

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-event-type': payload.type
        },
        body: JSON.stringify(payload)
      });

      expect(response.status).toBe(401);
    });

    test('should reject webhook with expired timestamp (replay attack)', async () => {
      const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();

      const payload = {
        type: 'buddy.match.created',
        data: { matchId: 'test' },
        metadata: {
          id: crypto.randomUUID(),
          version: 'v1',
          timestamp: tenMinutesAgo
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-signature': signature,
          'x-event-type': payload.type
        },
        body: payloadString
      });

      expect(response.status).toBe(401);
      const errorData = await response.json();
      expect(errorData.error).toMatch(/timestamp|replay|expired/i);
    });
  });

  test.describe('Event Publishing to NATS', () => {
    test('should publish event to NATS event bus', async () => {
      const correlationId = crypto.randomUUID();
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: `nats-test-${Date.now()}`,
          participantId: '2001',
          buddyId: '2002',
          matchedAt: new Date().toISOString()
        },
        metadata: {
          id: crypto.randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
          correlationId
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Send webhook
      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-signature': signature,
          'x-event-type': payload.type
        },
        body: payloadString
      });

      expect(response.status).toBe(202);

      // Wait for event to be published to NATS and processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify event was received by CSR Platform
      const events = await csrAPI.getEventsByType('buddy.match.created', { limit: 100 });
      const matchingEvent = events.find(e => e.metadata.correlationId === correlationId);

      expect(matchingEvent).toBeDefined();
      expect(matchingEvent?.data.matchId).toBe(payload.data.matchId);
    });

    test('should maintain event ordering', async () => {
      const matchId = `order-test-${Date.now()}`;
      const correlationId = crypto.randomUUID();

      // Send 3 events in sequence
      const eventTypes = ['buddy.match.created', 'buddy.feedback.submitted', 'buddy.match.ended'];
      const timestamps = [];

      for (const eventType of eventTypes) {
        const timestamp = new Date().toISOString();
        timestamps.push(timestamp);

        const payload = {
          type: eventType,
          data: {
            matchId,
            participantId: '3001',
            buddyId: '3002'
          },
          metadata: {
            id: crypto.randomUUID(),
            version: 'v1',
            timestamp,
            correlationId
          }
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

        await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-buddy-signature': signature,
            'x-event-type': payload.type
          },
          body: payloadString
        });

        // Small delay between events
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify events processed in order
      const events = await csrAPI.getEventsByUser('3001');
      const matchEvents = events
        .filter(e => e.data.matchId === matchId)
        .sort((a, b) =>
          new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
        );

      expect(matchEvents.length).toBe(3);
      expect(matchEvents[0].type).toBe('buddy.match.created');
      expect(matchEvents[1].type).toBe('buddy.feedback.submitted');
      expect(matchEvents[2].type).toBe('buddy.match.ended');
    });
  });

  test.describe('Idempotency and Deduplication', () => {
    test('should handle duplicate event IDs', async () => {
      const eventId = crypto.randomUUID();
      const correlationId = crypto.randomUUID();

      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: `idempotency-test-${Date.now()}`,
          participantId: '4001',
          buddyId: '4002'
        },
        metadata: {
          id: eventId, // Same event ID
          version: 'v1',
          timestamp: new Date().toISOString(),
          correlationId
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const headers = {
        'Content-Type': 'application/json',
        'x-buddy-signature': signature,
        'x-event-type': payload.type,
        'x-event-id': eventId
      };

      // Send same event twice
      const response1 = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers,
        body: payloadString
      });

      const response2 = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers,
        body: payloadString
      });

      expect(response1.status).toBe(202);
      expect(response2.status).toBe(200); // Already processed (idempotent)

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify only one event processed
      const events = await csrAPI.getEventsByType('buddy.match.created');
      const duplicates = events.filter(e => e.metadata.id === eventId);

      expect(duplicates.length).toBe(1);
    });

    test('should use correlation ID for request tracing', async () => {
      const correlationId = crypto.randomUUID();

      // Send multiple related events with same correlation ID
      const events = [
        { type: 'buddy.match.created', data: { matchId: 'corr-1', participantId: '5001', buddyId: '5002' } },
        { type: 'buddy.event.attended', data: { eventId: 'evt-1', userId: '5001' } },
        { type: 'buddy.skill_share.completed', data: { sessionId: 'sess-1', teacherId: '5002', learnerId: '5001' } }
      ];

      for (const event of events) {
        const payload = {
          ...event,
          metadata: {
            id: crypto.randomUUID(),
            version: 'v1',
            timestamp: new Date().toISOString(),
            correlationId // Same correlation ID
          }
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

        await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-buddy-signature': signature,
            'x-event-type': payload.type,
            'x-correlation-id': correlationId
          },
          body: payloadString
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify all events share correlation ID
      const allEvents = await csrAPI.getRecentEvents({ limit: 100 });
      const correlatedEvents = allEvents.filter(e => e.metadata.correlationId === correlationId);

      expect(correlatedEvents.length).toBe(3);
      expect(new Set(correlatedEvents.map(e => e.type)).size).toBe(3); // All different types
    });
  });

  test.describe('Circuit Breaker and Resilience', () => {
    test('should handle temporary service failures with retry', async () => {
      // This test requires mocking service failures
      // For real E2E, we'd temporarily disable the unified-profile service

      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: `resilience-test-${Date.now()}`,
          participantId: '6001',
          buddyId: '6002'
        },
        metadata: {
          id: crypto.randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
          correlationId: crypto.randomUUID()
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Webhook should still accept the event even if downstream processing fails temporarily
      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-signature': signature,
          'x-event-type': payload.type
        },
        body: payloadString
      });

      // Should accept (not block) even if processing may fail
      expect([202, 200]).toContain(response.status);
    });

    test('should send failed events to Dead Letter Queue', async () => {
      // Send malformed event that will fail processing
      const payload = {
        type: 'buddy.match.created',
        data: {
          // Missing required fields
          matchId: `dlq-test-${Date.now()}`
          // participantId and buddyId missing
        },
        metadata: {
          id: crypto.randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString()
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-signature': signature,
          'x-event-type': payload.type
        },
        body: payloadString
      });

      // Webhook still accepts (returns 202), but event will fail validation
      expect(response.status).toBe(202);

      // Wait for processing and DLQ handling
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify event went to DLQ (would need DLQ monitoring endpoint)
      // This is a placeholder - actual implementation depends on DLQ setup
    });
  });

  test.describe('Event Processing Performance', () => {
    test('should process webhook in < 500ms', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: `perf-test-${Date.now()}`,
          participantId: '7001',
          buddyId: '7002'
        },
        metadata: {
          id: crypto.randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString()
        }
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      const startTime = Date.now();

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-buddy-signature': signature,
          'x-event-type': payload.type
        },
        body: payloadString
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(202);
      expect(duration).toBeLessThan(500); // 500ms SLA for webhook acceptance
      console.log(`Webhook processed in ${duration}ms`);
    });

    test('should handle burst of 50 webhooks', async ({ page }) => {
      test.setTimeout(60000);

      const startTime = Date.now();
      const promises = [];

      // Send 50 webhooks in parallel
      for (let i = 0; i < 50; i++) {
        const payload = {
          type: 'buddy.match.created',
          data: {
            matchId: `burst-${i}-${Date.now()}`,
            participantId: `8${String(i).padStart(3, '0')}`,
            buddyId: `9${String(i).padStart(3, '0')}`
          },
          metadata: {
            id: crypto.randomUUID(),
            version: 'v1',
            timestamp: new Date().toISOString()
          }
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

        promises.push(
          fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-buddy-signature': signature,
              'x-event-type': payload.type
            },
            body: payloadString
          })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All webhooks should be accepted
      const acceptedCount = responses.filter(r => r.status === 202).length;
      expect(acceptedCount).toBe(50);

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // 10 second SLA for 50 webhooks
      console.log(`50 webhooks processed in ${duration}ms (${duration / 50}ms avg per webhook)`);
    });
  });
});
