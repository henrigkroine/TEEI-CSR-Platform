import { db } from '@teei/shared-schema/db';
import { buddySystemEvents, sroiCalculations, sroiValuationWeights } from '@teei/shared-schema';
import { sql, eq, and, gte, lte, isNull, or } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('sroi-calculator');

/**
 * Activity type enumeration matching event types
 */
export enum ActivityType {
  BUDDY_MATCH = 'buddy_match',
  EVENT_ATTENDED = 'event_attended',
  SKILL_SHARE = 'skill_share',
  FEEDBACK = 'feedback',
  MILESTONE = 'milestone',
  CHECKIN = 'checkin',
}

/**
 * Mapping from event types to activity types
 */
const EVENT_TYPE_TO_ACTIVITY: Record<string, ActivityType> = {
  'buddy.match.created': ActivityType.BUDDY_MATCH,
  'buddy.event.attended': ActivityType.EVENT_ATTENDED,
  'buddy.skill_share.completed': ActivityType.SKILL_SHARE,
  'buddy.feedback.submitted': ActivityType.FEEDBACK,
  'buddy.milestone.reached': ActivityType.MILESTONE,
  'buddy.checkin.completed': ActivityType.CHECKIN,
};

/**
 * Default valuation weights (points per activity)
 * These can be overridden per company
 */
export const DEFAULT_VALUATION_WEIGHTS: Record<ActivityType, number> = {
  [ActivityType.BUDDY_MATCH]: 10,
  [ActivityType.EVENT_ATTENDED]: 5,
  [ActivityType.SKILL_SHARE]: 15, // ⭐⭐⭐ High impact
  [ActivityType.FEEDBACK]: 8,
  [ActivityType.MILESTONE]: 20, // ⭐⭐⭐ High impact
  [ActivityType.CHECKIN]: 3,
};

/**
 * Default investment costs for Phase 1 (simplified)
 */
export const DEFAULT_MONTHLY_INVESTMENT = {
  PLATFORM_COST: 500, // USD per month
  STAFF_HOURS: 20, // hours per month
  HOURLY_RATE: 50, // USD per hour
  get TOTAL() {
    return this.PLATFORM_COST + this.STAFF_HOURS * this.HOURLY_RATE; // $1,500/month
  },
};

/**
 * SROI calculation input parameters
 */
export interface SROICalculationParams {
  periodStart: Date;
  periodEnd: Date;
  programType?: string; // Default: 'buddy'
  companyId?: string; // NULL for global
}

/**
 * Activity breakdown for SROI calculation
 */
export interface ActivityBreakdown {
  matches: { count: number; value: number };
  events: { count: number; value: number };
  skill_shares: { count: number; value: number };
  feedback: { count: number; value: number };
  milestones: { count: number; value: number };
  checkins: { count: number; value: number };
}

/**
 * SROI calculation result
 */
export interface SROICalculation {
  period: { start: Date; end: Date };
  program: string;
  sroiRatio: number;
  socialValue: number;
  investment: number;
  breakdown: ActivityBreakdown;
  confidence: number; // 0-1 based on data quality
  calculatedAt: Date;
}

/**
 * Fetches active valuation weights for a company or uses defaults
 */
async function getValuationWeights(companyId?: string): Promise<Record<ActivityType, number>> {
  const weights = { ...DEFAULT_VALUATION_WEIGHTS };

  if (companyId) {
    // Fetch company-specific weights
    const customWeights = await db
      .select()
      .from(sroiValuationWeights)
      .where(
        and(
          eq(sroiValuationWeights.companyId, companyId),
          lte(sroiValuationWeights.effectiveFrom, new Date()),
          or(isNull(sroiValuationWeights.effectiveTo), gte(sroiValuationWeights.effectiveTo, new Date()))
        )
      );

    // Override defaults with custom weights
    for (const weight of customWeights) {
      const activityType = weight.activityType as ActivityType;
      if (activityType in weights) {
        weights[activityType] = parseFloat(weight.valuePoints);
      }
    }
  }

  return weights;
}

/**
 * Counts events by activity type for a given period
 */
