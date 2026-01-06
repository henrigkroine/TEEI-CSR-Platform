/**
 * Volunteer Impact Score (VIS) Calculator
 *
 * Computes engagement-based impact scores for Buddy System participants
 * using point-based system with exponential decay for time weighting.
 *
 * @module vis-calculator
 */

import { Pool } from 'pg';

/**
 * Activity point values for VIS calculation
 */
export const ACTIVITY_POINTS = {
  MATCH_CREATED: 10,
  EVENT_ATTENDED: 5,
  SKILL_SHARE_COMPLETED: 15,  // ⭐⭐⭐ high value
  FEEDBACK_SUBMITTED: 8,
  MILESTONE_REACHED: 20,       // ⭐⭐⭐ high value
  CHECKIN_COMPLETED: 3,
} as const;

/**
 * Event type to point mapping
 */
export const EVENT_TYPE_POINTS: Record<string, number> = {
  'buddy.match.created': ACTIVITY_POINTS.MATCH_CREATED,
  'buddy.match.ended': 0, // No points for ending
  'buddy.event.attended': ACTIVITY_POINTS.EVENT_ATTENDED,
  'buddy.event.logged': ACTIVITY_POINTS.EVENT_ATTENDED, // Treat logged as attended
  'buddy.skill_share.completed': ACTIVITY_POINTS.SKILL_SHARE_COMPLETED,
  'buddy.feedback.submitted': ACTIVITY_POINTS.FEEDBACK_SUBMITTED,
  'buddy.milestone.reached': ACTIVITY_POINTS.MILESTONE_REACHED,
  'buddy.checkin.completed': ACTIVITY_POINTS.CHECKIN_COMPLETED,
};

/**
 * Configuration for VIS calculation
 */
export interface VISConfig {
  /** Lambda parameter for exponential decay (default: 0.01) */
  lambda: number;
  /** Whether to enable decay weighting (default: true) */
  enableDecay: boolean;
}

/**
 * Default VIS configuration
 */
export const DEFAULT_VIS_CONFIG: VISConfig = {
  lambda: 0.01,
  enableDecay: true,
};

/**
 * Activity breakdown for VIS calculation
 */
export interface ActivityBreakdown {
  matches: number;
  events: number;
  skill_shares: number;
  feedback: number;
  milestones: number;
  checkins: number;
}

/**
 * Complete VIS calculation result
 */
export interface VISCalculation {
  user_id: string;
  profile_id: string | null;
  current_vis: number;
  raw_points: number;
  decay_adjusted_points: number;
  percentile: number | null;
  rank: number | null;
  activity_breakdown: ActivityBreakdown;
  last_activity_date: Date | null;
  calculated_at: Date;
}

/**
 * Event data for VIS calculation
 */
interface EventForVIS {
  event_type: string;
  timestamp: Date;
  user_id: string;
}

/**
 * Calculate exponential decay weight
 *
 * Formula: weight = exp(-lambda × days_ago)
 *
 * @param daysAgo - Number of days since the activity
 * @param lambda - Decay rate parameter (default: 0.01)
 * @returns Decay weight between 0 and 1
 */
export function calculateDecayWeight(daysAgo: number, lambda: number = 0.01): number {
  return Math.exp(-lambda * daysAgo);
}

/**
 * Calculate days ago from a timestamp
 *
 * @param timestamp - Activity timestamp
 * @param referenceDate - Reference date (default: now)
 * @returns Number of days ago (can be fractional)
 */
export function calculateDaysAgo(timestamp: Date, referenceDate: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return (referenceDate.getTime() - timestamp.getTime()) / msPerDay;
}

/**
 * Calculate points for a single event with decay
 *
 * @param eventType - Type of event
 * @param timestamp - When the event occurred
 * @param config - VIS configuration
 * @param referenceDate - Reference date for decay calculation
 * @returns Decay-adjusted points
 */
export function calculateEventPoints(
  eventType: string,
  timestamp: Date,
  config: VISConfig = DEFAULT_VIS_CONFIG,
  referenceDate: Date = new Date()
): { raw: number; adjusted: number; daysAgo: number; weight: number } {
  const rawPoints = EVENT_TYPE_POINTS[eventType] || 0;

  if (!config.enableDecay) {
    return {
      raw: rawPoints,
      adjusted: rawPoints,
      daysAgo: 0,
      weight: 1.0,
    };
  }

  const daysAgo = calculateDaysAgo(timestamp, referenceDate);
  const weight = calculateDecayWeight(daysAgo, config.lambda);
  const adjustedPoints = rawPoints * weight;

  return {
    raw: rawPoints,
    adjusted: adjustedPoints,
    daysAgo,
    weight,
  };
}

/**
 * Calculate activity breakdown from events
 *
 * @param events - List of events
 * @returns Activity counts by category
 */
