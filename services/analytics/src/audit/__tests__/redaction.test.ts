/**
 * Redaction Unit Tests
 *
 * Tests for PII and secret redaction with ≥90% coverage.
 */

import { describe, it, expect } from 'vitest';
import {
  redactAuditEvent,
  redactAuditEvents,
  validateNoSecretsLeaked,
  getRedactionSummary,
} from '../redaction.js';
import type { AuditEvent } from '@teei/shared-types';

const createTestEvent = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id: 'event-123',
  timestamp: new Date('2024-01-01T00:00:00Z'),
  tenantId: 'tenant-123',
  actor: {
    id: 'user-123',
    email: 'user@example.com',
    role: 'admin',
  },
  resource: {
    type: 'report',
    id: 'report-123',
    identifier: 'Q4 Report',
  },
  action: 'UPDATE',
  actionCategory: 'DATA_MODIFICATION' as any,
  origin: {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    requestId: 'req-123',
  },
  ...overrides,
});

describe('Redaction', () => {
  describe('redactAuditEvent', () => {
    it('should redact secrets from before state', () => {
      const event = createTestEvent({
        before: {
          name: 'Test Report',
          apiKey: 'sk-1234567890',
          password: 'secretpassword',
          status: 'draft',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before).toEqual({
        name: 'Test Report',
        apiKey: '***REDACTED***',
        password: '***REDACTED***',
        status: 'draft',
      });
    });

    it('should redact secrets from after state', () => {
      const event = createTestEvent({
        after: {
          name: 'Test Report',
          token: 'Bearer abc123',
          refreshToken: 'refresh-xyz',
          status: 'published',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.after).toEqual({
        name: 'Test Report',
        token: '***REDACTED***',
        refreshToken: '***REDACTED***',
        status: 'published',
      });
    });

    it('should redact secrets from metadata', () => {
      const event = createTestEvent({
        metadata: {
          source: 'api',
          secret: 'my-secret-key',
          accessToken: 'token-123',
          config: {
            apiKey: 'nested-key',
            database: 'db-name',
          },
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.metadata).toEqual({
        source: 'api',
        secret: '***REDACTED***',
        accessToken: '***REDACTED***',
        config: {
          apiKey: '***REDACTED***',
          database: 'db-name',
        },
      });
    });

    it('should redact nested secrets', () => {
      const event = createTestEvent({
        before: {
          user: {
            name: 'John Doe',
            credentials: {
              password: 'secret123',
              apiKey: 'key-abc',
            },
          },
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.user.credentials.password).toBe('***REDACTED***');
      expect(redacted.before?.user.credentials.apiKey).toBe('***REDACTED***');
      expect(redacted.before?.user.name).toBe('John Doe');
    });

    it('should redact PII when maskPII=true', () => {
      const event = createTestEvent({
        before: {
          email: 'user@example.com',
          phone: '+1234567890',
          address: '123 Main St',
        },
      });

      const redacted = redactAuditEvent(event, true);

      expect(redacted.actor.email).toBe('***PII_MASKED***');
      expect(redacted.origin.ip).toBe('***PII_MASKED***');
      expect(redacted.before).toEqual({
        email: '***PII_MASKED***',
        phone: '***PII_MASKED***',
        address: '***PII_MASKED***',
      });
    });

    it('should not redact PII when maskPII=false', () => {
      const event = createTestEvent({
        before: {
          email: 'user@example.com',
          phone: '+1234567890',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.actor.email).toBe('user@example.com');
      expect(redacted.origin.ip).toBe('192.168.1.1');
      expect(redacted.before?.email).toBe('user@example.com');
      expect(redacted.before?.phone).toBe('+1234567890');
    });

    it('should handle null/undefined fields', () => {
      const event = createTestEvent({
        before: undefined,
        after: null as any,
        metadata: undefined,
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before).toBeUndefined();
      expect(redacted.after).toBeUndefined();
      expect(redacted.metadata).toBeUndefined();
    });

    it('should handle arrays in state', () => {
      const event = createTestEvent({
        before: {
          users: [
            { id: 1, apiKey: 'key1' },
            { id: 2, apiKey: 'key2' },
          ],
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.users[0].apiKey).toBe('***REDACTED***');
      expect(redacted.before?.users[1].apiKey).toBe('***REDACTED***');
      expect(redacted.before?.users[0].id).toBe(1);
      expect(redacted.before?.users[1].id).toBe(2);
    });

    it('should be case-insensitive for field names', () => {
      const event = createTestEvent({
        before: {
          ApiKey: 'key1',
          PASSWORD: 'pass1',
          SeCrEt: 'secret1',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.ApiKey).toBe('***REDACTED***');
      expect(redacted.before?.PASSWORD).toBe('***REDACTED***');
      expect(redacted.before?.SeCrEt).toBe('***REDACTED***');
    });

    it('should redact partial field matches', () => {
      const event = createTestEvent({
        before: {
          userApiKey: 'key1',
          adminPassword: 'pass1',
          clientSecret: 'secret1',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.userApiKey).toBe('***REDACTED***');
      expect(redacted.before?.adminPassword).toBe('***REDACTED***');
      expect(redacted.before?.clientSecret).toBe('***REDACTED***');
    });
  });

  describe('redactAuditEvents', () => {
    it('should redact multiple events', () => {
      const events: AuditEvent[] = [
        createTestEvent({ before: { apiKey: 'key1' } }),
        createTestEvent({ before: { password: 'pass1' } }),
        createTestEvent({ before: { secret: 'secret1' } }),
      ];

      const redacted = redactAuditEvents(events, false);

      expect(redacted).toHaveLength(3);
      expect(redacted[0].before?.apiKey).toBe('***REDACTED***');
      expect(redacted[1].before?.password).toBe('***REDACTED***');
      expect(redacted[2].before?.secret).toBe('***REDACTED***');
    });

    it('should apply PII masking to all events', () => {
      const events: AuditEvent[] = [
        createTestEvent({ before: { email: 'user1@example.com' } }),
        createTestEvent({ before: { email: 'user2@example.com' } }),
      ];

      const redacted = redactAuditEvents(events, true);

      expect(redacted[0].actor.email).toBe('***PII_MASKED***');
      expect(redacted[1].actor.email).toBe('***PII_MASKED***');
      expect(redacted[0].before?.email).toBe('***PII_MASKED***');
      expect(redacted[1].before?.email).toBe('***PII_MASKED***');
    });
  });

  describe('validateNoSecretsLeaked', () => {
    it('should return true for properly redacted event', () => {
      const event = createTestEvent({
        before: {
          name: 'Test',
          apiKey: '***REDACTED***',
          password: '***REDACTED***',
        },
      });

      const isValid = validateNoSecretsLeaked(event);

      expect(isValid).toBe(true);
    });

    it('should return false if secret leaked', () => {
      const event = createTestEvent({
        before: {
          name: 'Test',
          apiKey: 'sk-1234567890', // Not redacted!
        },
      });

      const isValid = validateNoSecretsLeaked(event);

      expect(isValid).toBe(false);
    });

    it('should return false if password leaked', () => {
      const event = createTestEvent({
        before: {
          password: 'mypassword123', // Not redacted!
        },
      });

      const isValid = validateNoSecretsLeaked(event);

      expect(isValid).toBe(false);
    });

    it('should handle nested leaked secrets', () => {
      const event = createTestEvent({
        metadata: {
          config: {
            secret: 'leaked-secret',
          },
        },
      });

      const isValid = validateNoSecretsLeaked(event);

      expect(isValid).toBe(false);
    });
  });

  describe('getRedactionSummary', () => {
    it('should count redacted secrets', () => {
      const original = createTestEvent({
        before: {
          apiKey: 'key1',
          password: 'pass1',
          name: 'Test',
        },
      });

      const redacted = redactAuditEvent(original, false);
      const summary = getRedactionSummary(original, redacted);

      expect(summary.secretsRedacted).toBe(2);
      expect(summary.piiRedacted).toBe(0);
      expect(summary.fieldsModified.length).toBeGreaterThan(0);
    });

    it('should count redacted PII', () => {
      const original = createTestEvent({
        before: {
          email: 'user@example.com',
          phone: '+1234567890',
        },
      });

      const redacted = redactAuditEvent(original, true);
      const summary = getRedactionSummary(original, redacted);

      expect(summary.piiRedacted).toBeGreaterThan(0);
      expect(summary.fieldsModified).toContain('.actor.email');
      expect(summary.fieldsModified).toContain('.origin.ip');
    });

    it('should identify modified fields', () => {
      const original = createTestEvent({
        before: {
          apiKey: 'key1',
          name: 'Test',
          status: 'active',
        },
      });

      const redacted = redactAuditEvent(original, false);
      const summary = getRedactionSummary(original, redacted);

      expect(summary.fieldsModified).toContain('.before.apiKey');
      expect(summary.fieldsModified).not.toContain('.before.name');
      expect(summary.fieldsModified).not.toContain('.before.status');
    });
  });

  describe('Security edge cases', () => {
    it('should redact credit card numbers', () => {
      const event = createTestEvent({
        before: {
          creditCard: '4111111111111111',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.creditCard).toBe('***REDACTED***');
    });

    it('should redact SSN', () => {
      const event = createTestEvent({
        before: {
          ssn: '123-45-6789',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.ssn).toBe('***REDACTED***');
    });

    it('should redact bank account numbers', () => {
      const event = createTestEvent({
        before: {
          bankAccount: '1234567890',
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.bankAccount).toBe('***REDACTED***');
    });

    it('should handle complex nested structures', () => {
      const event = createTestEvent({
        before: {
          level1: {
            level2: {
              level3: {
                apiKey: 'deep-secret',
                normalField: 'visible',
              },
            },
          },
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.level1.level2.level3.apiKey).toBe('***REDACTED***');
      expect(redacted.before?.level1.level2.level3.normalField).toBe('visible');
    });

    it('should preserve non-sensitive fields exactly', () => {
      const event = createTestEvent({
        before: {
          id: 123,
          name: 'Test Name',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          tags: ['tag1', 'tag2'],
          metadata: {
            version: 1,
            author: 'user@example.com',
          },
        },
      });

      const redacted = redactAuditEvent(event, false);

      expect(redacted.before?.id).toBe(123);
      expect(redacted.before?.name).toBe('Test Name');
      expect(redacted.before?.status).toBe('active');
      expect(redacted.before?.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(redacted.before?.tags).toEqual(['tag1', 'tag2']);
      expect(redacted.before?.metadata.version).toBe(1);
    });
  });
});
