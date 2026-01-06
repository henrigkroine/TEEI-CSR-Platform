/**
 * Canary Rollout System for Model Deployments
 * Gradually roll out new models with automatic rollback on degradation
 */

import { db } from '@teei/shared-schema/db';
import { modelRegistry, evalRuns } from '@teei/shared-schema/schema/q2q';
import { eq, and, desc } from 'drizzle-orm';

export interface CanaryConfig {
  modelId: string;
  targetWeight: number; // Final weight (0-1) if canary succeeds
  initialWeight: number; // Starting weight (e.g., 0.05 = 5%)
  incrementStep: number; // Weight increase per step (e.g., 0.05)
  incrementInterval: number; // Hours between increments
  successCriteria: {
    minF1Score: number; // Minimum F1 score to continue
    maxLatencyMs: number; // Maximum p95 latency
    minSampleSize: number; // Minimum samples before incrementing
    maxErrorRate: number; // Maximum error rate (0-1)
  };
  rollbackCriteria: {
    f1Degradation: number; // % drop in F1 vs baseline
    latencyIncrease: number; // % increase in latency vs baseline
    errorRateThreshold: number; // Absolute error rate threshold
  };
}

export interface CanaryDeployment {
  id: string;
  modelId: string;
  status: 'active' | 'paused' | 'completed' | 'rolled_back';
  currentWeight: number;
  targetWeight: number;
  startedAt: string;
  lastIncrementAt?: string;
  completedAt?: string;
  metrics: {
    sampleCount: number;
    f1Score: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
  };
  baselineMetrics: {
    f1Score: number;
    avgLatencyMs: number;
    errorRate: number;
  };
  config: CanaryConfig;
}

/**
 * Canary Rollout Manager
 */
export class CanaryRolloutManager {
  private deployments: Map<string, CanaryDeployment> = new Map();

  /**
   * Start canary deployment
   */
  async startCanary(config: CanaryConfig): Promise<CanaryDeployment> {
    // Fetch baseline metrics from current active model
    const baselineMetrics = await this.getBaselineMetrics(config.modelId);

    const deployment: CanaryDeployment = {
      id: `canary-${config.modelId}-${Date.now()}`,
      modelId: config.modelId,
      status: 'active',
      currentWeight: config.initialWeight,
      targetWeight: config.targetWeight,
      startedAt: new Date().toISOString(),
      metrics: {
        sampleCount: 0,
        f1Score: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        errorRate: 0
      },
      baselineMetrics,
      config
    };

    this.deployments.set(deployment.id, deployment);

    // Update model registry to mark as canary
    await db
      .update(modelRegistry)
      .set({ active: false }) // Canary starts inactive until metrics validate
      .where(eq(modelRegistry.modelId, config.modelId));

    console.info(`[CanaryRollout] Started canary for model ${config.modelId} at ${config.initialWeight * 100}%`);

    return deployment;
  }

