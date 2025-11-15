/**
 * Canary Compare - q2q-canary-analyst
 * Compare q2q-v2.x vs v3.x performance in production
 */

import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import postgres from 'postgres';

const logger = createServiceLogger('canary-compare');

/**
 * Canary Comparison Result
 */
export const CanaryComparisonSchema = z.object({
  id: z.string(),
  baselineVersion: z.string(), // e.g., "v2.1.0"
  canaryVersion: z.string(), // e.g., "v3.0.0"
  comparedAt: z.string(),
  trafficSplit: z.object({
    baseline: z.number(), // Percentage
    canary: z.number(), // Percentage
  }),
  sampleSize: z.object({
    baseline: z.number(),
    canary: z.number(),
  }),
  metrics: z.object({
    baseline: z.object({
      accuracy: z.number(),
      avgConfidence: z.number(),
      p95Latency: z.number(), // ms
      errorRate: z.number(),
    }),
    canary: z.object({
      accuracy: z.number(),
      avgConfidence: z.number(),
      p95Latency: z.number(),
      errorRate: z.number(),
    }),
    delta: z.object({
      accuracy: z.number(), // Positive = canary better
      avgConfidence: z.number(),
      p95Latency: z.number(), // Negative = canary faster
      errorRate: z.number(), // Negative = canary fewer errors
    }),
  }),
  recommendation: z.enum(['promote_canary', 'keep_baseline', 'continue_testing']),
  confidence: z.number(), // Statistical confidence in recommendation
});

export type CanaryComparison = z.infer<typeof CanaryComparisonSchema>;

export class CanaryService {
  private db: postgres.Sql;

  constructor() {
    this.db = postgres(process.env.DATABASE_URL!);
  }

  /**
   * Compare baseline and canary versions
   */
  async compareVersions(options: {
    baselineVersion: string;
    canaryVersion: string;
    timeWindowHours?: number;
    minSampleSize?: number;
  }): Promise<CanaryComparison> {
    const { baselineVersion, canaryVersion, timeWindowHours = 24, minSampleSize = 100 } = options;

    logger.info({ baselineVersion, canaryVersion, timeWindowHours }, 'Comparing canary versions');

    const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();

    // Get baseline metrics
    const baselineMetrics = await this.getVersionMetrics(baselineVersion, startTime, endTime);

    // Get canary metrics
    const canaryMetrics = await this.getVersionMetrics(canaryVersion, startTime, endTime);

    // Check sample size
    if (baselineMetrics.sampleSize < minSampleSize || canaryMetrics.sampleSize < minSampleSize) {
      logger.warn(
        {
          baselineSampleSize: baselineMetrics.sampleSize,
          canarySampleSize: canaryMetrics.sampleSize,
          minSampleSize,
        },
        'Insufficient sample size for comparison'
      );
    }

    // Calculate deltas
    const delta = {
      accuracy: canaryMetrics.accuracy - baselineMetrics.accuracy,
      avgConfidence: canaryMetrics.avgConfidence - baselineMetrics.avgConfidence,
      p95Latency: canaryMetrics.p95Latency - baselineMetrics.p95Latency,
      errorRate: canaryMetrics.errorRate - baselineMetrics.errorRate,
    };

    // Make recommendation
    const { recommendation, confidence } = this.makeRecommendation(delta, baselineMetrics, canaryMetrics);

    // Get traffic split
    const trafficSplit = await this.getTrafficSplit(baselineVersion, canaryVersion);

    const comparison: CanaryComparison = {
      id: `canary_${Date.now()}`,
      baselineVersion,
      canaryVersion,
      comparedAt: new Date().toISOString(),
      trafficSplit,
      sampleSize: {
        baseline: baselineMetrics.sampleSize,
        canary: canaryMetrics.sampleSize,
      },
      metrics: {
        baseline: baselineMetrics,
        canary: canaryMetrics,
        delta,
      },
      recommendation,
      confidence,
    };

    // Store comparison
    await this.storeComparison(comparison);

    logger.info({ comparison }, 'Canary comparison complete');

    return comparison;
  }

  /**
   * Get metrics for a specific model version
   */
  private async getVersionMetrics(
    version: string,
    startDate: string,
    endDate: string
  ): Promise<{
    accuracy: number;
    avgConfidence: number;
    p95Latency: number;
    errorRate: number;
    sampleSize: number;
  }> {
    // Get predictions
    const predictions = await this.db`
      SELECT
        predicted_outcomes,
        actual_outcomes,
        confidence,
        latency_ms,
        error
      FROM q2q_predictions
      WHERE model_version = ${version}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
    `;

    if (predictions.length === 0) {
      return {
        accuracy: 0,
        avgConfidence: 0,
        p95Latency: 0,
        errorRate: 0,
        sampleSize: 0,
      };
    }

    // Calculate accuracy (only for predictions with ground truth)
    const withGroundTruth = predictions.filter((p: any) => p.actual_outcomes !== null);
    let correctCount = 0;
    for (const pred of withGroundTruth) {
      const topPredicted = this.getTopOutcome(pred.predicted_outcomes);
      const topActual = this.getTopOutcome(pred.actual_outcomes);
      if (topPredicted === topActual) {
        correctCount++;
      }
    }

    const accuracy = withGroundTruth.length > 0 ? correctCount / withGroundTruth.length : 0;

    // Calculate average confidence
    const totalConfidence = predictions.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0);
    const avgConfidence = totalConfidence / predictions.length;

