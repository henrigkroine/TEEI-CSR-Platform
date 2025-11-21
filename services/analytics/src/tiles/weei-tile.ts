/**
 * WEEI Tile Aggregator
 * Aggregates metrics for Women's Economic Empowerment Initiative (WEEI)
 * Stages: U:LEARN, U:START, U:GROW, U:LEAD
 * Data source: learning_progress table with WEEI-specific metadata
 */

import { db, learningProgress } from '@teei/shared-schema';
import { and, gte, lte, sql } from 'drizzle-orm';
import { WEEITile, WEEITileData } from '@teei/shared-types';
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

type WEEIStage = 'ULEARN' | 'USTART' | 'UGROW' | 'ULEAD';

/**
 * Extract WEEI stage from course metadata or course name
 */
function extractWEEIStage(courseName: string | null, metadata: any): WEEIStage | null {
  // Check metadata first
  if (metadata?.weei_stage) {
    const stage = metadata.weei_stage.toUpperCase().replace(':', '');
    if (['ULEARN', 'USTART', 'UGROW', 'ULEAD'].includes(stage)) {
      return stage as WEEIStage;
    }
  }

  // Check course name patterns
  if (!courseName) return null;
  const nameUpper = courseName.toUpperCase();

  if (nameUpper.includes('U:LEARN') || nameUpper.includes('ULEARN')) return 'ULEARN';
  if (nameUpper.includes('U:START') || nameUpper.includes('USTART')) return 'USTART';
  if (nameUpper.includes('U:GROW') || nameUpper.includes('UGROW')) return 'UGROW';
  if (nameUpper.includes('U:LEAD') || nameUpper.includes('ULEAD')) return 'ULEAD';

  return null;
}

/**
 * Aggregate WEEI Tile data for a company
 */
