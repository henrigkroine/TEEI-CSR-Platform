/**
 * Interleaved Testing Module
 *
 * Implements A/B testing and interleaved model comparison for online evaluation.
 * Supports random assignment, multi-armed bandit allocation, and statistical
 * significance testing.
 */

import { InferenceRequest, InferenceResult } from '../inference/types.js';

/**
 * Model variant for A/B testing
 */
export interface ModelVariant {
  id: string;
  name: string;
  modelName: string;
  provider: string;
}

/**
 * Assignment strategy for interleaving
 */
export type AssignmentStrategy = 'random' | 'epsilon-greedy' | 'thompson-sampling';

/**
 * Interleaving configuration
 */
export interface InterleavingConfig {
  /** Model variants to test */
  variants: ModelVariant[];
  /** Assignment strategy */
  strategy: AssignmentStrategy;
  /** Epsilon value for epsilon-greedy (default 0.1) */
  epsilon?: number;
  /** Minimum samples per variant before using bandit */
  minSamplesPerVariant?: number;
  /** Confidence level for statistical tests (default 0.95) */
  confidenceLevel?: number;
  /** Tenant ID for tenant-specific testing */
  tenantId?: string;
}

/**
 * Assignment result
 */
export interface Assignment {
  /** Unique assignment ID */
  id: string;
  /** Timestamp of assignment */
  timestamp: string;
  /** Tenant ID (if tenant-specific) */
  tenantId?: string;
  /** Request that was assigned */
  request: InferenceRequest;
  /** Assigned variant */
  variant: ModelVariant;
  /** Assignment strategy used */
  strategy: AssignmentStrategy;
}

/**
 * Outcome of an assigned request
 */
export interface Outcome {
  /** Assignment ID this outcome belongs to */
  assignmentId: string;
  /** Timestamp of outcome */
  timestamp: string;
  /** Inference result */
  result: InferenceResult;
  /** Reward signal (lower is better: latency + cost weight) */
  reward: number;
  /** Whether the result was successful */
  success: boolean;
}

/**
 * Variant statistics
 */
export interface VariantStats {
  variantId: string;
  totalAssignments: number;
  totalOutcomes: number;
  successRate: number;
  averageReward: number;
  averageLatency: number;
  averageCost: number;
  confidenceInterval?: [number, number];
}

/**
 * Statistical test result comparing two variants
 */
export interface SignificanceTest {
  variantA: string;
  variantB: string;
  sampleSizeA: number;
  sampleSizeB: number;
  meanA: number;
  meanB: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
  winner?: string;
}

/**
 * Interleaved Testing Manager
 *
 * Manages A/B testing and bandit allocation for model comparison.
 */
export class InterleavingManager {
  private config: InterleavingConfig;
  private assignments: Assignment[] = [];
  private outcomes: Outcome[] = [];
  private variantStats: Map<string, VariantStats> = new Map();

  // Bandit state (for Thompson Sampling)
  private alphaParams: Map<string, number> = new Map();
  private betaParams: Map<string, number> = new Map();

  constructor(config: InterleavingConfig) {
    this.config = config;
    this.initializeVariantStats();
    this.initializeBanditParams();
  }

  /**
   * Initialize statistics for each variant
   */
  private initializeVariantStats(): void {
    for (const variant of this.config.variants) {
      this.variantStats.set(variant.id, {
        variantId: variant.id,
        totalAssignments: 0,
        totalOutcomes: 0,
        successRate: 0,
        averageReward: 0,
        averageLatency: 0,
        averageCost: 0,
      });
    }
  }

  /**
   * Initialize bandit parameters (Beta distribution)
   */
  private initializeBanditParams(): void {
    for (const variant of this.config.variants) {
      this.alphaParams.set(variant.id, 1); // Prior: Beta(1, 1) = Uniform
      this.betaParams.set(variant.id, 1);
    }
  }

  /**
   * Assign a request to a model variant
   *
   * @param request - The inference request
   * @returns Assignment result
   */
  assign(request: InferenceRequest): Assignment {
    let variant: ModelVariant;

    // Determine assignment strategy to use
    const strategy = this.determineStrategy();

    switch (strategy) {
      case 'random':
        variant = this.randomAssignment();
        break;
      case 'epsilon-greedy':
        variant = this.epsilonGreedyAssignment();
        break;
      case 'thompson-sampling':
        variant = this.thompsonSamplingAssignment();
        break;
      default:
        variant = this.randomAssignment();
    }

    // Create assignment record
    const assignment: Assignment = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      tenantId: this.config.tenantId,
      request,
      variant,
      strategy,
    };

    // Store assignment
    this.assignments.push(assignment);

    // Update stats
    const stats = this.variantStats.get(variant.id)!;
    stats.totalAssignments++;

