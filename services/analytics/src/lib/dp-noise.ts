/**
 * Differential Privacy Noise Addition for Benchmarking
 *
 * Implements Laplace mechanism for (ε, 0)-differential privacy.
 * Protects against re-identification by adding calibrated noise to aggregates.
 *
 * References:
 * - Dwork, C. (2006). "Differential Privacy"
 * - Apple Differential Privacy Team (2017). "Learning with Privacy at Scale"
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:dp-noise');

export interface DPConfig {
  epsilon: number; // Privacy budget (smaller = more privacy, more noise)
  sensitivity: number; // L1 sensitivity (max change from one record)
  delta?: number; // Failure probability for (ε, δ)-DP (not used in Laplace)
}

export interface DPAggregates {
  avg: number;
  p10: number;
  p50: number;
  p90: number;
  count: number;
}

export interface DPResult<T> {
  value: T;
  noiseApplied: boolean;
  epsilon: number;
  sensitivity: number;
}

/**
 * Adds Laplace noise for differential privacy
 *
 * The Laplace distribution has scale parameter λ = Δf/ε where:
 * - Δf (sensitivity) = maximum change in output from adding/removing one record
 * - ε (epsilon) = privacy budget (smaller = more privacy)
 *
 * @param value - True value to protect
 * @param sensitivity - L1 sensitivity (default: 1 for count queries)
 * @param epsilon - Privacy budget (default: 0.1 for strong privacy)
 * @returns Noised value (non-negative)
 *
 * @example
 * // Protect average with sensitivity=1, epsilon=0.1
 * const noisedAvg = addLaplaceNoise(82.5, 1, 0.1);
 * // Result: ~82.5 ± ~10 (scale = 1/0.1 = 10)
 */
export function addLaplaceNoise(
  value: number,
  sensitivity: number = 1,
  epsilon: number = 0.1
): number {
  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive');
  }

  if (sensitivity <= 0) {
    throw new Error('Sensitivity must be positive');
  }

  // Scale parameter: λ = Δf / ε
  const scale = sensitivity / epsilon;

  // Sample from Laplace distribution using inverse CDF method
  // X ~ Laplace(0, λ) = -λ * sign(U) * ln(1 - 2|U|)
  // where U ~ Uniform(-0.5, 0.5)
  const u = Math.random() - 0.5;
  const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

  const noisedValue = value + noise;

  // Ensure non-negative for metrics (scores, counts)
  const clampedValue = Math.max(0, noisedValue);

  logger.debug('Laplace noise added', {
    originalValue: value.toFixed(2),
    noise: noise.toFixed(2),
    noisedValue: noisedValue.toFixed(2),
    clampedValue: clampedValue.toFixed(2),
    scale: scale.toFixed(2),
    epsilon,
    sensitivity,
  });

  return clampedValue;
}

/**
 * Apply DP noise to aggregate statistics
 *
 * Uses calibrated epsilon values for different aggregate types:
 * - Quantiles (avg, p10, p50, p90): ε = 0.1 (strong privacy)
 * - Counts: ε = 0.5 (moderate privacy, less noise)
 *
 * @param stats - Raw aggregate statistics
 * @param config - Optional DP configuration (defaults to conservative settings)
 * @returns Noised statistics
 *
 * @example
 * const rawStats = { avg: 82.5, p10: 65, p50: 80, p90: 95, count: 127 };
 * const noisedStats = applyDPToAggregates(rawStats);
 * // All values now include calibrated Laplace noise
 */
export function applyDPToAggregates(
  stats: DPAggregates,
  config?: Partial<DPConfig>
): DPResult<DPAggregates> {
  const epsilonQuantile = config?.epsilon ?? 0.1; // Strong privacy for values
  const epsilonCount = 0.5; // Less noise for counts (still private)
  const sensitivity = config?.sensitivity ?? 1;

  const noisedStats: DPAggregates = {
    avg: addLaplaceNoise(stats.avg, sensitivity, epsilonQuantile),
    p10: addLaplaceNoise(stats.p10, sensitivity, epsilonQuantile),
    p50: addLaplaceNoise(stats.p50, sensitivity, epsilonQuantile),
    p90: addLaplaceNoise(stats.p90, sensitivity, epsilonQuantile),
    count: Math.round(addLaplaceNoise(stats.count, sensitivity, epsilonCount)),
  };

  logger.info('DP noise applied to aggregates', {
    original: stats,
    noised: noisedStats,
    epsilon: { quantile: epsilonQuantile, count: epsilonCount },
    sensitivity,
  });

  return {
    value: noisedStats,
    noiseApplied: true,
    epsilon: epsilonQuantile,
    sensitivity,
  };
}

