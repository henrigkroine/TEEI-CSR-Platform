/**
 * Reporting Events Schema Test Suite
 *
 * Tests for reporting event schema validation:
 * - Citation edited event schema
 * - Redaction completed event schema
 * - Evidence gate violation event schema
 *
 * Target: 100% schema coverage
 */

import { describe, it, expect } from 'vitest';
import {
  CitationEditedEventSchema,
  CitationEditedEvent,
  RedactionCompletedEventSchema,
  RedactionCompletedEvent,
  EvidenceGateViolationEventSchema,
  EvidenceGateViolationEvent,
} from '../index';

describe('Reporting Event Schemas', () => {
  describe('CitationEditedEventSchema', () => {
    it('should validate a valid ADDED citation event', () => {
      const event: CitationEditedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'ADDED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'abc123def456',
          metadata: {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            reason: 'Initial report generation',
            requestId: 'req-123',
          },
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate a valid MODIFIED citation event with previousHash', () => {
      const event: CitationEditedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'MODIFIED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          previousHash: 'old-hash-123',
          newHash: 'new-hash-456',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate a valid REMOVED citation event', () => {
      const event: CitationEditedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'REMOVED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'final-hash',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject invalid action type', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'INVALID_ACTION',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'abc123',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: 'not-a-uuid',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'ADDED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'abc123',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          // Missing citationId
          action: 'ADDED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'abc123',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('RedactionCompletedEventSchema', () => {
    it('should validate a valid redaction completed event', () => {
      const event: RedactionCompletedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.redaction.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          snippetsProcessed: 150,
          piiDetectedCount: 25,
          piiRemovedCount: 25,
          leaksDetected: 0,
          success: true,
          durationMs: 1250,
          timestamp: new Date().toISOString(),
        },
      };

      const result = RedactionCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate event with leaks detected', () => {
      const event: RedactionCompletedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.redaction.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          snippetsProcessed: 100,
          piiDetectedCount: 20,
          piiRemovedCount: 18,
          leaksDetected: 2,
          success: false,
          durationMs: 980,
          timestamp: new Date().toISOString(),
        },
      };

      const result = RedactionCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.leaksDetected).toBe(2);
        expect(result.data.data.success).toBe(false);
      }
    });

    it('should reject negative counts', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.redaction.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          snippetsProcessed: -10,
          piiDetectedCount: 25,
          piiRemovedCount: 25,
          leaksDetected: 0,
          success: true,
          durationMs: 1250,
          timestamp: new Date().toISOString(),
        },
      };

      const result = RedactionCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer counts', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.redaction.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          snippetsProcessed: 10.5,
          piiDetectedCount: 25,
          piiRemovedCount: 25,
          leaksDetected: 0,
          success: true,
          durationMs: 1250,
          timestamp: new Date().toISOString(),
        },
      };

      const result = RedactionCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.redaction.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          // Missing snippetsProcessed
          piiDetectedCount: 25,
          piiRemovedCount: 25,
          leaksDetected: 0,
          success: true,
          durationMs: 1250,
          timestamp: new Date().toISOString(),
        },
      };

      const result = RedactionCompletedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('EvidenceGateViolationEventSchema', () => {
    it('should validate a valid evidence gate violation event', () => {
      const event: EvidenceGateViolationEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.evidence_gate.violation',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          violations: [
            {
              paragraph: 'Paragraph 1 without sufficient evidence...',
              citationCount: 0,
              requiredCount: 1,
            },
            {
              paragraph: 'Paragraph 2 also lacking citations...',
              citationCount: 0,
              requiredCount: 1,
            },
          ],
          totalCitationCount: 5,
          totalParagraphCount: 10,
          citationDensity: 0.5,
          rejected: true,
          timestamp: new Date().toISOString(),
        },
      };

      const result = EvidenceGateViolationEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate event with empty violations array', () => {
      const event: EvidenceGateViolationEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.evidence_gate.violation',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          violations: [],
          totalCitationCount: 10,
          totalParagraphCount: 10,
          citationDensity: 1.0,
          rejected: false,
          timestamp: new Date().toISOString(),
        },
      };

      const result = EvidenceGateViolationEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate event with multiple violations', () => {
      const event: EvidenceGateViolationEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.evidence_gate.violation',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          violations: [
            { paragraph: 'Para 1', citationCount: 0, requiredCount: 1 },
            { paragraph: 'Para 2', citationCount: 0, requiredCount: 1 },
            { paragraph: 'Para 3', citationCount: 1, requiredCount: 2 },
          ],
          totalCitationCount: 1,
          totalParagraphCount: 10,
          citationDensity: 0.1,
          rejected: true,
          timestamp: new Date().toISOString(),
        },
      };

      const result = EvidenceGateViolationEventSchema.safeParse(event);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.violations).toHaveLength(3);
      }
    });

    it('should reject negative counts in violations', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.evidence_gate.violation',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          violations: [
            {
              paragraph: 'Paragraph 1',
              citationCount: -1,
              requiredCount: 1,
            },
          ],
          totalCitationCount: 5,
          totalParagraphCount: 10,
          citationDensity: 0.5,
          rejected: true,
          timestamp: new Date().toISOString(),
        },
      };

      const result = EvidenceGateViolationEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject invalid citation density', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.evidence_gate.violation',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          violations: [],
          totalCitationCount: 10,
          totalParagraphCount: 10,
          citationDensity: 'invalid',
          rejected: false,
          timestamp: new Date().toISOString(),
        },
      };

      const result = EvidenceGateViolationEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.evidence_gate.violation',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          companyId: '323e4567-e89b-12d3-a456-426614174000',
          // Missing violations
          totalCitationCount: 10,
          totalParagraphCount: 10,
          citationDensity: 1.0,
          rejected: false,
          timestamp: new Date().toISOString(),
        },
      };

      const result = EvidenceGateViolationEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('Base Event Fields', () => {
    it('should require valid UUID for id field', () => {
      const event = {
        id: 'not-a-uuid',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'ADDED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'abc123',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should require valid datetime for timestamp field', () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: 'not-a-datetime',
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'ADDED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'abc123',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });

    it('should accept optional correlationId field', () => {
      const event: CitationEditedEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        correlationId: '523e4567-e89b-12d3-a456-426614174000',
        data: {
          reportId: '223e4567-e89b-12d3-a456-426614174000',
          citationId: '323e4567-e89b-12d3-a456-426614174000',
          action: 'ADDED',
          editor: '423e4567-e89b-12d3-a456-426614174000',
          newHash: 'abc123',
        },
      };

      const result = CitationEditedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});
