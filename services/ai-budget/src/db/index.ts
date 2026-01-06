import pg from 'pg';
import type {
  AITokenBudget,
  AIModel,
  BudgetCheckResult,
} from '../types/index.js';
import { calculateCost } from '../types/index.js';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'teei_csr',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export class BudgetDatabase {
  /**
   * Check if a tenant is within budget for a specific model
   */
  async checkBudget(
    tenantId: string,
    model: AIModel,
    estimatedTokens: { input: number; output: number }
  ): Promise<BudgetCheckResult> {
    const client = await pool.connect();
    try {
      // Get current budget status
      const result = await client.query<AITokenBudget>(
        `SELECT * FROM ai_token_budgets
         WHERE tenant_id = $1 AND model = $2`,
        [tenantId, model]
      );

      // If no budget exists, create default budget ($1000/month)
      if (result.rows.length === 0) {
        await this.createDefaultBudget(tenantId, model);
        return {
          allowed: true,
          current_usage_usd: 0,
          monthly_limit_usd: 1000,
          percentage_used: 0,
        };
      }

      const budget = result.rows[0];
      if (!budget) {
        throw new Error('Budget record not found after existence check');
      }

      // If hard limit reached, deny immediately
      if (budget.hard_limit_reached) {
        return {
          allowed: false,
          reason: 'Monthly budget exceeded. AI features disabled until next reset.',
          current_usage_usd: parseFloat(budget.current_usage_usd.toString()),
          monthly_limit_usd: parseFloat(budget.monthly_limit_usd.toString()),
          percentage_used: parseFloat(
            ((budget.current_usage_usd / budget.monthly_limit_usd) * 100).toFixed(2)
          ),
        };
      }

      // Estimate cost of this request
      const estimatedCost = calculateCost(
        model,
        estimatedTokens.input,
        estimatedTokens.output
      );

      const projectedUsage =
        parseFloat(budget.current_usage_usd.toString()) + estimatedCost;
      const limit = parseFloat(budget.monthly_limit_usd.toString());

      // Check if this request would exceed limit
      if (projectedUsage > limit) {
        // Update hard limit flag
        await client.query(
          `UPDATE ai_token_budgets
           SET hard_limit_reached = TRUE, updated_at = NOW()
           WHERE tenant_id = $1 AND model = $2`,
          [tenantId, model]
        );

        return {
          allowed: false,
          reason: 'This request would exceed monthly budget. Request denied.',
          current_usage_usd: parseFloat(budget.current_usage_usd.toString()),
          monthly_limit_usd: limit,
          percentage_used: parseFloat(((projectedUsage / limit) * 100).toFixed(2)),
        };
      }

      return {
        allowed: true,
        current_usage_usd: parseFloat(budget.current_usage_usd.toString()),
        monthly_limit_usd: limit,
        percentage_used: parseFloat(((projectedUsage / limit) * 100).toFixed(2)),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Track actual token usage after API call completes
   */
  async trackUsage(usage: {
    request_id: string;
    tenant_id: string;
    model: AIModel;
    prompt_tokens: number;
    completion_tokens: number;
    report_type?: string;
    user_id?: string;
  }): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate cost
      const cost = calculateCost(usage.model, usage.prompt_tokens, usage.completion_tokens);

      // Insert usage record
      await client.query(
        `INSERT INTO ai_token_usage
         (request_id, tenant_id, model, prompt_tokens, completion_tokens, cost_usd, report_type, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          usage.request_id,
          usage.tenant_id,
          usage.model,
          usage.prompt_tokens,
          usage.completion_tokens,
          cost,
          usage.report_type || null,
          usage.user_id || null,
        ]
      );

      // Update budget current usage
      const result = await client.query<AITokenBudget>(
        `UPDATE ai_token_budgets
         SET
           current_usage_usd = current_usage_usd + $1,
           token_count_input = token_count_input + $2,
           token_count_output = token_count_output + $3,
           updated_at = NOW()
         WHERE tenant_id = $4 AND model = $5
         RETURNING *`,
        [cost, usage.prompt_tokens, usage.completion_tokens, usage.tenant_id, usage.model]
      );

      // If budget doesn't exist, create it
      if (result.rows.length === 0) {
        await this.createDefaultBudget(usage.tenant_id, usage.model);
        await client.query(
          `UPDATE ai_token_budgets
           SET
             current_usage_usd = current_usage_usd + $1,
             token_count_input = token_count_input + $2,
             token_count_output = token_count_output + $3,
             updated_at = NOW()
           WHERE tenant_id = $4 AND model = $5`,
          [cost, usage.prompt_tokens, usage.completion_tokens, usage.tenant_id, usage.model]
        );
      }

      const budget = result.rows[0] || (await this.getBudget(usage.tenant_id, usage.model));
      if (budget) {
        const usagePercent =
          (parseFloat(budget.current_usage_usd.toString()) /
            parseFloat(budget.monthly_limit_usd.toString())) *
          100;

        // Check for soft limit (80%)
        if (usagePercent >= 80 && !budget.soft_limit_notified) {
          await client.query(
            `UPDATE ai_token_budgets
             SET soft_limit_notified = TRUE
             WHERE tenant_id = $1 AND model = $2`,
            [usage.tenant_id, usage.model]
          );

          // TODO: Send notification to tenant admin
          console.warn(
            `[AI Budget] Tenant ${usage.tenant_id} reached 80% of budget for ${usage.model}`
          );
        }

        // Check for hard limit (100%)
        if (usagePercent >= 100) {
          await client.query(
            `UPDATE ai_token_budgets
             SET hard_limit_reached = TRUE
             WHERE tenant_id = $1 AND model = $2`,
            [usage.tenant_id, usage.model]
          );

          console.error(
            `[AI Budget] Tenant ${usage.tenant_id} exceeded budget for ${usage.model}`
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get budget status for a tenant
   */
  async getBudgetStatus(tenantId: string) {
    const result = await pool.query<AITokenBudget>(
      `SELECT * FROM ai_token_budgets WHERE tenant_id = $1 ORDER BY current_usage_usd DESC`,
      [tenantId]
    );

    return result.rows.map((row) => ({
      model: row.model as AIModel,
      monthly_limit_usd: parseFloat(row.monthly_limit_usd.toString()),
      current_usage_usd: parseFloat(row.current_usage_usd.toString()),
      percentage_used: parseFloat(
        ((parseFloat(row.current_usage_usd.toString()) /
          parseFloat(row.monthly_limit_usd.toString())) *
          100).toFixed(2)
      ),
      token_count_input: parseInt(row.token_count_input.toString()),
      token_count_output: parseInt(row.token_count_output.toString()),
      reset_date: row.reset_date.toISOString(),
      status: (
        row.hard_limit_reached ? 'exceeded'
        : parseFloat(row.current_usage_usd.toString()) >=
            parseFloat(row.monthly_limit_usd.toString()) * 0.8 ?
          'warning'
        : 'ok'
      ) as 'ok' | 'warning' | 'exceeded',
      soft_limit_notified: row.soft_limit_notified,
      hard_limit_reached: row.hard_limit_reached,
    }));
  }

  /**
   * Set budget limit for a tenant
   */
  async setBudget(tenantId: string, model: AIModel, monthlyLimitUsd: number): Promise<void> {
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    await pool.query(
      `INSERT INTO ai_token_budgets (tenant_id, model, monthly_limit_usd, reset_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, model)
       DO UPDATE SET
         monthly_limit_usd = $3,
         updated_at = NOW()`,
      [tenantId, model, monthlyLimitUsd, resetDate]
    );
  }

  /**
   * Get a single budget record
   */
  private async getBudget(tenantId: string, model: AIModel): Promise<AITokenBudget | null> {
    const result = await pool.query<AITokenBudget>(
      `SELECT * FROM ai_token_budgets WHERE tenant_id = $1 AND model = $2`,
      [tenantId, model]
    );
    return result.rows[0] || null;
  }

  /**
   * Create default budget for new tenant
   */
  private async createDefaultBudget(tenantId: string, model: AIModel): Promise<void> {
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);
    resetDate.setDate(1);
    resetDate.setHours(0, 0, 0, 0);

    await pool.query(
      `INSERT INTO ai_token_budgets (tenant_id, model, monthly_limit_usd, reset_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, model) DO NOTHING`,
      [tenantId, model, 1000, resetDate]
    );
  }

  /**
   * Get top token consumers (for analytics)
   */
  async getTopConsumers(limit: number = 10) {
    const result = await pool.query(
      `SELECT
         tenant_id,
         SUM(current_usage_usd) as total_usage_usd,
         SUM(token_count_input) as total_input_tokens,
         SUM(token_count_output) as total_output_tokens
       FROM ai_token_budgets
       GROUP BY tenant_id
       ORDER BY total_usage_usd DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}

export const budgetDb = new BudgetDatabase();
