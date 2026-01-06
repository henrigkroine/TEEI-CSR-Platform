/**
 * Mentorship Tile Aggregator
 * Aggregates metrics for Mentorship program
 * Data source: kintell_sessions with sessionType='mentorship'
 */

import { db, kintellSessions } from '@teei/shared-schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { MentorshipTile, MentorshipTileData } from '@teei/shared-types';
import {
  generateTileMetadata,
  getDefaultPeriod,
  calculateRate,
  calculateAverage,
  round,
  getVISForPeriod,
  getSROIForPeriod,
} from './base-aggregator.js';
import { randomUUID } from 'crypto';

/**
 * Aggregate Mentorship Tile data for a company
 */
export async function aggregateMentorshipTile(
  companyId: string,
  period?: { start: string; end: string }
): Promise<MentorshipTile> {
  const actualPeriod = period || getDefaultPeriod();

  // Query mentorship sessions in period
  const sessions = await db
    .select({
      id: kintellSessions.id,
      scheduledAt: kintellSessions.scheduledAt,
      completedAt: kintellSessions.completedAt,
      durationMinutes: kintellSessions.durationMinutes,
      participantId: kintellSessions.participantId,
      volunteerId: kintellSessions.volunteerId,
      rating: kintellSessions.rating,
    })
    .from(kintellSessions)
    .where(
      and(
        eq(kintellSessions.sessionType, 'mentorship'),
        gte(kintellSessions.scheduledAt, new Date(actualPeriod.start)),
        lte(kintellSessions.scheduledAt, new Date(actualPeriod.end))
      )
    );

  // Calculate bookings
  const totalBookings = sessions.length;
  const scheduledBookings = sessions.filter((s) => s.scheduledAt !== null).length;
  const completedBookings = sessions.filter((s) => s.completedAt !== null).length;

  // A booking is "cancelled" if it was scheduled but never completed
  // and it's past the scheduled time by more than 24 hours
  const now = new Date();
  const cancelledBookings = sessions.filter((s) => {
    if (!s.scheduledAt || s.completedAt) return false;
    const scheduledTime = new Date(s.scheduledAt);
    const hoursSinceScheduled = (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceScheduled > 24;
  }).length;

  // Calculate attendance
  const attendanceRate = calculateRate(completedBookings, scheduledBookings);

  const durations = sessions
    .filter((s) => s.completedAt && s.durationMinutes)
    .map((s) => s.durationMinutes!);
  const avgSessionDuration = durations.length > 0 ? calculateAverage(durations) : 0;

  // Calculate no-show rate
  // No-show = scheduled - completed - cancelled
  const noShows = scheduledBookings - completedBookings - cancelledBookings;
  const noShowRate = calculateRate(noShows, scheduledBookings);

  // Calculate repeat mentoring
  const uniqueMentors = new Set(sessions.map((s) => s.volunteerId)).size;
  const uniqueMentees = new Set(sessions.map((s) => s.participantId)).size;

  // Count sessions per mentee
  const menteeSessionCounts = new Map<string, number>();
  sessions.forEach((s) => {
    const count = menteeSessionCounts.get(s.participantId) || 0;
    menteeSessionCounts.set(s.participantId, count + 1);
  });
  const avgSessionsPerMentee = uniqueMentees > 0
    ? Array.from(menteeSessionCounts.values()).reduce((sum, count) => sum + count, 0) / uniqueMentees
    : 0;

  // Count mentors with multiple sessions
  const mentorSessionCounts = new Map<string, number>();
  sessions.forEach((s) => {
    const count = mentorSessionCounts.get(s.volunteerId) || 0;
    mentorSessionCounts.set(s.volunteerId, count + 1);
  });
  const mentorsWithMultipleSessions = Array.from(mentorSessionCounts.values()).filter(
    (count) => count >= 2
  ).length;

  // Repeat rate: % of mentees who had 2+ sessions
  const menteesWithMultipleSessions = Array.from(menteeSessionCounts.values()).filter(
    (count) => count >= 2
  ).length;
  const repeatRate = calculateRate(menteesWithMultipleSessions, uniqueMentees);

  // Feedback scores (if available)
  const ratings = sessions
    .filter((s) => s.rating !== null)
    .map((s) => parseFloat(s.rating!));

  const feedback = ratings.length > 0
    ? {
        avgMentorRating: round(calculateAverage(ratings), 2),
        avgMenteeRating: round(calculateAverage(ratings), 2),
        feedbackCount: ratings.length,
      }
    : undefined;

  // Fetch VIS and SROI if available
  const vis = await getVISForPeriod(companyId, actualPeriod);
  const sroi = await getSROIForPeriod(companyId, actualPeriod);

  // Build tile data
  const tileData: MentorshipTileData = {
    bookings: {
      total: totalBookings,
      scheduled: scheduledBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
    },
    attendance: {
      attendanceRate: round(attendanceRate, 3),
      avgSessionDuration: round(avgSessionDuration, 1),
      totalSessions: completedBookings,
    },
    noShowRate: round(noShowRate, 3),
    repeatMentoring: {
      uniqueMentors,
      uniqueMentees,
      avgSessionsPerMentee: round(avgSessionsPerMentee, 2),
      mentorsWithMultipleSessions,
      repeatRate: round(repeatRate, 3),
    },
    feedback,
    vis,
    sroi,
  };

  // Build metadata
  const metadata = {
    ...generateTileMetadata(companyId, 'mentorship', actualPeriod),
    tileId: randomUUID(),
  };

  return {
    metadata,
    data: tileData,
  };
}
