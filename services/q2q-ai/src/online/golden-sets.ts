/**
 * Golden Set Manager
 *
 * Manages golden datasets for model validation. Golden datasets contain
 * expert-labeled examples that serve as ground truth for evaluating model
 * accuracy, precision, recall, and F1 scores.
 *
 * Supports tenant-specific and locale-specific golden sets.
 */

import { Language } from '../inference/language_detection.js';
import { ClassificationOutput } from '../labels.js';
import { InferenceRequest, InferenceResult } from '../inference/types.js';

/**
 * A single golden example with ground truth label
 */
export interface GoldenExample {
  /** Unique ID for this example */
  id: string;
  /** Input text */
  text: string;
  /** Language of the text */
  language: Language;
  /** Ground truth classification */
  trueLabel: ClassificationOutput;
  /** Tenant ID (if tenant-specific) */
  tenantId?: string;
  /** Metadata (source, annotator, etc.) */
  metadata?: Record<string, any>;
}

/**
 * A golden dataset containing multiple examples
 */
export interface GoldenDataset {
  /** Dataset ID */
  id: string;
  /** Dataset name */
  name: string;
  /** Description */
  description?: string;
  /** Tenant ID (if tenant-specific) */
  tenantId?: string;
  /** Language (if language-specific) */
  language?: Language;
  /** Examples in this dataset */
  examples: GoldenExample[];
  /** Creation timestamp */
  createdAt: string;
  /** Created by */
  createdBy?: string;
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Model prediction on a golden example
 */
export interface GoldenPrediction {
  /** Example ID */
  exampleId: string;
  /** Predicted classification */
  predictedLabel: ClassificationOutput;
  /** Inference result metadata */
  result: InferenceResult;
  /** Timestamp */
  timestamp: string;
}

/**
 * Evaluation metrics for a dimension (binary classification)
 */
export interface DimensionMetrics {
  /** Dimension name (field in ClassificationOutput) */
  dimension: string;
  /** True positives */
  truePositives: number;
  /** False positives */
  falsePositives: number;
  /** True negatives */
  trueNegatives: number;
  /** False negatives */
  falseNegatives: number;
  /** Precision: TP / (TP + FP) */
  precision: number;
  /** Recall: TP / (TP + FN) */
  recall: number;
  /** F1 score: 2 * (precision * recall) / (precision + recall) */
  f1Score: number;
  /** Accuracy: (TP + TN) / Total */
  accuracy: number;
  /** Support: total positive examples */
  support: number;
}

/**
 * Overall evaluation result on a golden dataset
 */
export interface GoldenEvaluation {
  /** Evaluation ID */
  id: string;
  /** Dataset ID */
  datasetId: string;
  /** Model identifier */
  modelName: string;
  /** Timestamp */
  timestamp: string;
  /** Tenant ID (if tenant-specific) */
  tenantId?: string;
  /** Language (if language-specific) */
  language?: Language;
  /** Total examples evaluated */
  totalExamples: number;
  /** Overall accuracy (all dimensions) */
  overallAccuracy: number;
  /** Metrics per dimension */
  dimensionMetrics: DimensionMetrics[];
  /** Average F1 across dimensions */
  averageF1: number;
  /** Average precision across dimensions */
  averagePrecision: number;
  /** Average recall across dimensions */
  averageRecall: number;
  /** Individual predictions */
  predictions: GoldenPrediction[];
}

/**
 * Golden Set Manager
 *
 * Loads, manages, and evaluates models against golden datasets.
 */
export class GoldenSetManager {
  private datasets: Map<string, GoldenDataset> = new Map();
  private evaluations: GoldenEvaluation[] = [];

  /**
   * Load a golden dataset
   */
  loadDataset(dataset: GoldenDataset): void {
    this.datasets.set(dataset.id, dataset);
    console.info(
      `[GoldenSet] Loaded dataset "${dataset.name}" with ${dataset.examples.length} examples`
    );
  }

