import {
  PredictionResult,
  LabelMetrics,
  ConfusionMatrix,
  EvaluationResults
} from './types.js';

/**
 * Calculate precision, recall, and F1 score for a specific label
 */
export function calculateLabelMetrics(
  predictions: PredictionResult[],
  targetLabel: string,
  allLabels: string[]
): LabelMetrics {
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;

  for (const pred of predictions) {
    const isTrue = pred.trueLabel === targetLabel;
    const isPredicted = pred.predictedLabel === targetLabel;

    if (isTrue && isPredicted) {
      truePositives++;
    } else if (!isTrue && isPredicted) {
      falsePositives++;
    } else if (isTrue && !isPredicted) {
      falseNegatives++;
    } else {
      trueNegatives++;
    }
  }

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;

  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0;

  const f1Score = precision + recall > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0;

  const support = predictions.filter(p => p.trueLabel === targetLabel).length;

  return {
    label: targetLabel,
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    precision,
    recall,
    f1Score,
    support
  };
}

/**
 * Build confusion matrix from predictions
 */
export function buildConfusionMatrix(
  predictions: PredictionResult[],
  labels: string[]
): ConfusionMatrix {
  const labelToIndex = new Map(labels.map((label, idx) => [label, idx]));
  const size = labels.length;
  const matrix: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));

  for (const pred of predictions) {
    const trueIdx = labelToIndex.get(pred.trueLabel);
    const predIdx = labelToIndex.get(pred.predictedLabel);

    if (trueIdx !== undefined && predIdx !== undefined) {
      matrix[trueIdx][predIdx]++;
    }
  }

  return {
    labels,
    matrix
  };
}

/**
 * Calculate overall evaluation metrics
 */
export function calculateEvaluationResults(
  predictions: PredictionResult[],
  totalCost: number
): EvaluationResults {
  // Get unique labels
  const uniqueLabels = new Set<string>();
  predictions.forEach(p => {
    uniqueLabels.add(p.trueLabel);
    uniqueLabels.add(p.predictedLabel);
  });
  const labels = Array.from(uniqueLabels).sort();

  // Calculate accuracy
  const correctPredictions = predictions.filter(
    p => p.trueLabel === p.predictedLabel && !p.error
  ).length;
  const accuracy = predictions.length > 0
    ? correctPredictions / predictions.length
    : 0;

  // Calculate per-label metrics
  const labelMetrics = labels.map(label =>
    calculateLabelMetrics(predictions, label, labels)
  );

  // Build confusion matrix
  const confusionMatrix = buildConfusionMatrix(predictions, labels);

  // Calculate average latency
  const validLatencies = predictions
    .filter(p => !p.error)
    .map(p => p.latencyMs);
  const averageLatencyMs = validLatencies.length > 0
    ? validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length
    : 0;

  return {
    accuracy,
    totalSamples: predictions.length,
    correctPredictions,
    labelMetrics,
    confusionMatrix,
    averageLatencyMs,
    totalCost,
    predictions
  };
}

/**
 * Format confusion matrix as a readable string
 */
export function formatConfusionMatrix(cm: ConfusionMatrix): string {
  const { labels, matrix } = cm;
  const maxLabelLength = Math.max(...labels.map(l => l.length), 10);
  const cellWidth = Math.max(maxLabelLength + 2, 8);

  let output = '\nConfusion Matrix:\n';
  output += ' '.repeat(maxLabelLength + 2);

  // Header row
  labels.forEach(label => {
    output += label.padEnd(cellWidth);
  });
  output += '\n';

  // Matrix rows
  matrix.forEach((row, idx) => {
    output += labels[idx].padEnd(maxLabelLength + 2);
    row.forEach(count => {
      output += count.toString().padEnd(cellWidth);
    });
    output += '\n';
  });

  return output;
}

/**
 * Format label metrics as a readable string
 */
export function formatLabelMetrics(metrics: LabelMetrics[]): string {
  let output = '\nPer-Label Metrics:\n';
  output += 'Label'.padEnd(25) +
    'Precision'.padEnd(12) +
    'Recall'.padEnd(12) +
    'F1-Score'.padEnd(12) +
    'Support'.padEnd(10) + '\n';
  output += '-'.repeat(71) + '\n';

  metrics.forEach(m => {
    output += m.label.padEnd(25) +
      m.precision.toFixed(3).padEnd(12) +
      m.recall.toFixed(3).padEnd(12) +
      m.f1Score.toFixed(3).padEnd(12) +
      m.support.toString().padEnd(10) + '\n';
  });

  return output;
}
