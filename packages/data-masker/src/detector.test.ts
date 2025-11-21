import { describe, it, expect } from 'vitest';
import {
  detectPII,
  assertNoPII,
  redactPII,
  isDemoTenantId,
  assertDemoTenant,
} from './detector.js';

describe('Data Masker - PII Detection', () => {
  describe('detectPII', () => {
    it('should detect email addresses', () => {
      const text = 'Contact us at support@example.com for help';
      const result = detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.detected).toHaveLength(1);
      expect(result.detected[0].type).toBe('email');
      expect(result.detected[0].value).toBe('support@example.com');
    });

    it('should detect phone numbers', () => {
      const text = 'Call me at 555-123-4567';
      const result = detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.detected.some(d => d.type === 'phone')).toBe(true);
    });

    it('should detect SSNs', () => {
      const text = 'SSN: 123-45-6789';
      const result = detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.detected.some(d => d.type === 'ssn')).toBe(true);
    });

    it('should detect IBANs', () => {
      const text = 'IBAN: GB82WEST12345698765432';
      const result = detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.detected.some(d => d.type === 'iban')).toBe(true);
    });

    it('should detect credit card numbers', () => {
      const text = 'Card: 4532-1234-5678-9010';
      const result = detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.detected.some(d => d.type === 'creditCard')).toBe(true);
    });

    it('should detect multiple PII types', () => {
      const text = 'Email: john@example.com, Phone: 555-123-4567';
      const result = detectPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.detected.length).toBeGreaterThanOrEqual(2);
    });

    it('should return no PII for clean text', () => {
      const text = 'This is a safe message with no sensitive data';
      const result = detectPII(text);

      expect(result.hasPII).toBe(false);
      expect(result.detected).toHaveLength(0);
    });

    it('should detect PII at correct positions', () => {
      const text = 'Start email@test.com end';
      const result = detectPII(text);

      expect(result.detected[0].position).toBe(6);
    });
  });

  describe('assertNoPII', () => {
    it('should not throw for clean text', () => {
      expect(() => {
        assertNoPII('This is safe text');
      }).not.toThrow();
    });

    it('should throw when email is detected', () => {
      expect(() => {
        assertNoPII('Contact john@example.com');
      }).toThrow(/PII detected/);
    });

    it('should throw when phone is detected', () => {
      expect(() => {
        assertNoPII('Call 555-123-4567');
      }).toThrow(/PII detected/);
    });

    it('should include context in error message', () => {
      expect(() => {
        assertNoPII('Email: test@example.com', 'user profile');
      }).toThrow(/user profile/);
    });

    it('should list detected PII types in error', () => {
      expect(() => {
        assertNoPII('Email: test@example.com, Phone: 555-1234');
      }).toThrow(/email/);
    });
  });

  describe('redactPII', () => {
    it('should redact email addresses', () => {
      const text = 'Email: john@example.com';
      const redacted = redactPII(text);

      expect(redacted).toBe('Email: [REDACTED]');
    });

    it('should redact phone numbers', () => {
      const text = 'Phone: 555-123-4567';
      const redacted = redactPII(text);

      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('555-123-4567');
    });

    it('should redact multiple PII instances', () => {
      const text = 'Email: john@example.com, Phone: 555-123-4567';
      const redacted = redactPII(text);

      expect(redacted).not.toContain('john@example.com');
      expect(redacted).not.toContain('555-123-4567');
    });

    it('should leave non-PII text intact', () => {
      const text = 'Safe text with Email: [REDACTED]';
      const redacted = redactPII('Safe text with Email: test@example.com');

      expect(redacted).toContain('Safe text with Email:');
    });

    it('should handle empty string', () => {
      expect(redactPII('')).toBe('');
    });

    it('should handle text with no PII', () => {
      const text = 'No sensitive data here';
      expect(redactPII(text)).toBe(text);
    });
  });

  describe('isDemoTenantId', () => {
    it('should return true for demo- prefix', () => {
      expect(isDemoTenantId('demo-acme')).toBe(true);
      expect(isDemoTenantId('demo-test-123')).toBe(true);
    });

    it('should return true for test- prefix', () => {
      expect(isDemoTenantId('test-acme')).toBe(true);
      expect(isDemoTenantId('test-123')).toBe(true);
    });

    it('should return false for production tenant IDs', () => {
      expect(isDemoTenantId('acme-corp')).toBe(false);
      expect(isDemoTenantId('prod-tenant')).toBe(false);
      expect(isDemoTenantId('real-company')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isDemoTenantId('')).toBe(false);
    });
  });

  describe('assertDemoTenant', () => {
    it('should not throw for valid demo tenant IDs', () => {
      expect(() => assertDemoTenant('demo-acme')).not.toThrow();
      expect(() => assertDemoTenant('test-123')).not.toThrow();
    });

    it('should throw for production tenant IDs', () => {
      expect(() => assertDemoTenant('acme-corp')).toThrow(/Invalid demo tenant ID/);
      expect(() => assertDemoTenant('production')).toThrow(/Invalid demo tenant ID/);
    });

    it('should include tenant ID in error message', () => {
      expect(() => assertDemoTenant('bad-tenant')).toThrow(/bad-tenant/);
    });

    it('should provide helpful error message', () => {
      expect(() => assertDemoTenant('wrong')).toThrow(/must start with/);
    });
  });

  describe('Integration: PII Detection After Masking', () => {
    it('should not detect PII in masked data', () => {
      // Simulate masked data
      const maskedText = 'User: demo-user-abc123, Location: Faketown, Country: Testland';
      const result = detectPII(maskedText);

      expect(result.hasPII).toBe(false);
    });

    it('should detect PII if masking was incomplete', () => {
      const partiallyMasked = 'User: demo-user-abc123, Email: leaked@example.com';
      const result = detectPII(partiallyMasked);

      expect(result.hasPII).toBe(true);
      expect(result.detected.some(d => d.type === 'email')).toBe(true);
    });
  });
});
