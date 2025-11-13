/**
 * VIS (Volunteer Impact Score) Weights and Constants
 * Version: 1.0.0
 * Last Updated: 2025-11-13
 *
 * All changes to these weights must be documented with rationale and version bumped.
 * See docs/VIS_Model.md for methodology.
 */

export const VIS_WEIGHTS = {
  // Component weights (must sum to 1.0)
  hours: 0.3, // Time commitment
  consistency: 0.3, // Regular engagement
  outcomeImpact: 0.4, // Participant improvement

  // Scoring thresholds
  hours: {
    max: 100, // Hours cap for normalization (100+ hours = 100 score)
    excellent: 50, // 50+ hours = excellent
    good: 20, // 20+ hours = good
    fair: 5, // 5+ hours = fair
  },

  consistency: {
    // Sessions per month for scoring
    excellent: 8, // 2+ per week
    good: 4, // 1 per week
    fair: 2, // 2 per month
  },

  outcomeImpact: {
    // Minimum improvement threshold
    minImprovement: 0.1, // 10% minimum improvement to count
  },

  // Score bands (0-100 scale)
  bands: {
    exceptional: 76, // 76-100: Exceptional
    highImpact: 51, // 51-75: High Impact
    contributing: 26, // 26-50: Contributing
    emerging: 0, // 0-25: Emerging
  },
} as const;

/**
 * Validates that component weights sum to 1.0
 */
export function validateVISWeights(): boolean {
  const sum = VIS_WEIGHTS.hours + VIS_WEIGHTS.consistency + VIS_WEIGHTS.outcomeImpact;
  return Math.abs(sum - 1.0) < 0.001; // Allow for floating point precision
}

// Self-check on module load
if (!validateVISWeights()) {
  throw new Error('VIS component weights must sum to 1.0');
}
