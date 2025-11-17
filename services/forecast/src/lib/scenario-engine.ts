/**
 * Scenario Engine - "What-if" modeling for VIS/SROI/SDG metrics
 *
 * Applies parameter adjustments to calculate metric deltas:
 * - Volunteer hours, grant amounts, cohort sizes, program mix
 * - VIS/SROI calculation parameter overrides
 * - SDG coverage impact
 */

import type {
  ScenarioParameters,
  ScenarioResult,
  MetricDelta,
  SDGTarget,
} from '@teei/shared-types';
import { Pool } from 'pg';

/**
 * Baseline metrics data
 */
export interface BaselineData {
  // VIS metrics
  visScore: number;
  totalVolunteerHours: number;
  totalParticipants: number;
  activityBreakdown: {
    matches: number;
    events: number;
    skill_shares: number;
    feedback: number;
    milestones: number;
    checkins: number;
  };

  // SROI metrics
  sroiRatio: number;
  totalGrantAmount: number;
  totalSocialValue: number;

  // SDG coverage
  sdgTargets: SDGTarget[];

  // Program mix
  programMix: {
    buddy: number; // Fraction 0-1
    language: number;
    mentorship: number;
    upskilling: number;
  };
}

/**
 * Scenario calculation context
 */
export interface ScenarioContext {
  companyId: string;
  period: {
    start: Date;
    end: Date;
  };
  baseline: BaselineData;
  parameters: ScenarioParameters;
}

/**
 * Calculate metric delta
 */
function calculateDelta(
  metric: string,
  baseline: number,
  scenario: number,
  unit?: string
): MetricDelta {
  const delta = scenario - baseline;
  const deltaPercent = baseline !== 0 ? (delta / baseline) * 100 : 0;

  return {
    metric,
    baseline,
    scenario,
    delta,
    deltaPercent: parseFloat(deltaPercent.toFixed(2)),
    unit,
  };
}

/**
 * Apply volunteer hours adjustment
 */
function applyVolunteerHoursAdjustment(
  baseline: number,
  params: ScenarioParameters
): number {
  if (!params.volunteerHours) return baseline;

  // Use absolute value if provided, otherwise apply multiplier
  if (params.volunteerHours.absoluteValue !== undefined) {
    return params.volunteerHours.absoluteValue;
  }

  return baseline * params.volunteerHours.adjustment;
}

/**
 * Apply grant amount adjustment
 */
function applyGrantAmountAdjustment(
  baseline: number,
  params: ScenarioParameters
): number {
  if (!params.grantAmount) return baseline;

  if (params.grantAmount.absoluteValue !== undefined) {
    return params.grantAmount.absoluteValue;
  }

  return baseline * params.grantAmount.adjustment;
}

/**
 * Apply cohort size adjustment
 */
function applyCohortSizeAdjustment(
  baseline: number,
  params: ScenarioParameters
): number {
  if (!params.cohortSize) return baseline;

  if (params.cohortSize.absoluteValue !== undefined) {
    return params.cohortSize.absoluteValue;
  }

  return Math.round(baseline * params.cohortSize.adjustment);
}

/**
 * Calculate VIS impact from parameter changes
 *
 * VIS is driven by:
 * - Number of participants (cohort size)
 * - Activity levels (affected by volunteer hours, program mix)
 * - Decay parameters
 */
