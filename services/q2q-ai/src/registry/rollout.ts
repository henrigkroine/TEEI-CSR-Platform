/**
 * Canary Rollout Manager
 *
 * Implements progressive rollout of model overrides:
 * - Phase 1: Route 10% of tenant traffic to new override
 * - Wait for evaluation window (configurable, default 1 hour)
 * - Check success criteria (no accuracy drop, no latency spike)
 * - Phase 2: Increase to 50% if criteria met
 * - Phase 3: Full rollout to 100%
 * - Abort and rollback if any phase fails
 */

import { ModelRegistry, MergedConfig } from '@teei/model-registry';
import { TenantOverride } from '@teei/model-registry/types';

export type RolloutPhase = 'phase1' | 'phase2' | 'phase3' | 'complete' | 'aborted';

export interface RolloutConfig {
  tenantId: string;
  newOverride: TenantOverride;
  previousOverride: TenantOverride | null;

  // Traffic percentage thresholds
  phase1Percentage: number; // Default: 10
  phase2Percentage: number; // Default: 50
  phase3Percentage: number; // Default: 100

  // Evaluation window (milliseconds)
  evaluationWindow: number; // Default: 3600000 (1 hour)

  // Success criteria thresholds
  maxAccuracyDrop: number; // Default: 0.05 (5%)
  maxLatencyIncrease: number; // Default: 0.2 (20%)
  maxCostIncrease: number; // Default: 0.3 (30%)
}

export interface RolloutSuccessMetrics {
  accuracy: number; // 0-1
  latency: number; // milliseconds (p95)
  cost: number; // dollars per request
}

export interface RolloutState {
  id: string;
  tenantId: string;
  currentPhase: RolloutPhase;
  trafficPercentage: number;
  startedAt: Date;
  phaseStartedAt: Date;

  // Metrics tracking
  baselineMetrics: RolloutSuccessMetrics | null;
  currentMetrics: RolloutSuccessMetrics | null;

  // Event log
  events: RolloutEvent[];

  // Configuration
  config: RolloutConfig;
}

export interface RolloutEvent {
  timestamp: Date;
  phase: RolloutPhase;
  trafficPercentage: number;
  message: string;
  metrics?: RolloutSuccessMetrics;
  success: boolean;
}

/**
 * In-memory storage for rollout states
 * In production, this should use a database
 */
class RolloutStateStore {
  private states: Map<string, RolloutState> = new Map();

  save(state: RolloutState): void {
    this.states.set(state.id, state);
  }

  get(id: string): RolloutState | undefined {
    return this.states.get(id);
  }

  getByTenant(tenantId: string): RolloutState | undefined {
    return Array.from(this.states.values()).find(s => s.tenantId === tenantId);
  }

  delete(id: string): void {
    this.states.delete(id);
  }

  clear(): void {
    this.states.clear();
  }
}

const rolloutStateStore = new RolloutStateStore();

/**
 * Canary Rollout Manager
 */
export class CanaryRolloutManager {
  private registry: ModelRegistry;

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  /**
   * Start a new canary rollout
   */
  async startRollout(config: RolloutConfig): Promise<RolloutState> {
    // Check if there's already an active rollout for this tenant
    const existingRollout = rolloutStateStore.getByTenant(config.tenantId);
    if (existingRollout && existingRollout.currentPhase !== 'complete' && existingRollout.currentPhase !== 'aborted') {
      throw new Error(`Rollout already in progress for tenant ${config.tenantId}`);
    }

    const state: RolloutState = {
      id: `rollout-${config.tenantId}-${Date.now()}`,
      tenantId: config.tenantId,
      currentPhase: 'phase1',
      trafficPercentage: config.phase1Percentage,
      startedAt: new Date(),
      phaseStartedAt: new Date(),
      baselineMetrics: null,
      currentMetrics: null,
      events: [],
      config,
    };

    // Log start event
    this.logEvent(state, {
      timestamp: new Date(),
      phase: 'phase1',
      trafficPercentage: config.phase1Percentage,
      message: `Starting canary rollout: ${config.phase1Percentage}% traffic to new override`,
      success: true,
    });

    rolloutStateStore.save(state);

    console.info(`[CanaryRollout] Started rollout ${state.id} for tenant ${config.tenantId} at ${config.phase1Percentage}%`);

    return state;
  }

