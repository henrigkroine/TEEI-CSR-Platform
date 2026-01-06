import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Webhook Signature Validation for Kintell
 *
 * Implements HMAC-SHA256 signature verification to ensure webhooks
 * are authentic and haven't been tampered with.
 *
 * Kintell webhook signature format (assumed - adjust based on actual provider):
 * - Header: X-Kintell-Signature
 * - Format: sha256=<hex-encoded-hmac>
 * - HMAC computed over raw request body
 *
 * Configuration:
 * - KINTELL_WEBHOOK_SECRET (required in production)
 */

export interface WebhookSignatureConfig {
  secret: string;
  headerName: string;
  algorithm: string;
  tolerance?: number;  // Timestamp tolerance in seconds (for replay attack prevention)
}

/**
 * Default configuration for Kintell webhooks
 */
export const kintellWebhookConfig: WebhookSignatureConfig = {
  secret: process.env.KINTELL_WEBHOOK_SECRET || '',
  headerName: 'x-kintell-signature',
  algorithm: 'sha256',
  tolerance: 300  // 5 minutes
};

/**
 * Compute HMAC-SHA256 signature
 */
export function computeHMAC(payload: string | Buffer, secret: string, algorithm = 'sha256'): string {
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Verify HMAC signature
 *
 * @param payload - Raw request body (string or Buffer)
 * @param signature - Signature from request header
 * @param secret - Webhook secret
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns true if signature is valid
 */
export function verifyHMAC(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm = 'sha256'
): boolean {
  if (!secret) {
    throw new Error('Webhook secret not configured');
  }

  // Remove algorithm prefix if present (e.g., "sha256=abc123")
  const signatureValue = signature.includes('=')
    ? signature.split('=')[1]
    : signature;

  // Compute expected signature
  const expectedSignature = computeHMAC(payload, secret, algorithm);

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureValue, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    // Length mismatch or invalid hex
    return false;
  }
}

/**
 * Verify timestamp to prevent replay attacks
 *
 * @param timestamp - Unix timestamp from webhook header
 * @param tolerance - Maximum age in seconds
 * @returns true if timestamp is within tolerance
 */
export function verifyTimestamp(timestamp: number, tolerance: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);
  return age <= tolerance;
}

/**
 * Verify Kintell webhook signature (standard format)
 *
 * Expected header format: "sha256=<hex-signature>"
 * Or with timestamp: "t=<timestamp>,v1=<signature>"
 */
export function verifyKintellSignature(
  payload: string | Buffer,
  signatureHeader: string | undefined,
  config: WebhookSignatureConfig = kintellWebhookConfig
): { valid: boolean; error?: string } {
  if (!config.secret) {
    return {
      valid: false,
      error: 'Webhook secret not configured. Set KINTELL_WEBHOOK_SECRET environment variable.'
    };
  }

  if (!signatureHeader) {
    return {
      valid: false,
      error: 'Missing signature header'
    };
  }

  // Parse signature header
  // Format 1: "sha256=abc123"
  // Format 2: "t=1234567890,v1=abc123" (with timestamp)
  if (signatureHeader.includes(',')) {
    // Format 2: Stripe-style with timestamp
    const parts = signatureHeader.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));

    if (!signaturePart) {
      return { valid: false, error: 'Invalid signature format' };
    }

    const signature = signaturePart.substring(3);

    // Verify timestamp if present
    if (timestampPart && config.tolerance) {
      const timestamp = parseInt(timestampPart.substring(2), 10);
      if (!verifyTimestamp(timestamp, config.tolerance)) {
        return { valid: false, error: 'Webhook timestamp too old (possible replay attack)' };
      }
    }

    // Verify signature
    const isValid = verifyHMAC(payload, signature, config.secret, config.algorithm);
    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid signature' };

  } else {
    // Format 1: Simple "sha256=abc123"
    const isValid = verifyHMAC(payload, signatureHeader, config.secret, config.algorithm);
    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid signature' };
  }
}

/**
 * Fastify middleware for Kintell webhook signature verification
 *
 * Usage:
 *   app.post('/webhooks/session', {
 *     preHandler: verifyKintellWebhook
 *   }, async (request, reply) => { ... })
 */
export async function verifyKintellWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = kintellWebhookConfig;

  // Get signature from header
  const signatureHeader = request.headers[config.headerName] as string | undefined;

  // Get raw body
  // Note: Fastify parses body by default. For signature verification,
  // we need the raw body. Use rawBody plugin or access request.rawBody
  const rawBody = (request as any).rawBody || JSON.stringify(request.body);

  // Verify signature
  const result = verifyKintellSignature(rawBody, signatureHeader, config);

  if (!result.valid) {
    request.log.warn({
      ip: request.ip,
      error: result.error
    }, 'Kintell webhook signature verification failed');

    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: result.error || 'Invalid webhook signature'
    });
  }

  // Signature valid, continue to handler
  request.log.info('Kintell webhook signature verified');
}

/**
 * Generate a signature for testing
 * Usage in tests to simulate valid Kintell webhooks
 */
export function generateTestSignature(
  payload: string | Buffer,
  secret: string,
  includeTimestamp = false
): string {
  const signature = computeHMAC(payload, secret, 'sha256');

  if (includeTimestamp) {
    const timestamp = Math.floor(Date.now() / 1000);
    return `t=${timestamp},v1=${signature}`;
  }

  return `sha256=${signature}`;
}

/**
 * Example usage in route handler
 */
export function exampleKintellWebhookRoute() {
  return `
// Example route with signature verification:

import { verifyKintellWebhook } from './webhooks/signature.js';

app.post('/webhooks/session', {
  preHandler: verifyKintellWebhook
}, async (request, reply) => {
  // Webhook signature already verified by preHandler
  const data = request.body;

  // Process webhook...

  return { status: 'received' };
});
  `.trim();
}

// Export configuration validator
export function validateWebhookConfig(config: WebhookSignatureConfig): void {
  if (!config.secret) {
    console.warn(
      '⚠️  WARNING: Webhook secret not configured!\n' +
      '   Set KINTELL_WEBHOOK_SECRET environment variable for production.\n' +
      '   Webhook signature verification will fail.'
    );
  } else {
    console.log('✅ Kintell webhook signature verification enabled');
    console.log(`   - Algorithm: HMAC-${config.algorithm.toUpperCase()}`);
    console.log(`   - Header: ${config.headerName}`);
    if (config.tolerance) {
      console.log(`   - Replay protection: ${config.tolerance}s tolerance`);
    }
  }
}

// Validate on module load
if (process.env.NODE_ENV !== 'test') {
  validateWebhookConfig(kintellWebhookConfig);
}
