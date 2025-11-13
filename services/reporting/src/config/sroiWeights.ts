/**
 * SROI Calculator Weights and Constants
 * Version: 1.0.0
 * Last Updated: 2025-11-13
 *
 * All changes to these weights must be documented with rationale and version bumped.
 * See docs/SROI_Calculation.md for methodology.
 */

export const SROI_WEIGHTS = {
  // Volunteer hour monetary value (USD)
  // Source: Independent Sector 2023 estimate
  volunteerHourValue: 29.95,

  // Social value per point improvement in each dimension
  // Conservative estimates based on EU social impact studies
  dimensionValues: {
    // Integration: Social cohesion and community participation
    // 1 point = 0-1 scale improvement
    integration: 150, // USD per point improvement

    // Language: Employment multiplier effect
    // Based on OECD language proficiency economic impact
    language: 500, // USD per CEFR level advancement

    // Job readiness: Direct employability improvement
    // Average wage gain per readiness point
    job_readiness: 300, // USD per point improvement
  },

  // Weights for dimensions (must sum to 1.0)
  dimensionWeights: {
    integration: 0.3,
    language: 0.35,
    job_readiness: 0.35,
  },

  // Discount factor for confidence scores
  // If confidence < threshold, apply discount
  confidenceThreshold: 0.7,
  confidenceDiscount: 0.8, // 20% reduction for low confidence
} as const;

/**
 * Validates that dimension weights sum to 1.0
 */
export function validateWeights(): boolean {
  const sum = Object.values(SROI_WEIGHTS.dimensionWeights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.001; // Allow for floating point precision
}

// Self-check on module load
if (!validateWeights()) {
  throw new Error('SROI dimension weights must sum to 1.0');
}
