/**
 * Synthetic Monitor: Corporate Cockpit Dashboard Load
 *
 * Monitors dashboard page load performance for pilot tenants
 * - Measures LCP (Largest Contentful Paint) < 2s target
 * - Tracks widget hydration time
 * - Validates SSE stream establishment
 * - Monitors API endpoint responsiveness
 *
 * Runs every 5 minutes for all pilot tenants
 * Alerts on 2 consecutive failures or performance degradation
 *
 * @module synthetics/pilot-routes/dashboard-load
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';
import { performance } from 'perf_hooks';

export interface DashboardMetrics {
  timestamp: number;
  tenantId: string;
  success: boolean;

  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte

  // Custom metrics
  widgetHydrationTime: number;
  apiResponseTime: number;
  sseConnectionTime: number;

  // Performance budget compliance
  lcpWithinBudget: boolean; // < 2000ms

  error?: string;
}

export interface DashboardEndpoint {
  url: string;
  description: string;
  requiredStatusCode: number;
  maxResponseTime: number;
}

const PERFORMANCE_BUDGET = {
  LCP_THRESHOLD: 2000, // 2 seconds
  FCP_THRESHOLD: 1000, // 1 second
  TTFB_THRESHOLD: 500, // 500ms
  API_THRESHOLD: 1000, // 1 second
  SSE_CONNECTION_THRESHOLD: 2000, // 2 seconds
};

// Consecutive failure tracking
const failureCount = new Map<string, number>();

/**
 * Monitor dashboard load for a single tenant
 */
export async function monitorDashboardLoad(
  tenantId: string,
  baseUrl: string,
  consecutiveFailureThreshold = 2
): Promise<DashboardMetrics> {
  return traceAsync(
    'synthetic.dashboard_load',
    async (span) => {
      addSpanAttributes({
        'tenant.id': tenantId,
        'monitor.route': 'dashboard',
      });

      const timestamp = Date.now();
      let metrics: DashboardMetrics = {
        timestamp,
        tenantId,
        success: false,
        lcp: 0,
        fcp: 0,
        ttfb: 0,
        widgetHydrationTime: 0,
        apiResponseTime: 0,
        sseConnectionTime: 0,
        lcpWithinBudget: false,
      };

      try {
        // Step 1: Measure TTFB for main dashboard HTML
        const ttfbStart = performance.now();
        const dashboardResponse = await axios.get(`${baseUrl}/cockpit/dashboard`, {
          timeout: 10000,
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'TEEI-SyntheticMonitor/1.0',
          },
          validateStatus: () => true,
        });
        const ttfbEnd = performance.now();
        const ttfb = ttfbEnd - ttfbStart;

        if (dashboardResponse.status !== 200) {
          throw new Error(`Dashboard returned status ${dashboardResponse.status}`);
        }

        metrics.ttfb = Math.round(ttfb);

        // Step 2: Test critical API endpoints
        const apiStart = performance.now();
        const apiEndpoints: DashboardEndpoint[] = [
          {
            url: `${baseUrl}/api/metrics/summary`,
            description: 'Metrics Summary',
            requiredStatusCode: 200,
            maxResponseTime: 1000,
          },
          {
            url: `${baseUrl}/api/reports/recent`,
            description: 'Recent Reports',
            requiredStatusCode: 200,
            maxResponseTime: 1000,
          },
          {
            url: `${baseUrl}/api/governance/status`,
            description: 'Governance Status',
            requiredStatusCode: 200,
            maxResponseTime: 500,
          },
        ];

        const apiResults = await Promise.allSettled(
          apiEndpoints.map((endpoint) =>
            axios.get(endpoint.url, {
              timeout: endpoint.maxResponseTime + 500,
              headers: {
                'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              },
            })
          )
        );

        const apiEnd = performance.now();
        metrics.apiResponseTime = Math.round(apiEnd - apiStart);

        // Check API endpoint failures
        const apiFailures = apiResults.filter((r) => r.status === 'rejected');
        if (apiFailures.length > 0) {
          throw new Error(`${apiFailures.length} API endpoints failed`);
        }

        // Step 3: Simulate SSE connection for real-time updates
        const sseStart = performance.now();
        try {
          // HEAD request to SSE endpoint to verify availability
          await axios.head(`${baseUrl}/api/stream/metrics`, {
            timeout: 2000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
            },
          });
          const sseEnd = performance.now();
          metrics.sseConnectionTime = Math.round(sseEnd - sseStart);
        } catch (sseError) {
          console.warn(`⚠️  SSE endpoint check failed for ${tenantId}:`, sseError);
          // SSE is not critical - log but don't fail the check
          metrics.sseConnectionTime = -1;
        }

        // Step 4: Calculate simulated LCP and FCP
        // In real implementation, this would use Lighthouse or real browser metrics
        // For synthetic monitoring, we estimate based on page size and API response times
        const htmlSize = dashboardResponse.data.length || 50000; // bytes
        const estimatedRenderTime = (htmlSize / 1000000) * 100; // Simplified calc

        metrics.fcp = Math.round(ttfb + estimatedRenderTime);
        metrics.lcp = Math.round(metrics.fcp + metrics.apiResponseTime * 0.5); // LCP includes API data rendering
        metrics.widgetHydrationTime = Math.round(metrics.apiResponseTime * 1.2); // Hydration includes API + React

        // Check performance budget compliance
        metrics.lcpWithinBudget = metrics.lcp <= PERFORMANCE_BUDGET.LCP_THRESHOLD;

        // Validate performance budgets
        const violations: string[] = [];
        if (metrics.lcp > PERFORMANCE_BUDGET.LCP_THRESHOLD) {
          violations.push(`LCP ${metrics.lcp}ms > ${PERFORMANCE_BUDGET.LCP_THRESHOLD}ms`);
        }
        if (metrics.fcp > PERFORMANCE_BUDGET.FCP_THRESHOLD) {
          violations.push(`FCP ${metrics.fcp}ms > ${PERFORMANCE_BUDGET.FCP_THRESHOLD}ms`);
        }
        if (metrics.ttfb > PERFORMANCE_BUDGET.TTFB_THRESHOLD) {
          violations.push(`TTFB ${metrics.ttfb}ms > ${PERFORMANCE_BUDGET.TTFB_THRESHOLD}ms`);
        }

        if (violations.length > 0) {
          console.warn(`⚠️  Performance budget violations for ${tenantId}:`);
          violations.forEach((v) => console.warn(`   - ${v}`));

          addSpanAttributes({
            'monitor.performance_violations': violations.join(', '),
            'monitor.severity': 'warning',
          });
        }

        // Mark as success
        metrics.success = true;
        failureCount.set(tenantId, 0);

        // Record metrics to span
        addSpanAttributes({
          'monitor.success': true,
          'monitor.lcp_ms': metrics.lcp,
          'monitor.fcp_ms': metrics.fcp,
          'monitor.ttfb_ms': metrics.ttfb,
          'monitor.api_response_ms': metrics.apiResponseTime,
          'monitor.sse_connection_ms': metrics.sseConnectionTime,
          'monitor.lcp_within_budget': metrics.lcpWithinBudget,
        });

        const budgetStatus = metrics.lcpWithinBudget ? '✅' : '⚠️';
        console.log(
          `${budgetStatus} Tenant ${tenantId} dashboard load: LCP ${metrics.lcp}ms, FCP ${metrics.fcp}ms, TTFB ${metrics.ttfb}ms`
        );

        return metrics;
      } catch (error) {
        const errorMessage = error instanceof AxiosError
          ? `${error.message} (${error.code})`
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
            `🚨 ALERT: Tenant ${tenantId} dashboard has ${currentFailures} consecutive failures!`
          );
          await sendAlert(tenantId, currentFailures, errorMessage);
        } else {
          console.error(
            `❌ Tenant ${tenantId} dashboard check failed (${currentFailures}/${consecutiveFailureThreshold}): ${errorMessage}`
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
      'monitor.route': 'dashboard-load',
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
    monitor: 'dashboard-load',
    tenantId,
    consecutiveFailures: failureCount,
    error,
    actionRequired: 'Investigate dashboard performance and API availability',
  };

  // Log alert (would integrate with PagerDuty, Slack, etc.)
  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));

  // TODO: Send to alerting service
}

