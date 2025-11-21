/**
 * Freshness SLA computation utilities
 *
 * Calculates data freshness status based on time since last load
 * and configured SLA thresholds.
 */

import type { FreshnessStatus } from '@teei/shared-types';

/**
 * Freshness SLA thresholds (in hours)
 */
export interface FreshnessThresholds {
  warn: number;
  critical: number;
}

/**
 * Default freshness thresholds by dataset domain
 */
export const DEFAULT_FRESHNESS_THRESHOLDS: Record<string, FreshnessThresholds> = {
  impact: { warn: 24, critical: 72 },        // Impact data: 24h warn, 72h critical
  reporting: { warn: 12, critical: 48 },      // Reporting: 12h warn, 48h critical
  analytics: { warn: 6, critical: 24 },       // Analytics: 6h warn, 24h critical
  identity: { warn: 1, critical: 6 },         // Identity: 1h warn, 6h critical
  buddy: { warn: 12, critical: 48 },          // Buddy: 12h warn, 48h critical
  kintell: { warn: 24, critical: 72 },        // Kintell: 24h warn, 72h critical
  compliance: { warn: 6, critical: 24 },      // Compliance: 6h warn, 24h critical
  financials: { warn: 24, critical: 168 },    // Financials: 24h warn, 1 week critical
};

/**
 * Calculate freshness status based on last load time
 *
 * @param lastLoadedAt - Timestamp of last data load
 * @param thresholds - Custom SLA thresholds (optional)
 * @param domain - Dataset domain for default thresholds
 * @returns Freshness status (ok/warn/critical/unknown)
 */
export function calculateFreshnessStatus(
  lastLoadedAt: Date | null,
  thresholds?: FreshnessThresholds,
  domain?: string
): FreshnessStatus {
  // No load time recorded
  if (!lastLoadedAt) {
    return 'unknown';
  }

  // Get thresholds (use custom, domain default, or fallback)
  const sla = thresholds ||
    (domain && DEFAULT_FRESHNESS_THRESHOLDS[domain]) ||
    { warn: 24, critical: 72 };

  const now = new Date();
  const hoursSinceLoad = (now.getTime() - lastLoadedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLoad >= sla.critical) {
    return 'critical';
  }

  if (hoursSinceLoad >= sla.warn) {
    return 'warn';
  }

  return 'ok';
}

/**
 * Calculate hours since last load
 *
 * @param lastLoadedAt - Timestamp of last data load
 * @returns Hours since last load, or null if never loaded
 */
export function calculateHoursSinceLoad(lastLoadedAt: Date | null): number | null {
  if (!lastLoadedAt) {
    return null;
  }

  const now = new Date();
  return (now.getTime() - lastLoadedAt.getTime()) / (1000 * 60 * 60);
}

/**
 * Format freshness age for display
 *
 * @param lastLoadedAt - Timestamp of last data load
 * @returns Human-readable freshness age (e.g., "2 hours ago", "3 days ago")
 */
export function formatFreshnessAge(lastLoadedAt: Date | null): string {
  if (!lastLoadedAt) {
    return 'Never loaded';
  }

  const hours = calculateHoursSinceLoad(lastLoadedAt);
  if (hours === null) {
    return 'Never loaded';
  }

  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  if (hours < 24) {
    const h = Math.floor(hours);
    return `${h} hour${h !== 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Check if dataset freshness is healthy (ok or warn, not critical)
 *
 * @param status - Freshness status
 * @returns True if healthy, false if critical or unknown
 */
export function isFreshnessHealthy(status: FreshnessStatus): boolean {
  return status === 'ok' || status === 'warn';
}

/**
 * Get freshness badge color for UI
 *
 * @param status - Freshness status
 * @returns CSS color class/value
 */
export function getFreshnessBadgeColor(status: FreshnessStatus): string {
  switch (status) {
    case 'ok':
      return 'green';
    case 'warn':
      return 'yellow';
    case 'critical':
      return 'red';
    case 'unknown':
      return 'gray';
  }
}

/**
 * Compute freshness trend from history
 *
 * @param history - Array of {timestamp, hoursSinceLastLoad} data points
 * @returns Trend: 'improving', 'stable', 'degrading', 'unknown'
 */
export function computeFreshnessTrend(
  history: Array<{ timestamp: Date; hoursSinceLastLoad: number }>
): 'improving' | 'stable' | 'degrading' | 'unknown' {
  if (history.length < 2) {
    return 'unknown';
  }

  // Sort by timestamp ascending
  const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Compare first half vs second half averages
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.hoursSinceLastLoad, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.hoursSinceLastLoad, 0) / secondHalf.length;

  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (percentChange < -10) {
    return 'improving'; // Freshness is getting better (lower hours since load)
  }

  if (percentChange > 10) {
    return 'degrading'; // Freshness is getting worse (higher hours since load)
  }

  return 'stable';
}
