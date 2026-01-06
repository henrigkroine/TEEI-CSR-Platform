import type { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';
import {
  exportReportToPDF,
  exportMultipleReportsToPDF,
  previewPDFMetadata,
} from '../utils/pdfExport.js';
import type { PDFExportRequest } from '../../types.js';
import {
  logExportAttempt,
  logExportSuccess,
  logExportFailure,
} from '../lib/exportAudit.js';

interface ExportQuery {
  format?: 'csv' | 'json';
  period?: string;
}

interface PDFExportBody {
  reportId?: string;
  reportIds?: string[];
  options?: {
    includeCharts?: boolean;
    includeCitations?: boolean;
    includeTableOfContents?: boolean;
    watermark?: string;
  };
}

export async function exportCSRD(
  request: FastifyRequest<{ Querystring: ExportQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { format = 'json', period } = request.query;

  // Get user info from request (set by auth middleware)
  const userId = (request as any).user?.id || 'anonymous';
  const userName = (request as any).user?.name || (request as any).user?.email || 'Anonymous User';
  const tenantId = (request as any).user?.companyId || 'unknown';
  const ipAddress = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  const userAgent = request.headers['user-agent'];

  // Log export attempt
  const exportId = logExportAttempt({
    tenantId,
    userId,
    userName,
    exportType: format === 'csv' ? 'csv' : 'json',
    ipAddress: ipAddress as string,
    userAgent,
    metadata: { period },
  });

  const client = await pool.connect();
  try {
    // Fetch comprehensive CSRD data
    const query = period
      ? `
        SELECT
          c.name as company_name,
          c.industry,
          COUNT(DISTINCT v.id) as total_volunteers,
          COALESCE(SUM(vh.hours), 0) as total_hours,
          AVG(os.score) FILTER (WHERE os.dimension = 'integration') as avg_integration,
          AVG(os.score) FILTER (WHERE os.dimension = 'language') as avg_language,
          AVG(os.score) FILTER (WHERE os.dimension = 'job_readiness') as avg_job_readiness
        FROM companies c
        LEFT JOIN volunteers v ON v.company_id = c.id AND v.is_active = true
        LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
          AND EXTRACT(YEAR FROM vh.session_date) = ${period.split('-Q')[0]}
          AND EXTRACT(QUARTER FROM vh.session_date) = ${period.split('-Q')[1]}
        LEFT JOIN outcome_scores os ON os.company_id = c.id AND os.quarter = '${period}'
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.industry
        ORDER BY c.name;
      `
      : `
        SELECT
          c.name as company_name,
          c.industry,
          COUNT(DISTINCT v.id) as total_volunteers,
          COALESCE(SUM(vh.hours), 0) as total_hours,
          AVG(os.score) FILTER (WHERE os.dimension = 'integration') as avg_integration,
          AVG(os.score) FILTER (WHERE os.dimension = 'language') as avg_language,
          AVG(os.score) FILTER (WHERE os.dimension = 'job_readiness') as avg_job_readiness
        FROM companies c
        LEFT JOIN volunteers v ON v.company_id = c.id AND v.is_active = true
        LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
        LEFT JOIN outcome_scores os ON os.company_id = c.id
        WHERE c.is_active = true
        GROUP BY c.id, c.name, c.industry
        ORDER BY c.name;
      `;

    const result = await client.query(query);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Company Name',
        'Industry',
        'Total Volunteers',
        'Total Hours',
        'Avg Integration',
        'Avg Language',
        'Avg Job Readiness',
      ];
      const csvRows = [headers.join(',')];

      for (const row of result.rows) {
        const csvRow = [
          `"${row.company_name}"`,
          `"${row.industry || 'N/A'}"`,
          row.total_volunteers,
          parseFloat(row.total_hours).toFixed(2),
          row.avg_integration ? parseFloat(row.avg_integration).toFixed(2) : 'N/A',
          row.avg_language ? parseFloat(row.avg_language).toFixed(2) : 'N/A',
          row.avg_job_readiness ? parseFloat(row.avg_job_readiness).toFixed(2) : 'N/A',
        ];
        csvRows.push(csvRow.join(','));
      }

      const csv = csvRows.join('\n');

      // Log success
      logExportSuccess(exportId, {
        fileSize: Buffer.byteLength(csv, 'utf-8'),
        metadata: { rowCount: result.rows.length, period },
      });

      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="csrd_export_${period || 'all-time'}.csv"`)
        .code(200)
        .send(csv);
    } else {
      // JSON format
      const data = result.rows.map((row) => ({
        company_name: row.company_name,
        industry: row.industry,
        total_volunteers: parseInt(row.total_volunteers, 10),
        total_hours: parseFloat(row.total_hours),
        outcomes: {
          integration: row.avg_integration ? parseFloat(row.avg_integration).toFixed(2) : null,
          language: row.avg_language ? parseFloat(row.avg_language).toFixed(2) : null,
          job_readiness: row.avg_job_readiness ? parseFloat(row.avg_job_readiness).toFixed(2) : null,
        },
      }));

      const jsonString = JSON.stringify({ period: period || 'all-time', data });

      // Log success
      logExportSuccess(exportId, {
        fileSize: Buffer.byteLength(jsonString, 'utf-8'),
        metadata: { rowCount: result.rows.length, period },
      });

      reply
        .header('Content-Type', 'application/json')
        .header(
          'Content-Disposition',
          `attachment; filename="csrd_export_${period || 'all-time'}.json"`
        )
        .code(200)
        .send({ period: period || 'all-time', data });
    }
  } catch (error) {
    request.log.error(error);

    // Log failure
    logExportFailure(exportId, error);

    reply.code(500).send({ error: 'Failed to export CSRD data' });
  } finally {
    client.release();
  }
}

/**
 * Export report to PDF
 *
 * POST /reporting/export/pdf
 *
 * Request body:
 * {
 *   "reportId": "uuid", // Required if reportIds not provided
 *   "reportIds": ["uuid1", "uuid2"], // Optional: batch export
 *   "options": {
 *     "includeCharts": true,
 *     "includeCitations": true,
 *     "includeTableOfContents": true,
 *     "watermark": "Custom watermark text"
 *   }
 * }
 *
 * Response:
 * - Content-Type: application/pdf
 * - Content-Disposition: attachment; filename="report.pdf"
 */
export async function exportPDF(
  request: FastifyRequest<{ Body: PDFExportBody }>,
  reply: FastifyReply
): Promise<void> {
  // Get user info from request (set by auth middleware)
  const userId = (request as any).user?.id || 'anonymous';
  const userName = (request as any).user?.name || (request as any).user?.email || 'Anonymous User';
  const tenantId = (request as any).user?.companyId || request.body.reportId;
  const ipAddress = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  const userAgent = request.headers['user-agent'];

  if (!tenantId) {
    reply.code(400).send({ error: 'Tenant ID is required' });
    return;
  }

  // Log export attempt
  const exportId = logExportAttempt({
    tenantId,
    userId,
    userName,
    exportType: 'pdf',
    reportId: request.body.reportId,
    reportIds: request.body.reportIds,
    ipAddress: ipAddress as string,
    userAgent,
    metadata: { options: request.body.options },
  });

  try {

    // Batch export
    if (request.body.reportIds && request.body.reportIds.length > 0) {
      request.log.info(`[PDF Export] Batch export requested: ${request.body.reportIds.length} reports`);

      const result = await exportMultipleReportsToPDF(
        request.body.reportIds,
        tenantId,
        request.body.options
      );

      if (!result.success || !result.buffer) {
        // Log failure
        logExportFailure(exportId, result.error || 'PDF export failed');
        reply.code(500).send({ error: result.error || 'PDF export failed' });
        return;
      }

      // Log success
      logExportSuccess(exportId, {
        fileSize: result.fileSize || result.buffer.length,
        renderTime: result.renderTime,
        metadata: {
          pageCount: result.pageCount,
          reportCount: request.body.reportIds.length,
        },
      });

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${result.fileName}"`)
        .header('X-PDF-Pages', result.pageCount?.toString() || '0')
        .header('X-Render-Time', result.renderTime?.toString() || '0')
        .code(200)
        .send(result.buffer);

      return;
    }

    // Single report export
    if (!request.body.reportId) {
      reply.code(400).send({ error: 'reportId or reportIds is required' });
      return;
    }

    request.log.info(`[PDF Export] Single export requested: ${request.body.reportId}`);

    const exportRequest: PDFExportRequest = {
      reportId: request.body.reportId,
      tenantId,
      options: request.body.options,
    };

    const result = await exportReportToPDF(exportRequest);

    if (!result.success || !result.buffer) {
      // Log failure
      logExportFailure(exportId, result.error || 'PDF export failed');
      reply.code(500).send({ error: result.error || 'PDF export failed' });
      return;
    }

    // Log success
    logExportSuccess(exportId, {
      fileSize: result.fileSize || result.buffer.length,
      renderTime: result.renderTime,
      metadata: {
        pageCount: result.pageCount,
        fileName: result.fileName,
      },
    });

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${result.fileName}"`)
      .header('X-PDF-Pages', result.pageCount?.toString() || '0')
      .header('X-Render-Time', result.renderTime?.toString() || '0')
      .code(200)
      .send(result.buffer);
  } catch (error) {
    request.log.error('[PDF Export] Error:', error);

    // Log failure
    logExportFailure(exportId, error);

    reply.code(500).send({ error: 'Failed to export PDF' });
  }
}

/**
 * Preview PDF metadata
 *
 * GET /reporting/export/pdf/:reportId/preview
 *
 * Response:
 * {
 *   "estimatedPages": 12,
 *   "estimatedSize": 1048576,
 *   "chartCount": 5,
 *   "sectionCount": 8
 * }
 */
export async function previewPDF(
  request: FastifyRequest<{ Params: { reportId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { reportId } = request.params;
    const tenantId = (request as any).user?.companyId || reportId;

    if (!tenantId) {
      reply.code(400).send({ error: 'Tenant ID is required' });
      return;
    }

    request.log.info(`[PDF Export] Preview requested: ${reportId}`);

    const metadata = await previewPDFMetadata(reportId, tenantId);

    reply.code(200).send({
      reportId,
      ...metadata,
      estimatedSizeFormatted: `${(metadata.estimatedSize / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (error) {
    request.log.error('[PDF Export] Preview error:', error);
    reply.code(500).send({ error: 'Failed to preview PDF' });
  }
}