async function aggregateEventCounts(
  periodStart: Date,
  periodEnd: Date,
  programType: string
): Promise<Record<ActivityType, number>> {
  const counts: Record<ActivityType, number> = {
    [ActivityType.BUDDY_MATCH]: 0,
    [ActivityType.EVENT_ATTENDED]: 0,
    [ActivityType.SKILL_SHARE]: 0,
    [ActivityType.FEEDBACK]: 0,
    [ActivityType.MILESTONE]: 0,
    [ActivityType.CHECKIN]: 0,
  };

  // Query events in the date range
  const events = await db
    .select({
      eventType: buddySystemEvents.eventType,
      count: sql<number>`count(*)::int`,
    })
    .from(buddySystemEvents)
    .where(and(gte(buddySystemEvents.timestamp, periodStart), lte(buddySystemEvents.timestamp, periodEnd)))
    .groupBy(buddySystemEvents.eventType);

  // Map event types to activity types
  for (const event of events) {
    const activityType = EVENT_TYPE_TO_ACTIVITY[event.eventType];
    if (activityType) {
      counts[activityType] = event.count;
    }
  }

  return counts;
}

/**
 * Calculates confidence score based on data quality
 * Higher confidence for more events and more diverse activity types
 */
function calculateConfidence(activityCounts: Record<ActivityType, number>): number {
  const totalEvents = Object.values(activityCounts).reduce((sum, count) => sum + count, 0);
  const activeActivityTypes = Object.values(activityCounts).filter((count) => count > 0).length;

  // Base confidence on event count (logarithmic scale)
  let confidence = Math.min(Math.log10(totalEvents + 1) / 3, 0.7); // Max 0.7 from volume

  // Add bonus for activity diversity (max 0.3)
  const diversityBonus = (activeActivityTypes / Object.keys(ActivityType).length) * 0.3;
  confidence += diversityBonus;

  // Cap at 1.0 and ensure minimum of 0.1
  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Calculates investment amount for the period
 * In Phase 1, uses fixed monthly rate
 */
function calculateInvestment(periodStart: Date, periodEnd: Date): number {
  const monthsDiff =
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
  const months = Math.max(1, Math.ceil(monthsDiff));

  return DEFAULT_MONTHLY_INVESTMENT.TOTAL * months;
}

/**
 * Fetches event IDs for lineage tracking
 */
async function fetchEventIds(periodStart: Date, periodEnd: Date, programType: string): Promise<string[]> {
  const events = await db
    .select({ eventId: buddySystemEvents.eventId })
    .from(buddySystemEvents)
    .where(and(gte(buddySystemEvents.timestamp, periodStart), lte(buddySystemEvents.timestamp, periodEnd)));

  return events.map((e) => e.eventId);
}

/**
 * Main SROI calculation function with lineage tracking
 */
export async function calculateSROI(params: SROICalculationParams): Promise<SROICalculation> {
  const { periodStart, periodEnd, programType = 'buddy', companyId } = params;

  logger.info({ periodStart, periodEnd, programType, companyId }, 'Calculating SROI');

  // Step 1: Get valuation weights
  const weights = await getValuationWeights(companyId);

  // Step 2: Aggregate event counts
  const activityCounts = await aggregateEventCounts(periodStart, periodEnd, programType);

  // Step 3: Calculate social value for each activity type
  const breakdown: ActivityBreakdown = {
    matches: {
      count: activityCounts[ActivityType.BUDDY_MATCH],
      value: activityCounts[ActivityType.BUDDY_MATCH] * weights[ActivityType.BUDDY_MATCH],
    },
    events: {
      count: activityCounts[ActivityType.EVENT_ATTENDED],
      value: activityCounts[ActivityType.EVENT_ATTENDED] * weights[ActivityType.EVENT_ATTENDED],
    },
    skill_shares: {
      count: activityCounts[ActivityType.SKILL_SHARE],
      value: activityCounts[ActivityType.SKILL_SHARE] * weights[ActivityType.SKILL_SHARE],
    },
    feedback: {
      count: activityCounts[ActivityType.FEEDBACK],
      value: activityCounts[ActivityType.FEEDBACK] * weights[ActivityType.FEEDBACK],
    },
    milestones: {
      count: activityCounts[ActivityType.MILESTONE],
      value: activityCounts[ActivityType.MILESTONE] * weights[ActivityType.MILESTONE],
    },
    checkins: {
      count: activityCounts[ActivityType.CHECKIN],
      value: activityCounts[ActivityType.CHECKIN] * weights[ActivityType.CHECKIN],
    },
  };

  // Step 4: Calculate total social value
  const socialValue =
    breakdown.matches.value +
    breakdown.events.value +
    breakdown.skill_shares.value +
    breakdown.feedback.value +
    breakdown.milestones.value +
    breakdown.checkins.value;

  // Step 5: Calculate investment
  const investment = calculateInvestment(periodStart, periodEnd);

  // Step 6: Calculate SROI ratio
  const sroiRatio = investment > 0 ? socialValue / investment : 0;

  // Step 7: Calculate confidence score
  const confidence = calculateConfidence(activityCounts);

  const result: SROICalculation = {
    period: { start: periodStart, end: periodEnd },
    program: programType,
    sroiRatio: parseFloat(sroiRatio.toFixed(4)),
    socialValue,
    investment,
    breakdown,
    confidence: parseFloat(confidence.toFixed(2)),
    calculatedAt: new Date(),
  };

  logger.info({ result }, 'SROI calculation complete');

  return result;
}

/**
 * Stores SROI calculation in database for historical tracking with lineage
 */
export async function saveSROICalculation(
  calculation: SROICalculation,
  companyId?: string,
  options?: { trackLineage?: boolean; eventIds?: string[] }
): Promise<string> {
  const [result] = await db
    .insert(sroiCalculations)
    .values({
      programType: calculation.program,
      periodStart: calculation.period.start,
      periodEnd: calculation.period.end,
      companyId: companyId || null,
      totalSocialValue: calculation.socialValue.toString(),
      totalInvestment: calculation.investment.toString(),
      sroiRatio: calculation.sroiRatio.toString(),
      activityBreakdown: calculation.breakdown as any,
      confidenceScore: calculation.confidence.toString(),
    })
    .returning({ id: sroiCalculations.id });

  logger.info({ programType: calculation.program, sroiRatio: calculation.sroiRatio, id: result.id }, 'SROI calculation saved');

  // Track lineage if enabled and eventIds provided
  if (options?.trackLineage && options?.eventIds && options.eventIds.length > 0) {
    // Import lineage service dynamically to avoid circular dependencies
    const { storeMetricLineage, markEventsAsProcessed } = await import('../services/lineage-service.js');

    const totalEvents = Object.values(calculation.breakdown).reduce((sum, item) => sum + item.count, 0);

    await storeMetricLineage({
      metricType: 'sroi',
      metricId: result.id,
      sourceEventIds: options.eventIds,
      calculationFormula: 'social_value / investment',
      metadata: {
        event_count: totalEvents,
        period: {
          start: calculation.period.start.toISOString(),
          end: calculation.period.end.toISOString(),
        },
        data_quality_score: calculation.confidence,
        program_type: calculation.program,
      },
    });

    await markEventsAsProcessed({
      eventIds: options.eventIds,
      metricType: 'sroi',
      metricId: result.id,
    });

    logger.info({ sroiId: result.id, eventCount: options.eventIds.length }, 'SROI lineage tracked');
  }

  return result.id;
}

/**
 * Retrieves historical SROI calculations for a program
 */
export async function getHistoricalSROI(
  programType: string,
  companyId?: string,
  limit: number = 12
): Promise<SROICalculation[]> {
  const conditions = [eq(sroiCalculations.programType, programType)];

  if (companyId) {
    conditions.push(eq(sroiCalculations.companyId, companyId));
  } else {
    conditions.push(isNull(sroiCalculations.companyId));
  }

  const results = await db
    .select()
    .from(sroiCalculations)
    .where(and(...conditions))
    .orderBy(sql`${sroiCalculations.periodEnd} DESC`)
    .limit(limit);

  return results.map((row) => ({
    period: { start: row.periodStart, end: row.periodEnd },
    program: row.programType,
    sroiRatio: parseFloat(row.sroiRatio),
    socialValue: parseFloat(row.totalSocialValue),
    investment: parseFloat(row.totalInvestment),
    breakdown: row.activityBreakdown as ActivityBreakdown,
    confidence: row.confidenceScore ? parseFloat(row.confidenceScore) : 0,
    calculatedAt: row.calculatedAt,
  }));
}
