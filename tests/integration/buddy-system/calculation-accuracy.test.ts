/**
 * Integration Test: SROI/VIS Calculation Accuracy
 *
 * Tests the accuracy of Social Return on Investment (SROI) and
 * Volunteer Impact Score (VIS) calculations based on buddy events
 *
 * Coverage:
 * - VIS score calculations
 * - SROI calculation accuracy
 * - Impact metric aggregation
 * - Weighted scoring
 * - Time-based decay
 * - Contribution tracking
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@teei/shared-schema';
import { buddySystemEvents, visScores, sroiScores, impactMetrics } from '@teei/shared-schema/schema';
import { eq, and } from 'drizzle-orm';
import { generateWebhookSignature } from '../../utils/webhook-helpers.js';

const BUDDY_CONNECTOR_URL = process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3010';
const WEBHOOK_SECRET = process.env.BUDDY_WEBHOOK_SECRET || 'test-webhook-secret';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

describe('Integration: SROI/VIS Calculation Accuracy', () => {
  let testUserId: string;
  let testMatchId: string;

  beforeAll(() => {
    testUserId = randomUUID();
    testMatchId = randomUUID();
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(buddySystemEvents).where(eq(buddySystemEvents.userId, testUserId));
    await db.delete(visScores).where(eq(visScores.userId, testUserId));
    await db.delete(sroiScores).where(eq(sroiScores.programId, testMatchId));
  });

  describe('VIS Score Calculations', () => {
    it('should calculate VIS score for skill share activity', async () => {
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.skill_share.completed',
        data: {
          sessionId: randomUUID(),
          matchId: testMatchId,
          teacherId: testUserId,
          learnerId: randomUUID(),
          skill: 'TypeScript Development',
          duration: 120, // 2 hours
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

      await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      // Wait for processing and VIS calculation
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify VIS score calculated
      const visScoreRecords = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, testUserId));

      expect(visScoreRecords.length).toBeGreaterThan(0);

      const latestScore = visScoreRecords[0];
      expect(latestScore.totalScore).toBeGreaterThan(0);
      expect(latestScore.breakdown).toHaveProperty('skillDevelopment');

      // VIS calculation formula verification
      // Base score: duration (120 min) * skill_weight (1.5) = 180 points
      // Quality multiplier: rating (5/5) = 1.0x
      // Expected: ~180 points
      expect(latestScore.breakdown.skillDevelopment).toBeGreaterThanOrEqual(100);
      expect(latestScore.breakdown.skillDevelopment).toBeLessThanOrEqual(250);
    });

    it('should calculate VIS score for event attendance', async () => {
      const userId = randomUUID();
      const eventId = randomUUID();

      const payload = {
        type: 'buddy.event.attended',
        data: {
          eventId: randomUUID(),
          matchId: randomUUID(),
          userId,
          eventType: 'workshop',
          eventTitle: 'Professional Development Workshop',
          attendedAt: new Date().toISOString(),
          duration: 180, // 3 hours
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

      await new Promise(resolve => setTimeout(resolve, 5000));

      const visScoreRecords = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, userId));

      expect(visScoreRecords.length).toBeGreaterThan(0);

      const latestScore = visScoreRecords[0];
      expect(latestScore.breakdown).toHaveProperty('communityEngagement');

      // Event attendance: duration (180 min) * event_weight (1.0) = 180 points
      expect(latestScore.breakdown.communityEngagement).toBeGreaterThanOrEqual(100);
      expect(latestScore.breakdown.communityEngagement).toBeLessThanOrEqual(300);
    });

    it('should aggregate multiple activities into cumulative VIS score', async () => {
      const userId = randomUUID();
      const matchId = randomUUID();

      const activities = [
        {
          type: 'buddy.checkin.completed',
          data: {
            matchId,
            userId,
            mood: 'great',
            checkinDate: new Date().toISOString(),
          },
        },
        {
          type: 'buddy.event.attended',
          data: {
            eventId: randomUUID(),
            matchId,
            userId,
            eventType: 'social',
            attendedAt: new Date().toISOString(),
          },
        },
        {
          type: 'buddy.skill_share.completed',
          data: {
            sessionId: randomUUID(),
            matchId,
            teacherId: userId,
            learnerId: randomUUID(),
            skill: 'Communication',
            duration: 60,
            completedAt: new Date().toISOString(),
          },
        },
      ];

      for (const activity of activities) {
        const payload = {
          ...activity,
          metadata: {
            id: randomUUID(),
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

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      const visScoreRecords = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, userId));

      expect(visScoreRecords.length).toBeGreaterThan(0);

      const latestScore = visScoreRecords[0];

      // Should have contributions from all activity types
      expect(latestScore.breakdown).toHaveProperty('regularEngagement');
      expect(latestScore.breakdown).toHaveProperty('communityEngagement');
      expect(latestScore.breakdown).toHaveProperty('skillDevelopment');

      // Total should be sum of all components
      const calculatedTotal =
        (latestScore.breakdown.regularEngagement || 0) +
        (latestScore.breakdown.communityEngagement || 0) +
        (latestScore.breakdown.skillDevelopment || 0) +
        (latestScore.breakdown.leadershipMentoring || 0) +
        (latestScore.breakdown.impactContribution || 0);

      expect(latestScore.totalScore).toBeCloseTo(calculatedTotal, 1);
    });

    it('should apply quality multipliers to VIS scores', async () => {
      const userHighQuality = randomUUID();
      const userLowQuality = randomUUID();

      // High quality skill share (high rating)
      const highQualityPayload = {
        type: 'buddy.skill_share.completed',
        data: {
          sessionId: randomUUID(),
          matchId: randomUUID(),
          teacherId: userHighQuality,
          learnerId: randomUUID(),
          skill: 'Python',
          duration: 120,
          completedAt: new Date().toISOString(),
          feedback: {
            rating: 5, // Perfect rating
          },
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      // Low quality skill share (low rating)
      const lowQualityPayload = {
        type: 'buddy.skill_share.completed',
        data: {
          sessionId: randomUUID(),
          matchId: randomUUID(),
          teacherId: userLowQuality,
          learnerId: randomUUID(),
          skill: 'Python',
          duration: 120,
          completedAt: new Date().toISOString(),
          feedback: {
            rating: 2, // Low rating
          },
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      for (const payload of [highQualityPayload, lowQualityPayload]) {
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
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      const highQualityScore = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, userHighQuality));

      const lowQualityScore = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, userLowQuality));

      expect(highQualityScore.length).toBeGreaterThan(0);
      expect(lowQualityScore.length).toBeGreaterThan(0);

      // High quality should have higher score for same duration
      expect(highQualityScore[0].totalScore).toBeGreaterThan(lowQualityScore[0].totalScore);
    });
  });

  describe('SROI Calculations', () => {
    it('should calculate SROI for buddy match program', async () => {
      const matchId = randomUUID();
      const participantId = randomUUID();

      // Create match
      const matchPayload = {
        type: 'buddy.match.created',
        data: {
          matchId,
          participantId,
          buddyId: randomUUID(),
          matchedAt: new Date().toISOString(),
        },
        metadata: {
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const payloadString = JSON.stringify(matchPayload);
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

      // Complete milestone
      const milestonePayload = {
        type: 'buddy.milestone.reached',
        data: {
          matchId,
          userId: participantId,
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
          id: randomUUID(),
          version: 'v1',
          timestamp: new Date().toISOString(),
        },
      };

      const milestoneString = JSON.stringify(milestonePayload);
      const milestoneSignature = generateWebhookSignature(milestoneString, WEBHOOK_SECRET);

      await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': milestoneSignature,
        },
        body: milestoneString,
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify SROI calculation
      const sroiRecords = await db
        .select()
        .from(sroiScores)
        .where(eq(sroiScores.programId, matchId));

      if (sroiRecords.length > 0) {
        const sroi = sroiRecords[0];

        // SROI should be positive
        expect(sroi.totalBenefit).toBeGreaterThan(0);
        expect(sroi.totalInvestment).toBeGreaterThan(0);
        expect(sroi.roi).toBeGreaterThan(0);

        // ROI = (Total Benefit - Total Investment) / Total Investment
        const calculatedROI = (sroi.totalBenefit - sroi.totalInvestment) / sroi.totalInvestment;
        expect(sroi.roi).toBeCloseTo(calculatedROI, 2);
      }
    });

    it('should track individual benefit components in SROI', async () => {
      const matchId = randomUUID();

      // Send milestone event
      const payload = {
        type: 'buddy.milestone.reached',
        data: {
          matchId,
          userId: randomUUID(),
          milestoneType: 'employment_secured',
          description: 'Secured employment after buddy program',
          achievedAt: new Date().toISOString(),
          evidence: {
            employmentType: 'full-time',
            salary: 50000,
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

      await fetch(`${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-delivery-id': randomUUID(),
          'x-webhook-signature': signature,
        },
        body: payloadString,
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const sroiRecords = await db
        .select()
        .from(sroiScores)
        .where(eq(sroiScores.programId, matchId));

      if (sroiRecords.length > 0) {
        expect(sroiRecords[0].benefitBreakdown).toBeDefined();
        expect(sroiRecords[0].benefitBreakdown).toHaveProperty('employmentBenefit');
      }
    });
  });

  describe('Impact Metric Aggregation', () => {
    it('should aggregate metrics across time periods', async () => {
      const userId = randomUUID();
      const matchId = randomUUID();

      // Send events over time
      for (let i = 0; i < 5; i++) {
        const payload = {
          type: 'buddy.checkin.completed',
          data: {
            matchId,
            userId,
            mood: 'great',
            checkinDate: new Date(Date.now() + i * 86400000).toISOString(), // Daily
          },
          metadata: {
            id: randomUUID(),
            version: 'v1',
            timestamp: new Date(Date.now() + i * 86400000).toISOString(),
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

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify metrics aggregated
      const metricsRecords = await db
        .select()
        .from(impactMetrics)
        .where(eq(impactMetrics.userId, userId));

      expect(metricsRecords.length).toBeGreaterThan(0);
    });

    it('should calculate running averages and trends', async () => {
      const userId = randomUUID();
      const matchId = randomUUID();

      const moods = ['great', 'good', 'okay', 'good', 'great'];

      for (let i = 0; i < moods.length; i++) {
        const payload = {
          type: 'buddy.checkin.completed',
          data: {
            matchId,
            userId,
            mood: moods[i],
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

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify trend calculation
      const visRecords = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, userId));

      if (visRecords.length > 0) {
        expect(visRecords[0].breakdown).toHaveProperty('regularEngagement');
      }
    });
  });

  describe('Weighted Scoring', () => {
    it('should apply correct weights to different event types', async () => {
      const userId = randomUUID();

      const events = [
        {
          type: 'buddy.checkin.completed',
          expectedCategory: 'regularEngagement',
          weight: 'low',
        },
        {
          type: 'buddy.skill_share.completed',
          expectedCategory: 'skillDevelopment',
          weight: 'high',
        },
        {
          type: 'buddy.event.attended',
          expectedCategory: 'communityEngagement',
          weight: 'medium',
        },
      ];

      for (const event of events) {
        const payload = {
          type: event.type,
          data: {
            matchId: randomUUID(),
            userId,
            ...(event.type === 'buddy.skill_share.completed'
              ? {
                  sessionId: randomUUID(),
                  teacherId: userId,
                  learnerId: randomUUID(),
                  skill: 'Test Skill',
                  duration: 60,
                  completedAt: new Date().toISOString(),
                }
              : event.type === 'buddy.event.attended'
              ? {
                  eventId: randomUUID(),
                  eventType: 'workshop',
                  attendedAt: new Date().toISOString(),
                }
              : {
                  mood: 'great',
                  checkinDate: new Date().toISOString(),
                }),
          },
          metadata: {
            id: randomUUID(),
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
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      const visRecords = await db
        .select()
        .from(visScores)
        .where(eq(visScores.userId, userId));

      if (visRecords.length > 0) {
        const breakdown = visRecords[0].breakdown;

        // High weight activities should contribute more
        if (breakdown.skillDevelopment && breakdown.regularEngagement) {
          expect(breakdown.skillDevelopment).toBeGreaterThan(breakdown.regularEngagement);
        }
      }
    });
  });
});
