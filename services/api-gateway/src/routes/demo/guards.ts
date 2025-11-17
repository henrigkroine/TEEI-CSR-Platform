/**
 * Demo Factory Guards
 * Security and validation middleware
 */

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

/**
 * Validate that tenant ID has demo- prefix
 * CRITICAL: Prevents accidental operations on production tenants
 */
export async function demoTenantGuard(
  request: FastifyRequest<{ Params: { tenantId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { tenantId } = request.params;

  // SAFETY: Enforce demo- prefix
  if (!tenantId.startsWith('demo-')) {
    return reply.code(403).send({
      error: 'Forbidden',
      message: 'Only demo tenants (demo-* prefix) can be accessed via demo endpoints',
    });
  }

  // Additional safety: Block any real tenant IDs that might slip through
  const blockedPatterns = [
    /^prod-/,
    /^production-/,
    /^live-/,
    /^customer-/,
    /^client-/,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(tenantId)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Invalid tenant ID for demo operations',
      });
    }
  }
}

/**
 * Validate webhook configuration for demo tenants
 * CRITICAL: Block outbound webhooks from demo tenants
 */
export function blockDemoWebhooks(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const tenantId = (request.params as any)?.tenantId;

  if (tenantId?.startsWith('demo-')) {
    // Check if request is trying to configure webhooks
    const body = request.body as any;

    if (body?.webhookUrl || body?.webhooks) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Demo tenants cannot configure outbound webhooks',
      });
    }
  }

  done();
}

/**
 * Rate limit demo tenant creation
 * Prevents abuse of demo tenant endpoint
 */
const creationAttempts = new Map<string, number[]>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function demoCreationRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ip = request.ip;
  const now = Date.now();

  // Get attempts for this IP
  const attempts = creationAttempts.get(ip) || [];

  // Filter to attempts within window
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return reply.code(429).send({
      error: 'Too Many Requests',
      message: `Maximum ${MAX_ATTEMPTS} demo tenants per hour exceeded`,
      retryAfter: Math.ceil((recentAttempts[0] + WINDOW_MS - now) / 1000),
    });
  }

  // Record this attempt
  recentAttempts.push(now);
  creationAttempts.set(ip, recentAttempts);

  // Cleanup old entries periodically
  if (Math.random() < 0.1) {
    // 10% chance
    for (const [key, timestamps] of creationAttempts.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);
      if (validTimestamps.length === 0) {
        creationAttempts.delete(key);
      } else {
        creationAttempts.set(key, validTimestamps);
      }
    }
  }
}
