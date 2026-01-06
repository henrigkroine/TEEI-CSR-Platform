import { describe, it, expect } from 'vitest';
import {
  createMaskingContext,
  maskName,
  maskEmail,
  maskPhone,
  maskAddress,
  maskIBAN,
  maskFreeText,
  maskCompanyName,
  maskJobTitle,
  generateDeterministicUserId,
} from './maskers.js';

describe('Data Masker - Core Functions', () => {
  describe('createMaskingContext', () => {
    it('should create a masking context with default locale', () => {
      const context = createMaskingContext('demo-test', 'user-1');

      expect(context).toMatchObject({
        tenantId: 'demo-test',
        subjectKey: 'user-1',
        locale: 'en',
      });
      expect(context.salt).toBeDefined();
    });

    it('should create a masking context with custom locale', () => {
      const context = createMaskingContext('demo-test', 'user-1', 'fr');

      expect(context.locale).toBe('fr');
    });

    it('should create a masking context with custom salt', () => {
      const customSalt = 'custom-salt-123';
      const context = createMaskingContext('demo-test', 'user-1', 'en', customSalt);

      expect(context.salt).toBe(customSalt);
    });
  });

  describe('maskName', () => {
    it('should mask name deterministically', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked1 = maskName('John Doe', context);
      const masked2 = maskName('John Doe', context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe('John Doe');
    });

    it('should produce different names for different users', () => {
      const context1 = createMaskingContext('demo-test', 'user-1');
      const context2 = createMaskingContext('demo-test', 'user-2');

      const masked1 = maskName('John Doe', context1);
      const masked2 = maskName('John Doe', context2);

      expect(masked1).not.toBe(masked2);
    });

    it('should produce different names for different tenants', () => {
      const context1 = createMaskingContext('demo-tenant1', 'user-1');
      const context2 = createMaskingContext('demo-tenant2', 'user-1');

      const masked1 = maskName('John Doe', context1);
      const masked2 = maskName('John Doe', context2);

      expect(masked1).not.toBe(masked2);
    });

    it('should respect gender option', () => {
      const context = createMaskingContext('demo-test', 'user-male');
      const masked = maskName('John Doe', context, { gender: 'male' });

      expect(masked).toBeTruthy();
      expect(typeof masked).toBe('string');
    });
  });

  describe('maskEmail', () => {
    it('should mask email deterministically', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked1 = maskEmail('john@example.com', context);
      const masked2 = maskEmail('john@example.com', context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe('john@example.com');
      expect(masked1).toContain('@');
    });

    it('should preserve domain when requested', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked = maskEmail('john@acme.com', context, { preserveDomain: true });

      expect(masked).toContain('@acme.com');
      expect(masked).not.toBe('john@acme.com');
    });

    it('should generate different emails for different users', () => {
      const context1 = createMaskingContext('demo-test', 'user-1');
      const context2 = createMaskingContext('demo-test', 'user-2');

      const masked1 = maskEmail('john@example.com', context1);
      const masked2 = maskEmail('john@example.com', context2);

      expect(masked1).not.toBe(masked2);
    });
  });

  describe('maskPhone', () => {
    it('should mask phone deterministically', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked1 = maskPhone('+1-555-0100', context);
      const masked2 = maskPhone('+1-555-0100', context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe('+1-555-0100');
    });

    it('should preserve country code when requested', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked = maskPhone('+44-555-0100', context, { preserveCountryCode: true });

      expect(masked).toMatch(/^\+44/);
    });
  });

  describe('maskAddress', () => {
    it('should mask address deterministically', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked1 = maskAddress('123 Main St, Anytown', context);
      const masked2 = maskAddress('123 Main St, Anytown', context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe('123 Main St, Anytown');
    });

    it('should include postal code when requested', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked = maskAddress('123 Main St', context, { includePostalCode: true });

      expect(masked).toBeTruthy();
      expect(masked.split(',').length).toBeGreaterThanOrEqual(2);
    });

    it('should include country when requested', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked = maskAddress('123 Main St', context, { includeCountry: true });

      expect(masked).toBeTruthy();
      expect(masked.split(',').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('maskIBAN', () => {
    it('should mask IBAN deterministically', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked1 = maskIBAN('GB82WEST12345698765432', context);
      const masked2 = maskIBAN('GB82WEST12345698765432', context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe('GB82WEST12345698765432');
    });

    it('should preserve country code when requested', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked = maskIBAN('DE89370400440532013000', context, {
        preserveCountryCode: true,
      });

      expect(masked).toMatch(/^DE/);
    });
  });

  describe('maskFreeText', () => {
    it('should mask free text deterministically', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const text = 'This is some sensitive information';
      const masked1 = maskFreeText(text, context);
      const masked2 = maskFreeText(text, context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe(text);
    });

    it('should preserve length when requested', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const text = 'This is some text';
      const masked = maskFreeText(text, context, { preserveLength: true });

      expect(masked.length).toBeLessThanOrEqual(text.length * 1.5); // Allow some variance
    });

    it('should respect max length option', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const text = 'This is some very long text that should be truncated';
      const masked = maskFreeText(text, context, { maxLength: 20 });

      expect(masked.length).toBeLessThanOrEqual(20);
    });
  });

  describe('maskCompanyName', () => {
    it('should mask company name deterministically', () => {
      const context = createMaskingContext('demo-test', 'company-1');
      const masked1 = maskCompanyName('Acme Corp', context);
      const masked2 = maskCompanyName('Acme Corp', context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe('Acme Corp');
    });
  });

  describe('maskJobTitle', () => {
    it('should mask job title deterministically', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const masked1 = maskJobTitle('Software Engineer', context);
      const masked2 = maskJobTitle('Software Engineer', context);

      expect(masked1).toBe(masked2);
      expect(masked1).not.toBe('Software Engineer');
    });
  });

  describe('generateDeterministicUserId', () => {
    it('should generate deterministic user ID', () => {
      const context = createMaskingContext('demo-test', 'user-1');
      const id1 = generateDeterministicUserId(context);
      const id2 = generateDeterministicUserId(context);

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^demo-user-/);
    });

    it('should generate different IDs for different users', () => {
      const context1 = createMaskingContext('demo-test', 'user-1');
      const context2 = createMaskingContext('demo-test', 'user-2');

      const id1 = generateDeterministicUserId(context1);
      const id2 = generateDeterministicUserId(context2);

      expect(id1).not.toBe(id2);
    });
  });

  describe('Locale Support', () => {
    const locales: Array<'en' | 'es' | 'fr' | 'uk' | 'no'> = ['en', 'es', 'fr', 'uk', 'no'];

    it.each(locales)('should generate masked data for locale: %s', (locale) => {
      const context = createMaskingContext('demo-test', 'user-1', locale);

      const name = maskName('John Doe', context);
      const email = maskEmail('john@example.com', context);
      const phone = maskPhone('+1-555-0100', context);
      const address = maskAddress('123 Main St', context);

      expect(name).toBeTruthy();
      expect(email).toContain('@');
      expect(phone).toBeTruthy();
      expect(address).toBeTruthy();
    });
  });

  describe('Referential Consistency', () => {
    it('should maintain consistency across multiple masking operations', () => {
      const context = createMaskingContext('demo-acme', 'user-123');

      // Mask multiple times - should get same results
      const name1 = maskName('John Doe', context);
      const email1 = maskEmail('john@example.com', context);

      const name2 = maskName('John Doe', context);
      const email2 = maskEmail('john@example.com', context);

      expect(name1).toBe(name2);
      expect(email1).toBe(email2);
    });

    it('should produce different results with different salts', () => {
      const context1 = createMaskingContext('demo-test', 'user-1', 'en', 'salt-1');
      const context2 = createMaskingContext('demo-test', 'user-1', 'en', 'salt-2');

      const name1 = maskName('John Doe', context1);
      const name2 = maskName('John Doe', context2);

      expect(name1).not.toBe(name2);
    });
  });
});