export function calculateActivityBreakdown(events: EventForVIS[]): ActivityBreakdown {
  const breakdown: ActivityBreakdown = {
    matches: 0,
    events: 0,
    skill_shares: 0,
    feedback: 0,
    milestones: 0,
    checkins: 0,
  };

  for (const event of events) {
    switch (event.event_type) {
      case 'buddy.match.created':
        breakdown.matches++;
        break;
      case 'buddy.event.attended':
      case 'buddy.event.logged':
        breakdown.events++;
        break;
      case 'buddy.skill_share.completed':
        breakdown.skill_shares++;
        break;
      case 'buddy.feedback.submitted':
        breakdown.feedback++;
        break;
      case 'buddy.milestone.reached':
        breakdown.milestones++;
        break;
      case 'buddy.checkin.completed':
        breakdown.checkins++;
        break;
    }
  }

  return breakdown;
}

/**
 * Calculate VIS for a single user from their events
 *
 * @param userId - User ID from Buddy System
 * @param events - User's activity events
 * @param config - VIS configuration
 * @param profileId - Optional profile ID for linking
 * @returns Complete VIS calculation
 */
export function calculateUserVIS(
  userId: string,
  events: EventForVIS[],
  config: VISConfig = DEFAULT_VIS_CONFIG,
  profileId: string | null = null
): VISCalculation {
  let rawPoints = 0;
  let decayAdjustedPoints = 0;
  const referenceDate = new Date();
  let lastActivityDate: Date | null = null;

  // Calculate points for each event
  for (const event of events) {
    const points = calculateEventPoints(event.event_type, event.timestamp, config, referenceDate);
    rawPoints += points.raw;
    decayAdjustedPoints += points.adjusted;

    // Track most recent activity
    if (!lastActivityDate || event.timestamp > lastActivityDate) {
      lastActivityDate = event.timestamp;
    }
  }

  // Calculate activity breakdown
  const activityBreakdown = calculateActivityBreakdown(events);

  return {
    user_id: userId,
    profile_id: profileId,
    current_vis: Math.round(decayAdjustedPoints * 100) / 100, // Round to 2 decimals
    raw_points: rawPoints,
    decay_adjusted_points: Math.round(decayAdjustedPoints * 100) / 100,
    percentile: null, // Will be calculated in batch
    rank: null, // Will be calculated in batch
    activity_breakdown: activityBreakdown,
    last_activity_date: lastActivityDate,
    calculated_at: new Date(),
  };
}

/**
 * VIS Calculator class for database operations
 */
export class VISCalculator {
  constructor(private pool: Pool, private config: VISConfig = DEFAULT_VIS_CONFIG) {}

