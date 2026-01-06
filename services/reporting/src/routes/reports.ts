/**
 * Report Routes
 *
 * Endpoints:
 * - GET /companies/:id/reports/templates - List templates
 * - POST /companies/:id/reports - Create report
 * - GET /companies/:id/reports - List reports
 * - GET /companies/:id/reports/:reportId - Get report details
 * - GET /companies/:id/reports/:reportId/download - Download report
 * - DELETE /companies/:id/reports/:reportId - Delete report
 *
 * @module routes/reports
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getReportTemplates,
  createReport,
  getReport,
  listReports,
  downloadReport,
  deleteReport,
} from '../controllers/reports.js';
import { CACHE_CONTROL } from '../middleware/etag.js';

export async function reportRoutes(fastify: FastifyInstance) {
  /**
   * Get available report templates
   */
  fastify.get('/companies/:id/reports/templates', {
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Apply long cache (24 hours) for static templates
      reply.header('Cache-Control', CACHE_CONTROL.LONG);
    },
    schema: {
      description: 'Get available report templates',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      response: {
        200: {
          description: 'Report templates',
          type: 'object',
          properties: {
            templates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  estimated_pages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    handler: getReportTemplates,
  });

  /**
   * Create new report
   */
  fastify.post('/companies/:id/reports', {
    schema: {
      description: 'Create new report',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      body: {
        type: 'object',
        required: ['template_id', 'title', 'format', 'parameters'],
        properties: {
          template_id: { type: 'string', description: 'Template ID' },
          title: { type: 'string', description: 'Report title' },
          description: { type: 'string', description: 'Report description' },
          format: {
            type: 'string',
            enum: ['pdf', 'html', 'csv', 'xlsx'],
            description: 'Output format',
          },
          parameters: {
            type: 'object',
            required: ['period', 'sections'],
            properties: {
              period: { type: 'string', description: 'Reporting period' },
              sections: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sections to include',
              },
              include_charts: { type: 'boolean' },
              include_evidence: { type: 'boolean' },
              include_lineage: { type: 'boolean' },
            },
          },
        },
      },
      response: {
        201: {
          description: 'Report created',
          type: 'object',
          properties: {
            report_id: { type: 'string' },
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
        400: {
          description: 'Invalid request',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: createReport,
  });

  /**
   * List reports
   */
  fastify.get('/companies/:id/reports', {
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Apply short cache (5 minutes) for dynamic reports list
      reply.header('Cache-Control', CACHE_CONTROL.SHORT);
    },
    schema: {
      description: 'List reports for company',
      tags: ['Reports'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0,
          },
          status: {
            type: 'string',
            enum: ['pending', 'generating', 'ready', 'failed'],
          },
        },
      },
      response: {
        200: {
          description: 'Reports list',
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  template_id: { type: 'string' },
                  title: { type: 'string' },
                  status: { type: 'string' },
                  format: { type: 'string' },
                  generated_at: { type: 'string', format: 'date-time' },
                  file_size: { type: 'number' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
                has_more: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: listReports,
  });

  /**
   * Get report details
   */
  fastify.get('/companies/:id/reports/:reportId', {
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Apply short cache (5 minutes) for report details
      reply.header('Cache-Control', CACHE_CONTROL.SHORT);
    },
    schema: {
      description: 'Get report details',
      tags: ['Reports'],
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
          description: 'Report details',
          type: 'object',
          properties: {
            id: { type: 'string' },
            template_id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string' },
            format: { type: 'string' },
            generated_at: { type: 'string', format: 'date-time' },
            file_url: { type: 'string' },
            file_size: { type: 'number' },
          },
        },
        404: {
          description: 'Report not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: getReport,
  });

  /**
   * Download report
   */
  fastify.get('/companies/:id/reports/:reportId/download', {
    schema: {
      description: 'Download report file',
      tags: ['Reports'],
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
          description: 'Report file',
          type: 'string',
          format: 'binary',
        },
        404: {
          description: 'Report not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        400: {
          description: 'Report not ready',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
    handler: downloadReport,
  });

  /**
   * Delete report
   */
  fastify.delete('/companies/:id/reports/:reportId', {
    schema: {
      description: 'Delete report',
      tags: ['Reports'],
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
          description: 'Report deleted',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: deleteReport,
  });
}

/**
 * Helper function to broadcast report updates via SSE
 */
export function broadcastReportUpdate(companyId: string, data: unknown): void {
  // Import and use SSE manager
  try {
    const { sseManager } = require('../sse/sseManager.js');
    sseManager.broadcast(companyId, 'report-updates', 'report-update', data);
  } catch (error) {
    console.error('[Reports] Failed to broadcast update:', error);
  }
}