function calculateVISImpact(
  context: ScenarioContext
): { baseline: number; scenario: number } {
  const { baseline, parameters } = context;

  // Start with baseline VIS
  let scenarioVIS = baseline.visScore;

  // 1. Cohort size impact: More participants = potential for higher aggregate VIS
  //    But individual VIS might stay similar, so use square root scaling
  if (parameters.cohortSize) {
    const cohortSizeMultiplier = parameters.cohortSize.absoluteValue
      ? parameters.cohortSize.absoluteValue / baseline.totalParticipants
      : parameters.cohortSize.adjustment;

    // Square root scaling: doubling participants increases VIS by ~1.4x
    scenarioVIS *= Math.sqrt(cohortSizeMultiplier);
  }

  // 2. Volunteer hours impact: More hours = more engagement = higher VIS
  //    Linear relationship assumed
  if (parameters.volunteerHours) {
    const hoursMultiplier = parameters.volunteerHours.absoluteValue
      ? parameters.volunteerHours.absoluteValue / baseline.totalVolunteerHours
      : parameters.volunteerHours.adjustment;

    scenarioVIS *= hoursMultiplier;
  }

  // 3. Program mix impact: Different programs have different VIS potential
  //    Buddy: 1.0x, Language: 0.9x, Mentorship: 1.1x, Upskilling: 1.05x
  if (parameters.programMix) {
    const programWeights = {
      buddy: 1.0,
      language: 0.9,
      mentorship: 1.1,
      upskilling: 1.05,
    };

    const baselineWeight =
      baseline.programMix.buddy * programWeights.buddy +
      baseline.programMix.language * programWeights.language +
      baseline.programMix.mentorship * programWeights.mentorship +
      baseline.programMix.upskilling * programWeights.upskilling;

    const scenarioWeight =
      parameters.programMix.buddy * programWeights.buddy +
      parameters.programMix.language * programWeights.language +
      parameters.programMix.mentorship * programWeights.mentorship +
      parameters.programMix.upskilling * programWeights.upskilling;

    scenarioVIS *= scenarioWeight / baselineWeight;
  }

  // 4. Decay parameter impact: Lower lambda = less decay = higher VIS
  if (parameters.visDecayLambda !== undefined) {
    // Assuming baseline lambda = 0.01
    const baselineLambda = 0.01;
    const decayImpact = baselineLambda / (parameters.visDecayLambda || 0.01);
    scenarioVIS *= decayImpact;
  }

  if (parameters.visEnableDecay === false) {
    // Disabling decay typically increases scores by ~20%
    scenarioVIS *= 1.2;
  }

  return {
    baseline: baseline.visScore,
    scenario: parseFloat(scenarioVIS.toFixed(2)),
  };
}

/**
 * Calculate SROI impact from parameter changes
 *
 * SROI = Total Social Value / Total Investment
 *
 * Affected by:
 * - Grant amounts (investment side)
 * - Cohort size, hours (value side)
 * - Discount rate, time horizon
 */
function calculateSROIImpact(
  context: ScenarioContext
): { baseline: number; scenario: number } {
  const { baseline, parameters } = context;

  let scenarioSocialValue = baseline.totalSocialValue;
  let scenarioInvestment = baseline.totalGrantAmount;

  // 1. Grant amount directly affects investment
  if (parameters.grantAmount) {
    scenarioInvestment = applyGrantAmountAdjustment(baseline.totalGrantAmount, parameters);
  }

  // 2. Cohort size affects social value (more participants = more value)
  //    Assumes linear relationship with slight economies of scale
  if (parameters.cohortSize) {
    const cohortMultiplier = parameters.cohortSize.absoluteValue
      ? parameters.cohortSize.absoluteValue / baseline.totalParticipants
      : parameters.cohortSize.adjustment;

    // Apply 0.95 exponent for slight economies of scale
    scenarioSocialValue *= Math.pow(cohortMultiplier, 0.95);
  }

  // 3. Volunteer hours affect value creation
  if (parameters.volunteerHours) {
    const hoursMultiplier = parameters.volunteerHours.absoluteValue
      ? parameters.volunteerHours.absoluteValue / baseline.totalVolunteerHours
      : parameters.volunteerHours.adjustment;

    scenarioSocialValue *= hoursMultiplier;
  }

  // 4. Program mix affects value multipliers
  //    Different programs have different social value per participant
  if (parameters.programMix) {
    const valueMultipliers = {
      buddy: 1.0,
      language: 1.15, // Language has higher employment impact
      mentorship: 1.1,
      upskilling: 1.2, // Highest value per participant
    };

    const baselineValue =
      baseline.programMix.buddy * valueMultipliers.buddy +
      baseline.programMix.language * valueMultipliers.language +
      baseline.programMix.mentorship * valueMultipliers.mentorship +
      baseline.programMix.upskilling * valueMultipliers.upskilling;

    const scenarioValue =
      parameters.programMix.buddy * valueMultipliers.buddy +
      parameters.programMix.language * valueMultipliers.language +
      parameters.programMix.mentorship * valueMultipliers.mentorship +
      parameters.programMix.upskilling * valueMultipliers.upskilling;

    scenarioSocialValue *= scenarioValue / baselineValue;
  }

  // 5. Discount rate affects NPV calculation
  if (parameters.sroiDiscountRate !== undefined) {
    // Simplified: higher discount rate reduces present value
    const baselineRate = 0.05; // Assume 5% baseline
    const discountImpact =
      (1 - baselineRate) / (1 - (parameters.sroiDiscountRate || 0.05));
    scenarioSocialValue *= discountImpact;
  }

  // Calculate SROI ratios
  const scenarioSROI = scenarioInvestment > 0 ? scenarioSocialValue / scenarioInvestment : 0;

  return {
    baseline: baseline.sroiRatio,
    scenario: parseFloat(scenarioSROI.toFixed(2)),
  };
}

