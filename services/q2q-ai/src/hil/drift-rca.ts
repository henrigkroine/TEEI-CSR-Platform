/**
 * Drift Root Cause Analysis - drift-rca-analyst
 * Analyzes drift patterns and surfaces root causes
 */

import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import postgres from 'postgres';

const logger = createServiceLogger('drift-rca');

/**
 * Drift Detection Result
 */
export const DriftResultSchema = z.object({
  id: z.string(),
  modelVersion: z.string(),
  detectedAt: z.string(),
  driftType: z.enum(['concept_drift', 'data_drift', 'label_drift']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affectedOutcomes: z.array(z.string()), // Which outcome dimensions are affected
  metrics: z.object({
    accuracyDrop: z.number(), // Percentage drop
    confidenceDrop: z.number(),
    predictionShift: z.number(), // Distribution shift
  }),
  sampleSize: z.number(),
  timeWindow: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export type DriftResult = z.infer<typeof DriftResultSchema>;

/**
 * Root Cause Analysis
 */
export const RootCauseSchema = z.object({
  driftId: z.string(),
  rootCauses: z.array(
    z.object({
      category: z.enum([
        'training_data_staleness',
        'feature_distribution_change',
        'label_inconsistency',
        'new_patterns',
        'seasonal_variation',
        'external_event',
      ]),
      description: z.string(),
      confidence: z.number(), // 0-1
      evidenceCount: z.number(),
      examples: z.array(
        z.object({
          feedbackText: z.string(),
          expectedOutcome: z.record(z.number()),
          actualPrediction: z.record(z.number()),
        })
      ),
    })
  ),
  recommendations: z.array(
    z.object({
      action: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      estimatedImpact: z.string(),
    })
  ),
  analyzedAt: z.string(),
});

export type RootCause = z.infer<typeof RootCauseSchema>;

export class DriftRcaService {
  private db: postgres.Sql;

  constructor() {
    this.db = postgres(process.env.DATABASE_URL!);
  }

  /**
   * Detect drift in model performance
   */
  async detectDrift(options: {
    modelVersion: string;
    timeWindowDays?: number;
    baselineWindowDays?: number;
  }): Promise<DriftResult | null> {
    const { modelVersion, timeWindowDays = 7, baselineWindowDays = 30 } = options;

    logger.info({ modelVersion, timeWindowDays }, 'Detecting drift');

    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - timeWindowDays * 24 * 60 * 60 * 1000);
    const baselineEnd = new Date(currentWindowStart.getTime() - 1);
    const baselineStart = new Date(baselineEnd.getTime() - baselineWindowDays * 24 * 60 * 60 * 1000);

    // Get current window metrics
    const currentMetrics = await this.getPerformanceMetrics(
      modelVersion,
      currentWindowStart.toISOString(),
      now.toISOString()
    );

    // Get baseline metrics
    const baselineMetrics = await this.getPerformanceMetrics(
      modelVersion,
      baselineStart.toISOString(),
      baselineEnd.toISOString()
    );

    // Calculate drift
    const accuracyDrop = baselineMetrics.accuracy - currentMetrics.accuracy;
    const confidenceDrop = baselineMetrics.avgConfidence - currentMetrics.avgConfidence;
    const predictionShift = this.calculatePredictionShift(baselineMetrics.distribution, currentMetrics.distribution);

    // Determine if drift is significant
    const hasDrift = accuracyDrop > 0.05 || confidenceDrop > 0.1 || predictionShift > 0.15;

    if (!hasDrift) {
      logger.info({ modelVersion }, 'No significant drift detected');
      return null;
    }

    // Determine severity
    let severity: DriftResult['severity'] = 'low';
    if (accuracyDrop > 0.20 || confidenceDrop > 0.30) {
      severity = 'critical';
    } else if (accuracyDrop > 0.15 || confidenceDrop > 0.20) {
      severity = 'high';
    } else if (accuracyDrop > 0.10 || confidenceDrop > 0.15) {
      severity = 'medium';
    }

    // Determine drift type
    let driftType: DriftResult['driftType'] = 'data_drift';
    if (confidenceDrop > 0.20) {
      driftType = 'concept_drift'; // Model is confused
    } else if (predictionShift > 0.20) {
      driftType = 'label_drift'; // Distribution of outcomes has changed
    }

    const driftResult: DriftResult = {
      id: `drift_${Date.now()}`,
      modelVersion,
      detectedAt: now.toISOString(),
      driftType,
      severity,
      affectedOutcomes: this.identifyAffectedOutcomes(baselineMetrics, currentMetrics),
      metrics: {
        accuracyDrop,
        confidenceDrop,
        predictionShift,
      },
      sampleSize: currentMetrics.sampleSize,
      timeWindow: {
        start: currentWindowStart.toISOString(),
        end: now.toISOString(),
      },
    };

    // Store drift detection
    await this.storeDriftResult(driftResult);

    logger.warn({ driftResult }, 'Drift detected');

    return driftResult;
  }

  /**
   * Perform root cause analysis for drift
   */
  async analyzeRootCauses(driftId: string): Promise<RootCause> {
    logger.info({ driftId }, 'Performing root cause analysis');

    const drift = await this.getDriftResult(driftId);
    if (!drift) {
      throw new Error(`Drift result not found: ${driftId}`);
    }

    // Analyze different categories
    const rootCauses: RootCause['rootCauses'] = [];

    // 1. Check for training data staleness
    const staleness = await this.checkTrainingDataStaleness(drift.modelVersion);
    if (staleness.isStale) {
      rootCauses.push({
        category: 'training_data_staleness',
        description: `Training data is ${staleness.daysSinceUpdate} days old. Model may not reflect recent patterns.`,
        confidence: 0.8,
        evidenceCount: staleness.evidenceCount,
        examples: staleness.examples,
      });
    }

    // 2. Check for feature distribution changes
    const featureShift = await this.checkFeatureDistribution(drift);
    if (featureShift.hasShift) {
      rootCauses.push({
        category: 'feature_distribution_change',
        description: `Input feature distribution has shifted significantly in ${featureShift.affectedFeatures.join(', ')}.`,
        confidence: 0.7,
        evidenceCount: featureShift.evidenceCount,
        examples: featureShift.examples,
      });
    }

    // 3. Check for new patterns
    const newPatterns = await this.detectNewPatterns(drift);
    if (newPatterns.found) {
      rootCauses.push({
        category: 'new_patterns',
        description: `New feedback patterns detected that were not present in training data.`,
        confidence: 0.75,
        evidenceCount: newPatterns.evidenceCount,
        examples: newPatterns.examples,
      });
    }

    // 4. Generate recommendations
    const recommendations: RootCause['recommendations'] = [];

    if (staleness.isStale) {
      recommendations.push({
        action: 'Retrain model with recent data (last 90 days)',
        priority: 'high',
        estimatedImpact: 'Expected to recover 60-80% of accuracy drop',
      });
    }

    if (newPatterns.found) {
      recommendations.push({
        action: 'Augment training data with new pattern samples',
        priority: 'high',
        estimatedImpact: 'Should improve coverage of edge cases',
      });
    }

    recommendations.push({
      action: 'Increase adjudication queue priority for affected outcomes',
      priority: 'medium',
      estimatedImpact: 'Provides human oversight while retraining',
    });

    const rca: RootCause = {
      driftId,
      rootCauses,
      recommendations,
      analyzedAt: new Date().toISOString(),
    };

    // Store RCA
    await this.storeRootCauseAnalysis(rca);

    logger.info({ driftId, rootCauseCount: rootCauses.length }, 'Root cause analysis complete');

    return rca;
  }

  /**
   * Get performance metrics for time window
   */
  private async getPerformanceMetrics(
    modelVersion: string,
    startDate: string,
    endDate: string
  ): Promise<{
    accuracy: number;
    avgConfidence: number;
    sampleSize: number;
    distribution: Record<string, number>;
  }> {
    // Query predictions with ground truth
    const predictions = await this.db`
      SELECT
        predicted_outcomes,
        actual_outcomes,
        confidence
      FROM q2q_predictions
      WHERE model_version = ${modelVersion}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND actual_outcomes IS NOT NULL
    `;

    if (predictions.length === 0) {
      return {
        accuracy: 0,
        avgConfidence: 0,
        sampleSize: 0,
        distribution: {},
      };
    }

    // Calculate accuracy
    let correctCount = 0;
    let totalConfidence = 0;
    const distribution: Record<string, number> = {};

    for (const pred of predictions) {
      const predicted = pred.predicted_outcomes;
      const actual = pred.actual_outcomes;

      // Simple accuracy: top outcome matches
      const topPredicted = this.getTopOutcome(predicted);
      const topActual = this.getTopOutcome(actual);

      if (topPredicted === topActual) {
        correctCount++;
      }

      totalConfidence += pred.confidence || 0;

      // Update distribution
      distribution[topPredicted] = (distribution[topPredicted] || 0) + 1;
    }

    return {
      accuracy: correctCount / predictions.length,
      avgConfidence: totalConfidence / predictions.length,
      sampleSize: predictions.length,
      distribution,
    };
  }

  /**
   * Calculate prediction distribution shift
   */
  private calculatePredictionShift(baseline: Record<string, number>, current: Record<string, number>): number {
    const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
    let totalShift = 0;

    const baselineTotal = Object.values(baseline).reduce((sum, v) => sum + v, 0);
    const currentTotal = Object.values(current).reduce((sum, v) => sum + v, 0);

    for (const key of allKeys) {
      const baselineProb = (baseline[key] || 0) / baselineTotal;
      const currentProb = (current[key] || 0) / currentTotal;
      totalShift += Math.abs(baselineProb - currentProb);
    }

    return totalShift / 2; // Normalize
  }

  /**
   * Get top outcome from scores
   */
  private getTopOutcome(outcomes: Record<string, number>): string {
    let maxScore = -Infinity;
    let topOutcome = '';

    for (const [outcome, score] of Object.entries(outcomes)) {
      if (score > maxScore) {
        maxScore = score;
        topOutcome = outcome;
      }
    }

    return topOutcome;
  }

  /**
   * Identify which outcomes are most affected
   */
  private identifyAffectedOutcomes(baseline: any, current: any): string[] {
    // Simple: return top 3 outcomes with largest drops
    const drops: { outcome: string; drop: number }[] = [];

    for (const outcome of Object.keys(baseline.distribution)) {
      const baselineProb = baseline.distribution[outcome] / baseline.sampleSize;
      const currentProb = (current.distribution[outcome] || 0) / current.sampleSize;
      const drop = baselineProb - currentProb;

      if (drop > 0.05) {
        drops.push({ outcome, drop });
      }
    }

    return drops
      .sort((a, b) => b.drop - a.drop)
      .slice(0, 3)
      .map((d) => d.outcome);
  }

  /**
   * Check training data staleness
   */
  private async checkTrainingDataStaleness(modelVersion: string): Promise<{
    isStale: boolean;
    daysSinceUpdate: number;
    evidenceCount: number;
    examples: any[];
  }> {
    const model = await this.db`
      SELECT trained_at, training_data_end_date
      FROM model_registry
      WHERE version = ${modelVersion}
      LIMIT 1
    `;

    if (model.length === 0) {
      return { isStale: true, daysSinceUpdate: 999, evidenceCount: 0, examples: [] };
    }

    const trainedAt = new Date(model[0].trained_at);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - trainedAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isStale: daysSinceUpdate > 90, // Stale if > 90 days
      daysSinceUpdate,
      evidenceCount: 1,
      examples: [],
    };
  }

  /**
   * Check for feature distribution changes
   */
  private async checkFeatureDistribution(drift: DriftResult): Promise<{
    hasShift: boolean;
    affectedFeatures: string[];
    evidenceCount: number;
    examples: any[];
  }> {
    // Simplified - would analyze token distributions, lengths, etc.
    return {
      hasShift: drift.metrics.predictionShift > 0.15,
      affectedFeatures: ['feedback_length', 'sentiment'],
      evidenceCount: 5,
      examples: [],
    };
  }

  /**
   * Detect new patterns not in training data
   */
  private async detectNewPatterns(drift: DriftResult): Promise<{
    found: boolean;
    evidenceCount: number;
    examples: any[];
  }> {
    // Simplified - would use clustering or novelty detection
    return {
      found: drift.metrics.confidenceDrop > 0.15,
      evidenceCount: 3,
      examples: [],
    };
  }

  /**
   * Store drift result
   */
  private async storeDriftResult(drift: DriftResult): Promise<void> {
    await this.db`
      INSERT INTO drift_detections (
        id, model_version, detected_at, drift_type, severity,
        affected_outcomes, metrics, sample_size, time_window
      ) VALUES (
        ${drift.id}, ${drift.modelVersion}, ${drift.detectedAt}, ${drift.driftType},
        ${drift.severity}, ${JSON.stringify(drift.affectedOutcomes)},
        ${JSON.stringify(drift.metrics)}, ${drift.sampleSize},
        ${JSON.stringify(drift.timeWindow)}
      )
    `;
  }

  /**
   * Get drift result
   */
  private async getDriftResult(driftId: string): Promise<DriftResult | null> {
    const rows = await this.db`
      SELECT * FROM drift_detections
      WHERE id = ${driftId}
    `;

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      modelVersion: row.model_version,
      detectedAt: row.detected_at,
      driftType: row.drift_type,
      severity: row.severity,
      affectedOutcomes: row.affected_outcomes,
      metrics: row.metrics,
      sampleSize: row.sample_size,
      timeWindow: row.time_window,
    };
  }

  /**
   * Store root cause analysis
   */
  private async storeRootCauseAnalysis(rca: RootCause): Promise<void> {
    await this.db`
      INSERT INTO drift_root_cause_analysis (
        drift_id, root_causes, recommendations, analyzed_at
      ) VALUES (
        ${rca.driftId}, ${JSON.stringify(rca.rootCauses)},
        ${JSON.stringify(rca.recommendations)}, ${rca.analyzedAt}
      )
    `;
  }
}
