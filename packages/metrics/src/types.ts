/**
 * Core types for TEEI metrics calculations
 */

/**
 * SROI (Social Return on Investment) input parameters
 */
export interface SROIInputs {
  /** Total program cost in currency units */
  programCost: number;
  /** Number of participants who achieved employment or wage increase */
  participantsWithOutcome: number;
  /** Average annual wage lift per participant (currency units) */
  avgWageLift: number;
  /** Number of years to consider for benefit calculation (default: 3) */
  yearsOfBenefit?: number;
  /** Employment multiplier: indirect economic benefit per employed person (default: 1.5) */
  employmentMultiplier?: number;
  /** Annual discount rate for future benefits (default: 0.03 = 3%) */
  discountRate?: number;
}

/**
 * SROI calculation result
 */
export interface SROIResult {
  /** SROI ratio (e.g., 5.23 means $5.23 return per $1 invested) */
  ratio: number;
  /** Total economic benefit calculated */
  totalBenefit: number;
  /** Total program cost */
  totalCost: number;
  /** Net present value of benefits */
  npvBenefit: number;
  /** Configuration used for calculation */
  config: {
    yearsOfBenefit: number;
    employmentMultiplier: number;
    discountRate: number;
  };
}

/**
 * VIS (Volunteer Impact Score) input parameters
 */
export interface VISInputs {
  /** Total volunteer hours contributed */
  totalHours: number;
  /** Average quality rating (0.0 - 1.0) from participant feedback */
  avgQualityScore: number;
  /** Participant outcome lift: % showing measurable improvement (0.0 - 1.0) */
  outcomeLift: number;
  /** Job placement rate achieved (0.0 - 1.0) */
  placementRate: number;
  /** Weight for hours component (default: 0.3) */
  hoursWeight?: number;
  /** Weight for quality component (default: 0.3) */
  qualityWeight?: number;
  /** Weight for outcome component (default: 0.25) */
  outcomeWeight?: number;
  /** Weight for placement component (default: 0.15) */
  placementWeight?: number;
}

/**
 * VIS calculation result
 */
export interface VISResult {
  /** Overall VIS score (0-100) */
  score: number;
  /** Component scores breakdown */
  components: {
    hours: number;
    quality: number;
    outcome: number;
    placement: number;
  };
  /** Weights used in calculation */
  weights: {
    hours: number;
    quality: number;
    outcome: number;
    placement: number;
  };
}

/**
 * Integration Score input parameters
 */
export interface IntegrationScoreInputs {
  /** Language comfort level (0.0 - 1.0) based on CEFR progression */
  languageComfort: number;
  /** Social belonging score (0.0 - 1.0) from engagement metrics */
  socialBelonging: number;
  /** Job access score (0.0 - 1.0) based on employment/training progress */
  jobAccess: number;
  /** Weight for language component (default: 0.4) */
  languageWeight?: number;
  /** Weight for social component (default: 0.3) */
  socialWeight?: number;
  /** Weight for job access component (default: 0.3) */
  jobWeight?: number;
}

/**
 * Integration Score calculation result
 */
export interface IntegrationScoreResult {
  /** Overall integration score (0-100) */
  score: number;
  /** Component scores (0-100) */
  components: {
    language: number;
    social: number;
    jobAccess: number;
  };
  /** Weights used */
  weights: {
    language: number;
    social: number;
    jobAccess: number;
  };
  /** Assessment level: low, medium, high */
  level: 'low' | 'medium' | 'high';
}

/**
 * Configurable SROI assumptions
 */
export interface SROIConfig {
  /** Default years of benefit to consider */
  defaultYearsOfBenefit: number;
  /** Default employment multiplier */
  defaultEmploymentMultiplier: number;
  /** Default annual discount rate */
  defaultDiscountRate: number;
  /** Average wage lift per participant (can vary by region/program) */
  defaultAvgWageLift: number;
}

/**
 * Period-based metrics aggregation
 */
export interface PeriodMetrics {
  companyId: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  participantsCount: number;
  volunteersCount: number;
  sessionsCount: number;
  avgIntegrationScore: number;
  avgLanguageLevel: number;
  avgJobReadiness: number;
  sroiRatio: number;
  visScore: number;
}
