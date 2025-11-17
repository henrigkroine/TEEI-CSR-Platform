/**
 * Scenario Engine
 *
 * Computes projected VIS/SROI/SDG impacts from scenario parameters
 * Deterministic: same inputs always produce same outputs
 */

import type {
  ScenarioParameters,
  BaselineMetrics,
  ProjectedMetrics,
  ScenarioResult,
} from '@teei/shared-types';

/**
 * Default activity rates (per month) used when calculating projections
 */
const DEFAULT_ACTIVITY_RATES = {
  matchesPerMonth: 5,
  eventsPerMonth: 8,
  skillSharesPerMonth: 3,
  feedbackPerMonth: 10,
  milestonesPerMonth: 2,
  checkinsPerMonth: 12,
};

/**
 * Default program mix (percentage allocation)
 */
const DEFAULT_PROGRAM_MIX = {
  buddySystem: 40,
  skillShare: 30,
  mentorship: 20,
  communityEvents: 10,
};

/**
 * VIS point values (from impact-calculator)
 */
const VIS_POINTS = {
  MATCH_CREATED: 10,
  EVENT_ATTENDED: 5,
  SKILL_SHARE_COMPLETED: 15,
  FEEDBACK_SUBMITTED: 8,
  MILESTONE_REACHED: 20,
  CHECKIN_COMPLETED: 3,
};

/**
 * SROI valuation weights (from analytics)
 */
const SROI_WEIGHTS = {
  BUDDY_MATCH: 10,
  EVENT_ATTENDED: 5,
  SKILL_SHARE: 15,
  FEEDBACK: 8,
  MILESTONE: 20,
  CHECKIN: 3,
};

/**
 * SDG impact weights (which activities contribute to which SDGs)
 */
const SDG_IMPACT_WEIGHTS: Record<number, { activities: string[]; weight: number }> = {
  4: { activities: ['skill_share', 'mentorship'], weight: 0.8 },      // Quality Education
  8: { activities: ['buddy_match', 'skill_share'], weight: 0.7 },     // Decent Work
  10: { activities: ['buddy_match', 'community_events'], weight: 0.6 }, // Reduced Inequalities
  17: { activities: ['buddy_match', 'community_events'], weight: 0.5 }, // Partnerships
};

/**
 * Calculate projected activity counts based on scenario parameters
 */
function calculateProjectedActivityCounts(
  baseline: BaselineMetrics,
  params: ScenarioParameters
): {
  matches: number;
  events: number;
  skillShares: number;
  feedback: number;
  milestones: number;
  checkins: number;
} {
  const cohortMultiplier = params.cohortSizeMultiplier || 1.0;
  const activityRates = { ...DEFAULT_ACTIVITY_RATES, ...params.activityRates };

  // Calculate duration factor (if cohort duration changes)
  const baselineDuration = getMonthsDuration(baseline.period.start, baseline.period.end);
  const projectedDuration = params.cohortDurationMonths || baselineDuration;
  const durationFactor = projectedDuration / baselineDuration;

  // Calculate projected counts
  const matches = Math.round(
    baseline.activityCounts.matches * cohortMultiplier * durationFactor
  );
  const events = Math.round(
    baseline.activityCounts.events * cohortMultiplier * durationFactor
  );
  const skillShares = Math.round(
    baseline.activityCounts.skillShares * cohortMultiplier * durationFactor
  );
  const feedback = Math.round(
    baseline.activityCounts.feedback * cohortMultiplier * durationFactor
  );
  const milestones = Math.round(
    baseline.activityCounts.milestones * cohortMultiplier * durationFactor
  );
  const checkins = Math.round(
    baseline.activityCounts.checkins * cohortMultiplier * durationFactor
  );

  return {
    matches,
    events,
    skillShares,
    feedback,
    milestones,
    checkins,
  };
}

/**
 * Calculate projected VIS score
 */
function calculateProjectedVIS(activityCounts: {
  matches: number;
  events: number;
  skillShares: number;
  feedback: number;
  milestones: number;
  checkins: number;
}): number {
  const totalPoints =
    activityCounts.matches * VIS_POINTS.MATCH_CREATED +
    activityCounts.events * VIS_POINTS.EVENT_ATTENDED +
    activityCounts.skillShares * VIS_POINTS.SKILL_SHARE_COMPLETED +
    activityCounts.feedback * VIS_POINTS.FEEDBACK_SUBMITTED +
    activityCounts.milestones * VIS_POINTS.MILESTONE_REACHED +
    activityCounts.checkins * VIS_POINTS.CHECKIN_COMPLETED;

  return Math.round(totalPoints * 100) / 100;
}

/**
 * Calculate projected social value for SROI
 */
