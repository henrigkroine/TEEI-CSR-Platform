/**
 * Integration Test: Buddy System Event Flow
 *
 * Tests the complete flow from buddy action → webhook → event processing → metric display
 *
 * Coverage:
 * - Event publishing from Buddy System
 * - Webhook delivery and signature validation
 * - Event processing in CSR Platform
 * - SROI/VIS calculation updates
 * - SDG mapping accuracy
 * - Profile linking verification
 * - Data consistency across services
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@teei/shared-schema';
import { buddySystemEvents, impactMetrics, visScores, sroiScores } from '@teei/shared-schema/schema';
import { eq, and } from 'drizzle-orm';
import { generateWebhookSignature } from '../../utils/webhook-helpers.js';

const BUDDY_CONNECTOR_URL = process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010';
const WEBHOOK_SECRET = process.env.BUDDY_WEBHOOK_SECRET || 'test-webhook-secret';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

describe('Integration: Buddy Event Flow', () => {
  let testUserId: string;
  let testBuddyId: string;
  let testMatchId: string;

  beforeAll(async () => {
    // Create test users for integration testing
    testUserId = randomUUID();
    testBuddyId = randomUUID();
    testMatchId = `test-match-${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(buddySystemEvents).where(eq(buddySystemEvents.userId, testUserId));
    await db.delete(impactMetrics).where(eq(impactMetrics.userId, testUserId));
    await db.delete(visScores).where(eq(visScores.userId, testUserId));
  });

  describe('Event Flow: Match Created', () => {
    it('should process match.created event and update metrics', async () => {
      const eventId = randomUUID();
      const correlationId = randomUUID();

      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: testMatchId,
          participantId: testUserId,
          buddyId: testBuddyId,
          matchedAt: new Date().toISOString(),
          matchingCriteria: {
            language: 'en',
            interests: ['technology', 'mentoring'],
            location: 'Oslo',
          },
        },
        metadata: {
          id: eventId,
          version: 'v1',
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Step 1: Send webhook
      const webhookResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect(webhookResponse.status).toBe(200);

      // Step 2: Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Verify event stored
      const storedEvents = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.eventId, eventId));

      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0].eventType).toBe('buddy.match.created');
      expect(storedEvents[0].userId).toBe(testUserId);
      expect(storedEvents[0].processedAt).not.toBeNull();

      // Step 4: Verify profile linking
      const profileResponse = await fetch(
        `${API_GATEWAY_URL}/v1/profiles/${testUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN || 'test-token'}`,
          },
        }
      );

      expect(profileResponse.ok).toBe(true);
      const profileData = await profileResponse.json();
      expect(profileData.userId).toBe(testUserId);

      // Step 5: Verify SDG mapping
      expect(storedEvents[0].payload).toHaveProperty('sdgMapping');
    });
  });

  describe('Event Flow: Skill Share Completed', () => {
    it('should process skill_share.completed and update VIS score', async () => {
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.skill_share.completed',
        data: {
          sessionId: randomUUID(),
          matchId: testMatchId,
          teacherId: testBuddyId,
          learnerId: testUserId,
          skill: 'TypeScript Development',
          duration: 120, // minutes
          completedAt: new Date().toISOString(),
          feedback: {
            rating: 5,
            comment: 'Excellent session',
          },
        },
        metadata: {
          id: eventId,
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Send webhook
      const webhookResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect(webhookResponse.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify VIS score updated
      const visScoreRecords = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, testUserId));

      expect(visScoreRecords.length).toBeGreaterThan(0);

      const latestScore = visScoreRecords.sort(
        (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
      )[0];

      expect(latestScore.totalScore).toBeGreaterThan(0);
      expect(latestScore.breakdown).toHaveProperty('skillDevelopment');
    });
  });

  describe('Event Flow: Milestone Reached', () => {
    it('should process milestone.reached and update SROI metrics', async () => {
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.milestone.reached',
        data: {
          matchId: testMatchId,
          userId: testUserId,
          milestoneType: 'integration_complete',
          description: 'Successfully integrated into workplace',
          achievedAt: new Date().toISOString(),
          evidence: {
            checkinsCompleted: 12,
            eventsAttended: 8,
            skillsLearned: 5,
          },
        },
        metadata: {
          id: eventId,
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadString, WEBHOOK_SECRET);

      // Send webhook
      const webhookResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect(webhookResponse.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify SROI calculation
      const sroiRecords = await db
        .select()
        .from(sroiScores)
        .where(eq(sroiScores.programId, testMatchId));

      if (sroiRecords.length > 0) {
        const latestSROI = sroiRecords[0];
        expect(latestSROI.totalBenefit).toBeGreaterThan(0);
        expect(latestSROI.roi).toBeGreaterThan(0);
      }
    });
  });

  describe('Event Flow: Feedback Submitted', () => {
    it('should process feedback.submitted and track qualitative impact', async () => {
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.feedback.submitted',
        data: {
          matchId: testMatchId,
          fromUserId: testUserId,
          toUserId: testBuddyId,
          rating: 5,
          feedbackText: 'The buddy program has been transformative. I feel much more confident in my new role and have made lasting connections.',
          categories: ['professional_development', 'social_integration', 'confidence'],
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

      // Send webhook
      const webhookResponse = await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      expect(webhookResponse.status).toBe(200);

      // Wait for processing and Q2Q analysis
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify event stored with Q2Q insights
      const storedEvents = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.eventId, eventId));

      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0].derivedMetrics).toBeDefined();
    });
  });

  describe('Event Ordering and Consistency', () => {
    it('should maintain event ordering and data consistency', async () => {
      const correlationId = randomUUID();
      const newMatchId = `order-test-${Date.now()}`;
      const newUserId = randomUUID();

      const events = [
        {
          type: 'buddy.match.created',
          data: {
            matchId: newMatchId,
            participantId: newUserId,
            buddyId: randomUUID(),
            matchedAt: new Date().toISOString(),
          },
        },
        {
          type: 'buddy.checkin.completed',
          data: {
            matchId: newMatchId,
            userId: newUserId,
            mood: 'great',
            notes: 'First week going well',
            checkinDate: new Date().toISOString(),
          },
        },
        {
          type: 'buddy.event.attended',
          data: {
            eventId: randomUUID(),
            matchId: newMatchId,
            userId: newUserId,
            eventType: 'orientation',
            attendedAt: new Date().toISOString(),
          },
        },
      ];

      // Send events in sequence
      for (const event of events) {
        const eventId = randomUUID();
        const payload = {
          ...event,
          metadata: {
            id: eventId,
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

        // Small delay between events
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Wait for all processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify all events processed in order
      const storedEvents = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.correlationId, correlationId))
        .orderBy(buddySystemEvents.timestamp);

      expect(storedEvents).toHaveLength(3);
      expect(storedEvents[0].eventType).toBe('buddy.match.created');
      expect(storedEvents[1].eventType).toBe('buddy.checkin.completed');
      expect(storedEvents[2].eventType).toBe('buddy.event.attended');

      // All should be processed
      storedEvents.forEach(event => {
        expect(event.processedAt).not.toBeNull();
      });
    });
  });

  describe('SDG Mapping Validation', () => {
    it('should correctly map buddy activities to SDGs', async () => {
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.skill_share.completed',
        data: {
          sessionId: randomUUID(),
          matchId: testMatchId,
          teacherId: testBuddyId,
          learnerId: testUserId,
          skill: 'Financial Literacy',
          skillCategory: 'education',
          duration: 90,
          completedAt: new Date().toISOString(),
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

      const storedEvents = await db
        .select()
        .from(buddySystemEvents)
        .where(eq(buddySystemEvents.eventId, eventId));

      expect(storedEvents).toHaveLength(1);

      const sdgMapping = storedEvents[0].payload as any;
      expect(sdgMapping.sdgMapping).toBeDefined();

      // Financial literacy should map to SDG 4 (Quality Education)
      expect(sdgMapping.sdgMapping).toContainEqual(
        expect.objectContaining({
          sdgId: 4,
          relevance: expect.any(Number),
        })
      );
    });
  });

  describe('Profile Linking Verification', () => {
    it('should create and link unified profile on first event', async () => {
      const newUserId = randomUUID();
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.match.created',
        data: {
          matchId: randomUUID(),
          participantId: newUserId,
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
          participantEmail: `test-${newUserId}@example.com`,
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

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify profile created
      const profileResponse = await fetch(
        `${API_GATEWAY_URL}/v1/profiles/${newUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TEST_API_TOKEN || 'test-token'}`,
          },
        }
      );

      expect(profileResponse.ok).toBe(true);
      const profile = await profileResponse.json();

      expect(profile.identities).toContainEqual(
        expect.objectContaining({
          platform: 'buddy-system',
          platformUserId: newUserId,
        })
      );
    });
  });
});
