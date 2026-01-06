/**
 * Threshold Optimizer
 * Optimizes classification thresholds for Q2Q outcome dimensions
 *
 * Uses ROC curve analysis and multiple optimization strategies:
 * 1. Youden's J Statistic: Maximizes (Sensitivity + Specificity - 1)
 * 2. F1 Maximization: Finds threshold that maximizes F1 score
 * 3. Custom: Allows custom optimization metric
 */

import type { Q2QThresholds } from '@teei/model-registry';

/**
 * Prediction with score for a single outcome dimension
 */
export interface DimensionPrediction {
  sampleId: string;
  score: number;      // Raw prediction score (0-1)
  trueLabel: boolean; // Ground truth: positive (true) or negative (false)
}

/**
 * ROC curve point
 */
export interface ROCPoint {
  threshold: number;
  truePositiveRate: number;   // Sensitivity / Recall
  falsePositiveRate: number;
  trueNegativeRate: number;   // Specificity
  falseNegativeRate: number;
  precision: number;
  recall: number;
  f1Score: number;
  youdensJ: number;  // TPR + TNR - 1
}

/**
 * ROC curve analysis result
 */
export interface ROCCurve {
  dimension: string;
  points: ROCPoint[];
  auc: number;  // Area Under Curve
}

/**
 * Optimization strategy
 */
export type OptimizationStrategy = 'youdens_j' | 'f1_score' | 'precision' | 'recall';

/**
 * Threshold optimization result for a single dimension
 */
export interface ThresholdOptimizationResult {
  dimension: string;
  optimalThreshold: number;
  metrics: {
    precision: number;
    recall: number;
    f1Score: number;
    youdensJ: number;
    truePositiveRate: number;
    trueNegativeRate: number;
    accuracy: number;
  };
  rocCurve: ROCCurve;
}

/**
 * Complete threshold optimization result for all dimensions
 */
export interface ThresholdsOptimizationResult {
  tenantId: string;
  optimizedThresholds: Q2QThresholds;
  dimensionResults: Map<keyof Q2QThresholds, ThresholdOptimizationResult>;
  strategy: OptimizationStrategy;
  overallMetrics: {
    averageF1: number;
    averageAccuracy: number;
    averageAUC: number;
  };
}

/**
 * Calculate confusion matrix metrics at a given threshold
 */
function calculateMetricsAtThreshold(
  predictions: DimensionPrediction[],
  threshold: number
): {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  f1Score: number;
  tpr: number;
  fpr: number;
  tnr: number;
  fnr: number;
  youdensJ: number;
  accuracy: number;
} {
  let tp = 0; // True Positives
  let fp = 0; // False Positives
  let tn = 0; // True Negatives
  let fn = 0; // False Negatives

  for (const pred of predictions) {
    const predicted = pred.score >= threshold;
    const actual = pred.trueLabel;

    if (predicted && actual) tp++;
    else if (predicted && !actual) fp++;
    else if (!predicted && !actual) tn++;
    else if (!predicted && actual) fn++;
  }

  const total = tp + fp + tn + fn;
  const tpr = tp + fn > 0 ? tp / (tp + fn) : 0; // True Positive Rate (Sensitivity/Recall)
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0; // False Positive Rate
  const tnr = fp + tn > 0 ? tn / (fp + tn) : 0; // True Negative Rate (Specificity)
  const fnr = tp + fn > 0 ? fn / (tp + fn) : 0; // False Negative Rate

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tpr;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  const youdensJ = tpr + tnr - 1;
  const accuracy = total > 0 ? (tp + tn) / total : 0;

  return {
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    f1Score,
    tpr,
    fpr,
    tnr,
    fnr,
    youdensJ,
    accuracy,
  };
}

/**
 * Compute ROC curve for a dimension
 *
 * @param predictions - Predictions with scores and ground truth labels
 * @param numPoints - Number of threshold points to evaluate (default: 100)
 * @returns ROC curve with points and AUC
 */
