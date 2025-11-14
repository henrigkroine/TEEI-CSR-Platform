/**
 * Integration Test: Data Validation and Schema Compliance
 *
 * Tests data integrity, schema validation, and referential integrity
 *
 * Coverage:
 * - Event schema compliance
 * - Data type validation
 * - Referential integrity
 * - Eventual consistency verification
 * - Data sanitization
 * - Invalid payload rejection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@teei/shared-schema';
import { buddySystemEvents } from '@teei/shared-schema/schema';
import { eq } from 'drizzle-orm';
import { generateWebhookSignature } from '../../utils/webhook-helpers.js';

const BUDDY_CONNECTOR_URL = process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010';
const WEBHOOK_SECRET = process.env.BUDDY_WEBHOOK_SECRET || 'test-webhook-secret';

describe('Integration: Data Validation', () => {
  describe('Event Schema Compliance', () => {
    it('should accept valid match.created event', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
          matchingCriteria: {
            language: 'en',
            interests: ['technology'],
            location: 'Oslo',
          },
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

      expect(response.status).toBe(200);
    });

    it('should reject event with missing required fields', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          // Missing participantId and buddyId
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

      expect(response.status).toBe(400);

      const errorData = await response.json();
      expect(errorData.errors).toBeDefined();
      expect(errorData.errors.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid data types', async () => {
      const payload = {
        type: 'buddy.skill_share.completed',
        data: {
          sessionId: randomUUID(),
          matchId: randomUUID(),
          teacherId: randomUUID(),
          learnerId: randomUUID(),
          skill: 'TypeScript',
          duration: 'invalid-number', // Should be number
          completedAt: new Date().toISOString(),
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

      expect(response.status).toBe(400);
    });

    it('should reject event with invalid timestamp format', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: randomUUID(),
          buddyId: randomUUID(),
          matchedAt: 'not-a-valid-timestamp',
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: 'also-invalid',
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

      expect(response.status).toBe(400);
    });
  });

  describe('Data Type Validation', () => {
    it('should validate UUID format', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: 'not-a-uuid',
          participantId: 'also-not-a-uuid',
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

      expect(response.status).toBe(400);
    });

    it('should validate enum values', async () => {
      const payload = {
        type: 'buddy.checkin.completed',
        data: {
          matchId: randomUUID(),
          userId: randomUUID(),
          mood: 'invalid-mood', // Should be: great, good, okay, struggling, difficult
          checkinDate: new Date().toISOString(),
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

      expect(response.status).toBe(400);
    });

    it('should validate numeric ranges', async () => {
      const payload = {
        type: 'buddy.feedback.submitted',
        data: {
          matchId: randomUUID(),
          fromUserId: randomUUID(),
          toUserId: randomUUID(),
          rating: 10, // Should be 0-5
          feedbackText: 'Great experience',
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

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Referential Integrity', () => {
    it('should store events with referential links', async () => {
      const matchId = randomUUID();
      const participantId = randomUUID();
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId,
          participantId,
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

      await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify referential links
      const events = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.eventId, eventId));

      expect(events).toHaveLength(1);
      expect(events[0].userId).toBe(participantId);
      expect((events[0].payload as any).data.matchId).toBe(matchId);
    });

    it('should maintain consistency across related events', async () => {
      const matchId = randomUUID();
      const userId = randomUUID();
      const correlationId = randomUUID();

      const events = [
        {
          type: 'buddy.match.created',
          data: {
            matchId,
            participantId: userId,
            buddyId: randomUUID(),
            matchedAt: new Date().toISOString(),
          },
        },
        {
          type: 'buddy.checkin.completed',
          data: {
            matchId,
            userId,
            mood: 'great',
            checkinDate: new Date().toISOString(),
          },
        },
      ];

      for (const event of events) {
        const payload = {
          ...event,
          metadata: {
            id: randomUUID(),
            version: 'v1',
            timestamp: new Date().toISOString(),
            correlationId,
          },
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

        await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-delivery-id': randomUUID(),
            'x-webhook-signature': signature,
          },
          body: payloadString,
        });

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify all events linked by correlation ID
      const storedEvents = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.correlationId, correlationId));

      expect(storedEvents.length).toBe(2);
      storedEvents.forEach(e => {
        expect((e.payload as any).data.matchId).toBe(matchId);
      });
    });
  });

  describe('Eventual Consistency Verification', () => {
    it('should eventually process all events', async () => {
      const userId = randomUUID();
      const eventIds: string[] = [];

      // Send multiple events
      for (let i = 0; i < 5; i++) {
        const eventId = randomUUID();
        eventIds.push(eventId);

        const payload = {
          type: 'buddy.checkin.completed',
          data: {
            matchId: randomUUID(),
            userId,
            mood: 'great',
            checkinDate: new Date().toISOString(),
          },
          metadata: {
            id: eventId,
            version: 'v1',
            timestamp: new Date().toISOString(),
          },
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

        await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-delivery-id': randomUUID(),
            'x-webhook-signature': signature,
          },
          body: payloadString,
        });

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Wait for eventual consistency
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify all events processed
      for (const eventId of eventIds) {
        const events = await db
          .select()
          .from(buddySystemEvents)
          .where(eq(buddySystemEvents.eventId, eventId));

        expect(events).toHaveLength(1);
        expect(events[0].processedAt).not.toBeNull();
      }
    });

    it('should maintain event ordering during high load', async () => {
      const userId = randomUUID();
      const matchId = randomUUID();
      const correlationId = randomUUID();
      const timestamps: string[] = [];

      // Send events with specific ordering
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(Date.now() + i * 1000).toISOString();
        timestamps.push(timestamp);

        const payload = {
          type: 'buddy.checkin.completed',
          data: {
            matchId,
            userId,
            mood: 'great',
            checkinDate: timestamp,
          },
          metadata: {
            id: randomUUID(),
            version: 'v1',
            timestamp,
            correlationId,
          },
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

        await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-delivery-id': randomUUID(),
            'x-webhook-signature': signature,
          },
          body: payloadString,
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify ordering preserved
      const events = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.correlationId, correlationId))
        .orderBy(buddySystemEvents.timestamp);

      expect(events.length).toBe(10);

      for (let i = 0; i < events.length; i++) {
        expect(events[i].timestamp.toISOString()).toBe(timestamps[i]);
      }
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize HTML in text fields', async () => {
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.feedback.submitted',
        data: {
          matchId: randomUUID(),
          fromUserId: randomUUID(),
          toUserId: randomUUID(),
          rating: 5,
          feedbackText: '<script>alert("xss")</script>Great experience!',
          submittedAt: new Date().toISOString(),
        },
        metadata: {
          id: eventId,
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

      expect(response.status).toBe(200);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify script tags removed
      const events = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.eventId, eventId));

      expect(events).toHaveLength(1);
      const feedbackText = (events[0].payload as any).data.feedbackText;
      expect(feedbackText).not.toContain('<script>');
    });

    it('should handle SQL injection attempts', async () => {
      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: "'; DROP TABLE buddy_matches; --",
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

      // Should reject due to UUID validation
      expect(response.status).toBe(400);
    });
  });

  describe('Invalid Payload Rejection', () => {
    it('should reject malformed JSON', async () => {
      const signature = generateWebhookSignature('invalid-json{', WEBHOOK_SECRET);

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: 'invalid-json{',
      });

      expect(response.status).toBe(400);
    });

    it('should reject unknown event types', async () => {
      const payload = {
        type: 'buddy.unknown.type',
        data: {},
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

      expect(response.status).toBe(400);
    });

    it('should reject oversized payloads', async () => {
      const payload = {
        type: 'buddy.feedback.submitted',
        data: {
          matchId: randomUUID(),
          fromUserId: randomUUID(),
          toUserId: randomUUID(),
          rating: 5,
          feedbackText: 'A'.repeat(100000), // 100KB of text
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

      const response = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect([400, 413]).toContain(response.status);
    });
  });
});