  /**
   * Update canary metrics and potentially increment weight
   */
  async updateCanaryMetrics(
    deploymentId: string,
    metrics: {
      sampleCount: number;
      f1Score: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      errorCount: number;
    }
  ): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment || deployment.status !== 'active') {
      return;
    }

    // Update metrics
    deployment.metrics = {
      sampleCount: metrics.sampleCount,
      f1Score: metrics.f1Score,
      avgLatencyMs: metrics.avgLatencyMs,
      p95LatencyMs: metrics.p95LatencyMs,
      errorRate: metrics.errorCount / metrics.sampleCount
    };

    // Check rollback criteria
    if (this.shouldRollback(deployment)) {
      await this.rollback(deploymentId, 'Failed rollback criteria');
      return;
    }

    // Check if ready to increment
    if (await this.shouldIncrement(deployment)) {
      await this.incrementWeight(deploymentId);
    }
  }

  /**
   * Check if canary should be rolled back
   */
  private shouldRollback(deployment: CanaryDeployment): boolean {
    const { metrics, baselineMetrics, config } = deployment;

    // Check error rate
    if (metrics.errorRate > config.rollbackCriteria.errorRateThreshold) {
      console.warn(`[CanaryRollout] Rollback triggered: Error rate ${metrics.errorRate} exceeds threshold ${config.rollbackCriteria.errorRateThreshold}`);
      return true;
    }

    // Check F1 degradation
    const f1Degradation = ((baselineMetrics.f1Score - metrics.f1Score) / baselineMetrics.f1Score) * 100;
    if (f1Degradation > config.rollbackCriteria.f1Degradation) {
      console.warn(`[CanaryRollout] Rollback triggered: F1 degradation ${f1Degradation.toFixed(1)}% exceeds threshold ${config.rollbackCriteria.f1Degradation}%`);
      return true;
    }

    // Check latency increase
    const latencyIncrease = ((metrics.avgLatencyMs - baselineMetrics.avgLatencyMs) / baselineMetrics.avgLatencyMs) * 100;
    if (latencyIncrease > config.rollbackCriteria.latencyIncrease) {
      console.warn(`[CanaryRollout] Rollback triggered: Latency increase ${latencyIncrease.toFixed(1)}% exceeds threshold ${config.rollbackCriteria.latencyIncrease}%`);
      return true;
    }

    return false;
  }

  /**
   * Check if canary should increment weight
   */
  private async shouldIncrement(deployment: CanaryDeployment): Promise<boolean> {
    const { metrics, config, lastIncrementAt } = deployment;

    // Check sample size
    if (metrics.sampleCount < config.successCriteria.minSampleSize) {
      return false;
    }

    // Check success criteria
    if (metrics.f1Score < config.successCriteria.minF1Score) {
      console.info(`[CanaryRollout] Not incrementing: F1 ${metrics.f1Score} < ${config.successCriteria.minF1Score}`);
      return false;
    }

    if (metrics.p95LatencyMs > config.successCriteria.maxLatencyMs) {
      console.info(`[CanaryRollout] Not incrementing: p95 latency ${metrics.p95LatencyMs}ms > ${config.successCriteria.maxLatencyMs}ms`);
      return false;
    }

    if (metrics.errorRate > config.successCriteria.maxErrorRate) {
      console.info(`[CanaryRollout] Not incrementing: Error rate ${metrics.errorRate} > ${config.successCriteria.maxErrorRate}`);
      return false;
    }

    // Check time interval since last increment
    if (lastIncrementAt) {
      const hoursSinceIncrement = (Date.now() - new Date(lastIncrementAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceIncrement < config.incrementInterval) {
        return false;
      }
    }

    return true;
  }

  /**
   * Increment canary weight
   */
  private async incrementWeight(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    const newWeight = Math.min(
      deployment.currentWeight + deployment.config.incrementStep,
      deployment.targetWeight
    );

    deployment.currentWeight = newWeight;
    deployment.lastIncrementAt = new Date().toISOString();

    console.info(`[CanaryRollout] Incremented weight for ${deployment.modelId} to ${newWeight * 100}%`);

    // Check if reached target
    if (newWeight >= deployment.targetWeight) {
      await this.promoteToProduction(deploymentId);
    }
  }

  /**
   * Promote canary to full production
   */
  private async promoteToProduction(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    // Activate model
    await db
      .update(modelRegistry)
      .set({ active: true })
      .where(eq(modelRegistry.modelId, deployment.modelId));

    // Deactivate previous models for same provider
    const [model] = await db
      .select()
      .from(modelRegistry)
      .where(eq(modelRegistry.modelId, deployment.modelId))
      .limit(1);

    if (model) {
      await db
        .update(modelRegistry)
        .set({ active: false })
        .where(
          and(
            eq(modelRegistry.provider, model.provider),
            eq(modelRegistry.active, true)
          )
        );
    }

    deployment.status = 'completed';
    deployment.completedAt = new Date().toISOString();
    deployment.currentWeight = 1.0;

    console.info(`[CanaryRollout] Promoted ${deployment.modelId} to production`);
  }

  /**
   * Rollback canary deployment
   */
  async rollback(deploymentId: string, reason: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    deployment.status = 'rolled_back';
    deployment.currentWeight = 0;

    console.warn(`[CanaryRollout] Rolled back ${deployment.modelId}: ${reason}`);

    // Ensure model is deactivated
    await db
      .update(modelRegistry)
      .set({ active: false })
      .where(eq(modelRegistry.modelId, deployment.modelId));
  }

  /**
   * Get baseline metrics from current active model
   */
  private async getBaselineMetrics(excludeModelId: string): Promise<{
    f1Score: number;
    avgLatencyMs: number;
    errorRate: number;
  }> {
    // Fetch recent eval runs (excluding the canary model)
    const recentRuns = await db
      .select()
      .from(evalRuns)
      .orderBy(desc(evalRuns.createdAt))
      .limit(10);

    if (recentRuns.length === 0) {
      return { f1Score: 0.5, avgLatencyMs: 1500, errorRate: 0.01 }; // Defaults
    }

    // Calculate averages
    const avgF1 = recentRuns.reduce((sum, run) => {
      const results = run.results as any;
      return sum + (results.macroF1 || 0);
    }, 0) / recentRuns.length;

    return {
      f1Score: avgF1,
      avgLatencyMs: 1500, // Placeholder - would pull from metrics DB
      errorRate: 0.01
    };
  }

  /**
   * Get all active canary deployments
   */
  getActiveDeployments(): CanaryDeployment[] {
    return Array.from(this.deployments.values()).filter(d => d.status === 'active');
  }

  /**
   * Get deployment by ID
   */
  getDeployment(id: string): CanaryDeployment | undefined {
    return this.deployments.get(id);
  }
}

/**
 * Singleton instance
 */
let managerInstance: CanaryRolloutManager | null = null;

export function getCanaryManager(): CanaryRolloutManager {
  if (!managerInstance) {
    managerInstance = new CanaryRolloutManager();
  }
  return managerInstance;
}
