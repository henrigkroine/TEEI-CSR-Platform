/**
 * Shadow Evaluation Runner
 *
 * Runs inference with both production and candidate models in parallel,
 * comparing results without exposing candidate model outputs to users.
 * This enables safe evaluation of new models in production traffic.
 */

import { InferenceRequest, InferenceResult, AIProvider } from '../inference/types.js';
import { Language } from '../inference/language_detection.js';
import { ClassificationOutput } from '../labels.js';

/**
 * Configuration for shadow evaluation
 */
export interface ShadowEvalConfig {
  /** Tenant ID for tenant-specific evaluation */
  tenantId?: string;
  /** Production model identifier */
  productionModel: string;
  /** Candidate model identifier */
  candidateModel: string;
  /** Sample rate (0.0 to 1.0) - percentage of requests to shadow evaluate */
  sampleRate: number;
  /** Storage backend for comparison results */
  storageBackend: 'file' | 'database';
  /** File path for file-based storage */
  filePath?: string;
  /** Whether to emit real-time metrics */
  emitMetrics: boolean;
}

/**
 * Result of a shadow evaluation comparison
 */
export interface ShadowEvalResult {
  /** Unique ID for this evaluation */
  id: string;
  /** Timestamp of evaluation */
  timestamp: string;
  /** Tenant ID (if tenant-specific) */
  tenantId?: string;
  /** Original request */
  request: InferenceRequest;
  /** Detected language */
  language?: Language;
  /** Production model result */
  productionResult: InferenceResult;
  /** Candidate model result */
  candidateResult: InferenceResult;
  /** Comparison metrics */
  comparison: ShadowComparison;
}

/**
 * Comparison metrics between production and candidate models
 */
export interface ShadowComparison {
  /** Whether outputs match exactly */
  exactMatch: boolean;
  /** Latency difference (candidate - production) in ms */
  latencyDeltaMs: number;
  /** Cost difference (candidate - production) in USD */
  costDelta: number;
  /** Field-level differences in classification output */
  fieldDifferences: FieldDifference[];
  /** Agreement score (0.0 to 1.0) based on matching fields */
  agreementScore: number;
}

/**
 * Difference in a specific field between models
 */
export interface FieldDifference {
  field: string;
  productionValue: any;
  candidateValue: any;
  type: 'boolean' | 'array' | 'string' | 'number';
}

/**
 * Shadow evaluation metrics for monitoring
 */
export interface ShadowMetrics {
  totalEvaluations: number;
  exactMatches: number;
  averageAgreementScore: number;
  averageLatencyDelta: number;
  averageCostDelta: number;
  candidateFasterCount: number;
  candidateCheaperCount: number;
}

/**
 * Shadow Evaluation Runner
 *
 * Orchestrates parallel execution of production and candidate models,
 * compares results, and stores comparison data for analysis.
 */
export class ShadowEvaluator {
  private config: ShadowEvalConfig;
  private results: ShadowEvalResult[] = [];
  private metrics: ShadowMetrics = {
    totalEvaluations: 0,
    exactMatches: 0,
    averageAgreementScore: 0,
    averageLatencyDelta: 0,
    averageCostDelta: 0,
    candidateFasterCount: 0,
    candidateCheaperCount: 0,
  };

  constructor(config: ShadowEvalConfig) {
    this.config = config;
  }

