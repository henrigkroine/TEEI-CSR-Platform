import crypto from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Webhook Signature Validation for Upskilling Platforms
 *
 * Implements HMAC-SHA256 signature verification for webhooks from
 * upskilling platforms (LinkedIn Learning, Coursera, Udemy, etc.)
 *
 * Expected signature format (adjust based on provider):
 * - Header: X-Upskilling-Signature or X-Hub-Signature
 * - Format: sha256=<hex-encoded-hmac>
 *
 * Configuration:
 * - UPSKILLING_WEBHOOK_SECRET (required in production)
 */

export interface WebhookSignatureConfig {
  secret: string;
  headerName: string;
  algorithm: string;
  tolerance?: number;  // Timestamp tolerance in seconds
}

/**
 * Default configuration for Upskilling webhooks
 */
export const upskillingWebhookConfig: WebhookSignatureConfig = {
  secret: process.env.UPSKILLING_WEBHOOK_SECRET || '',
  headerName: 'x-upskilling-signature',
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
 * Verify HMAC signature with constant-time comparison
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
    return false;
  }
}

/**
 * Verify timestamp to prevent replay attacks
 */
export function verifyTimestamp(timestamp: number, tolerance: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);
  return age <= tolerance;
}

/**
 * Verify Upskilling webhook signature
 *
 * Supports multiple signature formats:
 * 1. "sha256=<signature>" (GitHub-style)
 * 2. "t=<timestamp>,v1=<signature>" (Stripe-style)
 * 3. Plain hex signature
 */
export function verifyUpskillingSignature(
  payload: string | Buffer,
  signatureHeader: string | undefined,
  config: WebhookSignatureConfig = upskillingWebhookConfig
): { valid: boolean; error?: string } {
  if (!config.secret) {
    return {
      valid: false,
      error: 'Webhook secret not configured. Set UPSKILLING_WEBHOOK_SECRET environment variable.'
    };
  }

  if (!signatureHeader) {
    return {
      valid: false,
      error: 'Missing signature header'
    };
  }

  // Parse signature header
  if (signatureHeader.includes(',')) {
    // Stripe-style: "t=1234567890,v1=abc123"
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

    const isValid = verifyHMAC(payload, signature, config.secret, config.algorithm);
    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid signature' };

  } else {
    // GitHub-style or plain: "sha256=abc123" or "abc123"
    const isValid = verifyHMAC(payload, signatureHeader, config.secret, config.algorithm);
    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid signature' };
  }
}

/**
 * Fastify middleware for Upskilling webhook signature verification
 *
 * Usage:
 *   app.post('/webhooks/course-completed', {
 *     preHandler: verifyUpskillingWebhook
 *   }, async (request, reply) => { ... })
 */
export async function verifyUpskillingWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = upskillingWebhookConfig;

  // Get signature from header (try multiple header names)
  const signatureHeader =
    (request.headers[config.headerName] as string) ||
    (request.headers['x-hub-signature'] as string) ||
    (request.headers['x-hub-signature-256'] as string);

  if (!signatureHeader) {
    request.log.warn({ ip: request.ip }, 'Missing webhook signature header');
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Missing webhook signature'
    });
  }

  // Get raw body
  const rawBody = (request as any).rawBody || JSON.stringify(request.body);

  // Verify signature
  const result = verifyUpskillingSignature(rawBody, signatureHeader, config);

  if (!result.valid) {
    request.log.warn({
      ip: request.ip,
      error: result.error
    }, 'Upskilling webhook signature verification failed');

    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: result.error || 'Invalid webhook signature'
    });
  }

  // Signature valid
  request.log.info('Upskilling webhook signature verified');
}

/**
 * Generate a signature for testing
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
 * Provider-specific signature verification
 * Different platforms may use different header names and formats
 */
export const providerConfigs = {
  linkedin: {
    headerName: 'x-linkedin-signature',
    algorithm: 'sha256'
  },
  coursera: {
    headerName: 'x-coursera-signature',
    algorithm: 'sha256'
  },
  udemy: {
    headerName: 'x-udemy-signature',
    algorithm: 'sha256'
  },
  generic: {
    headerName: 'x-hub-signature-256',
    algorithm: 'sha256'
  }
};

/**
 * Create provider-specific middleware
 *
 * Usage:
 *   const linkedInVerifier = createProviderWebhookVerifier('linkedin', secret);
 *   app.post('/webhooks/linkedin', { preHandler: linkedInVerifier }, handler);
 */
export function createProviderWebhookVerifier(
  provider: keyof typeof providerConfigs,
  secret?: string
) {
  const providerConfig = providerConfigs[provider];
  const config: WebhookSignatureConfig = {
    secret: secret || process.env.UPSKILLING_WEBHOOK_SECRET || '',
    headerName: providerConfig.headerName,
    algorithm: providerConfig.algorithm,
    tolerance: 300
  };

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const signatureHeader = request.headers[config.headerName] as string | undefined;
    const rawBody = (request as any).rawBody || JSON.stringify(request.body);

    const result = verifyUpskillingSignature(rawBody, signatureHeader, config);

    if (!result.valid) {
      request.log.warn({
        provider,
        ip: request.ip,
        error: result.error
      }, `${provider} webhook signature verification failed`);

      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: result.error || 'Invalid webhook signature'
      });
    }

    request.log.info({ provider }, 'Webhook signature verified');
  };
}

/**
 * Example usage in route handlers
 */
export function exampleUsage() {
  return `
// Example 1: Generic verification
import { verifyUpskillingWebhook } from './webhooks/signature.js';

app.post('/webhooks/course-completed', {
  preHandler: verifyUpskillingWebhook
}, async (request, reply) => {
  // Signature already verified
  const data = request.body;
  return { status: 'received' };
});

// Example 2: Provider-specific verification
import { createProviderWebhookVerifier } from './webhooks/signature.js';

const linkedInVerifier = createProviderWebhookVerifier('linkedin');

app.post('/webhooks/linkedin', {
  preHandler: linkedInVerifier
}, async (request, reply) => {
  // LinkedIn webhook processed
  return { status: 'received' };
});
  `.trim();
}

/**
 * Validate webhook configuration
 */
export function validateWebhookConfig(config: WebhookSignatureConfig): void {
  if (!config.secret) {
    console.warn(
      '⚠️  WARNING: Upskilling webhook secret not configured!\n' +
      '   Set UPSKILLING_WEBHOOK_SECRET environment variable for production.\n' +
      '   Webhook signature verification will fail.'
    );
  } else {
    console.log('✅ Upskilling webhook signature verification enabled');
    console.log(`   - Algorithm: HMAC-${config.algorithm.toUpperCase()}`);
    console.log(`   - Header: ${config.headerName}`);
    if (config.tolerance) {
      console.log(`   - Replay protection: ${config.tolerance}s tolerance`);
    }
  }
}

// Validate on module load
if (process.env.NODE_ENV !== 'test') {
  validateWebhookConfig(upskillingWebhookConfig);
}