    return assignment;
  }

  /**
   * Determine which strategy to use based on sample sizes
   */
  private determineStrategy(): AssignmentStrategy {
    const minSamples = this.config.minSamplesPerVariant || 100;
    const allHaveMinSamples = Array.from(this.variantStats.values()).every(
      (stats) => stats.totalOutcomes >= minSamples
    );

    // Use random until we have minimum samples
    if (!allHaveMinSamples) {
      return 'random';
    }

    // Otherwise use configured strategy
    return this.config.strategy;
  }

  /**
   * Random assignment (uniform distribution)
   */
  private randomAssignment(): ModelVariant {
    const index = Math.floor(Math.random() * this.config.variants.length);
    return this.config.variants[index];
  }

  /**
   * Epsilon-greedy assignment
   * With probability epsilon, explore (random), otherwise exploit (best variant)
   */
  private epsilonGreedyAssignment(): ModelVariant {
    const epsilon = this.config.epsilon || 0.1;

    // Explore
    if (Math.random() < epsilon) {
      return this.randomAssignment();
    }

    // Exploit: choose variant with highest average reward
    let bestVariant = this.config.variants[0];
    let bestReward = -Infinity;

    for (const variant of this.config.variants) {
      const stats = this.variantStats.get(variant.id)!;
      if (stats.averageReward > bestReward) {
        bestReward = stats.averageReward;
        bestVariant = variant;
      }
    }

    return bestVariant;
  }

  /**
   * Thompson Sampling assignment
   * Sample from Beta distribution for each variant, choose highest sample
   */
  private thompsonSamplingAssignment(): ModelVariant {
    let bestVariant = this.config.variants[0];
    let bestSample = -Infinity;

    for (const variant of this.config.variants) {
      const alpha = this.alphaParams.get(variant.id)!;
      const beta = this.betaParams.get(variant.id)!;

      // Sample from Beta(alpha, beta)
      const sample = this.sampleBeta(alpha, beta);

      if (sample > bestSample) {
        bestSample = sample;
        bestVariant = variant;
      }
    }

    return bestVariant;
  }

  /**
   * Sample from Beta distribution using acceptance-rejection
   * (Simplified implementation for demonstration)
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Use Gamma distribution property: Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b))
    const gammaA = this.sampleGamma(alpha);
    const gammaB = this.sampleGamma(beta);
    return gammaA / (gammaA + gammaB);
  }

  /**
   * Sample from Gamma distribution (simplified)
   */
  private sampleGamma(shape: number): number {
    // Simple approximation for shape >= 1
    if (shape >= 1) {
      let sum = 0;
      for (let i = 0; i < Math.floor(shape); i++) {
        sum += -Math.log(Math.random());
      }
      return sum;
    }
    // For shape < 1, use a simple approximation
    return Math.pow(Math.random(), 1 / shape);
  }

  /**
   * Record outcome for an assignment
   *
   * @param assignmentId - The assignment ID
   * @param result - The inference result
   * @param success - Whether the result was successful
   */
  recordOutcome(
    assignmentId: string,
    result: InferenceResult,
    success: boolean = true
  ): void {
    const assignment = this.assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      console.warn('[Interleaving] Assignment not found:', assignmentId);
      return;
    }

    // Calculate reward (lower is better: combine latency and cost)
    // Normalize: latency in seconds, cost scaled
    const reward = this.calculateReward(result.latencyMs, result.cost.totalCost);

    const outcome: Outcome = {
      assignmentId,
      timestamp: new Date().toISOString(),
      result,
      reward,
      success,
    };

    this.outcomes.push(outcome);

    // Update variant statistics
    this.updateVariantStats(assignment.variant.id, outcome);

    // Update bandit parameters
    this.updateBanditParams(assignment.variant.id, success, reward);
  }

  /**
   * Calculate reward signal from latency and cost
   * Lower values are better (we invert the scale)
   */
  private calculateReward(latencyMs: number, cost: number): number {
    // Normalize and combine (lower is better, so we negate)
    const latencySec = latencyMs / 1000;
    const normalizedLatency = latencySec / 10; // Assume 10s is max expected
    const normalizedCost = cost / 0.1; // Assume $0.10 is max expected

    // Weight: 60% latency, 40% cost
    const combinedScore = 0.6 * normalizedLatency + 0.4 * normalizedCost;

    // Return inverted (higher is better for optimization)
    return -combinedScore;
  }

  /**
   * Update variant statistics with new outcome
   */
  private updateVariantStats(variantId: string, outcome: Outcome): void {
    const stats = this.variantStats.get(variantId)!;
    const n = stats.totalOutcomes;

    // Update counts
    stats.totalOutcomes++;

    // Update running averages
    stats.successRate =
      (stats.successRate * n + (outcome.success ? 1 : 0)) / (n + 1);
    stats.averageReward =
      (stats.averageReward * n + outcome.reward) / (n + 1);
    stats.averageLatency =
      (stats.averageLatency * n + outcome.result.latencyMs) / (n + 1);
    stats.averageCost =
      (stats.averageCost * n + outcome.result.cost.totalCost) / (n + 1);
  }

  /**
   * Update bandit parameters (Beta distribution) based on outcome
   */
  private updateBanditParams(
    variantId: string,
    success: boolean,
    reward: number
  ): void {
    // Update based on success/failure
    if (success) {
      const alpha = this.alphaParams.get(variantId)!;
      this.alphaParams.set(variantId, alpha + 1);
    } else {
      const beta = this.betaParams.get(variantId)!;
      this.betaParams.set(variantId, beta + 1);
    }

    // Could also update based on reward magnitude, but keeping it simple
  }

  /**
   * Get statistics for a specific variant
   */
  getVariantStats(variantId: string): VariantStats | undefined {
    return this.variantStats.get(variantId);
  }

  /**
   * Get statistics for all variants
   */
  getAllStats(): VariantStats[] {
    return Array.from(this.variantStats.values());
  }

  /**
   * Compute statistical significance between two variants
   * Uses Welch's t-test for unequal variances
   */
  computeSignificance(variantIdA: string, variantIdB: string): SignificanceTest | null {
    const outcomesA = this.getOutcomesForVariant(variantIdA);
    const outcomesB = this.getOutcomesForVariant(variantIdB);

    if (outcomesA.length < 2 || outcomesB.length < 2) {
      return null; // Not enough data
    }

    const rewardsA = outcomesA.map((o) => o.reward);
    const rewardsB = outcomesB.map((o) => o.reward);

    const meanA = this.mean(rewardsA);
    const meanB = this.mean(rewardsB);
    const varA = this.variance(rewardsA, meanA);
    const varB = this.variance(rewardsB, meanB);
    const nA = rewardsA.length;
    const nB = rewardsB.length;

    // Welch's t-statistic
    const tStat = (meanA - meanB) / Math.sqrt(varA / nA + varB / nB);

    // Degrees of freedom (Welch-Satterthwaite)
    const df =
      Math.pow(varA / nA + varB / nB, 2) /
      (Math.pow(varA / nA, 2) / (nA - 1) + Math.pow(varB / nB, 2) / (nB - 1));

    // Approximate p-value (two-tailed)
    const pValue = this.tTestPValue(Math.abs(tStat), df);

    const confidenceLevel = this.config.confidenceLevel || 0.95;
    const alpha = 1 - confidenceLevel;
    const isSignificant = pValue < alpha;

    let winner: string | undefined;
    if (isSignificant) {
      winner = meanA > meanB ? variantIdA : variantIdB;
    }

    return {
      variantA: variantIdA,
      variantB: variantIdB,
      sampleSizeA: nA,
      sampleSizeB: nB,
      meanA,
      meanB,
      pValue,
      isSignificant,
      confidenceLevel,
      winner,
    };
  }

  /**
   * Get all outcomes for a specific variant
   */
  private getOutcomesForVariant(variantId: string): Outcome[] {
    const variantAssignments = this.assignments
      .filter((a) => a.variant.id === variantId)
      .map((a) => a.id);

    return this.outcomes.filter((o) =>
      variantAssignments.includes(o.assignmentId)
    );
  }

  /**
   * Calculate mean of array
   */
  private mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate variance of array
   */
  private variance(values: number[], mean: number): number {
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return this.mean(squaredDiffs);
  }

  /**
   * Approximate p-value for t-test (two-tailed)
   * Using normal approximation for large df
   */
  private tTestPValue(tStat: number, df: number): number {
    // For large df (>30), t-distribution ≈ normal distribution
    if (df > 30) {
      return 2 * (1 - this.normalCDF(tStat));
    }

    // For small df, use conservative estimate
    // This is a simplified approximation
    const p = 2 * (1 - this.normalCDF(tStat * Math.sqrt(df / (df + 1))));
    return Math.max(0, Math.min(1, p));
  }

  /**
   * Standard normal CDF approximation
   */
  private normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - p : p;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `interleave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.assignments = [];
    this.outcomes = [];
    this.initializeVariantStats();
    this.initializeBanditParams();
  }
}

/**
 * Create an interleaving manager instance
 */
export function createInterleavingManager(
  config: InterleavingConfig
): InterleavingManager {
  return new InterleavingManager(config);
}

/**
 * Format interleaving summary for reporting
 */
export function formatInterleavingSummary(stats: VariantStats[]): string {
  const lines: string[] = [];

  lines.push('\n=== Interleaving Test Summary ===\n');

  for (const stat of stats) {
    lines.push(`Variant: ${stat.variantId}`);
    lines.push(`  Total Assignments: ${stat.totalAssignments}`);
    lines.push(`  Total Outcomes: ${stat.totalOutcomes}`);
    lines.push(`  Success Rate: ${(stat.successRate * 100).toFixed(2)}%`);
    lines.push(`  Average Reward: ${stat.averageReward.toFixed(4)}`);
    lines.push(`  Average Latency: ${stat.averageLatency.toFixed(2)} ms`);
    lines.push(`  Average Cost: $${stat.averageCost.toFixed(6)}`);
    lines.push('');
  }

  return lines.join('\n');
}
