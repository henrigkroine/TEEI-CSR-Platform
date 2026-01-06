/**
 * Budget Manager
 * Tracks budgets, enforces limits, detects anomalies
 */

import type { BudgetConfig, UsageMetric, AnomalyAlert } from '../types/index.js';
import { randomUUID } from 'crypto';

interface BudgetStore {
  get(tenantId: string): Promise<BudgetConfig | null>;
  set(config: BudgetConfig): Promise<void>;
  delete(tenantId: string): Promise<void>;
}

interface UsageStore {
  getHistory(tenantId: string, windowDays: number): Promise<UsageMetric[]>;
  recordUsage(metric: UsageMetric): Promise<void>;
}

interface AlertSink {
  sendAlert(alert: AnomalyAlert): Promise<void>;
}

export class BudgetManager {
  constructor(
    private budgetStore: BudgetStore,
    private usageStore: UsageStore,
    private alertSink: AlertSink,
  ) {}

  /**
   * Set budget for a tenant
   */
  async setBudget(config: Omit<BudgetConfig, 'createdAt' | 'updatedAt'>): Promise<BudgetConfig> {
    const now = new Date().toISOString();
    const fullConfig: BudgetConfig = {
      ...config,
      createdAt: now,
      updatedAt: now,
    };

    await this.budgetStore.set(fullConfig);
    return fullConfig;
  }

  /**
   * Check if usage is within budget and trigger alerts
   */
  async checkBudget(tenantId: string, currentUsage: UsageMetric): Promise<{
    withinBudget: boolean;
    utilizationPercent: number;
    shouldThrottle: boolean;
    shouldHardStop: boolean;
    alertLevel: 'none' | 'warning' | 'critical' | 'exceeded';
  }> {
    const budget = await this.budgetStore.get(tenantId);

    if (!budget) {
      return {
        withinBudget: true,
        utilizationPercent: 0,
        shouldThrottle: false,
        shouldHardStop: false,
        alertLevel: 'none',
      };
    }

    const utilizationPercent = (currentUsage.totalCostUSD / budget.monthlyLimitUSD) * 100;

    let alertLevel: 'none' | 'warning' | 'critical' | 'exceeded' = 'none';
    if (utilizationPercent >= budget.alerts.exceeded) {
      alertLevel = 'exceeded';
    } else if (utilizationPercent >= budget.alerts.critical) {
      alertLevel = 'critical';
    } else if (utilizationPercent >= budget.alerts.warning) {
      alertLevel = 'warning';
    }

    const shouldThrottle = utilizationPercent >= budget.enforcement.throttleAt;
    const shouldHardStop = utilizationPercent >= budget.enforcement.hardStopAt;

    return {
      withinBudget: utilizationPercent < 100,
      utilizationPercent,
      shouldThrottle,
      shouldHardStop,
      alertLevel,
    };
  }

  /**
   * Detect usage anomalies using statistical analysis
   * Uses rolling mean and standard deviation to identify outliers
   */
  async detectAnomalies(tenantId: string, currentUsage: UsageMetric): Promise<AnomalyAlert[]> {
    const budget = await this.budgetStore.get(tenantId);

    if (!budget || !budget.anomalyDetection.enabled) {
      return [];
    }

    // Get historical usage for baseline calculation
    const history = await this.usageStore.getHistory(tenantId, budget.anomalyDetection.windowDays);

    if (history.length < 7) {
      // Need at least 7 days of history for meaningful anomaly detection
      return [];
    }

    const alerts: AnomalyAlert[] = [];
    const metrics = [
      { key: 'ai_tokens', getValue: (m: UsageMetric) => m.ai.inputTokens + m.ai.outputTokens },
      { key: 'compute', getValue: (m: UsageMetric) => m.infra.computeHours },
      { key: 'storage', getValue: (m: UsageMetric) => m.infra.storageGB },
      { key: 'bandwidth', getValue: (m: UsageMetric) => m.infra.bandwidthGB },
      { key: 'total_cost', getValue: (m: UsageMetric) => m.totalCostUSD },
    ] as const;

    for (const metric of metrics) {
      const values = history.map(metric.getValue);
      const currentValue = metric.getValue(currentUsage);

      const stats = this.calculateStats(values);
      const deviation = (currentValue - stats.mean) / stats.stdDev;

      // Alert if deviation exceeds threshold (default: 2.5 std deviations)
      if (Math.abs(deviation) > budget.anomalyDetection.stdDevThreshold) {
        const percentileRank = this.calculatePercentile(values, currentValue);
        const severity = this.calculateSeverity(deviation);

        alerts.push({
          alertId: randomUUID(),
          tenantId,
          detectedAt: new Date().toISOString(),
          metric: metric.key,
          currentValue,
          expectedValue: stats.mean,
          deviation,
          severity,
          context: {
            rollingMean: stats.mean,
            rollingStdDev: stats.stdDev,
            percentileRank,
          },
          resolved: false,
        });
      }
    }

    // Send alerts via sink (Slack, PagerDuty, etc.)
    for (const alert of alerts) {
      await this.alertSink.sendAlert(alert);
    }

    return alerts;
  }

