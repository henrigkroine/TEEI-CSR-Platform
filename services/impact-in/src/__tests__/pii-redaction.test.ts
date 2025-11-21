import { describe, it, expect } from 'vitest';
import {
  redactPII,
  redactPIIBatch,
  scanAndRedactPII,
  validateNoPII,
  RedactionMode,
  createPIIRedactionMiddleware,
} from '../lib/pii-redaction.js';

describe('PII Redaction', () => {
  describe('redactPII', () => {
    it('should redact PII fields with HASH mode', () => {
      const data = {
        id: '123',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: 'Engineering',
      };

      const redacted = redactPII(data, { mode: RedactionMode.HASH });

      expect(redacted.id).toBe('123');
      expect(redacted.department).toBe('Engineering');
      expect(redacted.email).toMatch(/\[HASHED:.+\]/);
      expect(redacted.firstName).toMatch(/\[HASHED:.+\]/);
      expect(redacted.lastName).toMatch(/\[HASHED:.+\]/);
    });

    it('should redact PII fields with MASK mode', () => {
      const data = {
        email: 'john.doe@example.com',
        firstName: 'John',
      };

      const redacted = redactPII(data, { mode: RedactionMode.MASK });

      expect(redacted.email).toBe('[REDACTED]');
      expect(redacted.firstName).toBe('[REDACTED]');
    });

    it('should remove PII fields with REMOVE mode', () => {
      const data = {
        id: '123',
        email: 'john.doe@example.com',
        firstName: 'John',
        department: 'Engineering',
      };

      const redacted = redactPII(data, { mode: RedactionMode.REMOVE });

      expect(redacted.id).toBe('123');
      expect(redacted.department).toBe('Engineering');
      expect(redacted.email).toBeUndefined();
      expect(redacted.firstName).toBeUndefined();
    });

    it('should preserve allowed fields', () => {
      const data = {
        email: 'john.doe@example.com',
        firstName: 'John',
        department: 'Engineering',
      };

      const redacted = redactPII(data, {
        mode: RedactionMode.HASH,
        allowedFields: ['email'],
      });

      expect(redacted.email).toBe('john.doe@example.com'); // Not redacted
      expect(redacted.firstName).toMatch(/\[HASHED:.+\]/); // Redacted
      expect(redacted.department).toBe('Engineering');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'john.doe@example.com',
          firstName: 'John',
        },
        metadata: {
          department: 'Engineering',
        },
      };

      const redacted = redactPII(data, { mode: RedactionMode.HASH });

      expect(redacted.user.email).toMatch(/\[HASHED:.+\]/);
      expect(redacted.user.firstName).toMatch(/\[HASHED:.+\]/);
      expect(redacted.metadata.department).toBe('Engineering');
    });
  });

  describe('redactPIIBatch', () => {
    it('should redact array of objects', () => {
      const data = [
        { email: 'john@example.com', firstName: 'John' },
        { email: 'jane@example.com', firstName: 'Jane' },
      ];

      const redacted = redactPIIBatch(data, { mode: RedactionMode.HASH });

      expect(redacted).toHaveLength(2);
      expect(redacted[0].email).toMatch(/\[HASHED:.+\]/);
      expect(redacted[1].email).toMatch(/\[HASHED:.+\]/);
    });
  });

  describe('scanAndRedactPII', () => {
    it('should detect and redact email addresses in text', () => {
      const text = 'Contact us at support@example.com or sales@example.com';
      const result = scanAndRedactPII(text);

      expect(result.redacted).toBe('Contact us at [REDACTED] or [REDACTED]');
      expect(result.piiFound).toHaveLength(2);
      expect(result.piiFound[0]).toMatch(/email:/);
    });

    it('should detect and redact phone numbers in text', () => {
      const text = 'Call me at (555) 123-4567 or 555-987-6543';
      const result = scanAndRedactPII(text);

      expect(result.redacted).toMatch(/\[REDACTED\]/);
      expect(result.piiFound.length).toBeGreaterThan(0);
      expect(result.piiFound[0]).toMatch(/phone:/);
    });

    it('should handle text with no PII', () => {
      const text = 'This is a clean text with no personal information';
      const result = scanAndRedactPII(text);

      expect(result.redacted).toBe(text);
      expect(result.piiFound).toHaveLength(0);
    });
  });

  describe('validateNoPII', () => {
    it('should pass validation for redacted data', () => {
      const data = {
        id: '123',
        email: '[HASHED:abc123]',
        firstName: '[HASHED:def456]',
        department: 'Engineering',
      };

      const validation = validateNoPII(data);

      expect(validation.valid).toBe(true);
      expect(validation.leakedFields).toHaveLength(0);
    });

    it('should fail validation if PII leaked', () => {
      const data = {
        id: '123',
        email: 'john.doe@example.com', // Not redacted!
        department: 'Engineering',
      };

      const validation = validateNoPII(data);

      expect(validation.valid).toBe(false);
      expect(validation.leakedFields.length).toBeGreaterThan(0);
    });

    it('should detect PII patterns in nested objects', () => {
      const data = {
        user: {
          profile: {
            contact: 'john.doe@example.com', // Leaked!
          },
        },
      };

      const validation = validateNoPII(data);

      expect(validation.valid).toBe(false);
      expect(validation.leakedFields.length).toBeGreaterThan(0);
    });
  });

  describe('createPIIRedactionMiddleware', () => {
    it('should create middleware that redacts and validates', async () => {
      const middleware = createPIIRedactionMiddleware({ mode: RedactionMode.HASH });

      const data = {
        email: 'john.doe@example.com',
        firstName: 'John',
        department: 'Engineering',
      };

      const redacted = await middleware(data);

      expect(redacted.email).toMatch(/\[HASHED:.+\]/);
      expect(redacted.firstName).toMatch(/\[HASHED:.+\]/);
      expect(redacted.department).toBe('Engineering');
    });

    it('should throw error if PII validation fails', async () => {
      const middleware = createPIIRedactionMiddleware({
        mode: RedactionMode.HASH,
        allowedFields: ['email'], // Allow email to pass through
      });

      const data = {
        email: 'john.doe@example.com',
        firstName: 'John',
      };

      // This should throw because email will not be redacted but contains PII pattern
      await expect(middleware(data)).rejects.toThrow(/PII redaction failed/);
    });
  });
});
