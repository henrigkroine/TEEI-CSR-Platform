/**
 * Synthetic Monitor: Boardroom Deck Display
 *
 * Monitors Boardroom deck loading and tile rendering
 * - Tests deck endpoint availability
 * - Validates tile data fetch
 * - Monitors LCP for deck display (< 1.5s target)
 * - Verifies all tiles render without errors
 *
 * Runs every 5 minutes for all pilot tenants
 * Alerts on 2 consecutive failures or slow performance
 *
 * @module synthetics/pilot-routes/boardroom-deck
 */

import { initializeOTel, traceAsync, addSpanAttributes } from '@teei/observability';
import axios, { AxiosError } from 'axios';

export interface BoardroomMetrics {
  timestamp: number;
  tenantId: string;
  success: boolean;

  // Timing metrics
  deckLoadTime: number;
  tilesLoadTime: number;
  totalTime: number;

  // Content metrics
  tilesCount: number;
  tilesSuccessful: number;
  tilesFailed: number;

  // Performance gates
  withinLCPGate: boolean; // < 1.5s
  allTilesLoaded: boolean;

  error?: string;
}

const PERFORMANCE_GATE = {
  LCP_TARGET: 1500, // 1.5 seconds (Boardroom LCP budget)
  MIN_TILES: 4, // Minimum expected tiles
  MAX_TILES: 12, // Maximum expected tiles
};

// Track consecutive failures
const failureCount = new Map<string, number>();

/**
 * Monitor Boardroom deck for a single tenant
 */
