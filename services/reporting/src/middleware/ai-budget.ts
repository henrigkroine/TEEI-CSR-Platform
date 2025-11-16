/**
 * AI Budget Middleware
 * Pre-flight budget check before calling Claude API
 *
 * Features:
 * - Check tenant budget before API call
 * - Cache budget status in Redis (1 min TTL)
 * - Async usage tracking after API call
 * - Fail-fast on budget exceeded
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';

const AI_BUDGET_SERVICE_URL =
  process.env.AI_BUDGET_SERVICE_URL || 'http://teei-ai-budget:3010';

// Redis client for caching budget status
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  current_usage_usd: number;
  monthly_limit_usd: number;
  percentage_used: number;
}

/**
 * Check if tenant is within AI budget
 * Uses Redis cache to avoid hammering the budget service
 */
export async function checkAIBudget(
  tenantId: string,
  model: string = 'claude-3-5-sonnet-20241022',
  estimatedInputTokens: number = 4000,
  estimatedOutputTokens: number = 2000
): Promise<BudgetCheckResult> {
  const cacheKey = `ai-budget:${tenantId}:${model}`;

  try {
    // Try to get cached status (1 min TTL)
    const cached = await redis.get(cacheKey);
    if (cached) {
      const cachedResult: BudgetCheckResult = JSON.parse(cached);
      // If cached result shows exceeded, don't allow
      if (!cachedResult.allowed) {
        return cachedResult;
      }
    }

    // Check budget via API
    const response = await fetch(`${AI_BUDGET_SERVICE_URL}/api/ai-budget/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        model,
        estimated_input_tokens: estimatedInputTokens,
        estimated_output_tokens: estimatedOutputTokens,
      }),
      signal: AbortSignal.timeout(2000), // 2s timeout
    });

    if (response.status === 429) {
      // Budget exceeded
      const error = await response.json();
      const result: BudgetCheckResult = {
        allowed: false,
        reason: error.message || 'Monthly AI budget exceeded',
        current_usage_usd: error.current_usage_usd || 0,
        monthly_limit_usd: error.monthly_limit_usd || 0,
        percentage_used: error.percentage_used || 100,
      };

      // Cache the exceeded status for 1 min
      await redis.setex(cacheKey, 60, JSON.stringify(result));
      return result;
    }

    if (!response.ok) {
      throw new Error(`Budget check failed: ${response.statusText}`);
    }

    const result: BudgetCheckResult = await response.json();

    // Cache the result for 1 min
    await redis.setex(cacheKey, 60, JSON.stringify(result));

    return result;
  } catch (error) {
    // On error, log and allow (fail open for availability)
    console.error('[AI Budget] Check failed, allowing request:', error);
    return {
      allowed: true,
      current_usage_usd: 0,
      monthly_limit_usd: 0,
      percentage_used: 0,
    };
  }
}

/**
 * Track actual token usage after API call completes
 * Async, fire-and-forget to avoid latency impact
 */
export async function trackAIUsage(
  requestId: string,
  tenantId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  reportType?: string,
  userId?: string
): Promise<void> {
  try {
    // Fire and forget - don't await
    fetch(`${AI_BUDGET_SERVICE_URL}/api/ai-budget/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: requestId,
        tenant_id: tenantId,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        report_type: reportType,
        user_id: userId,
      }),
    }).catch((err) => {
      console.error('[AI Budget] Failed to track usage:', err);
    });

    // Invalidate cache to force fresh check on next request
    const cacheKey = `ai-budget:${tenantId}:${model}`;
    await redis.del(cacheKey);
  } catch (error) {
    // Log but don't fail the request
    console.error('[AI Budget] Error tracking usage:', error);
  }
}

/**
 * Fastify middleware to enforce AI budget before GenAI report generation
 */
export async function aiBudgetMiddleware(
  request: FastifyRequest<{
    Body: {
      tenant_id?: string;
      model?: string;
    };
  }>,
  reply: FastifyReply
) {
  const tenantId = request.body.tenant_id || request.headers['x-tenant-id'] as string;
  const model = request.body.model || 'claude-3-5-sonnet-20241022';

  if (!tenantId) {
    return reply.code(400).send({
      error: 'Missing tenant_id',
      message: 'Tenant ID is required for AI budget enforcement',
    });
  }

  // Estimate token usage (conservative high estimates)
  // Quarterly report: ~4k input, ~2k output
  // Annual report: ~8k input, ~4k output
  // Impact deep dive: ~6k input, ~3k output
  const estimatedInputTokens = 6000;
  const estimatedOutputTokens = 3000;

  const budgetCheck = await checkAIBudget(
    tenantId,
    model,
    estimatedInputTokens,
    estimatedOutputTokens
  );

  if (!budgetCheck.allowed) {
    return reply.code(429).send({
      error: 'AI Budget Exceeded',
      message: budgetCheck.reason,
      current_usage_usd: budgetCheck.current_usage_usd,
      monthly_limit_usd: budgetCheck.monthly_limit_usd,
      percentage_used: budgetCheck.percentage_used,
      fallback: {
        suggestion: 'Use cached template or upgrade your plan',
        contact: 'Contact your account manager to increase budget',
      },
    });
  }

  // If warning level (>80%), add header
  if (budgetCheck.percentage_used >= 80) {
    reply.header('X-AI-Budget-Warning', 'true');
    reply.header('X-AI-Budget-Usage', budgetCheck.percentage_used.toString());
  }

  // Continue to handler
}

/**
 * Helper to get tenant budget status (for dashboard)
 */
export async function getTenantBudgetStatus(tenantId: string) {
  try {
    const response = await fetch(
      `${AI_BUDGET_SERVICE_URL}/api/ai-budget/tenant/${tenantId}`,
      {
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get budget status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[AI Budget] Failed to get status:', error);
    throw error;
  }
}