  /**
   * Determine if a request should be shadow evaluated based on sample rate
   */
  shouldShadowEvaluate(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Run shadow evaluation for a single request
   *
   * @param request - The inference request
   * @param productionInfer - Function to run production model inference
   * @param candidateInfer - Function to run candidate model inference
   * @returns Shadow evaluation result
   */
  async evaluate(
    request: InferenceRequest,
    productionInfer: (req: InferenceRequest) => Promise<InferenceResult>,
    candidateInfer: (req: InferenceRequest) => Promise<InferenceResult>
  ): Promise<ShadowEvalResult | null> {
    // Check if we should shadow evaluate this request
    if (!this.shouldShadowEvaluate()) {
      return null;
    }

    const id = this.generateId();
    const timestamp = new Date().toISOString();

    try {
      // Run both models in parallel
      const [productionResult, candidateResult] = await Promise.all([
        productionInfer(request),
        candidateInfer(request),
      ]);

      // Compare results
      const comparison = this.compareResults(
        productionResult.classification,
        candidateResult.classification,
        productionResult.latencyMs,
        candidateResult.latencyMs,
        productionResult.cost.totalCost,
        candidateResult.cost.totalCost
      );

      // Create evaluation result
      const evalResult: ShadowEvalResult = {
        id,
        timestamp,
        tenantId: this.config.tenantId,
        request,
        productionResult,
        candidateResult,
        comparison,
      };

      // Store result
      await this.storeResult(evalResult);

      // Update metrics
      this.updateMetrics(comparison);

      // Emit metrics if configured
      if (this.config.emitMetrics) {
        this.emitComparisonMetrics(evalResult);
      }

      return evalResult;
    } catch (error: any) {
      console.error('[ShadowEval] Evaluation failed:', error.message);
      return null;
    }
  }

  /**
   * Compare classification outputs between production and candidate models
   */
  private compareResults(
    production: ClassificationOutput,
    candidate: ClassificationOutput,
    productionLatency: number,
    candidateLatency: number,
    productionCost: number,
    candidateCost: number
  ): ShadowComparison {
    const fieldDifferences: FieldDifference[] = [];
    let matchingFields = 0;
    let totalFields = 0;

    // Compare all fields in classification output
    const allKeys = new Set([
      ...Object.keys(production),
      ...Object.keys(candidate),
    ]);

    for (const key of allKeys) {
      totalFields++;
      const prodValue = (production as any)[key];
      const candValue = (candidate as any)[key];

      // Check if values match
      const matches = this.valuesMatch(prodValue, candValue);
      if (matches) {
        matchingFields++;
      } else {
        fieldDifferences.push({
          field: key,
          productionValue: prodValue,
          candidateValue: candValue,
          type: this.getValueType(prodValue),
        });
      }
    }

    // Calculate agreement score
    const agreementScore = totalFields > 0 ? matchingFields / totalFields : 0;

    // Calculate deltas
    const latencyDeltaMs = candidateLatency - productionLatency;
    const costDelta = candidateCost - productionCost;

    return {
      exactMatch: fieldDifferences.length === 0,
      latencyDeltaMs,
      costDelta,
      fieldDifferences,
      agreementScore,
    };
  }

  /**
   * Check if two values match (handles arrays, booleans, etc.)
   */
  private valuesMatch(a: any, b: any): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      return (
        a.length === b.length &&
        a.every((val, idx) => val === b[idx])
      );
    }
    return a === b;
  }

  /**
   * Get the type of a value
   */
  private getValueType(value: any): 'boolean' | 'array' | 'string' | 'number' {
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    return 'string'; // default
  }

  /**
   * Store shadow evaluation result
   */
  private async storeResult(result: ShadowEvalResult): Promise<void> {
    this.results.push(result);

    if (this.config.storageBackend === 'file' && this.config.filePath) {
      await this.storeToFile(result);
    } else if (this.config.storageBackend === 'database') {
      await this.storeToDatabase(result);
    }
  }

  /**
   * Store result to file (JSONL format)
   */
  private async storeToFile(result: ShadowEvalResult): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = this.config.filePath!;
      const line = JSON.stringify(result) + '\n';
      await fs.appendFile(path, line, 'utf-8');
    } catch (error: any) {
      console.error('[ShadowEval] Failed to store to file:', error.message);
    }
  }

  /**
   * Store result to database
   * TODO: Implement database storage when schema is ready
   */
  private async storeToDatabase(result: ShadowEvalResult): Promise<void> {
    // Placeholder for database storage
    console.info('[ShadowEval] Database storage not yet implemented');
  }

  /**
   * Update running metrics
   */
  private updateMetrics(comparison: ShadowComparison): void {
    const n = this.metrics.totalEvaluations;
    this.metrics.totalEvaluations++;

    // Update exact matches
    if (comparison.exactMatch) {
      this.metrics.exactMatches++;
    }

    // Update running averages using incremental formula
    this.metrics.averageAgreementScore =
      (this.metrics.averageAgreementScore * n + comparison.agreementScore) /
      (n + 1);

    this.metrics.averageLatencyDelta =
      (this.metrics.averageLatencyDelta * n + comparison.latencyDeltaMs) /
      (n + 1);

    this.metrics.averageCostDelta =
      (this.metrics.averageCostDelta * n + comparison.costDelta) / (n + 1);

    // Update count metrics
    if (comparison.latencyDeltaMs < 0) {
      this.metrics.candidateFasterCount++;
    }
    if (comparison.costDelta < 0) {
      this.metrics.candidateCheaperCount++;
    }
  }

  /**
   * Emit comparison metrics for monitoring
   */
  private emitComparisonMetrics(result: ShadowEvalResult): void {
    const { comparison, tenantId } = result;

    console.info('[ShadowEval] Comparison metrics:', {
      tenantId: tenantId || 'global',
      productionModel: this.config.productionModel,
      candidateModel: this.config.candidateModel,
      exactMatch: comparison.exactMatch,
      agreementScore: comparison.agreementScore.toFixed(3),
      latencyDeltaMs: comparison.latencyDeltaMs.toFixed(2),
      costDelta: comparison.costDelta.toFixed(6),
      fieldDifferences: comparison.fieldDifferences.length,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): ShadowMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all stored results
   */
  getResults(): ShadowEvalResult[] {
    return [...this.results];
  }

  /**
   * Get results for a specific tenant
   */
  getResultsByTenant(tenantId: string): ShadowEvalResult[] {
    return this.results.filter((r) => r.tenantId === tenantId);
  }

  /**
   * Generate unique ID for evaluation
   */
  private generateId(): string {
    return `shadow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear stored results (useful for testing or periodic cleanup)
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvaluations: 0,
      exactMatches: 0,
      averageAgreementScore: 0,
      averageLatencyDelta: 0,
      averageCostDelta: 0,
      candidateFasterCount: 0,
      candidateCheaperCount: 0,
    };
  }
}

/**
 * Create a shadow evaluator instance
 */
export function createShadowEvaluator(
  config: ShadowEvalConfig
): ShadowEvaluator {
  return new ShadowEvaluator(config);
}

/**
 * Format shadow evaluation summary for reporting
 */
export function formatShadowEvalSummary(metrics: ShadowMetrics): string {
  const lines: string[] = [];

  lines.push('\n=== Shadow Evaluation Summary ===');
  lines.push(`Total Evaluations: ${metrics.totalEvaluations}`);
  lines.push(
    `Exact Matches: ${metrics.exactMatches} (${((metrics.exactMatches / metrics.totalEvaluations) * 100).toFixed(1)}%)`
  );
  lines.push(
    `Average Agreement Score: ${metrics.averageAgreementScore.toFixed(3)}`
  );
  lines.push(
    `Average Latency Delta: ${metrics.averageLatencyDelta.toFixed(2)} ms ${metrics.averageLatencyDelta < 0 ? '(candidate faster)' : '(production faster)'}`
  );
  lines.push(
    `Average Cost Delta: $${metrics.averageCostDelta.toFixed(6)} ${metrics.averageCostDelta < 0 ? '(candidate cheaper)' : '(production cheaper)'}`
  );
  lines.push(
    `Candidate Faster: ${metrics.candidateFasterCount} (${((metrics.candidateFasterCount / metrics.totalEvaluations) * 100).toFixed(1)}%)`
  );
  lines.push(
    `Candidate Cheaper: ${metrics.candidateCheaperCount} (${((metrics.candidateCheaperCount / metrics.totalEvaluations) * 100).toFixed(1)}%)`
  );
  lines.push('');

  return lines.join('\n');
}
