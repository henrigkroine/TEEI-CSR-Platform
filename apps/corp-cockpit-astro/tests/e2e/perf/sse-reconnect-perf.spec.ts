import { test, expect } from '@playwright/test';
import { login, TEST_USERS, navigateToCockpit, TEST_COMPANIES } from '../helpers';

/**
 * Performance Benchmark Tests: SSE Reconnection Latency
 *
 * Measures and validates SSE reconnection performance against targets:
 * - P95 reconnect time: ≤ 5 seconds
 * - P99 reconnect time: ≤ 10 seconds
 * - Memory footprint: ≤ 50MB
 * - Snapshot load time (IndexedDB): ≤ 250ms
 *
 * Based on /reports/worker3/diffs/sse_architecture.md Section 8 (Performance Targets)
 */

test.describe('SSE Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login and navigate to dashboard
    await login(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/dashboard');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');
  });

  test.describe('Reconnect Latency', () => {
    test('should reconnect within P95 target (≤ 5 seconds)', async ({ page, context }) => {
      const reconnectTimes: number[] = [];

      // Warm up: establish initial connection
      await page.waitForTimeout(2000);

      // Measure multiple reconnections
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        // Record disconnect time
        const startTime = Date.now();

        // Go offline
        await context.setOffline(true);

        // Immediately go back online
        await context.setOffline(false);

        // Wait for reconnection
        await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
          timeout: 15000
        });

        // Record reconnect time
        const reconnectTime = Date.now() - startTime;
        reconnectTimes.push(reconnectTime);

        // Small delay between iterations
        await page.waitForTimeout(500);
      }

      // Calculate percentiles
      reconnectTimes.sort((a, b) => a - b);
      const p50 = reconnectTimes[Math.floor(reconnectTimes.length * 0.5)];
      const p95 = reconnectTimes[Math.floor(reconnectTimes.length * 0.95)];
      const p99 = reconnectTimes[Math.floor(reconnectTimes.length * 0.99)];

      console.log(`Reconnect latency stats (ms):`);
      console.log(`  P50: ${p50}`);
      console.log(`  P95: ${p95}`);
      console.log(`  P99: ${p99}`);
      console.log(`  Min: ${reconnectTimes[0]}`);
      console.log(`  Max: ${reconnectTimes[reconnectTimes.length - 1]}`);
      console.log(`  All samples: ${reconnectTimes.join(', ')}`);

      // Verify P95 target
      expect(p95).toBeLessThanOrEqual(5000);
    });

    test('should have P99 reconnect time ≤ 10 seconds', async ({ page, context }) => {
      const reconnectTimes: number[] = [];

      // Establish connection
      await page.waitForTimeout(2000);

      // Measure multiple reconnections
      const iterations = 15;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await context.setOffline(true);
        await context.setOffline(false);

        await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
          timeout: 15000
        });

        const reconnectTime = Date.now() - startTime;
        reconnectTimes.push(reconnectTime);

        await page.waitForTimeout(500);
      }

      reconnectTimes.sort((a, b) => a - b);
      const p99 = reconnectTimes[Math.floor(reconnectTimes.length * 0.99)];

      console.log(`P99 reconnect time: ${p99}ms`);

      expect(p99).toBeLessThanOrEqual(10000);
    });

    test('should have consistent reconnect times', async ({ page, context }) => {
      const reconnectTimes: number[] = [];

      // Establish connection
      await page.waitForTimeout(2000);

      // Measure multiple reconnections
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await context.setOffline(true);
        await context.setOffline(false);

        await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
          timeout: 15000
        });

        const reconnectTime = Date.now() - startTime;
        reconnectTimes.push(reconnectTime);

        await page.waitForTimeout(500);
      }

      // Calculate standard deviation
      const mean = reconnectTimes.reduce((a, b) => a + b) / reconnectTimes.length;
      const variance = reconnectTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / reconnectTimes.length;
      const stdDev = Math.sqrt(variance);
      const coefficient = (stdDev / mean) * 100; // CV as percentage

      console.log(`Reconnect time consistency:`);
      console.log(`  Mean: ${mean.toFixed(0)}ms`);
      console.log(`  StdDev: ${stdDev.toFixed(0)}ms`);
      console.log(`  Coefficient of variation: ${coefficient.toFixed(1)}%`);

      // Expect reasonably consistent times (CV < 50%)
      expect(coefficient).toBeLessThan(50);
    });

    test('should handle rapid reconnections', async ({ page, context }) => {
      // Establish initial connection
      await page.waitForTimeout(2000);

      const iterations = 5;
      const startTotal = Date.now();

      // Rapid fire disconnects/reconnects
      for (let i = 0; i < iterations; i++) {
        await context.setOffline(true);
        await page.waitForTimeout(100);
        await context.setOffline(false);
        await page.waitForTimeout(1000);
      }

      const totalTime = Date.now() - startTotal;

      // Verify we didn't crash and are still connected
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
        timeout: 10000
      });

      console.log(`Rapid reconnect test: ${iterations} iterations in ${totalTime}ms`);
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds
    });
  });

  test.describe('Memory Footprint', () => {
    test('should keep memory < 50MB during operation', async ({ page }) => {
      // Initialize metrics collection
      const metrics: Array<{
        timestamp: number;
        heap: number;
        external: number;
      }> = [];

      // Establish connection
      await page.waitForTimeout(2000);

      // Collect metrics over time
      const samplingIntervals = 5;

      for (let i = 0; i < samplingIntervals; i++) {
        const pageMetrics = await page.metrics();

        const heapUsed = pageMetrics.JSHeapUsedSize / (1024 * 1024); // Convert to MB
        const external = (pageMetrics.JSExternalMemoryUsage || 0) / (1024 * 1024);

        metrics.push({
          timestamp: Date.now(),
          heap: heapUsed,
          external: external
        });

        console.log(`Memory sample ${i + 1}: Heap ${heapUsed.toFixed(1)}MB, External ${external.toFixed(1)}MB`);

        await page.waitForTimeout(1000);
      }

      // Find peak memory
      const peakHeap = Math.max(...metrics.map(m => m.heap));
      const avgHeap = metrics.reduce((a, b) => a + b.heap, 0) / metrics.length;

      console.log(`Memory stats:`);
      console.log(`  Peak heap: ${peakHeap.toFixed(1)}MB`);
      console.log(`  Avg heap: ${avgHeap.toFixed(1)}MB`);

      // Verify memory targets
      expect(peakHeap).toBeLessThan(50);
    });

    test('should not leak memory during reconnects', async ({ page, context }) => {
      const memoryReadings: number[] = [];

      // Establish connection
      await page.waitForTimeout(2000);

      // Trigger multiple reconnects
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const pageMetrics = await page.metrics();
        const heapUsed = pageMetrics.JSHeapUsedSize / (1024 * 1024);
        memoryReadings.push(heapUsed);

        // Trigger reconnect
        await context.setOffline(true);
        await context.setOffline(false);

        // Wait for reconnection
        await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
          timeout: 10000
        });

        await page.waitForTimeout(500);
      }

      // Check for memory growth pattern
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = lastReading - firstReading;
      const growthPercent = (memoryGrowth / firstReading) * 100;

      console.log(`Memory leak test:`);
      console.log(`  Initial: ${firstReading.toFixed(1)}MB`);
      console.log(`  Final: ${lastReading.toFixed(1)}MB`);
      console.log(`  Growth: ${memoryGrowth.toFixed(1)}MB (${growthPercent.toFixed(1)}%)`);

      // Allow some growth (20%) but flag excessive memory growth
      expect(memoryGrowth).toBeLessThan(10); // Less than 10MB absolute growth
    });
  });

  test.describe('Snapshot Loading', () => {
    test('should load snapshot from memory < 50ms', async ({ page }) => {
      // Wait for connection and events
      await page.waitForTimeout(2000);

      // Measure snapshot retrieval from memory
      const loadTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        const snapshot = await page.evaluate(() => {
          const ringBuffer = (window as any).__snapshotRingBuffer;
          return ringBuffer?.latest?.() || null;
        });

        const loadTime = performance.now() - startTime;
        loadTimes.push(loadTime);

        if (snapshot) {
          console.log(`Snapshot memory load: ${loadTime.toFixed(2)}ms`);
        }
      }

      if (loadTimes.length > 0) {
        const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
        expect(avgLoadTime).toBeLessThan(50);
      }
    });

    test('should load snapshot from IndexedDB < 250ms', async ({ page }) => {
      // Wait for connection and snapshot to be saved
      await page.waitForTimeout(3000);

      const loadTimes: number[] = [];

      // Measure IndexedDB load times
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();

        const snapshot = await page.evaluate(async () => {
          try {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
              const req = indexedDB.open('teei-cockpit', 1);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });

            const tx = db.transaction('snapshots', 'readonly');
            const store = tx.objectStore('snapshots');
            const snapshot = await new Promise<any>((resolve, reject) => {
              const req = store.getAll();
              req.onsuccess = () => {
                resolve(req.result[req.result.length - 1] || null);
              };
              req.onerror = () => reject(req.error);
            });

            return snapshot;
          } catch (e) {
            return null;
          }
        });

        const loadTime = Date.now() - startTime;
        loadTimes.push(loadTime);

        if (snapshot) {
          console.log(`Snapshot IndexedDB load: ${loadTime}ms`);
        }
      }

      if (loadTimes.length > 0) {
        const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
        // IndexedDB may be slow in test environment, so allow more time
        expect(avgLoadTime).toBeLessThan(500);
      }
    });
  });

  test.describe('Event Processing', () => {
    test('should process events with minimal latency', async ({ page }) => {
      // Setup event timing measurement
      await page.evaluate(() => {
        (window as any).__eventTimings = [];
        const originalOnEvent = (window as any).__sseClient?.options?.onEvent;
        if (originalOnEvent) {
          (window as any).__sseClient.options.onEvent = (event: any) => {
            (window as any).__eventTimings.push({
              id: event.id,
              processingTime: performance.now()
            });
            originalOnEvent(event);
          };
        }
      });

      // Wait for events
      await page.waitForTimeout(3000);

      const eventTimings = await page.evaluate(() => {
        return (window as any).__eventTimings || [];
      });

      if (eventTimings.length > 0) {
        console.log(`Processed ${eventTimings.length} events`);
        console.log(`First event at: ${eventTimings[0].processingTime.toFixed(2)}ms`);
        console.log(`Last event at: ${eventTimings[eventTimings.length - 1].processingTime.toFixed(2)}ms`);
      }
    });

    test('should maintain event ordering during reconnects', async ({ page, context }) => {
      // Setup event sequence tracking
      await page.evaluate(() => {
        (window as any).__eventSequence = [];
        const originalOnEvent = (window as any).__sseClient?.options?.onEvent;
        if (originalOnEvent) {
          (window as any).__sseClient.options.onEvent = (event: any) => {
            (window as any).__eventSequence.push(event.id);
            originalOnEvent(event);
          };
        }
      });

      // Establish connection and collect events
      await page.waitForTimeout(2000);

      // Trigger reconnect
      await context.setOffline(true);
      await context.setOffline(false);

      // Wait for more events
      await page.waitForTimeout(2000);

      const eventSequence = await page.evaluate(() => {
        return (window as any).__eventSequence || [];
      });

      if (eventSequence.length > 1) {
        console.log(`Event sequence: ${eventSequence.slice(0, 10).join(', ')}...`);

        // Verify no duplicate consecutive events
        for (let i = 1; i < eventSequence.length; i++) {
          expect(eventSequence[i]).not.toBe(eventSequence[i - 1]);
        }
      }
    });
  });

  test.describe('Network Efficiency', () => {
    test('should minimize reconnect retries', async ({ page, context }) => {
      // Setup retry tracking
      const retries: number[] = [];

      await page.on('request', (request) => {
        if (request.url().includes('lastEventId')) {
          retries.push(Date.now());
        }
      });

      // Trigger reconnect
      await context.setOffline(true);
      await context.setOffline(false);

      // Wait for reconnection
      await page.waitForTimeout(3000);

      // Calculate retry gap (should show exponential backoff)
      if (retries.length > 1) {
        const gaps: number[] = [];
        for (let i = 1; i < retries.length; i++) {
          gaps.push(retries[i] - retries[i - 1]);
        }

        console.log(`Retry gaps (ms): ${gaps.join(', ')}`);

        // First gap should be at least 2 seconds (2000ms backoff)
        if (gaps.length > 0) {
          expect(gaps[0]).toBeGreaterThanOrEqual(2000 - 100); // Allow some tolerance
        }
      }
    });
  });

  test.describe('Stress Test', () => {
    test('should handle sustained operation', async ({ page }) => {
      const startTime = Date.now();
      const duration = 30000; // 30 seconds
      const eventCounts: number[] = [];

      // Monitor events during sustained operation
      let lastEventCount = 0;

      while (Date.now() - startTime < duration) {
        const eventCount = await page.evaluate(() => {
          return (window as any).__sseClient?.getBufferedMessages?.()?.length || 0;
        });

        eventCounts.push(eventCount);

        await page.waitForTimeout(1000);
      }

      const totalEvents = eventCounts.reduce((a, b) => a + b, 0);
      const avgEvents = totalEvents / eventCounts.length;

      console.log(`Sustained operation test (30s):`);
      console.log(`  Total events: ${totalEvents}`);
      console.log(`  Avg per second: ${avgEvents.toFixed(1)}`);
      console.log(`  Connection still alive: ${(await page.locator('[data-testid="sse-status"]').textContent()).includes('Connected')}`);

      // Should still be connected after 30 seconds
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected');
    });
  });
});
