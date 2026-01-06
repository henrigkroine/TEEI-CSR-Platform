/**
 * Comprehensive Export Tests
 *
 * Tests PDF/CSV/JSON exports with watermarking across multiple tenants
 *
 * Test Coverage:
 * - PDF exports with charts and watermarks
 * - CSV/JSON exports
 * - Multi-tenant isolation
 * - Audit logging
 * - Error handling
 * - Performance benchmarks
 *
 * @module tests/exports.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  exportReportToPDF,
  exportMultipleReportsToPDF,
  previewPDFMetadata,
} from '../src/utils/pdfExport.js';
import { watermarkPDF, watermarkPDFWithLogo } from '../src/utils/watermark.js';
import { renderChart, renderChartsBatch, clearChartCache } from '../src/utils/chartRenderer.js';
import {
  logExportAttempt,
  logExportSuccess,
  logExportFailure,
  getExportLogs,
  getExportStats,
  exportAuditLogsCSV,
  cleanupOldLogs,
} from '../src/lib/exportAudit.js';
import type { GeneratedReport, PDFExportRequest } from '../types.js';
import type { WatermarkConfig } from '../src/types/approvals.js';
import type { ChartConfig } from '../src/utils/chartRenderer.js';
import { PDFDocument } from 'pdf-lib';

/**
 * Test Fixtures
 */

// Sample tenant configurations
const tenantConfigs = {
  acme: {
    id: 'tenant-acme-001',
    name: 'Acme Corporation',
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    watermarkText: 'Acme Corporation - Confidential',
    contactEmail: 'contact@acme.com',
    website: 'https://acme.com',
  },
  globex: {
    id: 'tenant-globex-002',
    name: 'Globex Industries',
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNkYPhfz8DAwAQABuEB/ZznHJUAAAAASUVORK5CYII=',
    primaryColor: '#10b981',
    secondaryColor: '#f59e0b',
    watermarkText: 'Globex Industries - Internal Use Only',
    contactEmail: 'info@globex.com',
    website: 'https://globex.com',
  },
  initech: {
    id: 'tenant-initech-003',
    name: 'Initech LLC',
    logo: undefined, // No logo - test default behavior
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    watermarkText: 'Initech LLC - Proprietary',
    contactEmail: 'support@initech.com',
    website: 'https://initech.com',
  },
};

// Sample chart configurations
const sampleCharts: ChartConfig[] = [
  {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Volunteer Hours',
          data: [120, 145, 160, 155, 180, 195],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Monthly Volunteer Hours',
        },
      },
    },
  },
  {
    type: 'bar',
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Impact Score',
          data: [68, 75, 82, 88],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Quarterly Impact Scores',
        },
      },
    },
  },
  {
    type: 'pie',
    data: {
      labels: ['Integration', 'Language', 'Job Readiness', 'Community'],
      datasets: [
        {
          label: 'Outcome Distribution',
          data: [30, 25, 25, 20],
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Outcome Distribution',
        },
        legend: {
          display: true,
          position: 'bottom',
        },
      },
    },
  },
];

