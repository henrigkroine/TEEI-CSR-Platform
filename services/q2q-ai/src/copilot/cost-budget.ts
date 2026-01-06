/**
 * Insights Copilot - Cost Budget Enforcement
 *
 * Per-tenant budget tracking and enforcement
 */

import Redis from 'ioredis';

export interface TenantBudget {
  companyId: string;
  monthlyBudgetUSD: number;
  dailyBudgetUSD: number;
  currentSpendUSD: number;
  spendToday: number;
  resetAt: Date;
  alerts: {
    threshold50: boolean;
    threshold75: boolean;
    threshold90: boolean;
  };
}

export interface CostRecord {
  id: string;
  companyId: string;
  service: 'nlq' | 'copilot' | 'classification';
  operation: string;
  tokensInput: number;
  tokensOutput: number;
  costUSD: number;
  timestamp: Date;
  userId: string;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  budget: TenantBudget;
  estimatedCost: number;
}

/**
 * Cost Budget Manager
 */
export class CostBudgetManager {
  private redis: Redis;

  // Default budgets (can be overridden per tenant)
  private static readonly DEFAULT_MONTHLY_BUDGET_USD = 1000;
  private static readonly DEFAULT_DAILY_BUDGET_USD = 50;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Check if operation is within budget
   */
  async checkBudget(
    companyId: string,
    estimatedCostUSD: number
  ): Promise<BudgetCheckResult> {
    const budget = await this.getTenantBudget(companyId);

    // Check daily budget
    if (budget.spendToday + estimatedCostUSD > budget.dailyBudgetUSD) {
      return {
        allowed: false,
        reason: `Daily budget exceeded. Spent $${budget.spendToday.toFixed(2)} of $${budget.dailyBudgetUSD.toFixed(2)} daily limit.`,
        budget,
        estimatedCost: estimatedCostUSD
      };
    }

    // Check monthly budget
    if (budget.currentSpendUSD + estimatedCostUSD > budget.monthlyBudgetUSD) {
      return {
        allowed: false,
        reason: `Monthly budget exceeded. Spent $${budget.currentSpendUSD.toFixed(2)} of $${budget.monthlyBudgetUSD.toFixed(2)} monthly limit.`,
        budget,
        estimatedCost: estimatedCostUSD
      };
    }

    return {
      allowed: true,
      budget,
      estimatedCost: estimatedCostUSD
    };
  }

  /**
   * Record cost for an operation
   */
  async recordCost(record: CostRecord): Promise<void> {
    const { companyId, costUSD } = record;

    // Increment monthly spend
    const monthKey = `cost:${companyId}:month:${this.getCurrentMonth()}`;
    await this.redis.incrbyfloat(monthKey, costUSD);
    await this.redis.expire(monthKey, 60 * 60 * 24 * 32); // 32 days

    // Increment daily spend
    const dayKey = `cost:${companyId}:day:${this.getCurrentDay()}`;
    await this.redis.incrbyfloat(dayKey, costUSD);
    await this.redis.expire(dayKey, 60 * 60 * 25); // 25 hours

    // Store cost record
    const recordKey = `cost:record:${record.id}`;
    await this.redis.setex(
      recordKey,
      60 * 60 * 24 * 90, // 90 days
      JSON.stringify(record)
    );

    // Add to cost ledger (sorted set by timestamp)
    const ledgerKey = `cost:ledger:${companyId}`;
    await this.redis.zadd(ledgerKey, record.timestamp.getTime(), record.id);
    await this.redis.expire(ledgerKey, 60 * 60 * 24 * 90); // 90 days

    // Check alert thresholds
    await this.checkAlertThresholds(companyId);
  }

  /**
   * Get tenant budget status
   */
  async getTenantBudget(companyId: string): Promise<TenantBudget> {
    // Get monthly and daily spend from Redis
    const monthKey = `cost:${companyId}:month:${this.getCurrentMonth()}`;
    const dayKey = `cost:${companyId}:day:${this.getCurrentDay()}`;

    const [currentSpendStr, spendTodayStr] = await Promise.all([
      this.redis.get(monthKey),
      this.redis.get(dayKey)
    ]);

    const currentSpendUSD = parseFloat(currentSpendStr || '0');
    const spendToday = parseFloat(spendTodayStr || '0');

    // Get custom budgets (or use defaults)
    const budgetKey = `budget:${companyId}`;
    const budgetData = await this.redis.hgetall(budgetKey);

    const monthlyBudgetUSD = parseFloat(budgetData.monthlyBudgetUSD || String(CostBudgetManager.DEFAULT_MONTHLY_BUDGET_USD));
    const dailyBudgetUSD = parseFloat(budgetData.dailyBudgetUSD || String(CostBudgetManager.DEFAULT_DAILY_BUDGET_USD));

    // Get alert status
    const alertKey = `alerts:${companyId}:${this.getCurrentMonth()}`;
    const alerts = await this.redis.hgetall(alertKey);

    return {
      companyId,
      monthlyBudgetUSD,
      dailyBudgetUSD,
      currentSpendUSD,
      spendToday,
      resetAt: this.getMonthEnd(),
      alerts: {
        threshold50: alerts.threshold50 === 'true',
        threshold75: alerts.threshold75 === 'true',
        threshold90: alerts.threshold90 === 'true'
      }
    };
  }

