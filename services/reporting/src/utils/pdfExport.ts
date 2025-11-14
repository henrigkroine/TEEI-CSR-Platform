/**
 * PDF Export Utility
 *
 * Comprehensive PDF export pipeline that integrates:
 * - Chart rendering (server-side)
 * - PDF generation (Playwright)
 * - Watermarking (pdf-lib)
 * - Tenant-specific branding
 * - Headers/footers with metadata
 *
 * @module utils/pdfExport
 */

import type { WatermarkConfig } from '../types/approvals.js';
import type {
  GeneratedReport,
  PDFExportOptions,
  PDFExportRequest,
  PDFExportResponse,
  TenantConfig,
} from '../../types.js';
import { renderReportToPDF } from '../../utils/pdfRenderer.js';
import { watermarkPDF, watermarkPDFWithLogo, generateWatermarkText } from './watermark.js';
import { pool } from '../db/connection.js';

/**
 * Main PDF export function
 *
 * Complete pipeline:
 * 1. Fetch report data (if reportId provided)
 * 2. Fetch tenant configuration
 * 3. Render charts server-side
 * 4. Generate PDF from HTML
 * 5. Apply watermarks
 * 6. Add headers/footers
 * 7. Return PDF buffer
 *
 * @param request - PDF export request
 * @returns PDF export response with buffer
 */
export async function exportReportToPDF(
  request: PDFExportRequest
): Promise<PDFExportResponse & { buffer?: Buffer }> {
  const startTime = Date.now();

  try {
    // 1. Get or validate report data
    let report: GeneratedReport;
    if (request.reportId) {
      report = await fetchReportData(request.reportId);
    } else if (request.reportConfig) {
      report = request.reportConfig;
    } else {
      throw new Error('Either reportId or reportConfig must be provided');
    }

    // 2. Fetch tenant configuration
    const tenantConfig = await fetchTenantConfig(request.tenantId);

    // 3. Prepare PDF options with tenant branding
    const pdfOptions: PDFExportOptions = {
      ...request.options,
      theme: {
        logo: tenantConfig.logo,
        primaryColor: tenantConfig.primaryColor || '#6366f1',
        secondaryColor: tenantConfig.secondaryColor || '#8b5cf6',
      },
      tenantId: request.tenantId,
      tenantName: tenantConfig.name,
      includeCharts: request.options?.includeCharts !== false,
      includeCitations: request.options?.includeCitations !== false,
      includeTableOfContents: request.options?.includeTableOfContents !== false,
    };

    // 4. Generate PDF (includes chart rendering)
    console.log('[PDF Export] Rendering report to PDF...');
    const pdfResult = await renderReportToPDF(report, pdfOptions);

    // 5. Apply watermarks if configured
    let finalPdfBuffer = pdfResult.buffer;
    const watermarkConfig = await getWatermarkConfig(
      request.tenantId,
      tenantConfig,
      request.options?.watermark
    );

    if (watermarkConfig && watermarkConfig.enabled) {
      console.log('[PDF Export] Applying watermarks...');

      // Fetch logo buffer if needed
      let logoBuffer: Buffer | undefined;
      if (watermarkConfig.include_company_logo && tenantConfig.logo) {
        logoBuffer = await fetchLogoBuffer(tenantConfig.logo);
      }

      if (logoBuffer) {
        finalPdfBuffer = await watermarkPDFWithLogo(
          finalPdfBuffer,
          watermarkConfig,
          logoBuffer
        );
      } else {
        finalPdfBuffer = await watermarkPDF(finalPdfBuffer, watermarkConfig);
      }
    }

    // 6. Generate filename
    const fileName = generateFileName(report, tenantConfig.name);

    // 7. Calculate metrics
    const renderTime = Date.now() - startTime;

    console.log('[PDF Export] Export completed successfully:', {
      reportId: report.id,
      tenant: tenantConfig.name,
      fileSize: `${(finalPdfBuffer.length / 1024).toFixed(2)} KB`,
      pageCount: pdfResult.metadata.pageCount,
      renderTime: `${renderTime}ms`,
    });

    return {
      success: true,
      fileName,
      fileSize: finalPdfBuffer.length,
      pageCount: pdfResult.metadata.pageCount,
      renderTime,
      buffer: finalPdfBuffer,
    };
  } catch (error) {
    console.error('[PDF Export] Export failed:', error);
    return {
      success: false,
      error: error.message || 'PDF export failed',
    };
  }
}

