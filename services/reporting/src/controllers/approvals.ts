/**
 * Approval Workflow Controller
 *
 * Handles approval state transitions, comments, and audit trail
 *
 * @module controllers/approvals
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  ApprovalActionRequest,
  ApprovalActionResponse,
  ApprovalComment,
  ApprovalEvent,
  ApprovalStatus,
  ReportVersion,
  WatermarkConfig,
} from '../types/approvals.js';
import {
  canTransition,
  getNextActions,
  getDefaultWatermark,
  APPROVAL_TRANSITIONS,
} from '../types/approvals.js';
import { broadcastReportUpdate } from '../routes/sse.js';

/**
 * Get approval status for a report
 *
 * GET /companies/:id/reports/:reportId/approval
 */
export async function getApprovalStatus(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;

  try {
    // TODO: Fetch from database
    const approval = getMockApprovalStatus(reportId, companyId);

    if (!approval) {
      return reply.status(404).send({
        error: 'REPORT_NOT_FOUND',
        message: 'Report not found',
      });
    }

    return reply.send(approval);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'APPROVAL_FETCH_FAILED',
      message: 'Failed to fetch approval status',
    });
  }
}

/**
 * Perform approval action
 *
 * POST /companies/:id/reports/:reportId/approval/actions
 */
export async function performApprovalAction(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
    Body: ApprovalActionRequest;
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;
  const { action, comment, metadata } = request.body;

  try {
    // TODO: Get current user from auth context
    const userId = 'user-123';
    const userName = 'Jane Doe';
    const userRole = 'ADMIN'; // TODO: Get from auth

    // TODO: Fetch current report approval status from database
    const currentStatus: ApprovalStatus = 'draft'; // Mock

    // Validate action is allowed
    const nextActions = getNextActions(currentStatus, userRole);
    if (!nextActions.includes(action)) {
      return reply.status(403).send({
        error: 'ACTION_NOT_ALLOWED',
        message: `Action '${action}' not allowed in status '${currentStatus}' for role '${userRole}'`,
      });
    }

    // Determine new status based on action
    const newStatus = getNewStatusFromAction(currentStatus, action);

    // Validate transition
    if (!canTransition(currentStatus, newStatus)) {
      return reply.status(400).send({
        error: 'INVALID_TRANSITION',
        message: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      });
    }

    // Create approval event
    const event: ApprovalEvent = {
      id: `event-${Date.now()}`,
      timestamp: new Date(),
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action,
      from_status: currentStatus,
      to_status: newStatus,
      comment,
      metadata,
    };

    // TODO: Save to database
    // await db.approval_events.insert(event);
    // await db.reports.update({ id: reportId, approval_status: newStatus });

    // Handle special actions
    if (action === 'lock') {
      await handleLockAction(reportId, companyId, userName);
    } else if (action === 'approve_final') {
      await handleApprovalAction(reportId, companyId, userName);
    }

    // Broadcast update via SSE
    broadcastReportUpdate(companyId, {
      report_id: reportId,
      approval_status: newStatus,
      event,
    });

    // Send notification emails
    await sendApprovalNotification(reportId, action, newStatus, userName);

    const response: ApprovalActionResponse = {
      success: true,
      message: `Action '${action}' completed successfully`,
      new_status: newStatus,
      event_id: event.id,
      next_actions: getNextActions(newStatus, userRole),
    };

    return reply.send(response);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'APPROVAL_ACTION_FAILED',
      message: 'Failed to perform approval action',
    });
  }
}

/**
 * Get approval history (audit trail)
 *
 * GET /companies/:id/reports/:reportId/approval/history
 */
export async function getApprovalHistory(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;

  try {
    // TODO: Fetch from database
    const history = getMockApprovalHistory(reportId);

    return reply.send({
      report_id: reportId,
      events: history,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'HISTORY_FETCH_FAILED',
      message: 'Failed to fetch approval history',
    });
  }
}

/**
 * Get version history
 *
 * GET /companies/:id/reports/:reportId/versions
 */
export async function getVersionHistory(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;

  try {
    // TODO: Fetch from database
    const versions = getMockVersionHistory(reportId, companyId);

    return reply.send({
      report_id: reportId,
      current_version: versions.length,
      versions,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'VERSIONS_FETCH_FAILED',
      message: 'Failed to fetch version history',
    });
  }
}

/**
 * Get comments for report
 *
 * GET /companies/:id/reports/:reportId/comments
 */
export async function getComments(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;

  try {
    // TODO: Fetch from database
    const comments = getMockComments(reportId);

    return reply.send({
      report_id: reportId,
      comments,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'COMMENTS_FETCH_FAILED',
      message: 'Failed to fetch comments',
    });
  }
}

/**
 * Add comment to report
 *
 * POST /companies/:id/reports/:reportId/comments
 */
