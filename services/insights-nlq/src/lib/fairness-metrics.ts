/**
 * Fairness Metrics Computation Library
 *
 * Computes demographic parity (DP), equal opportunity (EO), and equalized odds (EOpp)
 * for NLQ outputs to detect and mitigate bias across protected attributes.
 *
 * References:
 * - Demographic Parity: P(Ŷ=1|A=0) = P(Ŷ=1|A=1)
 * - Equal Opportunity: P(Ŷ=1|Y=1,A=0) = P(Ŷ=1|Y=1,A=1)
 * - Equalized Odds: P(Ŷ=1|Y=y,A=0) = P(Ŷ=1|Y=y,A=1) for y ∈ {0,1}
 *
 * For NLQ, we define:
 * - Ŷ = 1 if query is approved/high confidence (>= 0.7)
 * - Y = 1 if query is actually correct (determined by HIL review)
 * - A = protected attribute (gender, ethnicity, age_group, etc.)
 */

import { db } from '@teei/shared-schema';
import {
  nlqQueries,
  adjudicationReviews,
  fairnessMetrics as fairnessMetricsTable,
} from '@teei/shared-schema/schema/nlq';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('fairness-metrics');

// ===== TYPES =====

export interface DemographicParityResult {
  groupA: string;
  groupB: string;
  groupAPositiveRate: number; // P(Ŷ=1|A=0)
  groupBPositiveRate: number; // P(Ŷ=1|A=1)
  disparityRatio: number; // groupA / groupB
  absoluteDifference: number; // |groupA - groupB|
  sampleSizeA: number;
  sampleSizeB: number;
  pValue: number | null;
  confidenceInterval: { lower: number; upper: number } | null;
}

export interface EqualOpportunityResult {
  groupA: string;
  groupB: string;
  groupATruePositiveRate: number; // P(Ŷ=1|Y=1,A=0)
  groupBTruePositiveRate: number; // P(Ŷ=1|Y=1,A=1)
  disparityRatio: number;
  absoluteDifference: number;
  sampleSizeA: number;
  sampleSizeB: number;
  pValue: number | null;
}

export interface EqualizedOddsResult {
  groupA: string;
  groupB: string;
  groupATruePositiveRate: number; // P(Ŷ=1|Y=1,A=0)
  groupBTruePositiveRate: number; // P(Ŷ=1|Y=1,A=1)
  groupAFalsePositiveRate: number; // P(Ŷ=1|Y=0,A=0)
  groupBFalsePositiveRate: number; // P(Ŷ=1|Y=0,A=1)
  disparityRatio: number;
  absoluteDifference: number;
  sampleSizeA: number;
  sampleSizeB: number;
}

export interface FairnessAuditParams {
  companyId?: string;
  startDate: Date;
  endDate: Date;
  protectedAttribute: string; // 'gender', 'ethnicity', 'age_group'
  groupA: string; // e.g., 'female'
  groupB: string; // e.g., 'male'
  confidenceThreshold?: number; // Default 0.7
}

export interface FairnessAuditResult {
  demographicParity: DemographicParityResult;
  equalOpportunity: EqualOpportunityResult | null;
  equalizedOdds: EqualizedOddsResult | null;
  thresholdExceeded: boolean;
  alertSeverity: 'low' | 'medium' | 'high' | 'critical' | null;
  recommendations: string[];
}

// ===== MAIN COMPUTATION FUNCTIONS =====

/**
 * Compute demographic parity for NLQ queries
 *
 * Demographic parity ensures that the positive prediction rate is similar across groups.
 * For NLQ, we consider a query "positive" if its confidence >= threshold.
 */
