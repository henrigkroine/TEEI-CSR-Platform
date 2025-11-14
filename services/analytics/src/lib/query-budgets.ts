import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { queryBudgets } from '@teei/shared-schema';
import { eq, and, lt } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:query-budgets');

let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL || 'postgres://teei:teei_dev_password@localhost:5432/teei_platform';
    const sql = postgres(connectionString);
    db = drizzle(sql);
  }
  return db;
}

export class QueryBudgetError extends Error {
  constructor(message: string, public budgetRemaining: number = 0) {
    super(message);
    this.name = 'QueryBudgetError';
  }
}

export interface BudgetCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  resetAt: Date;
}

/**
 * Check if company has available query budget
 */
export async function checkQueryBudget(
  companyId: string,
  budgetType: 'daily' | 'monthly' = 'daily'
): Promise<BudgetCheckResult> {
  try {
    const database = getDb();

    // Get or create budget for company
    let [budget] = await database
      .select()
      .from(queryBudgets)
      .where(
        and(
          eq(queryBudgets.companyId, companyId),
          eq(queryBudgets.budgetType, budgetType)
        )
      )
      .limit(1);

    // If no budget exists or budget has expired, create/reset it
    const now = new Date();
    if (!budget || new Date(budget.resetAt) <= now) {
      const resetAt = budgetType === 'daily'
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // +1 day
        : new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month

      const defaultLimit = budgetType === 'daily' ? 10000 : 100000;

      if (!budget) {
        // Create new budget
        [budget] = await database
          .insert(queryBudgets)
          .values({
            companyId,
            budgetType,
            queryLimit: defaultLimit,
            queriesUsed: 0,
            resetAt,
          })
          .returning();

        logger.info('Created new query budget', { companyId, budgetType, limit: defaultLimit });
      } else {
        // Reset existing budget
        [budget] = await database
          .update(queryBudgets)
          .set({
            queriesUsed: 0,
            resetAt,
          })
          .where(eq(queryBudgets.id, budget.id))
          .returning();

        logger.info('Reset query budget', { companyId, budgetType });
      }
    }

    const remaining = budget.queryLimit - budget.queriesUsed;
    const allowed = remaining > 0;

    return {
      allowed,
      remaining,
      limit: budget.queryLimit,
      used: budget.queriesUsed,
      resetAt: new Date(budget.resetAt),
    };
  } catch (error) {
    logger.error('Failed to check query budget', { companyId, budgetType, error });
    throw error;
  }
}

/**
 * Increment query usage for a company
 */
export async function incrementQueryUsage(
  companyId: string,
  budgetType: 'daily' | 'monthly' = 'daily'
): Promise<void> {
  try {
    const database = getDb();

    await database
      .update(queryBudgets)
      .set({
        queriesUsed: queryBudgets.queriesUsed + 1,
      })
      .where(
        and(
          eq(queryBudgets.companyId, companyId),
          eq(queryBudgets.budgetType, budgetType)
        )
      );

    logger.debug('Incremented query usage', { companyId, budgetType });
  } catch (error) {
    logger.error('Failed to increment query usage', { companyId, budgetType, error });
    // Don't throw - this is non-critical
  }
}

/**
 * Enforce query budget - check and increment in one operation
 */
export async function enforceQueryBudget(
  companyId: string,
  budgetType: 'daily' | 'monthly' = 'daily'
): Promise<BudgetCheckResult> {
  const budgetCheck = await checkQueryBudget(companyId, budgetType);

  if (!budgetCheck.allowed) {
    throw new QueryBudgetError(
      `Query budget exceeded. Limit: ${budgetCheck.limit}, Used: ${budgetCheck.used}. Resets at ${budgetCheck.resetAt.toISOString()}`,
      budgetCheck.remaining
    );
  }

  // Increment usage
  await incrementQueryUsage(companyId, budgetType);

  // Return updated remaining count
  return {
    ...budgetCheck,
    remaining: budgetCheck.remaining - 1,
  };
}

/**
 * Get budget status for a company
 */
export async function getBudgetStatus(
  companyId: string
): Promise<{ daily: BudgetCheckResult; monthly: BudgetCheckResult }> {
  const [daily, monthly] = await Promise.all([
    checkQueryBudget(companyId, 'daily'),
    checkQueryBudget(companyId, 'monthly'),
  ]);

  return { daily, monthly };
}

/**
 * Update query limit for a company
 */
export async function updateQueryLimit(
  companyId: string,
  budgetType: 'daily' | 'monthly',
  newLimit: number
): Promise<void> {
  try {
    const database = getDb();

    await database
      .update(queryBudgets)
      .set({
        queryLimit: newLimit,
      })
      .where(
        and(
          eq(queryBudgets.companyId, companyId),
          eq(queryBudgets.budgetType, budgetType)
        )
      );

    logger.info('Updated query limit', { companyId, budgetType, newLimit });
  } catch (error) {
    logger.error('Failed to update query limit', { companyId, budgetType, newLimit, error });
    throw error;
  }
}

/**
 * Reset query budget for a company (admin operation)
 */
export async function resetQueryBudget(
  companyId: string,
  budgetType: 'daily' | 'monthly'
): Promise<void> {
  try {
    const database = getDb();

    const now = new Date();
    const resetAt = budgetType === 'daily'
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await database
      .update(queryBudgets)
      .set({
        queriesUsed: 0,
        resetAt,
      })
      .where(
        and(
          eq(queryBudgets.companyId, companyId),
          eq(queryBudgets.budgetType, budgetType)
        )
      );

    logger.info('Manually reset query budget', { companyId, budgetType });
  } catch (error) {
    logger.error('Failed to reset query budget', { companyId, budgetType, error });
    throw error;
  }
}
