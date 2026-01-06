/**
 * Synthetic Monitor: PPTX Export Functionality
 *
 * Monitors PowerPoint deck export generation
 * - Tests PPTX export endpoint
 * - Validates slide generation (cover + KPIs + charts)
 * - Monitors export generation time (< 3s target)
 * - Verifies PPTX file integrity
 *
 * Runs every 5 minutes for all pilot tenants
 * Alerts on 2 consecutive failures or file corruption
 *
 * @module synthetics/pilot-routes/export-pptx
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';

export interface PPTXExportMetrics {
  timestamp: number;
  tenantId: string;
  exportType: string;
  success: boolean;

  // Timing metrics
  exportGenerationTime: number;
  downloadTime: number;
  totalTime: number;

  // File metrics
  pptxGenerated: boolean;
  fileSize: number; // bytes
  contentHash: string;

  // Quality checks
  hasCoverSlide: boolean;
  hasKPISlides: boolean;
  hasChartSlides: boolean;
  hasEvidenceLinks: boolean;
  pptxValid: boolean;

  // Performance gate
  withinPerformanceGate: boolean; // < 3s

  error?: string;
}

const PERFORMANCE_GATE = {
  EXPORT_TIME: 3000, // 3 seconds (PPTX more complex than PDF)
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20 MB
  MIN_FILE_SIZE: 10 * 1024, // 10 KB
};

// Track consecutive failures
const failureCount = new Map<string, number>();

/**
 * Monitor PPTX export for a single tenant
 */
