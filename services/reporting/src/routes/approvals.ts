/**
 * Approval Workflow Routes
 *
 * Endpoints:
 * - GET /companies/:id/reports/:reportId/approval - Get approval status
 * - POST /companies/:id/reports/:reportId/approval/actions - Perform action
 * - GET /companies/:id/reports/:reportId/approval/history - Get audit trail
 * - GET /companies/:id/reports/:reportId/versions - Get version history
 * - GET /companies/:id/reports/:reportId/comments - Get comments
 * - POST /companies/:id/reports/:reportId/comments - Add comment
 * - PATCH /companies/:id/reports/:reportId/comments/:commentId/resolve - Resolve comment
 *
 * @module routes/approvals
 */

import type { FastifyInstance } from 'fastify';
import {
  getApprovalStatus,
  performApprovalAction,
  getApprovalHistory,
  getVersionHistory,
  getComments,
  addComment,
  resolveComment,
} from '../controllers/approvals.js';

export async function approvalRoutes(fastify: FastifyInstance) {
  /**
   * Get approval status for report
   */
  fastify.get('/companies/:id/reports/:reportId/approval', {
    schema: {
      description: 'Get approval status and workflow state',
      tags: ['Approvals'],
      params: {
        type: 'object',
        required: ['id', 'reportId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          reportId: { type: 'string', description: 'Report ID' },
        },
      },
      response: {
        200: {
          description: 'Approval status',
          type: 'object',
          properties: {
            report_id: { type: 'string' },
            approval_status: { type: 'string' },
            current_version: { type: 'number' },
            watermark: { type: 'object', nullable: true },
            locked_at: { type: 'string', format: 'date-time', nullable: true },
            locked_by: { type: 'string', nullable: true },
            next_actions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    handler: getApprovalStatus,
  });

  /**
   * Perform approval action
   */
  fastify.post('/companies/:id/reports/:reportId/approval/actions', {
    schema: {
      description: 'Perform approval workflow action',
      tags: ['Approvals'],
      params: {
        type: 'object',
        required: ['id', 'reportId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          reportId: { type: 'string', description: 'Report ID' },
        },
      },
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action: {
            type: 'string',
            enum: [
              'submit',
              'withdraw',
              'start_review',
              'request_changes',
              'approve_review',
              'approve_final',
              'reject',
              'lock',
              'unlock',
              'comment',
            ],
            description: 'Approval action to perform',
          },
          comment: { type: 'string', description: 'Optional comment' },
          metadata: { type: 'object', description: 'Optional metadata' },
        },
      },
      response: {
        200: {
          description: 'Action completed',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            new_status: { type: 'string' },
            event_id: { type: 'string' },
            next_actions: { type: 'array', items: { type: 'string' } },
          },
        },
        400: {
          description: 'Invalid transition',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        403: {
          description: 'Action not allowed',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: performApprovalAction,
  });

  /**
   * Get approval history (audit trail)
   */
  fastify.get('/companies/:id/reports/:reportId/approval/history', {
    schema: {
      description: 'Get approval audit trail',
      tags: ['Approvals'],
      params: {
        type: 'object',
        required: ['id', 'reportId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          reportId: { type: 'string', description: 'Report ID' },
        },
      },
      response: {
        200: {
          description: 'Approval history',
          type: 'object',
          properties: {
            report_id: { type: 'string' },
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  user_id: { type: 'string' },
                  user_name: { type: 'string' },
                  user_role: { type: 'string' },
                  action: { type: 'string' },
                  from_status: { type: 'string' },
                  to_status: { type: 'string' },
                  comment: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    handler: getApprovalHistory,
  });

  /**
   * Get version history
   */
  fastify.get('/companies/:id/reports/:reportId/versions', {
    schema: {
      description: 'Get report version history',
      tags: ['Approvals'],
      params: {
        type: 'object',
        required: ['id', 'reportId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          reportId: { type: 'string', description: 'Report ID' },
        },
      },
      response: {
        200: {
          description: 'Version history',
          type: 'object',
          properties: {
            report_id: { type: 'string' },
            current_version: { type: 'number' },
            versions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  version: { type: 'number' },
                  created_at: { type: 'string', format: 'date-time' },
                  created_by: { type: 'string' },
                  created_by_name: { type: 'string' },
                  file_url: { type: 'string' },
                  file_size: { type: 'number' },
                  file_hash: { type: 'string' },
                  changes_summary: { type: 'string' },
                  approval_status: { type: 'string' },
                  diff_url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    handler: getVersionHistory,
  });

  /**
   * Get comments
   */
  fastify.get('/companies/:id/reports/:reportId/comments', {
    schema: {
      description: 'Get report comments',
      tags: ['Approvals'],
      params: {
        type: 'object',
        required: ['id', 'reportId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          reportId: { type: 'string', description: 'Report ID' },
        },
      },
      response: {
        200: {
          description: 'Comments list',
          type: 'object',
          properties: {
            report_id: { type: 'string' },
            comments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  report_id: { type: 'string' },
                  parent_id: { type: 'string' },
                  user_id: { type: 'string' },
                  user_name: { type: 'string' },
                  user_role: { type: 'string' },
                  comment: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  resolved: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    handler: getComments,
  });

  /**
   * Add comment
   */
  fastify.post('/companies/:id/reports/:reportId/comments', {
    schema: {
      description: 'Add comment to report',
      tags: ['Approvals'],
      params: {
        type: 'object',
        required: ['id', 'reportId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          reportId: { type: 'string', description: 'Report ID' },
        },
      },
      body: {
        type: 'object',
        required: ['comment'],
        properties: {
          comment: { type: 'string', description: 'Comment text' },
          parent_id: { type: 'string', description: 'Parent comment ID for replies' },
        },
      },
      response: {
        201: {
          description: 'Comment created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            report_id: { type: 'string' },
            user_name: { type: 'string' },
            comment: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    handler: addComment,
  });

  /**
   * Resolve comment
   */
  fastify.patch('/companies/:id/reports/:reportId/comments/:commentId/resolve', {
    schema: {
      description: 'Mark comment as resolved',
      tags: ['Approvals'],
      params: {
        type: 'object',
        required: ['id', 'reportId', 'commentId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          reportId: { type: 'string', description: 'Report ID' },
          commentId: { type: 'string', description: 'Comment ID' },
        },
      },
      response: {
        200: {
          description: 'Comment resolved',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: resolveComment,
  });
}
