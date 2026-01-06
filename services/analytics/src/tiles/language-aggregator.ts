/**
 * Language Program Tile Aggregator
 * Aggregates data for Language Learning program tiles
 */

import { db } from '@teei/shared-schema/db';
import { kintellSessions, metricsCompanyPeriod, users } from '@teei/shared-schema';
import { eq, and, gte, lte, sql, count, avg, sum } from 'drizzle-orm';
import type { LanguageTile } from '@teei/shared-types';
import { calculateVISForCompany } from '../pipelines/aggregate.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('language-aggregator');

export interface LanguageTileParams {
  companyId: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Aggregate language program data into a LanguageTile
 */
export async function aggregateLanguageTile(
  params: LanguageTileParams
): Promise<LanguageTile> {
  const { companyId, periodStart, periodEnd } = params;
  const startTime = Date.now();

  try {
    logger.info({ companyId, periodStart, periodEnd }, 'Aggregating language tile');

    // Get all language sessions in the period
    const sessions = await db
      .select({
        id: kintellSessions.id,
        participantId: kintellSessions.participantId,
        volunteerId: kintellSessions.volunteerId,
        scheduledAt: kintellSessions.scheduledAt,
        completedAt: kintellSessions.completedAt,
        durationMinutes: kintellSessions.durationMinutes,
        rating: kintellSessions.rating,
      })
      .from(kintellSessions)
      .leftJoin(users, eq(kintellSessions.participantId, users.id))
      .where(
        and(
          eq(kintellSessions.sessionType, 'language'),
          eq(users.companyId, companyId),
          gte(kintellSessions.scheduledAt, new Date(periodStart)),
          lte(kintellSessions.scheduledAt, new Date(periodEnd))
        )
      );

    // Count unique participants
    const uniqueParticipants = new Set(sessions.map(s => s.participantId)).size;

    // Count total sessions
    const totalSessions = sessions.filter(s => s.completedAt).length;

    // Calculate volunteer hours (sum of completed sessions duration)
    const volunteerHours = sessions
      .filter(s => s.completedAt && s.durationMinutes)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60;

    // Calculate period duration in days
    const periodDays = Math.ceil(
      (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24)
    );
    const periodWeeks = periodDays / 7;

    // Calculate sessions per week (average)
    const sessionsPerWeek = periodWeeks > 0 ? totalSessions / periodWeeks : 0;

    // Estimate cohort duration (assume typical cohorts are 2-3 months)
    const cohortDurationMonths = periodDays > 60 ? 3 : 2;

    // Calculate retention rate (participants who completed at least 4 sessions / total participants)
    const participantSessionCounts = new Map<string, number>();
    sessions.forEach(s => {
      if (s.completedAt) {
        participantSessionCounts.set(
          s.participantId,
          (participantSessionCounts.get(s.participantId) || 0) + 1
        );
      }
    });

    const retainedParticipants = Array.from(participantSessionCounts.values()).filter(
      count => count >= 4
    ).length;
    const retentionRate = uniqueParticipants > 0
      ? (retainedParticipants / uniqueParticipants) * 100
      : 0;

    // Calculate average attendance rate
    const scheduledSessions = sessions.length;
    const avgAttendanceRate = scheduledSessions > 0
      ? (totalSessions / scheduledSessions) * 100
      : 0;

    // Estimate active cohorts (assume 1 cohort per 15 participants)
    const activeCohorts = Math.max(1, Math.ceil(uniqueParticipants / 15));

    // Frequency breakdown (estimate: assume 60% are 2x/week, 40% are 3x/week)
    const twicePerWeek = Math.floor(activeCohorts * 0.6);
    const thricePerWeek = Math.ceil(activeCohorts * 0.4);

    // Duration breakdown (estimate: assume 70% are 2 months, 30% are 3 months)
    const twoMonths = Math.floor(activeCohorts * 0.7);
    const threeMonths = Math.ceil(activeCohorts * 0.3);

    // Get VIS score if available
    let visScore: number | undefined;
    try {
      const visReport = await calculateVISForCompany(companyId, periodStart, periodEnd);
      visScore = visReport.visScore;
    } catch (error) {
      logger.warn({ error, companyId }, 'Failed to calculate VIS for language tile');
    }

    // Get SROI from metrics table if available
    const metricsData = await db
      .select({
        sroiRatio: metricsCompanyPeriod.sroiRatio,
      })
      .from(metricsCompanyPeriod)
      .where(
        and(
          eq(metricsCompanyPeriod.companyId, companyId),
          gte(metricsCompanyPeriod.periodStart, periodStart),
          lte(metricsCompanyPeriod.periodEnd, periodEnd)
        )
      )
      .limit(1);

    const sroiRatio = metricsData[0]?.sroiRatio
      ? parseFloat(metricsData[0].sroiRatio)
      : undefined;

    const tile: LanguageTile = {
      id: `language-${companyId}-${periodStart}`,
      type: 'language',
      companyId,
      periodStart,
      periodEnd,
      lastUpdated: new Date().toISOString(),
      visScore,
      sroiRatio,
      metrics: {
        sessionsPerWeek: parseFloat(sessionsPerWeek.toFixed(2)),
        cohortDurationMonths,
        volunteerHours: parseFloat(volunteerHours.toFixed(2)),
        retentionRate: parseFloat(retentionRate.toFixed(2)),
        participantsCount: uniqueParticipants,
        totalSessions,
        avgAttendanceRate: parseFloat(avgAttendanceRate.toFixed(2)),
        activeCohorts,
      },
      frequencyBreakdown: {
        twicePerWeek,
        thricePerWeek,
      },
      durationBreakdown: {
        twoMonths,
        threeMonths,
      },
    };

    const duration = Date.now() - startTime;
    logger.info({ companyId, duration, sessions: totalSessions }, 'Language tile aggregated');

    return tile;
  } catch (error) {
    logger.error({ error, companyId, periodStart, periodEnd }, 'Failed to aggregate language tile');
    throw error;
  }
}
