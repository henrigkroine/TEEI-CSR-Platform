/**
 * Query Preview Generator - Human-readable query explanations
 *
 * Generates user-friendly descriptions of what a query will do,
 * including data sources, filters, time ranges, and result limits.
 */

import { MetricTemplate } from '../templates/metric-catalog.js';
import { QueryParameters } from '../types/intent.js';

export interface QueryPreview {
  description: string;
  dataSource: string;
  timeRange: string;
  filters: string[];
  resultLimit: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
  cacheTtl: number;
  explanation: string;
}

/**
 * Generate a human-readable query preview
 */
export function generateQueryPreview(
  template: MetricTemplate,
  parameters: QueryParameters
): QueryPreview {
  const filters: string[] = [];

  // Time range description
  const timeRange = formatTimeRange(parameters.startDate, parameters.endDate);

  // Company filter (tenant isolation)
  filters.push(`Company: ${parameters.companyId}`);

  // Additional filters
  if (parameters.filters) {
    for (const [key, value] of Object.entries(parameters.filters)) {
      filters.push(`${formatFilterName(key)}: ${value}`);
    }
  }

  // Group by
  if (parameters.groupBy && parameters.groupBy.length > 0) {
    filters.push(`Grouped by: ${parameters.groupBy.map(formatFilterName).join(', ')}`);
  }

  // Build description
  const description = buildDescription(template, parameters, timeRange);

  // Build detailed explanation
  const explanation = buildExplanation(template, parameters, timeRange, filters);

  return {
    description,
    dataSource: extractDataSource(template),
    timeRange,
    filters,
    resultLimit: parameters.limit,
    estimatedComplexity: template.estimatedComplexity,
    cacheTtl: template.cacheTtlSeconds,
    explanation,
  };
}

/**
 * Build a concise description
 */
function buildDescription(
  template: MetricTemplate,
  parameters: QueryParameters,
  timeRange: string
): string {
  const metric = template.displayName;
  const company = parameters.companyId.substring(0, 8) + '...';

  let desc = `${metric} for company ${company}`;

  if (timeRange) {
    desc += ` from ${timeRange}`;
  }

  if (parameters.limit && parameters.limit < 100) {
    desc += `, limited to ${parameters.limit} rows`;
  }

  return desc;
}

/**
 * Build a detailed explanation
 */
function buildExplanation(
  template: MetricTemplate,
  parameters: QueryParameters,
  timeRange: string,
  filters: string[]
): string {
  const parts: string[] = [];

  // What metric
  parts.push(`This query retrieves **${template.displayName}** data.`);

  // From where
  parts.push(`Data source: ${extractDataSource(template)}.`);

  // Time range
  if (timeRange) {
    parts.push(`Time period: ${timeRange}.`);
  }

  // Filters
  if (filters.length > 0) {
    parts.push(`Filters applied: ${filters.join(', ')}.`);
  }

  // Complexity and performance
  parts.push(
    `Estimated query complexity: **${template.estimatedComplexity}**. ` +
    `Results cached for ${formatDuration(template.cacheTtlSeconds)}.`
  );

  // Result limit
  if (parameters.limit) {
    parts.push(`Maximum ${parameters.limit} rows will be returned.`);
  }

  // Security note
  parts.push(
    `This query is scoped to your company data only (tenant isolation enforced).`
  );

  return parts.join(' ');
}

/**
 * Format time range as human-readable string
 */
function formatTimeRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if it's a common preset
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 7) {
    return 'Last 7 days';
  } else if (daysDiff === 30 || daysDiff === 31) {
    return 'Last 30 days';
  } else if (daysDiff === 90 || daysDiff === 91) {
    return 'Last 90 days';
  } else if (isYTD(start, end)) {
    return `Year to date (${start.getFullYear()})`;
  } else if (isQuarter(start, end)) {
    return formatQuarter(start);
  } else if (isFullYear(start, end)) {
    return `Full year ${start.getFullYear()}`;
  }

  // Custom range
  return `${formatShortDate(start)} to ${formatShortDate(end)}`;
}

/**
 * Check if date range is year-to-date
 */
function isYTD(start: Date, end: Date): boolean {
  const now = new Date();
  return (
    start.getMonth() === 0 &&
    start.getDate() === 1 &&
    start.getFullYear() === now.getFullYear() &&
    end.getFullYear() === now.getFullYear()
  );
}

/**
 * Check if date range is a quarter
 */
function isQuarter(start: Date, end: Date): boolean {
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();

  // Quarters: 0-2, 3-5, 6-8, 9-11
  const quarters = [[0, 2], [3, 5], [6, 8], [9, 11]];

  return quarters.some(([qStart, qEnd]) =>
    startMonth === qStart && start.getDate() === 1 &&
    endMonth === qEnd && isEndOfMonth(end)
  );
}

/**
 * Check if date range is a full year
 */
function isFullYear(start: Date, end: Date): boolean {
  return (
    start.getMonth() === 0 &&
    start.getDate() === 1 &&
    end.getMonth() === 11 &&
    end.getDate() === 31 &&
    start.getFullYear() === end.getFullYear()
  );
}

/**
 * Check if date is end of month
 */
function isEndOfMonth(date: Date): boolean {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.getDate() === 1;
}

/**
 * Format quarter as string (e.g., "Q1 2025")
 */
function formatQuarter(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

/**
 * Format date as short string (e.g., "Jan 1, 2025")
 */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format filter name as human-readable
 */
function formatFilterName(key: string): string {
  // Convert snake_case to Title Case
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format duration in seconds as human-readable
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

/**
 * Extract primary data source from template
 */
function extractDataSource(template: MetricTemplate): string {
  const sql = template.sqlTemplate.toLowerCase();

  // Extract FROM table name
  const fromMatch = sql.match(/\bfrom\s+(\w+)/);
  if (fromMatch) {
    const tableName = fromMatch[1];
    return formatTableName(tableName);
  }

  // Fallback to category
  return template.category.charAt(0).toUpperCase() + template.category.slice(1);
}

/**
 * Format table name as human-readable
 */
function formatTableName(table: string): string {
  // Common table name mappings
  const mappings: Record<string, string> = {
    'metrics_company_period': 'Company Metrics (Aggregated)',
    'outcome_scores': 'Outcome Scores (Q2Q)',
    'benchmarks_cohort_aggregates': 'Benchmark Data (Anonymized)',
    'users': 'User Data',
    'evidence_snippets': 'Evidence Lineage',
  };

  return mappings[table] || formatFilterName(table);
}

/**
 * Generate a simple one-line preview for UI display
 */
export function generateSimplePreview(
  template: MetricTemplate,
  parameters: QueryParameters
): string {
  const timeRange = formatTimeRange(parameters.startDate, parameters.endDate);
  return `${template.displayName} • ${timeRange} • Up to ${parameters.limit} rows`;
}

/**
 * Estimate query execution time based on complexity
 */
export function estimateExecutionTime(complexity: 'low' | 'medium' | 'high'): string {
  const estimates = {
    low: '< 100ms',
    medium: '100-500ms',
    high: '500ms-2s',
  };
  return estimates[complexity];
}
