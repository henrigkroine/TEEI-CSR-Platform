/**
 * Audit Events Test Suite
 *
 * Tests for audit event emission in reporting service:
 * - Citation edited events
 * - Redaction completed events
 * - Evidence gate violation events
 *
 * Target: ≥90% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuditIntegration,
  createAuditIntegration,
  CitationEditData,
  RedactionCompletedData,
  EvidenceGateViolationData,
} from '../../lib/audit-integration';
import { EventBus } from '@teei/shared-utils';

// Mock EventBus
vi.mock('@teei/shared-utils', () => ({
  getEventBus: vi.fn(),
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('AuditIntegration', () => {
  let auditIntegration: AuditIntegration;
  let mockEventBus: any;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
    };

    // Mock getEventBus to return our mock
    const { getEventBus } = require('@teei/shared-utils');
    getEventBus.mockReturnValue(mockEventBus);

    // Create fresh instance
    auditIntegration = createAuditIntegration();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect()', () => {
    it('should connect to event bus', async () => {
      await auditIntegration.connect();

      expect(mockEventBus.connect).toHaveBeenCalledTimes(1);
      expect(auditIntegration.isConnected()).toBe(true);
    });

    it('should not connect twice if already connected', async () => {
      await auditIntegration.connect();
      await auditIntegration.connect();

      expect(mockEventBus.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors gracefully', async () => {
      mockEventBus.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await auditIntegration.connect();

      expect(auditIntegration.isConnected()).toBe(false);
    });
  });

  describe('disconnect()', () => {
    it('should disconnect from event bus', async () => {
      await auditIntegration.connect();
      await auditIntegration.disconnect();

      expect(mockEventBus.disconnect).toHaveBeenCalledTimes(1);
      expect(auditIntegration.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      await auditIntegration.disconnect();

      expect(mockEventBus.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('emitCitationEdited()', () => {
    it('should emit citation edited event with all fields', async () => {
      await auditIntegration.connect();

      const data: CitationEditData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationId: '223e4567-e89b-12d3-a456-426614174000',
        action: 'ADDED',
        editor: 'user-123',
        previousHash: undefined,
        newHash: 'abc123def456',
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          reason: 'Initial report generation',
          requestId: 'req-123',
        },
      };

      await auditIntegration.emitCitationEdited(data);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.type).toBe('reporting.citation.edited');
      expect(publishedEvent.data.reportId).toBe(data.reportId);
      expect(publishedEvent.data.citationId).toBe(data.citationId);
      expect(publishedEvent.data.action).toBe(data.action);
      expect(publishedEvent.data.editor).toBe(data.editor);
      expect(publishedEvent.data.newHash).toBe(data.newHash);
      expect(publishedEvent.data.metadata).toEqual(data.metadata);
    });

    it('should support MODIFIED action with previousHash', async () => {
      await auditIntegration.connect();

      const data: CitationEditData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationId: '223e4567-e89b-12d3-a456-426614174000',
        action: 'MODIFIED',
        editor: 'user-456',
        previousHash: 'old-hash-123',
        newHash: 'new-hash-456',
      };

      await auditIntegration.emitCitationEdited(data);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.data.action).toBe('MODIFIED');
      expect(publishedEvent.data.previousHash).toBe('old-hash-123');
    });

    it('should support REMOVED action', async () => {
      await auditIntegration.connect();

      const data: CitationEditData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationId: '223e4567-e89b-12d3-a456-426614174000',
        action: 'REMOVED',
        editor: 'user-789',
        newHash: 'final-hash',
      };

      await auditIntegration.emitCitationEdited(data);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.data.action).toBe('REMOVED');
    });

    it('should skip event emission when not connected', async () => {
      const data: CitationEditData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationId: '223e4567-e89b-12d3-a456-426614174000',
        action: 'ADDED',
        editor: 'user-123',
        newHash: 'abc123',
      };

      await auditIntegration.emitCitationEdited(data);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle publish errors gracefully', async () => {
      await auditIntegration.connect();
      mockEventBus.publish.mockRejectedValueOnce(new Error('Publish failed'));

      const data: CitationEditData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationId: '223e4567-e89b-12d3-a456-426614174000',
        action: 'ADDED',
        editor: 'user-123',
        newHash: 'abc123',
      };

      // Should not throw
      await expect(auditIntegration.emitCitationEdited(data)).resolves.toBeUndefined();
    });
  });

  describe('emitRedactionCompleted()', () => {
    it('should emit redaction completed event with all metrics', async () => {
      await auditIntegration.connect();

      const data: RedactionCompletedData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
        snippetsProcessed: 150,
        piiDetectedCount: 25,
        piiRemovedCount: 25,
        leaksDetected: 0,
        success: true,
        durationMs: 1250,
      };

      await auditIntegration.emitRedactionCompleted(data);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.type).toBe('reporting.redaction.completed');
      expect(publishedEvent.data.reportId).toBe(data.reportId);
      expect(publishedEvent.data.companyId).toBe(data.companyId);
      expect(publishedEvent.data.snippetsProcessed).toBe(150);
      expect(publishedEvent.data.piiDetectedCount).toBe(25);
      expect(publishedEvent.data.piiRemovedCount).toBe(25);
      expect(publishedEvent.data.leaksDetected).toBe(0);
      expect(publishedEvent.data.success).toBe(true);
      expect(publishedEvent.data.durationMs).toBe(1250);
    });

    it('should emit event when redaction fails with leaks', async () => {
      await auditIntegration.connect();

      const data: RedactionCompletedData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
        snippetsProcessed: 100,
        piiDetectedCount: 20,
        piiRemovedCount: 18,
        leaksDetected: 2,
        success: false,
        durationMs: 980,
      };

      await auditIntegration.emitRedactionCompleted(data);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.data.leaksDetected).toBe(2);
      expect(publishedEvent.data.success).toBe(false);
    });

    it('should skip event emission when not connected', async () => {
      const data: RedactionCompletedData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
        snippetsProcessed: 100,
        piiDetectedCount: 10,
        piiRemovedCount: 10,
        leaksDetected: 0,
        success: true,
        durationMs: 500,
      };

      await auditIntegration.emitRedactionCompleted(data);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle publish errors gracefully', async () => {
      await auditIntegration.connect();
      mockEventBus.publish.mockRejectedValueOnce(new Error('Publish failed'));

      const data: RedactionCompletedData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
        snippetsProcessed: 100,
        piiDetectedCount: 10,
        piiRemovedCount: 10,
        leaksDetected: 0,
        success: true,
        durationMs: 500,
      };

      // Should not throw
      await expect(auditIntegration.emitRedactionCompleted(data)).resolves.toBeUndefined();
    });
  });

  describe('emitEvidenceGateViolation()', () => {
    it('should emit evidence gate violation event with all violations', async () => {
      await auditIntegration.connect();

      const data: EvidenceGateViolationData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
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
      };

      await auditIntegration.emitEvidenceGateViolation(data);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.type).toBe('reporting.evidence_gate.violation');
      expect(publishedEvent.data.reportId).toBe(data.reportId);
      expect(publishedEvent.data.companyId).toBe(data.companyId);
      expect(publishedEvent.data.violations).toHaveLength(2);
      expect(publishedEvent.data.violations[0].citationCount).toBe(0);
      expect(publishedEvent.data.violations[0].requiredCount).toBe(1);
      expect(publishedEvent.data.totalCitationCount).toBe(5);
      expect(publishedEvent.data.totalParagraphCount).toBe(10);
      expect(publishedEvent.data.citationDensity).toBe(0.5);
      expect(publishedEvent.data.rejected).toBe(true);
    });

    it('should emit event when not rejected but below threshold', async () => {
      await auditIntegration.connect();

      const data: EvidenceGateViolationData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
        violations: [
          {
            paragraph: 'Paragraph with low citation density...',
            citationCount: 1,
            requiredCount: 2,
          },
        ],
        totalCitationCount: 10,
        totalParagraphCount: 15,
        citationDensity: 0.67,
        rejected: false,
      };

      await auditIntegration.emitEvidenceGateViolation(data);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.data.rejected).toBe(false);
      expect(publishedEvent.data.violations).toHaveLength(1);
    });

    it('should skip event emission when not connected', async () => {
      const data: EvidenceGateViolationData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
        violations: [],
        totalCitationCount: 10,
        totalParagraphCount: 10,
        citationDensity: 1.0,
        rejected: false,
      };

      await auditIntegration.emitEvidenceGateViolation(data);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle publish errors gracefully', async () => {
      await auditIntegration.connect();
      mockEventBus.publish.mockRejectedValueOnce(new Error('Publish failed'));

      const data: EvidenceGateViolationData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        companyId: '456e4567-e89b-12d3-a456-426614174000',
        violations: [],
        totalCitationCount: 10,
        totalParagraphCount: 10,
        citationDensity: 1.0,
        rejected: false,
      };

      // Should not throw
      await expect(auditIntegration.emitEvidenceGateViolation(data)).resolves.toBeUndefined();
    });
  });

  describe('Event Metadata', () => {
    it('should include base event metadata fields', async () => {
      await auditIntegration.connect();

      const data: CitationEditData = {
        reportId: '123e4567-e89b-12d3-a456-426614174000',
        citationId: '223e4567-e89b-12d3-a456-426614174000',
        action: 'ADDED',
        editor: 'user-123',
        newHash: 'abc123',
      };

      await auditIntegration.emitCitationEdited(data);

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.id).toBeDefined();
      expect(publishedEvent.type).toBe('reporting.citation.edited');
      expect(publishedEvent.version).toBe('v1');
      expect(publishedEvent.timestamp).toBeDefined();
      expect(new Date(publishedEvent.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('isConnected()', () => {
    it('should return false initially', () => {
      expect(auditIntegration.isConnected()).toBe(false);
    });

    it('should return true after connecting', async () => {
      await auditIntegration.connect();
      expect(auditIntegration.isConnected()).toBe(true);
    });

    it('should return false after disconnecting', async () => {
      await auditIntegration.connect();
      await auditIntegration.disconnect();
      expect(auditIntegration.isConnected()).toBe(false);
    });
  });
});