  /**
   * Route traffic based on canary percentage
   * Returns true if request should use new override, false for current override
   */
  shouldUseNewOverride(tenantId: string, requestId: string): boolean {
    const rollout = rolloutStateStore.getByTenant(tenantId);

    if (!rollout || rollout.currentPhase === 'complete' || rollout.currentPhase === 'aborted') {
      return false; // No active rollout
    }

    // Use hash-based routing for consistent assignment
    const hash = this.hashString(requestId);
    const percentage = (hash % 100) + 1;

    return percentage <= rollout.trafficPercentage;
  }

  /**
   * Evaluate current phase and decide whether to promote
   */
  async evaluatePhase(
    rolloutId: string,
    currentMetrics: RolloutSuccessMetrics
  ): Promise<{ shouldPromote: boolean; reason: string }> {
    const state = rolloutStateStore.get(rolloutId);

    if (!state) {
      throw new Error(`Rollout ${rolloutId} not found`);
    }

    // Set baseline on first evaluation
    if (!state.baselineMetrics) {
      state.baselineMetrics = currentMetrics;
      rolloutStateStore.save(state);
      return {
        shouldPromote: false,
        reason: 'Baseline metrics set, waiting for evaluation window',
      };
    }

    // Update current metrics
    state.currentMetrics = currentMetrics;
    rolloutStateStore.save(state);

    // Check evaluation window
    const phaseElapsed = Date.now() - state.phaseStartedAt.getTime();
    if (phaseElapsed < state.config.evaluationWindow) {
      return {
        shouldPromote: false,
        reason: `Waiting for evaluation window (${Math.round(phaseElapsed / 1000)}s / ${Math.round(state.config.evaluationWindow / 1000)}s)`,
      };
    }

    // Check success criteria
    const accuracyDrop = state.baselineMetrics.accuracy - currentMetrics.accuracy;
    const latencyIncrease = (currentMetrics.latency - state.baselineMetrics.latency) / state.baselineMetrics.latency;
    const costIncrease = (currentMetrics.cost - state.baselineMetrics.cost) / state.baselineMetrics.cost;

    console.info(`[CanaryRollout] Evaluating ${rolloutId} (${state.currentPhase}):`);
    console.info(`  Accuracy drop: ${(accuracyDrop * 100).toFixed(2)}% (threshold: ${(state.config.maxAccuracyDrop * 100).toFixed(2)}%)`);
    console.info(`  Latency increase: ${(latencyIncrease * 100).toFixed(2)}% (threshold: ${(state.config.maxLatencyIncrease * 100).toFixed(2)}%)`);
    console.info(`  Cost increase: ${(costIncrease * 100).toFixed(2)}% (threshold: ${(state.config.maxCostIncrease * 100).toFixed(2)}%)`);

    // Check if any criteria failed
    if (accuracyDrop > state.config.maxAccuracyDrop) {
      return {
        shouldPromote: false,
        reason: `Accuracy dropped by ${(accuracyDrop * 100).toFixed(2)}% (threshold: ${(state.config.maxAccuracyDrop * 100).toFixed(2)}%)`,
      };
    }

    if (latencyIncrease > state.config.maxLatencyIncrease) {
      return {
        shouldPromote: false,
        reason: `Latency increased by ${(latencyIncrease * 100).toFixed(2)}% (threshold: ${(state.config.maxLatencyIncrease * 100).toFixed(2)}%)`,
      };
    }

    if (costIncrease > state.config.maxCostIncrease) {
      return {
        shouldPromote: false,
        reason: `Cost increased by ${(costIncrease * 100).toFixed(2)}% (threshold: ${(state.config.maxCostIncrease * 100).toFixed(2)}%)`,
      };
    }

    // All criteria passed
    return {
      shouldPromote: true,
      reason: 'All success criteria met',
    };
  }

