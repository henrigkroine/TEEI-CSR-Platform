/**
 * AI Cost Guardrails Middleware
 *
 * Enforces per-tenant AI budget limits and sends alerts at thresholds
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/Cost Guardrails
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { updateBudgetRemaining, recordBudgetAlert } from '@teei/observability';

const logger = createServiceLogger('reporting:cost-guardrails');

/**
 * Budget configuration per tenant
 */
interface BudgetConfig {
  limitUsd: number;        // Monthly budget limit
  period: 'monthly';
  alertThresholds: number[]; // Alert at these percentages (e.g., [80, 90, 100])
}

/**
 * Budget usage tracking
 */
interface BudgetUsage {
  companyId: string;
  usedUsd: number;
  periodStart: Date;
  periodEnd: Date;
  lastAlertAt?: Date;
  alertsSent: number[];  // Thresholds where alerts were sent
}

/**
 * In-memory budget tracking (in production, use Redis or database)
 */
const budgetUsage = new Map<string, BudgetUsage>();

/**
 * Default budget configuration
 */
const DEFAULT_BUDGET: BudgetConfig = {
  limitUsd: 100,          // $100/month default
  period: 'monthly',
  alertThresholds: [80, 90, 100], // Alert at 80%, 90%, 100%
};

/**
 * Get budget configuration for a company
 *
 * @param companyId - Company identifier
 * @returns Budget configuration
 */
async function getBudgetConfig(companyId: string): Promise<BudgetConfig> {
  // TODO: Fetch from database
  // For now, return default
  return DEFAULT_BUDGET;
}

/**
 * Get current budget usage for a company
 *
 * @param companyId - Company identifier
 * @returns Budget usage
 */
async function getBudgetUsage(companyId: string): Promise<BudgetUsage> {
  let usage = budgetUsage.get(companyId);

  if (!usage || isNewPeriod(usage.periodEnd)) {
    // Initialize or reset for new period
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month

    usage = {
      companyId,
      usedUsd: 0,
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd,
      alertsSent: [],
    };

    budgetUsage.set(companyId, usage);
  }

  return usage;
}

/**
 * Check if current date is in a new period
 *
 * @param periodEnd - End of current period
 * @returns True if new period has started
 */
function isNewPeriod(periodEnd: Date): boolean {
  return new Date() >= periodEnd;
}

/**
 * Update budget usage after AI operation
 *
 * @param companyId - Company identifier
 * @param costUsd - Cost in USD
 */
export async function updateBudgetUsage(companyId: string, costUsd: number): Promise<void> {
  const usage = await getBudgetUsage(companyId);
  usage.usedUsd += costUsd;

  budgetUsage.set(companyId, usage);

  // Update Prometheus metrics
  const config = await getBudgetConfig(companyId);
  updateBudgetRemaining({
    companyId,
    limitUsd: config.limitUsd,
    usedUsd: usage.usedUsd,
    period: 'monthly',
    resetAt: usage.periodEnd,
  });

  // Check and send alerts
  await checkBudgetAlerts(companyId, config, usage);
}

/**
 * Check budget thresholds and send alerts
 *
 * @param companyId - Company identifier
 * @param config - Budget configuration
 * @param usage - Budget usage
 */
async function checkBudgetAlerts(
  companyId: string,
  config: BudgetConfig,
  usage: BudgetUsage
): Promise<void> {
  const percentUsed = (usage.usedUsd / config.limitUsd) * 100;

  for (const threshold of config.alertThresholds) {
    if (percentUsed >= threshold && !usage.alertsSent.includes(threshold)) {
      // Send alert
      await sendBudgetAlert(companyId, threshold, usage.usedUsd, config.limitUsd);

      // Record that alert was sent
      usage.alertsSent.push(threshold);
      usage.lastAlertAt = new Date();

      // Update Prometheus metric
      recordBudgetAlert(companyId, `${threshold}%`);

      logger.warn(`Budget alert: Company ${companyId} reached ${threshold}% of AI budget`, {
        companyId,
        threshold,
        usedUsd: usage.usedUsd,
        limitUsd: config.limitUsd,
        percentUsed: percentUsed.toFixed(2),
      });
    }
  }
}

