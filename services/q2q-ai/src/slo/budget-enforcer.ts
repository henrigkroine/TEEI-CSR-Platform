/**
 * Budget Enforcer
 * Tracks per-tenant spend and enforces monthly/daily budgets
 */

import { createServiceLogger } from '@teei/shared-utils';
import { getRegistry } from '@teei/model-registry';
import Redis from 'ioredis';

const logger = createServiceLogger('budget-enforcer');

export interface BudgetConfig {
  /** Monthly budget in USD */
  monthlyBudget: number;
  /** Daily budget in USD (optional, calculated from monthly if not set) */
  dailyBudget?: number;
  /** Allow override when budget exceeded */
  allowOverride: boolean;
  /** Warning thresholds (e.g., [0.8, 0.9] for 80%, 90%) */
  warningThresholds: number[];
}

export interface BudgetStatus {
  tenantId: string;
  period: 'daily' | 'monthly';
  budget: number;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  exceeded: boolean;
  warnings: string[];
}

export interface BudgetEvent {
  tenantId: string;
  eventType: 'warning' | 'exceeded' | 'blocked' | 'override';
  threshold?: number;
  budget: number;
  spent: number;
  timestamp: Date;
  requestId?: string;
}

/**
 * Budget Enforcer Service
 * Uses Redis for distributed tracking, falls back to in-memory
 */
