import { VISInputs, VISResult } from '../types.js';

/**
 * Default weights for VIS calculation components
 */
const DEFAULT_WEIGHTS = {
  hours: 0.3,
  quality: 0.3,
  outcome: 0.25,
  placement: 0.15,
};

/**
 * Calculate Volunteer Impact Score (VIS)
 *
 * Formula: VIS = (weighted_hours × quality_score × outcome_lift × placement_impact)
 *
 * VIS is a composite score that measures the effectiveness of volunteer engagement:
 * - Hours component: Quantity of volunteer time invested
 * - Quality component: Participant satisfaction and feedback ratings
 * - Outcome component: Measurable improvement in participant outcomes
 * - Placement component: Success rate in job placement or advancement
 *
 * @param inputs - VIS calculation inputs
 * @returns VIS calculation result with overall score and component breakdown
 */
export function calculateVIS(inputs: VISInputs): VISResult {
  // Apply default weights if not provided
  const weights = {
    hours: inputs.hoursWeight ?? DEFAULT_WEIGHTS.hours,
    quality: inputs.qualityWeight ?? DEFAULT_WEIGHTS.quality,
    outcome: inputs.outcomeWeight ?? DEFAULT_WEIGHTS.outcome,
    placement: inputs.placementWeight ?? DEFAULT_WEIGHTS.placement,
  };

  // Validate inputs
  if (inputs.totalHours < 0) {
    throw new Error('Total hours cannot be negative');
  }
  if (inputs.avgQualityScore < 0 || inputs.avgQualityScore > 1) {
    throw new Error('Average quality score must be between 0 and 1');
  }
  if (inputs.outcomeLift < 0 || inputs.outcomeLift > 1) {
    throw new Error('Outcome lift must be between 0 and 1');
  }
  if (inputs.placementRate < 0 || inputs.placementRate > 1) {
    throw new Error('Placement rate must be between 0 and 1');
  }

  // Validate weights sum to 1.0 (allow small floating point tolerance)
  const weightSum = weights.hours + weights.quality + weights.outcome + weights.placement;
  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(`Weights must sum to 1.0, got ${weightSum}`);
  }

  // Normalize hours to a 0-100 scale (using log scale for hours)
  // Assumption: 1000 hours = 100 points (can be adjusted)
  const MAX_HOURS_FOR_FULL_SCORE = 1000;
  const hoursScore = Math.min(
    (inputs.totalHours / MAX_HOURS_FOR_FULL_SCORE) * 100,
    100
  );

  // Convert other components to 0-100 scale
  const qualityScore = inputs.avgQualityScore * 100;
  const outcomeScore = inputs.outcomeLift * 100;
  const placementScore = inputs.placementRate * 100;

  // Calculate weighted VIS score
  const visScore =
    hoursScore * weights.hours +
    qualityScore * weights.quality +
    outcomeScore * weights.outcome +
    placementScore * weights.placement;

  return {
    score: parseFloat(visScore.toFixed(2)),
    components: {
      hours: parseFloat(hoursScore.toFixed(2)),
      quality: parseFloat(qualityScore.toFixed(2)),
      outcome: parseFloat(outcomeScore.toFixed(2)),
      placement: parseFloat(placementScore.toFixed(2)),
    },
    weights,
  };
}

/**
 * Calculate VIS trend comparing two periods
 *
 * @param currentVIS - Current period VIS result
 * @param previousVIS - Previous period VIS result
 * @returns Percentage change in VIS score
 */
export function calculateVISTrend(currentVIS: VISResult, previousVIS: VISResult): number {
  if (previousVIS.score === 0) {
    return currentVIS.score > 0 ? 100 : 0;
  }

  const percentChange = ((currentVIS.score - previousVIS.score) / previousVIS.score) * 100;
  return parseFloat(percentChange.toFixed(2));
}