/**
 * Send budget alert notification
 *
 * @param companyId - Company identifier
 * @param threshold - Threshold percentage
 * @param usedUsd - Amount used
 * @param limitUsd - Budget limit
 */
async function sendBudgetAlert(
  companyId: string,
  threshold: number,
  usedUsd: number,
  limitUsd: number
): Promise<void> {
  // TODO: Integrate with notifications service to send email/SMS alert
  logger.info('Sending budget alert', {
    companyId,
    threshold,
    usedUsd: usedUsd.toFixed(2),
    limitUsd,
    message: `AI budget ${threshold}% consumed`,
  });

  // Example notification payload:
  // {
  //   companyId,
  //   type: 'email',
  //   templateId: 'ai-budget-alert',
  //   recipient: await getCompanyAdminEmail(companyId),
  //   payload: {
  //     threshold,
  //     usedUsd: usedUsd.toFixed(2),
  //     limitUsd,
  //     percentUsed: ((usedUsd / limitUsd) * 100).toFixed(1),
  //   },
  // }
}

/**
 * Fastify middleware to enforce cost guardrails
 *
 * Checks if company has budget remaining before allowing AI operations
 *
 * @param request - Fastify request
 * @param reply - Fastify reply
 */
export async function costGuardrailsMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extract company ID from request
  const companyId = (request.body as any)?.companyId;

  if (!companyId) {
    // Skip check if no company ID (should be caught by validation)
    return;
  }

  try {
    const config = await getBudgetConfig(companyId);
    const usage = await getBudgetUsage(companyId);

    const percentUsed = (usage.usedUsd / config.limitUsd) * 100;

    // Soft warning at 80%
    if (percentUsed >= 80 && percentUsed < 100) {
      logger.warn(`Company ${companyId} approaching AI budget limit`, {
        companyId,
        percentUsed: percentUsed.toFixed(2),
        usedUsd: usage.usedUsd.toFixed(2),
        limitUsd: config.limitUsd,
      });
    }

    // Hard stop at 100%
    if (usage.usedUsd >= config.limitUsd) {
      logger.error(`Company ${companyId} AI budget exceeded`, {
        companyId,
        usedUsd: usage.usedUsd.toFixed(2),
        limitUsd: config.limitUsd,
      });

      return reply.status(429).send({
        error: 'AI budget exceeded',
        message: `Your monthly AI budget of $${config.limitUsd} has been exceeded. Usage: $${usage.usedUsd.toFixed(2)}. Budget resets on ${usage.periodEnd.toISOString().split('T')[0]}.`,
        details: {
          limitUsd: config.limitUsd,
          usedUsd: usage.usedUsd,
          periodEnd: usage.periodEnd,
        },
      });
    }
  } catch (error: any) {
    logger.error('Cost guardrails check failed', {
      companyId,
      error: error.message,
    });
    // Don't block request on guardrail check failure
    // Log error and continue
  }
}

/**
 * Get budget status for a company
 *
 * @param companyId - Company identifier
 * @returns Budget status
 */
export async function getBudgetStatus(companyId: string): Promise<{
  limitUsd: number;
  usedUsd: number;
  remainingUsd: number;
  percentUsed: number;
  periodEnd: Date;
  status: 'ok' | 'warning' | 'exceeded';
}> {
  const config = await getBudgetConfig(companyId);
  const usage = await getBudgetUsage(companyId);

  const remainingUsd = Math.max(0, config.limitUsd - usage.usedUsd);
  const percentUsed = (usage.usedUsd / config.limitUsd) * 100;

  let status: 'ok' | 'warning' | 'exceeded' = 'ok';
  if (percentUsed >= 100) {
    status = 'exceeded';
  } else if (percentUsed >= 80) {
    status = 'warning';
  }

  return {
    limitUsd: config.limitUsd,
    usedUsd: usage.usedUsd,
    remainingUsd,
    percentUsed,
    periodEnd: usage.periodEnd,
    status,
  };
}
