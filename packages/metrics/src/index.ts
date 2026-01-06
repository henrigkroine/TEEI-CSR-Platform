/**
 * @teei/metrics
 *
 * Core metrics calculation library for TEEI CSR Platform
 *
 * Provides calculators for:
 * - SROI (Social Return on Investment)
 * - VIS (Volunteer Impact Score)
 * - Integration Score
 */

// Export types
export * from './types.js';

// Export SROI calculators and config
export { calculateSROI, calculateSimpleSROI } from './sroi/calculator.js';
export { DEFAULT_SROI_CONFIG, REGIONAL_SROI_CONFIGS, getSROIConfig } from './sroi/config.js';

// Export VIS calculators
export { calculateVIS, calculateVISTrend } from './vis/calculator.js';

// Export Integration Score calculators
export {
  calculateIntegrationScore,
  cefrToComfortScore,
  calculateSocialBelonging,
  calculateJobAccess,
} from './integration/score.js';