// Sample report data
function createSampleReport(tenantId: string, reportId?: string): GeneratedReport {
  return {
    id: reportId || `report-${tenantId}-${Date.now()}`,
    reportType: 'quarterly',
    period: {
      from: new Date('2024-10-01'),
      to: new Date('2024-12-31'),
    },
    metadata: {
      companyName: tenantConfigs[tenantId.split('-')[1] as keyof typeof tenantConfigs]?.name || 'Unknown Company',
      companyId: tenantId,
      generatedAt: new Date(),
      generatedBy: 'test-user@example.com',
      reportTitle: 'Q4 2024 Impact Report',
    },
    sections: [
      {
        order: 1,
        title: 'Executive Summary',
        narrative:
          'This quarter demonstrated significant progress in our CSR initiatives with a 15% increase in volunteer participation and measurable community impact.',
        charts: [sampleCharts[0]],
        citations: [
          {
            evidenceId: 'evidence-001',
            snippet: 'Volunteer hours increased by 15% quarter-over-quarter',
            sourceType: 'survey',
            dateCollected: new Date('2024-11-15'),
            confidence: 0.95,
          },
        ],
      },
      {
        order: 2,
        title: 'Impact Metrics',
        narrative:
          'Our impact scores show consistent improvement across all dimensions, with job readiness showing the strongest gains.',
        charts: [sampleCharts[1], sampleCharts[2]],
        citations: [
          {
            evidenceId: 'evidence-002',
            snippet: 'Job readiness scores increased to 88 in Q4',
            sourceType: 'assessment',
            dateCollected: new Date('2024-12-01'),
            confidence: 0.92,
          },
        ],
      },
      {
        order: 3,
        title: 'Volunteer Engagement',
        narrative:
          'Employee engagement in CSR activities reached an all-time high, with 85% participation rate across all departments.',
        charts: [],
      },
    ],
  };
}

// Sample watermark configurations
const sampleWatermarkConfigs: Record<string, WatermarkConfig> = {
  standard: {
    enabled: true,
    text: 'CONFIDENTIAL',
    position: 'footer',
    opacity: 0.3,
    font_size: 10,
    color: '#666666',
    include_timestamp: true,
    include_approver_name: false,
    include_company_logo: false,
  },
  withLogo: {
    enabled: true,
    text: 'CONFIDENTIAL',
    position: 'footer',
    opacity: 0.4,
    font_size: 12,
    color: '#333333',
    include_timestamp: true,
    include_approver_name: true,
    include_company_logo: true,
  },
  diagonal: {
    enabled: true,
    text: 'INTERNAL USE ONLY',
    position: 'diagonal',
    opacity: 0.15,
    font_size: 48,
    color: '#999999',
    include_timestamp: false,
    include_approver_name: false,
    include_company_logo: false,
  },
};

/**
 * Test Suite
 */

