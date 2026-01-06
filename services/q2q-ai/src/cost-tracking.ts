import { db, companies } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('q2q-cost-tracking');

/**
 * Token pricing per model (in dollars per 1000 tokens)
 */
export const MODEL_PRICING = {
  // OpenAI
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },

  // Anthropic
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },

  // Default fallback
  'default': { input: 0.001, output: 0.002 },
};

export interface CostRecord {
  requestId: string;
  companyId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
}

// In-memory cost tracking (in production, use database)
const costRecords: CostRecord[] = [];

/**
 * Calculate cost for a request
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING.default;

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Track a Q2Q request cost
 */
export async function trackRequestCost(params: {
  requestId: string;
  companyId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const totalTokens = params.inputTokens + params.outputTokens;
  const cost = calculateCost(params.model, params.inputTokens, params.outputTokens);

  const record: CostRecord = {
    ...params,
    totalTokens,
    cost,
    timestamp: new Date(),
  };

  costRecords.push(record);

  logger.info(`Tracked cost: ${cost.toFixed(6)} for company ${params.companyId}, model ${params.model}`);

  // Update company's current month spend
  try {
    await db
      .update(companies)
      .set({
        aiSpendCurrentMonth: sql`${companies.aiSpendCurrentMonth} + ${cost}`,
      })
      .where(eq(companies.id, params.companyId));
  } catch (error) {
    logger.error('Error updating company AI spend:', error);
  }
}

/**
 * Check if company has budget remaining
 */
export async function checkBudget(companyId: string): Promise<{
  allowed: boolean;
  budget: number;
  spent: number;
  remaining: number;
}> {
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const budget = parseFloat(company.aiBudgetMonthly || '1000');
    const spent = parseFloat(company.aiSpendCurrentMonth || '0');
    const remaining = budget - spent;
    const allowed = remaining > 0;

    return {
      allowed,
      budget,
      spent,
      remaining,
    };
  } catch (error: any) {
    logger.error('Error checking budget:', error);
    // Default to allowing requests if check fails
    return {
      allowed: true,
      budget: 1000,
      spent: 0,
      remaining: 1000,
    };
  }
}

/**
 * Reset monthly spend (should be run on a cron job)
 */
export async function resetMonthlySpend(): Promise<void> {
  try {
    await db
      .update(companies)
      .set({
        aiSpendCurrentMonth: '0.00',
      });

    logger.info('Reset monthly AI spend for all companies');
  } catch (error) {
    logger.error('Error resetting monthly spend:', error);
  }
}

/**
 * Get cost metrics
 */
export function getCostMetrics(companyId?: string) {
  let records = costRecords;

  if (companyId) {
    records = records.filter(r => r.companyId === companyId);
  }

  const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
  const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
  const totalRequests = records.length;

  const byProvider: Record<string, { count: number; cost: number; tokens: number }> = {};
  const byModel: Record<string, { count: number; cost: number; tokens: number }> = {};

  for (const record of records) {
    if (!byProvider[record.provider]) {
      byProvider[record.provider] = { count: 0, cost: 0, tokens: 0 };
    }
    byProvider[record.provider].count++;
    byProvider[record.provider].cost += record.cost;
    byProvider[record.provider].tokens += record.totalTokens;

    if (!byModel[record.model]) {
      byModel[record.model] = { count: 0, cost: 0, tokens: 0 };
    }
    byModel[record.model].count++;
    byModel[record.model].cost += record.cost;
    byModel[record.model].tokens += record.totalTokens;
  }

  return {
    totalRequests,
    totalCost: parseFloat(totalCost.toFixed(4)),
    totalTokens,
    avgCostPerRequest: totalRequests > 0 ? parseFloat((totalCost / totalRequests).toFixed(6)) : 0,
    byProvider,
    byModel,
    recentRecords: records.slice(-100), // Last 100 records
  };
}

// Import sql for the query
import { sql } from 'drizzle-orm';
