/**
 * PDF Watermarking Integration Examples
 *
 * Demonstrates how to integrate the watermarking system
 * with the reporting service export functionality
 *
 * @module examples/watermarkingIntegration
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  applyComprehensiveWatermark,
  getWatermarkTemplate,
  customizeWatermarkTemplate,
  generatePlaywrightHeaderTemplate,
  generatePlaywrightFooterTemplate,
  type TenantWatermarkConfig,
  type WatermarkMetadata,
} from '../src/utils/pdfWatermark.js';
import { chromium } from 'playwright';

// ============================================================================
// Example 1: Watermark an existing PDF export
// ============================================================================

interface ExportPDFRequest {
  Params: {
    report_id: string;
  };
  Querystring: {
    watermark?: 'minimal' | 'standard' | 'confidential';
  };
}

export async function exportPDFWithWatermark(
  request: FastifyRequest<ExportPDFRequest>,
  reply: FastifyReply
): Promise<void> {
  const { report_id } = request.params;
  const { watermark = 'standard' } = request.query;

  try {
    // 1. Fetch the original PDF (from database or storage)
    const originalPdf = await fetchReportPDF(report_id);

    // 2. Get tenant configuration
    const tenantConfig = await getTenantWatermarkConfig(request.user.tenant_id);

    // 3. Build metadata
    const metadata: WatermarkMetadata = {
      company_name: tenantConfig.company_name,
      export_date: new Date(),
      export_user: request.user.name,
      export_user_email: request.user.email,
      report_title: await getReportTitle(report_id),
      report_period: await getReportPeriod(report_id),
    };

    // 4. Apply watermark template
    const watermarkedPdf = await applyComprehensiveWatermark(
      originalPdf,
      tenantConfig,
      metadata
    );

    // 5. Send response
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="report-${report_id}-watermarked.pdf"`)
      .send(watermarkedPdf);
  } catch (error) {
    request.log.error(error, 'Failed to export watermarked PDF');
    reply.code(500).send({ error: 'Failed to export PDF with watermark' });
  }
}

// ============================================================================
// Example 2: Generate PDF with watermark using Playwright
// ============================================================================

export async function generateWatermarkedReport(
  reportHtml: string,
  tenantConfig: TenantWatermarkConfig,
  metadata: WatermarkMetadata
): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // Set content
    await page.setContent(reportHtml, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Generate watermarked PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      displayHeaderFooter: true,
      headerTemplate: generatePlaywrightHeaderTemplate(tenantConfig, metadata),
      footerTemplate: generatePlaywrightFooterTemplate(tenantConfig, metadata),
      preferCSSPageSize: false,
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// ============================================================================
// Example 3: Batch watermarking for multiple reports
// ============================================================================

interface BatchWatermarkRequest {
  report_ids: string[];
  watermark_template: 'minimal' | 'standard' | 'confidential';
}

export async function batchWatermarkReports(
  request: FastifyRequest<{ Body: BatchWatermarkRequest }>,
  reply: FastifyReply
): Promise<void> {
  const { report_ids, watermark_template } = request.body;

  try {
    // Get tenant config once
    const tenantConfig = await getTenantWatermarkConfig(request.user.tenant_id);

    // Process all reports in parallel
    const results = await Promise.all(
      report_ids.map(async (report_id) => {
        const originalPdf = await fetchReportPDF(report_id);

        const metadata: WatermarkMetadata = {
          company_name: tenantConfig.company_name,
          export_date: new Date(),
          export_user: request.user.name,
          report_title: await getReportTitle(report_id),
        };

        const watermarkedPdf = await applyComprehensiveWatermark(
          originalPdf,
          tenantConfig,
          metadata
        );

        // Save to storage
        const storageUrl = await saveWatermarkedPDF(report_id, watermarkedPdf);

        return {
          report_id,
          status: 'success',
          url: storageUrl,
        };
      })
    );

    reply.send({
      success: true,
      watermarked_count: results.length,
      results,
    });
  } catch (error) {
    request.log.error(error, 'Batch watermarking failed');
    reply.code(500).send({ error: 'Batch watermarking failed' });
  }
}

// ============================================================================
// Example 4: Custom watermark configuration per export
// ============================================================================

interface CustomWatermarkRequest {
  Params: {
    report_id: string;
  };
  Body: {
    confidential?: boolean;
    confidential_text?: string;
    include_metadata?: boolean;
    footer_text?: string;
  };
}

export async function exportWithCustomWatermark(
  request: FastifyRequest<CustomWatermarkRequest>,
  reply: FastifyReply
): Promise<void> {
  const { report_id } = request.params;
  const customOptions = request.body;

  try {
    // Get base tenant config
    const baseTenantConfig = await getTenantWatermarkConfig(request.user.tenant_id);

    // Apply custom overrides
    const customConfig = {
      ...baseTenantConfig,
      confidential_mark: customOptions.confidential ?? baseTenantConfig.confidential_mark,
      confidential_text: customOptions.confidential_text ?? baseTenantConfig.confidential_text,
      include_export_metadata: customOptions.include_metadata ?? baseTenantConfig.include_export_metadata,
      custom_footer_text: customOptions.footer_text ?? baseTenantConfig.custom_footer_text,
    };

    const originalPdf = await fetchReportPDF(report_id);

    const metadata: WatermarkMetadata = {
      company_name: customConfig.company_name,
      export_date: new Date(),
      export_user: request.user.name,
      export_user_email: request.user.email,
      report_title: await getReportTitle(report_id),
    };

    const watermarkedPdf = await applyComprehensiveWatermark(
      originalPdf,
      customConfig,
      metadata
    );

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="report-${report_id}-custom.pdf"`)
      .send(watermarkedPdf);
  } catch (error) {
    request.log.error(error, 'Custom watermarking failed');
    reply.code(500).send({ error: 'Failed to apply custom watermark' });
  }
}

// ============================================================================
// Example 5: Watermarking with approval workflow
// ============================================================================

interface ApprovalWatermarkRequest {
  Params: {
    report_id: string;
  };
}

export async function watermarkApprovedReport(
  request: FastifyRequest<ApprovalWatermarkRequest>,
  reply: FastifyReply
): Promise<void> {
  const { report_id } = request.params;

  try {
    // Check approval status
    const approval = await getReportApproval(report_id);

    if (approval.status !== 'approved' && approval.status !== 'locked') {
      reply.code(400).send({
        error: 'Report must be approved before watermarking',
      });
      return;
    }

    // Get tenant config with compliance template
    const tenantConfig = getWatermarkTemplate(
      'compliance',
      request.user.tenant_id,
      approval.company_name,
      approval.logo_url
    );

    // Add approval metadata
    const metadata: WatermarkMetadata = {
      company_name: approval.company_name,
      export_date: new Date(),
      export_user: `${approval.approver_name} (Approved)`,
      export_user_email: approval.approver_email,
      report_title: approval.report_title,
      report_period: approval.report_period,
    };

    const originalPdf = await fetchReportPDF(report_id);

    const watermarkedPdf = await applyComprehensiveWatermark(
      originalPdf,
      tenantConfig,
      metadata
    );

    // Save as approved version
    const approvedUrl = await saveApprovedPDF(report_id, watermarkedPdf);

    reply.send({
      success: true,
      report_id,
      approval_status: approval.status,
      approved_pdf_url: approvedUrl,
      approved_by: approval.approver_name,
      approved_at: approval.approved_at,
    });
  } catch (error) {
    request.log.error(error, 'Approval watermarking failed');
    reply.code(500).send({ error: 'Failed to watermark approved report' });
  }
}

// ============================================================================
// Example 6: Scheduled report with automatic watermarking
// ============================================================================

export async function generateScheduledReport(
  scheduleId: string,
  reportConfig: any
): Promise<void> {
  try {
    // 1. Generate report HTML
    const reportHtml = await generateReportHTML(reportConfig);

    // 2. Get tenant watermark config
    const tenantConfig = await getTenantWatermarkConfig(reportConfig.tenant_id);

    // 3. Build metadata
    const metadata: WatermarkMetadata = {
      company_name: tenantConfig.company_name,
      export_date: new Date(),
      export_user: 'Automated Report System',
      report_title: reportConfig.title,
      report_period: reportConfig.period,
    };

    // 4. Generate watermarked PDF
    const pdfBuffer = await generateWatermarkedReport(
      reportHtml,
      tenantConfig,
      metadata
    );

    // 5. Save and notify
    const reportUrl = await saveScheduledReport(scheduleId, pdfBuffer);
    await notifyReportReady(reportConfig.recipients, reportUrl);

    console.log(`[Scheduled Report] Generated and watermarked: ${scheduleId}`);
  } catch (error) {
    console.error(`[Scheduled Report] Failed for ${scheduleId}:`, error);
    throw error;
  }
}

// ============================================================================
// Helper Functions (Mock implementations for examples)
// ============================================================================

async function fetchReportPDF(report_id: string): Promise<Buffer> {
  // Mock: Fetch PDF from database or storage
  // In production: SELECT file_data FROM reports WHERE id = report_id
  throw new Error('Not implemented - replace with actual storage fetch');
}

async function getTenantWatermarkConfig(tenant_id: string): Promise<TenantWatermarkConfig> {
  // Mock: Fetch from database
  // In production: SELECT * FROM tenant_watermark_configs WHERE tenant_id = tenant_id
  return {
    tenant_id,
    company_name: 'Example Corp',
    logo_url: 'https://example.com/logo.png',
    logo_position: 'header',
    primary_color: '#6366f1',
    confidential_mark: false,
    include_export_metadata: true,
    page_numbering: true,
  };
}

async function getReportTitle(report_id: string): Promise<string> {
  // Mock: Fetch report title
  return 'Impact Report';
}

async function getReportPeriod(report_id: string): Promise<string> {
  // Mock: Fetch report period
  return '2024-Q3';
}

async function saveWatermarkedPDF(report_id: string, pdfBuffer: Buffer): Promise<string> {
  // Mock: Save to storage and return URL
  return `https://storage.example.com/reports/${report_id}-watermarked.pdf`;
}

async function getReportApproval(report_id: string): Promise<any> {
  // Mock: Fetch approval data
  return {
    status: 'approved',
    company_name: 'Example Corp',
    logo_url: 'https://example.com/logo.png',
    approver_name: 'Jane Doe',
    approver_email: 'jane@example.com',
    report_title: 'Q3 Impact Report',
    report_period: '2024-Q3',
    approved_at: new Date(),
  };
}

async function saveApprovedPDF(report_id: string, pdfBuffer: Buffer): Promise<string> {
  // Mock: Save approved PDF
  return `https://storage.example.com/reports/${report_id}-approved.pdf`;
}

async function generateReportHTML(config: any): Promise<string> {
  // Mock: Generate report HTML
  return '<html><body><h1>Report</h1></body></html>';
}

async function saveScheduledReport(schedule_id: string, pdfBuffer: Buffer): Promise<string> {
  // Mock: Save scheduled report
  return `https://storage.example.com/scheduled/${schedule_id}.pdf`;
}

async function notifyReportReady(recipients: string[], reportUrl: string): Promise<void> {
  // Mock: Send notifications
  console.log(`Notified ${recipients.length} recipients about ${reportUrl}`);
}