export function computeROCCurve(
  dimension: string,
  predictions: DimensionPrediction[],
  numPoints: number = 100
): ROCCurve {
  const points: ROCPoint[] = [];

  // Sort predictions by score to get unique thresholds
  const sortedPredictions = [...predictions].sort((a, b) => b.score - a.score);

  // Generate thresholds from 0 to 1
  const thresholds: number[] = [];
  for (let i = 0; i <= numPoints; i++) {
    thresholds.push(i / numPoints);
  }

  // Calculate metrics for each threshold
  for (const threshold of thresholds) {
    const metrics = calculateMetricsAtThreshold(predictions, threshold);

    points.push({
      threshold,
      truePositiveRate: metrics.tpr,
      falsePositiveRate: metrics.fpr,
      trueNegativeRate: metrics.tnr,
      falseNegativeRate: metrics.fnr,
      precision: metrics.precision,
      recall: metrics.recall,
      f1Score: metrics.f1Score,
      youdensJ: metrics.youdensJ,
    });
  }

  // Calculate AUC using trapezoidal rule
  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const width = points[i - 1].falsePositiveRate - points[i].falsePositiveRate;
    const height = (points[i - 1].truePositiveRate + points[i].truePositiveRate) / 2;
    auc += width * height;
  }

  return {
    dimension,
    points,
    auc: Math.max(0, Math.min(1, auc)), // Clamp to [0, 1]
  };
}

/**
 * Find optimal threshold based on optimization strategy
 *
 * @param rocCurve - ROC curve for the dimension
 * @param strategy - Optimization strategy
 * @returns Optimal ROC point
 */
export function findOptimalThreshold(
  rocCurve: ROCCurve,
  strategy: OptimizationStrategy
): ROCPoint {
  let bestPoint = rocCurve.points[0];
  let bestScore = -Infinity;

  for (const point of rocCurve.points) {
    let score: number;

    switch (strategy) {
      case 'youdens_j':
        score = point.youdensJ;
        break;
      case 'f1_score':
        score = point.f1Score;
        break;
      case 'precision':
        score = point.precision;
        break;
      case 'recall':
        score = point.recall;
        break;
      default:
        score = point.youdensJ; // Default to Youden's J
    }

    if (score > bestScore) {
      bestScore = score;
      bestPoint = point;
    }
  }

  return bestPoint;
}

/**
 * Optimize threshold for a single outcome dimension
 *
 * @param dimension - Dimension name
 * @param predictions - Predictions with scores and ground truth
 * @param strategy - Optimization strategy
 * @returns Threshold optimization result
 *
 * @example
 * ```typescript
 * const result = optimizeDimensionThreshold(
 *   'confidence',
 *   predictions,
 *   'youdens_j'
 * );
 * console.log(`Optimal threshold: ${result.optimalThreshold}`);
 * console.log(`F1 Score: ${result.metrics.f1Score}`);
 * ```
 */
export function optimizeDimensionThreshold(
  dimension: string,
  predictions: DimensionPrediction[],
  strategy: OptimizationStrategy = 'youdens_j'
): ThresholdOptimizationResult {
  // Compute ROC curve
  const rocCurve = computeROCCurve(dimension, predictions);

  // Find optimal threshold
  const optimalPoint = findOptimalThreshold(rocCurve, strategy);

  // Calculate final metrics at optimal threshold
  const finalMetrics = calculateMetricsAtThreshold(predictions, optimalPoint.threshold);

  return {
    dimension,
    optimalThreshold: optimalPoint.threshold,
    metrics: {
      precision: finalMetrics.precision,
      recall: finalMetrics.recall,
      f1Score: finalMetrics.f1Score,
      youdensJ: finalMetrics.youdensJ,
      truePositiveRate: finalMetrics.tpr,
      trueNegativeRate: finalMetrics.tnr,
      accuracy: finalMetrics.accuracy,
    },
    rocCurve,
  };
}

