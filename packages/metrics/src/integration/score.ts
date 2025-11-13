import { IntegrationScoreInputs, IntegrationScoreResult } from '../types.js';

/**
 * Default weights for Integration Score components
 */
const DEFAULT_WEIGHTS = {
  language: 0.4, // Language is typically most critical for integration
  social: 0.3, // Social connections are key to belonging
  jobAccess: 0.3, // Economic integration through employment
};

/**
 * Calculate Integration Score
 *
 * The Integration Score measures a participant's overall integration progress
 * across three key dimensions:
 * 1. Language Comfort: Ability to communicate in the host country language
 * 2. Social Belonging: Level of social connection and community engagement
 * 3. Job Access: Progress toward employment or skills advancement
 *
 * Score ranges:
 * - 0-33: Low integration (early stage, needs significant support)
 * - 34-66: Medium integration (progressing, ongoing support beneficial)
 * - 67-100: High integration (well-integrated, minimal support needed)
 *
 * @param inputs - Integration score inputs
 * @returns Integration score result with overall score and breakdown
 */
export function calculateIntegrationScore(inputs: IntegrationScoreInputs): IntegrationScoreResult {
  // Apply default weights if not provided
  const weights = {
    language: inputs.languageWeight ?? DEFAULT_WEIGHTS.language,
    social: inputs.socialWeight ?? DEFAULT_WEIGHTS.social,
    jobAccess: inputs.jobWeight ?? DEFAULT_WEIGHTS.jobAccess,
  };

  // Validate inputs
  if (inputs.languageComfort < 0 || inputs.languageComfort > 1) {
    throw new Error('Language comfort must be between 0 and 1');
  }
  if (inputs.socialBelonging < 0 || inputs.socialBelonging > 1) {
    throw new Error('Social belonging must be between 0 and 1');
  }
  if (inputs.jobAccess < 0 || inputs.jobAccess > 1) {
    throw new Error('Job access must be between 0 and 1');
  }

  // Validate weights sum to 1.0 (allow small floating point tolerance)
  const weightSum = weights.language + weights.social + weights.jobAccess;
  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(`Weights must sum to 1.0, got ${weightSum}`);
  }

  // Convert components to 0-100 scale
  const languageScore = inputs.languageComfort * 100;
  const socialScore = inputs.socialBelonging * 100;
  const jobAccessScore = inputs.jobAccess * 100;

  // Calculate weighted integration score
  const overallScore =
    languageScore * weights.language +
    socialScore * weights.social +
    jobAccessScore * weights.jobAccess;

  // Determine integration level
  let level: 'low' | 'medium' | 'high';
  if (overallScore < 34) {
    level = 'low';
  } else if (overallScore < 67) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return {
    score: parseFloat(overallScore.toFixed(2)),
    components: {
      language: parseFloat(languageScore.toFixed(2)),
      social: parseFloat(socialScore.toFixed(2)),
      jobAccess: parseFloat(jobAccessScore.toFixed(2)),
    },
    weights,
    level,
  };
}

/**
 * Map CEFR language level to a 0-1 comfort score
 *
 * CEFR levels: A1, A2, B1, B2, C1, C2
 * - A1: Beginner (0.17)
 * - A2: Elementary (0.33)
 * - B1: Intermediate (0.50)
 * - B2: Upper Intermediate (0.67)
 * - C1: Advanced (0.83)
 * - C2: Proficiency (1.00)
 *
 * @param cefrLevel - CEFR language level
 * @returns Normalized comfort score (0-1)
 */
export function cefrToComfortScore(cefrLevel: string | null | undefined): number {
  if (!cefrLevel) return 0;

  const level = cefrLevel.toUpperCase();
  const mapping: Record<string, number> = {
    A1: 0.17,
    A2: 0.33,
    B1: 0.50,
    B2: 0.67,
    C1: 0.83,
    C2: 1.0,
  };

  return mapping[level] ?? 0;
}

/**
 * Calculate social belonging score from engagement metrics
 *
 * @param matchCount - Number of active buddy matches
 * @param eventCount - Number of social events attended
 * @param checkinCount - Number of check-ins completed
 * @returns Normalized social belonging score (0-1)
 */
export function calculateSocialBelonging(
  matchCount: number,
  eventCount: number,
  checkinCount: number
): number {
  // Simple weighted formula - can be refined based on research
  // Assumptions:
  // - At least 1 active match = 0.4 score
  // - 5+ events = 0.3 score
  // - 10+ check-ins = 0.3 score

  const matchScore = matchCount > 0 ? 0.4 : 0;
  const eventScore = Math.min(eventCount / 5, 1) * 0.3;
  const checkinScore = Math.min(checkinCount / 10, 1) * 0.3;

  return parseFloat((matchScore + eventScore + checkinScore).toFixed(3));
}

/**
 * Calculate job access score from employment and training data
 *
 * @param hasJob - Whether participant has employment
 * @param coursesCompleted - Number of training courses completed
 * @param coursesInProgress - Number of courses currently in progress
 * @returns Normalized job access score (0-1)
 */
export function calculateJobAccess(
  hasJob: boolean,
  coursesCompleted: number,
  coursesInProgress: number
): number {
  // Scoring:
  // - Has job = 1.0
  // - No job but training: courses provide incremental score
  //   - Each completed course = 0.15 (max 0.6 for 4 courses)
  //   - Each in-progress course = 0.1 (max 0.4 for 4 courses)

  if (hasJob) {
    return 1.0;
  }

  const completedScore = Math.min(coursesCompleted * 0.15, 0.6);
  const inProgressScore = Math.min(coursesInProgress * 0.1, 0.4);

  return parseFloat((completedScore + inProgressScore).toFixed(3));
}