/**
 * Fetch report data from database
 */
async function fetchReportData(reportId: string): Promise<GeneratedReport> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT
        r.id,
        r.company_id,
        r.title,
        r.parameters,
        r.generated_at,
        r.generated_by,
        c.name as company_name
      FROM reports r
      JOIN companies c ON c.id = r.company_id
      WHERE r.id = $1
    `;

    const result = await client.query(query, [reportId]);

    if (result.rows.length === 0) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const row = result.rows[0];

    // Fetch report sections
    const sectionsQuery = `
      SELECT
        rs.order,
        rs.title,
        rs.narrative,
        rs.charts,
        rs.citations
      FROM report_sections rs
      WHERE rs.report_id = $1
      ORDER BY rs.order ASC
    `;

    const sectionsResult = await client.query(sectionsQuery, [reportId]);

    return {
      id: row.id,
      reportType: row.parameters.report_type || 'quarterly',
      period: row.parameters.date_range
        ? {
            from: new Date(row.parameters.date_range.start),
            to: new Date(row.parameters.date_range.end),
          }
        : undefined,
      metadata: {
        companyName: row.company_name,
        companyId: row.company_id,
        generatedAt: row.generated_at,
        generatedBy: row.generated_by,
        reportTitle: row.title,
      },
      sections: sectionsResult.rows.map((s) => ({
        order: s.order,
        title: s.title,
        narrative: s.narrative,
        charts: s.charts,
        citations: s.citations,
      })),
    };
  } finally {
    client.release();
  }
}

/**
 * Fetch tenant configuration from database
 */
async function fetchTenantConfig(tenantId: string): Promise<TenantConfig> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT
        id,
        name,
        logo_url,
        primary_color,
        secondary_color,
        watermark_text,
        contact_email,
        website
      FROM companies
      WHERE id = $1 AND is_active = true
    `;

    const result = await client.query(query, [tenantId]);

    if (result.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      logo: row.logo_url,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      watermarkText: row.watermark_text,
      contactEmail: row.contact_email,
      website: row.website,
    };
  } finally {
    client.release();
  }
}

/**
 * Get watermark configuration
 */
async function getWatermarkConfig(
  tenantId: string,
  tenantConfig: TenantConfig,
  customWatermark?: string
): Promise<WatermarkConfig | null> {
  // Check if tenant has watermark enabled
  const client = await pool.connect();
  try {
    const query = `
      SELECT watermark_enabled, watermark_config
      FROM company_settings
      WHERE company_id = $1
    `;

    const result = await client.query(query, [tenantId]);

    if (result.rows.length === 0 || !result.rows[0].watermark_enabled) {
      return null;
    }

    const config = result.rows[0].watermark_config || {};

    return {
      enabled: true,
      text:
        customWatermark ||
        config.text ||
        tenantConfig.watermarkText ||
        `${tenantConfig.name} - Confidential`,
      position: config.position || 'footer',
      opacity: config.opacity || 0.3,
      font_size: config.font_size || 10,
      color: config.color || '#666666',
      include_timestamp: config.include_timestamp !== false,
      include_approver_name: config.include_approver_name || false,
      include_company_logo: config.include_company_logo || false,
    };
  } catch (error) {
    console.warn('[PDF Export] Failed to fetch watermark config:', error);
    // Return default watermark
    return {
      enabled: true,
      text: customWatermark || `${tenantConfig.name} - Confidential`,
      position: 'footer',
      opacity: 0.3,
      font_size: 10,
      color: '#666666',
      include_timestamp: true,
      include_approver_name: false,
      include_company_logo: false,
    };
  } finally {
    client.release();
  }
}

