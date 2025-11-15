/**
 * VIS Tenant Calibration
 * Per-tenant VIS weight calibration based on organizational priorities
 *
 * This module calibrates Volunteer Impact Score (VIS) weights for specific tenants:
 * 1. Frequency weight - How much to value regular engagement
 * 2. Duration weight - How much to value total hours contributed
 * 3. Skills applied weight - How much to value skill-based volunteering
 * 4. Beneficiary reach weight - How much to value number of people impacted
 */

import type { VISWeights, VISConfig } from '@teei/model-registry';

/**
 * Tenant priorities for VIS calibration
 */
export interface TenantPriorities {
  tenantId: string;
  priorities: {
    consistency: 'low' | 'medium' | 'high';      // How important is regular engagement
    volume: 'low' | 'medium' | 'high';           // How important is total hours
    skillsUtilization: 'low' | 'medium' | 'high'; // How important is skills-based work
    reach: 'low' | 'medium' | 'high';            // How important is beneficiary count
  };
  programType?: 'skills-based' | 'time-based' | 'hybrid';
}

/**
 * Historical VIS data for optimization
 */
export interface HistoricalVISData {
  volunteerId: string;
  totalHours: number;
  sessionsPerMonth: number;
  skillsAppliedScore: number;  // 0-100
  beneficiariesReached: number;
  outcomeImpact: number;       // Measured outcome improvement (0-1)
  recognitionLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

/**
 * VIS calibration result
 */
export interface VISCalibrationResult {
  tenantId: string;
  calibratedWeights: VISWeights;
  confidence: number; // 0-1
  metrics: {
    sampleSize: number;
    correlationWithOutcomes?: number; // If outcome data available
    topVolunteerRetention?: number;   // If retention data available
  };
  programType: 'skills-based' | 'time-based' | 'hybrid';
}

/**
 * Priority level to numeric weight mapping
 */
const PRIORITY_WEIGHTS = {
  low: 0.15,
  medium: 0.25,
  high: 0.35,
};

/**
 * Default weight templates by program type
 */
const WEIGHT_TEMPLATES: Record<string, VISWeights> = {
  'skills-based': {
    frequency: 0.2,
    duration: 0.15,
    skills_applied: 0.4,       // High emphasis on skills
    beneficiary_reach: 0.25,
  },
  'time-based': {
    frequency: 0.25,
    duration: 0.35,            // High emphasis on hours
    skills_applied: 0.15,
    beneficiary_reach: 0.25,
  },
  'hybrid': {
    frequency: 0.25,
    duration: 0.2,
    skills_applied: 0.3,
    beneficiary_reach: 0.25,
  },
};

/**
 * Normalize weights to sum to 1.0
 */
function normalizeWeights(weights: {
  frequency: number;
  duration: number;
  skills_applied: number;
  beneficiary_reach: number;
}): VISWeights {
  const sum = weights.frequency + weights.duration + weights.skills_applied + weights.beneficiary_reach;

  if (sum === 0) {
    // Return default equal weights if sum is zero
    return {
      frequency: 0.25,
      duration: 0.25,
      skills_applied: 0.25,
      beneficiary_reach: 0.25,
    };
  }

  return {
    frequency: weights.frequency / sum,
    duration: weights.duration / sum,
    skills_applied: weights.skills_applied / sum,
    beneficiary_reach: weights.beneficiary_reach / sum,
  };
}

/**
 * Validate VIS weights sum to 1.0
 */
function validateWeights(weights: VISWeights): boolean {
  const sum = weights.frequency + weights.duration + weights.skills_applied + weights.beneficiary_reach;
  return Math.abs(sum - 1.0) < 0.001;
}

/**
 * Calibrate weights from tenant priorities
 *
 * @param priorities - Tenant priorities
 * @returns Calibrated weights
 */
function calibrateFromPriorities(priorities: TenantPriorities['priorities']): VISWeights {
  // Map priorities to initial weights
  const rawWeights = {
    frequency: PRIORITY_WEIGHTS[priorities.consistency],
    duration: PRIORITY_WEIGHTS[priorities.volume],
    skills_applied: PRIORITY_WEIGHTS[priorities.skillsUtilization],
    beneficiary_reach: PRIORITY_WEIGHTS[priorities.reach],
  };

  // Normalize to sum to 1.0
  return normalizeWeights(rawWeights);
}

/**
 * Optimize weights using historical data
 * Finds weights that maximize correlation with actual outcomes
 *
 * @param historicalData - Historical VIS data with outcome measurements
 * @param initialWeights - Starting weights
 * @returns Optimized weights
 */
function optimizeWithHistoricalData(
  historicalData: HistoricalVISData[],
  initialWeights: VISWeights
): {
  weights: VISWeights;
  correlation: number;
} {
  // This is a simplified optimization using correlation analysis
  // In production, could use more sophisticated regression techniques

  let bestWeights = initialWeights;
  let bestCorrelation = calculateCorrelation(historicalData, initialWeights);

  // Grid search over weight space (simplified)
  const steps = 10;
  const stepSize = 1 / steps;

  for (let f = 0; f <= 1; f += stepSize) {
    for (let d = 0; d <= 1 - f; d += stepSize) {
      for (let s = 0; s <= 1 - f - d; s += stepSize) {
        const b = 1 - f - d - s;
        if (b < 0 || b > 1) continue;

        const weights: VISWeights = {
          frequency: f,
          duration: d,
          skills_applied: s,
          beneficiary_reach: b,
        };

        const correlation = calculateCorrelation(historicalData, weights);

        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestWeights = weights;
        }
      }
    }
  }