export async function aggregateWEEITile(
  companyId: string,
  period?: { start: string; end: string }
): Promise<WEEITile> {
  const actualPeriod = period || getDefaultPeriod();

  // Query learning progress for WEEI programs in period
  const progress = await db
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
    .where(
      and(
        gte(learningProgress.startedAt, new Date(actualPeriod.start)),
        lte(learningProgress.startedAt, new Date(actualPeriod.end))
      )
    );

  // Filter WEEI courses and categorize by stage
  const weeiProgress = progress
    .map((p) => ({
      ...p,
      stage: extractWEEIStage(p.courseName, p.metadata),
    }))
    .filter((p) => p.stage !== null);

  // Calculate stage metrics
  const stageMetrics = {
    ULEARN: { enrollments: 0, completions: 0 },
    USTART: { enrollments: 0, completions: 0 },
    UGROW: { enrollments: 0, completions: 0 },
    ULEAD: { enrollments: 0, completions: 0 },
  };

  weeiProgress.forEach((p) => {
    if (p.stage) {
      stageMetrics[p.stage].enrollments++;
      if (p.status === 'completed') {
        stageMetrics[p.stage].completions++;
      }
    }
  });

  const stages = {
    ULEARN: {
      enrollments: stageMetrics.ULEARN.enrollments,
      completions: stageMetrics.ULEARN.completions,
      completionRate: round(
        calculateRate(stageMetrics.ULEARN.completions, stageMetrics.ULEARN.enrollments),
        3
      ),
    },
    USTART: {
      enrollments: stageMetrics.USTART.enrollments,
      completions: stageMetrics.USTART.completions,
      completionRate: round(
        calculateRate(stageMetrics.USTART.completions, stageMetrics.USTART.enrollments),
        3
      ),
    },
    UGROW: {
      enrollments: stageMetrics.UGROW.enrollments,
      completions: stageMetrics.UGROW.completions,
      completionRate: round(
        calculateRate(stageMetrics.UGROW.completions, stageMetrics.UGROW.enrollments),
        3
      ),
    },
    ULEAD: {
      enrollments: stageMetrics.ULEAD.enrollments,
      completions: stageMetrics.ULEAD.completions,
      completionRate: round(
        calculateRate(stageMetrics.ULEAD.completions, stageMetrics.ULEAD.enrollments),
        3
      ),
    },
  };

  // Calculate overall throughput
  const totalEnrollments = weeiProgress.length;
  const totalCompletions = weeiProgress.filter((p) => p.status === 'completed').length;
  const overallCompletionRate = calculateRate(totalCompletions, totalEnrollments);

  // Calculate average time to complete
  const completedWithDates = weeiProgress.filter(
    (p) => p.status === 'completed' && p.startedAt && p.completedAt
  );
  const completionDurations = completedWithDates.map((p) => {
    return getWeeksBetween(
      p.startedAt!.toISOString().split('T')[0],
      p.completedAt!.toISOString().split('T')[0]
    );
  });
  const avgTimeToComplete = completionDurations.length > 0
    ? calculateAverage(completionDurations)
    : 0;

  // Demo day metrics (from metadata)
  let demoDayCount = 0;
  let totalPresentations = 0;
  const demoDayParticipants = new Set<string>();

  weeiProgress.forEach((p) => {
    const metadata = p.metadata as any;
    if (metadata?.demo_day) {
      demoDayCount++;
      totalPresentations += metadata.presentations || 1;
      demoDayParticipants.add(p.userId);
    }
  });

  const avgPresentationsPerDemoDay = demoDayCount > 0
    ? totalPresentations / demoDayCount
    : 0;

  // Progression between stages
  // Track users who completed one stage and started the next
  const userStages = new Map<string, Set<WEEIStage>>();
  weeiProgress.forEach((p) => {
    if (p.status === 'completed' && p.stage) {
      const stages = userStages.get(p.userId) || new Set<WEEIStage>();
      stages.add(p.stage);
      userStages.set(p.userId, stages);
    }
  });

  let learnToStartCount = 0;
  let startToGrowCount = 0;
  let growToLeadCount = 0;

  userStages.forEach((stages) => {
    if (stages.has('ULEARN') && stages.has('USTART')) learnToStartCount++;
    if (stages.has('USTART') && stages.has('UGROW')) startToGrowCount++;
    if (stages.has('UGROW') && stages.has('ULEAD')) growToLeadCount++;
  });

  const learnCompletions = stageMetrics.ULEARN.completions;
  const startCompletions = stageMetrics.USTART.completions;
  const growCompletions = stageMetrics.UGROW.completions;

  const progression = {
    learnToStart: round(calculateRate(learnToStartCount, learnCompletions), 3),
    startToGrow: round(calculateRate(startToGrowCount, startCompletions), 3),
    growToLead: round(calculateRate(growToLeadCount, growCompletions), 3),
  };

  // Business outcomes (from metadata)
  let businessesStarted = 0;
  let jobsCreated = 0;
  let revenueGenerated = 0;

  weeiProgress.forEach((p) => {
    const metadata = p.metadata as any;
    if (metadata?.business_started) businessesStarted++;
    if (metadata?.jobs_created) jobsCreated += metadata.jobs_created;
    if (metadata?.revenue_generated) revenueGenerated += metadata.revenue_generated;
  });

  const businessOutcomes = businessesStarted > 0 || jobsCreated > 0
    ? {
        businessesStarted,
        jobsCreated,
        revenueGenerated: revenueGenerated > 0 ? revenueGenerated : undefined,
      }
    : undefined;

  // Fetch VIS and SROI if available
  const vis = await getVISForPeriod(companyId, actualPeriod);
  const sroi = await getSROIForPeriod(companyId, actualPeriod);

  // Build tile data
  const tileData: WEEITileData = {
    stages,
    throughput: {
      totalEnrollments,
      totalCompletions,
      overallCompletionRate: round(overallCompletionRate, 3),
      avgTimeToComplete: round(avgTimeToComplete, 1),
    },
    demoDay: {
      demoDayCount,
      totalPresentations,
      uniqueParticipants: demoDayParticipants.size,
      avgPresentationsPerDemoDay: round(avgPresentationsPerDemoDay, 2),
    },
    progression,
    businessOutcomes,
    vis,
    sroi,
  };

  // Build metadata
  const metadata = {
    ...generateTileMetadata(companyId, 'weei', actualPeriod),
    tileId: randomUUID(),
  };

  return {
    metadata,
    data: tileData,
  };
}