  /**
   * Load multiple datasets
   */
  loadDatasets(datasets: GoldenDataset[]): void {
    for (const dataset of datasets) {
      this.loadDataset(dataset);
    }
  }

  /**
   * Get a dataset by ID
   */
  getDataset(datasetId: string): GoldenDataset | undefined {
    return this.datasets.get(datasetId);
  }

  /**
   * Get all datasets
   */
  getAllDatasets(): GoldenDataset[] {
    return Array.from(this.datasets.values());
  }

  /**
   * Get datasets filtered by tenant
   */
  getDatasetsByTenant(tenantId: string): GoldenDataset[] {
    return Array.from(this.datasets.values()).filter(
      (ds) => ds.tenantId === tenantId
    );
  }

  /**
   * Get datasets filtered by language
   */
  getDatasetsByLanguage(language: Language): GoldenDataset[] {
    return Array.from(this.datasets.values()).filter(
      (ds) => ds.language === language
    );
  }

  /**
   * Get datasets filtered by both tenant and language
   */
  getDatasetsByTenantAndLanguage(
    tenantId: string,
    language: Language
  ): GoldenDataset[] {
    return Array.from(this.datasets.values()).filter(
      (ds) => ds.tenantId === tenantId && ds.language === language
    );
  }

  /**
   * Evaluate a model against a golden dataset
   *
   * @param datasetId - The dataset to evaluate against
   * @param modelName - Model identifier
   * @param inferFn - Function to run model inference
   * @returns Evaluation results
   */
  async evaluate(
    datasetId: string,
    modelName: string,
    inferFn: (request: InferenceRequest) => Promise<InferenceResult>
  ): Promise<GoldenEvaluation> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    console.info(
      `[GoldenSet] Starting evaluation of model "${modelName}" on dataset "${dataset.name}"`
    );

    const predictions: GoldenPrediction[] = [];

