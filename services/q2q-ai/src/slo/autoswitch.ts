/**
 * Model Auto-Switcher
 * Automatically switches models based on cost and latency SLOs
 */

import { createServiceLogger } from '@teei/shared-utils';
import { getRegistry } from '@teei/model-registry';

const logger = createServiceLogger('model-autoswitch');

export interface SLOThresholds {
  /** Maximum cost per request in USD */
  maxCostPerRequest: number;
  /** Maximum p95 latency in milliseconds */
  maxLatencyP95Ms: number;
  /** Minimum requests before switching (to avoid noise) */
  minSampleSize: number;
}

export interface ModelTier {
  model: string;
  tier: 'expensive' | 'standard' | 'cheap';
  estimatedCostPer1kTokens: number;
  estimatedLatencyMs: number;
}

export interface SwitchEvent {
  tenantId: string;
  timestamp: Date;
  fromModel: string;
  toModel: string;
  reason: 'cost_exceeded' | 'latency_exceeded' | 'manual' | 'recovered';
  trigger: {
    currentValue: number;
    threshold: number;
    metric: 'cost' | 'latency';
  };
}

export interface AutoswitchStatus {
  tenantId: string;
  currentModel: string;
  currentTier: ModelTier['tier'];
  sloCompliant: boolean;
  metrics: {
    avgCostPerRequest: number;
    latencyP95Ms: number;
    sampleSize: number;
  };
  hysteresis: {
    switchCooldownMs: number;
    lastSwitchTime?: Date;
    canSwitch: boolean;
  };
}

/**
 * Model Auto-Switcher Service
 * Monitors cost and latency, auto-switches to cheaper/faster models
 */
export class ModelAutoSwitcher {
  private latencyBuffer: Map<string, number[]> = new Map(); // tenantId -> latencies
  private costBuffer: Map<string, number[]> = new Map(); // tenantId -> costs
  private currentModels: Map<string, string> = new Map(); // tenantId -> model
  private lastSwitchTime: Map<string, Date> = new Map(); // tenantId -> timestamp
  private switchEvents: SwitchEvent[] = [];

  // Hysteresis settings to prevent flapping
  private readonly SWITCH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  private readonly RECOVERY_MULTIPLIER = 0.8; // Must drop to 80% of threshold to recover

  // Model tiers (ordered from expensive to cheap)
  private readonly MODEL_TIERS: ModelTier[] = [
    {
      model: 'gpt-4o',
      tier: 'expensive',
      estimatedCostPer1kTokens: 0.015,
      estimatedLatencyMs: 2000,
    },
    {
      model: 'claude-3-5-sonnet-20241022',
      tier: 'standard',
      estimatedCostPer1kTokens: 0.008,
      estimatedLatencyMs: 1800,
    },
    {
      model: 'gpt-4o-mini',
      tier: 'cheap',
      estimatedCostPer1kTokens: 0.0002,
      estimatedLatencyMs: 1200,
    },
    {
      model: 'gemini-1.5-flash',
      tier: 'cheap',
      estimatedCostPer1kTokens: 0.00015,
      estimatedLatencyMs: 1000,
    },
  ];

  constructor() {
    logger.info('Model auto-switcher initialized');
  }

  /**
   * Record metrics for a request
   */
  recordMetrics(params: {
    tenantId: string;
    cost: number;
    latencyMs: number;
    model: string;
  }): void {
    const { tenantId, cost, latencyMs, model } = params;

    // Initialize buffers if needed
    if (!this.latencyBuffer.has(tenantId)) {
      this.latencyBuffer.set(tenantId, []);
    }
    if (!this.costBuffer.has(tenantId)) {
      this.costBuffer.set(tenantId, []);
    }
    if (!this.currentModels.has(tenantId)) {
      this.currentModels.set(tenantId, model);
    }

    // Add to buffers (keep last 100 requests)
    const latencies = this.latencyBuffer.get(tenantId)!;
    const costs = this.costBuffer.get(tenantId)!;

    latencies.push(latencyMs);
    costs.push(cost);

    if (latencies.length > 100) latencies.shift();
    if (costs.length > 100) costs.shift();

    logger.debug(`Recorded metrics for tenant ${tenantId}: cost=$${cost.toFixed(6)}, latency=${latencyMs}ms`);
  }