/**
 * Optimize thresholds for all Q2Q outcome dimensions
 *
 * @param tenantId - Tenant identifier
 * @param predictionsByDimension - Map of dimension name to predictions
 * @param strategy - Optimization strategy (default: 'youdens_j')
 * @returns Complete threshold optimization result
 *
 * @example
 * ```typescript
 * const result = await optimizeThresholds(
 *   'acme-corp',
 *   {
 *     confidence: confidencePredictions,
 *     belonging: belongingPredictions,
 *     language_proficiency: languagePredictions,
 *     job_readiness: jobPredictions,
 *     wellbeing: wellbeingPredictions,
 *   },
 *   'f1_score'
 * );
 *
 * // Save to model registry
 * registry.save({
 *   tenantId: 'acme-corp',
 *   version: '1.0.0',
 *   q2q: {
 *     thresholds: result.optimizedThresholds,
 *   },
 * });
 * ```
 */
export function optimizeThresholds(
  tenantId: string,
  predictionsByDimension: {
    confidence: DimensionPrediction[];
    belonging: DimensionPrediction[];
    language_proficiency: DimensionPrediction[];
    job_readiness: DimensionPrediction[];
    wellbeing: DimensionPrediction[];
  },
  strategy: OptimizationStrategy = 'youdens_j'
): ThresholdsOptimizationResult {
  const dimensionResults = new Map<keyof Q2QThresholds, ThresholdOptimizationResult>();

  // Optimize each dimension
  for (const [dimension, predictions] of Object.entries(predictionsByDimension)) {
    if (predictions.length === 0) {
      throw new Error(`No predictions provided for dimension: ${dimension}`);
    }

    const result = optimizeDimensionThreshold(dimension, predictions, strategy);
    dimensionResults.set(dimension as keyof Q2QThresholds, result);
  }

  // Build optimized thresholds
  const optimizedThresholds: Q2QThresholds = {
    confidence: dimensionResults.get('confidence')!.optimalThreshold,
    belonging: dimensionResults.get('belonging')!.optimalThreshold,
    language_proficiency: dimensionResults.get('language_proficiency')!.optimalThreshold,
    job_readiness: dimensionResults.get('job_readiness')!.optimalThreshold,
    wellbeing: dimensionResults.get('wellbeing')!.optimalThreshold,
  };

  // Calculate overall metrics
  let totalF1 = 0;
  let totalAccuracy = 0;
  let totalAUC = 0;

  for (const result of dimensionResults.values()) {
    totalF1 += result.metrics.f1Score;
    totalAccuracy += result.metrics.accuracy;
    totalAUC += result.rocCurve.auc;
  }

  const numDimensions = dimensionResults.size;

  return {
    tenantId,
    optimizedThresholds,
    dimensionResults,
    strategy,
    overallMetrics: {
      averageF1: totalF1 / numDimensions,
      averageAccuracy: totalAccuracy / numDimensions,
      averageAUC: totalAUC / numDimensions,
    },
  };
}

/**
 * Export ROC curve data for visualization
 *
 * @param rocCurve - ROC curve
 * @returns Data formatted for plotting
 */
export function exportROCCurveData(rocCurve: ROCCurve): {
  dimension: string;
  auc: number;
  points: Array<{ fpr: number; tpr: number; threshold: number }>;
} {
  return {
    dimension: rocCurve.dimension,
    auc: rocCurve.auc,
    points: rocCurve.points.map(p => ({
      fpr: p.falsePositiveRate,
      tpr: p.truePositiveRate,
      threshold: p.threshold,
    })),
  };
}

/**
 * Compare threshold performance across different strategies
 *
 * @param dimension - Dimension name
 * @param predictions - Predictions with scores
 * @returns Comparison of all strategies
 */
export function compareStrategies(
  dimension: string,
  predictions: DimensionPrediction[]
): Map<OptimizationStrategy, ThresholdOptimizationResult> {
  const strategies: OptimizationStrategy[] = ['youdens_j', 'f1_score', 'precision', 'recall'];
  const results = new Map<OptimizationStrategy, ThresholdOptimizationResult>();

  for (const strategy of strategies) {
    results.set(strategy, optimizeDimensionThreshold(dimension, predictions, strategy));
  }

  return results;
}
