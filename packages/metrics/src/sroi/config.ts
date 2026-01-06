import { SROIConfig } from '../types.js';

/**
 * Default SROI calculation assumptions
 * These can be overridden per calculation or configured globally
 */
export const DEFAULT_SROI_CONFIG: SROIConfig = {
  /** Consider benefits over 3 years by default */
  defaultYearsOfBenefit: 3,

  /** Employment multiplier: 1.5x accounts for indirect economic benefits
   * (e.g., tax revenue, reduced social services, family income effects)
   */
  defaultEmploymentMultiplier: 1.5,

  /** 3% annual discount rate for NPV calculations */
  defaultDiscountRate: 0.03,

  /** Average annual wage lift: $15,000
   * This represents the typical income improvement for participants
   * achieving employment or career advancement
   */
  defaultAvgWageLift: 15000,
};

/**
 * Regional SROI configurations
 * Different regions may have different economic contexts
 */
export const REGIONAL_SROI_CONFIGS: Record<string, Partial<SROIConfig>> = {
  'us-east': {
    defaultAvgWageLift: 18000,
  },
  'us-west': {
    defaultAvgWageLift: 22000,
  },
  'us-midwest': {
    defaultAvgWageLift: 15000,
  },
  'us-south': {
    defaultAvgWageLift: 14000,
  },
  'canada': {
    defaultAvgWageLift: 20000,
  },
};

/**
 * Get SROI configuration for a specific region
 */
export function getSROIConfig(region?: string): SROIConfig {
  if (!region || !REGIONAL_SROI_CONFIGS[region]) {
    return DEFAULT_SROI_CONFIG;
  }

  return {
    ...DEFAULT_SROI_CONFIG,
    ...REGIONAL_SROI_CONFIGS[region],
  };
}
