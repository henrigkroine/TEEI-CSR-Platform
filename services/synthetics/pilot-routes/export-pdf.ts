/**
 * Synthetic Monitor: PDF Export Functionality
 *
 * Monitors PDF export generation for pilot tenants
 * - Tests report PDF export endpoint
 * - Validates watermarking and evidence hashing
 * - Monitors export generation time (< 2s target)
 * - Verifies PDF file integrity
 *
 * Runs every 5 minutes for all pilot tenants
 * Alerts on 2 consecutive failures or file corruption
 *
 * @module synthetics/pilot-routes/export-pdf
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

export interface PDFExportMetrics {
  timestamp: number;
  tenantId: string;
  exportType: string;
  success: boolean;

  // Timing metrics
  exportGenerationTime: number;
  downloadTime: number;
  totalTime: number;

  // File metrics
  pdfGenerated: boolean;
  fileSize: number; // bytes
  contentHash: string;

  // Quality checks
  hasWatermark: boolean;
  hasEvidenceHash: boolean;
  hasMetadata: boolean;
  pdfValid: boolean;

  // Performance gate
  withinPerformanceGate: boolean; // < 2s

  error?: string;
}

const PERFORMANCE_GATE = {
  EXPORT_TIME: 2000, // 2 seconds
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  MIN_FILE_SIZE: 1024, // 1 KB
};

// Track consecutive failures
const failureCount = new Map<string, number>();

/**
 * Monitor PDF export for a single tenant
 */
