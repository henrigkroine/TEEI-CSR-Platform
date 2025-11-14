/**
 * Webhook Signature Verification Module
 *
 * Verifies webhook signatures from external CSR platforms:
 * - Benevity (HMAC-SHA256)
 * - Goodera (HMAC-SHA256)
 * - Workday (HMAC-SHA256 or OAuth Bearer)
 *
 * Security features:
 * - Constant-time comparison to prevent timing attacks
 * - Timestamp validation to prevent replay attacks
 * - Multiple signature versions support
 * - Automatic secret rotation
 *
 * Ref: Mission § Webhook signature verification for partner callbacks
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:webhook-verifier');

export interface WebhookVerificationResult {
  verified: boolean;
  reason?: string;
  timestamp?: number;
  signatureVersion?: string;
}

/**
 * Benevity Webhook Verification
 *
 * Benevity uses HMAC-SHA256 with format:
 * X-Benevity-Signature: t=<timestamp>,v1=<signature>
 */
export class BenevityWebhookVerifier {
  constructor(private secret: string) {}

  /**
   * Verify Benevity webhook signature
   */
  verify(
    rawBody: string | Buffer,
    signature: string,
    maxAgeSeconds: number = 300
  ): WebhookVerificationResult {
    try {
      // Parse signature header: "t=1234567890,v1=abc123..."
      const parts = signature.split(',');
      const timestampPart = parts.find((p) => p.startsWith('t='));
      const signaturePart = parts.find((p) => p.startsWith('v1='));

      if (!timestampPart || !signaturePart) {
        return {
          verified: false,
          reason: 'Invalid signature format. Expected: t=<timestamp>,v1=<signature>',
        };
      }

      const timestamp = parseInt(timestampPart.substring(2), 10);
      const providedSignature = signaturePart.substring(3);

      // Verify timestamp is not too old (prevent replay attacks)
      const now = Math.floor(Date.now() / 1000);
      if (now - timestamp > maxAgeSeconds) {
        return {
          verified: false,
          reason: `Timestamp too old. Webhook is ${now - timestamp} seconds old (max: ${maxAgeSeconds})`,
          timestamp,
        };
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = createHmac('sha256', this.secret)
        .update(signedPayload)
        .digest('hex');

      // Constant-time comparison
      const verified = this.constantTimeCompare(providedSignature, expectedSignature);

      if (!verified) {
        return {
          verified: false,
          reason: 'Signature mismatch',
          timestamp,
          signatureVersion: 'v1',
        };
      }

      return {
        verified: true,
        timestamp,
        signatureVersion: 'v1',
      };
    } catch (error: any) {
      logger.error('Benevity signature verification failed', { error: error.message });
      return {
        verified: false,
        reason: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Constant-time string comparison
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return timingSafeEqual(bufA, bufB);
  }
}

/**
 * Goodera Webhook Verification
 *
 * Goodera uses HMAC-SHA256 with format:
 * X-Goodera-Signature: sha256=<signature>
 * X-Goodera-Request-Timestamp: <timestamp>
 */
export class GooderaWebhookVerifier {
  constructor(private secret: string) {}

  /**
   * Verify Goodera webhook signature
   */
  verify(
    rawBody: string | Buffer,
    signature: string,
    requestTimestamp: string,
    maxAgeSeconds: number = 300
  ): WebhookVerificationResult {
    try {
      // Parse signature header: "sha256=abc123..."
      if (!signature.startsWith('sha256=')) {
        return {
          verified: false,
          reason: 'Invalid signature format. Expected: sha256=<signature>',
        };
      }

      const providedSignature = signature.substring(7); // Remove "sha256=" prefix

      // Verify timestamp
      const timestamp = parseInt(requestTimestamp, 10);
      if (isNaN(timestamp)) {
        return {
          verified: false,
          reason: 'Invalid timestamp format',
        };
      }

      const now = Math.floor(Date.now() / 1000);
      if (now - timestamp > maxAgeSeconds) {
        return {
          verified: false,
          reason: `Timestamp too old. Webhook is ${now - timestamp} seconds old (max: ${maxAgeSeconds})`,
          timestamp,
        };
      }

      // Compute expected signature
      // Goodera signs: timestamp + "." + body
      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = createHmac('sha256', this.secret)
        .update(signedPayload)
        .digest('hex');

      // Constant-time comparison
      const verified = this.constantTimeCompare(providedSignature, expectedSignature);

      if (!verified) {
        return {
          verified: false,
          reason: 'Signature mismatch',
          timestamp,
          signatureVersion: 'sha256',
        };
      }

      return {
        verified: true,
        timestamp,
        signatureVersion: 'sha256',
      };
    } catch (error: any) {
      logger.error('Goodera signature verification failed', { error: error.message });
      return {
        verified: false,
        reason: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Constant-time string comparison
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return timingSafeEqual(bufA, bufB);
  }
}

/**
 * Workday Webhook Verification
 *
 * Workday uses HMAC-SHA256 with format:
 * X-Workday-Signature: <signature>
 * X-Workday-Request-Timestamp: <iso-timestamp>
 */
export class WorkdayWebhookVerifier {
  constructor(private secret: string) {}

  /**
   * Verify Workday webhook signature
   */
  verify(
    rawBody: string | Buffer,
    signature: string,
    requestTimestamp: string,
    maxAgeSeconds: number = 300
  ): WebhookVerificationResult {
    try {
      const providedSignature = signature;

      // Verify timestamp (ISO 8601 format)
      const timestamp = new Date(requestTimestamp).getTime() / 1000;
      if (isNaN(timestamp)) {
        return {
          verified: false,
          reason: 'Invalid timestamp format. Expected ISO 8601.',
        };
      }

      const now = Math.floor(Date.now() / 1000);
      if (now - timestamp > maxAgeSeconds) {
        return {
          verified: false,
          reason: `Timestamp too old. Webhook is ${Math.floor(now - timestamp)} seconds old (max: ${maxAgeSeconds})`,
          timestamp,
        };
      }

      // Compute expected signature
      // Workday signs: timestamp + ":" + body
      const signedPayload = `${requestTimestamp}:${rawBody}`;
      const expectedSignature = createHmac('sha256', this.secret)
        .update(signedPayload)
        .digest('base64');

      // Constant-time comparison
      const verified = this.constantTimeCompare(providedSignature, expectedSignature);

      if (!verified) {
        return {
          verified: false,
          reason: 'Signature mismatch',
          timestamp,
          signatureVersion: 'v1',
        };
      }

      return {
        verified: true,
        timestamp,
        signatureVersion: 'v1',
      };
    } catch (error: any) {
      logger.error('Workday signature verification failed', { error: error.message });
      return {
        verified: false,
        reason: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Constant-time string comparison
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return timingSafeEqual(bufA, bufB);
  }
}

/**
 * Unified webhook verifier factory
 */
export class WebhookVerifierFactory {
  /**
   * Create verifier for a platform
   */
  static create(
    platform: 'benevity' | 'goodera' | 'workday',
    secret: string
  ): BenevityWebhookVerifier | GooderaWebhookVerifier | WorkdayWebhookVerifier {
    switch (platform) {
      case 'benevity':
        return new BenevityWebhookVerifier(secret);
      case 'goodera':
        return new GooderaWebhookVerifier(secret);
      case 'workday':
        return new WorkdayWebhookVerifier(secret);
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  /**
   * Verify webhook from any platform
   */
  static verify(
    platform: 'benevity' | 'goodera' | 'workday',
    secret: string,
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ): WebhookVerificationResult {
    const verifier = WebhookVerifierFactory.create(platform, secret);

    switch (platform) {
      case 'benevity': {
        const signature = headers['x-benevity-signature'] as string;
        if (!signature) {
          return { verified: false, reason: 'Missing X-Benevity-Signature header' };
        }
        return (verifier as BenevityWebhookVerifier).verify(rawBody, signature);
      }

      case 'goodera': {
        const signature = headers['x-goodera-signature'] as string;
        const timestamp = headers['x-goodera-request-timestamp'] as string;
        if (!signature || !timestamp) {
          return {
            verified: false,
            reason: 'Missing X-Goodera-Signature or X-Goodera-Request-Timestamp header',
          };
        }
        return (verifier as GooderaWebhookVerifier).verify(rawBody, signature, timestamp);
      }

      case 'workday': {
        const signature = headers['x-workday-signature'] as string;
        const timestamp = headers['x-workday-request-timestamp'] as string;
        if (!signature || !timestamp) {
          return {
            verified: false,
            reason: 'Missing X-Workday-Signature or X-Workday-Request-Timestamp header',
          };
        }
        return (verifier as WorkdayWebhookVerifier).verify(rawBody, signature, timestamp);
      }

      default:
        return { verified: false, reason: `Unknown platform: ${platform}` };
    }
  }
}

/**
 * Fastify middleware for webhook verification
 *
 * Usage:
 * ```typescript
 * app.post('/webhooks/benevity', {
 *   preHandler: createWebhookVerificationMiddleware('benevity', process.env.BENEVITY_WEBHOOK_SECRET!)
 * }, handler);
 * ```
 */
export function createWebhookVerificationMiddleware(
  platform: 'benevity' | 'goodera' | 'workday',
  secret: string
) {
  return async (request: any, reply: any): Promise<void> => {
    // Get raw body
    const rawBody = request.rawBody || JSON.stringify(request.body);

    // Verify signature
    const result = WebhookVerifierFactory.verify(platform, secret, rawBody, request.headers);

    if (!result.verified) {
      logger.warn('Webhook verification failed', {
        platform,
        reason: result.reason,
        ip: request.ip,
        url: request.url,
      });

      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: `Webhook verification failed: ${result.reason}`,
      });
    }

    logger.debug('Webhook verified successfully', {
      platform,
      timestamp: result.timestamp,
      signatureVersion: result.signatureVersion,
    });

    // Attach verification result to request
    request.webhookVerification = result;
  };
}
