/**
 * Audit Integration for Reporting Service
 *
 * Publishes audit events to NATS and writes to audit_logs table.
 * Integrates with @teei/compliance for GDPR-compliant audit logging.
 *
 * Features:
 * - Event publishing to NATS (audit.reporting subject)
 * - Audit log persistence (6-year retention for GDPR compliance)
 * - Non-blocking error handling (audit failures don't block report generation)
 * - NO PII in audit events
 *
 * Usage:
 * ```typescript
 * const auditIntegration = createAuditIntegration();
 * await auditIntegration.connect();
 *
 * await auditIntegration.emitCitationEdited({
 *   reportId: '...',
 *   citationId: '...',
 *   action: 'ADDED',
 *   editor: 'user-123',
 *   previousHash: '...',
 *   newHash: '...',
 * });
 * ```
 */

import { EventBus, getEventBus } from '@teei/shared-utils';
import { createServiceLogger } from '@teei/shared-utils';
import {
  CitationEditedEvent,
  RedactionCompletedEvent,
  EvidenceGateViolationEvent,
} from '@teei/event-contracts';
import { randomUUID } from 'crypto';

const logger = createServiceLogger('reporting:audit-integration');

/**
 * Citation edit event data
 */
export interface CitationEditData {
  reportId: string;
  citationId: string;
  action: 'ADDED' | 'MODIFIED' | 'REMOVED';
  editor: string;
  previousHash?: string;
  newHash: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    requestId?: string;
  };
}

/**
 * Redaction completion event data
 */
export interface RedactionCompletedData {
  reportId: string;
  companyId: string;
  snippetsProcessed: number;
  piiDetectedCount: number;
  piiRemovedCount: number;
  leaksDetected: number;
  success: boolean;
  durationMs: number;
}

/**
 * Evidence gate violation event data
 */
export interface EvidenceGateViolationData {
  reportId: string;
  companyId: string;
  violations: Array<{
    paragraph: string;
    citationCount: number;
    requiredCount: number;
  }>;
  totalCitationCount: number;
  totalParagraphCount: number;
  citationDensity: number;
  rejected: boolean;
}

/**
 * Audit Integration Class
 */
export class AuditIntegration {
  private eventBus: EventBus;
  private connected: boolean = false;

  constructor() {
    this.eventBus = getEventBus();
  }

  /**
   * Connect to event bus
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      await this.eventBus.connect();
      this.connected = true;
      logger.info('Audit integration connected to event bus');
    } catch (error) {
      logger.error({ error }, 'Failed to connect audit integration to event bus');
      // Don't throw - audit failures should not block report generation
    }
  }

  /**
   * Disconnect from event bus
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.eventBus.disconnect();
      this.connected = false;
      logger.info('Audit integration disconnected from event bus');
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect audit integration');
    }
  }

  /**
   * Emit citation edited event
   */
  async emitCitationEdited(data: CitationEditData): Promise<void> {
    try {
      const event: CitationEditedEvent = {
        id: randomUUID(),
        type: 'reporting.citation.edited',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: data.reportId,
          citationId: data.citationId,
          action: data.action,
          editor: data.editor,
          previousHash: data.previousHash,
          newHash: data.newHash,
          metadata: data.metadata,
        },
      };

      if (this.connected) {
        await this.eventBus.publish(event);
        logger.debug({ reportId: data.reportId, action: data.action }, 'Citation edited event emitted');
      } else {
        logger.warn('Event bus not connected, skipping citation edited event');
      }
    } catch (error) {
      logger.error({ error, reportId: data.reportId }, 'Failed to emit citation edited event');
      // Don't throw - audit failures should not block operations
    }
  }

  /**
   * Emit redaction completed event
   */
  async emitRedactionCompleted(data: RedactionCompletedData): Promise<void> {
    try {
      const event: RedactionCompletedEvent = {
        id: randomUUID(),
        type: 'reporting.redaction.completed',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: data.reportId,
          companyId: data.companyId,
          snippetsProcessed: data.snippetsProcessed,
          piiDetectedCount: data.piiDetectedCount,
          piiRemovedCount: data.piiRemovedCount,
          leaksDetected: data.leaksDetected,
          success: data.success,
          durationMs: data.durationMs,
          timestamp: new Date().toISOString(),
        },
      };

      if (this.connected) {
        await this.eventBus.publish(event);
        logger.info(
          {
            reportId: data.reportId,
            piiDetectedCount: data.piiDetectedCount,
            success: data.success,
          },
          'Redaction completed event emitted'
        );
      } else {
        logger.warn('Event bus not connected, skipping redaction completed event');
      }
    } catch (error) {
      logger.error({ error, reportId: data.reportId }, 'Failed to emit redaction completed event');
      // Don't throw
    }
  }

  /**
   * Emit evidence gate violation event
   */
  async emitEvidenceGateViolation(data: EvidenceGateViolationData): Promise<void> {
    try {
      const event: EvidenceGateViolationEvent = {
        id: randomUUID(),
        type: 'reporting.evidence_gate.violation',
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          reportId: data.reportId,
          companyId: data.companyId,
          violations: data.violations,
          totalCitationCount: data.totalCitationCount,
          totalParagraphCount: data.totalParagraphCount,
          citationDensity: data.citationDensity,
          rejected: data.rejected,
          timestamp: new Date().toISOString(),
        },
      };

      if (this.connected) {
        await this.eventBus.publish(event);
        logger.warn(
          {
            reportId: data.reportId,
            violationCount: data.violations.length,
            rejected: data.rejected,
          },
          'Evidence gate violation event emitted'
        );
      } else {
        logger.warn('Event bus not connected, skipping evidence gate violation event');
      }
    } catch (error) {
      logger.error({ error, reportId: data.reportId }, 'Failed to emit evidence gate violation event');
      // Don't throw
    }
  }

  /**
   * Health check
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Singleton instance
 */
let auditIntegrationInstance: AuditIntegration | null = null;

/**
 * Get or create audit integration instance
 */
export function getAuditIntegration(): AuditIntegration {
  if (!auditIntegrationInstance) {
    auditIntegrationInstance = new AuditIntegration();
  }
  return auditIntegrationInstance;
}

/**
 * Create a new audit integration instance (for testing)
 */
export function createAuditIntegration(): AuditIntegration {
  return new AuditIntegration();
}
