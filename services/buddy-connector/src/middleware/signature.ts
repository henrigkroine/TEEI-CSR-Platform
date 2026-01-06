import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('buddy-connector:signature');

/**
 * HMAC-SHA256 signature validation middleware for Buddy System webhooks
 *
 * Security features:
 * - Validates X-Buddy-Signature header against computed HMAC-SHA256
 * - Prevents replay attacks with timestamp tolerance (±5 minutes)
 * - Uses timing-safe comparison to prevent timing attacks
 *
 * Required environment variables:
 * - BUDDY_WEBHOOK_SECRET: Shared secret for HMAC computation
 *
 * Expected headers:
 * - X-Buddy-Signature: HMAC-SHA256 signature in format "t=<timestamp>,v1=<signature>"
 * - X-Delivery-Id: Unique delivery ID for idempotency
 */

const WEBHOOK_SECRET = process.env.BUDDY_WEBHOOK_SECRET || 'dev-secret-change-in-production';
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

interface SignatureComponents {
  timestamp: number;
  signature: string;
}

/**
 * Parse the signature header format: "t=<timestamp>,v1=<signature>"
 */
function parseSignatureHeader(header: string): SignatureComponents | null {
  const parts = header.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return null;
  }

  const timestamp = parseInt(timestampPart.split('=')[1]);
  const signature = signaturePart.split('=')[1];

  if (isNaN(timestamp) || !signature) {
    return null;
  }

  return { timestamp, signature };
}

/**
 * Compute HMAC-SHA256 signature for webhook payload
 */
function computeSignature(timestamp: number, payload: string): string {
  const signedPayload = `${timestamp}.${payload}`;
  return createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');
}

/**
 * Verify webhook timestamp is within tolerance window (prevent replay attacks)
 */
function verifyTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const timestampMs = timestamp * 1000; // Convert to milliseconds
  const diff = Math.abs(now - timestampMs);
  return diff <= TIMESTAMP_TOLERANCE_MS;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Fastify preHandler hook for webhook signature validation
 */
export async function validateWebhookSignature(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const signatureHeader = request.headers['x-buddy-signature'] as string | undefined;
  const deliveryId = request.headers['x-delivery-id'] as string | undefined;

  // Check required headers
  if (!signatureHeader) {
    logger.warn({ url: request.url }, 'Missing X-Buddy-Signature header');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing signature header',
    });
  }

  if (!deliveryId) {
    logger.warn({ url: request.url }, 'Missing X-Delivery-Id header');
    return reply.status(400).send({
      error: 'Bad Request',
      message: 'Missing delivery ID header',
    });
  }

  // Parse signature header
  const components = parseSignatureHeader(signatureHeader);
  if (!components) {
    logger.warn({ signatureHeader }, 'Invalid signature header format');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid signature format',
    });
  }

  // Verify timestamp (prevent replay attacks)
  if (!verifyTimestamp(components.timestamp)) {
    logger.warn(
      { timestamp: components.timestamp, now: Date.now() },
      'Signature timestamp outside tolerance window'
    );
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Signature expired or timestamp invalid',
    });
  }

  // Get raw request body
  const rawBody = JSON.stringify(request.body);

  // Compute expected signature
  const expectedSignature = computeSignature(components.timestamp, rawBody);

  // Timing-safe comparison
  if (!secureCompare(components.signature, expectedSignature)) {
    logger.warn(
      {
        deliveryId,
        url: request.url,
        receivedSig: components.signature.substring(0, 10) + '...',
      },
      'Signature validation failed'
    );
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid signature',
    });
  }

  logger.debug({ deliveryId, url: request.url }, 'Webhook signature validated successfully');
}

/**
 * Utility function to generate signature for testing/integration
 * Usage: Add to webhook sender to generate the X-Buddy-Signature header
 */
export function generateWebhookSignature(payload: Record<string, any>): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify(payload);
  const signature = computeSignature(timestamp, rawBody);
  return `t=${timestamp},v1=${signature}`;
}