export async function addComment(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
    Body: { comment: string; parent_id?: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;
  const { comment: commentText, parent_id } = request.body;

  try {
    // TODO: Get current user from auth context
    const userId = 'user-123';
    const userName = 'Jane Doe';
    const userRole = 'ADMIN';

    const comment: ApprovalComment = {
      id: `comment-${Date.now()}`,
      report_id: reportId,
      parent_id,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      comment: commentText,
      created_at: new Date(),
      resolved: false,
    };

    // TODO: Save to database
    // await db.approval_comments.insert(comment);

    // Broadcast update via SSE
    broadcastReportUpdate(companyId, {
      report_id: reportId,
      new_comment: comment,
    });

    return reply.status(201).send(comment);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'COMMENT_ADD_FAILED',
      message: 'Failed to add comment',
    });
  }
}

/**
 * Resolve comment
 *
 * PATCH /companies/:id/reports/:reportId/comments/:commentId/resolve
 */
export async function resolveComment(
  request: FastifyRequest<{
    Params: { id: string; reportId: string; commentId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId, commentId } = request.params;

  try {
    // TODO: Get current user from auth context
    const userId = 'user-123';

    // TODO: Update in database
    // await db.approval_comments.update({
    //   id: commentId,
    //   resolved: true,
    //   resolved_by: userId,
    //   resolved_at: new Date(),
    // });

    // Broadcast update via SSE
    broadcastReportUpdate(companyId, {
      report_id: reportId,
      comment_resolved: commentId,
    });

    return reply.send({
      success: true,
      message: 'Comment resolved',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'COMMENT_RESOLVE_FAILED',
      message: 'Failed to resolve comment',
    });
  }
}

/**
 * Helper: Get new status from action
 */
function getNewStatusFromAction(
  currentStatus: ApprovalStatus,
  action: string
): ApprovalStatus {
  const transitions: Record<string, Partial<Record<ApprovalStatus, ApprovalStatus>>> = {
    submit: { draft: 'submitted', changes_requested: 'submitted' },
    withdraw: { submitted: 'draft' },
    start_review: { submitted: 'in_review' },
    request_changes: { in_review: 'changes_requested' },
    approve_review: { in_review: 'review_approved' },
    approve_final: { review_approved: 'approved' },
    reject: { review_approved: 'rejected' },
    lock: { approved: 'locked' },
    unlock: { locked: 'approved' },
    create: { rejected: 'draft' },
  };

  const newStatus = transitions[action]?.[currentStatus];
  if (!newStatus) {
    throw new Error(`No transition defined for action '${action}' from status '${currentStatus}'`);
  }

  return newStatus;
}

/**
 * Helper: Handle lock action (apply watermark)
 */
async function handleLockAction(
  reportId: string,
  companyId: string,
  approverName: string
): Promise<void> {
  // TODO: Apply watermark to PDF
  const watermark = getDefaultWatermark(approverName);

  // TODO: Call watermarking service
  // await watermarkService.applyWatermark(reportId, watermark);

  console.log(`[Approvals] Locked report ${reportId} with watermark by ${approverName}`);
}

/**
 * Helper: Handle approval action
 */
async function handleApprovalAction(
  reportId: string,
  companyId: string,
  approverName: string
): Promise<void> {
  // Create new version snapshot
  const version: ReportVersion = {
    version: 1, // TODO: Increment from last version
    created_at: new Date(),
    created_by: 'user-123',
    created_by_name: approverName,
    file_url: `/api/companies/${companyId}/reports/${reportId}/download`,
    file_size: 1024 * 512,
    file_hash: 'sha256-placeholder',
    changes_summary: 'Final approval',
    approval_status: 'approved',
  };

  // TODO: Save version to database
  // await db.report_versions.insert(version);

  console.log(`[Approvals] Approved report ${reportId} by ${approverName}`);
}

/**
 * Helper: Send notification email
 */
async function sendApprovalNotification(
  reportId: string,
  action: string,
  newStatus: ApprovalStatus,
  userName: string
): Promise<void> {
  // TODO: Integrate with Worker-1 email service
  console.log(`[Approvals] Notification: ${action} on ${reportId} by ${userName} -> ${newStatus}`);
}

/**
 * Mock data functions (replace with real DB queries)
 */
function getMockApprovalStatus(reportId: string, companyId: string) {
  return {
    report_id: reportId,
    approval_status: 'draft' as ApprovalStatus,
    current_version: 1,
    watermark: null,
    locked_at: null,
    locked_by: null,
    next_actions: getNextActions('draft', 'ADMIN'),
  };
}

function getMockApprovalHistory(reportId: string): ApprovalEvent[] {
  return [
    {
      id: 'event-1',
      timestamp: new Date(Date.now() - 86400000),
      user_id: 'user-123',
      user_name: 'Jane Doe',
      user_role: 'ADMIN',
      action: 'create',
      to_status: 'draft',
      comment: 'Report created',
    },
  ];
}

function getMockVersionHistory(reportId: string, companyId: string): ReportVersion[] {
  return [
    {
      version: 1,
      created_at: new Date(Date.now() - 86400000),
      created_by: 'user-123',
      created_by_name: 'Jane Doe',
      file_url: `/api/companies/${companyId}/reports/${reportId}/download`,
      file_size: 1024 * 512,
      file_hash: 'sha256-abc123',
      changes_summary: 'Initial version',
      approval_status: 'draft',
    },
  ];
}

function getMockComments(reportId: string): ApprovalComment[] {
  return [];
}
