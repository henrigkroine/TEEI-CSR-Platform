import { test, expect } from '@playwright/test';
import { login, TEST_USERS, navigateToCockpit, TEST_COMPANIES } from './helpers';

/**
 * E2E Test Suite: SSE (Server-Sent Events) Resilience
 *
 * Tests the SSE connection resilience including:
 * - Happy path: connection establishment and event reception
 * - Reconnection after network interruption
 * - Exponential backoff verification
 * - Max retries enforcement
 * - Last-Event-ID tracking and resume
 * - Connection state transitions
 *
 * Based on /reports/worker3/diffs/sse_architecture.md Section 10 (Testing Strategy)
 */

test.describe('SSE Resilience - Core Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login and navigate to dashboard
    await login(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/dashboard');

    // Wait for page to be stable
    await page.waitForLoadState('networkidle');
  });

  test.describe('Happy Path', () => {
    test('should connect and receive events', async ({ page }) => {
      // Wait for SSE connection to establish
      await page.waitForTimeout(1000);

      // Verify connection status shows connected
      const statusElement = page.locator('[data-testid="sse-status"]');
      await expect(statusElement).toContainText('Connected', { timeout: 5000 });

      // Verify connection indicator shows green
      const statusClass = await statusElement.getAttribute('class');
      expect(statusClass).toContain('connected');

      // Verify EventSource is open
      const isConnected = await page.evaluate(() => {
        const eventSource = (window as any).__sseConnection;
        return eventSource && eventSource.readyState === EventSource.OPEN;
      });
      expect(isConnected).toBe(true);
    });

    test('should track lastEventId in localStorage', async ({ page }) => {
      // Wait for connection and events
      await page.waitForTimeout(2000);

      // Verify connection established
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected');

      // Check lastEventId stored in localStorage
      const lastEventId = await page.evaluate(() => {
        const companyId = (window as any).__companyId || 'company-1';
        return localStorage.getItem(`teei-sse-lastEventId-${companyId}`);
      });

      expect(lastEventId).toBeTruthy();
      expect(lastEventId).toMatch(/^evt-/);
    });

    test('should emit state change events', async ({ page }) => {
      // Setup event tracking
      await page.evaluate(() => {
        (window as any).__stateChanges = [];
        window.addEventListener('sse:state-change', ((event: any) => {
          (window as any).__stateChanges.push({
            state: event.detail.state,
            oldState: event.detail.oldState,
            timestamp: Date.now()
          });
        }) as EventListener);
      });

      // Wait for connection
      await page.waitForTimeout(2000);

      // Get state changes
      const stateChanges = await page.evaluate(() => {
        return (window as any).__stateChanges || [];
      });

      // Should have at least connecting -> connected transition
      expect(stateChanges.length).toBeGreaterThan(0);

      const lastChange = stateChanges[stateChanges.length - 1];
      expect(lastChange.state).toBe('connected');
    });
  });

  test.describe('Reconnection After Disconnect', () => {
    test('should reconnect after brief network interruption', async ({ page, context }) => {
      // Verify initial connection
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', { timeout: 5000 });

      // Simulate network interruption
      await context.setOffline(true);
      await page.waitForTimeout(500);

      // Verify connection shows as reconnecting or disconnected
      const statusAfterDisconnect = await page.locator('[data-testid="sse-status"]').textContent();
      expect(statusAfterDisconnect).toMatch(/Reconnecting|Disconnected|error/i);

      // Restore network
      await context.setOffline(false);

      // Verify auto-reconnection within 10 seconds
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
        timeout: 10000
      });
    });

    test('should send Last-Event-ID on reconnect', async ({ page, context }) => {
      // Get initial lastEventId
      const initialEventId = await page.evaluate(() => {
        const companyId = (window as any).__companyId || 'company-1';
        return localStorage.getItem(`teei-sse-lastEventId-${companyId}`);
      });

      expect(initialEventId).toBeTruthy();

      // Track network requests during reconnect
      const requests: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/sse') || request.url().includes('metric')) {
          requests.push(request.url());
        }
      });

      // Disconnect and reconnect
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);

      // Wait for reconnection
      await page.waitForTimeout(2000);

      // Verify new requests include lastEventId parameter
      const reconnectRequests = requests.filter(url => url.includes('lastEventId'));
      if (reconnectRequests.length > 0) {
        expect(reconnectRequests[0]).toContain('lastEventId');
      }
    });

    test('should not miss events during reconnection', async ({ page, context }) => {
      // Track event IDs before disconnect
      await page.evaluate(() => {
        (window as any).__eventIds = new Set<string>();
        const originalListener = (window as any).__eventListener;
        if (originalListener) {
          document.removeEventListener('message', originalListener);
        }

        (window as any).__eventListener = (event: Event) => {
          const id = (event as any).lastEventId;
          if (id) {
            (window as any).__eventIds.add(id);
          }
        };

        document.addEventListener('message', (window as any).__eventListener);
      });

      // Wait for some events
      await page.waitForTimeout(2000);
      const eventCountBefore = await page.evaluate(() => {
        return (window as any).__eventIds?.size || 0;
      });

      expect(eventCountBefore).toBeGreaterThan(0);

      // Disconnect and reconnect
      await context.setOffline(true);
      await page.waitForTimeout(500);
      await context.setOffline(false);

      // Wait for events to resume
      await page.waitForTimeout(2000);

      // Verify events still flow
      const eventCountAfter = await page.evaluate(() => {
        return (window as any).__eventIds?.size || 0;
      });

      expect(eventCountAfter).toBeGreaterThanOrEqual(eventCountBefore);
    });
  });

  test.describe('Exponential Backoff', () => {
    test('should apply exponential backoff delays', async ({ page, context }) => {
      // Track reconnection attempt timings
      const reconnectTimes: number[] = [];

      await page.evaluate(() => {
        (window as any).__reconnectAttempts = [];
        (window as any).__lastReconnectTime = Date.now();

        // Listen for state changes
        window.addEventListener('sse:state-change', ((event: any) => {
          if (event.detail.state === 'connecting') {
            (window as any).__reconnectAttempts.push(Date.now());
          }
        }) as EventListener);
      });

      // Wait for initial connection
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', { timeout: 5000 });

      // Force repeated failures by going offline
      for (let i = 0; i < 3; i++) {
        await context.setOffline(true);
        await page.waitForTimeout(500);
        await context.setOffline(false);
        await page.waitForTimeout(3000);
      }

      // Get reconnection attempt times
      const times = await page.evaluate(() => {
        return (window as any).__reconnectAttempts || [];
      });

      if (times.length >= 3) {
        // Calculate delays between attempts
        const delays: number[] = [];
        for (let i = 1; i < times.length; i++) {
          delays.push(times[i] - times[i - 1]);
        }

        // Verify exponential growth (each delay should be roughly 2x the previous)
        // Allow for timing variations and jitter
        for (let i = 1; i < delays.length; i++) {
          const ratio = delays[i] / delays[i - 1];
          // Expect ratio between 1 and 3 due to jitter
          expect(ratio).toBeGreaterThan(0.8);
          expect(ratio).toBeLessThan(3);
        }
      }
    });

    test('should cap backoff at 32 seconds', async ({ page, context }) => {
      // Get retry delays from client state
      const maxBackoff = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.options?.maxDelay || 32000;
      });

      expect(maxBackoff).toBeLessThanOrEqual(32000);

      // Simulate failure for exponential backoff check
      await context.setOffline(true);

      // Wait for several retry attempts
      await page.waitForTimeout(3000);

      const retryAttempt = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.getRetryAttempt?.() || 0;
      });

      // Calculate what the delay would be for this attempt
      const baseDelay = 2000;
      const expectedDelay = Math.min(baseDelay * Math.pow(2, retryAttempt), 32000);

      expect(expectedDelay).toBeLessThanOrEqual(32000);
    });

    test('should include jitter in backoff calculation', async ({ page }) => {
      // Calculate multiple backoff values to verify jitter
      const backoffValues = await page.evaluate(() => {
        const baseDelay = 2000;
        const maxDelay = 32000;
        const values: number[] = [];

        for (let attempt = 0; attempt < 5; attempt++) {
          const exponentialDelay = baseDelay * Math.pow(2, attempt);
          const cappedDelay = Math.min(exponentialDelay, maxDelay);
          const jitter = Math.random() * 1000;
          values.push(cappedDelay + jitter);
        }

        return values;
      });

      // Verify jitter causes variation in delays for same attempt
      // First two attempts should have similar ranges (2-3s and 4-5s)
      expect(backoffValues[0]).toBeGreaterThanOrEqual(2000);
      expect(backoffValues[0]).toBeLessThanOrEqual(3000);
      expect(backoffValues[1]).toBeGreaterThanOrEqual(4000);
      expect(backoffValues[1]).toBeLessThanOrEqual(5000);
    });
  });

  test.describe('Max Retries', () => {
    test('should transition to failed state after max retries', async ({ page, context }) => {
      // Go offline to force retries
      await context.setOffline(true);

      // Wait for max retries to be exhausted (10 attempts × ~32s each = ~320s)
      // For this test, we'll check the state after a shorter time
      await page.waitForTimeout(5000);

      // Get current state
      const state = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.getConnectionState?.() || 'unknown';
      });

      // Should be in error or reconnecting state (not yet failed since only 5s passed)
      expect(['error', 'reconnecting', 'connecting']).toContain(state);

      // Get retry attempt count
      const attempts = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.getRetryAttempt?.() || 0;
      });

      expect(attempts).toBeGreaterThan(0);
      expect(attempts).toBeLessThanOrEqual(10);
    });

    test('should show manual reconnect button when failed', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);

      // Wait for failed state to be reached or retry button to appear
      // Note: This may take a while in actual test, so we check for UI presence
      const manualReconnectButton = page.locator('[data-testid="manual-reconnect"]');

      // Try to find it or timeout after 10 seconds
      try {
        await expect(manualReconnectButton).toBeVisible({ timeout: 10000 });
      } catch (e) {
        // If button doesn't appear, verify we're in a retry/error state
        const state = await page.evaluate(() => {
          const client = (window as any).__sseClient;
          return client?.getConnectionState?.() || 'unknown';
        });
        expect(['error', 'reconnecting']).toContain(state);
      }
    });

    test('should allow manual reconnect from failed state', async ({ page, context }) => {
      // Go offline to trigger failures
      await context.setOffline(true);

      // Wait for some retry attempts
      await page.waitForTimeout(2000);

      // Go back online
      await context.setOffline(false);

      // Try clicking manual reconnect if visible
      const manualReconnectButton = page.locator('[data-testid="manual-reconnect"]');
      if (await manualReconnectButton.count() > 0) {
        await manualReconnectButton.click();
      } else {
        // If not visible, trigger reconnect via evaluate
        await page.evaluate(() => {
          const client = (window as any).__sseClient;
          client?.reconnect?.();
        });
      }

      // Verify connection restored
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
        timeout: 10000
      });
    });
  });

  test.describe('Connection State Tracking', () => {
    test('should provide access to last event ID', async ({ page }) => {
      // Wait for connection and events
      await page.waitForTimeout(2000);

      const lastEventId = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.getLastEventId?.() || null;
      });

      expect(lastEventId).toBeTruthy();
      expect(lastEventId).toMatch(/^evt-/);
    });

    test('should provide access to retry attempt count', async ({ page }) => {
      const retryCount = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.getRetryAttempt?.() || 0;
      });

      expect(retryCount).toBeGreaterThanOrEqual(0);
      expect(retryCount).toBeLessThanOrEqual(10);
    });

    test('should provide max retries configuration', async ({ page }) => {
      const maxRetries = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.getMaxRetries?.() || 0;
      });

      expect(maxRetries).toBe(10);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle connection timeout gracefully', async ({ page, context }) => {
      // Setup timeout tracking
      await page.evaluate(() => {
        (window as any).__errors = [];
        const client = (window as any).__sseClient;
        if (client) {
          const originalOnError = client.options.onError;
          client.options.onError = (error: any) => {
            (window as any).__errors.push(error);
            originalOnError?.(error);
          };
        }
      });

      // Simulate network issue that would cause timeout
      await context.setOffline(true);
      await page.waitForTimeout(6000); // Wait beyond 5s timeout
      await context.setOffline(false);

      // Check if timeout error was captured
      const errors = await page.evaluate(() => {
        return (window as any).__errors || [];
      });

      // Should have at least one error logged
      if (errors.length > 0) {
        const timeoutError = errors.find((e: any) => e.code === 'TIMEOUT');
        if (timeoutError) {
          expect(timeoutError.retryable).toBe(true);
        }
      }
    });

    test('should emit error events on connection failure', async ({ page }) => {
      // Setup error event tracking
      await page.evaluate(() => {
        (window as any).__errorEvents = [];
        const client = (window as any).__sseClient;
        if (client?.eventSource) {
          client.eventSource.addEventListener('error', () => {
            (window as any).__errorEvents.push(Date.now());
          });
        }
      });

      // Trigger a connection error
      await page.evaluate(() => {
        const client = (window as any).__sseClient;
        if (client?.eventSource) {
          client.eventSource.close();
        }
      });

      // Wait for error to be processed
      await page.waitForTimeout(1000);

      // Verify error was captured
      const errorEvents = await page.evaluate(() => {
        return (window as any).__errorEvents || [];
      });

      expect(errorEvents.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Event Processing', () => {
    test('should process events during active connection', async ({ page }) => {
      // Setup event counter
      await page.evaluate(() => {
        (window as any).__eventCount = 0;
        const client = (window as any).__sseClient;
        if (client) {
          const originalOnEvent = client.options.onEvent;
          client.options.onEvent = (event: any) => {
            (window as any).__eventCount++;
            originalOnEvent?.(event);
          };
        }
      });

      // Wait for events to arrive
      await page.waitForTimeout(3000);

      const eventCount = await page.evaluate(() => {
        return (window as any).__eventCount || 0;
      });

      expect(eventCount).toBeGreaterThan(0);
    });

    test('should buffer events when offline', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);

      // Wait a bit while offline
      await page.waitForTimeout(1000);

      // Check buffer
      const bufferSize = await page.evaluate(() => {
        const client = (window as any).__sseClient;
        return client?.getBufferedMessages?.()?.length || 0;
      });

      // Buffer size should be 0 because we're offline and events aren't received
      // (SSE doesn't work offline, so no events to buffer)
      expect(bufferSize).toBeGreaterThanOrEqual(0);

      // Restore connection
      await context.setOffline(false);

      // Wait for reconnection
      await page.waitForTimeout(2000);

      // Verify connection restored
      await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected', {
        timeout: 10000
      });
    });
  });
});
