import { FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { checkBudget } from '../cost-tracking.js';

const logger = createServiceLogger('q2q-rate-limit');

// In-memory rate limit tracking (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit middleware: max 100 Q2Q requests per minute per company
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Extract company ID from request (from query, body, or headers)
  const companyId =
    (request.query as any)?.companyId ||
    (request.body as any)?.companyId ||
    request.headers['x-company-id'];

  if (!companyId) {
    // If no company ID, skip rate limiting
    return;
  }

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  // Get or create rate limit entry
  let rateLimitEntry = rateLimitMap.get(companyId);

  if (!rateLimitEntry || now > rateLimitEntry.resetAt) {
    rateLimitEntry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitMap.set(companyId, rateLimitEntry);
  }

  // Check rate limit
  if (rateLimitEntry.count >= maxRequests) {
    const retryAfter = Math.ceil((rateLimitEntry.resetAt - now) / 1000);

    logger.warn(`Rate limit exceeded for company ${companyId}`);

    return reply.status(429).send({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${maxRequests} requests per minute.`,
      retryAfter,
    });
  }

  // Increment counter
  rateLimitEntry.count++;
}

/**
 * Budget check middleware: enforce monthly AI spend caps
 */
export async function budgetCheckMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Extract company ID
  const companyId =
    (request.query as any)?.companyId ||
    (request.body as any)?.companyId ||
    request.headers['x-company-id'];

  if (!companyId) {
    // If no company ID, skip budget check
    return;
  }

  // Check budget
  const budgetStatus = await checkBudget(companyId);

  if (!budgetStatus.allowed) {
    logger.warn(`Budget exceeded for company ${companyId}: ${budgetStatus.spent}/${budgetStatus.budget}`);

    return reply.status(429).send({
      error: 'AI Budget Exceeded',
      message: 'Monthly AI budget has been exceeded. Please contact your administrator.',
      budget: budgetStatus,
    });
  }

  // Add budget info to request for logging
  (request as any).budgetStatus = budgetStatus;
}
