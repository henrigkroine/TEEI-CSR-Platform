/**
 * Synthetic Monitor: Evidence Explorer
 *
 * Monitors evidence browsing endpoints for pilot tenants
 * - Tests evidence listing and search
 * - Validates lineage tracking
 * - Monitors pagination performance
 * - Tracks query response time (< 2s target)
 *
 * Runs every 5 minutes for all pilot tenants
 * Alerts on 2 consecutive failures or slow queries
 *
 * @module synthetics/pilot-routes/evidence-explorer
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';

export interface EvidenceExplorerMetrics {
  timestamp: number;
  tenantId: string;
  success: boolean;

  // Timing metrics
  listQueryTime: number;
  searchQueryTime: number;
  lineageQueryTime: number;
  paginationTime: number;
  totalQueryTime: number;

  // Data metrics
  totalEvidenceCount: number;
  searchResultCount: number;
  lineageDepth: number;
  pagesLoaded: number;

  // Quality checks
  evidenceDataValid: boolean;
  lineageComplete: boolean;
  paginationWorking: boolean;
  metadataPresent: boolean;

  // Performance gate
  withinPerformanceGate: boolean; // < 2s per query

  error?: string;
}

export interface EvidenceItem {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  metadata?: Record<string, any>;
  lineage?: Array<{ id: string; type: string }>;
}

const PERFORMANCE_GATE = {
  LIST_QUERY: 2000, // 2 seconds
  SEARCH_QUERY: 2000, // 2 seconds
  LINEAGE_QUERY: 1500, // 1.5 seconds
  PAGINATION: 1000, // 1 second per page
};

// Track consecutive failures
const failureCount = new Map<string, number>();

/**
 * Monitor evidence explorer for a single tenant
 */