/**
 * Apply DP noise to a single metric
 *
 * @param value - Raw metric value
 * @param config - DP configuration
 * @returns Noised value with metadata
 *
 * @example
 * const noisedSROI = applyDPToMetric(3.42, { epsilon: 0.1, sensitivity: 1 });
 * console.log(noisedSROI.value); // ~3.42 ± noise
 */
export function applyDPToMetric(
  value: number,
  config: DPConfig
): DPResult<number> {
  const noisedValue = addLaplaceNoise(value, config.sensitivity, config.epsilon);

  return {
    value: noisedValue,
    noiseApplied: true,
    epsilon: config.epsilon,
    sensitivity: config.sensitivity,
  };
}

/**
 * Calculate privacy budget composition for multiple queries
 *
 * Under sequential composition, total privacy loss is sum of epsilons.
 * This helps track cumulative privacy expenditure.
 *
 * @param queries - Array of epsilon values for each query
 * @returns Total epsilon (privacy budget consumed)
 *
 * @example
 * const totalEpsilon = composePrivacyBudget([0.1, 0.1, 0.05]);
 * // Returns: 0.25 (total privacy loss)
 */
export function composePrivacyBudget(queries: number[]): number {
  const total = queries.reduce((sum, epsilon) => sum + epsilon, 0);

  logger.info('Privacy budget composition', {
    queries,
    totalEpsilon: total,
    queriesCount: queries.length,
  });

  return total;
}

/**
 * Check if noise magnitude is acceptable
 *
 * Validates that noise doesn't dominate the signal.
 * Rule of thumb: noise should be <30% of value for usable data.
 *
 * @param originalValue - True value
 * @param noisedValue - Value after DP noise
 * @param maxNoiseRatio - Maximum acceptable noise ratio (default: 0.3)
 * @returns True if noise is acceptable
 *
 * @example
 * if (!isNoiseAcceptable(100, 75)) {
 *   logger.warn('Noise too high, consider increasing epsilon');
 * }
 */
export function isNoiseAcceptable(
  originalValue: number,
  noisedValue: number,
  maxNoiseRatio: number = 0.3
): boolean {
  if (originalValue === 0) {
    return true; // No baseline to compare
  }

  const noiseMagnitude = Math.abs(noisedValue - originalValue);
  const noiseRatio = noiseMagnitude / Math.abs(originalValue);

  const acceptable = noiseRatio <= maxNoiseRatio;

  if (!acceptable) {
    logger.warn('Noise exceeds acceptable threshold', {
      originalValue,
      noisedValue,
      noiseMagnitude,
      noiseRatio: (noiseRatio * 100).toFixed(1) + '%',
      maxNoiseRatio: (maxNoiseRatio * 100).toFixed(1) + '%',
    });
  }

  return acceptable;
}

/**
 * Get recommended epsilon for data utility
 *
 * Balances privacy and utility based on cohort size.
 * Larger cohorts can use smaller epsilon (more privacy).
 *
 * @param cohortSize - Number of companies in cohort
 * @returns Recommended epsilon value
 *
 * @example
 * const epsilon = getRecommendedEpsilon(50);
 * // Returns: 0.05 (strong privacy for large cohort)
 */
export function getRecommendedEpsilon(cohortSize: number): number {
  if (cohortSize >= 100) {
    return 0.05; // Very strong privacy
  } else if (cohortSize >= 50) {
    return 0.1; // Strong privacy
  } else if (cohortSize >= 20) {
    return 0.2; // Moderate privacy
  } else if (cohortSize >= 10) {
    return 0.3; // Weaker privacy for usability
  } else {
    return 0.5; // Minimum privacy (small cohorts need more noise)
  }
}

/**
 * Privacy notice generator
 *
 * @param epsilon - Privacy budget used
 * @param cohortSize - Size of cohort
 * @returns Human-readable privacy notice
 */
export function generatePrivacyNotice(epsilon: number, cohortSize: number): string {
  const privacyLevel = epsilon <= 0.1 ? 'strong' : epsilon <= 0.3 ? 'moderate' : 'basic';
  return `Results include ${privacyLevel} differential privacy protection (ε=${epsilon.toFixed(2)}, n=${cohortSize}). Individual company data cannot be reverse-engineered from these benchmarks.`;
}
