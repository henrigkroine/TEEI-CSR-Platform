/**
 * Benchmarks & Cohorts Types
 *
 * Types for peer comparison and cohort analysis
 *
 * @module types/benchmarks
 */

/**
 * Industry categories for cohort selection
 */
export type Industry =
  | 'technology'
  | 'finance'
  | 'healthcare'
  | 'manufacturing'
  | 'retail'
  | 'energy'
  | 'education'
  | 'nonprofit'
  | 'consulting'
  | 'other';

/**
 * Company size categories
 */
export type CompanySize =
  | 'small' // 1-50 employees
  | 'medium' // 51-500 employees
  | 'large' // 501-5000 employees
  | 'enterprise'; // 5000+ employees

/**
 * Geographic regions
 */
export type Geography =
  | 'north_america'
  | 'south_america'
  | 'europe'
  | 'asia_pacific'
  | 'middle_east'
  | 'africa'
  | 'global';

/**
 * Cohort selection criteria
 */
export interface CohortCriteria {
  industry?: Industry;
  size?: CompanySize;
  geography?: Geography;
}

/**
 * Cohort metadata
 */
export interface Cohort {
  id: string;
  name: string;
  description: string;
  criteria: CohortCriteria;
  company_count: number;
  last_updated: Date;
}

/**
 * Metric names for benchmarking
 */
export type MetricName =
  | 'sroi'
  | 'beneficiaries'
  | 'volunteer_hours'
  | 'programs'
  | 'engagement_rate'
  | 'impact_score';

/**
 * Single benchmark data point
 */
export interface BenchmarkData {
  metric: MetricName;
  metric_label: string;
  company_value: number;
  cohort_average: number;
  cohort_median: number;
  cohort_min: number;
  cohort_max: number;
  percentile: number; // 0-100, where 100 is top performer
  unit: string; // e.g., 'ratio', 'count', 'hours', '%'
  trend?: 'up' | 'down' | 'stable'; // Company trend vs. previous period
}

/**
 * Complete benchmarks response
 */
export interface BenchmarksResponse {
  company_id: string;
  company_name: string;
  cohort: Cohort;
  period: string;
  benchmarks: BenchmarkData[];
  last_refreshed: Date;
  next_refresh: Date;
}

/**
 * Cohorts list response
 */
export interface CohortsListResponse {
  available_cohorts: Cohort[];
  suggested_cohort?: Cohort; // Auto-suggested based on company profile
}

/**
 * Percentile ranking tier
 */
export type PercentileTier =
  | 'top_10' // 90-100
  | 'top_25' // 75-89
  | 'top_50' // 50-74
  | 'bottom_50' // 0-49
  ;

/**
 * Helper: Get percentile tier from score
 */
export function getPercentileTier(percentile: number): PercentileTier {
  if (percentile >= 90) return 'top_10';
  if (percentile >= 75) return 'top_25';
  if (percentile >= 50) return 'top_50';
  return 'bottom_50';
}

/**
 * Helper: Get percentile label
 */
export function getPercentileLabel(percentile: number): string {
  const tier = getPercentileTier(percentile);
  const labels: Record<PercentileTier, string> = {
    top_10: 'Top 10%',
    top_25: 'Top 25%',
    top_50: 'Top 50%',
    bottom_50: 'Bottom 50%',
  };
  return labels[tier];
}

/**
 * Helper: Get percentile color
 */
export function getPercentileColor(percentile: number): string {
  const tier = getPercentileTier(percentile);
  const colors: Record<PercentileTier, string> = {
    top_10: '#10b981', // green
    top_25: '#3b82f6', // blue
    top_50: '#f59e0b', // amber
    bottom_50: '#ef4444', // red
  };
  return colors[tier];
}

/**
 * Helper: Get industry label
 */
export function getIndustryLabel(industry: Industry): string {
  const labels: Record<Industry, string> = {
    technology: 'Technology',
    finance: 'Financial Services',
    healthcare: 'Healthcare',
    manufacturing: 'Manufacturing',
    retail: 'Retail & Consumer Goods',
    energy: 'Energy & Utilities',
    education: 'Education',
    nonprofit: 'Nonprofit & NGO',
    consulting: 'Consulting & Professional Services',
    other: 'Other',
  };
  return labels[industry];
}

/**
 * Helper: Get company size label
 */
export function getCompanySizeLabel(size: CompanySize): string {
  const labels: Record<CompanySize, string> = {
    small: 'Small (1-50 employees)',
    medium: 'Medium (51-500 employees)',
    large: 'Large (501-5000 employees)',
    enterprise: 'Enterprise (5000+ employees)',
  };
  return labels[size];
}

/**
 * Helper: Get geography label
 */
export function getGeographyLabel(geography: Geography): string {
  const labels: Record<Geography, string> = {
    north_america: 'North America',
    south_america: 'South America',
    europe: 'Europe',
    asia_pacific: 'Asia-Pacific',
    middle_east: 'Middle East',
    africa: 'Africa',
    global: 'Global',
  };
  return labels[geography];
}