function calculateProjectedSocialValue(activityCounts: {
  matches: number;
  events: number;
  skillShares: number;
  feedback: number;
  milestones: number;
  checkins: number;
}): number {
  const totalValue =
    activityCounts.matches * SROI_WEIGHTS.BUDDY_MATCH +
    activityCounts.events * SROI_WEIGHTS.EVENT_ATTENDED +
    activityCounts.skillShares * SROI_WEIGHTS.SKILL_SHARE +
    activityCounts.feedback * SROI_WEIGHTS.FEEDBACK +
    activityCounts.milestones * SROI_WEIGHTS.MILESTONE +
    activityCounts.checkins * SROI_WEIGHTS.CHECKIN;

  return Math.round(totalValue * 100) / 100;
}

/**
 * Calculate projected investment
 */
function calculateProjectedInvestment(
  baseline: BaselineMetrics,
  params: ScenarioParameters
): number {
  const investmentMultiplier = params.investmentMultiplier || 1.0;
  const grantDelta = params.grantAmountDelta || 0;

  return Math.round((baseline.investment * investmentMultiplier + grantDelta) * 100) / 100;
}

/**
 * Calculate projected SDG coverage
 */
function calculateProjectedSDGCoverage(
  baseline: BaselineMetrics,
  params: ScenarioParameters,
  activityCounts: {
    matches: number;
    events: number;
    skillShares: number;
    feedback: number;
    milestones: number;
    checkins: number;
  }
): { goalId: number; coverage: number; delta: number }[] {
  const programMix = { ...DEFAULT_PROGRAM_MIX, ...params.programMix };

  return baseline.sdgCoverage.map((sdg) => {
    const sdgWeights = SDG_IMPACT_WEIGHTS[sdg.goalId];

    if (!sdgWeights) {
      // No change for SDGs not mapped
      return {
        goalId: sdg.goalId,
        coverage: sdg.coverage,
        delta: 0,
      };
    }

    // Calculate impact factor based on program mix
    let impactFactor = 0;
    if (sdgWeights.activities.includes('skill_share')) {
      impactFactor += (programMix.skillShare || 0) / 100;
    }
    if (sdgWeights.activities.includes('buddy_match')) {
      impactFactor += (programMix.buddySystem || 0) / 100;
    }
    if (sdgWeights.activities.includes('mentorship')) {
      impactFactor += (programMix.mentorship || 0) / 100;
    }
    if (sdgWeights.activities.includes('community_events')) {
      impactFactor += (programMix.communityEvents || 0) / 100;
    }

    // Calculate coverage delta
    const baseImpact = sdg.coverage;
    const projectedImpact = Math.min(100, baseImpact * (1 + impactFactor * sdgWeights.weight));
    const delta = projectedImpact - baseImpact;

    return {
      goalId: sdg.goalId,
      coverage: Math.round(projectedImpact * 100) / 100,
      delta: Math.round(delta * 100) / 100,
    };
  });
}

/**
 * Calculate confidence score
 * Based on data quality and scenario validity
 */
function calculateConfidence(
  baseline: BaselineMetrics,
  params: ScenarioParameters
): number {
  let confidence = 1.0;

  // Reduce confidence for extreme cohort size changes
  const cohortMultiplier = params.cohortSizeMultiplier || 1.0;
  if (cohortMultiplier > 2.0 || cohortMultiplier < 0.5) {
    confidence -= 0.2;
  }

  // Reduce confidence for extreme investment changes
  const investmentMultiplier = params.investmentMultiplier || 1.0;
  if (investmentMultiplier > 2.0 || investmentMultiplier < 0.5) {
    confidence -= 0.15;
  }

  // Reduce confidence if baseline has low activity counts
  const totalActivities = Object.values(baseline.activityCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  if (totalActivities < 100) {
    confidence -= 0.1;
  }

  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Generate warnings about scenario validity
 */
function generateWarnings(params: ScenarioParameters): string[] {
  const warnings: string[] = [];

  // Warn about extreme multipliers
  if (params.cohortSizeMultiplier && params.cohortSizeMultiplier > 3.0) {
    warnings.push('Cohort size increase >200% may not be realistic');
  }

  if (params.cohortSizeMultiplier && params.cohortSizeMultiplier < 0.3) {
    warnings.push('Cohort size decrease >70% may indicate program shutdown');
  }

  // Warn about program mix
  if (params.programMix) {
    const total = Object.values(params.programMix).reduce((sum, val) => sum + (val || 0), 0);
    if (Math.abs(total - 100) > 1) {
      warnings.push(`Program mix sums to ${total}%, should be 100%`);
    }
  }

  return warnings;
}

/**
 * Get months duration from period
 */
function getMonthsDuration(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30));
}

/**
 * Main scenario engine: compute projected metrics from parameters
 *
 * This function is deterministic - same inputs always produce same outputs
 */
