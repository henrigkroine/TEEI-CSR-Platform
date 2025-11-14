/**
 * Webhook Helper Utilities
 *
 * Functions for generating webhook signatures and payloads
 */

import { createHmac } from 'crypto';

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  includeTimestamp: boolean = false
): string {
  let signatureBase = payload;

  if (includeTimestamp) {
    const timestamp = Date.now();
    signatureBase = `${timestamp}.${payload}`;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(signatureBase);
  const signature = hmac.digest('hex');

  if (includeTimestamp) {
    const timestamp = Date.now();
    return `t=${timestamp},v1=${signature}`;
  }

  return `v1=${signature}`;
}

/**
 * Generate expired webhook signature for testing replay attacks
 */
export function generateExpiredWebhookSignature(
  payload: string,
  secret: string,
  ageSeconds: number
): string {
  const timestamp = Date.now() - (ageSeconds * 1000);
  const signatureBase = `${timestamp}.${payload}`;

  const hmac = createHmac('sha256', secret);
  hmac.update(signatureBase);
  const signature = hmac.digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Generate invalid signature for testing authentication failures
 */
export function generateInvalidWebhookSignature(): string {
  return `v1=${crypto.randomUUID()}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300000 // 5 minutes
): boolean {
  // Parse signature format: "t=<timestamp>,v1=<signature>"
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!signaturePart) {
    return false;
  }

  const providedSignature = signaturePart.split('=')[1];

  if (timestampPart) {
    const timestamp = parseInt(timestampPart.split('=')[1]);
    const age = Date.now() - timestamp;

    // Check timestamp tolerance (prevent replay attacks)
    if (age > tolerance || age < -tolerance) {
      return false;
    }

    const signatureBase = `${timestamp}.${payload}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(signatureBase)
      .digest('hex');

    return providedSignature === expectedSignature;
  } else {
    // Simple signature without timestamp
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return providedSignature === expectedSignature;
  }
}

/**
 * Create webhook payload for testing
 */
export function createWebhookPayload(
  type: string,
  data: any,
  options: {
    correlationId?: string;
    eventId?: string;
    timestamp?: string;
  } = {}
): any {
  return {
    type,
    data,
    metadata: {
      id: options.eventId || crypto.randomUUID(),
      version: 'v1',
      timestamp: options.timestamp || new Date().toISOString(),
      correlationId: options.correlationId || crypto.randomUUID()
    }
  };
}
