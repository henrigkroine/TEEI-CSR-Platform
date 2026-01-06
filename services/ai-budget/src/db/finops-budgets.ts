/**
 * FinOps Budget Management Database Layer
 */

import pg from 'pg';
import type {
  Budget,
  BudgetStatus,
  BudgetEvent,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  PolicyAction,
  BudgetPeriod,
  CostCategory,
} from '@teei/shared-types';

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

export class FinOpsBudgetDatabase {
  /**
   * Create a new budget
   */
  async createBudget(request: CreateBudgetRequest, createdBy?: string): Promise<Budget> {
    const client = await pool.connect();

    try {
      // Calculate period dates based on start date and period type
      const startDate = new Date(request.startDate);
      let periodEnd = new Date(startDate);

      if (request.period === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0); // Last day of month
      } else if (request.period === 'quarterly') {
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        periodEnd.setDate(0);
      } else if (request.period === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        periodEnd.setDate(0);
      }

      const result = await client.query(
        `INSERT INTO finops_budgets (
          tenant_id, name, description, amount, currency, period, categories,
          notify_threshold, enforce_threshold, actions, notify_emails, rate_limit_factor,
          start_date, end_date, current_period_start, current_period_end, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          request.tenantId,
          request.name,
          request.description || null,
          request.amount,
          request.currency || 'USD',
          request.period,
          request.categories || null,
          request.policy.notifyThreshold,
          request.policy.enforceThreshold,
          request.policy.actions,
          request.policy.notifyEmails || null,
          request.policy.rateLimitFactor || null,
          request.startDate,
          request.endDate || null,
          request.startDate,
          periodEnd.toISOString().split('T')[0],
          createdBy || null,
        ]
      );

      return this.mapRowToBudget(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get budget by ID
   */
  async getBudget(budgetId: string): Promise<Budget | null> {
    const result = await pool.query(
      'SELECT * FROM finops_budgets WHERE id = $1',
      [budgetId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToBudget(result.rows[0]);
  }

  /**
   * Get all budgets for a tenant
   */
  async getBudgets(tenantId: string, enabledOnly: boolean = false): Promise<Budget[]> {
    const query = enabledOnly
      ? 'SELECT * FROM finops_budgets WHERE tenant_id = $1 AND enabled = TRUE ORDER BY created_at DESC'
      : 'SELECT * FROM finops_budgets WHERE tenant_id = $1 ORDER BY created_at DESC';

    const result = await pool.query(query, [tenantId]);

    return result.rows.map((row) => this.mapRowToBudget(row));
  }

  /**
   * Update budget
   */
  async updateBudget(budgetId: string, update: UpdateBudgetRequest): Promise<Budget | null> {
    const client = await pool.connect();

    try {
      // Build dynamic UPDATE query based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (update.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(update.name);
      }

      if (update.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(update.description);
      }

      if (update.amount !== undefined) {
        updates.push(`amount = $${paramIndex++}`);
        values.push(update.amount);
      }

      if (update.policy !== undefined) {
        if (update.policy.notifyThreshold !== undefined) {
          updates.push(`notify_threshold = $${paramIndex++}`);
          values.push(update.policy.notifyThreshold);
        }
        if (update.policy.enforceThreshold !== undefined) {
          updates.push(`enforce_threshold = $${paramIndex++}`);
          values.push(update.policy.enforceThreshold);
        }
        if (update.policy.actions !== undefined) {
          updates.push(`actions = $${paramIndex++}`);
          values.push(update.policy.actions);
        }
        if (update.policy.notifyEmails !== undefined) {
          updates.push(`notify_emails = $${paramIndex++}`);
          values.push(update.policy.notifyEmails);
        }
        if (update.policy.rateLimitFactor !== undefined) {
          updates.push(`rate_limit_factor = $${paramIndex++}`);
          values.push(update.policy.rateLimitFactor);
        }
      }

      if (update.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(update.enabled);
      }

      if (updates.length === 0) {
        // No updates provided
        return this.getBudget(budgetId);
      }

      updates.push('updated_at = NOW()');
      values.push(budgetId); // For WHERE clause

      const query = `
        UPDATE finops_budgets
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToBudget(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Delete budget
   */
  async deleteBudget(budgetId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM finops_budgets WHERE id = $1 RETURNING id',
      [budgetId]
    );

    return result.rows.length > 0;
  }

  /**
   * Update budget spend (called by scheduler after querying ClickHouse)
   */
  async updateBudgetSpend(
    budgetId: string,
    currentSpend: number,
    projectedSpend?: number
  ): Promise<void> {
    await pool.query(
      `UPDATE finops_budgets
       SET current_spend = $1, projected_spend = $2, updated_at = NOW()
       WHERE id = $3`,
      [currentSpend, projectedSpend || null, budgetId]
    );
  }

  /**
   * Get budget status with current spend and alerts
   */
  async getBudgetStatus(budgetId: string): Promise<BudgetStatus | null> {
    const budget = await this.getBudget(budgetId);

    if (!budget) {
      return null;
    }

    const percentageUsed = budget.amount > 0 ? (budget.currentSpend / budget.amount) * 100 : 0;
    const remainingAmount = budget.amount - budget.currentSpend;

    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    if (percentageUsed >= budget.policy.enforceThreshold) {
      status = 'exceeded';
    } else if (percentageUsed >= budget.policy.notifyThreshold) {
      status = 'warning';
    }

    return {
      budget,
      currentSpend: budget.currentSpend,
      percentageUsed: parseFloat(percentageUsed.toFixed(2)),
      remainingAmount: parseFloat(remainingAmount.toFixed(2)),
      projectedEndOfPeriodSpend: budget.projectedSpend,
      status,
      triggeredActions: budget.triggeredActions || [],
      lastCheckedAt: new Date(),
    };
  }

  /**
   * Get all budget statuses for a tenant
   */
  async getTenantBudgetStatuses(tenantId: string): Promise<BudgetStatus[]> {
    const budgets = await this.getBudgets(tenantId, true); // Only enabled budgets

    const statuses = await Promise.all(
      budgets.map((budget) => this.getBudgetStatus(budget.id!))
    );

    return statuses.filter((status) => status !== null) as BudgetStatus[];
  }

  /**
   * Record a budget event (threshold breach, enforcement)
   */
  async recordBudgetEvent(event: Omit<BudgetEvent, 'id' | 'triggeredAt'>): Promise<void> {
    await pool.query(
      `INSERT INTO finops_budget_events
       (budget_id, tenant_id, event_type, threshold, current_spend, budget_amount, actions, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.budgetId,
        event.tenantId,
        event.eventType,
        event.threshold,
        event.currentSpend,
        event.budgetAmount,
        event.actions,
        JSON.stringify(event.metadata || {}),
      ]
    );
  }

  /**
   * Get recent budget events for a budget
   */
  async getBudgetEvents(budgetId: string, limit: number = 50): Promise<BudgetEvent[]> {
    const result = await pool.query(
      `SELECT * FROM finops_budget_events
       WHERE budget_id = $1
       ORDER BY triggered_at DESC
       LIMIT $2`,
      [budgetId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      budgetId: row.budget_id,
      tenantId: row.tenant_id,
      eventType: row.event_type,
      threshold: parseFloat(row.threshold),
      currentSpend: parseFloat(row.current_spend),
      budgetAmount: parseFloat(row.budget_amount),
      actions: row.actions,
      triggeredAt: row.triggered_at,
      metadata: row.metadata,
    }));
  }

  /**
   * Map database row to Budget type
   */
  private mapRowToBudget(row: any): Budget {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      period: row.period as BudgetPeriod,
      categories: row.categories as CostCategory[] | undefined,
      policy: {
        notifyThreshold: parseFloat(row.notify_threshold),
        enforceThreshold: parseFloat(row.enforce_threshold),
        actions: row.actions as PolicyAction[],
        notifyEmails: row.notify_emails,
        rateLimitFactor: row.rate_limit_factor ? parseFloat(row.rate_limit_factor) : undefined,
      },
      startDate: row.start_date,
      endDate: row.end_date,
      currentSpend: parseFloat(row.current_spend || '0'),
      projectedSpend: row.projected_spend ? parseFloat(row.projected_spend) : undefined,
      enabled: row.enabled,
      status: row.status,
      triggeredActions: row.triggered_actions as PolicyAction[] | undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const finopsBudgetDb = new FinOpsBudgetDatabase();
