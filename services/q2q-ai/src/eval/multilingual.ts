import { Language } from '../inference/language_detection.js';

/**
 * Label types for evaluation
 */
export type LabelType =
  | 'confidence_increase'
  | 'confidence_decrease'
  | 'belonging_increase'
  | 'belonging_decrease'
  | 'language_comfort'
  | 'employability_signals'
  | 'risk_cues';

/**
 * Confusion matrix for binary classification
 */
export interface ConfusionMatrix {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
}

/**
 * Performance metrics for a label
 */
export interface LabelMetrics {
  label: LabelType;
  precision: number;
  recall: number;
  f1: number;
  support: number; // Number of samples with this label
  confusionMatrix: ConfusionMatrix;
}

/**
 * Evaluation results per language
 */
export interface LanguageEvaluation {
  language: Language;
  sampleCount: number;
  metrics: LabelMetrics[];
  overallAccuracy: number;
  macroF1: number; // Average F1 across all labels
}

/**
 * Sample for evaluation with ground truth
 */
export interface EvalSample {
  text: string;
  groundTruth: Record<string, any>;
  prediction: Record<string, any>;
  language: Language;
}

/**
 * Calculate confusion matrix for binary prediction
 */
function calculateConfusionMatrix(
  groundTruth: boolean[],
  predictions: boolean[]
): ConfusionMatrix {
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (let i = 0; i < groundTruth.length; i++) {
    const gt = groundTruth[i];
    const pred = predictions[i];

    if (gt && pred) truePositive++;
    else if (!gt && !pred) trueNegative++;
    else if (!gt && pred) falsePositive++;
    else if (gt && !pred) falseNegative++;
  }

  return { truePositive, trueNegative, falsePositive, falseNegative };
}

/**
 * Calculate precision, recall, and F1 from confusion matrix
 */
function calculateMetrics(cm: ConfusionMatrix): {
  precision: number;
  recall: number;
  f1: number;
} {
  const { truePositive, falsePositive, falseNegative } = cm;

  // Precision = TP / (TP + FP)
  const precision =
    truePositive + falsePositive > 0
      ? truePositive / (truePositive + falsePositive)
      : 0;

  // Recall = TP / (TP + FN)
  const recall =
    truePositive + falseNegative > 0
      ? truePositive / (truePositive + falseNegative)
      : 0;

  // F1 = 2 * (precision * recall) / (precision + recall)
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return { precision, recall, f1 };
}

/**
 * Evaluate per-language performance
 *
 * @param dataset - Array of samples with ground truth and predictions
 * @param language - Language to evaluate
 * @returns Language evaluation results with per-label metrics
 */
export function evaluatePerLanguage(
  dataset: EvalSample[],
  language: Language
): LanguageEvaluation {
  // Filter samples for this language
  const languageSamples = dataset.filter((s) => s.language === language);

  if (languageSamples.length === 0) {
    throw new Error(`No samples found for language: ${language}`);
  }

  const labels: LabelType[] = [
    'confidence_increase',
    'confidence_decrease',
    'belonging_increase',
    'belonging_decrease',
  ];

  const labelMetrics: LabelMetrics[] = [];

  // Calculate metrics for each label
  for (const label of labels) {
    const groundTruth = languageSamples.map((s) => s.groundTruth[label] || false);
    const predictions = languageSamples.map((s) => s.prediction[label] || false);

    const confusionMatrix = calculateConfusionMatrix(groundTruth, predictions);
    const metrics = calculateMetrics(confusionMatrix);

    // Support = number of positive samples in ground truth
    const support = groundTruth.filter(Boolean).length;

    labelMetrics.push({
      label,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      support,
      confusionMatrix,
    });
  }

  // Calculate overall accuracy
  let correctPredictions = 0;
  let totalPredictions = 0;

  for (const sample of languageSamples) {
    for (const label of labels) {
      const gt = sample.groundTruth[label] || false;
      const pred = sample.prediction[label] || false;
      if (gt === pred) correctPredictions++;
      totalPredictions++;
    }
  }

  const overallAccuracy = correctPredictions / totalPredictions;

  // Calculate macro F1 (average F1 across all labels)
  const macroF1 =
    labelMetrics.reduce((sum, m) => sum + m.f1, 0) / labelMetrics.length;

  return {
    language,
    sampleCount: languageSamples.length,
    metrics: labelMetrics,
    overallAccuracy,
    macroF1,
  };
}

/**
 * Evaluate all languages in the dataset
 *
 * @param dataset - Array of samples with ground truth and predictions
 * @returns Map of language to evaluation results
 */
export function evaluateAllLanguages(
  dataset: EvalSample[]
): Map<Language, LanguageEvaluation> {
  const languages = [...new Set(dataset.map((s) => s.language))];
  const results = new Map<Language, LanguageEvaluation>();

  for (const language of languages) {
    try {
      const evaluation = evaluatePerLanguage(dataset, language);
      results.set(language, evaluation);
    } catch (error: any) {
      console.error(`Failed to evaluate language ${language}:`, error.message);
    }
  }

  return results;
}

/**
 * Format evaluation results as a human-readable report
 */
export function formatEvaluationReport(evaluation: LanguageEvaluation): string {
  const lines: string[] = [];

  lines.push(`\n=== Evaluation Report: ${evaluation.language.toUpperCase()} ===`);
  lines.push(`Sample Count: ${evaluation.sampleCount}`);
  lines.push(`Overall Accuracy: ${(evaluation.overallAccuracy * 100).toFixed(2)}%`);
  lines.push(`Macro F1 Score: ${(evaluation.macroF1 * 100).toFixed(2)}%`);
  lines.push('\n--- Per-Label Metrics ---');

  for (const metric of evaluation.metrics) {
    lines.push(`\n${metric.label}:`);
    lines.push(`  Precision: ${(metric.precision * 100).toFixed(2)}%`);
    lines.push(`  Recall:    ${(metric.recall * 100).toFixed(2)}%`);
    lines.push(`  F1 Score:  ${(metric.f1 * 100).toFixed(2)}%`);
    lines.push(`  Support:   ${metric.support} samples`);
    lines.push(`  Confusion Matrix:`);
    lines.push(`    TP: ${metric.confusionMatrix.truePositive}, TN: ${metric.confusionMatrix.trueNegative}`);
    lines.push(`    FP: ${metric.confusionMatrix.falsePositive}, FN: ${metric.confusionMatrix.falseNegative}`);
  }

  lines.push('\n');

  return lines.join('\n');
}

/**
 * Compare evaluations across languages
 */
export function compareLanguages(
  evaluations: Map<Language, LanguageEvaluation>
): string {
  const lines: string[] = [];

  lines.push('\n=== Cross-Language Comparison ===\n');
  lines.push('Language | Samples | Accuracy | Macro F1');
  lines.push('---------|---------|----------|----------');

  for (const [language, evaluation] of evaluations) {
    const accuracy = (evaluation.overallAccuracy * 100).toFixed(2);
    const macroF1 = (evaluation.macroF1 * 100).toFixed(2);
    lines.push(
      `${language.padEnd(8)} | ${evaluation.sampleCount.toString().padEnd(7)} | ${accuracy.padEnd(8)}% | ${macroF1.padEnd(8)}%`
    );
  }

  lines.push('\n');

  return lines.join('\n');
}
