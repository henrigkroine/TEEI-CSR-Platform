/**
 * AI Budget Enforcer
 * Worker 10: AI/ML Explainability & Guardrails
 *
 * Enforces per-tenant AI budget limits with alerts
 */

import { Pool } from 'pg';
import {
  BudgetCheckRequest,
  BudgetCheckResult,
  AIBudgetConfig,
} from '@teei/shared-types';

export interface BudgetEnforcerConfig {
  pgPool: Pool;
  alertWebhookUrl?: string;
}

export class BudgetEnforcer {
  private pgPool: Pool;
  private alertWebhookUrl?: string;

  constructor(config: BudgetEnforcerConfig) {
    this.pgPool = config.pgPool;
    this.alertWebhookUrl = config.alertWebhookUrl;
  }

  /**
   * Check if request is within budget limits
   */
  async check(request: BudgetCheckRequest): Promise<BudgetCheckResult> {
    // Load or initialize budget config
    const config = await this.loadOrCreateBudgetConfig(request.companyId);

    if (!config.enabled) {
      return this.allowedResult(config, request.estimatedCostUsd);
    }

    // Check if budget needs reset
    const now = new Date();
    const needsDailyReset = now >= new Date(config.dailyResetAt);
    const needsMonthlyReset = now >= new Date(config.monthlyResetAt);

    if (needsDailyReset || needsMonthlyReset) {
      await this.resetBudgets(config, needsDailyReset, needsMonthlyReset);
      // Reload config after reset
      const refreshed = await this.loadOrCreateBudgetConfig(request.companyId);
      return this.checkAgainstLimits(refreshed, request);
    }

    return this.checkAgainstLimits(config, request);
  }

  /**
   * Record actual usage after operation completes
   */
  async recordUsage(
    companyId: string,
    actualCostUsd: number
  ): Promise<void> {
    await this.pgPool.query(
      `UPDATE ai_budget_config 
       SET daily_used_usd = daily_used_usd + $1,
           monthly_used_usd = monthly_used_usd + $2,
           updated_at = NOW()
       WHERE company_id = $3`,
      [actualCostUsd, actualCostUsd, companyId]
    );

    // Check if we've crossed alert threshold
    const config = await this.loadOrCreateBudgetConfig(companyId);
    const dailyPct = (config.dailyUsedUsd / config.dailyLimitUsd) * 100;
    const monthlyPct = (config.monthlyUsedUsd / config.monthlyLimitUsd) * 100;

    if (dailyPct >= config.alertThresholdPct || monthlyPct >= config.alertThresholdPct) {
      await this.sendAlert(config, dailyPct, monthlyPct);
    }
  }

  /**
   * Load or create budget config for company
   */
  private async loadOrCreateBudgetConfig(companyId: string): Promise<AIBudgetConfig> {
    const result = await this.pgPool.query(
      `SELECT * FROM ai_budget_config WHERE company_id = $1`,
      [companyId]
    );

    if (result.rows.length > 0) {
      return this.mapConfigRow(result.rows[0]);
    }

    // Create default config
    const createResult = await this.pgPool.query(
      `INSERT INTO ai_budget_config (company_id, created_by)
       VALUES ($1, 'system')
       RETURNING *`,
      [companyId]
    );

    return this.mapConfigRow(createResult.rows[0]);
  }

  /**
   * Reset budgets (daily/monthly)
   */
  private async resetBudgets(
    config: AIBudgetConfig,
    resetDaily: boolean,
    resetMonthly: boolean
  ): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (resetDaily) {
      updates.push(`daily_used_usd = 0`);
      updates.push(`daily_reset_at = DATE_TRUNC('day', NOW() + INTERVAL '1 day')`);
    }

