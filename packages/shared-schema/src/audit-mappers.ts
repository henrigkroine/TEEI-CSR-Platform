/**
 * Audit Event Mappers
 *
 * Normalizes audit events from various sources into the unified AuditEvent format:
 * - Auth events (login, logout, password reset)
 * - Approval events (report approval workflow)
 * - Reporting edits (report modifications)
 * - Evidence Ledger operations
 * - DSAR lifecycle (data subject requests)
 * - AI prompt records
 */

import type { AuditEvent, AuditActor, AuditResource, AuditOrigin, ActionCategory, AuditAction } from '@teei/shared-types';
import type { Pool } from 'pg';
import { auditLogs } from './schema/audits.js';

/**
 * Base mapper interface
 */
interface EventMapper<TSource = any> {
  map(source: TSource): Omit<AuditEvent, 'id' | 'timestamp'>;
}

/**
 * Auth event mapper
 */
export class AuthEventMapper implements EventMapper {
  map(source: {
    userId: string;
    email: string;
    role: string;
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_RESET' | 'MFA_ENABLED' | 'MFA_DISABLED';
    ip?: string;
    userAgent?: string;
    requestId?: string;
    success?: boolean;
    tenantId?: string;
  }): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      tenantId: source.tenantId,
      actor: {
        id: source.userId,
        email: source.email,
        role: source.role,
      },
      resource: {
        type: 'user',
        id: source.userId,
        identifier: source.email,
      },
      action: source.action,
      actionCategory: 'AUTH' as ActionCategory,
      origin: {
        ip: source.ip,
        userAgent: source.userAgent,
        requestId: source.requestId,
      },
      metadata: {
        success: source.success !== false,
      },
    };
  }
}

/**
 * Approval workflow event mapper
 */
export class ApprovalEventMapper implements EventMapper {
  map(source: {
    reportId: string;
    reportTitle: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: 'REQUEST_REVIEW' | 'APPROVE' | 'REJECT';
    previousStatus?: string;
    newStatus: string;
    comment?: string;
    tenantId: string;
    ip?: string;
    requestId?: string;
  }): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      tenantId: source.tenantId,
      actor: {
        id: source.actorId,
        email: source.actorEmail,
        role: source.actorRole,
      },
      resource: {
        type: 'approval',
        id: source.reportId,
        identifier: source.reportTitle,
      },
      action: source.action,
      actionCategory: 'APPROVAL' as ActionCategory,
      before: source.previousStatus ? { status: source.previousStatus } : undefined,
      after: { status: source.newStatus },
      origin: {
        ip: source.ip,
        requestId: source.requestId,
      },
      metadata: {
        comment: source.comment,
        reportId: source.reportId,
      },
    };
  }
}

/**
 * Report edit event mapper
 */
export class ReportEditMapper implements EventMapper {
  map(source: {
    reportId: string;
    reportTitle: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    before?: Record<string, any>;
    after?: Record<string, any>;
    tenantId: string;
    ip?: string;
    requestId?: string;
  }): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      tenantId: source.tenantId,
      actor: {
        id: source.actorId,
        email: source.actorEmail,
        role: source.actorRole,
      },
      resource: {
        type: 'report',
        id: source.reportId,
        identifier: source.reportTitle,
      },
      action: source.action,
      actionCategory: 'DATA_MODIFICATION' as ActionCategory,
      before: source.before,
      after: source.after,
      origin: {
        ip: source.ip,
        requestId: source.requestId,
      },
    };
  }
}

/**
 * Evidence Ledger event mapper
 */
export class EvidenceEventMapper implements EventMapper {
  map(source: {
    evidenceId: string;
    evidenceTitle: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: 'EVIDENCE_ADD' | 'EVIDENCE_EDIT' | 'EVIDENCE_VERIFY' | 'EVIDENCE_CHALLENGE';
    before?: Record<string, any>;
    after?: Record<string, any>;
    tenantId: string;
    ip?: string;
    requestId?: string;
  }): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      tenantId: source.tenantId,
      actor: {
        id: source.actorId,
        email: source.actorEmail,
        role: source.actorRole,
      },
      resource: {
        type: 'evidence',
        id: source.evidenceId,
        identifier: source.evidenceTitle,
      },
      action: source.action,
      actionCategory: 'EVIDENCE' as ActionCategory,
      before: source.before,
      after: source.after,
      origin: {
        ip: source.ip,
        requestId: source.requestId,
      },
    };
  }
}

/**
 * DSAR lifecycle event mapper
 */
