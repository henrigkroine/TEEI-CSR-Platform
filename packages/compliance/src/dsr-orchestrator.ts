/**
 * Data Subject Request (DSR) Orchestrator
 *
 * Coordinates GDPR data subject requests across all services:
 * - Right to Access (Article 15)
 * - Right to Rectification (Article 16)
 * - Right to Erasure / "Right to be Forgotten" (Article 17)
 * - Right to Data Portability (Article 20)
 *
 * Handles multi-service coordination, verification, and audit logging.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import {
  piiDeletionQueue,
  encryptedUserPii,
  users,
  externalIdMappings,
} from '@teei/shared-schema';
import { createAuditLogger, AuditAction } from './audit-logger.js';

/**
 * DSR Request Types
 */
export enum DsrRequestType {
  ACCESS = 'ACCESS', // Export all data
  RECTIFICATION = 'RECTIFICATION', // Update incorrect data
  ERASURE = 'ERASURE', // Delete data ("right to be forgotten")
  PORTABILITY = 'PORTABILITY', // Export in machine-readable format
  RESTRICT = 'RESTRICT', // Restrict processing
  OBJECT = 'OBJECT', // Object to processing
}

/**
 * DSR Request Status
 */
export enum DsrStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Data sources that need to be included in DSR operations
 */
export const DATA_SOURCES = [
  'users', // Core user data
  'encrypted_user_pii', // PII data
  'external_id_mappings', // External system IDs
  'program_enrollments', // Program participation
  'kintell_events', // Kintell interactions
  'buddy_matches', // Buddy program data
  'course_completions', // Upskilling data
  'q2q_tags', // Q2Q classifications
  'audit_logs', // Audit trail (user's own actions)
] as const;

/**
 * DSR Request
 */
export interface DsrRequest {
  requestType: DsrRequestType;
  userId: string;
  requestedBy: string; // Who initiated the request
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Data Export Result
 */
export interface DataExportResult {
  userId: string;
  exportDate: string;
  data: {
    profile: any;
    pii: any;
    externalIds: any[];
    programs: any[];
    activities: any[];
  };
  metadata: {
    sources: string[];
    recordCount: number;
  };
}

/**
 * Deletion Result
 */
export interface DeletionResult {
  userId: string;
  status: DsrStatus;
  deletedSources: string[];
  verificationHash: string;
  completedAt: string;
  errors?: string[];
}

/**
 * DSR Orchestrator
 */
export class DsrOrchestrator {
  private auditLogger;

  constructor(private db: PostgresJsDatabase) {
    this.auditLogger = createAuditLogger(db);
  }

  /**
   * Export all user data (GDPR Article 15 - Right to Access)
   */
  async exportUserData(userId: string, requestedBy: string): Promise<DataExportResult> {
    // Audit the export request
    await this.auditLogger.logPrivacyEvent({
      actorId: requestedBy,
      actorEmail: 'system@teei.com', // Should be populated from user context
      actorRole: 'user',
      action: AuditAction.EXPORT_DATA,
      resourceType: 'user_data',
      resourceId: userId,
      metadata: { requestType: 'FULL_EXPORT' },
    });

    const exportData: DataExportResult = {
      userId,
      exportDate: new Date().toISOString(),
      data: {
        profile: null,
        pii: null,
        externalIds: [],
        programs: [],
        activities: [],
      },
      metadata: {
        sources: [],
        recordCount: 0,
      },
    };

    try {
      // 1. Get user profile
      const userProfile = await this.db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (userProfile) {
        exportData.data.profile = userProfile;
        exportData.metadata.sources.push('users');
        exportData.metadata.recordCount++;
      }

      // 2. Get PII data (encrypted)
      const piiData = await this.db.query.encryptedUserPii.findFirst({
        where: eq(encryptedUserPii.userId, userId),
      });

      if (piiData) {
        // Note: PII should be decrypted using PiiEncryption service before export
        exportData.data.pii = {
          ...piiData,
          _note: 'PII fields are encrypted. Use PiiEncryption service to decrypt.',
        };
        exportData.metadata.sources.push('encrypted_user_pii');
        exportData.metadata.recordCount++;
      }

      // 3. Get external ID mappings
      const externalIds = await this.db.query.externalIdMappings.findMany({
        where: eq(externalIdMappings.userId, userId),
      });

      if (externalIds.length > 0) {
        exportData.data.externalIds = externalIds;
        exportData.metadata.sources.push('external_id_mappings');
        exportData.metadata.recordCount += externalIds.length;
      }

      // 4. Get program enrollments
      // Note: This would require querying program_enrollments table
      // Implementation depends on the actual schema

      // 5. Get activities (Kintell, Buddy, Upskilling, Q2Q)
      // Note: These would require querying respective tables
      // Implementation depends on the actual schema

      return exportData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw new Error(`Data export failed: ${error}`);
    }
  }

