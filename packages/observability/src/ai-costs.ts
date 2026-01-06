/**
 * AI Cost Tracking Metrics
 *
 * Prometheus metrics for tracking LLM token usage and costs per tenant
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/AI Cost Meter
 */

import promClient from 'prom-client';

/**
 * Counter: Total AI tokens consumed
 * Labels: company_id, model, operation
 */
export const aiTokensUsedTotal = new promClient.Counter({
  name: 'ai_tokens_used_total',
  help: 'Total AI tokens consumed across all operations',
  labelNames: ['company_id', 'model', 'operation'],
});

/**
 * Counter: Total AI tokens consumed (input)
 * Labels: company_id, model, operation
 */
export const aiTokensInputTotal = new promClient.Counter({
  name: 'ai_tokens_input_total',
  help: 'Total AI input tokens (prompts + context)',
  labelNames: ['company_id', 'model', 'operation'],
});

/**
 * Counter: Total AI tokens consumed (output)
 * Labels: company_id, model, operation
 */
export const aiTokensOutputTotal = new promClient.Counter({
  name: 'ai_tokens_output_total',
  help: 'Total AI output tokens (generated text)',
  labelNames: ['company_id', 'model', 'operation'],
});

/**
 * Counter: Total AI cost incurred in USD
 * Labels: company_id, model
 */
export const aiCostDollarsTotal = new promClient.Counter({
  name: 'ai_cost_dollars_total',
  help: 'Total AI cost in USD',
  labelNames: ['company_id', 'model'],
});

/**
 * Gauge: Remaining AI budget per tenant in USD
 * Labels: company_id
 */
export const aiBudgetRemainingDollars = new promClient.Gauge({
  name: 'ai_budget_remaining_dollars',
  help: 'Remaining AI budget per tenant in USD',
  labelNames: ['company_id'],
});

/**
 * Gauge: AI budget limit per tenant in USD
 * Labels: company_id
 */
export const aiBudgetLimitDollars = new promClient.Gauge({
  name: 'ai_budget_limit_dollars',
  help: 'AI budget limit per tenant in USD',
  labelNames: ['company_id'],
});

/**
 * Counter: Total AI requests
 * Labels: company_id, model, operation, status
 */
export const aiRequestsTotal = new promClient.Counter({
  name: 'ai_requests_total',
  help: 'Total AI requests by status (success/failure)',
  labelNames: ['company_id', 'model', 'operation', 'status'],
});

/**
 * Histogram: AI request duration in milliseconds
 * Labels: company_id, model, operation
 */
export const aiRequestDurationMs = new promClient.Histogram({
  name: 'ai_request_duration_ms',
  help: 'AI request duration in milliseconds',
  labelNames: ['company_id', 'model', 'operation'],
  buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000],
});

/**
 * Counter: Budget threshold alerts
 * Labels: company_id, threshold
 */
export const aiBudgetAlertsTotal = new promClient.Counter({
  name: 'ai_budget_alerts_total',
  help: 'Total budget threshold alerts triggered',
  labelNames: ['company_id', 'threshold'],
});

/**
 * Interface for tracking AI operation costs
 */
export interface AIOperationCost {
  companyId: string;
  model: string;
  provider: string;
  operation: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  costUsd: number;
  durationMs: number;
  timestamp: Date;
  success: boolean;
}

/**
 * Interface for budget configuration
 */
export interface BudgetConfig {
  companyId: string;
  limitUsd: number;
  usedUsd: number;
  period: 'daily' | 'monthly';
  resetAt: Date;
}

/**
 * Track AI operation costs and update metrics
 *
 * @param operation - AI operation details
 *
 * @example
 * ```typescript
 * trackAICost({
 *   companyId: '550e8400-e29b-41d4-a716-446655440000',
 *   model: 'gpt-4-turbo',
 *   provider: 'openai',
 *   operation: 'report-generation',
 *   tokensInput: 800,
 *   tokensOutput: 700,
 *   tokensTotal: 1500,
 *   costUsd: 0.0195,
 *   durationMs: 2340,
 *   timestamp: new Date(),
 *   success: true,
 * });
 * ```
 */