export class DsarEventMapper implements EventMapper {
  map(source: {
    dsarId: string;
    userId: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: 'DSAR_REQUEST' | 'DSAR_FULFILL' | 'DSAR_CANCEL';
    requestType: 'ACCESS' | 'ERASURE' | 'PORTABILITY' | 'RECTIFICATION';
    status: string;
    tenantId?: string;
    ip?: string;
    requestId?: string;
  }): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      tenantId: source.tenantId,
      actor: {
        id: source.actorId,
        email: source.actorEmail,
        role: source.actorRole,
      },
      resource: {
        type: 'dsar_request',
        id: source.dsarId,
        identifier: `${source.requestType}-${source.userId}`,
      },
      action: source.action,
      actionCategory: 'PRIVACY' as ActionCategory,
      after: { status: source.status },
      origin: {
        ip: source.ip,
        requestId: source.requestId,
      },
      metadata: {
        requestType: source.requestType,
        subjectUserId: source.userId,
      },
      gdprBasis: 'legal_obligation',
    };
  }
}

/**
 * AI prompt event mapper
 */
export class AIPromptEventMapper implements EventMapper {
  map(source: {
    promptId: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: 'AI_PROMPT' | 'AI_RESPONSE' | 'AI_REDACT';
    promptText?: string; // Redacted by default
    promptHash: string; // Hash for correlation without storing sensitive content
    modelUsed: string;
    tokenCount?: number;
    redactedFields?: string[];
    tenantId: string;
    ip?: string;
    requestId?: string;
  }): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      tenantId: source.tenantId,
      actor: {
        id: source.actorId,
        email: source.actorEmail,
        role: source.actorRole,
      },
      resource: {
        type: 'ai_prompt',
        id: source.promptId,
        identifier: source.promptHash,
      },
      action: source.action,
      actionCategory: 'AI_GENERATION' as ActionCategory,
      origin: {
        ip: source.ip,
        requestId: source.requestId,
      },
      metadata: {
        promptHash: source.promptHash,
        modelUsed: source.modelUsed,
        tokenCount: source.tokenCount,
        redactedFields: source.redactedFields,
        // Never store actual prompt text in audit logs
      },
      gdprBasis: 'legitimate_interest',
    };
  }
}

/**
 * Data access event mapper
 */
export class DataAccessEventMapper implements EventMapper {
  map(source: {
    resourceType: string;
    resourceId: string;
    resourceIdentifier?: string;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    action: 'READ' | 'EXPORT';
    tenantId?: string;
    ip?: string;
    endpoint?: string;
    requestId?: string;
  }): Omit<AuditEvent, 'id' | 'timestamp'> {
    return {
      tenantId: source.tenantId,
      actor: {
        id: source.actorId,
        email: source.actorEmail,
        role: source.actorRole,
      },
      resource: {
        type: source.resourceType,
        id: source.resourceId,
        identifier: source.resourceIdentifier,
      },
      action: source.action,
      actionCategory: 'DATA_ACCESS' as ActionCategory,
      origin: {
        ip: source.ip,
        endpoint: source.endpoint,
        requestId: source.requestId,
      },
    };
  }
}

/**
 * Helper to insert audit event into database
 */
export async function insertAuditEvent(
  db: Pool,
  event: Omit<AuditEvent, 'id' | 'timestamp'>
): Promise<void> {
  await db.query(
    `INSERT INTO audit_logs (
      company_id,
      actor_id,
      actor_email,
      actor_role,
      actor_ip,
      action,
      action_category,
      resource_type,
      resource_id,
      resource_identifier,
      before_state,
      after_state,
      request_id,
      user_agent,
      endpoint,
      metadata,
      gdpr_basis,
      retention_until
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      event.tenantId,
      event.actor.id,
      event.actor.email,
      event.actor.role,
      event.origin.ip,
      event.action,
      event.actionCategory,
      event.resource.type,
      event.resource.id,
      event.resource.identifier,
      event.before ? JSON.stringify(event.before) : null,
      event.after ? JSON.stringify(event.after) : null,
      event.origin.requestId,
      event.origin.userAgent,
      event.origin.endpoint,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.gdprBasis,
      event.retentionUntil,
    ]
  );
}

/**
 * Export all mappers
 */
export const AuditMappers = {
  auth: new AuthEventMapper(),
  approval: new ApprovalEventMapper(),
  report: new ReportEditMapper(),
  evidence: new EvidenceEventMapper(),
  dsar: new DsarEventMapper(),
  aiPrompt: new AIPromptEventMapper(),
  dataAccess: new DataAccessEventMapper(),
};
