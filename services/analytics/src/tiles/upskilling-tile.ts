/**
 * Upskilling Tile Aggregator
 * Aggregates metrics for Upskilling program
 * Data source: learning_progress table
 */

import { db, learningProgress } from '@teei/shared-schema';
import { and, gte, lte, eq, sql } from 'drizzle-orm';
import { UpskillingTile, UpskillingTileData } from '@teei/shared-types';
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
 * Aggregate Upskilling Tile data for a company
 */
export async function aggregateUpskillingTile(
  companyId: string,
  period?: { start: string; end: string }
): Promise<UpskillingTile> {
  const actualPeriod = period || getDefaultPeriod();

  // Query learning progress in period
  const progress = await db
    .select({
      id: learningProgress.id,
      userId: learningProgress.userId,
      courseId: learningProgress.courseId,
      courseName: learningProgress.courseName,
      status: learningProgress.status,
      progressPercent: learningProgress.progressPercent,
      startedAt: learningProgress.startedAt,
      completedAt: learningProgress.completedAt,
      metadata: learningProgress.metadata,
    })
    .from(learningProgress)
    .where(
      and(
        gte(learningProgress.startedAt, new Date(actualPeriod.start)),
        lte(learningProgress.startedAt, new Date(actualPeriod.end))
      )
    );

  // Calculate funnel metrics
  const enrollments = progress.length;
  const inProgress = progress.filter((p) => p.status === 'in_progress').length;
  const completions = progress.filter((p) => p.status === 'completed').length;

  // Placements (job placements after course)
  // Note: This would need to be joined with placement/employment data
  // For now, we'll use metadata if available
  const placements = progress.filter((p) => {
    const metadata = p.metadata as any;
    return metadata?.placement === true || metadata?.employed === true;
  }).length;

  const completionRate = calculateRate(completions, enrollments);
  const placementRate = calculateRate(placements, completions);

  // Course locales
  const localeMap: Record<string, number> = { UA: 0, EN: 0, DE: 0, NO: 0 };
  progress.forEach((p) => {
    const metadata = p.metadata as any;
    const locale = metadata?.locale?.toUpperCase();
    if (locale && locale in localeMap) {
      localeMap[locale]++;
    }
  });

  // Course details
  const uniqueCourses = new Set(progress.map((p) => p.courseId));
  const totalCourses = uniqueCourses.size;

  // Active courses (with at least one in-progress enrollment)
  const activeCourseIds = new Set(
    progress.filter((p) => p.status === 'in_progress').map((p) => p.courseId)
  );
  const activeCourses = activeCourseIds.size;

  // Calculate average course duration
  const completedWithDates = progress.filter(
    (p) => p.status === 'completed' && p.startedAt && p.completedAt
  );
  const courseDurations = completedWithDates.map((p) => {
    const weeks = getWeeksBetween(
      p.startedAt!.toISOString().split('T')[0],
      p.completedAt!.toISOString().split('T')[0]
    );
    return weeks;
  });
  const avgCourseDuration = courseDurations.length > 0
    ? calculateAverage(courseDurations)
    : 0;

  // Top courses by enrollment
  const courseEnrollments = new Map<string, { name: string; count: number; completions: number }>();
  progress.forEach((p) => {
    const existing = courseEnrollments.get(p.courseId) || {
      name: p.courseName || p.courseId,
      count: 0,
      completions: 0,
    };
    existing.count++;
    if (p.status === 'completed') existing.completions++;
    courseEnrollments.set(p.courseId, existing);
  });

  const topCourses = Array.from(courseEnrollments.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c) => ({
      courseName: c.name,
      enrollments: c.count,
      completionRate: round(calculateRate(c.completions, c.count), 3),
    }));

  // Skills acquired (from metadata if available)
  const allSkills: string[] = [];
  progress.forEach((p) => {
    const metadata = p.metadata as any;
    if (metadata?.skills && Array.isArray(metadata.skills)) {
      allSkills.push(...metadata.skills);
    }
  });

  const skillCounts = new Map<string, number>();
  allSkills.forEach((skill) => {
    skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
  });

  const topSkills = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);

  const totalSkillsAcquired = allSkills.length;
  const uniqueLearners = new Set(progress.map((p) => p.userId)).size;
  const avgSkillsPerLearner = uniqueLearners > 0 ? totalSkillsAcquired / uniqueLearners : 0;

  const skills = topSkills.length > 0
    ? {
        totalSkillsAcquired,
        avgSkillsPerLearner: round(avgSkillsPerLearner, 2),
        topSkills,
      }
    : undefined;

  // Fetch VIS and SROI if available
  const vis = await getVISForPeriod(companyId, actualPeriod);
  const sroi = await getSROIForPeriod(companyId, actualPeriod);

  // Build tile data
  const tileData: UpskillingTileData = {
    funnel: {
      enrollments,
      inProgress,
      completions,
      placements,
      completionRate: round(completionRate, 3),
      placementRate: round(placementRate, 3),
    },
    locales: {
      UA: localeMap.UA || undefined,
      EN: localeMap.EN || undefined,
      DE: localeMap.DE || undefined,
      NO: localeMap.NO || undefined,
    },
    courses: {
      totalCourses,
      activeCourses,
      avgCourseDuration: round(avgCourseDuration, 1),
      topCourses,
    },
    skills,
    vis,
    sroi,
  };

  // Build metadata
  const metadata = {
    ...generateTileMetadata(companyId, 'upskilling', actualPeriod),
    tileId: randomUUID(),
  };

  return {
    metadata,
    data: tileData,
  };
}
