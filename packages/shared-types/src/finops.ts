/**
 * FinOps Types for TEEI CSR Platform
 * Cost tracking, budgets, and forecasting
 */

/**
 * Cost categories for spend tracking
 */
export enum CostCategory {
  AI = 'AI',
  COMPUTE = 'COMPUTE',
  STORAGE = 'STORAGE',
  EXPORT = 'EXPORT',
  EGRESS = 'EGRESS',
}

/**
 * Currency codes
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

/**
 * AI models for cost tracking
 */
export enum AIModel {
  CLAUDE_SONNET_4 = 'claude-3-5-sonnet-20241022',
  CLAUDE_OPUS_3 = 'claude-3-opus-20240229',
  CLAUDE_HAIKU_3 = 'claude-3-haiku-20240307',
}

/**
 * Cloud regions
 */
export enum CloudRegion {
  US_EAST_1 = 'us-east-1',
  US_WEST_2 = 'us-west-2',
  EU_WEST_1 = 'eu-west-1',
  EU_CENTRAL_1 = 'eu-central-1',
  AP_SOUTHEAST_1 = 'ap-southeast-1',
}

/**
 * Daily cost fact record
 */
export interface CostFact {
  id?: string;
  tenantId: string;
  day: string; // YYYY-MM-DD format
  category: CostCategory;
  subcategory?: string; // e.g., model name, service type
  region?: CloudRegion;
  service?: string; // e.g., 'reporting', 'analytics', 'q2q-ai'
  amount: number;
  currency: Currency;
  metadata?: Record<string, any>; // Additional context (tokens, bytes, etc.)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Cost aggregation grouping options
 */
export type CostGroupBy = 'category' | 'subcategory' | 'model' | 'region' | 'service' | 'day' | 'week' | 'month';

/**
 * Cost breakdown item
 */
export interface CostBreakdown {
  label: string; // Category, model, region, or service name
  amount: number;
  percentage: number; // Percentage of total
  currency: Currency;
}

/**
 * Time-series cost data point
 */
export interface CostTimeSeriesPoint {
  date: string; // ISO date
  amount: number;
  currency: Currency;
  breakdown?: CostBreakdown[];
}

/**
 * Cost query parameters
 */
export interface CostQueryParams {
  tenantId?: string;
  from: string; // ISO date
  to: string; // ISO date
  groupBy?: CostGroupBy[];
  category?: CostCategory;
  region?: CloudRegion;
  service?: string;
}

/**
 * Cost response
 */
export interface CostResponse {
  tenantId?: string;
  dateRange: {
    from: string;
    to: string;
  };
  totalAmount: number;
  currency: Currency;
  timeSeries: CostTimeSeriesPoint[];
  breakdown: CostBreakdown[];
  metadata?: {
    queryDurationMs: number;
    dataPoints: number;
  };
}

/**
 * Forecast methods
 */
export enum ForecastMethod {
  SIMPLE_LINEAR = 'simple',
  MOVING_AVERAGE = 'holtwinters', // Using 'holtwinters' as alias for moving average
}

/**
 * Forecast data point
 */
export interface ForecastPoint {
  date: string; // ISO date
  predictedAmount: number;
  lowerBound?: number; // 95% confidence interval lower
  upperBound?: number; // 95% confidence interval upper
  currency: Currency;
}

/**
 * Forecast query parameters
 */
export interface ForecastQueryParams {
  tenantId: string;
  from: string; // Historical start date
  to: string; // Historical end date
  forecastDays?: number; // Number of days to forecast (default: 30)
  method?: ForecastMethod;
}

/**
 * Forecast response
 */
export interface ForecastResponse {
  tenantId: string;
  historicalRange: {
    from: string;
    to: string;
  };
  forecastRange: {
    from: string;
    to: string;
  };
  method: ForecastMethod;
  forecast: ForecastPoint[];
  metadata?: {
    accuracy?: number; // Historical accuracy if available
    confidence?: number;
  };
}

/**
 * Anomaly detection result
 */
export interface CostAnomaly {
  id: string;
  tenantId: string;
  date: string;
  category: CostCategory;
  subcategory?: string;
  expectedAmount: number;
  actualAmount: number;
  deviation: number; // Percentage deviation
  severity: 'low' | 'medium' | 'high';
  currency: Currency;
  detectedAt: Date;
}

/**
 * Anomaly query parameters
 */
export interface AnomalyQueryParams {
  tenantId: string;
  from: string;
  to: string;
  minSeverity?: 'low' | 'medium' | 'high';
  category?: CostCategory;
}

/**
 * Anomaly response
 */
export interface AnomalyResponse {
  tenantId: string;
  dateRange: {
    from: string;
    to: string;
  };
  anomalies: CostAnomaly[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Budget period
 */
export enum BudgetPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

/**
 * Policy action types
 */
export enum PolicyAction {
  NOTIFY = 'notify',
  RATE_LIMIT = 'rate_limit',
  BLOCK_AI = 'block_ai',
  BLOCK_EXPORT = 'block_export',
  ALERT_ADMINS = 'alert_admins',
}

/**
 * Budget policy configuration
 */
export interface BudgetPolicy {
  notifyThreshold: number; // Percentage (e.g., 80)
  enforceThreshold: number; // Percentage (e.g., 100)
  actions: PolicyAction[];
  notifyEmails?: string[];
  rateLimitFactor?: number; // Rate limit multiplier (e.g., 0.5 for 50% reduction)
}

/**
 * Budget configuration
 */
export interface Budget {
  id?: string;
  tenantId: string;
  name: string;
  description?: string;
  amount: number;
  currency: Currency;
  period: BudgetPeriod;
  categories?: CostCategory[]; // Empty = all categories
  policy: BudgetPolicy;
  startDate: string; // ISO date
  endDate?: string; // Optional end date
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Budget status
 */
export interface BudgetStatus {
  budget: Budget;
  currentSpend: number;
  percentageUsed: number;
  remainingAmount: number;
  projectedEndOfPeriodSpend?: number; // Based on current trend
  status: 'ok' | 'warning' | 'exceeded';
  triggeredActions: PolicyAction[];
  lastCheckedAt: Date;
}

/**
 * Budget event (for notifications and auditing)
 */
export interface BudgetEvent {
  id: string;
  budgetId: string;
  tenantId: string;
  eventType: 'threshold_reached' | 'limit_exceeded' | 'policy_enforced';
  threshold: number; // Percentage
  currentSpend: number;
  budgetAmount: number;
  actions: PolicyAction[];
  triggeredAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Budget creation request
 */
export interface CreateBudgetRequest {
  tenantId: string;
  name: string;
  description?: string;
  amount: number;
  currency?: Currency;
  period: BudgetPeriod;
  categories?: CostCategory[];
  policy: BudgetPolicy;
  startDate: string;
  endDate?: string;
}

/**
 * Budget update request
 */
export interface UpdateBudgetRequest {
  name?: string;
  description?: string;
  amount?: number;
  policy?: Partial<BudgetPolicy>;
  enabled?: boolean;
}

/**
 * Budget list response
 */
export interface BudgetListResponse {
  tenantId: string;
  budgets: BudgetStatus[];
  totalBudget: number;
  totalSpend: number;
  currency: Currency;
}