  /**
   * Promote to next phase
   */
  async promotePhase(rolloutId: string): Promise<RolloutState> {
    const state = rolloutStateStore.get(rolloutId);

    if (!state) {
      throw new Error(`Rollout ${rolloutId} not found`);
    }

    let nextPhase: RolloutPhase;
    let nextPercentage: number;

    switch (state.currentPhase) {
      case 'phase1':
        nextPhase = 'phase2';
        nextPercentage = state.config.phase2Percentage;
        break;
      case 'phase2':
        nextPhase = 'phase3';
        nextPercentage = state.config.phase3Percentage;
        break;
      case 'phase3':
        nextPhase = 'complete';
        nextPercentage = 100;

        // Save new override to registry
        this.registry.save(state.config.newOverride);
        break;
      default:
        throw new Error(`Cannot promote from phase ${state.currentPhase}`);
    }

    state.currentPhase = nextPhase;
    state.trafficPercentage = nextPercentage;
    state.phaseStartedAt = new Date();

    this.logEvent(state, {
      timestamp: new Date(),
      phase: nextPhase,
      trafficPercentage: nextPercentage,
      message: nextPhase === 'complete'
        ? 'Rollout complete, new override saved to registry'
        : `Promoted to ${nextPhase}: ${nextPercentage}% traffic`,
      metrics: state.currentMetrics || undefined,
      success: true,
    });

    rolloutStateStore.save(state);

    console.info(`[CanaryRollout] Promoted ${rolloutId} to ${nextPhase} (${nextPercentage}%)`);

    return state;
  }

  /**
   * Abort rollout and trigger rollback
   */
  async abortRollout(rolloutId: string, reason: string): Promise<RolloutState> {
    const state = rolloutStateStore.get(rolloutId);

    if (!state) {
      throw new Error(`Rollout ${rolloutId} not found`);
    }

    state.currentPhase = 'aborted';
    state.trafficPercentage = 0;

    this.logEvent(state, {
      timestamp: new Date(),
      phase: 'aborted',
      trafficPercentage: 0,
      message: `Rollout aborted: ${reason}`,
      metrics: state.currentMetrics || undefined,
      success: false,
    });

    rolloutStateStore.save(state);

    console.warn(`[CanaryRollout] Aborted ${rolloutId}: ${reason}`);

    return state;
  }

  /**
   * Get rollout state
   */
  getRolloutState(rolloutId: string): RolloutState | undefined {
    return rolloutStateStore.get(rolloutId);
  }

  /**
   * Get rollout state by tenant
   */
  getTenantRollout(tenantId: string): RolloutState | undefined {
    return rolloutStateStore.getByTenant(tenantId);
  }

  /**
   * Log an event to the rollout state
   */
  private logEvent(state: RolloutState, event: RolloutEvent): void {
    state.events.push(event);
    console.info(`[CanaryRollout] ${state.id} | ${event.phase} | ${event.message}`);
  }

  /**
   * Simple hash function for consistent routing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear all rollout states (for testing)
   */
  clear(): void {
    rolloutStateStore.clear();
  }
}

/**
 * Create default rollout configuration
 */
export function createDefaultRolloutConfig(
  tenantId: string,
  newOverride: TenantOverride,
  previousOverride: TenantOverride | null
): RolloutConfig {
  return {
    tenantId,
    newOverride,
    previousOverride,
    phase1Percentage: 10,
    phase2Percentage: 50,
    phase3Percentage: 100,
    evaluationWindow: 3600000, // 1 hour
    maxAccuracyDrop: 0.05, // 5%
    maxLatencyIncrease: 0.2, // 20%
    maxCostIncrease: 0.3, // 30%
  };
}

/**
 * Auto-promotion loop (should be run as a background job)
 */
export async function autoPromoteLoop(
  manager: CanaryRolloutManager,
  getMetrics: (tenantId: string) => Promise<RolloutSuccessMetrics>,
  intervalMs: number = 60000 // Check every minute
): Promise<void> {
  setInterval(async () => {
    // This is a simplified implementation
    // In production, you would query for all active rollouts from a database
    console.info('[CanaryRollout] Auto-promotion check (not implemented - requires DB query for active rollouts)');
  }, intervalMs);
}