export async function computeDemographicParity(params: FairnessAuditParams): Promise<DemographicParityResult> {
  const { companyId, startDate, endDate, protectedAttribute, groupA, groupB, confidenceThreshold = 0.7 } = params;

  logger.info('Computing demographic parity', { protectedAttribute, groupA, groupB });

  // NOTE: This assumes we have demographic data linked to queries or users
  // In practice, you'd need a join to a user demographics table

  // For now, we'll simulate the computation with placeholder logic
  // In production, you'd query actual demographic data

  // Query all successful queries in the time range
  const baseConditions: any[] = [
    eq(nlqQueries.executionStatus, 'success'),
    gte(nlqQueries.createdAt, startDate),
    lte(nlqQueries.createdAt, endDate),
  ];

  if (companyId) {
    baseConditions.push(eq(nlqQueries.companyId, companyId));
  }

  const allQueries = await db
    .select({
      id: nlqQueries.id,
      userId: nlqQueries.userId,
      answerConfidence: nlqQueries.answerConfidence,
      // In production: join to user demographics table
      // userDemographics: users.demographics
    })
    .from(nlqQueries)
    .where(and(...baseConditions));

  // PLACEHOLDER: In production, filter by actual demographic attribute
  // For now, randomly assign to demonstrate the computation
  const groupAQueries = allQueries.filter((q, idx) => idx % 2 === 0);
  const groupBQueries = allQueries.filter((q, idx) => idx % 2 === 1);

  // Compute positive rates (high confidence)
  const groupAPositiveCount = groupAQueries.filter(
    (q) => parseFloat(q.answerConfidence || '0') >= confidenceThreshold
  ).length;
  const groupBPositiveCount = groupBQueries.filter(
    (q) => parseFloat(q.answerConfidence || '0') >= confidenceThreshold
  ).length;

  const groupAPositiveRate = groupAQueries.length > 0 ? groupAPositiveCount / groupAQueries.length : 0;
  const groupBPositiveRate = groupBQueries.length > 0 ? groupBPositiveCount / groupBQueries.length : 0;

  const disparityRatio = groupBPositiveRate > 0 ? groupAPositiveRate / groupBPositiveRate : 0;
  const absoluteDifference = Math.abs(groupAPositiveRate - groupBPositiveRate);

  // Compute statistical significance (two-proportion z-test)
  const pValue = computeTwoProportionZTest({
    x1: groupAPositiveCount,
    n1: groupAQueries.length,
    x2: groupBPositiveCount,
    n2: groupBQueries.length,
  });

  // Compute confidence interval for disparity ratio
  const confidenceInterval = computeConfidenceInterval({
    p1: groupAPositiveRate,
    n1: groupAQueries.length,
    p2: groupBPositiveRate,
    n2: groupBQueries.length,
  });

  return {
    groupA,
    groupB,
    groupAPositiveRate,
    groupBPositiveRate,
    disparityRatio,
    absoluteDifference,
    sampleSizeA: groupAQueries.length,
    sampleSizeB: groupBQueries.length,
    pValue,
    confidenceInterval,
  };
}

/**
 * Compute equal opportunity
 *
 * Equal opportunity ensures that true positive rates are similar across groups.
 * For NLQ, we use HIL adjudication to determine ground truth.
 */