/**
 * Fetch logo buffer from URL or base64
 */
async function fetchLogoBuffer(logo: string): Promise<Buffer | undefined> {
  try {
    if (logo.startsWith('data:')) {
      // Base64 encoded image
      const base64Data = logo.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    } else if (logo.startsWith('http://') || logo.startsWith('https://')) {
      // Fetch from URL
      const response = await fetch(logo);
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      // Assume it's a local path (for development)
      const fs = await import('fs/promises');
      return await fs.readFile(logo);
    }
  } catch (error) {
    console.warn('[PDF Export] Failed to fetch logo:', error);
    return undefined;
  }
}

/**
 * Generate filename for PDF export
 */
function generateFileName(report: GeneratedReport, tenantName: string): string {
  const sanitizedTenant = tenantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const reportType = report.reportType || 'report';
  const timestamp = new Date().toISOString().split('T')[0];

  return `${sanitizedTenant}_${reportType}_${timestamp}.pdf`;
}

/**
 * Export multiple reports to a single PDF (batch export)
 */
export async function exportMultipleReportsToPDF(
  reportIds: string[],
  tenantId: string,
  options?: PDFExportOptions
): Promise<PDFExportResponse & { buffer?: Buffer }> {
  try {
    console.log('[PDF Export] Starting batch export:', {
      reportCount: reportIds.length,
      tenantId,
    });

    // Fetch tenant config once
    const tenantConfig = await fetchTenantConfig(tenantId);

    // Generate PDFs for each report
    const pdfBuffers: Buffer[] = [];
    for (const reportId of reportIds) {
      const result = await exportReportToPDF({
        reportId,
        tenantId,
        options,
      });

      if (result.success && result.buffer) {
        pdfBuffers.push(result.buffer);
      } else {
        console.warn(`[PDF Export] Failed to export report ${reportId}:`, result.error);
      }
    }

    if (pdfBuffers.length === 0) {
      throw new Error('No reports were successfully exported');
    }

    // Merge PDFs
    console.log('[PDF Export] Merging PDFs...');
    const mergedBuffer = await mergePDFs(pdfBuffers);

    // Apply watermark to merged PDF
    const watermarkConfig = await getWatermarkConfig(tenantId, tenantConfig, options?.watermark);
    let finalBuffer = mergedBuffer;

    if (watermarkConfig && watermarkConfig.enabled) {
      finalBuffer = await watermarkPDF(mergedBuffer, watermarkConfig);
    }

    return {
      success: true,
      fileName: `${tenantConfig.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_batch_${new Date().toISOString().split('T')[0]}.pdf`,
      fileSize: finalBuffer.length,
      buffer: finalBuffer,
    };
  } catch (error) {
    console.error('[PDF Export] Batch export failed:', error);
    return {
      success: false,
      error: error.message || 'Batch PDF export failed',
    };
  }
}

/**
 * Merge multiple PDF buffers into one
 */
async function mergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
  const { PDFDocument } = await import('pdf-lib');

  const mergedPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfBuffers) {
    const pdf = await PDFDocument.load(pdfBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  return Buffer.from(mergedPdfBytes);
}

/**
 * Preview PDF metadata without generating full PDF
 */
export async function previewPDFMetadata(
  reportId: string,
  tenantId: string
): Promise<{
  estimatedPages: number;
  estimatedSize: number;
  chartCount: number;
  sectionCount: number;
}> {
  const report = await fetchReportData(reportId);

  let chartCount = 0;
  if (report.sections) {
    for (const section of report.sections) {
      if (section.charts) {
        chartCount += section.charts.length;
      }
    }
  }

  // Estimate: ~50KB per page + ~100KB per chart
  const estimatedPages = Math.max(5, report.sections?.length || 0) + Math.ceil(chartCount / 2);
  const estimatedSize = estimatedPages * 50 * 1024 + chartCount * 100 * 1024;

  return {
    estimatedPages,
    estimatedSize,
    chartCount,
    sectionCount: report.sections?.length || 0,
  };
}