  return {
    weights: bestWeights,
    correlation: bestCorrelation,
  };
}

/**
 * Calculate correlation between VIS scores and actual outcomes
 *
 * @param data - Historical VIS data
 * @param weights - Weights to test
 * @returns Pearson correlation coefficient
 */
function calculateCorrelation(
  data: HistoricalVISData[],
  weights: VISWeights
): number {
  if (data.length === 0) return 0;

  // Calculate VIS scores with these weights
  const visScores: number[] = [];
  const outcomeScores: number[] = [];

  for (const record of data) {
    // Normalize components to 0-100 scale (simplified)
    const freqScore = Math.min(100, record.sessionsPerMonth * 25);
    const durationScore = Math.min(100, record.totalHours / 2);
    const skillsScore = record.skillsAppliedScore;
    const reachScore = Math.min(100, record.beneficiariesReached * 10);

    const visScore =
      freqScore * weights.frequency +
      durationScore * weights.duration +
      skillsScore * weights.skills_applied +
      reachScore * weights.beneficiary_reach;

    visScores.push(visScore);
    outcomeScores.push(record.outcomeImpact * 100); // Scale to 0-100
  }

  // Calculate Pearson correlation
  return pearsonCorrelation(visScores, outcomeScores);
}

/**
 * Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  if (denomX === 0 || denomY === 0) return 0;

  return numerator / Math.sqrt(denomX * denomY);
}

/**
 * Calculate calibration confidence based on data quality
 *
 * @param data - Historical VIS data
 * @param hasOutcomes - Whether outcome data is available
 * @returns Confidence score (0-1)
 */
function calculateConfidence(
  data: HistoricalVISData[],
  hasOutcomes: boolean
): number {
  const sampleSize = data.length;

  // Sample size contribution (max at 50 volunteers)
  const sizeScore = Math.min(1.0, sampleSize / 50);

  // Outcome data availability
  const outcomeScore = hasOutcomes ? 1.0 : 0.5;

  // Combined confidence
  return (sizeScore * 0.6) + (outcomeScore * 0.4);
}

/**
 * Infer program type from priorities
 */
function inferProgramType(priorities: TenantPriorities['priorities']): 'skills-based' | 'time-based' | 'hybrid' {
  if (priorities.skillsUtilization === 'high' && priorities.volume !== 'high') {
    return 'skills-based';
  }
  if (priorities.volume === 'high' && priorities.skillsUtilization !== 'high') {
    return 'time-based';
  }
  return 'hybrid';
}

/**
 * Calibrate VIS weights for a specific tenant
 *
 * @param priorities - Tenant priorities for VIS components
 * @param historicalData - Optional historical VIS data for optimization
 * @returns Calibrated VIS configuration
 *
 * @example
 * ```typescript
 * // Calibration with priorities only
 * const result = calibrateVISWeights({
 *   tenantId: 'acme-corp',
 *   priorities: {
 *     consistency: 'high',
 *     volume: 'medium',
 *     skillsUtilization: 'high',
 *     reach: 'medium',
 *   },
 *   programType: 'skills-based',
 * });
 *
 * // Save to model registry
 * registry.save({
 *   tenantId: 'acme-corp',
 *   version: '1.0.0',
 *   vis: {
 *     weights: result.calibratedWeights,
 *   },
 * });
 * ```
 */
