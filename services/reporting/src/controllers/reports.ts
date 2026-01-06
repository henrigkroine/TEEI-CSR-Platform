/**
 * Reports Controller
 *
 * Handles report generation, status tracking, and downloads
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  Report,
  ReportStatus,
  CreateReportRequest,
  ReportGenerationProgress,
  ReportTemplate,
} from '../types/reports.js';
import { REPORT_TEMPLATES } from '../types/reports.js';
import { broadcastReportUpdate } from '../routes/sse.js';

/**
 * Get available report templates
 *
 * GET /companies/:id/reports/templates
 */
export async function getReportTemplates(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    return reply.send({
      templates: REPORT_TEMPLATES,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'TEMPLATES_FETCH_FAILED',
      message: 'Failed to fetch report templates',
    });
  }
}

/**
 * Create new report
 *
 * POST /companies/:id/reports
 */
export async function createReport(
  request: FastifyRequest<{
    Params: { id: string };
    Body: Omit<CreateReportRequest, 'company_id'>;
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;
  const { template_id, title, description, format, parameters } = request.body;

  try {
    // Validate template exists
    const template = REPORT_TEMPLATES.find((t) => t.id === template_id);
    if (!template) {
      return reply.status(400).send({
        error: 'INVALID_TEMPLATE',
        message: 'Invalid template ID',
      });
    }

    // Create report record
    const reportId = `report-${companyId}-${Date.now()}`;
    const report: Report = {
      id: reportId,
      company_id: companyId,
      template_id,
      title,
      description,
      status: 'pending' as ReportStatus,
      format,
      parameters,
      generated_by: 'user-id-placeholder', // TODO: Get from auth
      created_at: new Date(),
      updated_at: new Date(),
    };

    // TODO: Store in database
    // await db.reports.insert(report);

    // Start async report generation
    startReportGeneration(report).catch((error) => {
      request.log.error(`Report generation failed for ${reportId}:`, error);
    });

    return reply.status(201).send({
      report_id: reportId,
      status: 'pending',
      message: 'Report generation started',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'REPORT_CREATE_FAILED',
      message: 'Failed to create report',
    });
  }
}

/**
 * Get report status and details
 *
 * GET /companies/:id/reports/:reportId
 */
export async function getReport(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;

  try {
    // TODO: Fetch from database
    const report = getMockReport(reportId, companyId);

    if (!report) {
      return reply.status(404).send({
        error: 'REPORT_NOT_FOUND',
        message: 'Report not found',
      });
    }

    return reply.send(report);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'REPORT_FETCH_FAILED',
      message: 'Failed to fetch report',
    });
  }
}

/**
 * List reports for company
 *
 * GET /companies/:id/reports
 */
export async function listReports(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { limit?: number; offset?: number; status?: ReportStatus };
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;
  const { limit = 50, offset = 0, status } = request.query;

  try {
    // TODO: Fetch from database with filters
    const reports = getMockReports(companyId, status);

    const paginated = reports.slice(offset, offset + limit);

    return reply.send({
      data: paginated,
      pagination: {
        total: reports.length,
        limit,
        offset,
        has_more: offset + limit < reports.length,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'REPORTS_FETCH_FAILED',
      message: 'Failed to fetch reports',
    });
  }
}

/**
 * Download report file
 *
 * GET /companies/:id/reports/:reportId/download
 */
export async function downloadReport(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;

  try {
    // TODO: Fetch report from database and stream file
    const report = getMockReport(reportId, companyId);

    if (!report) {
      return reply.status(404).send({
        error: 'REPORT_NOT_FOUND',
        message: 'Report not found',
      });
    }

    if (report.status !== 'ready') {
      return reply.status(400).send({
        error: 'REPORT_NOT_READY',
        message: 'Report is not ready for download',
        status: report.status,
      });
    }

    // TODO: Stream actual file
    // For now, return mock PDF data
    const filename = `${report.title.replace(/\s+/g, '_')}.${report.format}`;

    return reply
      .header('Content-Type', getContentType(report.format))
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(Buffer.from('Mock report content'));
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'DOWNLOAD_FAILED',
      message: 'Failed to download report',
    });
  }
}

/**
 * Delete report
 *
 * DELETE /companies/:id/reports/:reportId
 */
