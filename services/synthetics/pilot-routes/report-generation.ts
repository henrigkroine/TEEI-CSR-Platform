/**
 * Synthetic Monitor: AI Report Generation
 *
 * Monitors AI-powered report generation endpoint for pilot tenants
 * - Tests report generation API responsiveness
 * - Validates Q2Q pipeline execution
 * - Monitors narrative generation quality
 * - Tracks generation time (< 2s for cached, < 10s for fresh)
 *
 * Runs every 5 minutes for all pilot tenants
 * Alerts on 2 consecutive failures or timeout issues
 *
 * @module synthetics/pilot-routes/report-generation
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';

export interface ReportGenerationMetrics {
  timestamp: number;
  tenantId: string;
  reportType: string;
  success: boolean;

  // Timing metrics
  totalGenerationTime: number;
  q2qProcessingTime: number;
  narrativeGenerationTime: number;
  dataAggregationTime: number;

  // Quality metrics
  reportGenerated: boolean;
  narrativeWordCount: number;
  evidenceCount: number;
  confidenceScore: number;

  // Performance gates
  withinPerformanceGate: boolean; // < 2s cached, < 10s fresh

  error?: string;
}

export interface ReportRequest {
  type: 'executive-summary' | 'impact-analysis' | 'governance-report' | 'sroi-analysis';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
}

const PERFORMANCE_GATES = {
  CACHED_REPORT: 2000, // 2 seconds
  FRESH_REPORT: 10000, // 10 seconds
  Q2Q_PROCESSING: 3000, // 3 seconds
  NARRATIVE_GENERATION: 5000, // 5 seconds
};

// Track consecutive failures
const failureCount = new Map<string, number>();

/**
 * Monitor report generation for a single tenant
 */
