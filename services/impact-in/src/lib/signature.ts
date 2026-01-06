/**
 * Request Signing Utility for External APIs
 * Provides HMAC-SHA256 signature generation for Benevity and other providers
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead/Benevity Mapper
 */

import { createHmac } from 'crypto';

export interface SignatureConfig {
  secret: string;
  algorithm?: 'sha256' | 'sha512';
  encoding?: 'hex' | 'base64';
}

/**
 * Generate HMAC signature for request payload
 * @param payload - Request body (JSON object or string)
 * @param config - Signature configuration
 * @returns HMAC signature string
 */
export function generateSignature(
  payload: Record<string, any> | string,
  config: SignatureConfig
): string {
  const { secret, algorithm = 'sha256', encoding = 'hex' } = config;

  // Convert payload to string if it's an object
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // Generate HMAC
  const hmac = createHmac(algorithm, secret);
  hmac.update(payloadString);

  return hmac.digest(encoding as any);
}

/**
 * Verify HMAC signature for incoming webhooks
 * @param payload - Request body
 * @param signature - Provided signature
 * @param config - Signature configuration
 * @returns true if signature is valid
 */
export function verifySignature(
  payload: Record<string, any> | string,
  signature: string,
  config: SignatureConfig
): boolean {
  const expectedSignature = generateSignature(payload, config);
  return signature === expectedSignature;
}

/**
 * Generate Benevity-specific signature
 * Uses HMAC-SHA256 with hex encoding
 */
export function generateBenevitySignature(payload: Record<string, any>, secret: string): string {
  return generateSignature(payload, {
    secret,
    algorithm: 'sha256',
    encoding: 'hex',
  });
}

/**
 * Generate timestamp-based signature with replay protection
 * Includes timestamp in signature to prevent replay attacks
 */
export function generateTimestampedSignature(
  payload: Record<string, any>,
  secret: string,
  timestamp?: number
): { signature: string; timestamp: number } {
  const ts = timestamp || Date.now();
  const signaturePayload = `${JSON.stringify(payload)}.${ts}`;

  const signature = generateSignature(signaturePayload, {
    secret,
    algorithm: 'sha256',
    encoding: 'hex',
  });

  return { signature, timestamp: ts };
}

/**
 * Verify timestamped signature with replay protection
 * @param maxAge - Maximum age in milliseconds (default: 5 minutes)
 */
export function verifyTimestampedSignature(
  payload: Record<string, any>,
  signature: string,
  timestamp: number,
  secret: string,
  maxAge: number = 5 * 60 * 1000
): { valid: boolean; error?: string } {
  // Check timestamp age
  const now = Date.now();
  if (now - timestamp > maxAge) {
    return { valid: false, error: 'Signature expired' };
  }

  // Verify signature
  const signaturePayload = `${JSON.stringify(payload)}.${timestamp}`;
  const expectedSignature = generateSignature(signaturePayload, {
    secret,
    algorithm: 'sha256',
    encoding: 'hex',
  });

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}