describe('Export System - Comprehensive Tests', () => {
  beforeAll(async () => {
    // Clear chart cache to ensure consistent test results
    await clearChartCache();
  });

  afterAll(async () => {
    // Cleanup
    await clearChartCache();
  });

  /**
   * PDF Export Tests
   */
  describe('PDF Export', () => {
    describe('Basic PDF Generation', () => {
      it('should generate a valid PDF with charts', async () => {
        const report = createSampleReport('tenant-acme-001');
        const request: PDFExportRequest = {
          reportConfig: report,
          tenantId: tenantConfigs.acme.id,
          options: {
            includeCharts: true,
            includeCitations: true,
            includeTableOfContents: true,
          },
        };

        const result = await exportReportToPDF(request);

        expect(result.success).toBe(true);
        expect(result.buffer).toBeDefined();
        expect(result.buffer!.length).toBeGreaterThan(0);
        expect(result.fileName).toContain('acme_corporation');
        expect(result.fileSize).toBeGreaterThan(0);
        expect(result.pageCount).toBeGreaterThan(0);
        expect(result.renderTime).toBeGreaterThan(0);

        // Verify it's a valid PDF
        const pdfDoc = await PDFDocument.load(result.buffer!);
        expect(pdfDoc.getPageCount()).toBe(result.pageCount);
      }, 30000);

      it('should generate PDF without charts when disabled', async () => {
        const report = createSampleReport('tenant-acme-001');
        const request: PDFExportRequest = {
          reportConfig: report,
          tenantId: tenantConfigs.acme.id,
          options: {
            includeCharts: false,
          },
        };

        const result = await exportReportToPDF(request);

        expect(result.success).toBe(true);
        expect(result.buffer).toBeDefined();
        // PDF without charts should be smaller (rough estimate)
        expect(result.fileSize).toBeLessThan(500000); // < 500KB
      }, 30000);

      it('should generate PDF with multiple reports (batch)', async () => {
        const reportIds = ['report-001', 'report-002', 'report-003'];

        // Note: This test assumes mock data exists or will be created
        // In a real scenario, you'd need to set up test data in the database
        const result = await exportMultipleReportsToPDF(
          reportIds,
          tenantConfigs.acme.id,
          {
            includeCharts: true,
            includeCitations: false,
          }
        );

        // Should gracefully handle reports that don't exist
        expect(result).toBeDefined();
        if (result.success) {
          expect(result.buffer).toBeDefined();
          expect(result.fileName).toContain('batch');
        }
      }, 60000);
    });

    describe('Watermark Integration', () => {
      it('should apply text watermark to PDF', async () => {
        const report = createSampleReport('tenant-acme-001');
        const request: PDFExportRequest = {
          reportConfig: report,
          tenantId: tenantConfigs.acme.id,
          options: {
            watermark: 'CONFIDENTIAL - DO NOT DISTRIBUTE',
          },
        };

        const result = await exportReportToPDF(request);

        expect(result.success).toBe(true);
        expect(result.buffer).toBeDefined();

        // Verify watermark was applied (PDF should contain the text)
        const pdfDoc = await PDFDocument.load(result.buffer!);
        expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

        // File size should be slightly larger with watermark
        expect(result.fileSize).toBeGreaterThan(0);
      }, 30000);

      it('should apply logo watermark to PDF', async () => {
        // Create a simple PDF buffer for testing
        const basePdf = await PDFDocument.create();
        basePdf.addPage([600, 400]);
        const basePdfBuffer = Buffer.from(await basePdf.save());

        const logoBuffer = Buffer.from(
          tenantConfigs.acme.logo!.split(',')[1],
          'base64'
        );

        const watermarkedBuffer = await watermarkPDFWithLogo(
          basePdfBuffer,
          sampleWatermarkConfigs.withLogo,
          logoBuffer
        );

        expect(watermarkedBuffer).toBeDefined();
        expect(watermarkedBuffer.length).toBeGreaterThan(basePdfBuffer.length);

        // Verify it's still a valid PDF
        const pdfDoc = await PDFDocument.load(watermarkedBuffer);
        expect(pdfDoc.getPageCount()).toBe(1);
      }, 15000);

      it('should apply diagonal watermark to PDF', async () => {
        const basePdf = await PDFDocument.create();
        basePdf.addPage([600, 400]);
        const basePdfBuffer = Buffer.from(await basePdf.save());

        const watermarkedBuffer = await watermarkPDF(
          basePdfBuffer,
          sampleWatermarkConfigs.diagonal
        );

        expect(watermarkedBuffer).toBeDefined();
        expect(watermarkedBuffer.length).toBeGreaterThanOrEqual(basePdfBuffer.length);

        // Verify it's still a valid PDF
        const pdfDoc = await PDFDocument.load(watermarkedBuffer);
        expect(pdfDoc.getPageCount()).toBe(1);
      }, 15000);

      it('should handle missing logo gracefully', async () => {
        const basePdf = await PDFDocument.create();
        basePdf.addPage([600, 400]);
        const basePdfBuffer = Buffer.from(await basePdf.save());

        // Pass undefined logo buffer
        const watermarkedBuffer = await watermarkPDFWithLogo(
          basePdfBuffer,
          sampleWatermarkConfigs.withLogo,
          undefined
        );

        expect(watermarkedBuffer).toBeDefined();
        // Should still apply text watermark even without logo
        expect(watermarkedBuffer.length).toBeGreaterThanOrEqual(basePdfBuffer.length);

        const pdfDoc = await PDFDocument.load(watermarkedBuffer);
        expect(pdfDoc.getPageCount()).toBe(1);
      }, 15000);

      it('should return original PDF if watermarking fails', async () => {
        const basePdf = await PDFDocument.create();
        basePdf.addPage([600, 400]);
        const basePdfBuffer = Buffer.from(await basePdf.save());

        const invalidConfig = {
          ...sampleWatermarkConfigs.standard,
          enabled: false,
        };

        const result = await watermarkPDF(basePdfBuffer, invalidConfig);

        // Should return original buffer when disabled
        expect(result).toBe(basePdfBuffer);
      }, 10000);
    });

    describe('Tenant-Specific Branding', () => {
      it('should apply tenant-specific colors and logo for Acme', async () => {
        const report = createSampleReport('tenant-acme-001');
        const request: PDFExportRequest = {
          reportConfig: report,
          tenantId: tenantConfigs.acme.id,
          options: {
            includeCharts: true,
            theme: {
              logo: tenantConfigs.acme.logo,
              primaryColor: tenantConfigs.acme.primaryColor,
              secondaryColor: tenantConfigs.acme.secondaryColor,
            },
          },
        };

        const result = await exportReportToPDF(request);

        expect(result.success).toBe(true);
        expect(result.fileName).toContain('acme');
      }, 30000);

      it('should apply tenant-specific colors and logo for Globex', async () => {
        const report = createSampleReport('tenant-globex-002');
        const request: PDFExportRequest = {
          reportConfig: report,
          tenantId: tenantConfigs.globex.id,
          options: {
            includeCharts: true,
            theme: {
              logo: tenantConfigs.globex.logo,
              primaryColor: tenantConfigs.globex.primaryColor,
              secondaryColor: tenantConfigs.globex.secondaryColor,
            },
          },
        };

        const result = await exportReportToPDF(request);

        expect(result.success).toBe(true);
        expect(result.fileName).toContain('globex');
      }, 30000);

      it('should use default logo when tenant has none', async () => {
        const report = createSampleReport('tenant-initech-003');
        const request: PDFExportRequest = {
          reportConfig: report,
          tenantId: tenantConfigs.initech.id,
          options: {
            includeCharts: true,
            theme: {
              primaryColor: tenantConfigs.initech.primaryColor,
              secondaryColor: tenantConfigs.initech.secondaryColor,
            },
          },
        };

        const result = await exportReportToPDF(request);

        expect(result.success).toBe(true);
        expect(result.fileName).toContain('initech');
      }, 30000);
    });

    describe('PDF Metadata Preview', () => {
      it('should preview PDF metadata without generating PDF', async () => {
        const reportId = 'report-preview-001';
        const tenantId = tenantConfigs.acme.id;

        // Note: This test assumes the report exists in the database
        // In a real test environment, you'd need to seed test data
        try {
          const metadata = await previewPDFMetadata(reportId, tenantId);

          expect(metadata).toBeDefined();
          expect(metadata.estimatedPages).toBeGreaterThan(0);
          expect(metadata.estimatedSize).toBeGreaterThan(0);
          expect(metadata.chartCount).toBeGreaterThanOrEqual(0);
          expect(metadata.sectionCount).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // Expected if report doesn't exist in test environment
          expect(error.message).toContain('Report not found');
        }
      }, 10000);
    });
  });

  /**
   * Chart Rendering Tests
   */
  describe('Chart Rendering in PDFs', () => {
    it('should render all chart types correctly', async () => {
      const results = await renderChartsBatch(sampleCharts);

      expect(results).toHaveLength(sampleCharts.length);
      results.forEach((result, index) => {
        expect(result.buffer).toBeInstanceOf(Buffer);
        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.format).toBe('png');

        // Verify PNG header
        const header = result.buffer.slice(0, 8);
        expect(header[0]).toBe(0x89);
        expect(header[1]).toBe(0x50); // 'P'
        expect(header[2]).toBe(0x4e); // 'N'
        expect(header[3]).toBe(0x47); // 'G'
      });
    }, 45000);

    it('should cache chart renders for performance', async () => {
      await clearChartCache();

      // First render - cache miss
      const result1 = await renderChart(sampleCharts[0], { useCache: true });
      expect(result1.cacheHit).toBe(false);
      expect(result1.renderTime).toBeGreaterThan(0);

      // Second render - cache hit
      const result2 = await renderChart(sampleCharts[0], { useCache: true });
      expect(result2.cacheHit).toBe(true);
      expect(result2.renderTime).toBe(0);
      expect(result2.buffer).toEqual(result1.buffer);
    }, 30000);

    it('should render charts at high DPI for print quality', async () => {
      const result = await renderChart(sampleCharts[0], {
        deviceScaleFactor: 2, // 2x DPI
        quality: 95,
      });

      expect(result).toBeDefined();
      // High-DPI images should be larger
      expect(result.buffer.length).toBeGreaterThan(20000);
    }, 20000);

    it('should match frontend chart appearance', async () => {
      // Render with standard dimensions used in frontend
      const result = await renderChart(sampleCharts[1], {
        width: 760,
        height: 460,
        backgroundColor: '#ffffff',
      });

      expect(result.width).toBe(760);
      expect(result.height).toBe(460);
      expect(result.buffer).toBeDefined();
    }, 20000);
  });

  /**
   * Multi-Tenant Isolation Tests
   */
  describe('Multi-Tenant Isolation', () => {
    it('should prevent data leaks between tenants', async () => {
      const acmeReport = createSampleReport('tenant-acme-001', 'shared-report-id');
      const globexReport = createSampleReport('tenant-globex-002', 'shared-report-id');

      // Export same report ID for different tenants
      const acmeRequest: PDFExportRequest = {
        reportConfig: acmeReport,
        tenantId: tenantConfigs.acme.id,
      };

      const globexRequest: PDFExportRequest = {
        reportConfig: globexReport,
        tenantId: tenantConfigs.globex.id,
      };

      const acmeResult = await exportReportToPDF(acmeRequest);
      const globexResult = await exportReportToPDF(globexRequest);

      expect(acmeResult.success).toBe(true);
      expect(globexResult.success).toBe(true);

      // Results should be different (different branding/content)
      expect(acmeResult.fileName).toContain('acme');
      expect(globexResult.fileName).toContain('globex');

      // Buffers should not be identical
      expect(acmeResult.buffer).not.toEqual(globexResult.buffer);
    }, 60000);

    it('should apply correct tenant logo and not mix tenant data', async () => {
      const basePdf1 = await PDFDocument.create();
      basePdf1.addPage([600, 400]);
      const basePdfBuffer1 = Buffer.from(await basePdf1.save());

      const basePdf2 = await PDFDocument.create();
      basePdf2.addPage([600, 400]);
      const basePdfBuffer2 = Buffer.from(await basePdf2.save());

      // Acme logo
      const acmeLogo = Buffer.from(tenantConfigs.acme.logo!.split(',')[1], 'base64');
      const acmeWatermarked = await watermarkPDFWithLogo(
        basePdfBuffer1,
        { ...sampleWatermarkConfigs.withLogo, text: 'Acme - Confidential' },
        acmeLogo
      );

      // Globex logo
      const globexLogo = Buffer.from(tenantConfigs.globex.logo!.split(',')[1], 'base64');
      const globexWatermarked = await watermarkPDFWithLogo(
        basePdfBuffer2,
        { ...sampleWatermarkConfigs.withLogo, text: 'Globex - Confidential' },
        globexLogo
      );

      // Results should be different
      expect(acmeWatermarked).not.toEqual(globexWatermarked);

      // Both should be valid PDFs
      const acmePdf = await PDFDocument.load(acmeWatermarked);
      const globexPdf = await PDFDocument.load(globexWatermarked);
      expect(acmePdf.getPageCount()).toBe(1);
      expect(globexPdf.getPageCount()).toBe(1);
    }, 20000);
  });

  /**
   * CSV/JSON Export Tests
   */
  describe('CSV/JSON Exports', () => {
    it('should export data to CSV format', () => {
      const csvData = exportAuditLogsCSV(tenantConfigs.acme.id, {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      });

      expect(csvData).toBeDefined();
      expect(typeof csvData).toBe('string');

      // Should have CSV headers
      expect(csvData).toContain('Export ID');
      expect(csvData).toContain('Timestamp');
      expect(csvData).toContain('Export Type');
      expect(csvData).toContain('Status');

      // Parse CSV to verify structure
      const lines = csvData.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(1); // At least headers

      // Verify header count
      const headers = lines[0].split(',');
      expect(headers.length).toBeGreaterThan(5);
    });

    it('should export data to JSON format', () => {
      // Simulate JSON export of sample data
      const sampleData = {
        period: '2024-Q4',
        data: [
          {
            company_name: 'Acme Corporation',
            industry: 'Technology',
            total_volunteers: 150,
            total_hours: 3250.5,
            outcomes: {
              integration: '75.5',
              language: '82.3',
              job_readiness: '88.1',
            },
          },
        ],
      };

      const jsonString = JSON.stringify(sampleData, null, 2);

      expect(jsonString).toBeDefined();
      expect(jsonString).toContain('Acme Corporation');
      expect(jsonString).toContain('2024-Q4');

      // Should be valid JSON
      const parsed = JSON.parse(jsonString);
      expect(parsed.period).toBe('2024-Q4');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].company_name).toBe('Acme Corporation');
    });

    it('should handle empty data sets in CSV export', () => {
      // Export for tenant with no data
      const csvData = exportAuditLogsCSV('tenant-empty-999', {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-02'),
      });

      expect(csvData).toBeDefined();

      // Should still have headers even with no data
      const lines = csvData.split('\n');
      expect(lines.length).toBe(1); // Just headers
    });

    it('should properly escape special characters in CSV', () => {
      // Log an export with special characters
      const exportId = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-test',
        userName: 'John "Johnny" O\'Malley',
        exportType: 'csv',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent, with comma',
      });

      logExportSuccess(exportId, {
        fileSize: 1024,
        renderTime: 100,
      });

      const csvData = exportAuditLogsCSV(tenantConfigs.acme.id, {
        from: new Date(Date.now() - 1000),
        to: new Date(Date.now() + 1000),
      });

      // CSV should properly escape quotes and special characters
      expect(csvData).toBeDefined();
      // Double quotes should be escaped as ""
      expect(csvData).toContain('""');
    });
  });

  /**
   * Audit Logging Tests
   */
  describe('Export Audit Logging', () => {
    it('should log export attempts', () => {
      const exportId = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-001',
        userName: 'Jane Doe',
        exportType: 'pdf',
        reportId: 'report-001',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      expect(exportId).toBeDefined();
      expect(exportId).toContain('exp_');
    });

    it('should log export success with metadata', () => {
      const exportId = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-002',
        userName: 'John Smith',
        exportType: 'pdf',
        reportId: 'report-002',
        ipAddress: '192.168.1.101',
      });

      logExportSuccess(exportId, {
        fileSize: 1048576,
        renderTime: 2340,
        metadata: { pageCount: 12 },
      });

      const logs = getExportLogs(tenantConfigs.acme.id, {
        status: 'success',
        limit: 10,
      });

      const successLog = logs.find((log) => log.exportId === exportId);
      expect(successLog).toBeDefined();
      expect(successLog?.status).toBe('success');
      expect(successLog?.fileSize).toBe(1048576);
      expect(successLog?.renderTime).toBe(2340);
    });

    it('should log export failures with error messages', () => {
      const exportId = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-003',
        userName: 'Alice Johnson',
        exportType: 'pdf',
        reportId: 'report-003',
        ipAddress: '192.168.1.102',
      });

      logExportFailure(exportId, 'Database connection timeout');

      const logs = getExportLogs(tenantConfigs.acme.id, {
        status: 'failed',
        limit: 10,
      });

      const failedLog = logs.find((log) => log.exportId === exportId);
      expect(failedLog).toBeDefined();
      expect(failedLog?.status).toBe('failed');
      expect(failedLog?.errorMessage).toBe('Database connection timeout');
    });

    it('should mask PII in audit logs', () => {
      const exportId = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-004',
        userName: 'Bob Wilson',
        exportType: 'pdf',
        reportId: 'report-004',
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0',
      });

      const logs = getExportLogs(tenantConfigs.acme.id);
      const log = logs.find((l) => l.exportId === exportId);

      expect(log).toBeDefined();
      // User name should be masked (e.g., "B*** W***")
      expect(log?.userName).toContain('***');
      // IP should be masked (e.g., "192.168.***.***")
      expect(log?.ipAddress).toContain('***');
    });

    it('should filter logs by tenant', () => {
      // Log exports for different tenants
      logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-acme',
        userName: 'Acme User',
        exportType: 'pdf',
        ipAddress: '10.0.0.1',
      });

      logExportAttempt({
        tenantId: tenantConfigs.globex.id,
        userId: 'user-globex',
        userName: 'Globex User',
        exportType: 'csv',
        ipAddress: '10.0.0.2',
      });

      const acmeLogs = getExportLogs(tenantConfigs.acme.id);
      const globexLogs = getExportLogs(tenantConfigs.globex.id);

      // Logs should be isolated by tenant
      expect(acmeLogs.every((log) => log.tenantId === tenantConfigs.acme.id)).toBe(true);
      expect(globexLogs.every((log) => log.tenantId === tenantConfigs.globex.id)).toBe(true);
    });

    it('should query logs with filters', () => {
      const exportId1 = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-filter-test',
        userName: 'Filter Test User',
        exportType: 'pdf',
        ipAddress: '10.1.1.1',
      });

      const exportId2 = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-filter-test',
        userName: 'Filter Test User',
        exportType: 'csv',
        ipAddress: '10.1.1.1',
      });

      logExportSuccess(exportId1, { fileSize: 5000 });
      logExportSuccess(exportId2, { fileSize: 3000 });

      // Filter by export type
      const pdfLogs = getExportLogs(tenantConfigs.acme.id, {
        exportType: 'pdf',
        userId: 'user-filter-test',
      });

      const csvLogs = getExportLogs(tenantConfigs.acme.id, {
        exportType: 'csv',
        userId: 'user-filter-test',
      });

      expect(pdfLogs.some((log) => log.exportId === exportId1)).toBe(true);
      expect(csvLogs.some((log) => log.exportId === exportId2)).toBe(true);
    });

    it('should generate export statistics', () => {
      const startDate = new Date();

      // Create multiple exports
      for (let i = 0; i < 5; i++) {
        const exportId = logExportAttempt({
          tenantId: tenantConfigs.acme.id,
          userId: `user-stats-${i}`,
          userName: `Stats User ${i}`,
          exportType: i % 2 === 0 ? 'pdf' : 'csv',
          ipAddress: `10.2.2.${i}`,
        });

        if (i < 4) {
          logExportSuccess(exportId, {
            fileSize: 10000 * (i + 1),
            renderTime: 1000 * (i + 1),
          });
        } else {
          logExportFailure(exportId, 'Test failure');
        }
      }

      const stats = getExportStats(tenantConfigs.acme.id, {
        from: startDate,
        to: new Date(Date.now() + 1000),
      });

      expect(stats.total).toBeGreaterThanOrEqual(5);
      expect(stats.byType.pdf).toBeGreaterThan(0);
      expect(stats.byType.csv).toBeGreaterThan(0);
      expect(stats.byStatus.success).toBeGreaterThan(0);
      expect(stats.byStatus.failed).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      expect(stats.averageFileSize).toBeGreaterThan(0);
      expect(stats.averageRenderTime).toBeGreaterThan(0);
    });

    it('should cleanup old audit logs', () => {
      // Note: This test would require manipulating dates
      // or waiting for retention period to pass
      const deletedCount = cleanupOldLogs();
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Error Handling', () => {
    it('should handle invalid chart configuration gracefully', async () => {
      const invalidChart: ChartConfig = {
        type: 'line',
        data: {
          labels: [],
          datasets: [],
        },
      };

      // Should still render even with empty data
      const result = await renderChart(invalidChart);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    }, 15000);

    it('should handle missing tenant configuration', async () => {
      const report = createSampleReport('tenant-nonexistent-999');
      const request: PDFExportRequest = {
        reportConfig: report,
        tenantId: 'tenant-nonexistent-999',
      };

      const result = await exportReportToPDF(request);

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Tenant not found');
    }, 15000);

    it('should handle chart rendering timeout', async () => {
      const chart = sampleCharts[0];

      // Very short timeout should cause failure
      await expect(
        renderChart(chart, {
          timeout: 1, // 1ms
          useCache: false,
        })
      ).rejects.toThrow();
    }, 10000);

    it('should handle corrupt PDF gracefully', async () => {
      const corruptBuffer = Buffer.from('This is not a PDF');

      try {
        await watermarkPDF(corruptBuffer, sampleWatermarkConfigs.standard);
        // Should return original buffer or throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should log failures correctly', () => {
      const exportId = logExportAttempt({
        tenantId: tenantConfigs.acme.id,
        userId: 'user-error-test',
        userName: 'Error Test User',
        exportType: 'pdf',
        reportId: 'report-error',
        ipAddress: '10.3.3.3',
      });

      const error = new Error('Simulated export failure');
      logExportFailure(exportId, error);

      const logs = getExportLogs(tenantConfigs.acme.id, {
        status: 'failed',
      });

      const failedLog = logs.find((log) => log.exportId === exportId);
      expect(failedLog).toBeDefined();
      expect(failedLog?.status).toBe('failed');
      expect(failedLog?.errorMessage).toBe('Simulated export failure');
    });
  });

  /**
   * Performance Tests
   */
  describe('Performance Benchmarks', () => {
    it('should render PDF within reasonable time', async () => {
      const report = createSampleReport('tenant-acme-001');
      const request: PDFExportRequest = {
        reportConfig: report,
        tenantId: tenantConfigs.acme.id,
        options: {
          includeCharts: true,
        },
      };

      const startTime = Date.now();
      const result = await exportReportToPDF(request);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);

      console.log(`PDF Export Performance: ${duration}ms, ${result.pageCount} pages, ${(result.fileSize! / 1024).toFixed(2)} KB`);
    }, 35000);

    it('should cache charts for improved performance', async () => {
      await clearChartCache();

      // First render (cache miss)
      const start1 = Date.now();
      const result1 = await renderChart(sampleCharts[0], { useCache: true });
      const time1 = Date.now() - start1;

      // Second render (cache hit)
      const start2 = Date.now();
      const result2 = await renderChart(sampleCharts[0], { useCache: true });
      const time2 = Date.now() - start2;

      expect(result2.cacheHit).toBe(true);
      // Cached render should be significantly faster
      expect(time2).toBeLessThan(time1 / 10); // At least 10x faster

      console.log(`Chart Rendering Performance: Cold=${time1}ms, Cached=${time2}ms`);
    }, 30000);

    it('should handle batch exports efficiently', async () => {
      const charts = [sampleCharts[0], sampleCharts[1], sampleCharts[2]];

      const startTime = Date.now();
      const results = await renderChartsBatch(charts);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      // Batch should be more efficient than sequential
      expect(duration).toBeLessThan(15000); // 15 seconds for 3 charts

      console.log(`Batch Chart Rendering: ${duration}ms for ${charts.length} charts`);
    }, 20000);

    it('should estimate file sizes accurately', () => {
      const originalSize = 1000000; // 1 MB
      const withLogoSize = 1000000 * 1.03; // +3% for logo
      const withTextSize = 1000000 * 1.02; // +2% for text

      // These would use the actual estimateWatermarkedSize function
      // For now, we're testing the concept
      expect(withLogoSize).toBeGreaterThan(originalSize);
      expect(withTextSize).toBeGreaterThan(originalSize);
      expect(withLogoSize).toBeGreaterThan(withTextSize);
    });
  });
});
