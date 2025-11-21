/**
 * Synthetic Monitor: Trust Center Status Page
 *
 * Monitors public Trust Center /status.json endpoint
 * - System status (operational, degraded, outage)
 * - Component health (API, Database, Queue, Storage)
 * - Incident tracking
 * - Response time (< 500ms target)
 *
 * Runs every 1 minute (public-facing SLA)
 * Alerts immediately on any degradation or outage
 *
 * @module synthetics/pilot-routes/trust-center-status
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';

export interface ComponentStatus {
  name: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  responseTime?: number;
  lastCheck?: string;
}

export interface TrustCenterMetrics {
  timestamp: number;
  success: boolean;
  responseTime: number;

  // Overall status
  systemStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';

  // Component statuses
  components: ComponentStatus[];

  // Incidents
  activeIncidents: number;
  scheduledMaintenance: number;

  // Performance
  withinSLA: boolean; // < 500ms

  // Metadata
  statusPageVersion?: string;
  lastUpdate?: string;

  error?: string;
}

const PERFORMANCE_SLA = {
  RESPONSE_TIME: 500, // 500ms (public-facing SLA)
};

const TRUST_CENTER_URL =
  process.env.TRUST_CENTER_URL || 'https://status.teei-platform.com/status.json';

// Track consecutive failures
let consecutiveFailures = 0;

/**
 * Monitor Trust Center status page
 */
export async function monitorTrustCenter(): Promise<TrustCenterMetrics> {
  return traceAsync(
    'synthetic.trust_center_status',
    async (_span) => {
      addSpanAttributes({
        'monitor.route': 'trust-center-status',
        'monitor.url': TRUST_CENTER_URL,
      });

      const timestamp = Date.now();
      let metrics: TrustCenterMetrics = {
        timestamp,
        success: false,
        responseTime: 0,
        systemStatus: 'major_outage',
        components: [],
        activeIncidents: 0,
        scheduledMaintenance: 0,
        withinSLA: false,
      };

      try {
        // Fetch status page
        const statusStart = Date.now();
        const statusResponse = await axios.get(TRUST_CENTER_URL, {
          timeout: 5000,
          validateStatus: () => true,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TEEI-Synthetics/1.0',
          },
        });

        const statusEnd = Date.now();
        metrics.responseTime = statusEnd - statusStart;

        if (statusResponse.status !== 200) {
          throw new Error(`Status page returned status ${statusResponse.status}`);
        }

        // Parse status data
        const statusData = statusResponse.data;

        // Extract system status
        metrics.systemStatus =
          statusData.status?.indicator || statusData.systemStatus || 'unknown';
        metrics.statusPageVersion = statusData.version;
        metrics.lastUpdate = statusData.updated_at || statusData.lastUpdate;

        // Validate status value
        const validStatuses = ['operational', 'degraded', 'partial_outage', 'major_outage'];
        if (!validStatuses.includes(metrics.systemStatus)) {
          console.warn(`⚠️  Unknown system status: ${metrics.systemStatus}`);
          metrics.systemStatus = 'degraded';
        }

        // Extract component statuses
        if (Array.isArray(statusData.components)) {
          metrics.components = statusData.components.map((comp: any) => ({
            name: comp.name,
            status: comp.status,
            responseTime: comp.response_time,
            lastCheck: comp.last_check,
          }));
        }

        // Extract incidents
        if (statusData.incidents) {
          const incidents = Array.isArray(statusData.incidents)
            ? statusData.incidents
            : statusData.incidents.active || [];

          metrics.activeIncidents = incidents.filter(
            (inc: any) => inc.status !== 'resolved'
          ).length;
        }

        // Extract scheduled maintenance
        if (statusData.scheduled_maintenances) {
          const maintenances = Array.isArray(statusData.scheduled_maintenances)
            ? statusData.scheduled_maintenances
            : [];

          metrics.scheduledMaintenance = maintenances.filter(
            (maint: any) => maint.status === 'scheduled' || maint.status === 'in_progress'
          ).length;
        }

        // Check performance SLA
        metrics.withinSLA = metrics.responseTime <= PERFORMANCE_SLA.RESPONSE_TIME;

        if (!metrics.withinSLA) {
          console.warn(
            `⚠️  Trust Center status page slow: ${metrics.responseTime}ms > ${PERFORMANCE_SLA.RESPONSE_TIME}ms`
          );

          addSpanAttributes({
            'monitor.sla_exceeded': true,
            'monitor.sla_ms': PERFORMANCE_SLA.RESPONSE_TIME,
            'monitor.actual_ms': metrics.responseTime,
          });
        }

        // Check for degradation or outage
        if (metrics.systemStatus !== 'operational') {
          console.warn(
            `⚠️  Trust Center system status: ${metrics.systemStatus.toUpperCase()}`
          );

          addSpanAttributes({
            'monitor.system_degraded': true,
            'monitor.severity': metrics.systemStatus === 'major_outage' ? 'critical' : 'warning',
          });
        }

        // Check for active incidents
        if (metrics.activeIncidents > 0) {
          console.warn(`⚠️  ${metrics.activeIncidents} active incident(s) reported`);

          addSpanAttributes({
            'monitor.active_incidents': metrics.activeIncidents,
            'monitor.severity': 'warning',
          });
        }

        // Check component health
        const unhealthyComponents = metrics.components.filter(
          (comp) => comp.status !== 'operational'
        );

        if (unhealthyComponents.length > 0) {
          console.warn(`⚠️  ${unhealthyComponents.length} component(s) unhealthy:`);
          unhealthyComponents.forEach((comp) => {
            console.warn(`   - ${comp.name}: ${comp.status}`);
          });

          addSpanAttributes({
            'monitor.unhealthy_components': unhealthyComponents.map((c) => c.name).join(', '),
            'monitor.severity': 'warning',
          });
        }

        // Mark success
        metrics.success = true;
        consecutiveFailures = 0;

        // Record metrics
        addSpanAttributes({
          'monitor.success': true,
          'monitor.response_time_ms': metrics.responseTime,
          'monitor.system_status': metrics.systemStatus,
          'monitor.components_count': metrics.components.length,
          'monitor.active_incidents': metrics.activeIncidents,
          'monitor.scheduled_maintenance': metrics.scheduledMaintenance,
          'monitor.within_sla': metrics.withinSLA,
        });

        const statusEmoji =
          metrics.systemStatus === 'operational'
            ? '✅'
            : metrics.systemStatus === 'degraded'
            ? '⚠️'
            : '🚨';

        console.log(
          `${statusEmoji} Trust Center: ${metrics.systemStatus}, ${metrics.responseTime}ms, ${metrics.components.length} components`
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
        consecutiveFailures++;

        // Alert immediately (Trust Center is public-facing)
        if (consecutiveFailures >= 1) {
          console.error(
            `🚨 CRITICAL: Trust Center status page has ${consecutiveFailures} consecutive failure(s)!`
          );
          await sendAlert(consecutiveFailures, errorMessage);
        }

        // Record failure
        addSpanAttributes({
          'monitor.success': false,
          'monitor.error': errorMessage,
          'monitor.consecutive_failures': consecutiveFailures,
          'monitor.severity': 'critical',
        });

        return metrics;
      }
    },
    {
      'monitor.type': 'synthetic',
      'monitor.route': 'trust-center-status',
      'monitor.interval_minutes': 1,
    }
  );
}