export function trackAICost(operation: AIOperationCost): void {
  const labels = {
    company_id: operation.companyId,
    model: operation.model,
    operation: operation.operation,
  };

  // Track tokens
  aiTokensUsedTotal.inc(labels, operation.tokensTotal);
  aiTokensInputTotal.inc(labels, operation.tokensInput);
  aiTokensOutputTotal.inc(labels, operation.tokensOutput);

  // Track cost
  aiCostDollarsTotal.inc(
    {
      company_id: operation.companyId,
      model: operation.model,
    },
    operation.costUsd
  );

  // Track request
  aiRequestsTotal.inc(
    {
      ...labels,
      status: operation.success ? 'success' : 'failure',
    },
    1
  );

  // Track duration
  aiRequestDurationMs.observe(labels, operation.durationMs);
}

/**
 * Update budget remaining gauge
 *
 * @param budget - Budget configuration
 *
 * @example
 * ```typescript
 * updateBudgetRemaining({
 *   companyId: '550e8400-e29b-41d4-a716-446655440000',
 *   limitUsd: 100,
 *   usedUsd: 45.67,
 *   period: 'monthly',
 *   resetAt: new Date('2024-12-01'),
 * });
 * ```
 */
export function updateBudgetRemaining(budget: BudgetConfig): void {
  const remaining = Math.max(0, budget.limitUsd - budget.usedUsd);

  aiBudgetRemainingDollars.set(
    { company_id: budget.companyId },
    remaining
  );

  aiBudgetLimitDollars.set(
    { company_id: budget.companyId },
    budget.limitUsd
  );
}

/**
 * Record budget alert
 *
 * @param companyId - Company identifier
 * @param threshold - Threshold percentage (e.g., '80%', '100%')
 *
 * @example
 * ```typescript
 * recordBudgetAlert('550e8400-e29b-41d4-a716-446655440000', '80%');
 * ```
 */
export function recordBudgetAlert(companyId: string, threshold: string): void {
  aiBudgetAlertsTotal.inc({
    company_id: companyId,
    threshold,
  }, 1);
}

/**
 * Get current metrics values for a company
 *
 * @param companyId - Company identifier
 * @returns Current metric values
 */
export async function getCompanyMetrics(companyId: string): Promise<{
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  budgetRemaining: number;
  budgetLimit: number;
}> {
  const metrics = await promClient.register.getMetricsAsJSON();

  let totalTokens = 0;
  let totalCost = 0;
  let totalRequests = 0;
  let budgetRemaining = 0;
  let budgetLimit = 0;

  for (const metric of metrics) {
    if (metric.name === 'ai_tokens_used_total') {
      totalTokens = (metric as any).values
        .filter((v: any) => v.labels.company_id === companyId)
        .reduce((sum: number, v: any) => sum + v.value, 0);
    } else if (metric.name === 'ai_cost_dollars_total') {
      totalCost = (metric as any).values
        .filter((v: any) => v.labels.company_id === companyId)
        .reduce((sum: number, v: any) => sum + v.value, 0);
    } else if (metric.name === 'ai_requests_total') {
      totalRequests = (metric as any).values
        .filter((v: any) => v.labels.company_id === companyId && v.labels.status === 'success')
        .reduce((sum: number, v: any) => sum + v.value, 0);
    } else if (metric.name === 'ai_budget_remaining_dollars') {
      const match = (metric as any).values.find((v: any) => v.labels.company_id === companyId);
      budgetRemaining = match ? match.value : 0;
    } else if (metric.name === 'ai_budget_limit_dollars') {
      const match = (metric as any).values.find((v: any) => v.labels.company_id === companyId);
      budgetLimit = match ? match.value : 0;
    }
  }

  return {
    totalTokens,
    totalCost,
    totalRequests,
    budgetRemaining,
    budgetLimit,
  };
}

/**
 * Export all AI cost metrics for registration
 */
export const aiCostMetrics = {
  aiTokensUsedTotal,
  aiTokensInputTotal,
  aiTokensOutputTotal,
  aiCostDollarsTotal,
  aiBudgetRemainingDollars,
  aiBudgetLimitDollars,
  aiRequestsTotal,
  aiRequestDurationMs,
  aiBudgetAlertsTotal,
};