    // Run inference on all examples
    for (const example of dataset.examples) {
      try {
        const request: InferenceRequest = {
          text: example.text,
          correlationId: `golden_${example.id}`,
        };

        const result = await inferFn(request);

        predictions.push({
          exampleId: example.id,
          predictedLabel: result.classification,
          result,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error(
          `[GoldenSet] Failed to predict example ${example.id}:`,
          error.message
        );
      }
    }

    // Compute metrics
    const evaluation = this.computeMetrics(
      datasetId,
      modelName,
      dataset,
      predictions
    );

    // Store evaluation
    this.evaluations.push(evaluation);

    console.info(
      `[GoldenSet] Evaluation complete. Overall Accuracy: ${(evaluation.overallAccuracy * 100).toFixed(2)}%, Avg F1: ${evaluation.averageF1.toFixed(3)}`
    );

    return evaluation;
  }

  /**
   * Compute evaluation metrics from predictions
   */
  private computeMetrics(
    datasetId: string,
    modelName: string,
    dataset: GoldenDataset,
    predictions: GoldenPrediction[]
  ): GoldenEvaluation {
    const dimensionMetrics: DimensionMetrics[] = [];

    // Get all dimension fields from ClassificationOutput
    const dimensions = this.extractDimensions(dataset.examples[0]?.trueLabel);

    // Compute metrics for each dimension
    for (const dimension of dimensions) {
      const metrics = this.computeDimensionMetrics(
        dimension,
        dataset.examples,
        predictions
      );
      dimensionMetrics.push(metrics);
    }

    // Compute overall metrics
    const totalExamples = predictions.length;
    const overallAccuracy =
      dimensionMetrics.reduce((sum, m) => sum + m.accuracy, 0) /
      dimensionMetrics.length;
    const averageF1 =
      dimensionMetrics.reduce((sum, m) => sum + m.f1Score, 0) /
      dimensionMetrics.length;
    const averagePrecision =
      dimensionMetrics.reduce((sum, m) => sum + m.precision, 0) /
      dimensionMetrics.length;
    const averageRecall =
      dimensionMetrics.reduce((sum, m) => sum + m.recall, 0) /
      dimensionMetrics.length;

    return {
      id: this.generateId(),
      datasetId,
      modelName,
      timestamp: new Date().toISOString(),
      tenantId: dataset.tenantId,
      language: dataset.language,
      totalExamples,
      overallAccuracy,
      dimensionMetrics,
      averageF1,
      averagePrecision,
      averageRecall,
      predictions,
    };
  }

  /**
   * Extract dimension names from ClassificationOutput
   */
  private extractDimensions(label: ClassificationOutput | undefined): string[] {
    if (!label) return [];
    return Object.keys(label);
  }

  /**
   * Compute metrics for a single dimension
   */
  private computeDimensionMetrics(
    dimension: string,
    examples: GoldenExample[],
    predictions: GoldenPrediction[]
  ): DimensionMetrics {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    let support = 0;

    // Match examples with predictions
    for (const example of examples) {
      const prediction = predictions.find((p) => p.exampleId === example.id);
      if (!prediction) continue;

      const trueValue = this.getFieldValue(example.trueLabel, dimension);
      const predValue = this.getFieldValue(
        prediction.predictedLabel,
        dimension
      );

      // Convert to boolean if needed
      const truePositive = this.isPositive(trueValue);
      const predPositive = this.isPositive(predValue);

      if (truePositive) support++;

      // Compute confusion matrix values
      if (truePositive && predPositive) {
        truePositives++;
      } else if (!truePositive && predPositive) {
        falsePositives++;
      } else if (!truePositive && !predPositive) {
        trueNegatives++;
      } else if (truePositive && !predPositive) {
        falseNegatives++;
      }
    }

    // Compute metrics
    const precision =
      truePositives + falsePositives > 0
        ? truePositives / (truePositives + falsePositives)
        : 0;

    const recall =
      truePositives + falseNegatives > 0
        ? truePositives / (truePositives + falseNegatives)
        : 0;

    const f1Score =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const total = truePositives + falsePositives + trueNegatives + falseNegatives;
    const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;

    return {
      dimension,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      precision,
      recall,
      f1Score,
      accuracy,
      support,
    };
  }

  /**
   * Get field value from classification output
   */
  private getFieldValue(classification: ClassificationOutput, field: string): any {
    return (classification as any)[field];
  }

  /**
   * Determine if a value represents a positive class
   */
  private isPositive(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'string') {
      return value !== '' && value !== 'none';
    }
    return Boolean(value);
  }

  /**
   * Get all evaluations
   */
  getAllEvaluations(): GoldenEvaluation[] {
    return [...this.evaluations];
  }

  /**
   * Get evaluations for a specific model
   */
  getEvaluationsByModel(modelName: string): GoldenEvaluation[] {
    return this.evaluations.filter((e) => e.modelName === modelName);
  }

  /**
   * Get evaluations for a specific tenant
   */
  getEvaluationsByTenant(tenantId: string): GoldenEvaluation[] {
    return this.evaluations.filter((e) => e.tenantId === tenantId);
  }