/**
 * Send alert notification
 */
async function sendAlert(failureCount: number, error: string): Promise<void> {
  const alertPayload = {
    timestamp: new Date().toISOString(),
    severity: 'critical',
    monitor: 'trust-center-status',
    consecutiveFailures: failureCount,
    error,
    actionRequired:
      'Investigate Trust Center status page availability - this affects customer visibility!',
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor Trust Center with detailed output
 */
export async function monitorTrustCenterStatus(): Promise<TrustCenterMetrics> {
  console.log(`🔍 Starting Trust Center status monitoring...`);

  const metrics = await monitorTrustCenter();

  // Detailed summary
  console.log(`📊 Trust Center Status Summary:`);
  console.log(`   - System Status: ${metrics.systemStatus}`);
  console.log(`   - Response Time: ${metrics.responseTime}ms`);
  console.log(`   - Within SLA: ${metrics.withinSLA ? 'YES' : 'NO'}`);
  console.log(`   - Components: ${metrics.components.length}`);
  console.log(`   - Active Incidents: ${metrics.activeIncidents}`);
  console.log(`   - Scheduled Maintenance: ${metrics.scheduledMaintenance}`);

  // List unhealthy components
  const unhealthy = metrics.components.filter((c) => c.status !== 'operational');
  if (unhealthy.length > 0) {
    console.log(`   - Unhealthy Components:`);
    unhealthy.forEach((comp) => {
      console.log(`     - ${comp.name}: ${comp.status}`);
    });
  }

  return metrics;
}

/**
 * Scheduled monitor execution (runs every 1 minute)
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-trust-center',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorTrustCenterStatus();
  console.log(`✓ Trust Center monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('Trust Center monitor failed:', error);
    process.exit(1);
  });
}
