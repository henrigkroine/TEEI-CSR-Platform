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

/**
 * Fairness parity violation threshold
 * If accuracy gap exceeds this threshold, it's a fairness concern
 */
export const FAIRNESS_PARITY_THRESHOLD = 0.05; // 5% accuracy gap

/**
 * Parity violation detected between languages
 */
export interface ParityViolation {
  metric: 'accuracy' | 'f1';
  language1: Language;
  language2: Language;
  value1: number;
  value2: number;
  gap: number;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Fairness report across all languages
 */
export interface FairnessReport {
  overallParity: boolean;
  maxGap: number;
  violations: ParityViolation[];
  summary: string;
}

/**
 * Check fairness parity across languages
 * Detects if accuracy or F1 gaps exceed threshold
 *
 * @param evaluations - Map of language to evaluation results
 * @param threshold - Maximum acceptable gap (default 5%)
 * @returns Fairness report with violations
 */
export function checkFairnessParity(
  evaluations: Map<Language, LanguageEvaluation>,
  threshold: number = FAIRNESS_PARITY_THRESHOLD
): FairnessReport {
  const violations: ParityViolation[] = [];
  let maxGap = 0;

  const languages = Array.from(evaluations.keys());

  // Compare each pair of languages
  for (let i = 0; i < languages.length; i++) {
    for (let j = i + 1; j < languages.length; j++) {
      const lang1 = languages[i];
      const lang2 = languages[j];

      const eval1 = evaluations.get(lang1)!;
      const eval2 = evaluations.get(lang2)!;

      // Check accuracy gap
      const accuracyGap = Math.abs(eval1.overallAccuracy - eval2.overallAccuracy);
      if (accuracyGap > threshold) {
        const severity = accuracyGap > 0.15 ? 'high' : accuracyGap > 0.10 ? 'medium' : 'low';
        violations.push({
          metric: 'accuracy',
          language1: lang1,
          language2: lang2,
          value1: eval1.overallAccuracy,
          value2: eval2.overallAccuracy,
          gap: accuracyGap,
          severity
        });
        maxGap = Math.max(maxGap, accuracyGap);
      }

      // Check F1 gap
      const f1Gap = Math.abs(eval1.macroF1 - eval2.macroF1);
      if (f1Gap > threshold) {
        const severity = f1Gap > 0.15 ? 'high' : f1Gap > 0.10 ? 'medium' : 'low';
        violations.push({
          metric: 'f1',
          language1: lang1,
          language2: lang2,
          value1: eval1.macroF1,
          value2: eval2.macroF1,
          gap: f1Gap,
          severity
        });
        maxGap = Math.max(maxGap, f1Gap);
      }
    }
  }

  // Generate summary
  let summary = '';
  if (violations.length === 0) {
    summary = `✓ Fairness parity maintained. All language pairs within ${(threshold * 100).toFixed(0)}% threshold.`;
  } else {
    const highSeverity = violations.filter(v => v.severity === 'high').length;
    const mediumSeverity = violations.filter(v => v.severity === 'medium').length;
    summary = `⚠ Fairness violations detected: ${violations.length} total (${highSeverity} high, ${mediumSeverity} medium). Max gap: ${(maxGap * 100).toFixed(2)}%`;
  }

  return {
    overallParity: violations.length === 0,
    maxGap,
    violations,
    summary
  };
}

/**
 * Format fairness report as human-readable text
 */
export function formatFairnessReport(report: FairnessReport): string {
  const lines: string[] = [];

  lines.push('\n=== Fairness Parity Report ===');
  lines.push(report.summary);

  if (report.violations.length > 0) {
    lines.push('\n--- Violations ---');

    for (const violation of report.violations) {
      const v1 = (violation.value1 * 100).toFixed(2);
      const v2 = (violation.value2 * 100).toFixed(2);
      const gap = (violation.gap * 100).toFixed(2);

      lines.push(
        `\n[${violation.severity.toUpperCase()}] ${violation.language1} vs ${violation.language2} (${violation.metric})`
      );
      lines.push(`  ${violation.language1}: ${v1}%`);
      lines.push(`  ${violation.language2}: ${v2}%`);
      lines.push(`  Gap: ${gap}%`);
    }
  }

  lines.push('\n');

  return lines.join('\n');
}

/**
 * Per-locale performance report
 */
export interface LocalePerformanceReport {
  locale: Language;
  sampleCount: number;
  accuracy: number;
  macroF1: number;
  perLabelF1: Record<string, number>;
  strengths: string[]; // Labels with F1 > 0.8
  weaknesses: string[]; // Labels with F1 < 0.6
  dataQuality: {
    sufficientData: boolean;
    minSamplesNeeded: number;
    balanced: boolean;
  };
}

/**
 * Generate per-locale performance report with actionable insights
 *
 * @param evaluation - Language evaluation results
 * @param minSamples - Minimum samples for reliable evaluation (default 50)
 * @returns Detailed performance report for the locale
 */
export function generateLocaleReport(
  evaluation: LanguageEvaluation,
  minSamples: number = 50
): LocalePerformanceReport {
  // Extract per-label F1 scores
  const perLabelF1: Record<string, number> = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  for (const metric of evaluation.metrics) {
    perLabelF1[metric.label] = metric.f1;

    if (metric.f1 > 0.8) {
      strengths.push(metric.label);
    } else if (metric.f1 < 0.6) {
      weaknesses.push(metric.label);
    }
  }

  // Check data quality
  const sufficientData = evaluation.sampleCount >= minSamples;

  // Check if data is balanced (no label has < 10% of samples)
  const totalSupport = evaluation.metrics.reduce((sum, m) => sum + m.support, 0);
  const balanced = evaluation.metrics.every(m =>
    totalSupport === 0 || m.support / totalSupport >= 0.1
  );

  return {
    locale: evaluation.language,
    sampleCount: evaluation.sampleCount,
    accuracy: evaluation.overallAccuracy,
    macroF1: evaluation.macroF1,
    perLabelF1,
    strengths,
    weaknesses,
    dataQuality: {
      sufficientData,
      minSamplesNeeded: minSamples,
      balanced
    }
  };
}

/**
 * Format locale report as human-readable text
 */
export function formatLocaleReport(report: LocalePerformanceReport): string {
  const lines: string[] = [];

  lines.push(`\n=== Locale Performance Report: ${report.locale.toUpperCase()} ===`);
  lines.push(`Sample Count: ${report.sampleCount}`);
  lines.push(`Overall Accuracy: ${(report.accuracy * 100).toFixed(2)}%`);
  lines.push(`Macro F1 Score: ${(report.macroF1 * 100).toFixed(2)}%`);

  // Data quality
  lines.push('\n--- Data Quality ---');
  if (report.dataQuality.sufficientData) {
    lines.push('✓ Sufficient data for reliable evaluation');
  } else {
    const needed = report.dataQuality.minSamplesNeeded - report.sampleCount;
    lines.push(`⚠ Insufficient data: Need ${needed} more samples`);
  }

  if (report.dataQuality.balanced) {
    lines.push('✓ Balanced label distribution');
  } else {
    lines.push('⚠ Imbalanced labels: Some labels underrepresented');
  }

  // Strengths
  if (report.strengths.length > 0) {
    lines.push('\n--- Strengths (F1 > 80%) ---');
    for (const label of report.strengths) {
      const f1 = (report.perLabelF1[label] * 100).toFixed(2);
      lines.push(`  ✓ ${label}: ${f1}%`);
    }
  }

  // Weaknesses
  if (report.weaknesses.length > 0) {
    lines.push('\n--- Weaknesses (F1 < 60%) ---');
    for (const label of report.weaknesses) {
      const f1 = (report.perLabelF1[label] * 100).toFixed(2);
      lines.push(`  ✗ ${label}: ${f1}%`);
    }
  }

  // Recommendations
  lines.push('\n--- Recommendations ---');
  if (!report.dataQuality.sufficientData) {
    lines.push('• Collect more labeled samples for this locale');
  }
  if (!report.dataQuality.balanced) {
    lines.push('• Balance label distribution in training data');
  }
  if (report.weaknesses.length > 0) {
    lines.push(`• Focus on improving: ${report.weaknesses.join(', ')}`);
    lines.push('• Review model prompts and examples for weak labels');
  }
  if (report.macroF1 < 0.7) {
    lines.push('• Consider locale-specific prompt engineering');
    lines.push('• Add more locale-specific examples to few-shot prompts');
  }

  lines.push('\n');

  return lines.join('\n');
}

/**
 * Generate comprehensive multilingual evaluation report
 * Includes per-locale reports and fairness analysis
 *
 * @param dataset - Array of samples with ground truth and predictions
 * @returns Comprehensive report as formatted string
 */
export function generateComprehensiveReport(dataset: EvalSample[]): string {
  const lines: string[] = [];

  // Evaluate all languages
  const evaluations = evaluateAllLanguages(dataset);

  lines.push('========================================');
  lines.push('   MULTILINGUAL EVALUATION REPORT');
  lines.push('========================================');

  // Cross-language comparison
  lines.push(compareLanguages(evaluations));

  // Fairness parity check
  const fairnessReport = checkFairnessParity(evaluations);
  lines.push(formatFairnessReport(fairnessReport));

  // Per-locale detailed reports
  lines.push('\n========================================');
  lines.push('   PER-LOCALE DETAILED REPORTS');
  lines.push('========================================');

  for (const [language, evaluation] of evaluations) {
    const localeReport = generateLocaleReport(evaluation);
    lines.push(formatLocaleReport(localeReport));
  }

  // Overall recommendations
  lines.push('\n========================================');
  lines.push('   OVERALL RECOMMENDATIONS');
  lines.push('========================================\n');

  if (!fairnessReport.overallParity) {
    lines.push('⚠ FAIRNESS ISSUES DETECTED');
    lines.push('• Address performance gaps between languages');
    lines.push('• Consider locale-specific model calibration');
    lines.push('• Ensure training data is balanced across locales\n');
  }

  const locales = Array.from(evaluations.keys());
  const avgAccuracy = Array.from(evaluations.values())
    .reduce((sum, e) => sum + e.overallAccuracy, 0) / evaluations.size;

  if (avgAccuracy < 0.75) {
    lines.push('⚠ OVERALL ACCURACY BELOW TARGET (75%)');
    lines.push('• Review and improve model prompts');
    lines.push('• Add more diverse examples to training data');
    lines.push('• Consider fine-tuning or model upgrade\n');
  }

  // Check for missing locales
  const expectedLocales: Language[] = ['en', 'uk', 'no'];
  const missingLocales = expectedLocales.filter(l => !locales.includes(l));

  if (missingLocales.length > 0) {
    lines.push(`⚠ MISSING EVALUATION DATA FOR: ${missingLocales.join(', ')}`);
    lines.push('• Collect and label samples for these locales');
    lines.push('• Ensure coverage of all supported languages\n');
  }

  lines.push('========================================\n');

  return lines.join('\n');
}
