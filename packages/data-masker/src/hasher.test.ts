import { describe, it, expect } from 'vitest';
import {
  generateDeterministicHash,
  hashToSeed,
  hashToUUID,
  generateSalt,
  hashValue,
  DEFAULT_DEMO_SALT,
} from './hasher.js';

describe('Data Masker - Hashing Utilities', () => {
  describe('generateDeterministicHash', () => {
    it('should generate consistent hash for same inputs', () => {
      const hash1 = generateDeterministicHash('tenant1', 'user1', 'salt1');
      const hash2 = generateDeterministicHash('tenant1', 'user1', 'salt1');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different tenants', () => {
      const hash1 = generateDeterministicHash('tenant1', 'user1', 'salt1');
      const hash2 = generateDeterministicHash('tenant2', 'user1', 'salt1');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different subjects', () => {
      const hash1 = generateDeterministicHash('tenant1', 'user1', 'salt1');
      const hash2 = generateDeterministicHash('tenant1', 'user2', 'salt1');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different salts', () => {
      const hash1 = generateDeterministicHash('tenant1', 'user1', 'salt1');
      const hash2 = generateDeterministicHash('tenant1', 'user1', 'salt2');

      expect(hash1).not.toBe(hash2);
    });

    it('should use default salt if none provided', () => {
      const hash1 = generateDeterministicHash('tenant1', 'user1');
      const hash2 = generateDeterministicHash('tenant1', 'user1', DEFAULT_DEMO_SALT);

      expect(hash1).toBe(hash2);
    });

    it('should generate 64-character hex string', () => {
      const hash = generateDeterministicHash('tenant1', 'user1');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('hashToSeed', () => {
    it('should convert hash to numeric seed', () => {
      const hash = generateDeterministicHash('tenant1', 'user1');
      const seed = hashToSeed(hash);

      expect(typeof seed).toBe('number');
      expect(seed).toBeGreaterThan(0);
    });

    it('should generate consistent seed from same hash', () => {
      const hash = generateDeterministicHash('tenant1', 'user1');
      const seed1 = hashToSeed(hash);
      const seed2 = hashToSeed(hash);

      expect(seed1).toBe(seed2);
    });

    it('should generate different seeds from different hashes', () => {
      const hash1 = generateDeterministicHash('tenant1', 'user1');
      const hash2 = generateDeterministicHash('tenant1', 'user2');

      const seed1 = hashToSeed(hash1);
      const seed2 = hashToSeed(hash2);

      expect(seed1).not.toBe(seed2);
    });

    it('should handle edge cases', () => {
      const hash = '00000000000000000000000000000000000000000000000000000000000000ff';
      const seed = hashToSeed(hash);

      expect(typeof seed).toBe('number');
      expect(seed).toBe(0); // First 8 chars are all zeros
    });
  });

  describe('hashToUUID', () => {
    it('should generate UUID format from hash', () => {
      const hash = generateDeterministicHash('tenant1', 'user1');
      const uuid = hashToUUID(hash);

      // UUID format: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate consistent UUID from same hash', () => {
      const hash = generateDeterministicHash('tenant1', 'user1');
      const uuid1 = hashToUUID(hash);
      const uuid2 = hashToUUID(hash);

      expect(uuid1).toBe(uuid2);
    });

    it('should generate different UUIDs from different hashes', () => {
      const hash1 = generateDeterministicHash('tenant1', 'user1');
      const hash2 = generateDeterministicHash('tenant1', 'user2');

      const uuid1 = hashToUUID(hash1);
      const uuid2 = hashToUUID(hash2);

      expect(uuid1).not.toBe(uuid2);
    });

    it('should always have version 4 marker', () => {
      const hash = generateDeterministicHash('tenant1', 'user1');
      const uuid = hashToUUID(hash);

      // Character at position 14 should be '4'
      expect(uuid.charAt(14)).toBe('4');
    });
  });

  describe('generateSalt', () => {
    it('should generate random salt', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toBe(salt2);
    });

    it('should generate salt of default length', () => {
      const salt = generateSalt();

      expect(salt).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate salt of specified length', () => {
      const salt = generateSalt(16);

      expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate hex string', () => {
      const salt = generateSalt();

      expect(salt).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different salts each time', () => {
      const salts = new Set();
      for (let i = 0; i < 10; i++) {
        salts.add(generateSalt());
      }

      expect(salts.size).toBe(10);
    });
  });

  describe('hashValue', () => {
    it('should hash a value with SHA-256', () => {
      const hash = hashValue('test-value');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate consistent hash for same value', () => {
      const hash1 = hashValue('test-value');
      const hash2 = hashValue('test-value');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different values', () => {
      const hash1 = hashValue('value1');
      const hash2 = hashValue('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashValue('');

      expect(hash).toHaveLength(64);
    });

    it('should handle special characters', () => {
      const hash = hashValue('!@#$%^&*()_+{}[]|\\:";\'<>?,./');

      expect(hash).toHaveLength(64);
    });
  });

  describe('Integration: Deterministic Data Flow', () => {
    it('should maintain determinism through full pipeline', () => {
      // Same inputs should produce same outputs at every step
      const tenant = 'demo-test';
      const subject = 'user-123';
      const salt = 'test-salt';

      const hash1 = generateDeterministicHash(tenant, subject, salt);
      const seed1 = hashToSeed(hash1);
      const uuid1 = hashToUUID(hash1);

      const hash2 = generateDeterministicHash(tenant, subject, salt);
      const seed2 = hashToSeed(hash2);
      const uuid2 = hashToUUID(hash2);

      expect(hash1).toBe(hash2);
      expect(seed1).toBe(seed2);
      expect(uuid1).toBe(uuid2);
    });

    it('should produce different outputs for different salts', () => {
      const tenant = 'demo-test';
      const subject = 'user-123';

      const hash1 = generateDeterministicHash(tenant, subject, 'salt-1');
      const hash2 = generateDeterministicHash(tenant, subject, 'salt-2');

      const uuid1 = hashToUUID(hash1);
      const uuid2 = hashToUUID(hash2);

      expect(uuid1).not.toBe(uuid2);
    });
  });
});
