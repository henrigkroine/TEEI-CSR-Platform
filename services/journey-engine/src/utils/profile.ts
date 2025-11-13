import { db } from '@teei/shared-schema';
import {
  users,
  buddyMatches,
  buddyEvents,
  buddyCheckins,
  kintellSessions,
  learningProgress,
  programEnrollments,
  outcomeScores,
} from '@teei/shared-schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import type { EvaluationContext } from '../rules/engine.js';

const logger = createServiceLogger('journey-engine:profile');

// Simple in-memory cache
const contextCache = new Map<
  string,
  {
    context: EvaluationContext;
    timestamp: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch participant context for rule evaluation
 * Gathers all data needed: profile, counts, aggregates, scores
 */
export async function fetchParticipantContext(userId: string): Promise<EvaluationContext> {
  // Check cache first
  const cached = contextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug({ userId }, 'Using cached context');
    return cached.context;
  }

  logger.debug({ userId }, 'Fetching fresh context');

  try {
    // Fetch user profile
    const [profile] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!profile) {
      throw new Error(`User not found: ${userId}`);
    }

    // Fetch counts
    const [buddyMatchCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buddyMatches)
      .where(eq(buddyMatches.userId, userId));

    const [buddyEventCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buddyEvents)
      .where(eq(buddyEvents.userId, userId));

    const [buddyCheckinCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(buddyCheckins)
      .where(eq(buddyCheckins.userId, userId));

    const [kintellSessionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kintellSessions)
      .where(eq(kintellSessions.userId, userId));

    // Count kintell sessions by type
    const kintellSessionsByType = await db
      .select({
        sessionType: kintellSessions.sessionType,
        count: sql<number>`count(*)`,
      })
      .from(kintellSessions)
      .where(eq(kintellSessions.userId, userId))
      .groupBy(kintellSessions.sessionType);

    const sessionsByTypeMap: Record<string, number> = {};
    kintellSessionsByType.forEach((row) => {
      if (row.sessionType) {
        sessionsByTypeMap[row.sessionType] = Number(row.count);
      }
    });

    const [learningProgressCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningProgress)
      .where(eq(learningProgress.userId, userId));

    // Fetch aggregates
    const [kintellRatingAvg] = await db
      .select({
        avg: sql<number>`avg(${kintellSessions.rating})`,
      })
      .from(kintellSessions)
      .where(and(eq(kintellSessions.userId, userId), sql`${kintellSessions.rating} is not null`));

    // Get last activity timestamp (most recent among buddy events, kintell sessions, learning progress)
    const lastActivities = await Promise.all([
      db
        .select({ timestamp: buddyEvents.timestamp })
        .from(buddyEvents)
        .where(eq(buddyEvents.userId, userId))
        .orderBy(desc(buddyEvents.timestamp))
        .limit(1),
      db
        .select({ timestamp: kintellSessions.sessionDate })
        .from(kintellSessions)
        .where(eq(kintellSessions.userId, userId))
        .orderBy(desc(kintellSessions.sessionDate))
        .limit(1),
      db
        .select({ timestamp: learningProgress.completedAt })
        .from(learningProgress)
        .where(eq(learningProgress.userId, userId))
        .orderBy(desc(learningProgress.completedAt))
        .limit(1),
    ]);

    const allTimestamps = lastActivities
      .flat()
      .map((a) => a.timestamp)
      .filter(Boolean) as Date[];

    const lastActivity = allTimestamps.length > 0 ? new Date(Math.max(...allTimestamps.map((d) => d.getTime()))) : undefined;

    // Fetch outcome scores (recent Q2Q results)
    const recentOutcomeScores = await db
      .select()
      .from(outcomeScores)
      .where(eq(outcomeScores.userId, userId))
      .orderBy(desc(outcomeScores.timestamp))
      .limit(10);

    // Fetch program enrollments
    const enrollments = await db
      .select()
      .from(programEnrollments)
      .where(eq(programEnrollments.userId, userId));

    // Build context object
    const context: EvaluationContext = {
      userId,
      profile,
      counts: {
        buddy_matches: Number(buddyMatchCount?.count || 0),
        buddy_events: Number(buddyEventCount?.count || 0),
        buddy_checkins: Number(buddyCheckinCount?.count || 0),
        kintell_sessions: Number(kintellSessionCount?.count || 0),
        kintell_sessions_by_type: sessionsByTypeMap,
        learning_progress: Number(learningProgressCount?.count || 0),
      },
      aggregates: {
        avg_kintell_rating: kintellRatingAvg?.avg ? Number(kintellRatingAvg.avg) : undefined,
        last_activity: lastActivity,
      },
      outcome_scores: recentOutcomeScores.map((score) => ({
        dimension: score.dimension,
        score: score.score,
        timestamp: score.timestamp,
      })),
      program_enrollments: enrollments.map((e) => ({
        programType: e.programType,
        status: e.status,
        enrolledAt: e.enrolledAt,
      })),
    };

    // Cache the context
    contextCache.set(userId, {
      context,
      timestamp: Date.now(),
    });

    logger.info({ userId, counts: context.counts }, 'Context fetched');
    return context;
  } catch (error) {
    logger.error({ error, userId }, 'Error fetching participant context');
    throw error;
  }
}

/**
 * Clear cache for a specific user
 */
export function clearContextCache(userId?: string): void {
  if (userId) {
    contextCache.delete(userId);
    logger.debug({ userId }, 'Context cache cleared');
  } else {
    contextCache.clear();
    logger.debug('All context cache cleared');
  }
}

/**
 * Invalidate cache entries older than TTL
 */
export function cleanupContextCache(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, cached] of contextCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      contextCache.delete(userId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug({ cleaned }, 'Context cache cleaned');
  }
}

// Run cleanup every minute
setInterval(cleanupContextCache, 60 * 1000);