export async function monitorPDFExport(
  tenantId: string,
  baseUrl: string,
  reportId: string,
  consecutiveFailureThreshold = 2
): Promise<PDFExportMetrics> {
  return traceAsync(
    'synthetic.pdf_export',
    async (_span) => {
      addSpanAttributes({
        'tenant.id': tenantId,
        'report.id': reportId,
        'monitor.route': 'pdf-export',
      });

      const timestamp = Date.now();
      let metrics: PDFExportMetrics = {
        timestamp,
        tenantId,
        exportType: 'report-pdf',
        success: false,
        exportGenerationTime: 0,
        downloadTime: 0,
        totalTime: 0,
        pdfGenerated: false,
        fileSize: 0,
        contentHash: '',
        hasWatermark: false,
        hasEvidenceHash: false,
        hasMetadata: false,
        pdfValid: false,
        withinPerformanceGate: false,
      };

      try {
        // Step 1: Request PDF export
        const exportStart = Date.now();
        const exportResponse = await axios.post(
          `${baseUrl}/api/reports/${reportId}/export/pdf`,
          {
            includeWatermark: true,
            includeEvidenceHash: true,
            format: 'a4',
          },
          {
            timeout: 10000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (exportResponse.status !== 200 && exportResponse.status !== 201) {
          throw new Error(`PDF export returned status ${exportResponse.status}`);
        }

        const exportEnd = Date.now();
        metrics.exportGenerationTime = exportEnd - exportStart;

        // Get download URL or job ID
        const exportData = exportResponse.data;
        const downloadUrl = exportData.downloadUrl || exportData.url;

        if (!downloadUrl) {
          throw new Error('No download URL returned from export API');
        }

        // Step 2: Download PDF file
        const downloadStart = Date.now();
        const pdfResponse = await axios.get(downloadUrl, {
          timeout: 5000,
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
          },
        });

        if (pdfResponse.status !== 200) {
          throw new Error(`PDF download returned status ${pdfResponse.status}`);
        }

        const downloadEnd = Date.now();
        metrics.downloadTime = downloadEnd - downloadStart;
        metrics.totalTime = downloadEnd - exportStart;

        // Step 3: Validate PDF file
        const pdfBuffer = Buffer.from(pdfResponse.data);
        metrics.fileSize = pdfBuffer.length;
        metrics.pdfGenerated = true;

        // Generate content hash
        const hash = crypto.createHash('sha256');
        hash.update(pdfBuffer);
        metrics.contentHash = hash.digest('hex');

        // Validate file size
        if (metrics.fileSize < PERFORMANCE_GATE.MIN_FILE_SIZE) {
          throw new Error(`PDF file too small: ${metrics.fileSize} bytes`);
        }

        if (metrics.fileSize > PERFORMANCE_GATE.MAX_FILE_SIZE) {
          console.warn(
            `⚠️  PDF file larger than expected: ${(metrics.fileSize / 1024 / 1024).toFixed(2)} MB`
          );
        }

        // Validate PDF header (magic bytes)
        const pdfHeader = pdfBuffer.slice(0, 5).toString('utf-8');
        metrics.pdfValid = pdfHeader === '%PDF-';

        if (!metrics.pdfValid) {
          throw new Error('Invalid PDF file format (missing PDF header)');
        }

        // Check for watermark and evidence hash markers
        // In real implementation, would parse PDF structure
        const pdfContent = pdfBuffer.toString('utf-8', 0, Math.min(10000, pdfBuffer.length));
        metrics.hasWatermark = pdfContent.includes('TEEI') || pdfContent.includes('Watermark');
        metrics.hasEvidenceHash = pdfContent.includes('Evidence') || pdfContent.includes('Hash');
        metrics.hasMetadata = pdfContent.includes('/Producer') || pdfContent.includes('/Creator');

        // Quality checks
        const qualityIssues: string[] = [];

        if (!metrics.hasWatermark) {
          qualityIssues.push('Watermark not detected');
        }

        if (!metrics.hasEvidenceHash) {
          qualityIssues.push('Evidence hash not detected');
        }

        if (!metrics.hasMetadata) {
          qualityIssues.push('PDF metadata missing');
        }

        if (qualityIssues.length > 0) {
          console.warn(`⚠️  PDF quality issues for ${tenantId}:`);
          qualityIssues.forEach((issue) => console.warn(`   - ${issue}`));

          addSpanAttributes({
            'monitor.quality_issues': qualityIssues.join(', '),
            'monitor.severity': 'warning',
          });
        }

        // Step 4: Check performance gate
        metrics.withinPerformanceGate = metrics.totalTime <= PERFORMANCE_GATE.EXPORT_TIME;

        if (!metrics.withinPerformanceGate) {
          console.warn(
            `⚠️  PDF export slow for ${tenantId}: ${metrics.totalTime}ms > ${PERFORMANCE_GATE.EXPORT_TIME}ms`
          );

          addSpanAttributes({
            'monitor.performance_gate_exceeded': true,
            'monitor.gate_ms': PERFORMANCE_GATE.EXPORT_TIME,
            'monitor.actual_ms': metrics.totalTime,
          });
        }

        // Mark success
        metrics.success = true;
        failureCount.set(tenantId, 0);

        // Record metrics to span
        addSpanAttributes({
          'monitor.success': true,
          'monitor.total_time_ms': metrics.totalTime,
          'monitor.export_time_ms': metrics.exportGenerationTime,
          'monitor.download_time_ms': metrics.downloadTime,
          'monitor.file_size_bytes': metrics.fileSize,
          'monitor.content_hash': metrics.contentHash.substring(0, 16),
          'monitor.pdf_valid': metrics.pdfValid,
          'monitor.has_watermark': metrics.hasWatermark,
          'monitor.has_evidence_hash': metrics.hasEvidenceHash,
          'monitor.within_gate': metrics.withinPerformanceGate,
        });

        const gateStatus = metrics.withinPerformanceGate ? '✅' : '⚠️';
        const sizeKB = (metrics.fileSize / 1024).toFixed(1);
        console.log(
          `${gateStatus} Tenant ${tenantId} PDF export: ${metrics.totalTime}ms, ${sizeKB} KB`
        );

        return metrics;
      } catch (error) {
        const errorMessage = error instanceof AxiosError
          ? `${error.message} (${error.code || error.response?.status})`
          : error instanceof Error
          ? error.message
          : 'Unknown error';

        metrics.error = errorMessage;
        metrics.success = false;

        // Track consecutive failures
        const currentFailures = (failureCount.get(tenantId) || 0) + 1;
        failureCount.set(tenantId, currentFailures);

        // Alert on threshold breach
        if (currentFailures >= consecutiveFailureThreshold) {
          console.error(
            `🚨 ALERT: Tenant ${tenantId} PDF export has ${currentFailures} consecutive failures!`
          );
          await sendAlert(tenantId, currentFailures, errorMessage);
        } else {
          console.error(
            `❌ Tenant ${tenantId} PDF export failed (${currentFailures}/${consecutiveFailureThreshold}): ${errorMessage}`
          );
        }

        // Record failure
        addSpanAttributes({
          'monitor.success': false,
          'monitor.error': errorMessage,
          'monitor.consecutive_failures': currentFailures,
        });

        return metrics;
      }
    },
    {
      'monitor.type': 'synthetic',
      'monitor.route': 'pdf-export',
      'monitor.interval_minutes': 5,
    }
  );
}

/**
 * Send alert notification
 */
async function sendAlert(
  tenantId: string,
  failureCount: number,
  error: string
): Promise<void> {
  const alertPayload = {
    timestamp: new Date().toISOString(),
    severity: 'critical',
    monitor: 'pdf-export',
    tenantId,
    consecutiveFailures: failureCount,
    error,
    actionRequired: 'Investigate PDF generation service and storage availability',
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor all pilot tenants
 */
export async function monitorAllPDFExports(): Promise<PDFExportMetrics[]> {
  const pilotTenants = [
    { id: 'acme-corp', url: 'https://acme.teei-platform.com', reportId: 'test-report-1' },
    { id: 'globex-inc', url: 'https://globex.teei-platform.com', reportId: 'test-report-2' },
    { id: 'initech-ltd', url: 'https://initech.teei-platform.com', reportId: 'test-report-3' },
  ];

  console.log(`🔍 Starting PDF export monitoring for ${pilotTenants.length} pilot tenants...`);

  const results = await Promise.allSettled(
    pilotTenants.map((tenant) => monitorPDFExport(tenant.id, tenant.url, tenant.reportId))
  );

  const metrics: PDFExportMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        tenantId: pilotTenants[index].id,
        exportType: 'report-pdf',
        success: false,
        exportGenerationTime: 0,
        downloadTime: 0,
        totalTime: 0,
        pdfGenerated: false,
        fileSize: 0,
        contentHash: '',
        hasWatermark: false,
        hasEvidenceHash: false,
        hasMetadata: false,
        pdfValid: false,
        withinPerformanceGate: false,
        error: result.reason?.message || 'Monitor execution failed',
      };
    }
  });

  // Aggregate stats
  const successCount = metrics.filter((m) => m.success).length;
  const gateCompliant = metrics.filter((m) => m.withinPerformanceGate).length;
  const avgExportTime = metrics.reduce((sum, m) => sum + m.totalTime, 0) / metrics.length;
  const avgFileSize = metrics.reduce((sum, m) => sum + m.fileSize, 0) / metrics.length;

  console.log(`📊 PDF Export Summary:`);
  console.log(`   - Total Tests: ${metrics.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Performance Gate Compliant: ${gateCompliant}/${metrics.length}`);
  console.log(`   - Avg Export Time: ${avgExportTime.toFixed(0)}ms`);
  console.log(`   - Avg File Size: ${(avgFileSize / 1024).toFixed(1)} KB`);

  return metrics;
}

/**
 * Scheduled monitor execution
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-pdf-export',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllPDFExports();
  console.log(`✓ PDF export monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('PDF export monitor failed:', error);
    process.exit(1);
  });
}