export class BudgetEnforcer {
  private redis: Redis | null = null;
  private inMemoryStore: Map<string, { daily: number; monthly: number; lastReset: Date }> = new Map();
  private eventLog: BudgetEvent[] = [];
  private lastWarnings: Map<string, Set<number>> = new Map(); // Track which warnings we've already sent

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        logger.info('Budget enforcer initialized with Redis');
      } catch (error) {
        logger.error('Failed to connect to Redis, using in-memory fallback:', error);
      }
    } else {
      logger.info('Budget enforcer initialized with in-memory storage');
    }
  }

  /**
   * Check if request is allowed based on budget
   */
  async checkBudget(params: {
    tenantId: string;
    estimatedCost: number;
    requestId?: string;
  }): Promise<{ allowed: boolean; status: BudgetStatus; reason?: string }> {
    const { tenantId, estimatedCost, requestId } = params;

    // Get budget config from registry
    const config = this.getBudgetConfig(tenantId);

    // Get current spend
    const monthlyStatus = await this.getStatus(tenantId, 'monthly', config);
    const dailyStatus = await this.getStatus(tenantId, 'daily', config);

    // Check if adding this cost would exceed budget
    const wouldExceedMonthly = (monthlyStatus.spent + estimatedCost) > monthlyStatus.budget;
    const wouldExceedDaily = (dailyStatus.spent + estimatedCost) > dailyStatus.budget;

    // Check monthly budget
    if (wouldExceedMonthly) {
      const event: BudgetEvent = {
        tenantId,
        eventType: config.allowOverride ? 'exceeded' : 'blocked',
        budget: monthlyStatus.budget,
        spent: monthlyStatus.spent + estimatedCost,
        timestamp: new Date(),
        requestId,
      };
      this.logEvent(event);

      if (!config.allowOverride) {
        return {
          allowed: false,
          status: monthlyStatus,
          reason: `Monthly budget exceeded: $${monthlyStatus.spent.toFixed(4)} / $${monthlyStatus.budget.toFixed(2)}`,
        };
      }

      logger.warn(`Monthly budget exceeded for tenant ${tenantId}, but override allowed`);
    }

    // Check daily budget
    if (wouldExceedDaily) {
      const event: BudgetEvent = {
        tenantId,
        eventType: config.allowOverride ? 'exceeded' : 'blocked',
        budget: dailyStatus.budget,
        spent: dailyStatus.spent + estimatedCost,
        timestamp: new Date(),
        requestId,
      };
      this.logEvent(event);

      if (!config.allowOverride) {
        return {
          allowed: false,
          status: dailyStatus,
          reason: `Daily budget exceeded: $${dailyStatus.spent.toFixed(4)} / $${dailyStatus.budget.toFixed(2)}`,
        };
      }

      logger.warn(`Daily budget exceeded for tenant ${tenantId}, but override allowed`);
    }

    // Check warning thresholds
    await this.checkWarnings(tenantId, monthlyStatus, config, requestId);

    return {
      allowed: true,
      status: monthlyStatus,
    };
  }

  /**
   * Track actual spend after request completion
   */
  async trackSpend(params: {
    tenantId: string;
    cost: number;
    requestId?: string;
  }): Promise<void> {
    const { tenantId, cost, requestId } = params;

    if (this.redis) {
      await this.trackSpendRedis(tenantId, cost);
    } else {
      await this.trackSpendMemory(tenantId, cost);
    }

    logger.info(`Tracked spend for tenant ${tenantId}: $${cost.toFixed(6)}`, { requestId });

    // Re-check warnings after tracking
    const config = this.getBudgetConfig(tenantId);
    const status = await this.getStatus(tenantId, 'monthly', config);
    await this.checkWarnings(tenantId, status, config, requestId);
  }

  /**
   * Get current budget status
   */
  async getStatus(tenantId: string, period: 'daily' | 'monthly', config?: BudgetConfig): Promise<BudgetStatus> {
    if (!config) {
      config = this.getBudgetConfig(tenantId);
    }

    const budget = period === 'monthly' ? config.monthlyBudget : (config.dailyBudget || config.monthlyBudget / 30);
    let spent = 0;

    if (this.redis) {
      spent = await this.getSpendRedis(tenantId, period);
    } else {
      spent = await this.getSpendMemory(tenantId, period);
    }

    const remaining = Math.max(0, budget - spent);
    const utilizationPercent = (spent / budget) * 100;
    const exceeded = spent > budget;

    const warnings: string[] = [];
    for (const threshold of config.warningThresholds) {
      if (utilizationPercent >= threshold * 100) {
        warnings.push(`${(threshold * 100).toFixed(0)}% threshold exceeded`);
      }
    }

    return {
      tenantId,
      period,
      budget,
      spent,
      remaining,
      utilizationPercent,
      exceeded,
      warnings,
    };
  }

  /**
   * Get all budget events (for reporting)
   */
  getEvents(tenantId?: string, limit: number = 100): BudgetEvent[] {
    let events = this.eventLog;

    if (tenantId) {
      events = events.filter(e => e.tenantId === tenantId);
    }

    return events.slice(-limit);
  }

  /**
   * Reset monthly budget (called by cron)
   */
  async resetMonthlyBudgets(): Promise<void> {
    if (this.redis) {
      const pattern = 'budget:*:monthly';
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      logger.info(`Reset ${keys.length} monthly budgets in Redis`);
    } else {
      for (const [tenantId, data] of this.inMemoryStore.entries()) {
        data.monthly = 0;
        data.lastReset = new Date();
      }
      logger.info(`Reset ${this.inMemoryStore.size} monthly budgets in memory`);
    }
  }

  /**
   * Reset daily budgets (called by cron)
   */
  async resetDailyBudgets(): Promise<void> {
    if (this.redis) {
      const pattern = 'budget:*:daily';
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      logger.info(`Reset ${keys.length} daily budgets in Redis`);
    } else {
      for (const [tenantId, data] of this.inMemoryStore.entries()) {
        data.daily = 0;
      }
      logger.info(`Reset ${this.inMemoryStore.size} daily budgets in memory`);
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getBudgetConfig(tenantId: string): BudgetConfig {
    try {
      const registry = getRegistry();
      const config = registry.getConfig(tenantId);

      const monthlyBudget = config.guardrails.maxCostPerRequest
        ? config.guardrails.maxCostPerRequest * 1000 // Estimate monthly from per-request
        : 1000; // Default $1000/month

      return {
        monthlyBudget,
        dailyBudget: monthlyBudget / 30,
        allowOverride: false, // Strict enforcement
        warningThresholds: [0.8, 0.9], // 80%, 90%
      };
    } catch (error) {
      logger.error(`Failed to get budget config for tenant ${tenantId}, using defaults:`, error);
      return {
        monthlyBudget: 1000,
        dailyBudget: 1000 / 30,
        allowOverride: false,
        warningThresholds: [0.8, 0.9],
      };
    }
  }

  private async checkWarnings(
    tenantId: string,
    status: BudgetStatus,
    config: BudgetConfig,
    requestId?: string
  ): Promise<void> {
    const currentWarnings = this.lastWarnings.get(tenantId) || new Set<number>();

    for (const threshold of config.warningThresholds) {
      const thresholdPercent = threshold * 100;

      // Only emit warning if we just crossed this threshold
      if (status.utilizationPercent >= thresholdPercent && !currentWarnings.has(thresholdPercent)) {
        const event: BudgetEvent = {
          tenantId,
          eventType: 'warning',
          threshold,
          budget: status.budget,
          spent: status.spent,
          timestamp: new Date(),
          requestId,
        };
        this.logEvent(event);

        logger.warn(
          `Budget warning for tenant ${tenantId}: ${thresholdPercent}% threshold reached ` +
          `($${status.spent.toFixed(4)} / $${status.budget.toFixed(2)})`
        );

        currentWarnings.add(thresholdPercent);
      }
    }

    this.lastWarnings.set(tenantId, currentWarnings);

    // Reset warnings if we're back under 80%
    if (status.utilizationPercent < 80) {
      this.lastWarnings.delete(tenantId);
    }
  }

  private logEvent(event: BudgetEvent): void {
    this.eventLog.push(event);

    // Keep only last 10000 events
    if (this.eventLog.length > 10000) {
      this.eventLog = this.eventLog.slice(-10000);
    }

    logger.info('Budget event logged', {
      tenantId: event.tenantId,
      eventType: event.eventType,
      threshold: event.threshold,
      spent: event.spent,
      budget: event.budget,
    });
  }

  // Redis implementations
  private async trackSpendRedis(tenantId: string, cost: number): Promise<void> {
    if (!this.redis) return;

    const monthlyKey = `budget:${tenantId}:monthly`;
    const dailyKey = `budget:${tenantId}:daily`;

    const pipeline = this.redis.pipeline();
    pipeline.incrbyfloat(monthlyKey, cost);
    pipeline.incrbyfloat(dailyKey, cost);

    // Set TTL: monthly expires in 35 days, daily in 2 days
    pipeline.expire(monthlyKey, 35 * 24 * 60 * 60);
    pipeline.expire(dailyKey, 2 * 24 * 60 * 60);

    await pipeline.exec();
  }

  private async getSpendRedis(tenantId: string, period: 'daily' | 'monthly'): Promise<number> {
    if (!this.redis) return 0;

    const key = `budget:${tenantId}:${period}`;
    const value = await this.redis.get(key);
    return value ? parseFloat(value) : 0;
  }

  // In-memory implementations
  private async trackSpendMemory(tenantId: string, cost: number): Promise<void> {
    const data = this.inMemoryStore.get(tenantId) || {
      daily: 0,
      monthly: 0,
      lastReset: new Date(),
    };

    data.daily += cost;
    data.monthly += cost;

    this.inMemoryStore.set(tenantId, data);
  }

  private async getSpendMemory(tenantId: string, period: 'daily' | 'monthly'): Promise<number> {
    const data = this.inMemoryStore.get(tenantId);
    if (!data) return 0;

    return period === 'monthly' ? data.monthly : data.daily;
  }
}

/**
 * Singleton instance
 */
let budgetEnforcer: BudgetEnforcer | null = null;

export function getBudgetEnforcer(redisUrl?: string): BudgetEnforcer {
  if (!budgetEnforcer) {
    budgetEnforcer = new BudgetEnforcer(redisUrl || process.env.REDIS_URL);
  }
  return budgetEnforcer;
}

export function resetBudgetEnforcer(): void {
  budgetEnforcer = null;
}