export async function computeEqualOpportunity(params: FairnessAuditParams): Promise<EqualOpportunityResult | null> {
  const { companyId, startDate, endDate, protectedAttribute, groupA, groupB, confidenceThreshold = 0.7 } = params;

  logger.info('Computing equal opportunity', { protectedAttribute, groupA, groupB });

  // Query all adjudicated queries in the time range
  const baseConditions: any[] = [
    gte(adjudicationReviews.reviewedAt, startDate),
    lte(adjudicationReviews.reviewedAt, endDate),
    inArray(adjudicationReviews.decision, ['approved', 'revised']), // Ground truth: Y=1
  ];

  if (companyId) {
    baseConditions.push(eq(adjudicationReviews.companyId, companyId));
  }

  const adjudicatedQueries = await db
    .select({
      queryId: adjudicationReviews.queryId,
      decision: adjudicationReviews.decision,
      query: nlqQueries,
    })
    .from(adjudicationReviews)
    .innerJoin(nlqQueries, eq(adjudicationReviews.queryId, nlqQueries.id))
    .where(and(...baseConditions));

  if (adjudicatedQueries.length === 0) {
    logger.warn('No adjudicated queries found for equal opportunity computation');
    return null;
  }

  // PLACEHOLDER: Filter by demographic attribute (needs user demographics table)
  const groupAQueries = adjudicatedQueries.filter((q, idx) => idx % 2 === 0);
  const groupBQueries = adjudicatedQueries.filter((q, idx) => idx % 2 === 1);

  // Compute true positive rates
  // TP = model predicted positive (high confidence) AND ground truth is positive (approved/revised)
  const groupATP = groupAQueries.filter((q) => parseFloat(q.query.answerConfidence || '0') >= confidenceThreshold)
    .length;
  const groupBTP = groupBQueries.filter((q) => parseFloat(q.query.answerConfidence || '0') >= confidenceThreshold)
    .length;

  const groupATruePositiveRate = groupAQueries.length > 0 ? groupATP / groupAQueries.length : 0;
  const groupBTruePositiveRate = groupBQueries.length > 0 ? groupBTP / groupBQueries.length : 0;

  const disparityRatio = groupBTruePositiveRate > 0 ? groupATruePositiveRate / groupBTruePositiveRate : 0;
  const absoluteDifference = Math.abs(groupATruePositiveRate - groupBTruePositiveRate);

  // Statistical significance
  const pValue = computeTwoProportionZTest({
    x1: groupATP,
    n1: groupAQueries.length,
    x2: groupBTP,
    n2: groupBQueries.length,
  });

  return {
    groupA,
    groupB,
    groupATruePositiveRate,
    groupBTruePositiveRate,
    disparityRatio,
    absoluteDifference,
    sampleSizeA: groupAQueries.length,
    sampleSizeB: groupBQueries.length,
    pValue,
  };
}

/**
 * Compute equalized odds
 *
 * Equalized odds ensures both TPR and FPR are similar across groups.
 */
export async function computeEqualizedOdds(params: FairnessAuditParams): Promise<EqualizedOddsResult | null> {
  const { companyId, startDate, endDate, protectedAttribute, groupA, groupB, confidenceThreshold = 0.7 } = params;

  logger.info('Computing equalized odds', { protectedAttribute, groupA, groupB });

  // Query all adjudicated queries (both approved and rejected)
  const baseConditions: any[] = [
    gte(adjudicationReviews.reviewedAt, startDate),
    lte(adjudicationReviews.reviewedAt, endDate),
  ];

  if (companyId) {
    baseConditions.push(eq(adjudicationReviews.companyId, companyId));
  }

  const adjudicatedQueries = await db
    .select({
      queryId: adjudicationReviews.queryId,
      decision: adjudicationReviews.decision,
      query: nlqQueries,
    })
    .from(adjudicationReviews)
    .innerJoin(nlqQueries, eq(adjudicationReviews.queryId, nlqQueries.id))
    .where(and(...baseConditions));

  if (adjudicatedQueries.length === 0) {
    logger.warn('No adjudicated queries found for equalized odds computation');
    return null;
  }

  // PLACEHOLDER: Filter by demographic attribute
  const groupAQueries = adjudicatedQueries.filter((q, idx) => idx % 2 === 0);
  const groupBQueries = adjudicatedQueries.filter((q, idx) => idx % 2 === 1);

  // Split into positive (Y=1) and negative (Y=0) ground truth
  const groupAPositive = groupAQueries.filter((q) => ['approved', 'revised'].includes(q.decision));
  const groupANegative = groupAQueries.filter((q) => q.decision === 'rejected');
  const groupBPositive = groupBQueries.filter((q) => ['approved', 'revised'].includes(q.decision));
  const groupBNegative = groupBQueries.filter((q) => q.decision === 'rejected');

  // Compute TPR (same as equal opportunity)
  const groupATP = groupAPositive.filter((q) => parseFloat(q.query.answerConfidence || '0') >= confidenceThreshold)
    .length;
  const groupBTP = groupBPositive.filter((q) => parseFloat(q.query.answerConfidence || '0') >= confidenceThreshold)
    .length;

  const groupATruePositiveRate = groupAPositive.length > 0 ? groupATP / groupAPositive.length : 0;
  const groupBTruePositiveRate = groupBPositive.length > 0 ? groupBTP / groupBPositive.length : 0;

  // Compute FPR
  const groupAFP = groupANegative.filter((q) => parseFloat(q.query.answerConfidence || '0') >= confidenceThreshold)
    .length;
  const groupBFP = groupBNegative.filter((q) => parseFloat(q.query.answerConfidence || '0') >= confidenceThreshold)
    .length;

  const groupAFalsePositiveRate = groupANegative.length > 0 ? groupAFP / groupANegative.length : 0;
  const groupBFalsePositiveRate = groupBNegative.length > 0 ? groupBFP / groupBNegative.length : 0;

  // Disparity based on max of TPR and FPR disparities
  const tprDisparity = Math.abs(groupATruePositiveRate - groupBTruePositiveRate);
  const fprDisparity = Math.abs(groupAFalsePositiveRate - groupBFalsePositiveRate);
  const disparityRatio = Math.max(tprDisparity, fprDisparity);

  return {
    groupA,
    groupB,
    groupATruePositiveRate,
    groupBTruePositiveRate,
    groupAFalsePositiveRate,
    groupBFalsePositiveRate,
    disparityRatio,
    absoluteDifference: disparityRatio, // Use max disparity
    sampleSizeA: groupAQueries.length,
    sampleSizeB: groupBQueries.length,
  };
}

