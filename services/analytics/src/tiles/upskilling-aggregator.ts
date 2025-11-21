/**
 * Upskilling Program Tile Aggregator
 * Aggregates data for Upskilling/Training program tiles
 */

import { db } from '@teei/shared-schema/db';
import { learningProgress, users } from '@teei/shared-schema';
import { eq, and, gte, lte, sql, or } from 'drizzle-orm';
import type { UpskillingTile } from '@teei/shared-types';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('upskilling-aggregator');

export interface UpskillingTileParams {
  companyId: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Aggregate upskilling program data into an UpskillingTile
 */
export async function aggregateUpskillingTile(
  params: UpskillingTileParams
): Promise<UpskillingTile> {
  const { companyId, periodStart, periodEnd } = params;
  const startTime = Date.now();

  try {
    logger.info({ companyId, periodStart, periodEnd }, 'Aggregating upskilling tile');

    // Get all learning progress records in the period
    const progressRecords = await db
      .select({
        id: learningProgress.id,
        userId: learningProgress.userId,
        courseId: learningProgress.courseId,
        courseName: learningProgress.courseName,
        status: learningProgress.status,
        startedAt: learningProgress.startedAt,
        completedAt: learningProgress.completedAt,
        metadata: learningProgress.metadata,
      })
      .from(learningProgress)
      .leftJoin(users, eq(learningProgress.userId, users.id))
      .where(
        and(
          eq(users.companyId, companyId),
          or(
            and(
              gte(learningProgress.startedAt, new Date(periodStart)),
              lte(learningProgress.startedAt, new Date(periodEnd))
            ),
            and(
              gte(learningProgress.completedAt, new Date(periodStart)),
              lte(learningProgress.completedAt, new Date(periodEnd))
            )
          )
        )
      );

    // Count enrollments (all records that started in period)
    const enrollments = progressRecords.filter(
      r => r.startedAt &&
           r.startedAt >= new Date(periodStart) &&
           r.startedAt <= new Date(periodEnd)
    );
    const enrollmentsCount = enrollments.length;

    // Count completions (status='completed')
    const completions = progressRecords.filter(
      r => r.status === 'completed' &&
           r.completedAt &&
           r.completedAt >= new Date(periodStart) &&
           r.completedAt <= new Date(periodEnd)
    );
    const completionsCount = completions.length;

    // Estimate placements (assume 60% of completions lead to placement)
    // TODO: Replace with actual placement tracking when available
    const placementsCount = Math.floor(completionsCount * 0.6);

    // Calculate rates
    const completionRate = enrollmentsCount > 0
      ? (completionsCount / enrollmentsCount) * 100
      : 0;
    const placementRate = completionsCount > 0
      ? (placementsCount / completionsCount) * 100
      : 0;

    // Calculate average course duration
    const completedWithDuration = completions.filter(r => r.startedAt && r.completedAt);
    let avgCourseDurationWeeks = 0;
    if (completedWithDuration.length > 0) {
      const totalWeeks = completedWithDuration.reduce((sum, r) => {
        const durationMs = r.completedAt!.getTime() - r.startedAt!.getTime();
        const weeks = durationMs / (1000 * 60 * 60 * 24 * 7);
        return sum + weeks;
      }, 0);
      avgCourseDurationWeeks = totalWeeks / completedWithDuration.length;
    }

    // Count active courses (unique courses with status 'in_progress')
    const activeCourses = new Set(
      progressRecords
        .filter(r => r.status === 'in_progress')
        .map(r => r.courseId)
    );
    const activeCoursesCount = activeCourses.size;

    // Extract locale from metadata (if available) or course name
    const localeBreakdown = {
      UA: 0,
      EN: 0,
      DE: 0,
      NO: 0,
    };

    progressRecords.forEach(r => {
      // Try to extract locale from metadata
      let locale: string | undefined;
      if (r.metadata && typeof r.metadata === 'object') {
        const meta = r.metadata as { locale?: string };
        locale = meta.locale;
      }

      // If no metadata, try to infer from course name
      if (!locale && r.courseName) {
        const name = r.courseName.toLowerCase();
        if (name.includes('ukrainian') || name.includes('ukraine')) locale = 'UA';
        else if (name.includes('english') || name.includes('en')) locale = 'EN';
        else if (name.includes('german') || name.includes('deutsch') || name.includes('de')) locale = 'DE';
        else if (name.includes('norwegian') || name.includes('norsk') || name.includes('no')) locale = 'NO';
      }

      // Default to EN if unknown
      if (!locale) locale = 'EN';

      if (locale in localeBreakdown) {
        localeBreakdown[locale as keyof typeof localeBreakdown]++;
      }
    });

    // Calculate funnel metrics
    const enrollmentToCompletion = completionRate;
    const completionToPlacement = placementRate;
    const enrollmentToPlacement = enrollmentsCount > 0
      ? (placementsCount / enrollmentsCount) * 100
      : 0;

    const tile: UpskillingTile = {
      id: `upskilling-${companyId}-${periodStart}`,
      type: 'upskilling',
      companyId,
      periodStart,
      periodEnd,
      lastUpdated: new Date().toISOString(),
      metrics: {
        enrollmentsCount,
        completionsCount,
        placementsCount,
        completionRate: parseFloat(completionRate.toFixed(2)),
        placementRate: parseFloat(placementRate.toFixed(2)),
        avgCourseDurationWeeks: parseFloat(avgCourseDurationWeeks.toFixed(2)),
        activeCoursesCount,
      },
      localeBreakdown,
      funnelMetrics: {
        enrollmentToCompletion: parseFloat(enrollmentToCompletion.toFixed(2)),
        completionToPlacement: parseFloat(completionToPlacement.toFixed(2)),
        enrollmentToPlacement: parseFloat(enrollmentToPlacement.toFixed(2)),
      },
    };

    const duration = Date.now() - startTime;
    logger.info({ companyId, duration, enrollments: enrollmentsCount }, 'Upskilling tile aggregated');

    return tile;
  } catch (error) {
    logger.error({ error, companyId, periodStart, periodEnd }, 'Failed to aggregate upskilling tile');
    throw error;
  }
}
