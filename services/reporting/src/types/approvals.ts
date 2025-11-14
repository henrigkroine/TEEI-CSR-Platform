/**
 * Approval Workflow Types
 *
 * Multi-step approval system for enterprise report compliance:
 * - draft → review → approved → locked
 * - Comment threads and audit trail
 * - Version history with diffs
 *
 * @module types/approvals
 */

/**
 * Approval workflow states
 */
export type ApprovalStatus =
  | 'draft' // Initial state, editable by creator
  | 'submitted' // Submitted for review, waiting for reviewer
  | 'in_review' // Reviewer is actively reviewing
  | 'changes_requested' // Reviewer requested changes, back to creator
  | 'review_approved' // Reviewer approved, waiting for final approver
  | 'approved' // Final approver approved, ready to lock
  | 'locked' // Locked, read-only, immutable
  | 'rejected'; // Rejected by approver, terminal state

/**
 * Approval state transition rules
 */
export const APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ['submitted'],
  submitted: ['in_review', 'draft'], // Can withdraw
  in_review: ['changes_requested', 'review_approved', 'submitted'],
  changes_requested: ['submitted'], // Resubmit after fixes
  review_approved: ['approved', 'rejected', 'in_review'], // Can re-review
  approved: ['locked', 'in_review'], // Can unlock for re-review
  locked: [], // Terminal state, no transitions
  rejected: ['draft'], // Can restart from scratch
};

/**
 * Extended Report interface with approval fields
 */
export interface ReportWithApproval {
  // Base report fields (from Report interface)
  id: string;
  company_id: string;
  template_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  format: 'pdf' | 'html' | 'csv' | 'xlsx';
  parameters: any;
  generated_at?: Date;
  generated_by: string;
  file_url?: string;
  file_size?: number;
  created_at: Date;
  updated_at: Date;

  // Approval workflow fields
  approval_status: ApprovalStatus;
  approval_history: ApprovalEvent[];
  current_version: number;
  version_history: ReportVersion[];
  watermark?: WatermarkConfig;
  locked_at?: Date;
  locked_by?: string;
}

/**
 * Approval event (audit trail)
 */
export interface ApprovalEvent {
  id: string;
  timestamp: Date;
  user_id: string;
  user_name: string;
  user_role: string;
  action: ApprovalAction;
  from_status?: ApprovalStatus;
  to_status: ApprovalStatus;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Approval actions
 */
export type ApprovalAction =
  | 'create' // Report created
  | 'submit' // Submitted for review
  | 'withdraw' // Withdrawn from review
  | 'start_review' // Reviewer started reviewing
  | 'request_changes' // Reviewer requested changes
  | 'approve_review' // Reviewer approved
  | 'approve_final' // Final approver approved
  | 'reject' // Final approver rejected
  | 'lock' // Report locked (immutable)
  | 'unlock' // Report unlocked (admin only)
  | 'comment' // Comment added
  | 'version_created'; // New version created

/**
 * Report version (for version history)
 */
export interface ReportVersion {
  version: number;
  created_at: Date;
  created_by: string;
  created_by_name: string;
  file_url: string;
  file_size: number;
  file_hash: string; // SHA-256 hash for integrity
  changes_summary?: string;
  diff_url?: string; // URL to diff viewer
  approval_status: ApprovalStatus;
}

/**
 * Watermark configuration
 */
export interface WatermarkConfig {
  enabled: boolean;
  text: string; // e.g., "APPROVED - Jane Doe - 2024-11-14"
  position: 'header' | 'footer' | 'diagonal' | 'corner';
  opacity: number; // 0.0 - 1.0
  font_size: number; // px
  color: string; // hex color
  include_timestamp: boolean;
  include_approver_name: boolean;
  include_company_logo: boolean;
}

/**
 * Comment thread
 */
export interface ApprovalComment {
  id: string;
  report_id: string;
  parent_id?: string; // For nested replies
  user_id: string;
  user_name: string;
  user_role: string;
  comment: string;
  created_at: Date;
  updated_at?: Date;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: Date;
  attachments?: CommentAttachment[];
}

/**
 * Comment attachment
 */
export interface CommentAttachment {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

/**
 * Approval workflow request
 */
export interface ApprovalActionRequest {
  action: ApprovalAction;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Approval workflow response
 */
export interface ApprovalActionResponse {
  success: boolean;
  message: string;
  new_status: ApprovalStatus;
  event_id: string;
  next_actions: ApprovalAction[]; // Available next actions
}

/**
 * RBAC permissions for approval workflow
 */
export const APPROVAL_PERMISSIONS = {
  draft: {
    allowed_roles: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    allowed_actions: ['submit', 'comment'],
  },
  submitted: {
    allowed_roles: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    allowed_actions: ['withdraw', 'comment'],
  },
  in_review: {
    allowed_roles: ['ADMIN', 'SUPER_ADMIN'], // Only reviewers
    allowed_actions: ['request_changes', 'approve_review', 'comment'],
  },
  changes_requested: {
    allowed_roles: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    allowed_actions: ['submit', 'comment'], // Resubmit after fixes
  },
  review_approved: {
    allowed_roles: ['SUPER_ADMIN'], // Only final approvers
    allowed_actions: ['approve_final', 'reject', 'comment'],
  },
  approved: {
    allowed_roles: ['SUPER_ADMIN'],
    allowed_actions: ['lock', 'comment'],
  },
  locked: {
    allowed_roles: ['SUPER_ADMIN'], // Admin can unlock
    allowed_actions: ['unlock', 'comment'],
  },
  rejected: {
    allowed_roles: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    allowed_actions: ['create', 'comment'], // Start over
  },
} as const;

/**
 * Validate approval state transition
 */
export function canTransition(
  from: ApprovalStatus,
  to: ApprovalStatus
): boolean {
  const allowedTransitions = APPROVAL_TRANSITIONS[from];
  return allowedTransitions.includes(to);
}

/**
 * Get next allowed actions for current status
 */
export function getNextActions(
  status: ApprovalStatus,
  userRole: string
): ApprovalAction[] {
  const permissions = APPROVAL_PERMISSIONS[status];
  if (!permissions) return [];

  // Check if user role is allowed
  if (!permissions.allowed_roles.includes(userRole as any)) {
    return ['comment']; // Anyone can comment
  }

  return permissions.allowed_actions;
}

/**
 * Get default watermark config
 */
export function getDefaultWatermark(
  approver_name: string,
  company_name?: string
): WatermarkConfig {
  return {
    enabled: true,
    text: `APPROVED BY ${approver_name.toUpperCase()}`,
    position: 'footer',
    opacity: 0.3,
    font_size: 10,
    color: '#666666',
    include_timestamp: true,
    include_approver_name: true,
    include_company_logo: false,
  };
}
