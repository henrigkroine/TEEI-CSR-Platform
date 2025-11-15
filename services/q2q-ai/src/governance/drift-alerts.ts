/**
 * Drift Detection and Alerting System
 * Monitors model performance drift using PSI and Jensen-Shannon divergence
 */

import { db } from '@teei/shared-schema/db';
import { driftChecks, outcomeScores } from '@teei/shared-schema/schema/q2q';
import { sql, eq, and, gte } from 'drizzle-orm';

export interface DriftAlert {
  id: string;
  checkDate: string;
  dimension: string;
  language: string;
  psiScore: number;
  jsScore: number;
  severity: 'warning' | 'critical';
  message: string;
  baselineDistribution: Record<string, number>;
  currentDistribution: Record<string, number>;
  sampleSize: number;
  recommendations: string[];
}

export interface DriftMonitorConfig {
  psiThreshold: {
    warning: number; // 0.1-0.25 typical for warning
    critical: number; // >0.25 for critical
  };
  jsThreshold: {
    warning: number; // 0.1-0.2 for warning
    critical: number; // >0.2 for critical
  };
  minSampleSize: number; // Minimum samples to check drift
  checkInterval: number; // Hours between checks
  baselinePeriod: number; // Days for baseline calculation
}

const DEFAULT_CONFIG: DriftMonitorConfig = {
  psiThreshold: { warning: 0.15, critical: 0.25 },
  jsThreshold: { warning: 0.15, critical: 0.25 },
  minSampleSize: 100,
  checkInterval: 24, // Daily checks
  baselinePeriod: 30 // 30-day baseline
};

/**
 * Drift Alerting System
 */
export class DriftAlertSystem {
  private config: DriftMonitorConfig;
  private alerts: DriftAlert[] = [];

  constructor(config: Partial<DriftMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run drift check for a dimension and language
   */
  async checkDrift(
    dimension: string,
    language: 'en' | 'uk' | 'no'
  ): Promise<DriftAlert | null> {
    // 1. Get baseline distribution (last 30 days before current period)
    const baselineStart = new Date();
    baselineStart.setDate(baselineStart.getDate() - (this.config.baselinePeriod + 7));
    const baselineEnd = new Date();
    baselineEnd.setDate(baselineEnd.getDate() - 7);

    const baselineScores = await db
      .select()
      .from(outcomeScores)
      .where(
        and(
          eq(outcomeScores.dimension, dimension),
          eq(outcomeScores.language, language),
          gte(outcomeScores.createdAt, baselineStart),
          sql`${outcomeScores.createdAt} <= ${baselineEnd}`
        )
      );

    // 2. Get current distribution (last 7 days)
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - 7);

    const currentScores = await db
      .select()
      .from(outcomeScores)
      .where(
        and(
          eq(outcomeScores.dimension, dimension),
          eq(outcomeScores.language, language),
          gte(outcomeScores.createdAt, currentStart)
        )
      );

    // Check minimum sample size
    if (baselineScores.length < this.config.minSampleSize ||
        currentScores.length < this.config.minSampleSize) {
      console.info(`[DriftAlert] Insufficient samples for ${dimension}/${language} (baseline: ${baselineScores.length}, current: ${currentScores.length})`);
      return null;
    }

    // 3. Calculate distributions (binned into 10 buckets: 0-0.1, 0.1-0.2, ..., 0.9-1.0)
    const baselineDist = this.calculateDistribution(baselineScores);
    const currentDist = this.calculateDistribution(currentScores);

    // 4. Calculate PSI and JS divergence
    const psi = this.calculatePSI(baselineDist, currentDist);
    const js = this.calculateJS(baselineDist, currentDist);

    // 5. Determine severity
    let severity: 'warning' | 'critical' | null = null;
    if (psi >= this.config.psiThreshold.critical || js >= this.config.jsThreshold.critical) {
      severity = 'critical';
    } else if (psi >= this.config.psiThreshold.warning || js >= this.config.jsThreshold.warning) {
      severity = 'warning';
    }

    // 6. Store drift check
    await db.insert(driftChecks).values({
      checkDate: new Date(),
      label: dimension,
      language,
      psiScore: psi.toString(),
      jsScore: js.toString(),
      alertTriggered: severity !== null,
      baselineDistribution: baselineDist,
      currentDistribution: currentDist,
      sampleSize: currentScores.length.toString()
    });

    // 7. Generate alert if threshold exceeded
    if (severity) {
      const alert: DriftAlert = {
        id: `alert-${dimension}-${language}-${Date.now()}`,
        checkDate: new Date().toISOString(),
        dimension,
        language,
        psiScore: psi,
        jsScore: js,
        severity,
        message: `Drift detected in ${dimension} (${language}): PSI=${psi.toFixed(3)}, JS=${js.toFixed(3)}`,
        baselineDistribution: baselineDist,
        currentDistribution: currentDist,
        sampleSize: currentScores.length,
        recommendations: this.generateRecommendations(dimension, psi, js, severity)
      };

      this.alerts.push(alert);
      console.warn(`[DriftAlert] ${severity.toUpperCase()}: ${alert.message}`);

      return alert;
    }

    console.info(`[DriftAlert] No drift detected for ${dimension}/${language} (PSI=${psi.toFixed(3)}, JS=${js.toFixed(3)})`);
    return null;
  }

