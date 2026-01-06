/**
 * Mentorship Program Tile Aggregator
 * Aggregates data for Mentorship program tiles
 */

import { db } from '@teei/shared-schema/db';
import { kintellSessions, buddyMatches, buddyFeedback, users } from '@teei/shared-schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { MentorshipTile } from '@teei/shared-types';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('mentorship-aggregator');

export interface MentorshipTileParams {
  companyId: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Aggregate mentorship program data into a MentorshipTile
 */
export async function aggregateMentorshipTile(
  params: MentorshipTileParams
): Promise<MentorshipTile> {
  const { companyId, periodStart, periodEnd } = params;
  const startTime = Date.now();

  try {
    logger.info({ companyId, periodStart, periodEnd }, 'Aggregating mentorship tile');

    // Get all mentorship sessions (from kintellSessions with sessionType='mentorship')
    const sessions = await db
      .select({
        id: kintellSessions.id,
        participantId: kintellSessions.participantId,
        volunteerId: kintellSessions.volunteerId,
        scheduledAt: kintellSessions.scheduledAt,
        completedAt: kintellSessions.completedAt,
        rating: kintellSessions.rating,
      })
      .from(kintellSessions)
      .leftJoin(users, eq(kintellSessions.participantId, users.id))
      .where(
        and(
          eq(kintellSessions.sessionType, 'mentorship'),
          eq(users.companyId, companyId),
          gte(kintellSessions.scheduledAt, new Date(periodStart)),
          lte(kintellSessions.scheduledAt, new Date(periodEnd))
        )
      );

    // Count bookings (scheduled sessions)
    const bookingsCount = sessions.length;

    // Count attended sessions
    const attendedCount = sessions.filter(s => s.completedAt).length;

    // Calculate attendance and no-show rates
    const attendanceRate = bookingsCount > 0
      ? (attendedCount / bookingsCount) * 100
      : 0;
    const noShowRate = bookingsCount > 0
      ? ((bookingsCount - attendedCount) / bookingsCount) * 100
      : 0;

    // Count unique mentees and mentors
    const uniqueMentees = new Set(sessions.map(s => s.participantId)).size;
    const uniqueMentors = new Set(sessions.map(s => s.volunteerId)).size;

    // Calculate sessions per mentee
    const menteeSessionCounts = new Map<string, number>();
    sessions.forEach(s => {
      if (s.completedAt) {
        menteeSessionCounts.set(
          s.participantId,
          (menteeSessionCounts.get(s.participantId) || 0) + 1
        );
      }
    });

    const avgSessionsPerMentee = uniqueMentees > 0
      ? attendedCount / uniqueMentees
      : 0;

    // Count repeat mentoring (mentees with 2+ sessions)
    const repeatMentoringCount = Array.from(menteeSessionCounts.values()).filter(
      count => count >= 2
    ).length;

    // Breakdown: moderate (2-3 sessions) and high (4+ sessions)
    const moderateRepeat = Array.from(menteeSessionCounts.values()).filter(
      count => count >= 2 && count <= 3
    ).length;
    const highRepeat = Array.from(menteeSessionCounts.values()).filter(
      count => count >= 4
    ).length;

    // Calculate average mentor rating from feedback
    const feedbackData = await db
      .select({
        rating: buddyFeedback.rating,
      })
      .from(buddyFeedback)
      .leftJoin(buddyMatches, eq(buddyFeedback.matchId, buddyMatches.id))
      .leftJoin(users, eq(buddyMatches.participantId, users.id))
      .where(
        and(
          eq(users.companyId, companyId),
          eq(buddyFeedback.fromRole, 'participant'),
          gte(buddyFeedback.submittedAt, new Date(periodStart)),
          lte(buddyFeedback.submittedAt, new Date(periodEnd))
        )
      );

    let avgMentorRating: number | undefined;
    if (feedbackData.length > 0) {
      const totalRating = feedbackData.reduce(
        (sum, f) => sum + (f.rating ? parseFloat(f.rating.toString()) : 0),
        0
      );
      // Convert from 0-1 scale to 0-5 scale
      avgMentorRating = (totalRating / feedbackData.length) * 5;
    }

    const tile: MentorshipTile = {
      id: `mentorship-${companyId}-${periodStart}`,
      type: 'mentorship',
      companyId,
      periodStart,
      periodEnd,
      lastUpdated: new Date().toISOString(),
      metrics: {
        bookingsCount,
        attendedCount,
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        noShowRate: parseFloat(noShowRate.toFixed(2)),
        repeatMentoringCount,
        avgSessionsPerMentee: parseFloat(avgSessionsPerMentee.toFixed(2)),
        uniqueMentees,
        uniqueMentors,
        avgMentorRating: avgMentorRating
          ? parseFloat(avgMentorRating.toFixed(2))
          : undefined,
      },
      repeatMentoringBreakdown: {
        moderate: moderateRepeat,
        high: highRepeat,
      },
    };

    const duration = Date.now() - startTime;
    logger.info({ companyId, duration, bookings: bookingsCount }, 'Mentorship tile aggregated');

    return tile;
  } catch (error) {
    logger.error({ error, companyId, periodStart, periodEnd }, 'Failed to aggregate mentorship tile');
    throw error;
  }
}
