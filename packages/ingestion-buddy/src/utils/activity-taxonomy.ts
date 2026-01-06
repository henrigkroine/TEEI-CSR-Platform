/**
 * Activity Taxonomy - Buddy Program Activities → VIS Integration
 *
 * Maps Buddy Program activities to VIS (Volunteer Impact Score) components:
 * - Hour types and weight multipliers
 * - Quality score sources
 * - Outcome lift indicators
 *
 * @module ingestion-buddy/utils/activity-taxonomy
 * @agent Agent 5 (activity-taxonomist)
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('ingestion-buddy:activity-taxonomy');

/**
 * VIS Hour Type Classification
 *
 * Based on VIS documentation (docs/VIS_Model.md):
 * - Direct mentoring: 1.0x weight (1-on-1 buddy sessions)
 * - Group facilitation: 1.2x weight (workshop leading, higher skill)
 * - Administrative: 0.8x weight (coordination, planning)
 * - Event support: 0.9x weight (event logistics)
 */
export enum VISHourType {
  DIRECT_MENTORING = 'direct_mentoring',         // 1.0x weight
  GROUP_FACILITATION = 'group_facilitation',     // 1.2x weight
  EVENT_SUPPORT = 'event_support',               // 0.9x weight
  ADMINISTRATIVE = 'administrative',              // 0.8x weight
  SKILL_EXCHANGE = 'skill_exchange',             // 1.0x weight
  OTHER = 'other',                               // 1.0x weight (default)
}

/**
 * Hour weight multipliers (per VIS Model)
 */
export const VIS_HOUR_WEIGHTS: Record<VISHourType, number> = {
  [VISHourType.DIRECT_MENTORING]: 1.0,
  [VISHourType.GROUP_FACILITATION]: 1.2,
  [VISHourType.EVENT_SUPPORT]: 0.9,
  [VISHourType.ADMINISTRATIVE]: 0.8,
  [VISHourType.SKILL_EXCHANGE]: 1.0,
  [VISHourType.OTHER]: 1.0,
};

/**
 * Buddy Event Type → VIS Hour Type Mapping
 */
const BUDDY_EVENT_TYPE_MAP: Record<string, VISHourType> = {
  // Formal Events (from buddy.event.attended)
  'cultural': VISHourType.EVENT_SUPPORT,
  'educational': VISHourType.GROUP_FACILITATION,
  'professional': VISHourType.DIRECT_MENTORING,
  'social': VISHourType.EVENT_SUPPORT,
  'support': VISHourType.DIRECT_MENTORING,
  'recreational': VISHourType.EVENT_SUPPORT,
  'language': VISHourType.DIRECT_MENTORING,

  // Informal Events (from buddy.event.logged)
  'hangout': VISHourType.EVENT_SUPPORT,
  'activity': VISHourType.EVENT_SUPPORT,
  'workshop': VISHourType.GROUP_FACILITATION,
  'video_call': VISHourType.DIRECT_MENTORING,
  'call': VISHourType.DIRECT_MENTORING,

  // Default
  'other': VISHourType.OTHER,
};

/**
 * Skill Session Category → VIS Hour Type Mapping
 */
const SKILL_CATEGORY_MAP: Record<string, VISHourType> = {
  'language': VISHourType.SKILL_EXCHANGE,
  'tech': VISHourType.SKILL_EXCHANGE,
  'professional': VISHourType.SKILL_EXCHANGE,
  'career': VISHourType.DIRECT_MENTORING,
  'personal_development': VISHourType.DIRECT_MENTORING,
};

/**
 * Buddy Activity (any event, check-in, skill session)
 */
export interface BuddyActivity {
  activityType: 'event' | 'skill_session' | 'checkin';
  eventType?: string;               // For events
  skillCategory?: string;           // For skill sessions
  durationMinutes?: number;         // Duration if known
  isOrganizer?: boolean;            // True if buddy is organizer (higher weight)
}

/**
 * VIS Hour Calculation Result
 */
export interface VISHourResult {
  hourType: VISHourType;
  rawHours: number;                 // Actual hours spent
  weightMultiplier: number;         // VIS weight
  weightedHours: number;            // rawHours × weightMultiplier
  reasoning: string;                // Explanation of classification
}

/**
 * Classify Buddy activity to VIS hour type
 *
 * @param activity - Buddy activity data
 * @returns VIS hour type
 */
export function classifyActivityType(activity: BuddyActivity): VISHourType {
  // Skill sessions
  if (activity.activityType === 'skill_session' && activity.skillCategory) {
    const mapped = SKILL_CATEGORY_MAP[activity.skillCategory.toLowerCase()];
    if (mapped) return mapped;
    return VISHourType.SKILL_EXCHANGE; // Default for skills
  }

  // Events
  if (activity.activityType === 'event' && activity.eventType) {
    const eventType = activity.eventType.toLowerCase();

    // If buddy is organizer, upgrade to group facilitation
    if (activity.isOrganizer && eventType !== 'hangout') {
      return VISHourType.GROUP_FACILITATION;
    }

    const mapped = BUDDY_EVENT_TYPE_MAP[eventType];
    if (mapped) return mapped;
  }

  // Check-ins (always direct mentoring)
  if (activity.activityType === 'checkin') {
    return VISHourType.DIRECT_MENTORING;
  }

  // Default
  return VISHourType.OTHER;
}

