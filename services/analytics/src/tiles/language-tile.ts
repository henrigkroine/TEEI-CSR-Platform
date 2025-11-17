/**
 * Language Tile Aggregator
 * Aggregates metrics for Language Learning program
 * Data source: kintell_sessions with sessionType='language'
 */

import { db, kintellSessions, users } from '@teei/shared-schema';
import { eq, and, gte, lte, isNotNull, sql, count, avg, sum } from 'drizzle-orm';
import { LanguageTile, LanguageTileData } from '@teei/shared-types';
import {
  generateTileMetadata,
  getDefaultPeriod,
  calculateRate,
  calculateAverage,
  round,
  getWeeksBetween,
  getVISForPeriod,
  getSROIForPeriod,
} from './base-aggregator.js';
import { randomUUID } from 'crypto';

/**
 * Aggregate Language Tile data for a company
 */
export async function aggregateLanguageTile(
  companyId: string,
  period?: { start: string; end: string }
): Promise<LanguageTile> {
  const actualPeriod = period || getDefaultPeriod();

  // Query language sessions in period
  // Note: In production, you'd join with company enrollment/membership data
  // For now, we'll query all language sessions in the period
  const sessions = await db
    .select({
      id: kintellSessions.id,
      scheduledAt: kintellSessions.scheduledAt,
      completedAt: kintellSessions.completedAt,
      durationMinutes: kintellSessions.durationMinutes,
      participantId: kintellSessions.participantId,
      volunteerId: kintellSessions.volunteerId,
      languageLevel: kintellSessions.languageLevel,
      rating: kintellSessions.rating,
    })
    .from(kintellSessions)
    .where(
      and(
        eq(kintellSessions.sessionType, 'language'),
        gte(kintellSessions.scheduledAt, new Date(actualPeriod.start)),
        lte(kintellSessions.scheduledAt, new Date(actualPeriod.end))
      )
    );

  // Calculate sessions per week
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completedAt !== null);
  const weeks = getWeeksBetween(actualPeriod.start, actualPeriod.end);
  const sessionsPerWeek = weeks > 0 ? round(totalSessions / weeks, 1) : 0;

  // Calculate volunteer hours
  const totalMinutes = completedSessions.reduce(
    (sum, s) => sum + (s.durationMinutes || 0),
    0
  );
  const totalHours = round(totalMinutes / 60, 1);
  const uniqueVolunteers = new Set(sessions.map((s) => s.volunteerId)).size;
  const avgMinutesPerSession = completedSessions.length > 0
    ? totalMinutes / completedSessions.length
    : 0;
  const hoursPerSession = round(avgMinutesPerSession / 60, 2);

  // Calculate retention metrics
  const uniqueParticipants = new Set(sessions.map((s) => s.participantId));
  const enrollments = uniqueParticipants.size;

  // Define "active" as participants with 2+ completed sessions
  const participantSessionCounts = new Map<string, number>();
  completedSessions.forEach((s) => {
    const count = participantSessionCounts.get(s.participantId) || 0;
    participantSessionCounts.set(s.participantId, count + 1);
  });
  const activeParticipants = Array.from(participantSessionCounts.values()).filter(
    (count) => count >= 2
  ).length;

  // Define "completions" as participants with 8+ completed sessions (typical 2-3 month program)
  const completions = Array.from(participantSessionCounts.values()).filter(
    (count) => count >= 8
  ).length;

  const dropouts = enrollments - activeParticipants;
  const dropoutRate = calculateRate(dropouts, enrollments);
  const retentionRate = 1 - dropoutRate;

  // Language level progression (if available)
  const levelsData = sessions
    .filter((s) => s.languageLevel !== null)
    .map((s) => s.languageLevel!);

  const languageLevels = levelsData.length > 0
    ? {
        averageStartLevel: levelsData[0] || undefined,
        averageCurrentLevel: levelsData[levelsData.length - 1] || undefined,
        progressionRate: undefined, // TODO: Calculate based on level changes
      }
    : undefined;

  // Fetch VIS and SROI if available
  const vis = await getVISForPeriod(companyId, actualPeriod);
  const sroi = await getSROIForPeriod(companyId, actualPeriod);

  // Build tile data
  const tileData: LanguageTileData = {
    sessionsPerWeek,
    targetSessionsPerWeek: 2.5,
    cohortDurationWeeks: weeks,
    targetDurationWeeks: 10,
    volunteerHours: {
      total: totalHours,
      perSession: hoursPerSession,
      uniqueVolunteers,
    },
    retention: {
      enrollments,
      activeParticipants,
      completions,
      dropoutRate: round(dropoutRate, 3),
      retentionRate: round(retentionRate, 3),
    },
    languageLevels,
    vis,
    sroi,
  };

  // Build metadata
  const metadata = {
    ...generateTileMetadata(companyId, 'language', actualPeriod),
    tileId: randomUUID(),
  };

  return {
    metadata,
    data: tileData,
  };
}