export function runScenarioEngine(
  scenarioId: string,
  baseline: BaselineMetrics,
  parameters: ScenarioParameters
): ScenarioResult {
  const startTime = Date.now();

  // Step 1: Calculate projected activity counts
  const projectedActivityCounts = calculateProjectedActivityCounts(baseline, parameters);

  // Step 2: Calculate projected VIS
  const projectedVIS = calculateProjectedVIS(projectedActivityCounts);
  const visDelta = projectedVIS - baseline.vis;
  const visPercentChange = baseline.vis > 0 ? (visDelta / baseline.vis) * 100 : 0;

  // Step 3: Calculate projected social value
  const projectedSocialValue = calculateProjectedSocialValue(projectedActivityCounts);
  const socialValueDelta = projectedSocialValue - baseline.socialValue;
  const socialValuePercentChange =
    baseline.socialValue > 0 ? (socialValueDelta / baseline.socialValue) * 100 : 0;

  // Step 4: Calculate projected investment
  const projectedInvestment = calculateProjectedInvestment(baseline, parameters);
  const investmentDelta = projectedInvestment - baseline.investment;
  const investmentPercentChange =
    baseline.investment > 0 ? (investmentDelta / baseline.investment) * 100 : 0;

  // Step 5: Calculate projected SROI
  const projectedSROI =
    projectedInvestment > 0 ? projectedSocialValue / projectedInvestment : 0;
  const sroiDelta = projectedSROI - baseline.sroi;
  const sroiPercentChange = baseline.sroi > 0 ? (sroiDelta / baseline.sroi) * 100 : 0;

  // Step 6: Calculate projected SDG coverage
  const projectedSDGCoverage = calculateProjectedSDGCoverage(
    baseline,
    parameters,
    projectedActivityCounts
  );

  // Step 7: Calculate confidence
  const confidence = calculateConfidence(baseline, parameters);

  // Step 8: Generate warnings
  const warnings = generateWarnings(parameters);

  const calculationDurationMs = Date.now() - startTime;

  const projected: ProjectedMetrics = {
    sroi: Math.round(projectedSROI * 10000) / 10000,
    sroiDelta: Math.round(sroiDelta * 10000) / 10000,
    sroiPercentChange: Math.round(sroiPercentChange * 100) / 100,

    vis: Math.round(projectedVIS * 100) / 100,
    visDelta: Math.round(visDelta * 100) / 100,
    visPercentChange: Math.round(visPercentChange * 100) / 100,

    socialValue: Math.round(projectedSocialValue * 100) / 100,
    socialValueDelta: Math.round(socialValueDelta * 100) / 100,
    socialValuePercentChange: Math.round(socialValuePercentChange * 100) / 100,

    investment: Math.round(projectedInvestment * 100) / 100,
    investmentDelta: Math.round(investmentDelta * 100) / 100,
    investmentPercentChange: Math.round(investmentPercentChange * 100) / 100,

    sdgCoverage: projectedSDGCoverage,
    activityCounts: projectedActivityCounts,
  };

  const result: ScenarioResult = {
    scenarioId,
    baseline,
    projected,
    parameters,
    calculatedAt: new Date().toISOString(),
    calculationDurationMs,
    confidence: Math.round(confidence * 100) / 100,
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  return result;
}

/**
 * Validate scenario parameters
 */
export function validateScenarioParameters(params: ScenarioParameters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate cohort size multiplier
  if (params.cohortSizeMultiplier !== undefined) {
    if (params.cohortSizeMultiplier <= 0) {
      errors.push('Cohort size multiplier must be positive');
    }
    if (params.cohortSizeMultiplier > 10) {
      errors.push('Cohort size multiplier cannot exceed 10x');
    }
  }

  // Validate investment multiplier
  if (params.investmentMultiplier !== undefined) {
    if (params.investmentMultiplier <= 0) {
      errors.push('Investment multiplier must be positive');
    }
    if (params.investmentMultiplier > 10) {
      errors.push('Investment multiplier cannot exceed 10x');
    }
  }

  // Validate program mix
  if (params.programMix) {
    const total = Object.values(params.programMix).reduce((sum, val) => sum + (val || 0), 0);
    if (total < 0 || total > 100.5) {
      errors.push('Program mix percentages must sum to 100');
    }

    Object.entries(params.programMix).forEach(([key, value]) => {
      if (value !== undefined && (value < 0 || value > 100)) {
        errors.push(`${key} allocation must be between 0 and 100`);
      }
    });
  }

  // Validate cohort duration
  if (params.cohortDurationMonths !== undefined) {
    if (params.cohortDurationMonths < 1) {
      errors.push('Cohort duration must be at least 1 month');
    }
    if (params.cohortDurationMonths > 60) {
      errors.push('Cohort duration cannot exceed 60 months');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
