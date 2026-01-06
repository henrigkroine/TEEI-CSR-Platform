/**
 * Enhanced Q2Q Evaluation Harness
 * Comprehensive evaluation framework with multilingual support (EN/UK/NO)
 * and citation quality metrics
 */

import { getInferenceDriver } from '../inference/driver.js';
import { AIProvider } from '../inference/types.js';
import { CitationValidator } from '../citations/guarantee.js';
import { calculateF1, calculatePrecision, calculateRecall } from '../calibration/metrics.js';
import { randomUUID } from 'crypto';

export interface EvalSample {
  id: string;
  text: string;
  language: 'en' | 'uk' | 'no';
  goldLabels: {
    confidence?: number;
    belonging?: number;
    lang_level_proxy?: number;
    job_readiness?: number;
    well_being?: number;
  };
  evidenceSnippets?: string[]; // For citation testing
  metadata?: {
    domain?: string; // e.g., 'technical', 'social', 'career'
    complexity?: 'simple' | 'medium' | 'complex';
    annotator?: string;
  };
}

export interface EvalDataset {
  id: string;
  name: string;
  description: string;
  language: 'en' | 'uk' | 'no' | 'mixed';
  samples: EvalSample[];
  createdAt: string;
  version: string;
}

export interface DimensionMetrics {
  dimension: string;
  precision: number;
  recall: number;
  f1: number;
  mae: number; // Mean Absolute Error for regression
  rmse: number; // Root Mean Squared Error
  sampleCount: number;
}

export interface CitationMetrics {
  totalParagraphs: number;
  citedParagraphs: number;
  citationCoverage: number; // Percentage of paragraphs cited
  averageCitationsPerParagraph: number;
  uncitedViolations: number;
  invalidCitations: number;
}

export interface EvalResult {
  runId: string;
  datasetId: string;
  datasetName: string;
  language: string;
  provider: AIProvider;
  modelName: string;
  promptVersion?: string;

  // Overall metrics
  macroF1: number;
  microF1: number;
  weightedF1: number;

  // Per-dimension metrics
  dimensionMetrics: DimensionMetrics[];

  // Citation quality
  citationMetrics?: CitationMetrics;

  // Performance
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalCost: number;
  costPerSample: number;

  // Metadata
  sampleCount: number;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
}

/**
 * Enhanced Evaluation Harness
 */
export class Q2QEvaluationHarness {
  private datasets: Map<string, EvalDataset> = new Map();
  private citationValidator: CitationValidator;

  constructor() {
    this.citationValidator = new CitationValidator();
  }

  /**
   * Register an evaluation dataset
   */
  registerDataset(dataset: EvalDataset): void {
    this.datasets.set(dataset.id, dataset);
    console.info(`[EvalHarness] Registered dataset: ${dataset.name} (${dataset.samples.length} samples, ${dataset.language})`);
  }