export async function monitorEvidenceExplorer(
  tenantId: string,
  baseUrl: string,
  consecutiveFailureThreshold = 2
): Promise<EvidenceExplorerMetrics> {
  return traceAsync(
    'synthetic.evidence_explorer',
    async (_span) => {
      addSpanAttributes({
        'tenant.id': tenantId,
        'monitor.route': 'evidence-explorer',
      });

      const timestamp = Date.now();
      let metrics: EvidenceExplorerMetrics = {
        timestamp,
        tenantId,
        success: false,
        listQueryTime: 0,
        searchQueryTime: 0,
        lineageQueryTime: 0,
        paginationTime: 0,
        totalQueryTime: 0,
        totalEvidenceCount: 0,
        searchResultCount: 0,
        lineageDepth: 0,
        pagesLoaded: 0,
        evidenceDataValid: false,
        lineageComplete: false,
        paginationWorking: false,
        metadataPresent: false,
        withinPerformanceGate: false,
      };

      const queryStart = Date.now();

      try {
        // Step 1: List evidence items (default view)
        const listStart = Date.now();
        const listResponse = await axios.get(
          `${baseUrl}/api/evidence/list`,
          {
            params: {
              page: 1,
              limit: 50,
              sortBy: 'timestamp',
              sortOrder: 'desc',
            },
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
            },
          }
        );

        if (listResponse.status !== 200) {
          throw new Error(`Evidence list returned status ${listResponse.status}`);
        }

        const listEnd = Date.now();
        metrics.listQueryTime = listEnd - listStart;

        const listData = listResponse.data;
        const evidence: EvidenceItem[] = listData.evidence || listData.items || [];

        metrics.totalEvidenceCount = listData.total || listData.totalCount || evidence.length;
        metrics.evidenceDataValid =
          Array.isArray(evidence) &&
          evidence.length > 0 &&
          evidence.every((e) => e.id && e.type && e.source);

        if (!metrics.evidenceDataValid) {
          throw new Error('Invalid evidence data structure');
        }

        // Step 2: Search evidence
        const searchStart = Date.now();
        const searchResponse = await axios.get(
          `${baseUrl}/api/evidence/search`,
          {
            params: {
              query: 'impact',
              filters: JSON.stringify({ type: 'quantitative' }),
              limit: 20,
            },
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
            },
          }
        );

        const searchEnd = Date.now();
        metrics.searchQueryTime = searchEnd - searchStart;

        const searchData = searchResponse.data;
        metrics.searchResultCount = searchData.results?.length || 0;

        // Step 3: Query lineage for first evidence item
        if (evidence.length > 0) {
          const sampleEvidenceId = evidence[0].id;

          const lineageStart = Date.now();
          const lineageResponse = await axios.get(
            `${baseUrl}/api/evidence/${sampleEvidenceId}/lineage`,
            {
              timeout: 3000,
              headers: {
                'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              },
            }
          );

          const lineageEnd = Date.now();
          metrics.lineageQueryTime = lineageEnd - lineageStart;

          const lineageData = lineageResponse.data;
          const lineageChain = lineageData.lineage || lineageData.chain || [];

          metrics.lineageDepth = lineageChain.length;
          metrics.lineageComplete =
            Array.isArray(lineageChain) &&
            lineageChain.length > 0 &&
            lineageChain.every((item: any) => item.id && item.type);

          // Check for metadata
          metrics.metadataPresent =
            !!evidence[0].metadata &&
            Object.keys(evidence[0].metadata).length > 0;
        }

        // Step 4: Test pagination
        const paginationStart = Date.now();
        const page2Response = await axios.get(
          `${baseUrl}/api/evidence/list`,
          {
            params: {
              page: 2,
              limit: 50,
            },
            timeout: 3000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
            },
          }
        );

        const paginationEnd = Date.now();
        metrics.paginationTime = paginationEnd - paginationStart;

        const page2Data = page2Response.data;
        const page2Evidence = page2Data.evidence || page2Data.items || [];

        metrics.paginationWorking =
          page2Response.status === 200 &&
          Array.isArray(page2Evidence) &&
          (page2Evidence.length > 0 || metrics.totalEvidenceCount <= 50); // Page 2 may be empty if total < 50

        metrics.pagesLoaded = 2;

        // Calculate total query time
        const queryEnd = Date.now();
        metrics.totalQueryTime = queryEnd - queryStart;

        // Check performance gates
        const performanceViolations: string[] = [];

        if (metrics.listQueryTime > PERFORMANCE_GATE.LIST_QUERY) {
          performanceViolations.push(
            `List query: ${metrics.listQueryTime}ms > ${PERFORMANCE_GATE.LIST_QUERY}ms`
          );
        }

        if (metrics.searchQueryTime > PERFORMANCE_GATE.SEARCH_QUERY) {
          performanceViolations.push(
            `Search query: ${metrics.searchQueryTime}ms > ${PERFORMANCE_GATE.SEARCH_QUERY}ms`
          );
        }

        if (metrics.lineageQueryTime > PERFORMANCE_GATE.LINEAGE_QUERY) {
          performanceViolations.push(
            `Lineage query: ${metrics.lineageQueryTime}ms > ${PERFORMANCE_GATE.LINEAGE_QUERY}ms`
          );
        }

        if (metrics.paginationTime > PERFORMANCE_GATE.PAGINATION) {
          performanceViolations.push(
            `Pagination: ${metrics.paginationTime}ms > ${PERFORMANCE_GATE.PAGINATION}ms`
          );
        }

        metrics.withinPerformanceGate = performanceViolations.length === 0;

        if (performanceViolations.length > 0) {
          console.warn(`⚠️  Performance violations for ${tenantId}:`);
          performanceViolations.forEach((v) => console.warn(`   - ${v}`));

          addSpanAttributes({
            'monitor.performance_violations': performanceViolations.join(', '),
            'monitor.severity': 'warning',
          });
        }

        // Quality checks
        const qualityIssues: string[] = [];

        if (!metrics.lineageComplete) {
          qualityIssues.push('Lineage tracking incomplete');
        }

        if (!metrics.metadataPresent) {
          qualityIssues.push('Evidence metadata missing');
        }

        if (!metrics.paginationWorking) {
          qualityIssues.push('Pagination not functioning');
        }

        if (metrics.searchResultCount === 0) {
          qualityIssues.push('Search returned no results');
        }

        if (qualityIssues.length > 0) {
          console.warn(`⚠️  Quality issues for ${tenantId}:`);
          qualityIssues.forEach((issue) => console.warn(`   - ${issue}`));
        }

        // Mark success
        metrics.success = true;
        failureCount.set(tenantId, 0);

        // Record metrics to span
        addSpanAttributes({
          'monitor.success': true,
          'monitor.total_time_ms': metrics.totalQueryTime,
          'monitor.list_time_ms': metrics.listQueryTime,
          'monitor.search_time_ms': metrics.searchQueryTime,
          'monitor.lineage_time_ms': metrics.lineageQueryTime,
          'monitor.pagination_time_ms': metrics.paginationTime,
          'monitor.total_evidence': metrics.totalEvidenceCount,
          'monitor.search_results': metrics.searchResultCount,
          'monitor.lineage_depth': metrics.lineageDepth,
          'monitor.data_valid': metrics.evidenceDataValid,
          'monitor.lineage_complete': metrics.lineageComplete,
          'monitor.pagination_working': metrics.paginationWorking,
          'monitor.within_gate': metrics.withinPerformanceGate,
        });

        const gateStatus = metrics.withinPerformanceGate ? '✅' : '⚠️';
        console.log(
          `${gateStatus} Tenant ${tenantId} evidence explorer: ${metrics.totalQueryTime}ms, ${metrics.totalEvidenceCount} items, depth ${metrics.lineageDepth}`
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
            `🚨 ALERT: Tenant ${tenantId} evidence explorer has ${currentFailures} consecutive failures!`
          );
          await sendAlert(tenantId, currentFailures, errorMessage);
        } else {
          console.error(
            `❌ Tenant ${tenantId} evidence explorer failed (${currentFailures}/${consecutiveFailureThreshold}): ${errorMessage}`
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
      'monitor.route': 'evidence-explorer',
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
    monitor: 'evidence-explorer',
    tenantId,
    consecutiveFailures: failureCount,
    error,
    actionRequired: 'Investigate evidence API and database performance',
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor all pilot tenants
 */
export async function monitorAllEvidenceExplorers(): Promise<EvidenceExplorerMetrics[]> {
  const pilotTenants = [
    { id: 'acme-corp', url: 'https://acme.teei-platform.com' },
    { id: 'globex-inc', url: 'https://globex.teei-platform.com' },
    { id: 'initech-ltd', url: 'https://initech.teei-platform.com' },
  ];

  console.log(`🔍 Starting evidence explorer monitoring for ${pilotTenants.length} pilot tenants...`);

  const results = await Promise.allSettled(
    pilotTenants.map((tenant) => monitorEvidenceExplorer(tenant.id, tenant.url))
  );

  const metrics: EvidenceExplorerMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        tenantId: pilotTenants[index].id,
        success: false,
        listQueryTime: 0,
        searchQueryTime: 0,
        lineageQueryTime: 0,
        paginationTime: 0,
        totalQueryTime: 0,
        totalEvidenceCount: 0,
        searchResultCount: 0,
        lineageDepth: 0,
        pagesLoaded: 0,
        evidenceDataValid: false,
        lineageComplete: false,
        paginationWorking: false,
        metadataPresent: false,
        withinPerformanceGate: false,
        error: result.reason?.message || 'Monitor execution failed',
      };
    }
  });

  // Aggregate stats
  const successCount = metrics.filter((m) => m.success).length;
  const gateCompliant = metrics.filter((m) => m.withinPerformanceGate).length;
  const avgQueryTime = metrics.reduce((sum, m) => sum + m.totalQueryTime, 0) / metrics.length;
  const avgEvidenceCount = metrics.reduce((sum, m) => sum + m.totalEvidenceCount, 0) / metrics.length;

  console.log(`📊 Evidence Explorer Summary:`);
  console.log(`   - Total Tests: ${metrics.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - Performance Gate Compliant: ${gateCompliant}/${metrics.length}`);
  console.log(`   - Avg Query Time: ${avgQueryTime.toFixed(0)}ms`);
  console.log(`   - Avg Evidence Count: ${avgEvidenceCount.toFixed(0)} items`);

  return metrics;
}

/**
 * Scheduled monitor execution
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-evidence-explorer',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllEvidenceExplorers();
  console.log(`✓ Evidence explorer monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('Evidence explorer monitor failed:', error);
    process.exit(1);
  });
}
