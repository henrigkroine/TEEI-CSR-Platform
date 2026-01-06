/**
 * Deterministic hashing utilities
 * Uses HMAC-SHA256 for secure, reproducible hashing
 */

import { createHmac } from 'crypto';

/**
 * Generate a deterministic hash from a subject key and salt
 *
 * @param subjectKey - The identifier to hash (e.g., user ID, email)
 * @param tenantId - Tenant ID for additional isolation
 * @param masterSalt - Master salt for security
 * @returns Hex string hash
 */
export function deterministicHash(
  subjectKey: string,
  tenantId: string,
  masterSalt: string
): string {
  // Combine tenant and master salt for additional security
  const combinedSalt = `${tenantId}:${masterSalt}`;

  // Use HMAC-SHA256 for secure deterministic hashing
  const hmac = createHmac('sha256', combinedSalt);
  hmac.update(subjectKey);

  return hmac.digest('hex');
}

/**
 * Generate a deterministic seed number from a hash
 * Used for seeding random number generators
 *
 * @param hash - Hex hash string
 * @returns Number between 0 and 2^32-1
 */
export function hashToSeed(hash: string): number {
  // Take first 8 hex chars and convert to number
  const hexSlice = hash.slice(0, 8);
  return parseInt(hexSlice, 16);
}

/**
 * Generate a deterministic UUID-like string from a hash
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @param hash - Hex hash string (at least 32 chars)
 * @returns UUID v4-like string
 */
export function hashToUuid(hash: string): string {
  if (hash.length < 32) {
    throw new Error('Hash must be at least 32 characters');
  }

  // Extract sections from hash
  const part1 = hash.slice(0, 8);
  const part2 = hash.slice(8, 12);
  const part3 = '4' + hash.slice(13, 16); // Version 4
  const part4 = '8' + hash.slice(17, 20); // Variant 10xx
  const part5 = hash.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/**
 * Create a referentially consistent mapper
 * Returns a function that always maps the same input to the same output
 *
 * @param tenantId - Tenant ID
 * @param masterSalt - Master salt
 * @returns Mapping function
 */
export function createDeterministicMapper(
  tenantId: string,
  masterSalt: string
): (subjectKey: string) => { hash: string; seed: number; uuid: string } {
  const cache = new Map<string, { hash: string; seed: number; uuid: string }>();

  return (subjectKey: string) => {
    if (cache.has(subjectKey)) {
      return cache.get(subjectKey)!;
    }

    const hash = deterministicHash(subjectKey, tenantId, masterSalt);
    const seed = hashToSeed(hash);
    const uuid = hashToUuid(hash);

    const result = { hash, seed, uuid };
    cache.set(subjectKey, result);

    return result;
  };
}