/**
 * Calculate SDG coverage impact
 *
 * Different program mixes cover different SDG targets
 */
function calculateSDGImpact(context: ScenarioContext): {
  baseline: SDGTarget[];
  scenario: SDGTarget[];
  newTargets: SDGTarget[];
  lostTargets: SDGTarget[];
} {
  const { baseline, parameters } = context;

  // Map programs to SDG targets
  const programSDGMap: Record<string, SDGTarget[]> = {
    buddy: [
      { goal: 10, target: '10.2', description: 'Social inclusion and integration' },
      { goal: 8, target: '8.5', description: 'Decent work and employment' },
    ],
    language: [
      { goal: 4, target: '4.4', description: 'Skills for employment' },
      { goal: 10, target: '10.2', description: 'Social inclusion' },
    ],
    mentorship: [
      { goal: 8, target: '8.5', description: 'Employment and career development' },
      { goal: 4, target: '4.4', description: 'Professional skills development' },
    ],
    upskilling: [
      { goal: 4, target: '4.4', description: 'Technical and vocational skills' },
      { goal: 8, target: '8.6', description: 'Youth employment and training' },
    ],
  };

  let scenarioTargets = [...baseline.sdgTargets];

  // If program mix changed, recalculate SDG coverage
  if (parameters.programMix) {
    const allTargets = new Map<string, SDGTarget>();

    // Add targets based on program mix thresholds
    // A program must be >10% of mix to contribute its SDG targets
    Object.entries(parameters.programMix).forEach(([program, fraction]) => {
      if (fraction > 0.1) {
        const targets = programSDGMap[program] || [];
        targets.forEach((target) => {
          const key = `${target.goal}-${target.target}`;
          allTargets.set(key, target);
        });
      }
    });

    scenarioTargets = Array.from(allTargets.values());
  }

  // Find new and lost targets
  const baselineKeys = new Set(baseline.sdgTargets.map((t) => `${t.goal}-${t.target}`));
  const scenarioKeys = new Set(scenarioTargets.map((t) => `${t.goal}-${t.target}`));

  const newTargets = scenarioTargets.filter((t) => !baselineKeys.has(`${t.goal}-${t.target}`));
  const lostTargets = baseline.sdgTargets.filter((t) => !scenarioKeys.has(`${t.goal}-${t.target}`));

  return {
    baseline: baseline.sdgTargets,
    scenario: scenarioTargets,
    newTargets,
    lostTargets,
  };
}

/**
 * Execute scenario and compute metric deltas
 */
export async function executeScenario(
  context: ScenarioContext,
  scenarioId: string
): Promise<ScenarioResult> {
  const startTime = Date.now();

  // Calculate VIS impact
  const visImpact = calculateVISImpact(context);
  const visDelta = calculateDelta('vis', visImpact.baseline, visImpact.scenario, 'points');

  // Calculate SROI impact
  const sroiImpact = calculateSROIImpact(context);
  const sroiDelta = calculateDelta('sroi', sroiImpact.baseline, sroiImpact.scenario, 'ratio');

  // Calculate volunteer hours delta
  const scenarioHours = applyVolunteerHoursAdjustment(
    context.baseline.totalVolunteerHours,
    context.parameters
  );
  const hoursDelta = calculateDelta(
    'volunteer_hours',
    context.baseline.totalVolunteerHours,
    scenarioHours,
    'hours'
  );

  // Calculate participant delta
  const scenarioParticipants = applyCohortSizeAdjustment(
    context.baseline.totalParticipants,
    context.parameters
  );
  const participantsDelta = calculateDelta(
    'participants',
    context.baseline.totalParticipants,
    scenarioParticipants,
    'count'
  );

  // Calculate grant amount delta
  const scenarioGrant = applyGrantAmountAdjustment(
    context.baseline.totalGrantAmount,
    context.parameters
  );
  const grantDelta = calculateDelta(
    'grant_amount',
    context.baseline.totalGrantAmount,
    scenarioGrant,
    'EUR'
  );

  // Calculate SDG impact
  const sdgImpact = calculateSDGImpact(context);

  const duration = Date.now() - startTime;

  return {
    scenarioId,
    executedAt: new Date().toISOString(),
    parameters: context.parameters,
    metrics: {
      vis: visDelta,
      sroi: sroiDelta,
      totalVolunteerHours: hoursDelta,
      totalParticipants: participantsDelta,
      totalGrantAmount: grantDelta,
    },
    sdgCoverage: sdgImpact,
    metadata: {
      calculationDurationMs: duration,
      dataPointsAnalyzed:
        context.baseline.totalParticipants +
        context.baseline.activityBreakdown.matches +
        context.baseline.activityBreakdown.events,
      warnings: [],
    },
  };
}

