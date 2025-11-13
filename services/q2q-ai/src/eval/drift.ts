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