  /**
   * Set custom budget for tenant
   */
  async setTenantBudget(
    companyId: string,
    monthlyBudgetUSD: number,
    dailyBudgetUSD: number
  ): Promise<void> {
    const budgetKey = `budget:${companyId}`;
    await this.redis.hmset(budgetKey, {
      monthlyBudgetUSD: String(monthlyBudgetUSD),
      dailyBudgetUSD: String(dailyBudgetUSD),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Get cost ledger for a tenant
   */
  async getCostLedger(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostRecord[]> {
    const ledgerKey = `cost:ledger:${companyId}`;

    // Get record IDs in time range
    const recordIds = await this.redis.zrangebyscore(
      ledgerKey,
      startDate.getTime(),
      endDate.getTime()
    );

    // Fetch records
    const records: CostRecord[] = [];
    for (const id of recordIds) {
      const recordKey = `cost:record:${id}`;
      const recordData = await this.redis.get(recordKey);
      if (recordData) {
        records.push(JSON.parse(recordData));
      }
    }

    return records;
  }

  /**
   * Get cost summary
   */
  async getCostSummary(companyId: string, period: 'day' | 'month'): Promise<{
    total: number;
    byService: Record<string, number>;
    byOperation: Record<string, number>;
    recordCount: number;
  }> {
    const startDate = period === 'day'
      ? new Date(new Date().setHours(0, 0, 0, 0))
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = new Date();

    const records = await this.getCostLedger(companyId, startDate, endDate);

    const summary = {
      total: 0,
      byService: {} as Record<string, number>,
      byOperation: {} as Record<string, number>,
      recordCount: records.length
    };

    for (const record of records) {
      summary.total += record.costUSD;
      summary.byService[record.service] = (summary.byService[record.service] || 0) + record.costUSD;
      summary.byOperation[record.operation] = (summary.byOperation[record.operation] || 0) + record.costUSD;
    }

    return summary;
  }

  /**
   * Check alert thresholds and trigger alerts
   */
  private async checkAlertThresholds(companyId: string): Promise<void> {
    const budget = await this.getTenantBudget(companyId);
    const percentUsed = (budget.currentSpendUSD / budget.monthlyBudgetUSD) * 100;

    const alertKey = `alerts:${companyId}:${this.getCurrentMonth()}`;

    if (percentUsed >= 90 && !budget.alerts.threshold90) {
      await this.redis.hset(alertKey, 'threshold90', 'true');
      await this.redis.expire(alertKey, 60 * 60 * 24 * 32); // 32 days
      console.warn(`[BUDGET ALERT] ${companyId}: 90% budget threshold exceeded ($${budget.currentSpendUSD.toFixed(2)} / $${budget.monthlyBudgetUSD.toFixed(2)})`);
    } else if (percentUsed >= 75 && !budget.alerts.threshold75) {
      await this.redis.hset(alertKey, 'threshold75', 'true');
      await this.redis.expire(alertKey, 60 * 60 * 24 * 32);
      console.warn(`[BUDGET ALERT] ${companyId}: 75% budget threshold exceeded ($${budget.currentSpendUSD.toFixed(2)} / $${budget.monthlyBudgetUSD.toFixed(2)})`);
    } else if (percentUsed >= 50 && !budget.alerts.threshold50) {
      await this.redis.hset(alertKey, 'threshold50', 'true');
      await this.redis.expire(alertKey, 60 * 60 * 24 * 32);
      console.info(`[BUDGET ALERT] ${companyId}: 50% budget threshold exceeded ($${budget.currentSpendUSD.toFixed(2)} / $${budget.monthlyBudgetUSD.toFixed(2)})`);
    }
  }

  /**
   * Get current month string (YYYY-MM)
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get current day string (YYYY-MM-DD)
   */
  private getCurrentDay(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Get month end date
   */
  private getMonthEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
}
