/**
 * Synthetic Monitor: Connectors Health Check
 *
 * Monitors health of external CSR connectors
 * - Benevity connector status
 * - Goodera connector status
 * - Workday connector status
 * - Kintell connector status
 * - Buddy connector status
 * - Upskilling connector status
 *
 * Runs every 1 minute (critical infrastructure)
 * Alerts immediately on any connector failure
 *
 * @module synthetics/pilot-routes/connectors-health
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';

export interface ConnectorMetrics {
  timestamp: number;
  connector: string;
  success: boolean;
  healthy: boolean;

  // Timing
  responseTime: number;

  // Health details
  statusCode?: number;
  dependencies: {
    database: boolean;
    redis: boolean;
    queue: boolean;
    externalAPI: boolean;
  };

  // Metadata
  version?: string;
  uptime?: number;
  lastSync?: string;

  error?: string;
}

export interface ConnectorHealthSummary {
  timestamp: number;
  totalConnectors: number;
  healthyConnectors: number;
  unhealthyConnectors: number;
  avgResponseTime: number;
  connectors: ConnectorMetrics[];
}

const CONNECTORS = [
  {
    name: 'benevity',
    url: process.env.BENEVITY_CONNECTOR_URL || 'http://localhost:3010',
    critical: true,
  },
  {
    name: 'goodera',
    url: process.env.GOODERA_CONNECTOR_URL || 'http://localhost:3011',
    critical: true,
  },
  {
    name: 'workday',
    url: process.env.WORKDAY_CONNECTOR_URL || 'http://localhost:3012',
    critical: true,
  },
  {
    name: 'kintell',
    url: process.env.KINTELL_CONNECTOR_URL || 'http://localhost:3013',
    critical: false,
  },
  {
    name: 'buddy',
    url: process.env.BUDDY_CONNECTOR_URL || 'http://localhost:3014',
    critical: false,
  },
  {
    name: 'upskilling',
    url: process.env.UPSKILLING_CONNECTOR_URL || 'http://localhost:3015',
    critical: false,
  },
];

// Track consecutive failures per connector
const failureCount = new Map<string, number>();

/**
 * Monitor a single connector's health
 */
