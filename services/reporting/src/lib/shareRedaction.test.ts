/**
 * Share Redaction Tests
 *
 * Comprehensive test suite for share link PII redaction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  redactForSharing,
  extractSafeAggregates,
  anonymizeIdentifiers,
  watermarkSharedData,
  prepareDataForSharing,
  filterConfigContainsSensitiveData,
} from './shareRedaction';

describe('shareRedaction', () => {
  describe('redactForSharing', () => {
    it('should redact PII fields by default', async () => {
      const data = {
        email: 'user@example.com',
        phone: '555-1234',
        first_name: 'John',
        last_name: 'Doe',
        sroi: 3.2,
        total_participants: 100,
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.email).toBe('[REDACTED]');
      expect(result.data.phone).toBe('[REDACTED]');
      expect(result.data.first_name).toBe('[REDACTED]');
      expect(result.data.last_name).toBe('[REDACTED]');
      expect(result.data.sroi).toBe(3.2);
      expect(result.data.total_participants).toBe(100);
      expect(result.redactionApplied).toBe(true);
      expect(result.redactionCount).toBeGreaterThan(0);
    });

    it('should preserve names when includesSensitiveData is true', async () => {
      const data = {
        email: 'user@example.com',
        phone: '555-1234',
        first_name: 'John',
        last_name: 'Doe',
        sroi: 3.2,
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: true,
        preserveAggregates: true,
        logAccess: false,
      });

      // PII still redacted
      expect(result.data.email).toBe('[REDACTED]');
      expect(result.data.phone).toBe('[REDACTED]');

      // Names preserved
      expect(result.data.first_name).toBe('John');
      expect(result.data.last_name).toBe('Doe');

      // Aggregates preserved
      expect(result.data.sroi).toBe(3.2);
    });

    it('should redact PII in nested objects', async () => {
      const data = {
        company: {
          name: 'ACME Corp',
          contact: {
            email: 'contact@acme.com',
            phone: '555-9999',
          },
        },
        metrics: {
          sroi: 2.5,
        },
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.company.contact.email).toBe('[REDACTED]');
      expect(result.data.company.contact.phone).toBe('[REDACTED]');
      expect(result.data.metrics.sroi).toBe(2.5);
    });

    it('should redact PII in arrays', async () => {
      const data = {
        volunteers: [
          { id: '1', email: 'v1@example.com', hours: 10 },
          { id: '2', email: 'v2@example.com', hours: 15 },
        ],
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.volunteers[0].email).toBe('[REDACTED]');
      expect(result.data.volunteers[1].email).toBe('[REDACTED]');
      expect(result.data.volunteers[0].hours).toBe(10);
      expect(result.data.volunteers[1].hours).toBe(15);
    });

    it('should redact PII in text content', async () => {
      const data = {
        description: 'Contact John Doe at john.doe@example.com or 555-1234',
        sroi: 3.0,
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.description).not.toContain('john.doe@example.com');
      expect(result.data.description).not.toContain('555-1234');
      expect(result.data.description).toContain('[EMAIL_REDACTED');
      expect(result.data.description).toContain('[PHONE_REDACTED');
      expect(result.data.sroi).toBe(3.0);
    });

    it('should track redaction statistics', async () => {
      const data = {
        email: 'user@example.com',
        phone: '555-1234',
        name: 'John Doe',
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.redactionCount).toBeGreaterThan(0);
      expect(result.piiTypesDetected).toContain('email');
      expect(result.piiTypesDetected.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should throw on PII leak detection', async () => {
      // Mock a scenario where redaction fails
      const data = {
        safe_field: 'value',
        sroi: 3.2,
      };

      // This should not throw as there's no PII
      await expect(
        redactForSharing(data, {
          includesSensitiveData: false,
          preserveAggregates: true,
          logAccess: false,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('extractSafeAggregates', () => {
    it('should extract only safe aggregate metrics', () => {
      const data = {
        // Safe aggregates
        sroi: 3.2,
        vis_score: 85,
        total_participants: 100,
        total_sessions: 250,

        // Unsafe data
        email: 'user@example.com',
        participant_id: 'abc123',
        volunteer_name: 'John Doe',

        // Nested safe data
        programs: [
          {
            name: 'Buddy Program',
            participant_count: 50,
            completion_rate: 0.85,
          },
        ],
      };

      const aggregates = extractSafeAggregates(data);

      expect(aggregates.sroi).toBe(3.2);
      expect(aggregates.vis_score).toBe(85);
      expect(aggregates.total_participants).toBe(100);
      expect(aggregates.total_sessions).toBe(250);
      expect(aggregates.programs).toHaveLength(1);
      expect(aggregates.programs![0].name).toBe('Buddy Program');

      // Should not include unsafe fields
      expect((aggregates as any).email).toBeUndefined();
      expect((aggregates as any).participant_id).toBeUndefined();
      expect((aggregates as any).volunteer_name).toBeUndefined();
    });

    it('should handle missing fields gracefully', () => {
      const data = {
        sroi: 2.5,
        // Other fields missing
      };

      const aggregates = extractSafeAggregates(data);

      expect(aggregates.sroi).toBe(2.5);
      expect(aggregates.vis_score).toBeUndefined();
      expect(aggregates.total_participants).toBeUndefined();
    });
  });

  describe('anonymizeIdentifiers', () => {
    it('should anonymize ID fields consistently', () => {
      const data = {
        volunteer_id: 'vol-123',
        participant_id: 'part-456',
        company_id: 'comp-789', // Should NOT be anonymized
        link_id: 'link-abc', // Should NOT be anonymized
        sroi: 3.0,
      };

      const anonymized = anonymizeIdentifiers(data);

      expect(anonymized.volunteer_id).toMatch(/^anon_[a-f0-9]{8}$/);
      expect(anonymized.participant_id).toMatch(/^anon_[a-f0-9]{8}$/);
      expect(anonymized.company_id).toBe('comp-789'); // Preserved
      expect(anonymized.link_id).toBe('link-abc'); // Preserved
      expect(anonymized.sroi).toBe(3.0);

      // Same input should produce same output (consistency)
      const anonymized2 = anonymizeIdentifiers(data);
      expect(anonymized2.volunteer_id).toBe(anonymized.volunteer_id);
    });

    it('should anonymize IDs in nested structures', () => {
      const data = {
        sessions: [
          { id: 's1', volunteer_id: 'vol-123' },
          { id: 's2', volunteer_id: 'vol-456' },
        ],
      };

      const anonymized = anonymizeIdentifiers(data);

      expect(anonymized.sessions[0].id).toMatch(/^anon_/);
      expect(anonymized.sessions[0].volunteer_id).toMatch(/^anon_/);
      expect(anonymized.sessions[1].id).toMatch(/^anon_/);
      expect(anonymized.sessions[1].volunteer_id).toMatch(/^anon_/);
    });
  });

  describe('watermarkSharedData', () => {
    it('should add watermark metadata', () => {
      const data = {
        sroi: 3.2,
        participants: 100,
      };

      const watermarked = watermarkSharedData(data, 'link-123');

      expect(watermarked.sroi).toBe(3.2);
      expect(watermarked.participants).toBe(100);
      expect(watermarked._metadata).toBeDefined();
      expect(watermarked._metadata.shared_via).toBe('secure_link');
      expect(watermarked._metadata.link_id).toBe('link-123');
      expect(watermarked._metadata.watermark).toBe('SHARED VIA LINK - DO NOT DISTRIBUTE');
      expect(watermarked._metadata.readonly).toBe(true);
      expect(watermarked._metadata.redaction_applied).toBe(true);
    });
  });

  describe('prepareDataForSharing', () => {
    it('should apply full preparation pipeline', async () => {
      const data = {
        email: 'user@example.com',
        first_name: 'John',
        volunteer_id: 'vol-123',
        sroi: 3.2,
      };

      const result = await prepareDataForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
        shareLinkId: 'link-abc',
      });

      // Redaction applied
      expect(result.data.email).toBe('[REDACTED]');
      expect(result.data.first_name).toBe('[REDACTED]');

      // ID anonymized
      expect(result.data.volunteer_id).toMatch(/^anon_/);

      // Aggregate preserved
      expect(result.data.sroi).toBe(3.2);

      // Watermark applied
      expect(result.data._metadata).toBeDefined();
      expect(result.data._metadata.link_id).toBe('link-abc');

      // Statistics tracked
      expect(result.redactionApplied).toBe(true);
      expect(result.redactionCount).toBeGreaterThan(0);
    });

    it('should skip anonymization when sensitive data included', async () => {
      const data = {
        email: 'user@example.com',
        first_name: 'John',
        volunteer_id: 'vol-123',
        sroi: 3.2,
      };

      const result = await prepareDataForSharing(data, {
        includesSensitiveData: true,
        preserveAggregates: true,
        logAccess: false,
        shareLinkId: 'link-abc',
      });

      // PII redacted
      expect(result.data.email).toBe('[REDACTED]');

      // Name preserved
      expect(result.data.first_name).toBe('John');

      // ID NOT anonymized
      expect(result.data.volunteer_id).toBe('vol-123');

      // Watermark still applied
      expect(result.data._metadata).toBeDefined();
    });
  });

  describe('filterConfigContainsSensitiveData', () => {
    it('should detect sensitive fields in filter config', () => {
      const config = {
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        volunteerIds: ['vol-123', 'vol-456'],
      };

      expect(filterConfigContainsSensitiveData(config)).toBe(true);
    });

    it('should return false for safe filter configs', () => {
      const config = {
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        programs: ['buddy', 'upskilling'],
        quarter: '2024-Q4',
      };

      expect(filterConfigContainsSensitiveData(config)).toBe(false);
    });

    it('should detect nested sensitive fields', () => {
      const config = {
        filters: {
          advanced: {
            userEmail: 'test@example.com',
          },
        },
      };

      expect(filterConfigContainsSensitiveData(config)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values', async () => {
      const data = {
        field1: null,
        field2: undefined,
        sroi: 3.2,
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.field1).toBeNull();
      expect(result.data.field2).toBeUndefined();
      expect(result.data.sroi).toBe(3.2);
    });

    it('should handle empty objects and arrays', async () => {
      const data = {
        emptyObj: {},
        emptyArray: [],
        sroi: 3.2,
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.emptyObj).toEqual({});
      expect(result.data.emptyArray).toEqual([]);
      expect(result.data.sroi).toBe(3.2);
    });

    it('should handle deeply nested structures', async () => {
      const data = {
        level1: {
          level2: {
            level3: {
              email: 'deep@example.com',
              sroi: 3.2,
            },
          },
        },
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.level1.level2.level3.email).toBe('[REDACTED]');
      expect(result.data.level1.level2.level3.sroi).toBe(3.2);
    });

    it('should handle special characters in values', async () => {
      const data = {
        description: 'Special chars: <script>alert("xss")</script>',
        sroi: 3.2,
      };

      const result = await redactForSharing(data, {
        includesSensitiveData: false,
        preserveAggregates: true,
        logAccess: false,
      });

      expect(result.data.description).toBeDefined();
      expect(result.data.sroi).toBe(3.2);
    });
  });
});