    // Calculate p95 latency
    const latencies = predictions.map((p: any) => p.latency_ms || 0).sort((a: number, b: number) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || 0;

    // Calculate error rate
    const errorCount = predictions.filter((p: any) => p.error !== null).length;
    const errorRate = errorCount / predictions.length;

    return {
      accuracy,
      avgConfidence,
      p95Latency,
      errorRate,
      sampleSize: predictions.length,
    };
  }

  /**
   * Make recommendation based on deltas
   */
  private makeRecommendation(
    delta: {
      accuracy: number;
      avgConfidence: number;
      p95Latency: number;
      errorRate: number;
    },
    baseline: any,
    canary: any
  ): { recommendation: CanaryComparison['recommendation']; confidence: number } {
    // Decision criteria
    const ACCURACY_THRESHOLD = 0.02; // 2% improvement
    const LATENCY_THRESHOLD = 100; // 100ms
    const ERROR_RATE_THRESHOLD = 0.01; // 1%

    let score = 0;
    let confidence = 0;

    // Accuracy
    if (delta.accuracy > ACCURACY_THRESHOLD) {
      score += 3; // Strong positive
      confidence += 0.3;
    } else if (delta.accuracy > 0) {
      score += 1; // Weak positive
      confidence += 0.1;
    } else if (delta.accuracy < -ACCURACY_THRESHOLD) {
      score -= 3; // Strong negative
      confidence += 0.3;
    }

    // Confidence
    if (delta.avgConfidence > 0.05) {
      score += 2;
      confidence += 0.2;
    } else if (delta.avgConfidence < -0.05) {
      score -= 2;
      confidence += 0.2;
    }

    // Latency (negative delta is good)
    if (delta.p95Latency < -LATENCY_THRESHOLD) {
      score += 2;
      confidence += 0.2;
    } else if (delta.p95Latency > LATENCY_THRESHOLD) {
      score -= 1;
      confidence += 0.1;
    }

    // Error rate (negative delta is good)
    if (delta.errorRate < -ERROR_RATE_THRESHOLD) {
      score += 2;
      confidence += 0.2;
    } else if (delta.errorRate > ERROR_RATE_THRESHOLD) {
      score -= 3;
      confidence += 0.3;
    }

    // Sample size affects confidence
    const minSampleSize = Math.min(baseline.sampleSize, canary.sampleSize);
    if (minSampleSize < 100) {
      confidence *= 0.5; // Low confidence with small samples
    } else if (minSampleSize < 500) {
      confidence *= 0.8;
    }

    // Make recommendation
    let recommendation: CanaryComparison['recommendation'];

    if (score >= 4 && confidence > 0.7) {
      recommendation = 'promote_canary';
    } else if (score <= -3) {
      recommendation = 'keep_baseline';
    } else {
      recommendation = 'continue_testing';
    }

    return { recommendation, confidence: Math.min(confidence, 1.0) };
  }

  /**
   * Get top outcome
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
   * Get current traffic split
   */
  private async getTrafficSplit(
    baseline: string,
    canary: string
  ): Promise<{ baseline: number; canary: number }> {
    // Query recent predictions to determine traffic split
    const recentPredictions = await this.db`
      SELECT model_version, COUNT(*) as count
      FROM q2q_predictions
      WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND model_version IN (${baseline}, ${canary})
      GROUP BY model_version
    `;

    const baselineCount = recentPredictions.find((r: any) => r.model_version === baseline)?.count || 0;
    const canaryCount = recentPredictions.find((r: any) => r.model_version === canary)?.count || 0;
    const total = baselineCount + canaryCount;

    if (total === 0) {
      return { baseline: 100, canary: 0 };
    }

    return {
      baseline: Math.round((baselineCount / total) * 100),
      canary: Math.round((canaryCount / total) * 100),
    };
  }

  /**
   * Store comparison result
   */
  private async storeComparison(comparison: CanaryComparison): Promise<void> {
    await this.db`
      INSERT INTO canary_comparisons (
        id, baseline_version, canary_version, compared_at, traffic_split,
        sample_size, metrics, recommendation, confidence
      ) VALUES (
        ${comparison.id}, ${comparison.baselineVersion}, ${comparison.canaryVersion},
        ${comparison.comparedAt}, ${JSON.stringify(comparison.trafficSplit)},
        ${JSON.stringify(comparison.sampleSize)}, ${JSON.stringify(comparison.metrics)},
        ${comparison.recommendation}, ${comparison.confidence}
      )
    `;
  }
}