export async function monitorBoardroomDeck(
  tenantId: string,
  baseUrl: string,
  companyId: string,
  consecutiveFailureThreshold = 2
): Promise<BoardroomMetrics> {
  return traceAsync(
    'synthetic.boardroom_deck',
    async (_span) => {
      addSpanAttributes({
        'tenant.id': tenantId,
        'company.id': companyId,
        'monitor.route': 'boardroom-deck',
      });

      const timestamp = Date.now();
      let metrics: BoardroomMetrics = {
        timestamp,
        tenantId,
        success: false,
        deckLoadTime: 0,
        tilesLoadTime: 0,
        totalTime: 0,
        tilesCount: 0,
        tilesSuccessful: 0,
        tilesFailed: 0,
        withinLCPGate: false,
        allTilesLoaded: false,
      };

      try {
        // Step 1: Load Boardroom deck page
        const deckStart = Date.now();
        const deckResponse = await axios.get(
          `${baseUrl}/boardroom/${companyId}`,
          {
            timeout: 10000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Accept': 'text/html,application/json',
            },
            validateStatus: () => true,
          }
        );

        if (deckResponse.status !== 200) {
          throw new Error(`Boardroom deck returned status ${deckResponse.status}`);
        }

        const deckEnd = Date.now();
        metrics.deckLoadTime = deckEnd - deckStart;

        // Step 2: Fetch tiles data
        const tilesStart = Date.now();
        const tilesResponse = await axios.get(
          `${baseUrl}/api/companies/${companyId}/boardroom/tiles`,
          {
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${process.env.SYNTHETIC_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (tilesResponse.status !== 200) {
          throw new Error(`Tiles API returned status ${tilesResponse.status}`);
        }

        const tilesEnd = Date.now();
        metrics.tilesLoadTime = tilesEnd - tilesStart;
        metrics.totalTime = tilesEnd - deckStart;

        // Validate tiles data
        const tilesData = tilesResponse.data;
        if (!Array.isArray(tilesData.tiles)) {
          throw new Error('Invalid tiles response: expected array');
        }

        metrics.tilesCount = tilesData.tiles.length;

        // Validate tile count
        if (metrics.tilesCount < PERFORMANCE_GATE.MIN_TILES) {
          console.warn(
            `⚠️  Too few tiles for ${tenantId}: ${metrics.tilesCount} < ${PERFORMANCE_GATE.MIN_TILES}`
          );
        }

        if (metrics.tilesCount > PERFORMANCE_GATE.MAX_TILES) {
          console.warn(
            `⚠️  Too many tiles for ${tenantId}: ${metrics.tilesCount} > ${PERFORMANCE_GATE.MAX_TILES}`
          );
        }

        // Step 3: Validate each tile loaded successfully
        const tileResults = tilesData.tiles.map((tile: any) => {
          const hasMetric = tile.value !== undefined && tile.value !== null;
          const hasLabel = typeof tile.label === 'string';
          const hasType = typeof tile.type === 'string';

          return hasMetric && hasLabel && hasType;
        });

        metrics.tilesSuccessful = tileResults.filter(Boolean).length;
        metrics.tilesFailed = metrics.tilesCount - metrics.tilesSuccessful;
        metrics.allTilesLoaded = metrics.tilesFailed === 0;

        if (metrics.tilesFailed > 0) {
          console.warn(
            `⚠️  ${metrics.tilesFailed} tiles failed to load for ${tenantId}`
          );

          addSpanAttributes({
            'monitor.tiles_failed': metrics.tilesFailed,
            'monitor.severity': 'warning',
          });
        }

        // Step 4: Check LCP performance gate
        metrics.withinLCPGate = metrics.totalTime <= PERFORMANCE_GATE.LCP_TARGET;

        if (!metrics.withinLCPGate) {
          console.warn(
            `⚠️  Boardroom LCP slow for ${tenantId}: ${metrics.totalTime}ms > ${PERFORMANCE_GATE.LCP_TARGET}ms`
          );

          addSpanAttributes({
            'monitor.lcp_gate_exceeded': true,
            'monitor.gate_ms': PERFORMANCE_GATE.LCP_TARGET,
            'monitor.actual_ms': metrics.totalTime,
          });
        }

        // Mark success if all critical checks pass
        metrics.success = metrics.allTilesLoaded;
        failureCount.set(tenantId, 0);

        // Record metrics
        addSpanAttributes({
          'monitor.success': metrics.success,
          'monitor.total_time_ms': metrics.totalTime,
          'monitor.deck_load_time_ms': metrics.deckLoadTime,
          'monitor.tiles_load_time_ms': metrics.tilesLoadTime,
          'monitor.tiles_count': metrics.tilesCount,
          'monitor.tiles_successful': metrics.tilesSuccessful,
          'monitor.tiles_failed': metrics.tilesFailed,
          'monitor.within_lcp_gate': metrics.withinLCPGate,
          'monitor.all_tiles_loaded': metrics.allTilesLoaded,
        });

        const gateStatus = metrics.withinLCPGate ? '✅' : '⚠️';
        console.log(
          `${gateStatus} Tenant ${tenantId} Boardroom: ${metrics.totalTime}ms, ${metrics.tilesSuccessful}/${metrics.tilesCount} tiles`
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
            `🚨 ALERT: Tenant ${tenantId} Boardroom has ${currentFailures} consecutive failures!`
          );
          await sendAlert(tenantId, currentFailures, errorMessage);
        } else {
          console.error(
            `❌ Tenant ${tenantId} Boardroom failed (${currentFailures}/${consecutiveFailureThreshold}): ${errorMessage}`
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
      'monitor.route': 'boardroom-deck',
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
    monitor: 'boardroom-deck',
    tenantId,
    consecutiveFailures: failureCount,
    error,
    actionRequired: 'Investigate Boardroom service and tiles API availability',
  };

  console.error('SYNTHETIC_MONITOR_ALERT', JSON.stringify(alertPayload, null, 2));
}

/**
 * Monitor all pilot tenants
 */
export async function monitorAllBoardrooms(): Promise<BoardroomMetrics[]> {
  const pilotTenants = [
    { id: 'acme-corp', url: 'https://acme.teei-platform.com', companyId: 'acme-001' },
    { id: 'globex-inc', url: 'https://globex.teei-platform.com', companyId: 'globex-001' },
    { id: 'initech-ltd', url: 'https://initech.teei-platform.com', companyId: 'initech-001' },
  ];

  console.log(`🔍 Starting Boardroom monitoring for ${pilotTenants.length} pilot tenants...`);

  const results = await Promise.allSettled(
    pilotTenants.map((tenant) => monitorBoardroomDeck(tenant.id, tenant.url, tenant.companyId))
  );

  const metrics: BoardroomMetrics[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        timestamp: Date.now(),
        tenantId: pilotTenants[index].id,
        success: false,
        deckLoadTime: 0,
        tilesLoadTime: 0,
        totalTime: 0,
        tilesCount: 0,
        tilesSuccessful: 0,
        tilesFailed: 0,
        withinLCPGate: false,
        allTilesLoaded: false,
        error: result.reason?.message || 'Monitor execution failed',
      };
    }
  });

  // Aggregate stats
  const successCount = metrics.filter((m) => m.success).length;
  const lcpCompliant = metrics.filter((m) => m.withinLCPGate).length;
  const avgTotalTime = metrics.reduce((sum, m) => sum + m.totalTime, 0) / metrics.length;
  const avgTilesCount = metrics.reduce((sum, m) => sum + m.tilesCount, 0) / metrics.length;

  console.log(`📊 Boardroom Summary:`);
  console.log(`   - Total Tests: ${metrics.length}`);
  console.log(`   - Successful: ${successCount}`);
  console.log(`   - LCP Compliant: ${lcpCompliant}/${metrics.length}`);
  console.log(`   - Avg Load Time: ${avgTotalTime.toFixed(0)}ms`);
  console.log(`   - Avg Tiles Count: ${avgTilesCount.toFixed(1)}`);

  return metrics;
}

/**
 * Scheduled monitor execution
 */
export async function runScheduledMonitor(): Promise<void> {
  initializeOTel({
    serviceName: 'synthetics-boardroom',
    environment: process.env.NODE_ENV || 'production',
    exporterType: 'otlp',
  });

  await monitorAllBoardrooms();
  console.log(`✓ Boardroom monitoring complete at ${new Date().toISOString()}`);
}

if (require.main === module) {
  runScheduledMonitor().catch((error) => {
    console.error('Boardroom monitor failed:', error);
    process.exit(1);
  });
}