export async function monitorConnectorHealth(
  connectorName: string,
  baseUrl: string,
  isCritical: boolean
): Promise<ConnectorMetrics> {
  return traceAsync(
    'synthetic.connector_health',
    async (_span) => {
      addSpanAttributes({
        'connector.name': connectorName,
        'connector.critical': isCritical,
        'monitor.route': 'connector-health',
      });

      const timestamp = Date.now();
      let metrics: ConnectorMetrics = {
        timestamp,
        connector: connectorName,
        success: false,
        healthy: false,
        responseTime: 0,
        dependencies: {
          database: false,
          redis: false,
          queue: false,
          externalAPI: false,
        },
      };

      try {
        // Check connector health endpoint
        const healthStart = Date.now();
        const healthResponse = await axios.get(`${baseUrl}/health`, {
          timeout: 5000,
          validateStatus: () => true, // Don't throw on non-2xx
        });

        const healthEnd = Date.now();
        metrics.responseTime = healthEnd - healthStart;
        metrics.statusCode = healthResponse.status;

        if (healthResponse.status !== 200) {
          throw new Error(`Health endpoint returned status ${healthResponse.status}`);
        }

        // Parse health response
        const healthData = healthResponse.data;

        // Extract health details
        metrics.healthy = healthData.status === 'healthy' || healthData.status === 'ok';
        metrics.version = healthData.version;
        metrics.uptime = healthData.uptime;
        metrics.lastSync = healthData.lastSync;

        // Check dependencies
        if (healthData.dependencies) {
          metrics.dependencies = {
            database: healthData.dependencies.database === 'healthy',
            redis: healthData.dependencies.redis === 'healthy',
            queue: healthData.dependencies.queue === 'healthy',
            externalAPI: healthData.dependencies.externalAPI === 'healthy',
          };

          // Connector is unhealthy if any critical dependency is down
          const dependencyFailures = Object.entries(metrics.dependencies)
            .filter(([_, healthy]) => !healthy)
            .map(([dep, _]) => dep);

          if (dependencyFailures.length > 0) {
            console.warn(
              `⚠️  Connector ${connectorName} has unhealthy dependencies: ${dependencyFailures.join(', ')}`
            );

            addSpanAttributes({
              'monitor.dependency_failures': dependencyFailures.join(', '),
              'monitor.severity': 'warning',
            });
          }
        }

        // Mark success
        metrics.success = true;
        failureCount.set(connectorName, 0);

        // Record metrics
        addSpanAttributes({
          'monitor.success': true,
          'monitor.healthy': metrics.healthy,
          'monitor.response_time_ms': metrics.responseTime,
          'monitor.status_code': metrics.statusCode,
          'monitor.version': metrics.version || 'unknown',
          'monitor.uptime': metrics.uptime || 0,
          'monitor.db_healthy': metrics.dependencies.database,
          'monitor.redis_healthy': metrics.dependencies.redis,
          'monitor.queue_healthy': metrics.dependencies.queue,
          'monitor.external_api_healthy': metrics.dependencies.externalAPI,
        });

        const healthStatus = metrics.healthy ? '✅' : '⚠️';
        console.log(
          `${healthStatus} Connector ${connectorName}: ${metrics.responseTime}ms, ${metrics.healthy ? 'healthy' : 'unhealthy'}`
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
        metrics.healthy = false;

        // Track consecutive failures
        const currentFailures = (failureCount.get(connectorName) || 0) + 1;
        failureCount.set(connectorName, currentFailures);

        // Alert immediately for critical connectors, after 2 failures for non-critical
        const alertThreshold = isCritical ? 1 : 2;

        if (currentFailures >= alertThreshold) {
          const severity = isCritical ? 'CRITICAL' : 'WARNING';
          console.error(
            `🚨 ${severity}: Connector ${connectorName} has ${currentFailures} consecutive failures!`
          );
          await sendAlert(connectorName, currentFailures, errorMessage, isCritical);
        } else {
          console.error(
            `❌ Connector ${connectorName} health check failed (${currentFailures}/${alertThreshold}): ${errorMessage}`
          );
        }

        // Record failure
        addSpanAttributes({
          'monitor.success': false,
          'monitor.healthy': false,
          'monitor.error': errorMessage,
          'monitor.consecutive_failures': currentFailures,
        });

        return metrics;
      }
    },
    {
      'monitor.type': 'synthetic',
      'monitor.route': 'connector-health',
      'monitor.interval_minutes': 1,
    }
  );
}

/**
 * Send alert notification
 */
async function sendAlert(
  connectorName: string,
  failureCount: number,
  error: string,
  isCritical: boolean
): Promise<void> {
  const alertPayload = {
    timestamp: new Date().toISOString(),
    severity: isCritical ? 'critical' : 'warning',
    monitor: 'connector-health',
    connector: connectorName,
    consecutiveFailures: failureCount,
    error,
    actionRequired: `Investigate ${connectorName} connector and its dependencies (database, redis, queue, external API)`,
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor all connectors
 */
export async function monitorAllConnectors(): Promise<ConnectorHealthSummary> {
  console.log(`🔍 Starting connector health monitoring for ${CONNECTORS.length} connectors...`);

  const results = await Promise.allSettled(
    CONNECTORS.map((connector) =>
      monitorConnectorHealth(connector.name, connector.url, connector.critical)
    )
  );

  const metrics: ConnectorMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        connector: CONNECTORS[index].name,
        success: false,
        healthy: false,
        responseTime: 0,
        dependencies: {
          database: false,
          redis: false,
          queue: false,
          externalAPI: false,
        },
        error: result.reason?.message || 'Monitor execution failed',
      };
    }
  });

  // Aggregate stats
  const healthyCount = metrics.filter((m) => m.healthy).length;
  const unhealthyCount = metrics.length - healthyCount;
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;

  const summary: ConnectorHealthSummary = {
    timestamp: Date.now(),
    totalConnectors: metrics.length,
    healthyConnectors: healthyCount,
    unhealthyConnectors: unhealthyCount,
    avgResponseTime,
    connectors: metrics,
  };

  console.log(`📊 Connectors Health Summary:`);
  console.log(`   - Total Connectors: ${summary.totalConnectors}`);
  console.log(`   - Healthy: ${summary.healthyConnectors}`);
  console.log(`   - Unhealthy: ${summary.unhealthyConnectors}`);
  console.log(`   - Avg Response Time: ${summary.avgResponseTime.toFixed(0)}ms`);

  // Log critical connectors separately
  const criticalUnhealthy = metrics.filter(
    (m) => !m.healthy && CONNECTORS.find((c) => c.name === m.connector)?.critical
  );

  if (criticalUnhealthy.length > 0) {
    console.error(`🚨 CRITICAL CONNECTORS UNHEALTHY:`);
    criticalUnhealthy.forEach((m) => {
      console.error(`   - ${m.connector}: ${m.error}`);
    });
  }

  return summary;
}

/**
 * Scheduled monitor execution (runs every 1 minute)
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-connector-health',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllConnectors();
  console.log(`✓ Connector health monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('Connector health monitor failed:', error);
    process.exit(1);
  });
}