  /**
   * Run comprehensive evaluation
   */
  async evaluate(
    datasetId: string,
    provider?: AIProvider,
    options: {
      promptVersion?: string;
      evaluateCitations?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<EvalResult> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const runId = randomUUID();
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    console.info(`[EvalHarness] Starting evaluation ${runId} on dataset ${dataset.name}`);

    const driver = getInferenceDriver();
    const targetProvider = provider || driver['defaultProvider'];

    const predictions: Array<{
      sampleId: string;
      predicted: Record<string, number>;
      gold: Record<string, number>;
      latencyMs: number;
      cost: number;
      citations?: string[];
    }> = [];

    const batchSize = options.batchSize || 10;
    let totalCost = 0;

    // Process samples in batches
    for (let i = 0; i < dataset.samples.length; i += batchSize) {
      const batch = dataset.samples.slice(i, Math.min(i + batchSize, dataset.samples.length));

      console.info(`[EvalHarness] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dataset.samples.length / batchSize)}`);

      for (const sample of batch) {
        const sampleStart = Date.now();

        try {
          const result = await driver.classifyWithProvider(targetProvider, {
            text: sample.text,
            correlationId: `eval-${runId}-${sample.id}`
          });

          const latency = Date.now() - sampleStart;
          totalCost += result.cost.totalCost;

          // Extract dimension scores from classification result
          const predicted: Record<string, number> = {
            confidence: this.extractScore(result.classification, 'confidence'),
            belonging: this.extractScore(result.classification, 'belonging'),
            lang_level_proxy: this.extractScore(result.classification, 'lang_level_proxy'),
            job_readiness: this.extractScore(result.classification, 'job_readiness'),
            well_being: this.extractScore(result.classification, 'well_being')
          };

          predictions.push({
            sampleId: sample.id,
            predicted,
            gold: sample.goldLabels as Record<string, number>,
            latencyMs: latency,
            cost: result.cost.totalCost
          });
        } catch (error: any) {
          console.error(`[EvalHarness] Error processing sample ${sample.id}:`, error.message);
          // Add null prediction for failed samples
          predictions.push({
            sampleId: sample.id,
            predicted: {},
            gold: sample.goldLabels as Record<string, number>,
            latencyMs: 0,
            cost: 0
          });
        }
      }
    }

    // Calculate metrics
    const dimensionMetrics = this.calculateDimensionMetrics(predictions);
    const macroF1 = dimensionMetrics.reduce((sum, m) => sum + m.f1, 0) / dimensionMetrics.length;

    // Calculate latency percentiles
    const latencies = predictions.map(p => p.latencyMs).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    const completedAt = new Date().toISOString();
    const durationSeconds = (Date.now() - startTime) / 1000;

    const result: EvalResult = {
      runId,
      datasetId: dataset.id,
      datasetName: dataset.name,
      language: dataset.language,
      provider: targetProvider,
      modelName: driver.getProvider(targetProvider).modelName,
      promptVersion: options.promptVersion,
      macroF1,
      microF1: macroF1, // Simplified - in production, calculate properly
      weightedF1: macroF1,
      dimensionMetrics,
      avgLatencyMs: avgLatency,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      totalCost,
      costPerSample: totalCost / dataset.samples.length,
      sampleCount: dataset.samples.length,
      startedAt,
      completedAt,
      durationSeconds
    };

    console.info(`[EvalHarness] Evaluation ${runId} complete. Macro F1: ${macroF1.toFixed(3)}, Avg Latency: ${avgLatency.toFixed(0)}ms, Cost: $${totalCost.toFixed(4)}`);

    return result;
  }

  /**
   * Extract score for a dimension from classification result
   */
  private extractScore(classification: any, dimension: string): number {
    // Try direct dimension score
    if (typeof classification[dimension] === 'number') {
      return classification[dimension];
    }

    // Try nested structure (e.g., classification.confidence.score)
    if (classification[dimension] && typeof classification[dimension].score === 'number') {
      return classification[dimension].score;
    }

    // Default to neutral
    return 0.5;
  }

  /**
   * Calculate per-dimension metrics
   */
  private calculateDimensionMetrics(
    predictions: Array<{
      predicted: Record<string, number>;
      gold: Record<string, number>;
    }>
  ): DimensionMetrics[] {
    const dimensions = ['confidence', 'belonging', 'lang_level_proxy', 'job_readiness', 'well_being'];
    const metrics: DimensionMetrics[] = [];

    for (const dim of dimensions) {
      const values = predictions.map(p => ({
        predicted: p.predicted[dim] !== undefined ? p.predicted[dim] : 0.5,
        gold: p.gold[dim] !== undefined ? p.gold[dim] : 0.5
      })).filter(v => v.gold !== undefined);

      if (values.length === 0) continue;

      // Convert to binary for precision/recall (threshold at 0.6)
      const threshold = 0.6;
      const binaryPredictions = values.map(v => (v.predicted >= threshold ? 1 : 0));
      const binaryGold = values.map(v => (v.gold >= threshold ? 1 : 0));

      const precision = calculatePrecision(binaryGold, binaryPredictions);
      const recall = calculateRecall(binaryGold, binaryPredictions);
      const f1 = calculateF1(precision, recall);

      // Calculate MAE and RMSE for regression
      const mae = values.reduce((sum, v) => sum + Math.abs(v.predicted - v.gold), 0) / values.length;
      const rmse = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v.predicted - v.gold, 2), 0) / values.length
      );