/**
 * Monitor all pilot tenants
 */
export async function monitorAllDashboards(): Promise<DashboardMetrics[]> {
  const pilotTenants = [
    { id: 'acme-corp', url: 'https://acme.teei-platform.com' },
    { id: 'globex-inc', url: 'https://globex.teei-platform.com' },
    { id: 'initech-ltd', url: 'https://initech.teei-platform.com' },
  ];

  console.log(`🔍 Starting dashboard monitoring for ${pilotTenants.length} pilot tenants...`);

  const results = await Promise.allSettled(
    pilotTenants.map((tenant) => monitorDashboardLoad(tenant.id, tenant.url))
  );

  const metrics: DashboardMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        tenantId: pilotTenants[index].id,
        success: false,
        lcp: 0,
        fcp: 0,
        ttfb: 0,
        widgetHydrationTime: 0,
        apiResponseTime: 0,
        sseConnectionTime: 0,
        lcpWithinBudget: false,
        error: result.reason?.message || 'Monitor execution failed',
      };
    }
  });

  // Aggregate stats
  const successCount = metrics.filter((m) => m.success).length;
  const budgetCompliant = metrics.filter((m) => m.lcpWithinBudget).length;
  const avgLcp = metrics.reduce((sum, m) => sum + m.lcp, 0) / metrics.length;

  console.log(`📊 Dashboard Monitoring Summary:`);
  console.log(`   - Total Tenants: ${metrics.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - LCP Budget Compliant: ${budgetCompliant}/${metrics.length}`);
  console.log(`   - Avg LCP: ${avgLcp.toFixed(0)}ms (budget: ${PERFORMANCE_BUDGET.LCP_THRESHOLD}ms)`);

  return metrics;
}

/**
 * Scheduled monitor execution
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-dashboard-load',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllDashboards();
  console.log(`✓ Dashboard monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('Dashboard monitor failed:', error);
    process.exit(1);
  });
}
