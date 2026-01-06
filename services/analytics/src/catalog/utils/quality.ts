/**
 * Data quality utilities
 *
 * Utilities for computing quality status, pass rates, and trends
 * from Great Expectations run results.
 */

import type { QualityStatus } from '@teei/shared-types';

/**
 * Quality status thresholds (pass rate percentages)
 */
export interface QualityThresholds {
  warn: number;  // Below this is 'warn'
  fail: number;  // Below this is 'fail'
}

/**
 * Default quality thresholds
 */
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  warn: 95,  // < 95% pass rate = warn
  fail: 90,  // < 90% pass rate = fail
};

/**
 * Calculate quality status from pass rate
 *
 * @param passRate - Test pass rate (0-100)
 * @param thresholds - Custom thresholds (optional)
 * @returns Quality status (pass/warn/fail/unknown)
 */
export function calculateQualityStatus(
  passRate: number | null,
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS
): QualityStatus {
  if (passRate === null || passRate === undefined) {
    return 'unknown';
  }

  if (passRate < thresholds.fail) {
    return 'fail';
  }

  if (passRate < thresholds.warn) {
    return 'warn';
  }

  return 'pass';
}

/**
 * Calculate pass rate from expectation counts
 *
 * @param passed - Number of passed expectations
 * @param total - Total number of expectations
 * @returns Pass rate (0-100), or null if total is 0
 */
export function calculatePassRate(passed: number, total: number): number | null {
  if (total === 0) {
    return null;
  }

  return (passed / total) * 100;
}

/**
 * Compute quality trend from run history
 *
 * @param history - Array of {runAt, passRate} data points
 * @returns Trend: 'improving', 'stable', 'degrading', 'unknown'
 */
export function computeQualityTrend(
  history: Array<{ runAt: Date; passRate: number }>
): 'improving' | 'stable' | 'degrading' | 'unknown' {
  if (history.length < 2) {
    return 'unknown';
  }

  // Sort by runAt ascending
  const sorted = [...history].sort((a, b) => a.runAt.getTime() - b.runAt.getTime());

  // Compare first half vs second half averages
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.passRate, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.passRate, 0) / secondHalf.length;

  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (percentChange > 2) {
    return 'improving'; // Pass rate is increasing
  }

  if (percentChange < -2) {
    return 'degrading'; // Pass rate is decreasing
  }

  return 'stable';
}

/**
 * Get quality badge color for UI
 *
 * @param status - Quality status
 * @returns CSS color class/value
 */
export function getQualityBadgeColor(status: QualityStatus): string {
  switch (status) {
    case 'pass':
      return 'green';
    case 'warn':
      return 'yellow';
    case 'fail':
      return 'red';
    case 'unknown':
      return 'gray';
  }
}

/**
 * Check if quality is acceptable (pass or warn, not fail)
 *
 * @param status - Quality status
 * @returns True if acceptable, false if fail or unknown
 */
export function isQualityAcceptable(status: QualityStatus): boolean {
  return status === 'pass' || status === 'warn';
}

/**
 * Classify failed expectations by severity
 *
 * @param failedExpectations - Array of failed expectation objects
 * @returns Counts by severity
 */
export function classifyFailedExpectations(failedExpectations: any[]): {
  errors: number;
  warnings: number;
  critical: number;
} {
  const errors = failedExpectations.filter((e) => e.severity === 'error').length;
  const warnings = failedExpectations.filter((e) => e.severity === 'warning').length;

  // Critical = errors with high impact (e.g., null in required column, unique constraint violation)
  const criticalTypes = [
    'expect_column_values_to_not_be_null',
    'expect_column_values_to_be_unique',
    'expect_table_row_count_to_be_between',
  ];
  const critical = failedExpectations.filter(
    (e) => e.severity === 'error' && criticalTypes.includes(e.expectationType)
  ).length;

  return { errors, warnings, critical };
}

/**
 * Format quality pass rate for display
 *
 * @param passRate - Pass rate (0-100)
 * @returns Formatted string (e.g., "95.2%")
 */
export function formatPassRate(passRate: number | null): string {
  if (passRate === null) {
    return 'N/A';
  }

  return `${passRate.toFixed(1)}%`;
}