    if (resetMonthly) {
      updates.push(`monthly_used_usd = 0`);
      updates.push(`monthly_reset_at = DATE_TRUNC('month', NOW() + INTERVAL '1 month')`);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length > 0) {
      params.push(config.companyId);
      await this.pgPool.query(
        `UPDATE ai_budget_config SET ${updates.join(', ')} WHERE company_id = $${paramIndex}`,
        params
      );
    }
  }

  /**
   * Check request against budget limits
   */
  private checkAgainstLimits(
    config: AIBudgetConfig,
    request: BudgetCheckRequest
  ): BudgetCheckResult {
    const projectedDailyUsed = config.dailyUsedUsd + request.estimatedCostUsd;
    const projectedMonthlyUsed = config.monthlyUsedUsd + request.estimatedCostUsd;

    // Check daily limit
    if (projectedDailyUsed > config.dailyLimitUsd) {
      return {
        allowed: false,
        limitUsd: config.dailyLimitUsd,
        usedUsd: config.dailyUsedUsd,
        remainingUsd: Math.max(0, config.dailyLimitUsd - config.dailyUsedUsd),
        thisCostUsd: request.estimatedCostUsd,
        period: 'daily',
        resetAt: config.dailyResetAt,
        thresholdReached: true,
        message: `Daily budget limit exceeded. Limit: $${config.dailyLimitUsd}, Used: $${config.dailyUsedUsd.toFixed(4)}`,
      };
    }

    // Check monthly limit
    if (projectedMonthlyUsed > config.monthlyLimitUsd) {
      return {
        allowed: false,
        limitUsd: config.monthlyLimitUsd,
        usedUsd: config.monthlyUsedUsd,
        remainingUsd: Math.max(0, config.monthlyLimitUsd - config.monthlyUsedUsd),
        thisCostUsd: request.estimatedCostUsd,
        period: 'monthly',
        resetAt: config.monthlyResetAt,
        thresholdReached: true,
        message: `Monthly budget limit exceeded. Limit: $${config.monthlyLimitUsd}, Used: $${config.monthlyUsedUsd.toFixed(4)}`,
      };
    }

    // Within limits
    return this.allowedResult(config, request.estimatedCostUsd);
  }

  /**
   * Create allowed result
   */
  private allowedResult(
    config: AIBudgetConfig,
    thisCostUsd: number
  ): BudgetCheckResult {
    const dailyPct = (config.dailyUsedUsd / config.dailyLimitUsd) * 100;

    return {
      allowed: true,
      limitUsd: config.dailyLimitUsd,
      usedUsd: config.dailyUsedUsd,
      remainingUsd: config.dailyLimitUsd - config.dailyUsedUsd,
      thisCostUsd,
      period: 'daily',
      resetAt: config.dailyResetAt,
      thresholdReached: dailyPct >= config.alertThresholdPct,
    };
  }

  /**
   * Send budget alert
   */
  private async sendAlert(
    config: AIBudgetConfig,
    dailyPct: number,
    monthlyPct: number
  ): Promise<void> {
    if (!this.alertWebhookUrl) {
      console.warn('No alert webhook configured');
      return;
    }

    try {
      await fetch(this.alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: config.companyId,
          dailyUsage: {
            used: config.dailyUsedUsd,
            limit: config.dailyLimitUsd,
            percentage: dailyPct,
          },
          monthlyUsage: {
            used: config.monthlyUsedUsd,
            limit: config.monthlyLimitUsd,
            percentage: monthlyPct,
          },
          threshold: config.alertThresholdPct,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send budget alert:', error);
    }
  }

  /**
   * Map database row to AIBudgetConfig
   */
  private mapConfigRow(row: any): AIBudgetConfig {
    return {
      id: row.id,
      companyId: row.company_id,
      dailyLimitUsd: parseFloat(row.daily_limit_usd),
      monthlyLimitUsd: parseFloat(row.monthly_limit_usd),
      dailyUsedUsd: parseFloat(row.daily_used_usd),
      monthlyUsedUsd: parseFloat(row.monthly_used_usd),
      dailyResetAt: row.daily_reset_at.toISOString(),
      monthlyResetAt: row.monthly_reset_at.toISOString(),
      alertThresholdPct: row.alert_threshold_pct,
      enabled: row.enabled,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}

/**
 * Singleton instance
 */
let budgetEnforcerInstance: BudgetEnforcer | null = null;

export function createBudgetEnforcer(config: BudgetEnforcerConfig): BudgetEnforcer {
  if (!budgetEnforcerInstance) {
    budgetEnforcerInstance = new BudgetEnforcer(config);
  }
  return budgetEnforcerInstance;
}

export function getBudgetEnforcer(): BudgetEnforcer {
  if (!budgetEnforcerInstance) {
    throw new Error('BudgetEnforcer not initialized');
  }
  return budgetEnforcerInstance;
}
