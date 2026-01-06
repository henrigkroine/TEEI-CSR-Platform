/**
 * Export Routes
 *
 * Endpoints:
 * - GET /export/csrd - Export CSRD data (CSV/JSON)
 * - POST /export/pdf - Export report to PDF
 * - POST /export/pdf/batch - Batch export multiple reports to PDF
 * - GET /export/pdf/:reportId/preview - Preview PDF metadata
 *
 * @module routes/export
 */

import type { FastifyInstance } from 'fastify';
import { exportCSRD, exportPDF, previewPDF } from '../controllers/export.js';
import {
  getExportLogs,
  getExportStats,
  exportAuditLogsCSV,
  getExportLogsCount,
} from '../lib/exportAudit.js';

export async function exportRoutes(fastify: FastifyInstance) {
  /**
   * Export CSRD data (existing endpoint)
   */
  fastify.get('/export/csrd', {
    schema: {
      description: 'Export CSRD compliance data to CSV or JSON',
      tags: ['Export'],
      querystring: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['csv', 'json'],
            default: 'json',
            description: 'Export format',
          },
          period: {
            type: 'string',
            description: 'Period filter (e.g., 2024-Q1)',
          },
        },
      },
      response: {
        200: {
          description: 'Export successful',
          type: ['string', 'object'],
        },
        500: {
          description: 'Export failed',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: exportCSRD,
  });

  /**
   * Export report to PDF
   */
  fastify.post('/export/pdf', {
    schema: {
      description: 'Export a report or multiple reports to PDF with watermarking and charts',
      tags: ['Export'],
      body: {
        type: 'object',
        properties: {
          reportId: {
            type: 'string',
            description: 'Single report ID to export',
          },
          reportIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Multiple report IDs for batch export',
          },
          options: {
            type: 'object',
            properties: {
              includeCharts: {
                type: 'boolean',
                default: true,
                description: 'Include rendered charts',
              },
              includeCitations: {
                type: 'boolean',
                default: true,
                description: 'Include evidence citations',
              },
              includeTableOfContents: {
                type: 'boolean',
                default: true,
                description: 'Include table of contents',
              },
              watermark: {
                type: 'string',
                description: 'Custom watermark text',
              },
            },
          },
        },
        oneOf: [
          { required: ['reportId'] },
          { required: ['reportIds'] },
        ],
      },
      response: {
        200: {
          description: 'PDF file',
          type: 'string',
          format: 'binary',
          headers: {
            'Content-Type': { type: 'string', default: 'application/pdf' },
            'Content-Disposition': { type: 'string' },
            'X-PDF-Pages': { type: 'string', description: 'Number of pages in PDF' },
            'X-Render-Time': { type: 'string', description: 'Render time in milliseconds' },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          description: 'Export failed',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: exportPDF,
  });

  /**
   * Preview PDF metadata
   */
  fastify.get('/export/pdf/:reportId/preview', {
    schema: {
      description: 'Preview PDF metadata without generating the full PDF',
      tags: ['Export'],
      params: {
        type: 'object',
        required: ['reportId'],
        properties: {
          reportId: {
            type: 'string',
            description: 'Report ID to preview',
          },
        },
      },
      response: {
        200: {
          description: 'PDF metadata preview',
          type: 'object',
          properties: {
            reportId: { type: 'string' },
            estimatedPages: { type: 'number', description: 'Estimated page count' },
            estimatedSize: { type: 'number', description: 'Estimated size in bytes' },
            estimatedSizeFormatted: { type: 'string', description: 'Human-readable size' },
            chartCount: { type: 'number', description: 'Number of charts' },
            sectionCount: { type: 'number', description: 'Number of sections' },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          description: 'Preview failed',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: previewPDF,
  });

  /**
   * Get export audit logs
   */
  fastify.get('/export/audit', {
    schema: {
      description: 'Get export audit logs for compliance and security tracking',
      tags: ['Export', 'Audit'],
      querystring: {
        type: 'object',
        properties: {
          exportType: {
            type: 'string',
            enum: ['pdf', 'csv', 'json', 'ppt'],
            description: 'Filter by export type',
          },
          userId: {
            type: 'string',
            description: 'Filter by user ID',
          },
          reportId: {
            type: 'string',
            description: 'Filter by report ID',
          },
          status: {
            type: 'string',
            enum: ['initiated', 'success', 'failed'],
            description: 'Filter by status',
          },
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Start date for filtering',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'End date for filtering',
          },
          limit: {
            type: 'number',
            default: 100,
            description: 'Maximum number of results',
          },
          offset: {
            type: 'number',
            default: 0,
            description: 'Offset for pagination',
          },
        },
      },
      response: {
        200: {
          description: 'Export audit logs',
          type: 'object',
          properties: {
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  exportId: { type: 'string' },
                  tenantId: { type: 'string' },
                  userId: { type: 'string' },
                  userName: { type: 'string', description: 'Masked for privacy' },
                  exportType: { type: 'string', enum: ['pdf', 'csv', 'json', 'ppt'] },
                  reportId: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  ipAddress: { type: 'string', description: 'Masked for privacy' },
                  fileSize: { type: 'number' },
                  status: { type: 'string', enum: ['initiated', 'success', 'failed'] },
                  errorMessage: { type: 'string' },
                  renderTime: { type: 'number' },
                },
              },
            },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          description: 'Forbidden',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      // Get tenant ID from request (set by auth middleware)
      const tenantId = (request as any).user?.companyId;
      const userRole = (request as any).user?.role;

      if (!tenantId) {
        reply.code(400).send({ error: 'Tenant ID is required' });
        return;
      }

      // Only admins can view audit logs
      if (userRole !== 'admin' && userRole !== 'compliance_officer') {
        reply.code(403).send({ error: 'Insufficient permissions to view audit logs' });
        return;
      }

      const query = request.query as any;

      // Parse date filters
      const filters: any = {
        exportType: query.exportType,
        userId: query.userId,
        reportId: query.reportId,
        status: query.status,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: parseInt(query.limit || '100', 10),
        offset: parseInt(query.offset || '0', 10),
      };

      const logs = getExportLogs(tenantId, filters);
      const total = getExportLogsCount(tenantId, {
        exportType: filters.exportType,
        userId: filters.userId,
        reportId: filters.reportId,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      reply.code(200).send({
        total,
        limit: filters.limit,
        offset: filters.offset,
        logs,
      });
    },
  });

  /**
   * Get export statistics
   */
  fastify.get('/export/audit/stats', {
    schema: {
      description: 'Get export statistics for analytics and reporting',
      tags: ['Export', 'Audit', 'Analytics'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Period start date',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Period end date',
          },
        },
        required: ['startDate', 'endDate'],
      },
      response: {
        200: {
          description: 'Export statistics',
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            period: {
              type: 'object',
              properties: {
                from: { type: 'string', format: 'date-time' },
                to: { type: 'string', format: 'date-time' },
              },
            },
            total: { type: 'number' },
            byType: { type: 'object' },
            byStatus: { type: 'object' },
            byUser: { type: 'object' },
            successRate: { type: 'number' },
            averageFileSize: { type: 'number' },
            averageRenderTime: { type: 'number' },
            totalDataExported: { type: 'number' },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          description: 'Forbidden',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      // Get tenant ID from request (set by auth middleware)
      const tenantId = (request as any).user?.companyId;
      const userRole = (request as any).user?.role;

      if (!tenantId) {
        reply.code(400).send({ error: 'Tenant ID is required' });
        return;
      }

      // Only admins can view statistics
      if (userRole !== 'admin' && userRole !== 'compliance_officer') {
        reply.code(403).send({ error: 'Insufficient permissions to view statistics' });
        return;
      }

      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        reply.code(400).send({ error: 'startDate and endDate are required' });
        return;
      }

      const stats = getExportStats(tenantId, {
        from: new Date(query.startDate),
        to: new Date(query.endDate),
      });

      reply.code(200).send(stats);
    },
  });

  /**
   * Export audit logs to CSV
   */
  fastify.get('/export/audit/csv', {
    schema: {
      description: 'Export audit logs to CSV for compliance reporting',
      tags: ['Export', 'Audit', 'Compliance'],
      querystring: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date-time',
            description: 'Period start date',
          },
          endDate: {
            type: 'string',
            format: 'date-time',
            description: 'Period end date',
          },
        },
        required: ['startDate', 'endDate'],
      },
      response: {
        200: {
          description: 'CSV file with audit logs',
          type: 'string',
          headers: {
            'Content-Type': { type: 'string', default: 'text/csv' },
            'Content-Disposition': { type: 'string' },
          },
        },
        400: {
          description: 'Bad request',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        403: {
          description: 'Forbidden',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      // Get tenant ID from request (set by auth middleware)
      const tenantId = (request as any).user?.companyId;
      const userRole = (request as any).user?.role;

      if (!tenantId) {
        reply.code(400).send({ error: 'Tenant ID is required' });
        return;
      }

      // Only admins can export audit logs
      if (userRole !== 'admin' && userRole !== 'compliance_officer') {
        reply.code(403).send({ error: 'Insufficient permissions to export audit logs' });
        return;
      }

      const query = request.query as any;

      if (!query.startDate || !query.endDate) {
        reply.code(400).send({ error: 'startDate and endDate are required' });
        return;
      }

      const csv = exportAuditLogsCSV(tenantId, {
        from: new Date(query.startDate),
        to: new Date(query.endDate),
      });

      const fileName = `export_audit_${tenantId}_${query.startDate.split('T')[0]}_${query.endDate.split('T')[0]}.csv`;

      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .code(200)
        .send(csv);
    },
  });
}
