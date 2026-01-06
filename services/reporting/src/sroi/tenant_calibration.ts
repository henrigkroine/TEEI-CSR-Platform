/**
 * SROI Tenant Calibration
 * Per-tenant SROI parameter tuning based on historical outcome data
 *
 * This module calibrates SROI calculation parameters for specific tenants:
 * 1. Deadweight factor - What would have happened anyway
 * 2. Attribution factor - How much can be attributed to the intervention
 * 3. Drop-off rate - Sustainability of outcomes over time
 * 4. Financial proxies - Monetary values per outcome dimension per tenant vertical
 */

import type { SROIConfig } from '@teei/model-registry';

/**
 * Historical outcome data for calibration
 */
export interface HistoricalOutcome {
  outcomeId: string;
  dimension: 'integration' | 'language' | 'job_readiness' | 'wellbeing' | 'belonging';
  baselineScore: number;     // Pre-intervention score (0-1)
  endlineScore: number;      // Post-intervention score (0-1)
  followUpScore?: number;    // Follow-up score after time period (0-1)
  controlGroupScore?: number; // Score from control group if available (0-1)
  volunteerHours: number;
  programCosts: number;
  participantId: string;
  timestamp: string;
}

/**
 * Tenant vertical for industry-specific calibration
 */
export type TenantVertical =
  | 'technology'
  | 'finance'
  | 'healthcare'
  | 'manufacturing'
  | 'retail'
  | 'education'
  | 'nonprofit'
  | 'government'
  | 'other';

/**
 * Calibration result for SROI parameters
 */
export interface SROICalibrationResult {
  tenantId: string;
  vertical: TenantVertical;
  calibratedConfig: SROIConfig;
  confidence: number; // 0-1, based on data quality and quantity
  metrics: {
    sampleSize: number;
    averageImprovement: number;
    attributionAccuracy?: number; // If control group available
    sustainabilityRate?: number;  // If follow-up data available
  };
  financialProxies: Record<string, number>;
}

/**
 * Financial proxy defaults by vertical
 * Values represent the monetary value of a 1-point improvement (0-1 scale)
 */
const FINANCIAL_PROXIES_BY_VERTICAL: Record<TenantVertical, Record<string, number>> = {
  technology: {
    integration: 12000,      // Tech: High value on integration/diversity
    language: 8000,
    job_readiness: 15000,    // Tech: Premium on job skills
    wellbeing: 10000,
    belonging: 11000,
  },
  finance: {
    integration: 11000,
    language: 9000,
    job_readiness: 14000,
    wellbeing: 9000,
    belonging: 10000,
  },
  healthcare: {
    integration: 10000,
    language: 7000,
    job_readiness: 11000,
    wellbeing: 13000,        // Healthcare: High value on wellbeing
    belonging: 9000,
  },
  manufacturing: {
    integration: 8000,
    language: 6000,
    job_readiness: 12000,
    wellbeing: 7000,
    belonging: 7000,
  },
  retail: {
    integration: 7000,
    language: 5000,
    job_readiness: 9000,
    wellbeing: 6000,
    belonging: 6000,
  },
  education: {
    integration: 9000,
    language: 10000,         // Education: High value on language
    job_readiness: 11000,
    wellbeing: 8000,
    belonging: 8000,
  },
  nonprofit: {
    integration: 8000,
    language: 6000,
    job_readiness: 10000,
    wellbeing: 7000,
    belonging: 7500,
  },
  government: {
    integration: 9500,
    language: 7500,
    job_readiness: 11500,
    wellbeing: 8500,
    belonging: 8500,
  },
  other: {
    integration: 8500,
    language: 7000,
    job_readiness: 10500,
    wellbeing: 7500,
    belonging: 7500,
  },
};

/**
 * Calculate deadweight factor from control group data
 * Deadweight = How much would have happened without the intervention
 *
 * @param outcomes - Historical outcomes with control group data
 * @returns Estimated deadweight factor (0-1)
 */
function calculateDeadweightFactor(outcomes: HistoricalOutcome[]): number {
  const outcomesWithControl = outcomes.filter(o => o.controlGroupScore !== undefined);

  if (outcomesWithControl.length === 0) {
    // No control group data, use conservative default
    return 0.1;
  }

  let totalDeadweight = 0;

  for (const outcome of outcomesWithControl) {
    const interventionImprovement = outcome.endlineScore - outcome.baselineScore;
    const controlImprovement = outcome.controlGroupScore! - outcome.baselineScore;

    // Deadweight is the proportion of improvement that would have occurred anyway
    if (interventionImprovement > 0) {
      const deadweight = Math.max(0, Math.min(1, controlImprovement / interventionImprovement));
      totalDeadweight += deadweight;
    }
  }

  return totalDeadweight / outcomesWithControl.length;
}