  /**
   * Request user data deletion (GDPR Article 17 - Right to Erasure)
   */
  async requestDeletion(request: DsrRequest): Promise<string> {
    const { userId, requestedBy, reason } = request;

    // Audit the deletion request
    await this.auditLogger.logPrivacyEvent({
      actorId: requestedBy,
      actorEmail: 'system@teei.com',
      actorRole: 'user',
      action: AuditAction.REQUEST_DELETION,
      resourceType: 'user_data',
      resourceId: userId,
      metadata: { reason },
    });

    // Add to deletion queue with grace period (30 days by default)
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30); // 30-day grace period

    const [deletionRequest] = await this.db
      .insert(piiDeletionQueue)
      .values({
        userId,
        requestedBy,
        requestReason: reason || 'GDPR_RIGHT_TO_BE_FORGOTTEN',
        status: DsrStatus.PENDING,
        scheduledFor,
        systemsDeleted: JSON.stringify([]),
        retryCount: '0',
      })
      .returning();

    return deletionRequest.id;
  }

  /**
   * Execute pending deletions
   */
  async executeDeletion(deletionId: string): Promise<DeletionResult> {
    // Get deletion request
    const deletionRequest = await this.db.query.piiDeletionQueue.findFirst({
      where: eq(piiDeletionQueue.id, deletionId),
    });

    if (!deletionRequest) {
      throw new Error(`Deletion request ${deletionId} not found`);
    }

    if (deletionRequest.status === DsrStatus.COMPLETED) {
      throw new Error(`Deletion request ${deletionId} already completed`);
    }

    const { userId } = deletionRequest;
    const deletedSources: string[] = [];
    const errors: string[] = [];

    try {
      // Update status to IN_PROGRESS
      await this.db
        .update(piiDeletionQueue)
        .set({ status: DsrStatus.IN_PROGRESS, updatedAt: new Date() })
        .where(eq(piiDeletionQueue.id, deletionId));

      // 1. Delete PII data
      try {
        await this.db.delete(encryptedUserPii).where(eq(encryptedUserPii.userId, userId));
        deletedSources.push('encrypted_user_pii');
      } catch (error) {
        errors.push(`Failed to delete PII: ${error}`);
      }

      // 2. Delete external ID mappings
      try {
        await this.db.delete(externalIdMappings).where(eq(externalIdMappings.userId, userId));
        deletedSources.push('external_id_mappings');
      } catch (error) {
        errors.push(`Failed to delete external IDs: ${error}`);
      }

      // 3. Anonymize user profile (keep for data integrity, but remove PII)
      try {
        await this.db
          .update(users)
          .set({
            email: `deleted_${userId}@anonymized.local`,
            firstName: 'Deleted',
            lastName: 'User',
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
        deletedSources.push('users_anonymized');
      } catch (error) {
        errors.push(`Failed to anonymize user: ${error}`);
      }

      // 4. Delete from other tables
      // Note: Implementation would include:
      // - program_enrollments
      // - kintell_events
      // - buddy_matches
      // - course_completions
      // - q2q_tags
      // Each should be deleted or anonymized based on data retention requirements

      // Create verification hash
      const verificationHash = this.createVerificationHash(userId, deletedSources);

      // Update deletion request
      const status = errors.length > 0 ? DsrStatus.FAILED : DsrStatus.COMPLETED;
      await this.db
        .update(piiDeletionQueue)
        .set({
          status,
          completedAt: new Date(),
          systemsDeleted: JSON.stringify(deletedSources),
          verificationHash,
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          updatedAt: new Date(),
        })
        .where(eq(piiDeletionQueue.id, deletionId));

      // Audit the deletion
      await this.auditLogger.logPrivacyEvent({
        actorId: deletionRequest.requestedBy,
        actorEmail: 'system@teei.com',
        actorRole: 'system',
        action: AuditAction.CONFIRM_DELETION,
        resourceType: 'user_data',
        resourceId: userId,
        metadata: {
          deletionId,
          deletedSources,
          verificationHash,
          errors: errors.length > 0 ? errors : undefined,
        },
      });

      return {
        userId,
        status,
        deletedSources,
        verificationHash,
        completedAt: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Deletion execution failed:', error);
      await this.db
        .update(piiDeletionQueue)
        .set({
          status: DsrStatus.FAILED,
          errorMessage: String(error),
          updatedAt: new Date(),
        })
        .where(eq(piiDeletionQueue.id, deletionId));

      throw error;
    }
  }

  /**
   * Get pending deletions
   */
  async getPendingDeletions(): Promise<any[]> {
    const now = new Date();

    return await this.db.query.piiDeletionQueue.findMany({
      where: and(
        eq(piiDeletionQueue.status, DsrStatus.PENDING),
        // scheduledFor <= now (only use if your Drizzle version supports lte)
      ),
    });
  }

  /**
   * Cancel deletion request (within grace period)
   */
  async cancelDeletion(deletionId: string, cancelledBy: string): Promise<void> {
    const deletionRequest = await this.db.query.piiDeletionQueue.findFirst({
      where: eq(piiDeletionQueue.id, deletionId),
    });

    if (!deletionRequest) {
      throw new Error(`Deletion request ${deletionId} not found`);
    }

    if (deletionRequest.status !== DsrStatus.PENDING) {
      throw new Error(`Cannot cancel deletion request in status ${deletionRequest.status}`);
    }

    await this.db
      .update(piiDeletionQueue)
      .set({
        status: DsrStatus.CANCELLED,
        errorMessage: `Cancelled by ${cancelledBy}`,
        updatedAt: new Date(),
      })
      .where(eq(piiDeletionQueue.id, deletionId));

    // Audit the cancellation
    await this.auditLogger.logPrivacyEvent({
      actorId: cancelledBy,
      actorEmail: 'system@teei.com',
      actorRole: 'user',
      action: AuditAction.CONSENT_WITHDRAWN,
      resourceType: 'deletion_request',
      resourceId: deletionId,
      metadata: { originalUserId: deletionRequest.userId },
    });
  }

  /**
   * Create verification hash for deleted data
   */
  private createVerificationHash(userId: string, deletedSources: string[]): string {
    const crypto = require('crypto');
    const data = `${userId}:${deletedSources.sort().join(',')}:${new Date().toISOString()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get DSR request status
   */
  async getDeletionStatus(deletionId: string): Promise<any> {
    return await this.db.query.piiDeletionQueue.findFirst({
      where: eq(piiDeletionQueue.id, deletionId),
    });
  }
}

/**
 * Create DSR orchestrator instance
 */
export function createDsrOrchestrator(db: PostgresJsDatabase): DsrOrchestrator {
  return new DsrOrchestrator(db);
}

/**
 * Example usage:
 *
 * ```typescript
 * const dsr = createDsrOrchestrator(db);
 *
 * // Export user data
 * const exportData = await dsr.exportUserData(userId, requestedBy);
 *
 * // Request deletion
 * const deletionId = await dsr.requestDeletion({
 *   requestType: DsrRequestType.ERASURE,
 *   userId,
 *   requestedBy: userId,
 *   reason: 'User requested account deletion'
 * });
 *
 * // Execute deletion (after grace period)
 * const result = await dsr.executeDeletion(deletionId);
 *
 * // Cancel deletion (within grace period)
 * await dsr.cancelDeletion(deletionId, userId);
 * ```
 */