export async function deleteReport(
  request: FastifyRequest<{
    Params: { id: string; reportId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, reportId } = request.params;

  try {
    // TODO: Delete from database and file storage
    // await db.reports.delete(reportId);

    return reply.send({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'DELETE_FAILED',
      message: 'Failed to delete report',
    });
  }
}

/**
 * Start async report generation
 */
async function startReportGeneration(report: Report): Promise<void> {
  // Simulate report generation with progress updates
  const steps = [
    { progress: 10, status: 'Collecting data...' },
    { progress: 30, status: 'Calculating metrics...' },
    { progress: 50, status: 'Generating sections...' },
    { progress: 70, status: 'Rendering charts...' },
    { progress: 90, status: 'Creating PDF...' },
    { progress: 100, status: 'Finalizing...' },
  ];

  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update report status
    report.status = step.progress === 100 ? 'ready' : 'generating';

    // Broadcast progress via SSE
    broadcastReportUpdate(report.company_id, {
      report_id: report.id,
      status: report.status,
      progress: step.progress,
      current_step: step.status,
    });
  }

  // Mark as complete
  report.status = 'ready';
  report.generated_at = new Date();
  report.file_url = `/api/companies/${report.company_id}/reports/${report.id}/download`;
  report.file_size = 1024 * 512; // Mock 512KB

  // TODO: Store updated report in database
  // await db.reports.update(report);

  // Final notification
  broadcastReportUpdate(report.company_id, {
    report_id: report.id,
    status: 'ready',
    progress: 100,
  });
}

/**
 * Helper: Get content type for format
 */
function getContentType(format: string): string {
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    html: 'text/html',
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return types[format] || 'application/octet-stream';
}

/**
 * Mock data functions (replace with real DB queries)
 */
function getMockReport(reportId: string, companyId: string): Report | null {
  // Mock report data
  return {
    id: reportId,
    company_id: companyId,
    template_id: 'executive-summary',
    title: 'Executive Summary - Q4 2024',
    description: 'High-level overview of social impact metrics',
    status: 'ready',
    format: 'pdf',
    parameters: {
      period: '2024-Q4',
      sections: ['cover', 'at-a-glance', 'sroi'],
      include_charts: true,
      include_evidence: false,
      include_lineage: false,
    },
    generated_at: new Date(),
    generated_by: 'user-123',
    file_url: `/api/companies/${companyId}/reports/${reportId}/download`,
    file_size: 1024 * 512,
    created_at: new Date(Date.now() - 3600000),
    updated_at: new Date(),
  };
}

function getMockReports(companyId: string, status?: ReportStatus): Report[] {
  const now = new Date();
  const reports: Report[] = [
    {
      id: `report-${companyId}-1`,
      company_id: companyId,
      template_id: 'executive-summary',
      title: 'Executive Summary - Q4 2024',
      status: 'ready',
      format: 'pdf',
      parameters: {
        period: '2024-Q4',
        sections: ['cover', 'at-a-glance', 'sroi'],
        include_charts: true,
        include_evidence: false,
        include_lineage: false,
      },
      generated_at: new Date(now.getTime() - 86400000),
      generated_by: 'user-123',
      file_url: `/api/companies/${companyId}/reports/report-${companyId}-1/download`,
      file_size: 1024 * 512,
      created_at: new Date(now.getTime() - 86400000),
      updated_at: new Date(now.getTime() - 86400000),
    },
    {
      id: `report-${companyId}-2`,
      company_id: companyId,
      template_id: 'detailed-impact',
      title: 'Detailed Impact Report - Q3 2024',
      status: 'ready',
      format: 'pdf',
      parameters: {
        period: '2024-Q3',
        sections: ['cover', 'executive-summary', 'methodology', 'sroi-detailed', 'vis-detailed'],
        include_charts: true,
        include_evidence: true,
        include_lineage: true,
      },
      generated_at: new Date(now.getTime() - 604800000),
      generated_by: 'user-123',
      file_url: `/api/companies/${companyId}/reports/report-${companyId}-2/download`,
      file_size: 1024 * 1024 * 2,
      created_at: new Date(now.getTime() - 604800000),
      updated_at: new Date(now.getTime() - 604800000),
    },
    {
      id: `report-${companyId}-3`,
      company_id: companyId,
      template_id: 'stakeholder-briefing',
      title: 'Stakeholder Briefing - 2024',
      status: 'generating',
      format: 'pdf',
      parameters: {
        period: '2024',
        sections: ['cover', 'narrative', 'key-achievements', 'social-value'],
        include_charts: true,
        include_evidence: false,
        include_lineage: false,
      },
      generated_by: 'user-123',
      created_at: new Date(now.getTime() - 300000),
      updated_at: new Date(now.getTime() - 60000),
    },
  ];

  if (status) {
    return reports.filter((r) => r.status === status);
  }

  return reports;
}