  /**
   * Calculate distribution from scores (binned)
   */
  private calculateDistribution(scores: any[]): Record<string, number> {
    const bins = Array(10).fill(0);

    for (const score of scores) {
      const value = parseFloat(score.score);
      const binIndex = Math.min(Math.floor(value * 10), 9);
      bins[binIndex]++;
    }

    // Normalize to probabilities
    const total = scores.length;
    const dist: Record<string, number> = {};

    for (let i = 0; i < 10; i++) {
      const binLabel = `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`;
      dist[binLabel] = bins[i] / total;
    }

    return dist;
  }

  /**
   * Calculate Population Stability Index (PSI)
   * PSI = Σ (actual% - expected%) * ln(actual% / expected%)
   */
  private calculatePSI(
    baseline: Record<string, number>,
    current: Record<string, number>
  ): number {
    let psi = 0;

    for (const bin of Object.keys(baseline)) {
      const expected = baseline[bin] || 0.0001; // Avoid log(0)
      const actual = current[bin] || 0.0001;

      psi += (actual - expected) * Math.log(actual / expected);
    }

    return psi;
  }

  /**
   * Calculate Jensen-Shannon Divergence
   * JS(P||Q) = 0.5 * KL(P||M) + 0.5 * KL(Q||M) where M = 0.5*(P+Q)
   */
  private calculateJS(
    baseline: Record<string, number>,
    current: Record<string, number>
  ): number {
    const bins = Object.keys(baseline);

    // Calculate midpoint distribution M
    const midpoint: Record<string, number> = {};
    for (const bin of bins) {
      midpoint[bin] = 0.5 * ((baseline[bin] || 0) + (current[bin] || 0));
    }

    // KL(P||M)
    let klPM = 0;
    for (const bin of bins) {
      const p = baseline[bin] || 0.0001;
      const m = midpoint[bin] || 0.0001;
      klPM += p * Math.log(p / m);
    }

    // KL(Q||M)
    let klQM = 0;
    for (const bin of bins) {
      const q = current[bin] || 0.0001;
      const m = midpoint[bin] || 0.0001;
      klQM += q * Math.log(q / m);
    }

    return 0.5 * (klPM + klQM);
  }

  /**
   * Generate recommendations based on drift
   */
  private generateRecommendations(
    dimension: string,
    psi: number,
    js: number,
    severity: 'warning' | 'critical'
  ): string[] {
    const recommendations: string[] = [];

    if (severity === 'critical') {
      recommendations.push('🚨 Immediate action required: Significant drift detected');
      recommendations.push('Consider pausing model and investigating root cause');
      recommendations.push('Review recent data quality and schema changes');
    } else {
      recommendations.push('⚠️ Monitor closely: Early drift indicators detected');
    }

    recommendations.push(`Re-calibrate model on recent ${dimension} data`);
    recommendations.push('Run A/B test with retrained model');
    recommendations.push('Check for data pipeline issues or schema changes');

    if (psi > js) {
      recommendations.push('PSI higher than JS suggests distribution shift in tails');
    }

    return recommendations;
  }

  /**
   * Run drift checks for all dimensions and languages
   */
  async runAllChecks(): Promise<DriftAlert[]> {
    const dimensions = ['confidence', 'belonging', 'lang_level_proxy', 'job_readiness', 'well_being'];
    const languages: ('en' | 'uk' | 'no')[] = ['en', 'uk', 'no'];

    const alerts: DriftAlert[] = [];

    for (const dimension of dimensions) {
      for (const language of languages) {
        const alert = await this.checkDrift(dimension, language);
        if (alert) {
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10): DriftAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

/**
 * Singleton instance
 */
let systemInstance: DriftAlertSystem | null = null;

export function getDriftAlertSystem(): DriftAlertSystem {
  if (!systemInstance) {
    systemInstance = new DriftAlertSystem();
  }
  return systemInstance;
}
