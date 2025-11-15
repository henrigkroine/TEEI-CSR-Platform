import { db } from '@teei/shared-schema';
import { driftChecks } from '@teei/shared-schema/schema/q2q';
import { Language } from '../inference/language_detection.js';

/**
 * Distribution of labels (frequency of each value)
 */
export interface Distribution {
  [key: string]: number; // key: label value, value: frequency/proportion
}

/**
 * Drift check result
 */
export interface DriftCheckResult {
  label: string;
  language: Language;
  psiScore: number;
  jsScore: number;
  alertTriggered: boolean;
  baselineDistribution: Distribution;
  currentDistribution: Distribution;
  sampleSize: number;
}

/**
 * Calculate Population Stability Index (PSI)
 *
 * PSI = Σ (current% - baseline%) * ln(current% / baseline%)
 *
 * PSI thresholds:
 * - < 0.1: No significant change
 * - 0.1 - 0.2: Moderate change (monitor)
 * - > 0.2: Significant drift (alert)
 *
 * @param baseline - Baseline distribution
 * @param current - Current distribution
 * @returns PSI score
 */
export function calculatePSI(baseline: Distribution, current: Distribution): number {
  let psi = 0;

  // Get all unique keys from both distributions
  const allKeys = new Set([
    ...Object.keys(baseline),
    ...Object.keys(current),
  ]);

  for (const key of allKeys) {
    // Add small epsilon to avoid division by zero
    const epsilon = 0.0001;
    const baselineVal = (baseline[key] || 0) + epsilon;
    const currentVal = (current[key] || 0) + epsilon;

    // PSI formula: (current% - baseline%) * ln(current% / baseline%)
    const diff = currentVal - baselineVal;
    const ratio = currentVal / baselineVal;
    psi += diff * Math.log(ratio);
  }

  return Math.abs(psi);
}

/**
 * Calculate Jensen-Shannon (JS) Divergence
 *
 * JS = 0.5 * KL(P || M) + 0.5 * KL(Q || M)
 * where M = (P + Q) / 2
 *
 * JS thresholds:
 * - < 0.05: No significant change
 * - 0.05 - 0.1: Moderate change (monitor)
 * - > 0.1: Significant drift (alert)
 *
 * @param baseline - Baseline distribution
 * @param current - Current distribution
 * @returns JS divergence score
 */
export function calculateJSDivergence(
  baseline: Distribution,
  current: Distribution
): number {
  // Get all unique keys from both distributions
  const allKeys = new Set([
    ...Object.keys(baseline),
    ...Object.keys(current),
  ]);

  // Calculate M = (P + Q) / 2
  const m: Distribution = {};
  for (const key of allKeys) {
    const p = baseline[key] || 0;
    const q = current[key] || 0;
    m[key] = (p + q) / 2;
  }

  // Calculate KL(P || M)
  let klPM = 0;
  for (const key of allKeys) {
    const p = baseline[key] || 0;
    const mVal = m[key];
    if (p > 0 && mVal > 0) {
      klPM += p * Math.log(p / mVal);
    }
  }

  // Calculate KL(Q || M)
  let klQM = 0;
  for (const key of allKeys) {
    const q = current[key] || 0;
    const mVal = m[key];
    if (q > 0 && mVal > 0) {
      klQM += q * Math.log(q / mVal);
    }
  }

  // JS = 0.5 * KL(P || M) + 0.5 * KL(Q || M)
  const js = 0.5 * klPM + 0.5 * klQM;

  return js;
}

/**
 * Normalize distribution to sum to 1.0
 */
function normalizeDistribution(dist: Distribution): Distribution {
  const total = Object.values(dist).reduce((sum, val) => sum + val, 0);
  if (total === 0) return dist;

  const normalized: Distribution = {};
  for (const [key, val] of Object.entries(dist)) {
    normalized[key] = val / total;
  }
  return normalized;
}

/**
 * Check for drift between baseline and current distributions
 *
 * @param label - Label dimension to check
 * @param language - Language to check
 * @param baseline - Baseline distribution
 * @param current - Current distribution
 * @param psiThreshold - PSI threshold for alerting (default 0.2)
 * @param jsThreshold - JS threshold for alerting (default 0.1)
 * @returns Drift check result
 */
export function checkDrift(
  label: string,
  language: Language,
  baseline: Distribution,
  current: Distribution,
  psiThreshold: number = 0.2,
  jsThreshold: number = 0.1
): DriftCheckResult {
  // Normalize distributions
  const normalizedBaseline = normalizeDistribution(baseline);
  const normalizedCurrent = normalizeDistribution(current);

  // Calculate drift metrics
  const psiScore = calculatePSI(normalizedBaseline, normalizedCurrent);
  const jsScore = calculateJSDivergence(normalizedBaseline, normalizedCurrent);

  // Determine if alert should be triggered
  const alertTriggered = psiScore > psiThreshold || jsScore > jsThreshold;

  // Calculate sample size
  const sampleSize = Object.values(current).reduce((sum, val) => sum + val, 0);

  return {
    label,
    language,
    psiScore,
    jsScore,
    alertTriggered,
    baselineDistribution: normalizedBaseline,
    currentDistribution: normalizedCurrent,
    sampleSize,
  };
}