/**
 * Calculate attribution factor
 * Attribution = How much of the change can be attributed to this specific intervention
 *
 * For simplicity, we use inverse deadweight as a proxy
 * In practice, this should consider displacement and other factors
 *
 * @param deadweightFactor - Calculated deadweight
 * @returns Attribution factor (0-1)
 */
function calculateAttributionFactor(deadweightFactor: number): number {
  // If low deadweight, high attribution
  // Conservative: cap at 0.95 to account for other factors
  return Math.min(0.95, 1 - deadweightFactor);
}

/**
 * Calculate drop-off rate from follow-up data
 * Drop-off = Rate at which outcomes decay over time
 *
 * @param outcomes - Historical outcomes with follow-up scores
 * @returns Drop-off rate (0-1, where 0 = no drop-off, 1 = complete drop-off)
 */
function calculateDropOffRate(outcomes: HistoricalOutcome[]): number {
  const outcomesWithFollowUp = outcomes.filter(o => o.followUpScore !== undefined);

  if (outcomesWithFollowUp.length === 0) {
    // No follow-up data, use conservative default
    return 0.25;
  }

  let totalDropOff = 0;

  for (const outcome of outcomesWithFollowUp) {
    const initialImprovement = outcome.endlineScore - outcome.baselineScore;
    const sustainedImprovement = outcome.followUpScore! - outcome.baselineScore;

    if (initialImprovement > 0) {
      // Drop-off is the proportion of improvement that was lost
      const dropOff = Math.max(0, Math.min(1, 1 - (sustainedImprovement / initialImprovement)));
      totalDropOff += dropOff;
    }
  }

  return totalDropOff / outcomesWithFollowUp.length;
}

/**
 * Calibrate discount rate based on tenant risk profile
 * For most CSR programs, use standard social discount rate
 *
 * @param vertical - Tenant vertical
 * @returns Discount rate (typically 0.03-0.05 for social programs)
 */
function calibrateDiscountRate(vertical: TenantVertical): number {
  // Standard social discount rates by sector
  const discountRates: Record<TenantVertical, number> = {
    technology: 0.04,      // Tech: Slightly higher due to rapid change
    finance: 0.035,
    healthcare: 0.03,      // Healthcare: Lower, more stable outcomes
    manufacturing: 0.035,
    retail: 0.04,
    education: 0.03,
    nonprofit: 0.03,
    government: 0.03,
    other: 0.035,
  };

  return discountRates[vertical];
}

/**
 * Calibrate financial proxies based on tenant vertical and local data
 *
 * @param vertical - Tenant vertical
 * @param outcomes - Historical outcomes for dimension-specific calibration
 * @returns Financial proxies per dimension
 */
function calibrateFinancialProxies(
  vertical: TenantVertical,
  outcomes: HistoricalOutcome[]
): Record<string, number> {
  // Start with vertical defaults
  const proxies = { ...FINANCIAL_PROXIES_BY_VERTICAL[vertical] };

  // If we have enough data per dimension, we could adjust based on actual observed costs
  // For now, return vertical-specific defaults
  // In production, this could use regression on actual cost/outcome data

  return proxies;
}

/**
 * Calculate calibration confidence based on data quality
 *
 * @param outcomes - Historical outcomes
 * @returns Confidence score (0-1)
 */