export async function monitorReportGeneration(
  tenantId: string,
  baseUrl: string,
  reportRequest: ReportRequest,
  consecutiveFailureThreshold = 2
): Promise<ReportGenerationMetrics> {
  return traceAsync(
    'synthetic.report_generation',
    async (span) => {
      addSpanAttributes({
        'tenant.id': tenantId,
        'report.type': reportRequest.type,
        'monitor.route': 'report-generation',
      });

      const timestamp = Date.now();
      let metrics: ReportGenerationMetrics = {
        timestamp,
        tenantId,
        reportType: reportRequest.type,
        success: false,
        totalGenerationTime: 0,
        q2qProcessingTime: 0,
        narrativeGenerationTime: 0,
        dataAggregationTime: 0,
        reportGenerated: false,
        narrativeWordCount: 0,
        evidenceCount: 0,
        confidenceScore: 0,
        withinPerformanceGate: false,
      };

      try {
        // Step 1: Initiate report generation
        const generationStart = Date.now();
        const response = await axios.post(
          `${baseUrl}/api/reports/generate`,
          reportRequest,
          {
            timeout: 15000, // 15 seconds max (allowing for fresh generation)
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json',
              'X-Synthetic-Monitor': 'true',
            },
          }
        );

        const generationEnd = Date.now();
        metrics.totalGenerationTime = generationEnd - generationStart;

        if (response.status !== 200 && response.status !== 201) {
          throw new Error(`Report generation returned status ${response.status}`);
        }

        // Step 2: Parse response and extract metrics
        const reportData = response.data;

        if (!reportData.reportId || !reportData.content) {
          throw new Error('Invalid report response structure');
        }

        metrics.reportGenerated = true;

        // Extract timing breakdown from response headers or body
        metrics.q2qProcessingTime = reportData.timings?.q2qProcessing || 0;
        metrics.narrativeGenerationTime = reportData.timings?.narrativeGeneration || 0;
        metrics.dataAggregationTime = reportData.timings?.dataAggregation || 0;

        // Quality metrics
        const narrative = reportData.content?.narrative || '';
        metrics.narrativeWordCount = narrative.split(/\s+/).length;
        metrics.evidenceCount = reportData.content?.evidence?.length || 0;
        metrics.confidenceScore = reportData.metadata?.confidenceScore || 0;

        // Validate quality thresholds
        const qualityIssues: string[] = [];

        if (metrics.narrativeWordCount < 50) {
          qualityIssues.push(`Narrative too short: ${metrics.narrativeWordCount} words`);
        }

        if (metrics.evidenceCount < 3) {
          qualityIssues.push(`Insufficient evidence: ${metrics.evidenceCount} items`);
        }

        if (metrics.confidenceScore < 0.7) {
          qualityIssues.push(`Low confidence: ${metrics.confidenceScore.toFixed(2)}`);
        }

        if (qualityIssues.length > 0) {
          console.warn(`⚠️  Quality issues for ${tenantId} ${reportRequest.type}:`);
          qualityIssues.forEach((issue) => console.warn(`   - ${issue}`));

          addSpanAttributes({
            'monitor.quality_issues': qualityIssues.join(', '),
            'monitor.severity': 'warning',
          });
        }

        // Step 3: Check performance gates
        const isCached = reportData.cached === true;
        const performanceGate = isCached
          ? PERFORMANCE_GATES.CACHED_REPORT
          : PERFORMANCE_GATES.FRESH_REPORT;

        metrics.withinPerformanceGate = metrics.totalGenerationTime <= performanceGate;

        if (!metrics.withinPerformanceGate) {
          console.warn(
            `⚠️  Performance gate exceeded for ${tenantId}: ${metrics.totalGenerationTime}ms > ${performanceGate}ms (${isCached ? 'cached' : 'fresh'})`
          );

          addSpanAttributes({
            'monitor.performance_gate_exceeded': true,
            'monitor.gate_ms': performanceGate,
            'monitor.actual_ms': metrics.totalGenerationTime,
            'monitor.cached': isCached,
          });
        }

        // Validate Q2Q processing time
        if (metrics.q2qProcessingTime > PERFORMANCE_GATES.Q2Q_PROCESSING) {
          console.warn(
            `⚠️  Q2Q processing slow for ${tenantId}: ${metrics.q2qProcessingTime}ms > ${PERFORMANCE_GATES.Q2Q_PROCESSING}ms`
          );
        }

        // Validate narrative generation time
        if (metrics.narrativeGenerationTime > PERFORMANCE_GATES.NARRATIVE_GENERATION) {
          console.warn(
            `⚠️  Narrative generation slow for ${tenantId}: ${metrics.narrativeGenerationTime}ms > ${PERFORMANCE_GATES.NARRATIVE_GENERATION}ms`
          );
        }

        // Step 4: Mark success
        metrics.success = true;
        failureCount.set(tenantId, 0);

        // Record metrics to span
        addSpanAttributes({
          'monitor.success': true,
          'monitor.generation_time_ms': metrics.totalGenerationTime,
          'monitor.q2q_time_ms': metrics.q2qProcessingTime,
          'monitor.narrative_time_ms': metrics.narrativeGenerationTime,
          'monitor.word_count': metrics.narrativeWordCount,
          'monitor.evidence_count': metrics.evidenceCount,
          'monitor.confidence_score': metrics.confidenceScore,
          'monitor.within_gate': metrics.withinPerformanceGate,
          'monitor.cached': isCached,
        });

        const gateStatus = metrics.withinPerformanceGate ? '✅' : '⚠️';
        console.log(
          `${gateStatus} Tenant ${tenantId} ${reportRequest.type}: ${metrics.totalGenerationTime}ms, ${metrics.narrativeWordCount} words, ${metrics.evidenceCount} evidence`
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
            `🚨 ALERT: Tenant ${tenantId} report generation has ${currentFailures} consecutive failures!`
          );
          await sendAlert(tenantId, reportRequest.type, currentFailures, errorMessage);
        } else {
          console.error(
            `❌ Tenant ${tenantId} report generation failed (${currentFailures}/${consecutiveFailureThreshold}): ${errorMessage}`
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
      'monitor.route': 'report-generation',
      'monitor.interval_minutes': 5,
    }
  );
}

/**
 * Send alert notification
 */
async function sendAlert(
  tenantId: string,
  reportType: string,
  failureCount: number,
  error: string
): Promise<void> {
  const alertPayload = {
    timestamp: new Date().toISOString(),
    severity: 'critical',
    monitor: 'report-generation',
    tenantId,
    reportType,
    consecutiveFailures: failureCount,
    error,
    actionRequired: 'Investigate Q2Q pipeline and AI service availability',
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor all pilot tenants with different report types
 */
export async function monitorAllReportGeneration(): Promise<ReportGenerationMetrics[]> {
  const pilotTenants = [
    { id: 'acme-corp', url: 'https://acme.teei-platform.com' },
    { id: 'globex-inc', url: 'https://globex.teei-platform.com' },
    { id: 'initech-ltd', url: 'https://initech.teei-platform.com' },
  ];

  // Test different report types on rotation
  const reportTypes: ReportRequest['type'][] = [
    'executive-summary',
    'impact-analysis',
    'governance-report',
  ];

  const testCases: Array<{ tenant: typeof pilotTenants[0]; report: ReportRequest }> = [];

  pilotTenants.forEach((tenant, index) => {
    const reportType = reportTypes[index % reportTypes.length];
    testCases.push({
      tenant,
      report: {
        type: reportType,
        dateRange: {
          start: '2025-01-01',
          end: '2025-11-15',
        },
      },
    });
  });

  console.log(`🔍 Starting report generation monitoring for ${testCases.length} test cases...`);

  const results = await Promise.allSettled(
    testCases.map((tc) => monitorReportGeneration(tc.tenant.id, tc.tenant.url, tc.report))
  );

  const metrics: ReportGenerationMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        tenantId: testCases[index].tenant.id,
        reportType: testCases[index].report.type,
        success: false,
        totalGenerationTime: 0,
        q2qProcessingTime: 0,
        narrativeGenerationTime: 0,
        dataAggregationTime: 0,
        reportGenerated: false,
        narrativeWordCount: 0,
        evidenceCount: 0,
        confidenceScore: 0,
        withinPerformanceGate: false,
        error: result.reason?.message || 'Monitor execution failed',
      };
    }
  });

  // Aggregate stats
  const successCount = metrics.filter((m) => m.success).length;
  const gateCompliant = metrics.filter((m) => m.withinPerformanceGate).length;
  const avgGenerationTime = metrics.reduce((sum, m) => sum + m.totalGenerationTime, 0) / metrics.length;
  const avgWordCount = metrics.reduce((sum, m) => sum + m.narrativeWordCount, 0) / metrics.length;

  console.log(`📊 Report Generation Summary:`);
  console.log(`   - Total Tests: ${metrics.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Performance Gate Compliant: ${gateCompliant}/${metrics.length}`);
  console.log(`   - Avg Generation Time: ${avgGenerationTime.toFixed(0)}ms`);
  console.log(`   - Avg Narrative Length: ${avgWordCount.toFixed(0)} words`);

  return metrics;
}

/**
 * Scheduled monitor execution
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-report-generation',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllReportGeneration();
  console.log(`✓ Report generation monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('Report generation monitor failed:', error);
    process.exit(1);
  });
}
