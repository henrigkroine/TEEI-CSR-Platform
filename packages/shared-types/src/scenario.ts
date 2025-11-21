/**
 * Scenario Planner Types
 *
 * Defines types for "what-if" scenario planning with VIS/SROI/SDG impact projections
 */

/**
 * Scenario parameter adjustments
 * All values are deltas or multipliers from baseline
 */
export interface ScenarioParameters {
  /** Volunteer hours adjustment (absolute change, e.g., +100, -50) */
  volunteerHoursDelta?: number;

  /** Grant amount adjustment in USD (absolute change) */
  grantAmountDelta?: number;

  /** Cohort size multiplier (e.g., 1.5 = 50% increase, 0.8 = 20% decrease) */
  cohortSizeMultiplier?: number;

  /** Cohort duration in months (replaces baseline) */
  cohortDurationMonths?: number;

  /** Program mix adjustments (percentage allocation, must sum to 100) */
  programMix?: {
    buddySystem?: number;      // % allocation
    skillShare?: number;        // % allocation
    mentorship?: number;        // % allocation
    communityEvents?: number;   // % allocation
  };

  /** Activity rate multipliers (how often activities occur) */
  activityRates?: {
    matchesPerMonth?: number;
    eventsPerMonth?: number;
    skillSharesPerMonth?: number;
    feedbackPerMonth?: number;
    milestonesPerMonth?: number;
    checkinsPerMonth?: number;
  };

  /** Investment multiplier (e.g., 1.2 = 20% increase in costs) */
  investmentMultiplier?: number;
}

/**
 * Baseline metrics (current state)
 */
export interface BaselineMetrics {
  sroi: number;
  vis: number;
  socialValue: number;
  investment: number;

  /** SDG coverage (goals 1-17) */
  sdgCoverage: {
    goalId: number;
    coverage: number;  // 0-100%
  }[];

  /** Current activity counts */
  activityCounts: {
    matches: number;
    events: number;
    skillShares: number;
    feedback: number;
    milestones: number;
    checkins: number;
  };

  /** Current program allocations */
  programAllocations: {
    buddySystem: number;
    skillShare: number;
    mentorship: number;
    communityEvents: number;
  };

  /** Time period for baseline */
  period: {
    start: string;  // ISO date
    end: string;    // ISO date
  };
}

/**
 * Projected metrics after scenario adjustments
 */
export interface ProjectedMetrics {
  sroi: number;
  sroiDelta: number;          // Change from baseline
  sroiPercentChange: number;  // % change

  vis: number;
  visDelta: number;
  visPercentChange: number;

  socialValue: number;
  socialValueDelta: number;
  socialValuePercentChange: number;

  investment: number;
  investmentDelta: number;
  investmentPercentChange: number;

  /** Projected SDG coverage */
  sdgCoverage: {
    goalId: number;
    coverage: number;
    delta: number;
  }[];

  /** Projected activity counts */
  activityCounts: {
    matches: number;
    events: number;
    skillShares: number;
    feedback: number;
    milestones: number;
    checkins: number;
  };
}

/**
 * Scenario execution result
 */
export interface ScenarioResult {
  scenarioId: string;
  baseline: BaselineMetrics;
  projected: ProjectedMetrics;
  parameters: ScenarioParameters;

  /** Calculation metadata */
  calculatedAt: string;  // ISO timestamp
  calculationDurationMs: number;

  /** Confidence score (0-1) based on data quality */
  confidence: number;

  /** Warnings about scenario validity */
  warnings?: string[];
}

/**
 * Persisted scenario
 */
export interface Scenario {
  id: string;
  tenantId: string;
  companyId: string;

  /** User-friendly name */
  name: string;

  /** Optional description */
  description?: string;

  /** Scenario parameters */
  parameters: ScenarioParameters;

  /** Latest execution result (null if never run) */
  latestResult: ScenarioResult | null;

  /** Created/updated metadata */
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;

  /** Tags for organization */
  tags?: string[];

  /** Is this scenario favorited? */
  isFavorite: boolean;
}

/**
 * Request to create a scenario
 */
export interface CreateScenarioRequest {
  tenantId: string;
  companyId: string;
  name: string;
  description?: string;
  parameters: ScenarioParameters;
  tags?: string[];
}

/**
 * Request to run a scenario
 */
export interface RunScenarioRequest {
  scenarioId: string;
  /** Optional: override baseline period */
  baselinePeriod?: {
    start: string;
    end: string;
  };
}

/**
 * Scenario comparison (up to 3 scenarios side-by-side)
 */
export interface ScenarioComparison {
  scenarios: {
    id: string;
    name: string;
    result: ScenarioResult;
  }[];

  /** Comparative analysis */
  analysis: {
    bestSROI: string;       // scenario ID
    bestVIS: string;        // scenario ID
    bestSDGCoverage: string; // scenario ID
    lowestInvestment: string; // scenario ID
  };
}

/**
 * Export scenario to deck payload
 */
export interface ScenarioExportPayload {
  scenarioId: string;
  format: 'pptx' | 'pdf' | 'json';

  /** Include comparison with other scenarios */
  compareWith?: string[];  // scenario IDs

  /** Include specific slides */
  includeSlides?: {
    summary?: boolean;
    sroiChart?: boolean;
    visChart?: boolean;
    sdgCoverage?: boolean;
    activityBreakdown?: boolean;
    assumptions?: boolean;
  };
}
