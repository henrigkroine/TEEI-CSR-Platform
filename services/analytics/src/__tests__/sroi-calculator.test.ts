import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { calculateSROI, saveSROICalculation, getHistoricalSROI, DEFAULT_VALUATION_WEIGHTS, ActivityType } from '../calculators/sroi-calculator.js';
import { db } from '@teei/shared-schema/db';
import { buddySystemEvents, sroiCalculations, sroiValuationWeights } from '@teei/shared-schema';
import { sql } from 'drizzle-orm';

describe('SROI Calculator', () => {
  beforeAll(async () => {
    // Clean up test data before running tests
    await db.delete(buddySystemEvents);
    await db.delete(sroiCalculations);
    await db.delete(sroiValuationWeights);
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await db.delete(buddySystemEvents);
    await db.delete(sroiCalculations);
    await db.delete(sroiValuationWeights);
  });

  beforeEach(async () => {
    // Clean between each test
    await db.delete(buddySystemEvents);
    await db.delete(sroiCalculations);
  });

  describe('calculateSROI', () => {
    it('should calculate SROI with zero events', async () => {
      const periodStart = new Date('2024-10-01');
      const periodEnd = new Date('2024-10-31');

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
      });

      expect(result.sroiRatio).toBe(0);
      expect(result.socialValue).toBe(0);
      expect(result.investment).toBe(1500); // $1500 for 1 month
      expect(result.confidence).toBeGreaterThan(0); // Should have minimal confidence
      expect(result.breakdown.matches.count).toBe(0);
    });

    it('should calculate SROI with sample events from task description', async () => {
      const periodStart = new Date('2024-10-01');
      const periodEnd = new Date('2024-10-31');

      // Insert sample events matching the task example
      const events = [
        { type: 'buddy.match.created', count: 25 },
        { type: 'buddy.event.attended', count: 80 },
        { type: 'buddy.skill_share.completed', count: 120 },
        { type: 'buddy.feedback.submitted', count: 95 },
        { type: 'buddy.milestone.reached', count: 180 },
        { type: 'buddy.checkin.completed', count: 50 },
      ];

      // Insert events
      for (const { type, count } of events) {
        for (let i = 0; i < count; i++) {
          await db.insert(buddySystemEvents).values({
            eventId: crypto.randomUUID(),
            eventType: type,
            userId: `user-${i}`,
            timestamp: new Date('2024-10-15'),
            payload: { test: true },
          });
        }
      }

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
      });

      // Expected calculations based on default weights:
      // matches: 25 × 10 = 250
      // events: 80 × 5 = 400
      // skill_shares: 120 × 15 = 1800
      // feedback: 95 × 8 = 760
      // milestones: 180 × 20 = 3600
      // checkins: 50 × 3 = 150
      // Total social value: 6960
      // Investment: $1500
      // SROI: 6960 / 1500 = 4.64

      expect(result.breakdown.matches.count).toBe(25);
      expect(result.breakdown.matches.value).toBe(250);
      expect(result.breakdown.events.count).toBe(80);
      expect(result.breakdown.events.value).toBe(400);
      expect(result.breakdown.skill_shares.count).toBe(120);
      expect(result.breakdown.skill_shares.value).toBe(1800);
      expect(result.breakdown.feedback.count).toBe(95);
      expect(result.breakdown.feedback.value).toBe(760);
      expect(result.breakdown.milestones.count).toBe(180);
      expect(result.breakdown.milestones.value).toBe(3600);
      expect(result.breakdown.checkins.count).toBe(50);
      expect(result.breakdown.checkins.value).toBe(150);

      expect(result.socialValue).toBe(6960);
      expect(result.investment).toBe(1500);
      expect(result.sroiRatio).toBeCloseTo(4.64, 2);
      expect(result.confidence).toBeGreaterThan(0.8); // High confidence with many events
    });

    it('should calculate SROI for single event type', async () => {
      const periodStart = new Date('2024-10-01');
      const periodEnd = new Date('2024-10-31');

      // Insert only skill share events (high impact)
      for (let i = 0; i < 10; i++) {
        await db.insert(buddySystemEvents).values({
          eventId: crypto.randomUUID(),
          eventType: 'buddy.skill_share.completed',
          userId: `user-${i}`,
          timestamp: new Date('2024-10-15'),
          payload: { test: true },
        });
      }

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
      });

      // 10 skill shares × 15 points = 150
      // Investment: $1500
      // SROI: 150 / 1500 = 0.1

      expect(result.breakdown.skill_shares.count).toBe(10);
      expect(result.breakdown.skill_shares.value).toBe(150);
      expect(result.socialValue).toBe(150);
      expect(result.sroiRatio).toBeCloseTo(0.1, 2);
      expect(result.confidence).toBeLessThan(0.5); // Lower confidence with single activity type
    });

    it('should calculate SROI for multi-month period', async () => {
      const periodStart = new Date('2024-07-01');
      const periodEnd = new Date('2024-09-30'); // 3 months (Q3)

      // Insert events
      await db.insert(buddySystemEvents).values({
        eventId: crypto.randomUUID(),
        eventType: 'buddy.match.created',
        userId: 'user-1',
        timestamp: new Date('2024-08-15'),
        payload: { test: true },
      });

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
      });

      // Investment for 3 months: $1500 × 3 = $4500
      expect(result.investment).toBe(4500);
      expect(result.socialValue).toBe(10); // 1 match × 10 points
      expect(result.sroiRatio).toBeCloseTo(0.0022, 4);
    });

    it('should handle date range with no events gracefully', async () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
      });

      expect(result.socialValue).toBe(0);
      expect(result.sroiRatio).toBe(0);
      expect(result.confidence).toBeGreaterThan(0); // Minimum confidence
    });

    it('should apply custom company weights', async () => {
      const periodStart = new Date('2024-10-01');
      const periodEnd = new Date('2024-10-31');
      const companyId = crypto.randomUUID();

      // Insert custom weight for skill shares (25 instead of 15)
      await db.insert(sroiValuationWeights).values({
        companyId,
        activityType: ActivityType.SKILL_SHARE,
        valuePoints: '25',
        effectiveFrom: new Date('2024-01-01'),
      });

      // Insert skill share event
      await db.insert(buddySystemEvents).values({
        eventId: crypto.randomUUID(),
        eventType: 'buddy.skill_share.completed',
        userId: 'user-1',
        timestamp: new Date('2024-10-15'),
        payload: { test: true },
      });

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
        companyId,
      });

      // Should use custom weight: 1 × 25 = 25 (not 1 × 15 = 15)
      expect(result.breakdown.skill_shares.value).toBe(25);
      expect(result.socialValue).toBe(25);
    });
  });

  describe('saveSROICalculation', () => {
    it('should save SROI calculation to database', async () => {
      const calculation = {
        period: { start: new Date('2024-10-01'), end: new Date('2024-10-31') },
        program: 'buddy',
        sroiRatio: 4.64,
        socialValue: 6960,
        investment: 1500,
        breakdown: {
          matches: { count: 25, value: 250 },
          events: { count: 80, value: 400 },
          skill_shares: { count: 120, value: 1800 },
          feedback: { count: 95, value: 760 },
          milestones: { count: 180, value: 3600 },
          checkins: { count: 50, value: 150 },
        },
        confidence: 0.95,
        calculatedAt: new Date(),
      };

      await saveSROICalculation(calculation);

      const saved = await db.select().from(sroiCalculations).limit(1);
      expect(saved).toHaveLength(1);
      expect(saved[0].programType).toBe('buddy');
      expect(parseFloat(saved[0].sroiRatio)).toBeCloseTo(4.64, 2);
      expect(parseFloat(saved[0].totalSocialValue)).toBe(6960);
    });

    it('should save company-specific SROI calculation', async () => {
      const companyId = crypto.randomUUID();
      const calculation = {
        period: { start: new Date('2024-10-01'), end: new Date('2024-10-31') },
        program: 'buddy',
        sroiRatio: 3.5,
        socialValue: 5250,
        investment: 1500,
        breakdown: {
          matches: { count: 0, value: 0 },
          events: { count: 0, value: 0 },
          skill_shares: { count: 0, value: 0 },
          feedback: { count: 0, value: 0 },
          milestones: { count: 0, value: 0 },
          checkins: { count: 0, value: 0 },
        },
        confidence: 0.8,
        calculatedAt: new Date(),
      };

      await saveSROICalculation(calculation, companyId);

      const saved = await db.select().from(sroiCalculations).where(sql`company_id = ${companyId}`);
      expect(saved).toHaveLength(1);
      expect(saved[0].companyId).toBe(companyId);
    });
  });

  describe('getHistoricalSROI', () => {
    it('should retrieve historical SROI calculations', async () => {
      // Insert 3 historical calculations
      const dates = [
        { start: new Date('2024-08-01'), end: new Date('2024-08-31') },
        { start: new Date('2024-09-01'), end: new Date('2024-09-30') },
        { start: new Date('2024-10-01'), end: new Date('2024-10-31') },
      ];

      for (const { start, end } of dates) {
        await db.insert(sroiCalculations).values({
          programType: 'buddy',
          periodStart: start,
          periodEnd: end,
          totalSocialValue: '1000',
          totalInvestment: '1500',
          sroiRatio: '0.67',
          activityBreakdown: {},
          confidenceScore: '0.5',
        });
      }

      const history = await getHistoricalSROI('buddy');

      expect(history).toHaveLength(3);
      expect(history[0].period.end.getMonth()).toBe(9); // October (most recent first)
      expect(history[2].period.end.getMonth()).toBe(7); // August (oldest last)
    });

    it('should limit historical results', async () => {
      // Insert 5 calculations
      for (let i = 0; i < 5; i++) {
        await db.insert(sroiCalculations).values({
          programType: 'buddy',
          periodStart: new Date(2024, i, 1),
          periodEnd: new Date(2024, i, 28),
          totalSocialValue: '1000',
          totalInvestment: '1500',
          sroiRatio: '0.67',
          activityBreakdown: {},
        });
      }

      const history = await getHistoricalSROI('buddy', undefined, 3);

      expect(history).toHaveLength(3);
    });

    it('should filter by company ID', async () => {
      const company1 = crypto.randomUUID();
      const company2 = crypto.randomUUID();

      await db.insert(sroiCalculations).values([
        {
          programType: 'buddy',
          companyId: company1,
          periodStart: new Date('2024-10-01'),
          periodEnd: new Date('2024-10-31'),
          totalSocialValue: '1000',
          totalInvestment: '1500',
          sroiRatio: '0.67',
          activityBreakdown: {},
        },
        {
          programType: 'buddy',
          companyId: company2,
          periodStart: new Date('2024-10-01'),
          periodEnd: new Date('2024-10-31'),
          totalSocialValue: '2000',
          totalInvestment: '1500',
          sroiRatio: '1.33',
          activityBreakdown: {},
        },
      ]);

      const history = await getHistoricalSROI('buddy', company1);

      expect(history).toHaveLength(1);
      expect(history[0].socialValue).toBe(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large event counts', async () => {
      const periodStart = new Date('2024-10-01');
      const periodEnd = new Date('2024-10-31');

      // Insert 10,000 milestone events
      const batchSize = 100;
      for (let batch = 0; batch < 100; batch++) {
        const events = Array.from({ length: batchSize }, (_, i) => ({
          eventId: crypto.randomUUID(),
          eventType: 'buddy.milestone.reached',
          userId: `user-${batch * batchSize + i}`,
          timestamp: new Date('2024-10-15'),
          payload: { test: true },
        }));
        await db.insert(buddySystemEvents).values(events);
      }

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
      });

      // 10,000 milestones × 20 points = 200,000
      expect(result.breakdown.milestones.count).toBe(10000);
      expect(result.breakdown.milestones.value).toBe(200000);
      expect(result.sroiRatio).toBeCloseTo(133.33, 2);
      expect(result.confidence).toBeGreaterThan(0.9); // Very high confidence
    });

    it('should handle events at period boundaries', async () => {
      const periodStart = new Date('2024-10-01T00:00:00Z');
      const periodEnd = new Date('2024-10-31T23:59:59Z');

      // Event exactly at start
      await db.insert(buddySystemEvents).values({
        eventId: crypto.randomUUID(),
        eventType: 'buddy.match.created',
        userId: 'user-1',
        timestamp: periodStart,
        payload: { test: true },
      });

      // Event exactly at end
      await db.insert(buddySystemEvents).values({
        eventId: crypto.randomUUID(),
        eventType: 'buddy.match.created',
        userId: 'user-2',
        timestamp: periodEnd,
        payload: { test: true },
      });

      const result = await calculateSROI({
        periodStart,
        periodEnd,
        programType: 'buddy',
      });

      expect(result.breakdown.matches.count).toBe(2);
    });

    it('should return consistent results for same period', async () => {
      const periodStart = new Date('2024-10-01');
      const periodEnd = new Date('2024-10-31');

      await db.insert(buddySystemEvents).values({
        eventId: crypto.randomUUID(),
        eventType: 'buddy.match.created',
        userId: 'user-1',
        timestamp: new Date('2024-10-15'),
        payload: { test: true },
      });

      const result1 = await calculateSROI({ periodStart, periodEnd });
      const result2 = await calculateSROI({ periodStart, periodEnd });

      expect(result1.sroiRatio).toBe(result2.sroiRatio);
      expect(result1.socialValue).toBe(result2.socialValue);
      expect(result1.investment).toBe(result2.investment);
    });
  });

  describe('Performance', () => {
    it('should calculate SROI in under 500ms for typical data', async () => {
      const periodStart = new Date('2024-10-01');
      const periodEnd = new Date('2024-10-31');

      // Insert realistic number of events (500 total)
      const eventTypes = [
        'buddy.match.created',
        'buddy.event.attended',
        'buddy.skill_share.completed',
        'buddy.feedback.submitted',
        'buddy.milestone.reached',
      ];

      const events = Array.from({ length: 500 }, (_, i) => ({
        eventId: crypto.randomUUID(),
        eventType: eventTypes[i % eventTypes.length],
        userId: `user-${i % 50}`,
        timestamp: new Date('2024-10-15'),
        payload: { test: true },
      }));

      await db.insert(buddySystemEvents).values(events);

      const startTime = Date.now();
      await calculateSROI({ periodStart, periodEnd });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });
  });
});