  /**
   * Calculate rolling statistics (mean, std dev)
   */
  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
  }

  /**
   * Calculate percentile rank (0-100)
   */
  private calculatePercentile(values: number[], target: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex((v) => v >= target);
    if (index === -1) return 100;
    return (index / sorted.length) * 100;
  }

  /**
   * Calculate severity based on deviation magnitude
   */
  private calculateSeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    const abs = Math.abs(deviation);
    if (abs > 4) return 'critical'; // > 4 std deviations
    if (abs > 3) return 'high';      // 3-4 std deviations
    if (abs > 2.5) return 'medium';  // 2.5-3 std deviations
    return 'low';                    // 2-2.5 std deviations
  }

  /**
   * Get budget utilization report
   */
  async getUtilizationReport(tenantId: string): Promise<{
    budget: BudgetConfig | null;
    currentMonth: {
      usage: UsageMetric[];
      totalCostUSD: number;
      utilizationPercent: number;
    };
    forecast: {
      projectedMonthlyUSD: number;
      daysRemaining: number;
      onTrackToExceed: boolean;
    };
  } | null> {
    const budget = await this.budgetStore.get(tenantId);
    if (!budget) return null;

    // Get current month usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = await this.usageStore.getHistory(tenantId, 30);

    const currentMonthUsage = usage.filter(
      (m) => new Date(m.periodStart) >= monthStart
    );

    const totalCostUSD = currentMonthUsage.reduce((sum, m) => sum + m.totalCostUSD, 0);
    const utilizationPercent = (totalCostUSD / budget.monthlyLimitUSD) * 100;

    // Forecast based on daily burn rate
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    const dailyBurnRate = totalCostUSD / dayOfMonth;
    const projectedMonthlyUSD = dailyBurnRate * daysInMonth;
    const onTrackToExceed = projectedMonthlyUSD > budget.monthlyLimitUSD;

    return {
      budget,
      currentMonth: {
        usage: currentMonthUsage,
        totalCostUSD,
        utilizationPercent,
      },
      forecast: {
        projectedMonthlyUSD,
        daysRemaining,
        onTrackToExceed,
      },
    };
  }
}

/**
 * In-memory budget store (production would use PostgreSQL)
 */
export class InMemoryBudgetStore implements BudgetStore {
  private budgets = new Map<string, BudgetConfig>();

  async get(tenantId: string): Promise<BudgetConfig | null> {
    return this.budgets.get(tenantId) || null;
  }

  async set(config: BudgetConfig): Promise<void> {
    this.budgets.set(config.tenantId, config);
  }

  async delete(tenantId: string): Promise<void> {
    this.budgets.delete(tenantId);
  }
}

/**
 * In-memory usage store (production would use TimescaleDB)
 */
export class InMemoryUsageStore implements UsageStore {
  private usage = new Map<string, UsageMetric[]>();

  async getHistory(tenantId: string, windowDays: number): Promise<UsageMetric[]> {
    const all = this.usage.get(tenantId) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    return all.filter((m) => new Date(m.periodStart) >= cutoff);
  }

  async recordUsage(metric: UsageMetric): Promise<void> {
    const existing = this.usage.get(metric.tenantId) || [];
    existing.push(metric);
    this.usage.set(metric.tenantId, existing);
  }
}

/**
 * Console alert sink (production would integrate with Slack/PagerDuty)
 */
export class ConsoleAlertSink implements AlertSink {
  async sendAlert(alert: AnomalyAlert): Promise<void> {
    console.warn('[BILLING ANOMALY]', {
      tenantId: alert.tenantId,
      metric: alert.metric,
      severity: alert.severity,
      deviation: `${alert.deviation.toFixed(2)}σ`,
      current: alert.currentValue,
      expected: alert.expectedValue,
    });
  }
}