export function calibrateVISWeights(
  priorities: TenantPriorities,
  historicalData?: HistoricalVISData[]
): VISCalibrationResult {
  // Determine program type
  const programType = priorities.programType || inferProgramType(priorities.priorities);

  // Start with template weights for program type
  let weights = WEIGHT_TEMPLATES[programType];

  // Adjust based on priorities
  const priorityWeights = calibrateFromPriorities(priorities.priorities);

  // Blend template and priority weights (60% template, 40% priorities)
  weights = normalizeWeights({
    frequency: weights.frequency * 0.6 + priorityWeights.frequency * 0.4,
    duration: weights.duration * 0.6 + priorityWeights.duration * 0.4,
    skills_applied: weights.skills_applied * 0.6 + priorityWeights.skills_applied * 0.4,
    beneficiary_reach: weights.beneficiary_reach * 0.6 + priorityWeights.beneficiary_reach * 0.4,
  });

  let correlationWithOutcomes: number | undefined;

  // Optimize with historical data if available
  if (historicalData && historicalData.length > 0) {
    const hasOutcomes = historicalData.some(d => d.outcomeImpact !== undefined);

    if (hasOutcomes) {
      const optimization = optimizeWithHistoricalData(historicalData, weights);
      weights = optimization.weights;
      correlationWithOutcomes = optimization.correlation;
    }
  }

  // Validate final weights
  if (!validateWeights(weights)) {
    throw new Error('Calibrated weights do not sum to 1.0');
  }

  const confidence = calculateConfidence(
    historicalData || [],
    correlationWithOutcomes !== undefined
  );

  return {
    tenantId: priorities.tenantId,
    calibratedWeights: weights,
    confidence,
    metrics: {
      sampleSize: historicalData?.length || 0,
      correlationWithOutcomes,
    },
    programType,
  };
}

/**
 * Validate VIS calibration
 *
 * @param config - VIS configuration to validate
 * @returns Validation result
 */
export function validateVISCalibration(config: VISConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.weights) {
    errors.push('No weights specified in VIS config');
    return { valid: false, errors, warnings };
  }

  const weights = config.weights;

  // Validate individual weights are in range
  for (const [key, value] of Object.entries(weights)) {
    if (value < 0 || value > 1) {
      errors.push(`Weight ${key} must be between 0 and 1, got ${value}`);
    }
    if (value < 0.05) {
      warnings.push(`Weight ${key} is very low (<0.05), component may be undervalued`);
    }
    if (value > 0.6) {
      warnings.push(`Weight ${key} is very high (>0.6), may over-emphasize single component`);
    }
  }

  // Validate sum to 1.0
  if (!validateWeights(weights)) {
    errors.push('Weights must sum to 1.0');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get default VIS config for a program type
 *
 * @param programType - Type of volunteer program
 * @returns Default VIS configuration
 */
export function getDefaultVISConfig(
  programType: 'skills-based' | 'time-based' | 'hybrid' = 'hybrid'
): VISConfig {
  return {
    weights: WEIGHT_TEMPLATES[programType],
  };
}

/**
 * Compare VIS weights and show differences
 *
 * @param current - Current weights
 * @param proposed - Proposed new weights
 * @returns Comparison showing differences
 */
export function compareVISWeights(
  current: VISWeights,
  proposed: VISWeights
): {
  changes: Array<{
    component: string;
    current: number;
    proposed: number;
    difference: number;
    percentChange: number;
  }>;
  totalChange: number;
} {
  const changes = [
    {
      component: 'frequency',
      current: current.frequency,
      proposed: proposed.frequency,
      difference: proposed.frequency - current.frequency,
      percentChange: ((proposed.frequency - current.frequency) / current.frequency) * 100,
    },
    {
      component: 'duration',
      current: current.duration,
      proposed: proposed.duration,
      difference: proposed.duration - current.duration,
      percentChange: ((proposed.duration - current.duration) / current.duration) * 100,
    },
    {
      component: 'skills_applied',
      current: current.skills_applied,
      proposed: proposed.skills_applied,
      difference: proposed.skills_applied - current.skills_applied,
      percentChange: ((proposed.skills_applied - current.skills_applied) / current.skills_applied) * 100,
    },
    {
      component: 'beneficiary_reach',
      current: current.beneficiary_reach,
      proposed: proposed.beneficiary_reach,
      difference: proposed.beneficiary_reach - current.beneficiary_reach,
      percentChange: ((proposed.beneficiary_reach - current.beneficiary_reach) / current.beneficiary_reach) * 100,
    },
  ];

  const totalChange = changes.reduce((sum, c) => sum + Math.abs(c.difference), 0);

  return {
    changes,
    totalChange,
  };
}