  /**
   * Get most recent evaluation for a dataset
   */
  getLatestEvaluation(datasetId: string): GoldenEvaluation | undefined {
    const datasetEvals = this.evaluations
      .filter((e) => e.datasetId === datasetId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return datasetEvals[0];
  }

  /**
   * Compare two models on the same dataset
   */
  compareModels(
    datasetId: string,
    modelA: string,
    modelB: string
  ): ModelComparison | null {
    const evalA = this.evaluations
      .filter((e) => e.datasetId === datasetId && e.modelName === modelA)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    const evalB = this.evaluations
      .filter((e) => e.datasetId === datasetId && e.modelName === modelB)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    if (!evalA || !evalB) {
      return null;
    }

    return {
      datasetId,
      modelA,
      modelB,
      accuracyDelta: evalA.overallAccuracy - evalB.overallAccuracy,
      f1Delta: evalA.averageF1 - evalB.averageF1,
      precisionDelta: evalA.averagePrecision - evalB.averagePrecision,
      recallDelta: evalA.averageRecall - evalB.averageRecall,
      winner: evalA.averageF1 > evalB.averageF1 ? modelA : modelB,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `golden_eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.datasets.clear();
    this.evaluations = [];
  }
}

/**
 * Model comparison result
 */
export interface ModelComparison {
  datasetId: string;
  modelA: string;
  modelB: string;
  accuracyDelta: number;
  f1Delta: number;
  precisionDelta: number;
  recallDelta: number;
  winner: string;
}

/**
 * Create a golden set manager instance
 */
export function createGoldenSetManager(): GoldenSetManager {
  return new GoldenSetManager();
}

/**
 * Load golden dataset from JSON file
 */
export async function loadGoldenDatasetFromFile(
  filePath: string
): Promise<GoldenDataset> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as GoldenDataset;
}

/**
 * Format evaluation summary for reporting
 */
export function formatEvaluationSummary(eval_: GoldenEvaluation): string {
  const lines: string[] = [];

  lines.push('\n=== Golden Set Evaluation Summary ===');
  lines.push(`Model: ${eval_.modelName}`);
  lines.push(`Dataset: ${eval_.datasetId}`);
  if (eval_.tenantId) lines.push(`Tenant: ${eval_.tenantId}`);
  if (eval_.language) lines.push(`Language: ${eval_.language}`);
  lines.push(`Total Examples: ${eval_.totalExamples}`);
  lines.push(`Timestamp: ${eval_.timestamp}`);
  lines.push('');

  lines.push('Overall Metrics:');
  lines.push(`  Accuracy:  ${(eval_.overallAccuracy * 100).toFixed(2)}%`);
  lines.push(`  Precision: ${eval_.averagePrecision.toFixed(3)}`);
  lines.push(`  Recall:    ${eval_.averageRecall.toFixed(3)}`);
  lines.push(`  F1 Score:  ${eval_.averageF1.toFixed(3)}`);
  lines.push('');

  lines.push('Per-Dimension Metrics:');
  for (const metric of eval_.dimensionMetrics) {
    lines.push(`  ${metric.dimension}:`);
    lines.push(`    Precision: ${metric.precision.toFixed(3)}`);
    lines.push(`    Recall:    ${metric.recall.toFixed(3)}`);
    lines.push(`    F1 Score:  ${metric.f1Score.toFixed(3)}`);
    lines.push(`    Accuracy:  ${(metric.accuracy * 100).toFixed(2)}%`);
    lines.push(`    Support:   ${metric.support}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Format model comparison for reporting
 */
export function formatModelComparison(comparison: ModelComparison): string {
  const lines: string[] = [];

  lines.push('\n=== Model Comparison ===');
  lines.push(`Dataset: ${comparison.datasetId}`);
  lines.push(`Model A: ${comparison.modelA}`);
  lines.push(`Model B: ${comparison.modelB}`);
  lines.push('');

  lines.push('Deltas (A - B):');
  lines.push(
    `  Accuracy:  ${comparison.accuracyDelta > 0 ? '+' : ''}${(comparison.accuracyDelta * 100).toFixed(2)}%`
  );
  lines.push(
    `  Precision: ${comparison.precisionDelta > 0 ? '+' : ''}${comparison.precisionDelta.toFixed(3)}`
  );
  lines.push(
    `  Recall:    ${comparison.recallDelta > 0 ? '+' : ''}${comparison.recallDelta.toFixed(3)}`
  );
  lines.push(
    `  F1 Score:  ${comparison.f1Delta > 0 ? '+' : ''}${comparison.f1Delta.toFixed(3)}`
  );
  lines.push('');

  lines.push(`Winner: ${comparison.winner} (based on F1 score)`);
  lines.push('');

  return lines.join('\n');
}