/**
 * Fetch baseline data for a company
 */
export async function fetchBaselineData(
  pool: Pool,
  companyId: string,
  period: { start: Date; end: Date }
): Promise<BaselineData> {
  // Fetch VIS metrics
  const visQuery = await pool.query(
    `
    SELECT
      AVG(current_vis) as avg_vis,
      SUM((activity_breakdown->>'matches')::int) as total_matches,
      SUM((activity_breakdown->>'events')::int) as total_events,
      SUM((activity_breakdown->>'skill_shares')::int) as total_skill_shares,
      SUM((activity_breakdown->>'feedback')::int) as total_feedback,
      SUM((activity_breakdown->>'milestones')::int) as total_milestones,
      SUM((activity_breakdown->>'checkins')::int) as total_checkins,
      COUNT(DISTINCT user_id) as total_participants
    FROM vis_scores v
    JOIN users u ON v.user_id = u.id
    WHERE u.company_id = $1
      AND v.calculated_at >= $2
      AND v.calculated_at <= $3
    `,
    [companyId, period.start, period.end]
  );

  // Fetch SROI metrics (placeholder - adjust based on actual schema)
  const sroiQuery = await pool.query(
    `
    SELECT
      sroi_ratio,
      total_investment as grant_amount,
      total_social_value
    FROM metrics_company_period
    WHERE company_id = $1
      AND period_start = $2
      AND period_end = $3
    LIMIT 1
    `,
    [companyId, period.start, period.end]
  );

  // Fetch program mix (placeholder)
  const programMixQuery = await pool.query(
    `
    SELECT
      program_type,
      COUNT(*) as participant_count
    FROM program_enrollments
    WHERE company_id = $1
      AND enrolled_at >= $2
      AND enrolled_at <= $3
    GROUP BY program_type
    `,
    [companyId, period.start, period.end]
  );

  // Calculate program mix fractions
  const programCounts: Record<string, number> = {
    buddy: 0,
    language: 0,
    mentorship: 0,
    upskilling: 0,
  };

  programMixQuery.rows.forEach((row) => {
    programCounts[row.program_type] = parseInt(row.participant_count);
  });

  const totalProgramParticipants = Object.values(programCounts).reduce((a, b) => a + b, 0);
  const programMix = {
    buddy: programCounts.buddy / totalProgramParticipants || 0.25,
    language: programCounts.language / totalProgramParticipants || 0.25,
    mentorship: programCounts.mentorship / totalProgramParticipants || 0.25,
    upskilling: programCounts.upskilling / totalProgramParticipants || 0.25,
  };

  // SDG targets (hardcoded for now, can be fetched from DB)
  const sdgTargets: SDGTarget[] = [
    { goal: 4, target: '4.4', description: 'Skills for employment' },
    { goal: 8, target: '8.5', description: 'Decent work and employment' },
    { goal: 10, target: '10.2', description: 'Social inclusion' },
  ];

  const visRow = visQuery.rows[0];
  const sroiRow = sroiQuery.rows[0] || {
    sroi_ratio: 3.2,
    grant_amount: 100000,
    total_social_value: 320000,
  };

  // Calculate total volunteer hours from activity breakdown
  // Assume: 1 match = 2h, 1 event = 1h, 1 skill_share = 3h, etc.
  const totalVolunteerHours =
    (parseInt(visRow.total_matches) || 0) * 2 +
    (parseInt(visRow.total_events) || 0) * 1 +
    (parseInt(visRow.total_skill_shares) || 0) * 3 +
    (parseInt(visRow.total_feedback) || 0) * 0.5 +
    (parseInt(visRow.total_milestones) || 0) * 1 +
    (parseInt(visRow.total_checkins) || 0) * 0.25;

  return {
    visScore: parseFloat(visRow.avg_vis) || 0,
    totalVolunteerHours,
    totalParticipants: parseInt(visRow.total_participants) || 0,
    activityBreakdown: {
      matches: parseInt(visRow.total_matches) || 0,
      events: parseInt(visRow.total_events) || 0,
      skill_shares: parseInt(visRow.total_skill_shares) || 0,
      feedback: parseInt(visRow.total_feedback) || 0,
      milestones: parseInt(visRow.total_milestones) || 0,
      checkins: parseInt(visRow.total_checkins) || 0,
    },
    sroiRatio: parseFloat(sroiRow.sroi_ratio) || 0,
    totalGrantAmount: parseFloat(sroiRow.grant_amount) || 0,
    totalSocialValue: parseFloat(sroiRow.total_social_value) || 0,
    sdgTargets,
    programMix,
  };
}