/**
 * Store drift check result in database
 */
export async function storeDriftCheck(result: DriftCheckResult): Promise<void> {
  try {
    await db.insert(driftChecks).values({
      checkDate: new Date(),
      label: result.label,
      language: result.language,
      psiScore: result.psiScore.toString(),
      jsScore: result.jsScore.toString(),
      alertTriggered: result.alertTriggered,
      baselineDistribution: result.baselineDistribution,
      currentDistribution: result.currentDistribution,
      sampleSize: result.sampleSize.toString(),
    });

    console.info(
      `[DriftMonitor] Stored drift check for ${result.label} (${result.language}): PSI=${result.psiScore.toFixed(4)}, JS=${result.jsScore.toFixed(4)}, Alert=${result.alertTriggered}`
    );
  } catch (error: any) {
    console.error('[DriftMonitor] Failed to store drift check:', error.message);
  }
}

/**
 * Get recent drift checks
 */
export async function getRecentDriftChecks(
  limit: number = 50
): Promise<any[]> {
  try {
    const checks = await db
      .select()
      .from(driftChecks)
      .orderBy(driftChecks.checkDate)
      .limit(limit);

    return checks;
  } catch (error: any) {
    console.error('[DriftMonitor] Failed to get drift checks:', error.message);
    return [];
  }
}

/**
 * Get drift alerts (checks where alert was triggered)
 */
export async function getDriftAlerts(limit: number = 20): Promise<any[]> {
  try {
    const { eq } = await import('drizzle-orm');
    const alerts = await db
      .select()
      .from(driftChecks)
      .where(eq(driftChecks.alertTriggered, true))
      .orderBy(driftChecks.checkDate)
      .limit(limit);

    return alerts;
  } catch (error: any) {
    console.error('[DriftMonitor] Failed to get drift alerts:', error.message);
    return [];
  }
}

/**
 * Format drift check result as human-readable report
 */
export function formatDriftReport(result: DriftCheckResult): string {
  const lines: string[] = [];

  lines.push(`\n=== Drift Check Report ===`);
  lines.push(`Label: ${result.label}`);
  lines.push(`Language: ${result.language}`);
  lines.push(`Sample Size: ${result.sampleSize}`);
  lines.push(`\nDrift Metrics:`);
  lines.push(`  PSI Score: ${result.psiScore.toFixed(4)} ${result.psiScore > 0.2 ? '⚠️  ALERT' : result.psiScore > 0.1 ? '⚡ MONITOR' : '✓ OK'}`);
  lines.push(`  JS Score:  ${result.jsScore.toFixed(4)} ${result.jsScore > 0.1 ? '⚠️  ALERT' : result.jsScore > 0.05 ? '⚡ MONITOR' : '✓ OK'}`);
  lines.push(`\nAlert Triggered: ${result.alertTriggered ? 'YES ⚠️' : 'NO ✓'}`);

  lines.push(`\nBaseline Distribution:`);
  for (const [key, val] of Object.entries(result.baselineDistribution)) {
    lines.push(`  ${key}: ${(val * 100).toFixed(2)}%`);
  }

  lines.push(`\nCurrent Distribution:`);
  for (const [key, val] of Object.entries(result.currentDistribution)) {
    lines.push(`  ${key}: ${(val * 100).toFixed(2)}%`);
  }

  lines.push('\n');

  return lines.join('\n');
}

// ============================================================================
// Per-Tenant Drift Monitoring (Phase F Extension)
// ============================================================================

/**
 * Tenant-specific drift check result
 */
export interface TenantDriftCheckResult extends DriftCheckResult {
  tenantId: string;
}

/**
 * Drift alert configuration
 */
export interface DriftAlertConfig {
  /** PSI threshold for alert (default 0.2) */
  psiThreshold: number;
  /** JS divergence threshold for alert (default 0.1) */
  jsThreshold: number;
  /** Whether to emit alerts to console */
  emitConsoleAlerts: boolean;
  /** Whether to store alerts in database */
  storeAlerts: boolean;
}

/**
 * Drift alert event
 */
export interface DriftAlert {
  id: string;
  tenantId: string;
  label: string;
  language: Language;
  psiScore: number;
  jsScore: number;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  message: string;
}

