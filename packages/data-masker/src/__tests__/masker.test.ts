/**
 * Data Masker Tests
 * Verifies deterministic behavior and referential consistency
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataMasker } from '../masker';
import {
  deterministicHash,
  hashToSeed,
  hashToUuid,
  createDeterministicMapper,
} from '../hash';

describe('DataMasker', () => {
  let masker: DataMasker;

  beforeEach(() => {
    masker = new DataMasker({
      tenantId: 'demo-test-tenant',
      masterSalt: 'test-salt-12345',
      locale: 'en',
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce identical masked names for same input', () => {
      const result1 = masker.maskName('John Doe', 'user-123');
      const result2 = masker.maskName('John Doe', 'user-123');

      expect(result1.masked).toBe(result2.masked);
      expect(result1.hash).toBe(result2.hash);
    });

    it('should produce different masked names for different subjects', () => {
      const result1 = masker.maskName('John Doe', 'user-123');
      const result2 = masker.maskName('John Doe', 'user-456');

      expect(result1.masked).not.toBe(result2.masked);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should maintain consistency across all PII types for same subject', () => {
      const subjectKey = 'user-789';

      const name = masker.maskName('Jane Smith', subjectKey);
      const email = masker.maskEmail('jane@example.com', subjectKey);
      const phone = masker.maskPhone('+1-555-1234', subjectKey);

      // All should have same hash (derived from same subject)
      expect(name.hash).toBe(email.hash);
      expect(email.hash).toBe(phone.hash);
    });
  });

  describe('Name Masking', () => {
    it('should preserve name structure by default', () => {
      const singleName = masker.maskName('Alice', 'user-1');
      expect(singleName.masked.split(' ').length).toBe(1);

      const fullName = masker.maskName('Bob Johnson', 'user-2');
      expect(fullName.masked.split(' ').length).toBeGreaterThanOrEqual(2);

      const multiName = masker.maskName('Carol Ann Smith', 'user-3');
      expect(multiName.masked.split(' ').length).toBe(3);
    });

    it('should respect gender option', () => {
      // Just verify it doesn't throw - actual gender depends on faker
      expect(() => {
        masker.maskName('John Doe', 'user-m1', { gender: 'male' });
        masker.maskName('Jane Doe', 'user-f1', { gender: 'female' });
      }).not.toThrow();
    });
  });

  describe('Email Masking', () => {
    it('should generate valid email format', () => {
      const result = masker.maskEmail('test@example.com', 'user-e1');

      expect(result.masked).toMatch(/^[\w.-]+@[\w.-]+\.\w+$/);
    });

    it('should preserve domain when configured', () => {
      const preserveMasker = new DataMasker({
        tenantId: 'demo-test',
        masterSalt: 'test-salt',
        locale: 'en',
        preserveEmailDomain: true,
      });

      const result = preserveMasker.maskEmail('john@company.com', 'user-e2');

      expect(result.masked).toMatch(/@company\.com$/);
    });
  });

  describe('Phone Masking', () => {
    it('should preserve international format', () => {
      const result = masker.maskPhone('+44 123 456 7890', 'user-p1');

      expect(result.masked).toMatch(/^\+/);
    });

    it('should handle various phone formats', () => {
      expect(() => {
        masker.maskPhone('555-1234', 'user-p2');
        masker.maskPhone('(555) 123-4567', 'user-p3');
        masker.maskPhone('+1 555 123 4567', 'user-p4');
      }).not.toThrow();
    });
  });

  describe('Address Masking', () => {
    it('should generate valid address', () => {
      const result = masker.maskAddress(
        '123 Main St, Springfield, USA',
        'user-a1'
      );

      expect(result.masked).toBeTruthy();
      expect(result.masked.length).toBeGreaterThan(0);
    });

    it('should preserve city when configured', () => {
      const result = masker.maskAddress(
        '123 Main St, London, UK',
        'user-a2',
        { preserveCity: true }
      );

      expect(result.masked).toContain('London');
      expect(result.masked).toContain('UK');
    });
  });

  describe('IBAN Masking', () => {
    it('should generate valid IBAN format', () => {
      const result = masker.maskIBAN('GB82 WEST 1234 5698 7654 32', 'user-i1');

      // IBAN starts with 2-letter country code
      expect(result.masked).toMatch(/^[A-Z]{2}\d{2}/);
    });
  });

  describe('Free Text Masking', () => {
    it('should preserve sentence structure by default', () => {
      const original =
        'This is a test sentence. This is another one. And a third.';
      const result = masker.maskFreeText(original, 'user-t1');

      const originalSentences = original.split('. ').length;
      const maskedSentences = result.masked.split('. ').length;

      expect(maskedSentences).toBeGreaterThanOrEqual(originalSentences - 1);
    });

    it('should respect maxLength option', () => {
      const result = masker.maskFreeText('Long text here...', 'user-t2', {
        maxLength: 50,
      });

      expect(result.masked.length).toBeLessThanOrEqual(50);
    });

    it('should redact emails when configured', () => {
      const result = masker.maskFreeText(
        'Contact me at john@example.com for more info',
        'user-t3',
        { redactEntities: ['email'] }
      );

      expect(result.masked).not.toContain('@');
      expect(result.masked).toContain('[REDACTED_EMAIL]');
    });

    it('should redact phone numbers when configured', () => {
      const result = masker.maskFreeText('Call 555-123-4567 today', 'user-t4', {
        redactEntities: ['phone'],
      });

      expect(result.masked).toContain('[REDACTED_PHONE]');
    });
  });

  describe('UUID Generation', () => {
    it('should generate consistent UUIDs for same subject', () => {
      const uuid1 = masker.generateUuid('user-u1');
      const uuid2 = masker.generateUuid('user-u1');

      expect(uuid1).toBe(uuid2);
    });

    it('should generate valid UUID v4 format', () => {
      const uuid = masker.generateUuid('user-u2');

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should generate different UUIDs for different subjects', () => {
      const uuid1 = masker.generateUuid('user-u3');
      const uuid2 = masker.generateUuid('user-u4');

      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track masking operations', () => {
      masker.resetStats();

      masker.maskName('John Doe', 'user-s1');
      masker.maskEmail('john@example.com', 'user-s1');
      masker.maskPhone('555-1234', 'user-s1');

      const stats = masker.getStats();

      expect(stats.totalMasked).toBe(3);
      expect(stats.byType.name).toBe(1);
      expect(stats.byType.email).toBe(1);
      expect(stats.byType.phone).toBe(1);
    });

    it('should reset statistics correctly', () => {
      masker.maskName('Test', 'user-s2');
      masker.resetStats();

      const stats = masker.getStats();

      expect(stats.totalMasked).toBe(0);
      expect(stats.byType.name).toBe(0);
    });
  });

  describe('Tenant Isolation', () => {
    it('should produce different results for different tenants', () => {
      const masker1 = new DataMasker({
        tenantId: 'tenant-1',
        masterSalt: 'salt',
      });

      const masker2 = new DataMasker({
        tenantId: 'tenant-2',
        masterSalt: 'salt',
      });

      const result1 = masker1.maskName('John Doe', 'user-123');
      const result2 = masker2.maskName('John Doe', 'user-123');

      // Same subject, different tenants → different masks
      expect(result1.masked).not.toBe(result2.masked);
      expect(result1.hash).not.toBe(result2.hash);
    });
  });
});

describe('Hash Utilities', () => {
  describe('deterministicHash', () => {
    it('should produce consistent hashes', () => {
      const hash1 = deterministicHash('user-123', 'tenant-1', 'salt');
      const hash2 = deterministicHash('user-123', 'tenant-1', 'salt');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = deterministicHash('user-123', 'tenant-1', 'salt');
      const hash2 = deterministicHash('user-456', 'tenant-1', 'salt');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string', () => {
      const hash = deterministicHash('user-123', 'tenant-1', 'salt');

      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hashToSeed', () => {
    it('should produce consistent seeds from same hash', () => {
      const hash = 'a1b2c3d4e5f6';
      const seed1 = hashToSeed(hash);
      const seed2 = hashToSeed(hash);

      expect(seed1).toBe(seed2);
    });

    it('should produce numeric seed', () => {
      const hash = 'a1b2c3d4';
      const seed = hashToSeed(hash);

      expect(typeof seed).toBe('number');
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    });
  });

  describe('hashToUuid', () => {
    it('should produce valid UUID format', () => {
      const hash =
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0';
      const uuid = hashToUuid(hash);

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should throw for short hashes', () => {
      expect(() => hashToUuid('short')).toThrow();
    });

    it('should produce consistent UUIDs from same hash', () => {
      const hash =
        'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0';
      const uuid1 = hashToUuid(hash);
      const uuid2 = hashToUuid(hash);

      expect(uuid1).toBe(uuid2);
    });
  });

  describe('createDeterministicMapper', () => {
    it('should return consistent mappings', () => {
      const mapper = createDeterministicMapper('tenant-1', 'salt');

      const result1 = mapper('user-123');
      const result2 = mapper('user-123');

      expect(result1.hash).toBe(result2.hash);
      expect(result1.seed).toBe(result2.seed);
      expect(result1.uuid).toBe(result2.uuid);
    });

    it('should cache results', () => {
      const mapper = createDeterministicMapper('tenant-1', 'salt');

      const result1 = mapper('user-123');
      const result2 = mapper('user-123');

      // Should be same object reference (cached)
      expect(result1).toBe(result2);
    });
  });
});
