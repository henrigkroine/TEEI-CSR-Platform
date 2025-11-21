/**
 * Audit Event Types
 *
 * Unified types for the Audit Log Explorer & Compliance Export system.
 * Normalizes audit events from multiple sources: auth, approvals, reporting,
 * Evidence Ledger, DSAR lifecycle, and AI prompt records.
 */

/**
 * Action categories for grouping audit events
 */
export enum ActionCategory {
  AUTH = 'AUTH',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  PRIVACY = 'PRIVACY',
  ADMIN = 'ADMIN',
  AI_GENERATION = 'AI_GENERATION',
  EVIDENCE = 'EVIDENCE',
  APPROVAL = 'APPROVAL',
}

/**
 * Standard actions across the platform
 */
export enum AuditAction {
  // Auth actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',

  // CRUD actions
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Export/Import actions
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',

  // Privacy actions
  DSAR_REQUEST = 'DSAR_REQUEST',
  DSAR_FULFILL = 'DSAR_FULFILL',
  DSAR_CANCEL = 'DSAR_CANCEL',
  CONSENT_GRANT = 'CONSENT_GRANT',
  CONSENT_REVOKE = 'CONSENT_REVOKE',

  // Approval actions
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_REVIEW = 'REQUEST_REVIEW',

  // AI actions
  AI_PROMPT = 'AI_PROMPT',
  AI_RESPONSE = 'AI_RESPONSE',
  AI_REDACT = 'AI_REDACT',

  // Evidence actions
  EVIDENCE_ADD = 'EVIDENCE_ADD',
  EVIDENCE_EDIT = 'EVIDENCE_EDIT',
  EVIDENCE_VERIFY = 'EVIDENCE_VERIFY',
  EVIDENCE_CHALLENGE = 'EVIDENCE_CHALLENGE',
}

/**
 * Resource types that can be audited
 */
export enum ResourceType {
  USER = 'user',
  COMPANY = 'company',
  PROFILE = 'profile',
  REPORT = 'report',
  EVIDENCE = 'evidence',
  METRIC = 'metric',
  DSAR_REQUEST = 'dsar_request',
  AI_PROMPT = 'ai_prompt',
  APPROVAL = 'approval',
  CONSENT = 'consent',
  API_KEY = 'api_key',
  ROLE = 'role',
  PERMISSION = 'permission',
}

/**
 * Actor information
 */
export interface AuditActor {
  id: string;
  email: string;
  role: string;
  name?: string;
}

/**
 * Resource information
 */
export interface AuditResource {
  type: ResourceType | string;
  id?: string;
  identifier?: string; // Human-readable identifier
}

/**
 * Request origin context
 */
export interface AuditOrigin {
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  requestId?: string;
  ref?: string; // Referrer or source system
}

/**
 * Complete audit event
 */
export interface AuditEvent {
  id: string;
  timestamp: Date;
  tenantId?: string; // company_id for tenant isolation

  actor: AuditActor;
  resource: AuditResource;
  action: AuditAction | string;
  actionCategory: ActionCategory;

  before?: Record<string, any>; // State before action
  after?: Record<string, any>; // State after action

  origin: AuditOrigin;

  metadata?: Record<string, any>; // Additional context
  gdprBasis?: string; // Legal basis for processing
  retentionUntil?: Date; // Auto-deletion date
}

/**
 * Audit event query filters
 */
export interface AuditEventFilters {
  from?: Date;
  to?: Date;
  tenantId?: string;
  actorId?: string;
  actorEmail?: string;
  resourceType?: ResourceType | string;
  resourceId?: string;
  action?: AuditAction | string;
  actionCategory?: ActionCategory;
  search?: string; // Full-text search in metadata
  limit?: number;
  offset?: number;
}

/**
 * Audit event query result
 */
export interface AuditEventQueryResult {
  events: AuditEvent[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Timeline aggregation bucket
 */
export interface AuditTimelineBucket {
  timestamp: Date;
  count: number;
  actionCounts: Record<string, number>;
}

/**
 * Compliance export request
 */
export interface ComplianceExportRequest {
  tenantId: string;
  from: Date;
  to: Date;
  filters?: AuditEventFilters;
  maskPII?: boolean; // Generate PII-masked variant
  includeEvidence?: boolean; // Include linked evidence documents
}

/**
 * Compliance export metadata
 */
export interface ComplianceExportMetadata {
  exportId: string;
  tenantId: string;
  from: Date;
  to: Date;
  generatedAt: Date;
  generatedBy: AuditActor;
  eventCount: number;
  sha256: string; // Manifest hash
  signature?: string; // Optional cryptographic signature
}

/**
 * Audit statistics
 */
export interface AuditStats {
  totalEvents: number;
  eventsByCategory: Record<ActionCategory, number>;
  eventsByAction: Record<string, number>;
  eventsByResourceType: Record<string, number>;
  topActors: Array<{ actorId: string; actorEmail: string; count: number }>;
  dateRange: { from: Date; to: Date };
}

/**
 * Diff result for before/after comparison
 */
export interface AuditDiff {
  field: string;
  before: any;
  after: any;
  type: 'added' | 'removed' | 'modified';
}

/**
 * RBAC roles for audit access
 */
export enum AuditRole {
  AUDIT_VIEWER = 'AuditViewer', // Can view audit logs
  AUDIT_ADMIN = 'AuditAdmin', // Can view, export, and manage audit logs
}