  /**
   * Check SLOs and auto-switch if needed
   */
  async checkAndSwitch(tenantId: string): Promise<{ switched: boolean; event?: SwitchEvent }> {
    const thresholds = this.getSLOThresholds(tenantId);
    const status = this.getStatus(tenantId);

    // Check if we have enough samples
    if (status.metrics.sampleSize < thresholds.minSampleSize) {
      logger.debug(`Not enough samples for tenant ${tenantId}: ${status.metrics.sampleSize}/${thresholds.minSampleSize}`);
      return { switched: false };
    }

    // Check if we're in cooldown period
    if (!status.hysteresis.canSwitch) {
      const timeSinceSwitch = Date.now() - (status.hysteresis.lastSwitchTime?.getTime() || 0);
      logger.debug(`Tenant ${tenantId} in cooldown: ${timeSinceSwitch}ms / ${status.hysteresis.switchCooldownMs}ms`);
      return { switched: false };
    }

    // Check cost SLO
    if (status.metrics.avgCostPerRequest > thresholds.maxCostPerRequest) {
      logger.warn(
        `Cost SLO violated for tenant ${tenantId}: ` +
        `$${status.metrics.avgCostPerRequest.toFixed(6)} > $${thresholds.maxCostPerRequest.toFixed(6)}`
      );

      const event = await this.switchToNextCheaperModel(tenantId, {
        currentValue: status.metrics.avgCostPerRequest,
        threshold: thresholds.maxCostPerRequest,
        metric: 'cost',
      });

      if (event) {
        return { switched: true, event };
      }
    }

    // Check latency SLO
    if (status.metrics.latencyP95Ms > thresholds.maxLatencyP95Ms) {
      logger.warn(
        `Latency SLO violated for tenant ${tenantId}: ` +
        `${status.metrics.latencyP95Ms.toFixed(0)}ms > ${thresholds.maxLatencyP95Ms}ms`
      );

      const event = await this.switchToNextCheaperModel(tenantId, {
        currentValue: status.metrics.latencyP95Ms,
        threshold: thresholds.maxLatencyP95Ms,
        metric: 'latency',
      });

      if (event) {
        return { switched: true, event };
      }
    }

    // Check if we can recover to a better model
    const canRecover = this.canRecoverToExpensiveModel(tenantId, thresholds);
    if (canRecover) {
      const event = await this.recoverToExpensiveModel(tenantId, thresholds);
      if (event) {
        return { switched: true, event };
      }
    }

    return { switched: false };
  }

  /**
   * Get current auto-switch status
   */
  getStatus(tenantId: string): AutoswitchStatus {
    const latencies = this.latencyBuffer.get(tenantId) || [];
    const costs = this.costBuffer.get(tenantId) || [];
    const currentModel = this.currentModels.get(tenantId) || 'gpt-4o-mini';
    const lastSwitch = this.lastSwitchTime.get(tenantId);

    const sampleSize = Math.min(latencies.length, costs.length);
    const avgCostPerRequest = sampleSize > 0
      ? costs.reduce((a, b) => a + b, 0) / costs.length
      : 0;

    const latencyP95Ms = sampleSize > 0
      ? this.calculateP95(latencies)
      : 0;

    const thresholds = this.getSLOThresholds(tenantId);
    const sloCompliant =
      avgCostPerRequest <= thresholds.maxCostPerRequest &&
      latencyP95Ms <= thresholds.maxLatencyP95Ms;

    const timeSinceSwitch = lastSwitch
      ? Date.now() - lastSwitch.getTime()
      : this.SWITCH_COOLDOWN_MS + 1;

    const canSwitch = timeSinceSwitch >= this.SWITCH_COOLDOWN_MS;

    const currentTier = this.MODEL_TIERS.find(t => t.model === currentModel)?.tier || 'standard';

    return {
      tenantId,
      currentModel,
      currentTier,
      sloCompliant,
      metrics: {
        avgCostPerRequest,
        latencyP95Ms,
        sampleSize,
      },
      hysteresis: {
        switchCooldownMs: this.SWITCH_COOLDOWN_MS,
        lastSwitchTime: lastSwitch,
        canSwitch,
      },
    };
  }

  /**
   * Get all switch events
   */
  getEvents(tenantId?: string, limit: number = 100): SwitchEvent[] {
    let events = this.switchEvents;

    if (tenantId) {
      events = events.filter(e => e.tenantId === tenantId);
    }

    return events.slice(-limit);
  }

  /**
   * Manually switch model for a tenant
   */
  async manualSwitch(tenantId: string, toModel: string): Promise<SwitchEvent> {
    const fromModel = this.currentModels.get(tenantId) || 'gpt-4o-mini';

    const event: SwitchEvent = {
      tenantId,
      timestamp: new Date(),
      fromModel,
      toModel,
      reason: 'manual',
      trigger: {
        currentValue: 0,
        threshold: 0,
        metric: 'cost',
      },
    };

    this.currentModels.set(tenantId, toModel);
    this.lastSwitchTime.set(tenantId, new Date());
    this.recordEvent(event);

    logger.info(`Manual switch for tenant ${tenantId}: ${fromModel} -> ${toModel}`);

    return event;
  }