/**
 * Calculate VIS hours for Buddy activity
 *
 * @param activity - Buddy activity data
 * @returns VIS hour calculation result
 */
export function calculateVISHours(activity: BuddyActivity): VISHourResult {
  const hourType = classifyActivityType(activity);
  const weightMultiplier = VIS_HOUR_WEIGHTS[hourType];

  // Calculate raw hours
  let rawHours = 0;
  if (activity.durationMinutes !== undefined && activity.durationMinutes > 0) {
    rawHours = activity.durationMinutes / 60;
  } else {
    // Defaults if duration not provided
    if (activity.activityType === 'skill_session') {
      rawHours = 1.0; // Default: 1 hour skill session
    } else if (activity.activityType === 'checkin') {
      rawHours = 0.25; // Default: 15 minutes check-in
    } else {
      rawHours = 1.5; // Default: 1.5 hours event
    }
  }

  const weightedHours = rawHours * weightMultiplier;

  const reasoning = buildReasoning(activity, hourType, rawHours, weightMultiplier);

  return {
    hourType,
    rawHours,
    weightMultiplier,
    weightedHours,
    reasoning,
  };
}

/**
 * Build human-readable reasoning for VIS hour classification
 */
function buildReasoning(
  activity: BuddyActivity,
  hourType: VISHourType,
  rawHours: number,
  weightMultiplier: number
): string {
  const parts: string[] = [];

  parts.push(`Activity type: ${activity.activityType}`);

  if (activity.eventType) {
    parts.push(`Event type: ${activity.eventType}`);
  }

  if (activity.skillCategory) {
    parts.push(`Skill category: ${activity.skillCategory}`);
  }

  if (activity.isOrganizer) {
    parts.push('Buddy is organizer (group facilitation)');
  }

  parts.push(`VIS hour type: ${hourType}`);
  parts.push(`Raw hours: ${rawHours.toFixed(2)}`);
  parts.push(`Weight multiplier: ${weightMultiplier}x`);
  parts.push(`Weighted hours: ${(rawHours * weightMultiplier).toFixed(2)}`);

  return parts.join(' | ');
}

/**
 * Aggregate VIS hours for multiple activities
 *
 * @param activities - Array of Buddy activities
 * @returns Aggregated VIS hours by hour type
 */
export function aggregateVISHours(activities: BuddyActivity[]): {
  totalRawHours: number;
  totalWeightedHours: number;
  byHourType: Record<VISHourType, { rawHours: number; weightedHours: number; count: number }>;
} {
  const byHourType: Record<VISHourType, { rawHours: number; weightedHours: number; count: number }> = {
    [VISHourType.DIRECT_MENTORING]: { rawHours: 0, weightedHours: 0, count: 0 },
    [VISHourType.GROUP_FACILITATION]: { rawHours: 0, weightedHours: 0, count: 0 },
    [VISHourType.EVENT_SUPPORT]: { rawHours: 0, weightedHours: 0, count: 0 },
    [VISHourType.ADMINISTRATIVE]: { rawHours: 0, weightedHours: 0, count: 0 },
    [VISHourType.SKILL_EXCHANGE]: { rawHours: 0, weightedHours: 0, count: 0 },
    [VISHourType.OTHER]: { rawHours: 0, weightedHours: 0, count: 0 },
  };

  let totalRawHours = 0;
  let totalWeightedHours = 0;

  for (const activity of activities) {
    const result = calculateVISHours(activity);

    byHourType[result.hourType].rawHours += result.rawHours;
    byHourType[result.hourType].weightedHours += result.weightedHours;
    byHourType[result.hourType].count += 1;

    totalRawHours += result.rawHours;
    totalWeightedHours += result.weightedHours;
  }

  return {
    totalRawHours,
    totalWeightedHours,
    byHourType,
  };
}

/**
 * Quality score source mapping for Buddy activities
 *
 * Maps Buddy feedback/ratings to VIS quality score inputs
 */
export interface QualityScoreSource {
  source: 'buddy_feedback' | 'skill_feedback' | 'event_feedback';
  rating: number;                   // 0.0-1.0 normalized rating
  textId: string;                   // Reference to feedback record
}

/**
 * Extract quality score sources from Buddy feedback
 *
 * @param feedbackRecords - Buddy feedback records
 * @returns Quality score sources for VIS
 */
export function extractQualityScoreSources(feedbackRecords: Array<{
  id: string;
  source: 'buddy_feedback' | 'skill_feedback' | 'event_feedback';
  rating: number;
}>): QualityScoreSource[] {
  return feedbackRecords.map(record => ({
    source: record.source,
    rating: record.rating,
    textId: record.id,
  }));
}

/**
 * Calculate aggregate quality score for VIS
 *
 * VIS Quality Score = avg(confidence, belonging, well_being, job_readiness) × 100
 *
 * For Buddy Program, we derive from:
 * - buddy_feedback.rating → general quality
 * - Q2Q outcome scores (if available) → dimension-specific quality
 *
 * @param qualitySources - Quality score sources
 * @returns Average quality score (0-100 scale)
 */
export function calculateQualityScore(qualitySources: QualityScoreSource[]): number {
  if (qualitySources.length === 0) {
    return 0;
  }

  const sum = qualitySources.reduce((acc, source) => acc + source.rating, 0);
  const avg = sum / qualitySources.length;

  return avg * 100; // Convert 0.0-1.0 → 0-100
}