  /**
   * Fetch events for a specific user
   */
  async fetchUserEvents(userId: string): Promise<EventForVIS[]> {
    const result = await this.pool.query<EventForVIS>(
      `SELECT event_type, timestamp, user_id
       FROM buddy_system_events
       WHERE user_id = $1
       AND processing_status = 'completed'
       ORDER BY timestamp ASC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Fetch events for all users
   */
  async fetchAllUserEvents(): Promise<Map<string, EventForVIS[]>> {
    const result = await this.pool.query<EventForVIS>(
      `SELECT event_type, timestamp, user_id
       FROM buddy_system_events
       WHERE processing_status = 'completed'
       ORDER BY user_id, timestamp ASC`
    );

    const eventsByUser = new Map<string, EventForVIS[]>();
    for (const event of result.rows) {
      if (!eventsByUser.has(event.user_id)) {
        eventsByUser.set(event.user_id, []);
      }
      eventsByUser.get(event.user_id)!.push(event);
    }

    return eventsByUser;
  }

  /**
   * Calculate VIS for a single user
   */
  async calculateVISForUser(userId: string, profileId: string | null = null): Promise<VISCalculation> {
    const events = await this.fetchUserEvents(userId);
    return calculateUserVIS(userId, events, this.config, profileId);
  }

  /**
   * Calculate VIS for all users with percentile rankings
   */
  async calculateVISForAllUsers(): Promise<VISCalculation[]> {
    const eventsByUser = await this.fetchAllUserEvents();
    const calculations: VISCalculation[] = [];

    // Calculate VIS for each user
    for (const [userId, events] of eventsByUser) {
      const vis = calculateUserVIS(userId, events, this.config);
      calculations.push(vis);
    }

    // Sort by VIS descending
    calculations.sort((a, b) => b.current_vis - a.current_vis);

    // Calculate ranks and percentiles
    const totalUsers = calculations.length;
    calculations.forEach((calc, index) => {
      calc.rank = index + 1;
      calc.percentile = totalUsers > 0
        ? Math.round(((totalUsers - index) / totalUsers) * 10000) / 100 // Round to 2 decimals
        : 0;
    });

    return calculations;
  }

  /**
   * Save VIS calculation to database
   */
  async saveVIS(vis: VISCalculation): Promise<void> {
    await this.pool.query(
      `INSERT INTO vis_scores (
        user_id, profile_id, current_vis, raw_points, decay_adjusted_points,
        percentile, rank, activity_breakdown, last_activity_date, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET
        profile_id = EXCLUDED.profile_id,
        current_vis = EXCLUDED.current_vis,
        raw_points = EXCLUDED.raw_points,
        decay_adjusted_points = EXCLUDED.decay_adjusted_points,
        percentile = EXCLUDED.percentile,
        rank = EXCLUDED.rank,
        activity_breakdown = EXCLUDED.activity_breakdown,
        last_activity_date = EXCLUDED.last_activity_date,
        calculated_at = EXCLUDED.calculated_at`,
      [
        vis.user_id,
        vis.profile_id,
        vis.current_vis,
        vis.raw_points,
        vis.decay_adjusted_points,
        vis.percentile,
        vis.rank,
        JSON.stringify(vis.activity_breakdown),
        vis.last_activity_date,
        vis.calculated_at,
      ]
    );
  }

  /**
   * Batch save all VIS calculations
   */
  async batchSaveVIS(calculations: VISCalculation[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const vis of calculations) {
        await client.query(
          `INSERT INTO vis_scores (
            user_id, profile_id, current_vis, raw_points, decay_adjusted_points,
            percentile, rank, activity_breakdown, last_activity_date, calculated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (user_id) DO UPDATE SET
            profile_id = EXCLUDED.profile_id,
            current_vis = EXCLUDED.current_vis,
            raw_points = EXCLUDED.raw_points,
            decay_adjusted_points = EXCLUDED.decay_adjusted_points,
            percentile = EXCLUDED.percentile,
            rank = EXCLUDED.rank,
            activity_breakdown = EXCLUDED.activity_breakdown,
            last_activity_date = EXCLUDED.last_activity_date,
            calculated_at = EXCLUDED.calculated_at`,
          [
            vis.user_id,
            vis.profile_id,
            vis.current_vis,
            vis.raw_points,
            vis.decay_adjusted_points,
            vis.percentile,
            vis.rank,
            JSON.stringify(vis.activity_breakdown),
            vis.last_activity_date,
            vis.calculated_at,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get VIS for a specific user
   */
  async getVIS(userId: string): Promise<VISCalculation | null> {
    const result = await this.pool.query(
      `SELECT user_id, profile_id, current_vis, raw_points, decay_adjusted_points,
              percentile, rank, activity_breakdown, last_activity_date, calculated_at
       FROM vis_scores
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      user_id: row.user_id,
      profile_id: row.profile_id,
      current_vis: parseFloat(row.current_vis),
      raw_points: row.raw_points,
      decay_adjusted_points: parseFloat(row.decay_adjusted_points),
      percentile: row.percentile ? parseFloat(row.percentile) : null,
      rank: row.rank,
      activity_breakdown: row.activity_breakdown,
      last_activity_date: row.last_activity_date,
      calculated_at: row.calculated_at,
    };
  }

  /**
   * Get leaderboard (top N users by VIS)
   */
  async getLeaderboard(limit: number = 100): Promise<VISCalculation[]> {
    const result = await this.pool.query(
      `SELECT user_id, profile_id, current_vis, raw_points, decay_adjusted_points,
              percentile, rank, activity_breakdown, last_activity_date, calculated_at
       FROM vis_scores
       ORDER BY current_vis DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      user_id: row.user_id,
      profile_id: row.profile_id,
      current_vis: parseFloat(row.current_vis),
      raw_points: row.raw_points,
      decay_adjusted_points: parseFloat(row.decay_adjusted_points),
      percentile: row.percentile ? parseFloat(row.percentile) : null,
      rank: row.rank,
      activity_breakdown: row.activity_breakdown,
      last_activity_date: row.last_activity_date,
      calculated_at: row.calculated_at,
    }));
  }

  /**
   * Get users above a specific percentile
   */
  async getUsersAbovePercentile(percentile: number): Promise<VISCalculation[]> {
    const result = await this.pool.query(
      `SELECT user_id, profile_id, current_vis, raw_points, decay_adjusted_points,
              percentile, rank, activity_breakdown, last_activity_date, calculated_at
       FROM vis_scores
       WHERE percentile >= $1
       ORDER BY current_vis DESC`,
      [percentile]
    );

    return result.rows.map(row => ({
      user_id: row.user_id,
      profile_id: row.profile_id,
      current_vis: parseFloat(row.current_vis),
      raw_points: row.raw_points,
      decay_adjusted_points: parseFloat(row.decay_adjusted_points),
      percentile: row.percentile ? parseFloat(row.percentile) : null,
      rank: row.rank,
      activity_breakdown: row.activity_breakdown,
      last_activity_date: row.last_activity_date,
      calculated_at: row.calculated_at,
    }));
  }

  /**
   * Full recalculation of all VIS scores (batch job)
   */
  async recalculateAll(): Promise<{ processed: number; duration: number }> {
    const startTime = Date.now();

    const calculations = await this.calculateVISForAllUsers();
    await this.batchSaveVIS(calculations);

    const duration = Date.now() - startTime;
    return {
      processed: calculations.length,
      duration,
    };
  }
}