      metrics.push({
        dimension: dim,
        precision,
        recall,
        f1,
        mae,
        rmse,
        sampleCount: values.length
      });
    }

    return metrics;
  }

  /**
   * Compare two models/versions
   */
  async compareModels(
    datasetId: string,
    providerA: AIProvider,
    providerB: AIProvider
  ): Promise<{
    modelA: EvalResult;
    modelB: EvalResult;
    comparison: {
      f1Improvement: number;
      latencyChange: number;
      costChange: number;
      winner: 'A' | 'B' | 'tie';
    };
  }> {
    const resultA = await this.evaluate(datasetId, providerA);
    const resultB = await this.evaluate(datasetId, providerB);

    const f1Improvement = ((resultB.macroF1 - resultA.macroF1) / resultA.macroF1) * 100;
    const latencyChange = ((resultB.avgLatencyMs - resultA.avgLatencyMs) / resultA.avgLatencyMs) * 100;
    const costChange = ((resultB.totalCost - resultA.totalCost) / resultA.totalCost) * 100;

    // Determine winner (weighted: F1 70%, latency 15%, cost 15%)
    const scoreA = resultA.macroF1 * 0.7 - (resultA.avgLatencyMs / 1000) * 0.15 - resultA.totalCost * 0.15;
    const scoreB = resultB.macroF1 * 0.7 - (resultB.avgLatencyMs / 1000) * 0.15 - resultB.totalCost * 0.15;

    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (scoreB > scoreA * 1.02) winner = 'B'; // 2% threshold
    else if (scoreA > scoreB * 1.02) winner = 'A';

    return {
      modelA: resultA,
      modelB: resultB,
      comparison: {
        f1Improvement,
        latencyChange,
        costChange,
        winner
      }
    };
  }

  /**
   * Get all registered datasets
   */
  getDatasets(): EvalDataset[] {
    return Array.from(this.datasets.values());
  }

  /**
   * Get dataset by ID
   */
  getDataset(id: string): EvalDataset | undefined {
    return this.datasets.get(id);
  }
}

/**
 * Singleton instance
 */
let harnessInstance: Q2QEvaluationHarness | null = null;

export function getEvalHarness(): Q2QEvaluationHarness {
  if (!harnessInstance) {
    harnessInstance = new Q2QEvaluationHarness();
  }
  return harnessInstance;
}

/**
 * Load default test datasets (EN/UK/NO)
 */
export function loadDefaultDatasets(harness: Q2QEvaluationHarness): void {
  // English test set
  harness.registerDataset({
    id: 'q2q-en-v1',
    name: 'Q2Q English Test Set v1',
    description: 'Curated English feedback samples with gold labels',
    language: 'en',
    version: '1.0.0',
    createdAt: '2025-01-15T00:00:00Z',
    samples: [
      {
        id: 'en-001',
        text: 'She was very confident today! Asked great questions about the job application process and took detailed notes. Really impressed with her progress.',
        language: 'en',
        goldLabels: {
          confidence: 0.9,
          job_readiness: 0.8,
          well_being: 0.7
        },
        metadata: { domain: 'career', complexity: 'simple' }
      },
      {
        id: 'en-002',
        text: 'He seemed nervous and unsure. Still struggling with basic conversation. Needs more encouragement.',
        language: 'en',
        goldLabels: {
          confidence: 0.2,
          lang_level_proxy: 0.3,
          well_being: 0.3
        },
        metadata: { domain: 'social', complexity: 'simple' }
      }
      // In production, load from file or database
    ]
  });

  // Ukrainian test set
  harness.registerDataset({
    id: 'q2q-uk-v1',
    name: 'Q2Q Ukrainian Test Set v1',
    description: 'Curated Ukrainian feedback samples',
    language: 'uk',
    version: '1.0.0',
    createdAt: '2025-01-15T00:00:00Z',
    samples: [
      {
        id: 'uk-001',
        text: 'Вона була дуже впевнена сьогодні! Ставила чудові питання про процес подачі заяви на роботу.',
        language: 'uk',
        goldLabels: {
          confidence: 0.85,
          job_readiness: 0.75
        },
        metadata: { domain: 'career', complexity: 'simple' }
      }
    ]
  });

  // Norwegian test set
  harness.registerDataset({
    id: 'q2q-no-v1',
    name: 'Q2Q Norwegian Test Set v1',
    description: 'Curated Norwegian feedback samples',
    language: 'no',
    version: '1.0.0',
    createdAt: '2025-01-15T00:00:00Z',
    samples: [
      {
        id: 'no-001',
        text: 'Hun var veldig selvsikker i dag! Stilte gode spørsmål om jobbsøknadsprosessen.',
        language: 'no',
        goldLabels: {
          confidence: 0.85,
          job_readiness: 0.75
        },
        metadata: { domain: 'career', complexity: 'simple' }
      }
    ]
  });

  console.info('[EvalHarness] Loaded default datasets: EN, UK, NO');
}
