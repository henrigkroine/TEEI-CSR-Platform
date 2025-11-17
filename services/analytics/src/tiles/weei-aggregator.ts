/**
 * WEEI Program Tile Aggregator (Women's Economic Empowerment Initiative)
 * Aggregates data for WEEI program tiles with U:LEARN/U:START/U:GROW/U:LEAD stages
 */

import { db } from '@teei/shared-schema/db';
import { learningProgress, users } from '@teei/shared-schema';
import { eq, and, gte, lte, sql, or, like } from 'drizzle-orm';
import type { WEEITile } from '@teei/shared-types';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('weei-aggregator');

export interface WEEITileParams {
  companyId: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Determine WEEI stage from course name or metadata
 */
function determineWEEIStage(courseName: string | null, metadata: any): string | null {
  // Check metadata first
  if (metadata && typeof metadata === 'object') {
    const meta = metadata as { weeiStage?: string; program?: string };
    if (meta.weeiStage) return meta.weeiStage.toLowerCase();
    if (meta.program && meta.program.toLowerCase().includes('weei')) {
      // Try to extract stage from program name
      const programLower = meta.program.toLowerCase();
      if (programLower.includes('learn')) return 'u:learn';
      if (programLower.includes('start')) return 'u:start';
      if (programLower.includes('grow')) return 'u:grow';
      if (programLower.includes('lead')) return 'u:lead';
    }
  }

  // Try to infer from course name
  if (courseName) {
    const nameLower = courseName.toLowerCase();
    if (nameLower.includes('u:learn') || nameLower.includes('ulearn')) return 'u:learn';
    if (nameLower.includes('u:start') || nameLower.includes('ustart')) return 'u:start';
    if (nameLower.includes('u:grow') || nameLower.includes('ugrow')) return 'u:grow';
    if (nameLower.includes('u:lead') || nameLower.includes('ulead')) return 'u:lead';

    // Alternative patterns
    if (nameLower.includes('foundational') || nameLower.includes('introduction')) return 'u:learn';
    if (nameLower.includes('entrepreneur') || nameLower.includes('startup')) return 'u:start';
    if (nameLower.includes('business growth') || nameLower.includes('scaling')) return 'u:grow';
    if (nameLower.includes('leadership') || nameLower.includes('management')) return 'u:lead';
  }

  return null;
}

/**
 * Aggregate WEEI program data into a WEEITile
 */
export async function aggregateWEEITile(
  params: WEEITileParams
): Promise<WEEITile> {
  const { companyId, periodStart, periodEnd } = params;
  const startTime = Date.now();

  try {
    logger.info({ companyId, periodStart, periodEnd }, 'Aggregating WEEI tile');

    // Get all WEEI-related learning progress records
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
            // WEEI in course name
            like(learningProgress.courseName, '%WEEI%'),
            like(learningProgress.courseName, '%U:LEARN%'),
            like(learningProgress.courseName, '%U:START%'),
            like(learningProgress.courseName, '%U:GROW%'),
            like(learningProgress.courseName, '%U:LEAD%'),
            // Or in the period
            and(
              gte(learningProgress.startedAt, new Date(periodStart)),
              lte(learningProgress.startedAt, new Date(periodEnd))
            )
          )
        )
      );

    // Categorize records by stage
    const stageRecords = {
      'u:learn': [] as typeof progressRecords,
      'u:start': [] as typeof progressRecords,
      'u:grow': [] as typeof progressRecords,
      'u:lead': [] as typeof progressRecords,
    };

    progressRecords.forEach(record => {
      const stage = determineWEEIStage(record.courseName, record.metadata);
      if (stage && stage in stageRecords) {
        stageRecords[stage as keyof typeof stageRecords].push(record);
      }
    });

    // Calculate metrics for each stage
    const calculateStageMetrics = (records: typeof progressRecords) => {
      const enrolled = records.filter(
        r => r.startedAt &&
             r.startedAt >= new Date(periodStart) &&
             r.startedAt <= new Date(periodEnd)
      ).length;

      const active = records.filter(r => r.status === 'in_progress').length;

      const completed = records.filter(
        r => r.status === 'completed' &&
             r.completedAt &&
             r.completedAt >= new Date(periodStart) &&
             r.completedAt <= new Date(periodEnd)
      ).length;

      const completionRate = enrolled > 0 ? (completed / enrolled) * 100 : 0;

      return {
        enrolled,
        active,
        completed,
        completionRate: parseFloat(completionRate.toFixed(2)),
      };
    };

    const stageMetrics = {
      uLearn: calculateStageMetrics(stageRecords['u:learn']),
      uStart: calculateStageMetrics(stageRecords['u:start']),
      uGrow: calculateStageMetrics(stageRecords['u:grow']),
      uLead: calculateStageMetrics(stageRecords['u:lead']),
    };

    // Calculate total participants (unique users across all stages)
    const uniqueParticipants = new Set(progressRecords.map(r => r.userId)).size;

    // Estimate demo days count (assume 1 demo day per 20 participants, at least 1)
    const demoDaysCount = Math.max(1, Math.floor(uniqueParticipants / 20));

    // Calculate avg participants per demo day
    const avgParticipantsPerDemoDay = demoDaysCount > 0
      ? uniqueParticipants / demoDaysCount
      : 0;

    // Calculate overall completion rate
    const totalEnrolled = Object.values(stageMetrics).reduce(
      (sum, stage) => sum + stage.enrolled,
      0
    );
    const totalCompleted = Object.values(stageMetrics).reduce(
      (sum, stage) => sum + stage.completed,
      0
    );
    const overallCompletionRate = totalEnrolled > 0
      ? (totalCompleted / totalEnrolled) * 100
      : 0;

    // Calculate stage progression metrics
    const learnToStart = stageMetrics.uLearn.completed > 0
      ? (stageMetrics.uStart.enrolled / stageMetrics.uLearn.completed) * 100
      : 0;

    const startToGrow = stageMetrics.uStart.completed > 0
      ? (stageMetrics.uGrow.enrolled / stageMetrics.uStart.completed) * 100
      : 0;

    const growToLead = stageMetrics.uGrow.completed > 0
      ? (stageMetrics.uLead.enrolled / stageMetrics.uGrow.completed) * 100
      : 0;

    const tile: WEEITile = {
      id: `weei-${companyId}-${periodStart}`,
      type: 'weei',
      companyId,
      periodStart,
      periodEnd,
      lastUpdated: new Date().toISOString(),
      metrics: {
        totalParticipants: uniqueParticipants,
        demoDaysCount,
        avgParticipantsPerDemoDay: parseFloat(avgParticipantsPerDemoDay.toFixed(2)),
        overallCompletionRate: parseFloat(overallCompletionRate.toFixed(2)),
      },
      stageMetrics,
      progressionMetrics: {
        learnToStart: parseFloat(learnToStart.toFixed(2)),
        startToGrow: parseFloat(startToGrow.toFixed(2)),
        growToLead: parseFloat(growToLead.toFixed(2)),
      },
    };

    const duration = Date.now() - startTime;
    logger.info(
      { companyId, duration, participants: uniqueParticipants },
      'WEEI tile aggregated'
    );

    return tile;
  } catch (error) {
    logger.error({ error, companyId, periodStart, periodEnd }, 'Failed to aggregate WEEI tile');
    throw error;
  }
}