/**
 * Check drift with tenant-specific configuration
 *
 * @param tenantId - Tenant identifier
 * @param label - Label dimension to check
 * @param language - Language to check
 * @param baseline - Baseline distribution
 * @param current - Current distribution
 * @param psiThreshold - PSI threshold for alerting
 * @param jsThreshold - JS threshold for alerting
 * @returns Tenant-specific drift check result
 */
export function checkTenantDrift(
  tenantId: string,
  label: string,
  language: Language,
  baseline: Distribution,
  current: Distribution,
  psiThreshold: number = 0.2,
  jsThreshold: number = 0.1
): TenantDriftCheckResult {
  const baseResult = checkDrift(label, language, baseline, current, psiThreshold, jsThreshold);

  return {
    ...baseResult,
    tenantId,
  };
}

/**
 * Monitor drift for multiple tenants
 *
 * @param tenantChecks - Array of tenant-specific checks to perform
 * @returns Array of drift check results
 */
export function monitorMultiTenantDrift(
  tenantChecks: Array<{
    tenantId: string;
    label: string;
    language: Language;
    baseline: Distribution;
    current: Distribution;
    psiThreshold?: number;
    jsThreshold?: number;
  }>
): TenantDriftCheckResult[] {
  const results: TenantDriftCheckResult[] = [];

  for (const check of tenantChecks) {
    const result = checkTenantDrift(
      check.tenantId,
      check.label,
      check.language,
      check.baseline,
      check.current,
      check.psiThreshold,
      check.jsThreshold
    );

    results.push(result);
  }

  return results;
}

/**
 * Store tenant-specific drift check in database
 */
export async function storeTenantDriftCheck(
  result: TenantDriftCheckResult
): Promise<void> {
  try {
    await db.insert(driftChecks).values({
      checkDate: new Date(),
      tenantId: result.tenantId,
      label: result.label,
      language: result.language,
      psiScore: result.psiScore.toString(),
      jsScore: result.jsScore.toString(),
      alertTriggered: result.alertTriggered,
      baselineDistribution: result.baselineDistribution,
      currentDistribution: result.currentDistribution,
      sampleSize: result.sampleSize.toString(),
    });

    console.info(
      `[DriftMonitor] Stored tenant drift check for ${result.tenantId}/${result.label} (${result.language}): PSI=${result.psiScore.toFixed(4)}, JS=${result.jsScore.toFixed(4)}, Alert=${result.alertTriggered}`
    );
  } catch (error: any) {
    console.error('[DriftMonitor] Failed to store tenant drift check:', error.message);
  }
}

/**
 * Get drift checks for a specific tenant
 */
export async function getTenantDriftChecks(
  tenantId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { eq } = await import('drizzle-orm');
    const checks = await db
      .select()
      .from(driftChecks)
      .where(eq(driftChecks.tenantId, tenantId))
      .orderBy(driftChecks.checkDate)
      .limit(limit);

    return checks;
  } catch (error: any) {
    console.error('[DriftMonitor] Failed to get tenant drift checks:', error.message);
    return [];
  }
}

/**
 * Get drift alerts for a specific tenant
 */
export async function getTenantDriftAlerts(
  tenantId: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const { eq, and } = await import('drizzle-orm');
    const alerts = await db
      .select()
      .from(driftChecks)
      .where(
        and(
          eq(driftChecks.tenantId, tenantId),
          eq(driftChecks.alertTriggered, true)
        )
      )
      .orderBy(driftChecks.checkDate)
      .limit(limit);

    return alerts;
  } catch (error: any) {
    console.error('[DriftMonitor] Failed to get tenant drift alerts:', error.message);
    return [];
  }
}

/**
 * Determine drift alert severity based on scores
 */
export function determineDriftSeverity(
  psiScore: number,
  jsScore: number
): 'low' | 'medium' | 'high' {
  // High severity: either metric significantly exceeds threshold
  if (psiScore > 0.3 || jsScore > 0.15) {
    return 'high';
  }

  // Medium severity: either metric moderately exceeds threshold
  if (psiScore > 0.2 || jsScore > 0.1) {
    return 'medium';
  }

  // Low severity: metrics in monitoring range
  return 'low';
}

/**
 * Emit drift alert
 *
 * @param result - Drift check result
 * @param config - Alert configuration
 */