  /**
   * Reset metrics for a tenant
   */
  resetMetrics(tenantId: string): void {
    this.latencyBuffer.delete(tenantId);
    this.costBuffer.delete(tenantId);
    logger.info(`Reset metrics for tenant ${tenantId}`);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getSLOThresholds(tenantId: string): SLOThresholds {
    try {
      const registry = getRegistry();
      const config = registry.getConfig(tenantId);

      return {
        maxCostPerRequest: config.guardrails.maxCostPerRequest || 0.5,
        maxLatencyP95Ms: 3000, // 3 seconds default
        minSampleSize: 10, // Need at least 10 requests
      };
    } catch (error) {
      logger.error(`Failed to get SLO thresholds for tenant ${tenantId}, using defaults:`, error);
      return {
        maxCostPerRequest: 0.5,
        maxLatencyP95Ms: 3000,
        minSampleSize: 10,
      };
    }
  }

  private async switchToNextCheaperModel(
    tenantId: string,
    trigger: SwitchEvent['trigger']
  ): Promise<SwitchEvent | null> {
    const currentModel = this.currentModels.get(tenantId) || 'gpt-4o-mini';
    const currentTier = this.MODEL_TIERS.find(t => t.model === currentModel);

    if (!currentTier) {
      logger.error(`Unknown current model: ${currentModel}`);
      return null;
    }

    // Find next cheaper model
    const currentIndex = this.MODEL_TIERS.indexOf(currentTier);
    const cheaperModels = this.MODEL_TIERS.slice(currentIndex + 1);

    if (cheaperModels.length === 0) {
      logger.warn(`Already at cheapest model for tenant ${tenantId}: ${currentModel}`);
      return null;
    }

    // Pick the first cheaper model
    const nextModel = cheaperModels[0].model;

    const event: SwitchEvent = {
      tenantId,
      timestamp: new Date(),
      fromModel: currentModel,
      toModel: nextModel,
      reason: trigger.metric === 'cost' ? 'cost_exceeded' : 'latency_exceeded',
      trigger,
    };

    this.currentModels.set(tenantId, nextModel);
    this.lastSwitchTime.set(tenantId, new Date());
    this.recordEvent(event);

    // Clear metrics to start fresh measurement
    this.resetMetrics(tenantId);

    logger.info(
      `Auto-switched tenant ${tenantId} from ${currentModel} to ${nextModel} ` +
      `(${trigger.metric} exceeded: ${trigger.currentValue.toFixed(4)} > ${trigger.threshold.toFixed(4)})`
    );

    return event;
  }

  private canRecoverToExpensiveModel(tenantId: string, thresholds: SLOThresholds): boolean {
    const status = this.getStatus(tenantId);

    // Can't recover if already at most expensive
    const currentTier = this.MODEL_TIERS.find(t => t.model === status.currentModel);
    if (!currentTier || currentTier.tier === 'expensive') {
      return false;
    }

    // Check if metrics are well below thresholds (80% of threshold)
    const costOk = status.metrics.avgCostPerRequest <= thresholds.maxCostPerRequest * this.RECOVERY_MULTIPLIER;
    const latencyOk = status.metrics.latencyP95Ms <= thresholds.maxLatencyP95Ms * this.RECOVERY_MULTIPLIER;

    return costOk && latencyOk && status.hysteresis.canSwitch;
  }

  private async recoverToExpensiveModel(tenantId: string, thresholds: SLOThresholds): Promise<SwitchEvent | null> {
    const currentModel = this.currentModels.get(tenantId) || 'gpt-4o-mini';
    const currentTier = this.MODEL_TIERS.find(t => t.model === currentModel);

    if (!currentTier) {
      return null;
    }

    // Find next more expensive model
    const currentIndex = this.MODEL_TIERS.indexOf(currentTier);
    if (currentIndex === 0) {
      return null; // Already at most expensive
    }

    const nextModel = this.MODEL_TIERS[currentIndex - 1].model;

    const event: SwitchEvent = {
      tenantId,
      timestamp: new Date(),
      fromModel: currentModel,
      toModel: nextModel,
      reason: 'recovered',
      trigger: {
        currentValue: 0,
        threshold: 0,
        metric: 'cost',
      },
    };

    this.currentModels.set(tenantId, nextModel);
    this.lastSwitchTime.set(tenantId, new Date());
    this.recordEvent(event);

    // Clear metrics to start fresh measurement
    this.resetMetrics(tenantId);

    logger.info(`Auto-recovered tenant ${tenantId} from ${currentModel} to ${nextModel} (metrics improved)`);

    return event;
  }

  private calculateP95(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index];
  }

  private recordEvent(event: SwitchEvent): void {
    this.switchEvents.push(event);

    // Keep only last 1000 events
    if (this.switchEvents.length > 1000) {
      this.switchEvents = this.switchEvents.slice(-1000);
    }

    logger.info('Switch event recorded', {
      tenantId: event.tenantId,
      fromModel: event.fromModel,
      toModel: event.toModel,
      reason: event.reason,
    });
  }
}

/**
 * Singleton instance
 */
let autoSwitcher: ModelAutoSwitcher | null = null;

export function getAutoSwitcher(): ModelAutoSwitcher {
  if (!autoSwitcher) {
    autoSwitcher = new ModelAutoSwitcher();
  }
  return autoSwitcher;
}

export function resetAutoSwitcher(): void {
  autoSwitcher = null;
}