/**
 * Run complete fairness audit and persist results
 */
export async function runFairnessAudit(params: FairnessAuditParams): Promise<FairnessAuditResult> {
  logger.info('Running fairness audit', params);

  // Compute all three metrics
  const [dp, eo, eqOdds] = await Promise.all([
    computeDemographicParity(params),
    computeEqualOpportunity(params),
    computeEqualizedOdds(params),
  ]);

  // Determine if threshold exceeded (>10% disparity)
  const DISPARITY_THRESHOLD = 0.10;
  const thresholdExceeded =
    dp.absoluteDifference > DISPARITY_THRESHOLD ||
    (eo && eo.absoluteDifference > DISPARITY_THRESHOLD) ||
    (eqOdds && eqOdds.absoluteDifference > DISPARITY_THRESHOLD);

  // Determine alert severity
  let alertSeverity: 'low' | 'medium' | 'high' | 'critical' | null = null;
  if (thresholdExceeded) {
    const maxDisparity = Math.max(
      dp.absoluteDifference,
      eo?.absoluteDifference || 0,
      eqOdds?.absoluteDifference || 0
    );

    if (maxDisparity > 0.25) alertSeverity = 'critical';
    else if (maxDisparity > 0.20) alertSeverity = 'high';
    else if (maxDisparity > 0.15) alertSeverity = 'medium';
    else alertSeverity = 'low';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (dp.absoluteDifference > DISPARITY_THRESHOLD) {
    recommendations.push(
      `Demographic parity disparity of ${(dp.absoluteDifference * 100).toFixed(1)}% detected. Consider reviewing query templates for bias.`
    );
  }
  if (eo && eo.absoluteDifference > DISPARITY_THRESHOLD) {
    recommendations.push(
      `Equal opportunity disparity of ${(eo.absoluteDifference * 100).toFixed(1)}% detected. Model may perform differently across groups.`
    );
  }
  if (eqOdds && eqOdds.absoluteDifference > DISPARITY_THRESHOLD) {
    recommendations.push(
      `Equalized odds disparity of ${(eqOdds.absoluteDifference * 100).toFixed(1)}% detected. Review confidence thresholds.`
    );
  }

  // Persist to database
  await persistFairnessMetrics({
    companyId: params.companyId,
    metricDate: new Date(),
    periodType: 'daily',
    demographicParity: dp,
    equalOpportunity: eo,
    thresholdExceeded,
    alertSeverity,
    protectedAttribute: params.protectedAttribute,
    queryCategory: 'nlq_general',
  });

  return {
    demographicParity: dp,
    equalOpportunity: eo,
    equalizedOdds: eqOdds,
    thresholdExceeded,
    alertSeverity,
    recommendations,
  };
}

/**
 * Persist fairness metrics to database
 */
async function persistFairnessMetrics(params: {
  companyId?: string;
  metricDate: Date;
  periodType: 'daily' | 'weekly' | 'monthly';
  demographicParity: DemographicParityResult;
  equalOpportunity: EqualOpportunityResult | null;
  thresholdExceeded: boolean;
  alertSeverity: 'low' | 'medium' | 'high' | 'critical' | null;
  protectedAttribute: string;
  queryCategory: string;
}): Promise<void> {
  const { companyId, metricDate, periodType, demographicParity, equalOpportunity, thresholdExceeded, alertSeverity, protectedAttribute, queryCategory } =
    params;

  // Store demographic parity
  await db.insert(fairnessMetricsTable).values({
    companyId: companyId || null,
    metricDate,
    periodType,
    metricType: 'demographic_parity',
    protectedAttribute,
    groupA: demographicParity.groupA,
    groupB: demographicParity.groupB,
    groupAValue: demographicParity.groupAPositiveRate.toString(),
    groupBValue: demographicParity.groupBPositiveRate.toString(),
    disparityRatio: demographicParity.disparityRatio.toString(),
    absoluteDifference: demographicParity.absoluteDifference.toString(),
    sampleSizeA: demographicParity.sampleSizeA,
    sampleSizeB: demographicParity.sampleSizeB,
    pValue: demographicParity.pValue?.toString() || null,
    confidenceInterval: demographicParity.confidenceInterval as any,
    thresholdExceeded,
    alertSeverity,
    alertTriggered: thresholdExceeded,
    alertedAt: thresholdExceeded ? new Date() : null,
    queryCategory,
    mitigationRequired: thresholdExceeded && alertSeverity && ['high', 'critical'].includes(alertSeverity),
    mitigationStatus: thresholdExceeded ? 'pending' : null,
  });

  // Store equal opportunity if available
  if (equalOpportunity) {
    await db.insert(fairnessMetricsTable).values({
      companyId: companyId || null,
      metricDate,
      periodType,
      metricType: 'equal_opportunity',
      protectedAttribute,
      groupA: equalOpportunity.groupA,
      groupB: equalOpportunity.groupB,
      groupAValue: equalOpportunity.groupATruePositiveRate.toString(),
      groupBValue: equalOpportunity.groupBTruePositiveRate.toString(),
      disparityRatio: equalOpportunity.disparityRatio.toString(),
      absoluteDifference: equalOpportunity.absoluteDifference.toString(),
      sampleSizeA: equalOpportunity.sampleSizeA,
      sampleSizeB: equalOpportunity.sampleSizeB,
      pValue: equalOpportunity.pValue?.toString() || null,
      confidenceInterval: null,
      thresholdExceeded,
      alertSeverity,
      alertTriggered: thresholdExceeded,
      alertedAt: thresholdExceeded ? new Date() : null,
      queryCategory,
      mitigationRequired: thresholdExceeded && alertSeverity && ['high', 'critical'].includes(alertSeverity),
      mitigationStatus: thresholdExceeded ? 'pending' : null,
    });
  }

  logger.info('Fairness metrics persisted', { protectedAttribute, thresholdExceeded, alertSeverity });
}

// ===== STATISTICAL HELPERS =====

/**
 * Two-proportion z-test for statistical significance
 */
function computeTwoProportionZTest(params: { x1: number; n1: number; x2: number; n2: number }): number | null {
  const { x1, n1, x2, n2 } = params;

  if (n1 === 0 || n2 === 0) return null;

  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pooledP = (x1 + x2) / (n1 + n2);

  const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  if (standardError === 0) return null;

  const zScore = (p1 - p2) / standardError;

  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  return pValue;
}

/**
 * Compute 95% confidence interval for difference in proportions
 */
function computeConfidenceInterval(params: {
  p1: number;
  n1: number;
  p2: number;
  n2: number;
}): { lower: number; upper: number } | null {
  const { p1, n1, p2, n2 } = params;

  if (n1 === 0 || n2 === 0) return null;

  const diff = p1 - p2;
  const standardError = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);

  const zCritical = 1.96; // 95% confidence

  return {
    lower: diff - zCritical * standardError,
    upper: diff + zCritical * standardError,
  };
}

/**
 * Normal cumulative distribution function
 */
function normalCDF(x: number): number {
  // Approximation using erf
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return x > 0 ? 1 - prob : prob;
}