export async function emitDriftAlert(
  result: TenantDriftCheckResult,
  config: DriftAlertConfig
): Promise<DriftAlert | null> {
  if (!result.alertTriggered) {
    return null;
  }

  const severity = determineDriftSeverity(result.psiScore, result.jsScore);
  const alert: DriftAlert = {
    id: `drift_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId: result.tenantId,
    label: result.label,
    language: result.language,
    psiScore: result.psiScore,
    jsScore: result.jsScore,
    severity,
    timestamp: new Date().toISOString(),
    message: `Drift detected for tenant ${result.tenantId} on ${result.label} (${result.language}): PSI=${result.psiScore.toFixed(4)}, JS=${result.jsScore.toFixed(4)}`,
  };

  // Emit console alert
  if (config.emitConsoleAlerts) {
    const severitySymbol = severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : '📊';
    console.warn(
      `[DriftAlert] ${severitySymbol} ${alert.message} [Severity: ${severity.toUpperCase()}]`
    );
  }

  // Store alert in database
  if (config.storeAlerts) {
    await storeTenantDriftCheck(result);
  }

  return alert;
}

/**
 * Format tenant drift report
 */
export function formatTenantDriftReport(result: TenantDriftCheckResult): string {
  const lines: string[] = [];

  lines.push(`\n=== Tenant Drift Check Report ===`);
  lines.push(`Tenant ID: ${result.tenantId}`);
  lines.push(`Label: ${result.label}`);
  lines.push(`Language: ${result.language}`);
  lines.push(`Sample Size: ${result.sampleSize}`);
  lines.push(`\nDrift Metrics:`);
  lines.push(`  PSI Score: ${result.psiScore.toFixed(4)} ${result.psiScore > 0.2 ? '⚠️  ALERT' : result.psiScore > 0.1 ? '⚡ MONITOR' : '✓ OK'}`);
  lines.push(`  JS Score:  ${result.jsScore.toFixed(4)} ${result.jsScore > 0.1 ? '⚠️  ALERT' : result.jsScore > 0.05 ? '⚡ MONITOR' : '✓ OK'}`);

  const severity = determineDriftSeverity(result.psiScore, result.jsScore);
  lines.push(`  Severity:  ${severity.toUpperCase()}`);
  lines.push(`\nAlert Triggered: ${result.alertTriggered ? 'YES ⚠️' : 'NO ✓'}`);

  lines.push(`\nBaseline Distribution:`);
  for (const [key, val] of Object.entries(result.baselineDistribution)) {
    lines.push(`  ${key}: ${(val * 100).toFixed(2)}%`);
  }

  lines.push(`\nCurrent Distribution:`);
  for (const [key, val] of Object.entries(result.currentDistribution)) {
    lines.push(`  ${key}: ${(val * 100).toFixed(2)}%`);
  }

  lines.push('\n');

  return lines.join('\n');
}

/**
 * Aggregate drift metrics across tenants
 */
export interface TenantDriftSummary {
  totalTenants: number;
  tenantsWithAlerts: number;
  totalChecks: number;
  totalAlerts: number;
  averagePSI: number;
  averageJS: number;
  severityCounts: {
    low: number;
    medium: number;
    high: number;
  };
}

/**
 * Generate summary of drift across all tenants
 */
export function summarizeTenantDrift(
  results: TenantDriftCheckResult[]
): TenantDriftSummary {
  const tenantSet = new Set(results.map((r) => r.tenantId));
  const tenantsWithAlerts = new Set(
    results.filter((r) => r.alertTriggered).map((r) => r.tenantId)
  );

  let totalPSI = 0;
  let totalJS = 0;
  let totalAlerts = 0;
  const severityCounts = { low: 0, medium: 0, high: 0 };

  for (const result of results) {
    totalPSI += result.psiScore;
    totalJS += result.jsScore;

    if (result.alertTriggered) {
      totalAlerts++;
      const severity = determineDriftSeverity(result.psiScore, result.jsScore);
      severityCounts[severity]++;
    }
  }

  return {
    totalTenants: tenantSet.size,
    tenantsWithAlerts: tenantsWithAlerts.size,
    totalChecks: results.length,
    totalAlerts,
    averagePSI: results.length > 0 ? totalPSI / results.length : 0,
    averageJS: results.length > 0 ? totalJS / results.length : 0,
    severityCounts,
  };
}

/**
 * Format tenant drift summary for reporting
 */
export function formatTenantDriftSummary(summary: TenantDriftSummary): string {
  const lines: string[] = [];

  lines.push('\n=== Multi-Tenant Drift Summary ===');
  lines.push(`Total Tenants: ${summary.totalTenants}`);
  lines.push(`Tenants with Alerts: ${summary.tenantsWithAlerts}`);
  lines.push(`Total Checks: ${summary.totalChecks}`);
  lines.push(`Total Alerts: ${summary.totalAlerts}`);
  lines.push(`\nAverage Metrics:`);
  lines.push(`  PSI: ${summary.averagePSI.toFixed(4)}`);
  lines.push(`  JS:  ${summary.averageJS.toFixed(4)}`);
  lines.push(`\nAlert Severity Distribution:`);
  lines.push(`  Low:    ${summary.severityCounts.low}`);
  lines.push(`  Medium: ${summary.severityCounts.medium}`);
  lines.push(`  High:   ${summary.severityCounts.high}`);
  lines.push('');

  return lines.join('\n');
}
