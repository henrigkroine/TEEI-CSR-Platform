/**
 * Shared TypeScript types for Consolidation Engine
 */

import type { ConsolidationMetric, ConsolFact, FxRate } from './hierarchy';

/**
 * Consolidation engine configuration
 */
export interface ConsolidationConfig {
  orgId: string;
  period: string; // ISO date
  baseCurrency: string; // Org base currency
  scope?: {
    orgUnitIds?: string[];
    includeDescendants?: boolean;
  };
  fxRateDate?: string; // Date for FX rates (defaults to period end)
  runEliminations?: boolean;
  runAdjustments?: boolean;
}

/**
 * Tenant metric data (raw input for consolidation)
 */
export interface TenantMetricData {
  tenantId: string;
  metric: ConsolidationMetric;
  value: number;
  currency: string;
  period: string;
  metadata?: Record<string, any>;
}

/**
 * Elimination match result
 */
export interface EliminationMatch {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  tenantId?: string;
  metric: ConsolidationMetric;
  amount: number;
  currency: string;
  reason: string;
}

/**
 * Adjustment application result
 */
export interface AdjustmentApplication {
  adjustmentId: string;
  orgUnitId?: string;
  metric: ConsolidationMetric;
  amount: number;
  currency: string;
  note: string;
}

/**
 * Consolidation step result
 */
export interface ConsolidationStepResult {
  step: 'collect' | 'convert' | 'eliminate' | 'adjust' | 'rollup';
  status: 'success' | 'error' | 'warning';
  message?: string;
  data?: any;
  duration?: number; // milliseconds
}

/**
 * Consolidation engine output
 */
export interface ConsolidationOutput {
  runId: string;
  orgId: string;
  period: string;
  facts: ConsolFact[];
  eliminations: EliminationMatch[];
  adjustments: AdjustmentApplication[];
  fxRates: FxRate[];
  steps: ConsolidationStepResult[];
  stats: {
    orgUnitsProcessed: number;
    tenantsProcessed: number;
    metricsCalculated: number;
    eliminationsApplied: number;
    adjustmentsApplied: number;
    totalDuration: number; // milliseconds
  };
  errors?: string[];
  warnings?: string[];
}

/**
 * FX conversion result
 */
export interface FxConversion {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  rate: number;
  convertedAmount: number;
  date: string;
}

/**
 * Metric calculator interface
 */
export interface MetricCalculator {
  metric: ConsolidationMetric;
  calculate(tenantId: string, period: string): Promise<number>;
  getCurrency(tenantId: string): Promise<string>;
}

/**
 * Rollup aggregation function type
 */
export type AggregationFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';

/**
 * Metric definition for consolidation
 */
export interface MetricDefinition {
  name: ConsolidationMetric;
  displayName: string;
  unit: string; // 'ratio', 'score', 'hours', 'USD', etc.
  aggregation: AggregationFunction;
  decimals: number;
  description: string;
  category: 'impact' | 'financial' | 'operational' | 'sdg';
}

/**
 * Pre-defined metric definitions
 */
export const METRIC_DEFINITIONS: Record<ConsolidationMetric, MetricDefinition> = {
  sroi: {
    name: 'sroi',
    displayName: 'Social Return on Investment',
    unit: 'ratio',
    aggregation: 'avg',
    decimals: 2,
    description: 'Average SROI ratio across org units',
    category: 'impact',
  },
  vis: {
    name: 'vis',
    displayName: 'Volunteer Impact Score',
    unit: 'score',
    aggregation: 'avg',
    decimals: 2,
    description: 'Average VIS score across org units',
    category: 'impact',
  },
  volunteer_hours: {
    name: 'volunteer_hours',
    displayName: 'Volunteer Hours',
    unit: 'hours',
    aggregation: 'sum',
    decimals: 0,
    description: 'Total volunteer hours',
    category: 'operational',
  },
  donation_amount: {
    name: 'donation_amount',
    displayName: 'Donation Amount',
    unit: 'currency',
    aggregation: 'sum',
    decimals: 2,
    description: 'Total donation amount in base currency',
    category: 'financial',
  },
  compute_cost: {
    name: 'compute_cost',
    displayName: 'Compute Cost',
    unit: 'currency',
    aggregation: 'sum',
    decimals: 2,
    description: 'Total compute infrastructure cost',
    category: 'financial',
  },
  storage_cost: {
    name: 'storage_cost',
    displayName: 'Storage Cost',
    unit: 'currency',
    aggregation: 'sum',
    decimals: 2,
    description: 'Total storage cost',
    category: 'financial',
  },
  ai_cost: {
    name: 'ai_cost',
    displayName: 'AI Cost',
    unit: 'currency',
    aggregation: 'sum',
    decimals: 2,
    description: 'Total AI/ML service cost',
    category: 'financial',
  },
  total_cost: {
    name: 'total_cost',
    displayName: 'Total Cost',
    unit: 'currency',
    aggregation: 'sum',
    decimals: 2,
    description: 'Total operational cost',
    category: 'financial',
  },
  sdg_1: { name: 'sdg_1', displayName: 'No Poverty', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 1 contribution', category: 'sdg' },
  sdg_2: { name: 'sdg_2', displayName: 'Zero Hunger', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 2 contribution', category: 'sdg' },
  sdg_3: { name: 'sdg_3', displayName: 'Good Health', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 3 contribution', category: 'sdg' },
  sdg_4: { name: 'sdg_4', displayName: 'Quality Education', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 4 contribution', category: 'sdg' },
  sdg_5: { name: 'sdg_5', displayName: 'Gender Equality', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 5 contribution', category: 'sdg' },
  sdg_6: { name: 'sdg_6', displayName: 'Clean Water', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 6 contribution', category: 'sdg' },
  sdg_7: { name: 'sdg_7', displayName: 'Clean Energy', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 7 contribution', category: 'sdg' },
  sdg_8: { name: 'sdg_8', displayName: 'Decent Work', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 8 contribution', category: 'sdg' },
  sdg_9: { name: 'sdg_9', displayName: 'Industry & Innovation', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 9 contribution', category: 'sdg' },
  sdg_10: { name: 'sdg_10', displayName: 'Reduced Inequalities', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 10 contribution', category: 'sdg' },
  sdg_11: { name: 'sdg_11', displayName: 'Sustainable Cities', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 11 contribution', category: 'sdg' },
  sdg_12: { name: 'sdg_12', displayName: 'Responsible Consumption', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 12 contribution', category: 'sdg' },
  sdg_13: { name: 'sdg_13', displayName: 'Climate Action', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 13 contribution', category: 'sdg' },
  sdg_14: { name: 'sdg_14', displayName: 'Life Below Water', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 14 contribution', category: 'sdg' },
  sdg_15: { name: 'sdg_15', displayName: 'Life on Land', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 15 contribution', category: 'sdg' },
  sdg_16: { name: 'sdg_16', displayName: 'Peace & Justice', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 16 contribution', category: 'sdg' },
  sdg_17: { name: 'sdg_17', displayName: 'Partnerships', unit: 'score', aggregation: 'sum', decimals: 0, description: 'SDG 17 contribution', category: 'sdg' },
};

/**
 * Consolidation validation error
 */
export interface ConsolidationValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Org unit hierarchy validation result
 */
export interface HierarchyValidationResult {
  valid: boolean;
  errors: ConsolidationValidationError[];
  warnings: string[];
  stats: {
    totalUnits: number;
    activeUnits: number;
    orphanedUnits: number;
    circularReferences: number;
    invalidPercentShares: number;
  };
}
