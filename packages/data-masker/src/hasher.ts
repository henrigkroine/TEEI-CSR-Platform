import { createHash, randomBytes } from 'node:crypto';

/**
 * Default salt for demo tenants (overridable per tenant)
 */
export const DEFAULT_DEMO_SALT = 'teei-demo-factory-salt-v1';

/**
 * Generate a deterministic hash from tenant ID, subject key, and salt
 * This ensures the same input always produces the same output
 */
export function generateDeterministicHash(
  tenantId: string,
  subjectKey: string,
  salt: string = DEFAULT_DEMO_SALT
): string {
  const input = `${tenantId}:${subjectKey}:${salt}`;
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a deterministic seed number from hash for seeding faker
 * Ensures consistent fake data generation
 */
export function hashToSeed(hash: string): number {
  // Take first 8 characters and convert to integer
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Generate a deterministic UUID-like string from hash
 */
export function hashToUUID(hash: string): string {
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16), // Version 4 UUID
    hash.substring(16, 20),
    hash.substring(20, 32),
  ].join('-');
}

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a value with SHA-256 (for non-reversible hashing)
 */
export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
