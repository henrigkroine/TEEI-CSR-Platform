/**
 * Unit tests for VIS Calculator
 *
 * Tests for decay functions, point calculations, and VIS aggregation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDecayWeight,
  calculateDaysAgo,
  calculateEventPoints,
  calculateActivityBreakdown,
  calculateUserVIS,
  ACTIVITY_POINTS,
  EVENT_TYPE_POINTS,
  DEFAULT_VIS_CONFIG,
} from '../src/vis-calculator.js';

describe('VIS Calculator - Decay Functions', () => {
  describe('calculateDecayWeight', () => {
    it('should return 1.0 for today (0 days ago)', () => {
      const weight = calculateDecayWeight(0);
      expect(weight).toBe(1.0);
    });

    it('should return ~0.74 for 30 days ago (lambda=0.01)', () => {
      const weight = calculateDecayWeight(30, 0.01);
      expect(weight).toBeCloseTo(0.74, 2);
    });

    it('should return ~0.41 for 90 days ago (lambda=0.01)', () => {
      const weight = calculateDecayWeight(90, 0.01);
      expect(weight).toBeCloseTo(0.41, 2);
    });

    it('should return ~0.17 for 180 days ago (lambda=0.01)', () => {
      const weight = calculateDecayWeight(180, 0.01);
      expect(weight).toBeCloseTo(0.17, 2);
    });

    it('should support custom lambda values', () => {
      const weight1 = calculateDecayWeight(30, 0.02); // Faster decay
      const weight2 = calculateDecayWeight(30, 0.005); // Slower decay

      expect(weight1).toBeLessThan(0.74); // More aggressive decay
      expect(weight2).toBeGreaterThan(0.74); // Less aggressive decay
    });

    it('should always return value between 0 and 1', () => {
      const testCases = [0, 1, 30, 90, 180, 365, 1000];

      for (const days of testCases) {
        const weight = calculateDecayWeight(days);
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('calculateDaysAgo', () => {
    it('should return 0 for same timestamp', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const daysAgo = calculateDaysAgo(now, now);
      expect(daysAgo).toBe(0);
    });

    it('should return 1 for yesterday', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const yesterday = new Date('2024-01-14T12:00:00Z');
      const daysAgo = calculateDaysAgo(yesterday, now);
      expect(daysAgo).toBeCloseTo(1, 1);
    });

    it('should return 30 for 30 days ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const past = new Date('2023-12-16T12:00:00Z');
      const daysAgo = calculateDaysAgo(past, now);
      expect(daysAgo).toBeCloseTo(30, 1);
    });

    it('should support fractional days', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const halfDay = new Date('2024-01-15T00:00:00Z');
      const daysAgo = calculateDaysAgo(halfDay, now);
      expect(daysAgo).toBeCloseTo(0.5, 1);
    });
  });
});

describe('VIS Calculator - Point Calculations', () => {
  describe('calculateEventPoints', () => {
    const referenceDate = new Date('2024-01-15T12:00:00Z');

    it('should calculate raw points for match created', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z'); // Today
      const result = calculateEventPoints('buddy.match.created', timestamp, DEFAULT_VIS_CONFIG, referenceDate);

      expect(result.raw).toBe(ACTIVITY_POINTS.MATCH_CREATED);
      expect(result.daysAgo).toBe(0);
      expect(result.weight).toBe(1.0);
      expect(result.adjusted).toBe(ACTIVITY_POINTS.MATCH_CREATED);
    });

    it('should calculate raw points for skill share (high value)', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z');
      const result = calculateEventPoints('buddy.skill_share.completed', timestamp, DEFAULT_VIS_CONFIG, referenceDate);

      expect(result.raw).toBe(ACTIVITY_POINTS.SKILL_SHARE_COMPLETED);
      expect(result.adjusted).toBe(ACTIVITY_POINTS.SKILL_SHARE_COMPLETED);
    });

    it('should apply decay to old events', () => {
      const timestamp = new Date('2023-10-17T12:00:00Z'); // 90 days ago
      const result = calculateEventPoints('buddy.event.attended', timestamp, DEFAULT_VIS_CONFIG, referenceDate);

      expect(result.raw).toBe(ACTIVITY_POINTS.EVENT_ATTENDED);
      expect(result.daysAgo).toBeCloseTo(90, 1);
      expect(result.weight).toBeCloseTo(0.41, 2);
      expect(result.adjusted).toBeCloseTo(2.05, 1); // 5 × 0.41
    });

    it('should return 0 points for match.ended', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z');
      const result = calculateEventPoints('buddy.match.ended', timestamp, DEFAULT_VIS_CONFIG, referenceDate);

      expect(result.raw).toBe(0);
      expect(result.adjusted).toBe(0);
    });

    it('should support disabling decay', () => {
      const timestamp = new Date('2023-10-17T12:00:00Z'); // 90 days ago
      const config = { lambda: 0.01, enableDecay: false };
      const result = calculateEventPoints('buddy.event.attended', timestamp, config, referenceDate);

      expect(result.raw).toBe(ACTIVITY_POINTS.EVENT_ATTENDED);
      expect(result.adjusted).toBe(ACTIVITY_POINTS.EVENT_ATTENDED); // No decay
      expect(result.weight).toBe(1.0);
    });
  });
});

describe('VIS Calculator - Activity Breakdown', () => {
  it('should count matches correctly', () => {
    const events = [
      { event_type: 'buddy.match.created', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.match.created', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.match.created', timestamp: new Date(), user_id: 'user1' },
    ];

    const breakdown = calculateActivityBreakdown(events);
    expect(breakdown.matches).toBe(3);
    expect(breakdown.events).toBe(0);
  });

  it('should count all activity types', () => {
    const events = [
      { event_type: 'buddy.match.created', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.event.attended', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.event.logged', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.skill_share.completed', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.feedback.submitted', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.milestone.reached', timestamp: new Date(), user_id: 'user1' },
      { event_type: 'buddy.checkin.completed', timestamp: new Date(), user_id: 'user1' },
    ];

    const breakdown = calculateActivityBreakdown(events);
    expect(breakdown.matches).toBe(1);
    expect(breakdown.events).toBe(2); // attended + logged
    expect(breakdown.skill_shares).toBe(1);
    expect(breakdown.feedback).toBe(1);
    expect(breakdown.milestones).toBe(1);
    expect(breakdown.checkins).toBe(1);
  });

  it('should handle empty events', () => {
    const breakdown = calculateActivityBreakdown([]);
    expect(breakdown.matches).toBe(0);
    expect(breakdown.events).toBe(0);
    expect(breakdown.skill_shares).toBe(0);
  });
});

describe('VIS Calculator - User VIS Calculation', () => {
  const referenceDate = new Date('2024-01-15T12:00:00Z');

  it('should calculate VIS for highly active user', () => {
    const events = [
      // 10 matches × 10 points = 100
      ...Array(10).fill(null).map(() => ({
        event_type: 'buddy.match.created',
        timestamp: new Date('2024-01-10T12:00:00Z'), // 5 days ago
        user_id: 'user1',
      })),
      // 50 events × 5 points = 250
      ...Array(50).fill(null).map(() => ({
        event_type: 'buddy.event.attended',
        timestamp: new Date('2024-01-12T12:00:00Z'), // 3 days ago
        user_id: 'user1',
      })),
      // 5 skill shares × 15 points = 75
      ...Array(5).fill(null).map(() => ({
        event_type: 'buddy.skill_share.completed',
        timestamp: new Date('2024-01-14T12:00:00Z'), // 1 day ago
        user_id: 'user1',
      })),
    ];

    const vis = calculateUserVIS('user1', events, DEFAULT_VIS_CONFIG, null);

    expect(vis.user_id).toBe('user1');
    expect(vis.raw_points).toBe(425); // 100 + 250 + 75
    expect(vis.current_vis).toBeGreaterThan(400); // Close to raw (minimal decay)
    expect(vis.activity_breakdown.matches).toBe(10);
    expect(vis.activity_breakdown.events).toBe(50);
    expect(vis.activity_breakdown.skill_shares).toBe(5);
  });

  it('should calculate VIS with decay for old events', () => {
    const events = [
      // Old match (90 days ago)
      {
        event_type: 'buddy.match.created',
        timestamp: new Date('2023-10-17T12:00:00Z'),
        user_id: 'user2',
      },
      // Recent match (today)
      {
        event_type: 'buddy.match.created',
        timestamp: referenceDate,
        user_id: 'user2',
      },
    ];

    const config = { lambda: 0.01, enableDecay: true };
    const vis = calculateUserVIS('user2', events, config, null);

    expect(vis.raw_points).toBe(20); // 2 × 10 points
    expect(vis.decay_adjusted_points).toBeLessThan(20); // Decay applied to old event
    expect(vis.decay_adjusted_points).toBeGreaterThan(10); // But more than 1 match
  });

  it('should handle user with no events', () => {
    const vis = calculateUserVIS('user3', [], DEFAULT_VIS_CONFIG, null);

    expect(vis.user_id).toBe('user3');
    expect(vis.raw_points).toBe(0);
    expect(vis.current_vis).toBe(0);
    expect(vis.last_activity_date).toBeNull();
    expect(vis.activity_breakdown.matches).toBe(0);
  });

  it('should track last activity date correctly', () => {
    const events = [
      {
        event_type: 'buddy.match.created',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        user_id: 'user4',
      },
      {
        event_type: 'buddy.event.attended',
        timestamp: new Date('2024-01-10T12:00:00Z'), // Most recent
        user_id: 'user4',
      },
      {
        event_type: 'buddy.skill_share.completed',
        timestamp: new Date('2024-01-05T12:00:00Z'),
        user_id: 'user4',
      },
    ];

    const vis = calculateUserVIS('user4', events, DEFAULT_VIS_CONFIG, null);

    expect(vis.last_activity_date).toEqual(new Date('2024-01-10T12:00:00Z'));
  });

  it('should round VIS to 2 decimal places', () => {
    const events = [
      {
        event_type: 'buddy.match.created',
        timestamp: new Date('2023-10-17T12:00:00Z'), // Will have fractional decay
        user_id: 'user5',
      },
    ];

    const vis = calculateUserVIS('user5', events, DEFAULT_VIS_CONFIG, null);

    // Check that it's rounded to 2 decimals
    expect(vis.current_vis.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });

  it('should calculate percentile and rank as null (calculated in batch)', () => {
    const events = [
      {
        event_type: 'buddy.match.created',
        timestamp: new Date(),
        user_id: 'user6',
      },
    ];

    const vis = calculateUserVIS('user6', events, DEFAULT_VIS_CONFIG, null);

    expect(vis.percentile).toBeNull();
    expect(vis.rank).toBeNull();
  });
});

describe('VIS Calculator - Point Values', () => {
  it('should have correct point values for all event types', () => {
    expect(EVENT_TYPE_POINTS['buddy.match.created']).toBe(10);
    expect(EVENT_TYPE_POINTS['buddy.match.ended']).toBe(0);
    expect(EVENT_TYPE_POINTS['buddy.event.attended']).toBe(5);
    expect(EVENT_TYPE_POINTS['buddy.event.logged']).toBe(5);
    expect(EVENT_TYPE_POINTS['buddy.skill_share.completed']).toBe(15); // High value
    expect(EVENT_TYPE_POINTS['buddy.feedback.submitted']).toBe(8);
    expect(EVENT_TYPE_POINTS['buddy.milestone.reached']).toBe(20); // High value
    expect(EVENT_TYPE_POINTS['buddy.checkin.completed']).toBe(3);
  });

  it('should identify high-value activities', () => {
    // High value activities (⭐⭐⭐)
    expect(ACTIVITY_POINTS.SKILL_SHARE_COMPLETED).toBeGreaterThan(10);
    expect(ACTIVITY_POINTS.MILESTONE_REACHED).toBeGreaterThan(10);

    // Regular activities
    expect(ACTIVITY_POINTS.MATCH_CREATED).toBeLessThan(15);
    expect(ACTIVITY_POINTS.EVENT_ATTENDED).toBeLessThan(15);
  });
});

describe('VIS Calculator - Scenario Tests', () => {
  it('Scenario 1: Highly Active User (last 30 days)', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    const events = [
      ...Array(10).fill(null).map((_, i) => ({
        event_type: 'buddy.match.created',
        timestamp: new Date(now.getTime() - i * 2 * 24 * 60 * 60 * 1000), // Every 2 days
        user_id: 'active_user',
      })),
      ...Array(50).fill(null).map((_, i) => ({
        event_type: 'buddy.event.attended',
        timestamp: new Date(now.getTime() - i * 12 * 60 * 60 * 1000), // Every 12 hours
        user_id: 'active_user',
      })),
      ...Array(80).fill(null).map((_, i) => ({
        event_type: 'buddy.skill_share.completed',
        timestamp: new Date(now.getTime() - i * 8 * 60 * 60 * 1000), // Every 8 hours
        user_id: 'active_user',
      })),
      ...Array(40).fill(null).map((_, i) => ({
        event_type: 'buddy.feedback.submitted',
        timestamp: new Date(now.getTime() - i * 18 * 60 * 60 * 1000), // Every 18 hours
        user_id: 'active_user',
      })),
      ...Array(100).fill(null).map((_, i) => ({
        event_type: 'buddy.milestone.reached',
        timestamp: new Date(now.getTime() - i * 7 * 60 * 60 * 1000), // Every 7 hours
        user_id: 'active_user',
      })),
      ...Array(20).fill(null).map((_, i) => ({
        event_type: 'buddy.checkin.completed',
        timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000), // Daily
        user_id: 'active_user',
      })),
    ];

    // Raw points: (10×10) + (50×5) + (80×15) + (40×8) + (100×20) + (20×3) = 3930
    const vis = calculateUserVIS('active_user', events, DEFAULT_VIS_CONFIG, null);

    expect(vis.raw_points).toBe(3930);
    expect(vis.current_vis).toBeGreaterThan(3500); // Minimal decay (all recent)
    expect(vis.activity_breakdown.matches).toBe(10);
    expect(vis.activity_breakdown.events).toBe(50);
    expect(vis.activity_breakdown.skill_shares).toBe(80);
  });

  it('Scenario 2: Declining Engagement (old events)', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    const events = [
      ...Array(5).fill(null).map(() => ({
        event_type: 'buddy.match.created',
        timestamp: new Date('2023-10-17T12:00:00Z'), // 90 days ago
        user_id: 'declining_user',
      })),
      ...Array(10).fill(null).map(() => ({
        event_type: 'buddy.event.attended',
        timestamp: new Date('2023-11-16T12:00:00Z'), // 60 days ago
        user_id: 'declining_user',
      })),
      ...Array(2).fill(null).map(() => ({
        event_type: 'buddy.skill_share.completed',
        timestamp: new Date('2023-08-18T12:00:00Z'), // 150 days ago
        user_id: 'declining_user',
      })),
    ];

    // Raw points: (5×10) + (10×5) + (2×15) = 130
    const vis = calculateUserVIS('declining_user', events, DEFAULT_VIS_CONFIG, null);

    expect(vis.raw_points).toBe(130);
    expect(vis.current_vis).toBeLessThan(100); // Significant decay
    expect(vis.current_vis).toBeGreaterThan(30); // But not zero
  });
});