function calculateConfidence(outcomes: HistoricalOutcome[]): number {
  const sampleSize = outcomes.length;

  // Factors affecting confidence:
  // 1. Sample size (more is better)
  const sizeScore = Math.min(1.0, sampleSize / 100); // Max at 100 samples

  // 2. Control group availability
  const controlGroupRatio = outcomes.filter(o => o.controlGroupScore !== undefined).length / sampleSize;
  const controlScore = controlGroupRatio;

  // 3. Follow-up data availability
  const followUpRatio = outcomes.filter(o => o.followUpScore !== undefined).length / sampleSize;
  const followUpScore = followUpRatio;

  // Weighted average
  const confidence = (sizeScore * 0.5) + (controlScore * 0.3) + (followUpScore * 0.2);

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calibrate SROI parameters for a specific tenant
 *
 * @param tenantId - Tenant identifier
 * @param vertical - Tenant's industry vertical
 * @param historicalOutcomes - Historical outcome data for calibration
 * @returns Calibrated SROI configuration
 *
 * @example
 * ```typescript
 * const calibration = calibrateSROIParameters(
 *   'acme-corp',
 *   'technology',
 *   historicalOutcomes
 * );
 *
 * // Save to model registry
 * registry.save({
 *   tenantId: 'acme-corp',
 *   version: '1.0.0',
 *   sroi: calibration.calibratedConfig,
 * });
 * ```
 */
export function calibrateSROIParameters(
  tenantId: string,
  vertical: TenantVertical,
  historicalOutcomes: HistoricalOutcome[]
): SROICalibrationResult {
  if (historicalOutcomes.length === 0) {
    throw new Error('Cannot calibrate SROI parameters with empty dataset');
  }

  // Calculate calibrated parameters
  const deadweightFactor = calculateDeadweightFactor(historicalOutcomes);
  const attributionFactor = calculateAttributionFactor(deadweightFactor);
  const dropOffRate = calculateDropOffRate(historicalOutcomes);
  const discountRate = calibrateDiscountRate(vertical);
  const financialProxies = calibrateFinancialProxies(vertical, historicalOutcomes);

  // Calculate metrics
  const improvements = historicalOutcomes.map(
    o => o.endlineScore - o.baselineScore
  );
  const averageImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;

  const attributionAccuracy = historicalOutcomes.some(o => o.controlGroupScore !== undefined)
    ? 1 - deadweightFactor
    : undefined;

  const sustainabilityRate = historicalOutcomes.some(o => o.followUpScore !== undefined)
    ? 1 - dropOffRate
    : undefined;

  const confidence = calculateConfidence(historicalOutcomes);

  return {
    tenantId,
    vertical,
    calibratedConfig: {
      deadweightFactor,
      attributionFactor,
      dropOffRate,
      discountRate,
      financialProxies,
    },
    confidence,
    metrics: {
      sampleSize: historicalOutcomes.length,
      averageImprovement,
      attributionAccuracy,
      sustainabilityRate,
    },
    financialProxies,
  };
}

/**
 * Validate SROI calibration parameters
 *
 * @param config - SROI configuration to validate
 * @returns Validation result
 */
export function validateSROICalibration(config: SROIConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate deadweight factor
  if (config.deadweightFactor !== undefined) {
    if (config.deadweightFactor < 0 || config.deadweightFactor > 1) {
      errors.push('Deadweight factor must be between 0 and 1');
    }
    if (config.deadweightFactor > 0.5) {
      warnings.push('High deadweight factor (>0.5) suggests limited program impact');
    }
  }

  // Validate attribution factor
  if (config.attributionFactor !== undefined) {
    if (config.attributionFactor < 0 || config.attributionFactor > 1) {
      errors.push('Attribution factor must be between 0 and 1');
    }
    if (config.attributionFactor < 0.5) {
      warnings.push('Low attribution factor (<0.5) suggests limited program attribution');
    }
  }

  // Validate drop-off rate
  if (config.dropOffRate !== undefined) {
    if (config.dropOffRate < 0 || config.dropOffRate > 1) {
      errors.push('Drop-off rate must be between 0 and 1');
    }
    if (config.dropOffRate > 0.5) {
      warnings.push('High drop-off rate (>0.5) suggests poor outcome sustainability');
    }
  }

  // Validate discount rate
  if (config.discountRate !== undefined) {
    if (config.discountRate < 0 || config.discountRate > 0.2) {
      errors.push('Discount rate must be between 0 and 0.2');
    }
  }

  // Validate financial proxies
  if (config.financialProxies) {
    for (const [dimension, value] of Object.entries(config.financialProxies)) {
      if (value < 0) {
        errors.push(`Financial proxy for ${dimension} must be non-negative`);
      }
      if (value > 100000) {
        warnings.push(`Financial proxy for ${dimension} is very high (>${100000})`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get default SROI config for a vertical
 *
 * @param vertical - Tenant vertical
 * @returns Default SROI configuration
 */
export function getDefaultSROIConfig(vertical: TenantVertical): SROIConfig {
  return {
    deadweightFactor: 0.1,
    attributionFactor: 0.85,
    dropOffRate: 0.25,
    discountRate: calibrateDiscountRate(vertical),
    financialProxies: FINANCIAL_PROXIES_BY_VERTICAL[vertical],
  };
}