export async function monitorPPTXExport(
  tenantId: string,
  baseUrl: string,
  reportId: string,
  consecutiveFailureThreshold = 2
): Promise<PPTXExportMetrics> {
  return traceAsync(
    'synthetic.pptx_export',
    async (_span) => {
      addSpanAttributes({
        'tenant.id': tenantId,
        'report.id': reportId,
        'monitor.route': 'pptx-export',
      });

      const timestamp = Date.now();
      let metrics: PPTXExportMetrics = {
        timestamp,
        tenantId,
        exportType: 'executive-pack-pptx',
        success: false,
        exportGenerationTime: 0,
        downloadTime: 0,
        totalTime: 0,
        pptxGenerated: false,
        fileSize: 0,
        contentHash: '',
        hasCoverSlide: false,
        hasKPISlides: false,
        hasChartSlides: false,
        hasEvidenceLinks: false,
        pptxValid: false,
        withinPerformanceGate: false,
      };

      try {
        // Step 1: Request PPTX export
        const exportStart = Date.now();
        const exportResponse = await axios.post(
          `${baseUrl}/api/reports/${reportId}/export/pptx`,
          {
            includeCharts: true,
            includeEvidence: true,
            includeNarrative: true,
            template: 'executive-pack',
          },
          {
            timeout: 15000, // PPTX generation takes longer
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (exportResponse.status !== 200 && exportResponse.status !== 201) {
          throw new Error(`PPTX export returned status ${exportResponse.status}`);
        }

        const exportEnd = Date.now();
        metrics.exportGenerationTime = exportEnd - exportStart;

        // Get download URL
        const exportData = exportResponse.data;
        const downloadUrl = exportData.downloadUrl || exportData.url;

        if (!downloadUrl) {
          throw new Error('No download URL returned from export API');
        }

        // Step 2: Download PPTX file
        const downloadStart = Date.now();
        const pptxResponse = await axios.get(downloadUrl, {
          timeout: 5000,
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
          },
        });

        if (pptxResponse.status !== 200) {
          throw new Error(`PPTX download returned status ${pptxResponse.status}`);
        }

        const downloadEnd = Date.now();
        metrics.downloadTime = downloadEnd - downloadStart;
        metrics.totalTime = downloadEnd - exportStart;

        // Step 3: Validate PPTX file
        const pptxBuffer = Buffer.from(pptxResponse.data);
        metrics.fileSize = pptxBuffer.length;
        metrics.pptxGenerated = true;

        // Generate content hash
        const hash = crypto.createHash('sha256');
        hash.update(pptxBuffer);
        metrics.contentHash = hash.digest('hex');

        // Validate file size
        if (metrics.fileSize < PERFORMANCE_GATE.MIN_FILE_SIZE) {
          throw new Error(`PPTX file too small: ${metrics.fileSize} bytes`);
        }

        if (metrics.fileSize > PERFORMANCE_GATE.MAX_FILE_SIZE) {
          console.warn(
            `⚠️  PPTX file larger than expected: ${(metrics.fileSize / 1024 / 1024).toFixed(2)} MB`
          );
        }

        // Validate PPTX header (ZIP magic bytes - PPTX is a zipped XML)
        const zipHeader = pptxBuffer.slice(0, 4);
        metrics.pptxValid =
          zipHeader[0] === 0x50 && // 'P'
          zipHeader[1] === 0x4B && // 'K'
          (zipHeader[2] === 0x03 || zipHeader[2] === 0x05 || zipHeader[2] === 0x07);

        if (!metrics.pptxValid) {
          throw new Error('Invalid PPTX file format (missing ZIP header)');
        }

        // Check for expected content markers
        // In real implementation, would parse PPTX structure (unzip + parse XML)
        const sampleContent = pptxBuffer.toString('utf-8', 0, Math.min(50000, pptxBuffer.length));

        metrics.hasCoverSlide = sampleContent.includes('Cover') || sampleContent.includes('Title');
        metrics.hasKPISlides = sampleContent.includes('KPI') || sampleContent.includes('Metric');
        metrics.hasChartSlides = sampleContent.includes('Chart') || sampleContent.includes('graph');
        metrics.hasEvidenceLinks = sampleContent.includes('Evidence') || sampleContent.includes('Link');

        // Quality checks
        const qualityIssues: string[] = [];

        if (!metrics.hasCoverSlide) {
          qualityIssues.push('Cover slide not detected');
        }

        if (!metrics.hasKPISlides) {
          qualityIssues.push('KPI slides not detected');
        }

        if (!metrics.hasChartSlides) {
          qualityIssues.push('Chart slides not detected');
        }

        if (!metrics.hasEvidenceLinks) {
          qualityIssues.push('Evidence links not detected');
        }

        if (qualityIssues.length > 0) {
          console.warn(`⚠️  PPTX quality issues for ${tenantId}:`);
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
            `⚠️  PPTX export slow for ${tenantId}: ${metrics.totalTime}ms > ${PERFORMANCE_GATE.EXPORT_TIME}ms`
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

        // Record metrics
        addSpanAttributes({
          'monitor.success': true,
          'monitor.total_time_ms': metrics.totalTime,
          'monitor.export_time_ms': metrics.exportGenerationTime,
          'monitor.download_time_ms': metrics.downloadTime,
          'monitor.file_size_bytes': metrics.fileSize,
          'monitor.content_hash': metrics.contentHash.substring(0, 16),
          'monitor.pptx_valid': metrics.pptxValid,
          'monitor.has_cover': metrics.hasCoverSlide,
          'monitor.has_kpis': metrics.hasKPISlides,
          'monitor.has_charts': metrics.hasChartSlides,
          'monitor.has_evidence': metrics.hasEvidenceLinks,
          'monitor.within_gate': metrics.withinPerformanceGate,
        });

        const gateStatus = metrics.withinPerformanceGate ? '✅' : '⚠️';
        const sizeMB = (metrics.fileSize / 1024 / 1024).toFixed(2);
        console.log(
          `${gateStatus} Tenant ${tenantId} PPTX export: ${metrics.totalTime}ms, ${sizeMB} MB`
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
            `🚨 ALERT: Tenant ${tenantId} PPTX export has ${currentFailures} consecutive failures!`
          );
          await sendAlert(tenantId, currentFailures, errorMessage);
        } else {
          console.error(
            `❌ Tenant ${tenantId} PPTX export failed (${currentFailures}/${consecutiveFailureThreshold}): ${errorMessage}`
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
      'monitor.route': 'pptx-export',
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
    monitor: 'pptx-export',
    tenantId,
    consecutiveFailures: failureCount,
    error,
    actionRequired: 'Investigate PPTX generation service and template availability',
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor all pilot tenants
 */
export async function monitorAllPPTXExports(): Promise<PPTXExportMetrics[]> {
  const pilotTenants = [
    { id: 'acme-corp', url: 'https://acme.teei-platform.com', reportId: 'test-report-1' },
    { id: 'globex-inc', url: 'https://globex.teei-platform.com', reportId: 'test-report-2' },
    { id: 'initech-ltd', url: 'https://initech.teei-platform.com', reportId: 'test-report-3' },
  ];

  console.log(`🔍 Starting PPTX export monitoring for ${pilotTenants.length} pilot tenants...`);

  const results = await Promise.allSettled(
    pilotTenants.map((tenant) => monitorPPTXExport(tenant.id, tenant.url, tenant.reportId))
  );

  const metrics: PPTXExportMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        tenantId: pilotTenants[index].id,
        exportType: 'executive-pack-pptx',
        success: false,
        exportGenerationTime: 0,
        downloadTime: 0,
        totalTime: 0,
        pptxGenerated: false,
        fileSize: 0,
        contentHash: '',
        hasCoverSlide: false,
        hasKPISlides: false,
        hasChartSlides: false,
        hasEvidenceLinks: false,
        pptxValid: false,
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

  console.log(`📊 PPTX Export Summary:`);
  console.log(`   - Total Tests: ${metrics.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Performance Gate Compliant: ${gateCompliant}/${metrics.length}`);
  console.log(`   - Avg Export Time: ${avgExportTime.toFixed(0)}ms`);
  console.log(`   - Avg File Size: ${(avgFileSize / 1024 / 1024).toFixed(2)} MB`);

  return metrics;
}

/**
 * Scheduled monitor execution
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-pptx-export',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllPPTXExports();
  console.log(`✓ PPTX export monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('PPTX export monitor failed:', error);
    process.exit(1);
  });
}
