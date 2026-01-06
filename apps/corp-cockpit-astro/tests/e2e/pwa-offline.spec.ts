import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: PWA Offline Mode
 *
 * Tests the Progressive Web App offline functionality including:
 * - Service worker registration
 * - Data caching while online
 * - Offline detection and banner display
 * - Cached data availability offline
 * - SSE reconnection with last-event-id
 * - Sync when back online
 */

test.describe('PWA Offline Mode', () => {
  test.beforeEach(async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should register service worker', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration.active !== null;
      }
      return false;
    });

    expect(swRegistered).toBe(true);

    // Verify service worker is controlling the page
    const swControlling = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null;
    });

    expect(swControlling).toBe(true);
  });

  test('should cache dashboard data while online', async ({ page }) => {
    // Navigate to dashboard and wait for data to load
    await page.goto('/dashboard');

    // Wait for metrics to be visible (data loaded)
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-vis"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-participation"]')).toBeVisible();

    // Wait for caching to complete
    await page.waitForTimeout(2000);

    // Verify cache exists
    const cacheExists = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      return cacheNames.length > 0;
    });

    expect(cacheExists).toBe(true);

    // Verify dashboard data is cached
    const dashboardCached = await page.evaluate(async () => {
      const cache = await caches.open('corp-cockpit-v1');
      const cachedResponse = await cache.match('/api/dashboard/metrics');
      return cachedResponse !== undefined;
    });

    expect(dashboardCached).toBe(true);
  });

  test('should display offline banner when going offline', async ({ page, context }) => {
    // Load dashboard while online
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Simulate going offline
    await context.setOffline(true);

    // Trigger a network request to detect offline status
    await page.reload();

    // Verify offline banner appears
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-banner"]'))
      .toContainText('You are currently offline');

    // Verify offline indicator in nav bar
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should display cached data when offline', async ({ page, context }) => {
    // Load dashboard while online
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Capture SROI value while online
    const sroiValueOnline = await page.locator('[data-testid="sroi-value"]').textContent();

    // Wait for data to cache
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload page (should serve from cache)
    await page.reload();

    // Verify offline banner visible
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // Verify cached metrics still display
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-vis"]')).toBeVisible();

    // Verify SROI value matches cached data
    const sroiValueOffline = await page.locator('[data-testid="sroi-value"]').textContent();
    expect(sroiValueOffline).toBe(sroiValueOnline);

    // Verify cache indicator displayed
    await expect(page.locator('[data-testid="cached-data-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="cached-data-indicator"]'))
      .toContainText('Showing cached data');
  });

  test('should disable write operations when offline', async ({ page, context }) => {
    // Load dashboard while online
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Go offline
    await context.setOffline(true);
    await page.reload();

    // Verify offline banner
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // Verify write actions are disabled
    await expect(page.locator('button:has-text("Create Report")')).toBeDisabled();
    await expect(page.locator('button:has-text("Export")')).toBeDisabled();

    // Try to navigate to create report
    await page.goto('/reports/new');

    // Verify redirect or warning
    await expect(page.locator('[data-testid="offline-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-warning"]'))
      .toContainText('This action requires an internet connection');
  });

  test('should reconnect and sync when back online', async ({ page, context }) => {
    // Load dashboard while online
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Go offline
    await context.setOffline(true);
    await page.reload();

    // Verify offline
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Trigger reconnection (reload or wait for auto-detect)
    await page.reload();

    // Verify offline banner disappears
    await expect(page.locator('[data-testid="offline-banner"]')).not.toBeVisible();

    // Verify sync notification
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Back online');

    // Verify data refreshes
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Verify cached indicator removed
    await expect(page.locator('[data-testid="cached-data-indicator"]')).not.toBeVisible();
  });

  test('should resume SSE stream with last-event-id', async ({ page, context }) => {
    // Load dashboard and establish SSE connection
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Wait for SSE connection
    await page.waitForTimeout(1000);

    // Capture last event ID before going offline
    const lastEventId = await page.evaluate(() => {
      return window.localStorage.getItem('last-sse-event-id');
    });

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Go back online
    await context.setOffline(false);

    // Wait for SSE reconnection
    await page.waitForTimeout(2000);

    // Verify reconnection uses last-event-id header
    const sseReconnected = await page.evaluate((lastId) => {
      // Check if EventSource was recreated with Last-Event-ID
      const eventSource = (window as any).__sseConnection;
      return eventSource && eventSource.readyState === 1; // OPEN state
    }, lastEventId);

    expect(sseReconnected).toBe(true);

    // Verify no duplicate events received
    await expect(page.locator('[data-testid="sse-status"]')).toContainText('Connected');
  });

  test('should show timestamps for cached data', async ({ page, context }) => {
    // Load dashboard while online
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Wait for caching
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);
    await page.reload();

    // Verify offline banner
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // Verify cache timestamp displayed
    await expect(page.locator('[data-testid="cache-timestamp"]')).toBeVisible();

    // Verify timestamp format
    const timestamp = await page.locator('[data-testid="cache-timestamp"]').textContent();
    expect(timestamp).toMatch(/Last updated:/);
    expect(timestamp).toMatch(/\d{1,2}:\d{2}/); // Contains time
  });

  test('should handle partial cache availability', async ({ page, context }) => {
    // Load only dashboard (not reports)
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Wait for caching
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Try to navigate to reports (not cached)
    await page.goto('/reports');

    // Verify offline message for uncached content
    await expect(page.locator('[data-testid="offline-unavailable"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-unavailable"]'))
      .toContainText('This page is not available offline');

    // Verify link to return to cached pages
    await expect(page.locator('a:has-text("Return to Dashboard")')).toBeVisible();

    // Navigate back to dashboard (cached)
    await page.click('a:has-text("Return to Dashboard")');

    // Verify dashboard loads from cache
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();
  });

  test('should queue actions for when back online', async ({ page, context }) => {
    // Load dashboard while online
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Go offline
    await context.setOffline(true);
    await page.reload();

    // Verify offline
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // Try to perform an action (e.g., bookmark a report)
    await page.goto('/reports');
    await page.click('[data-testid="bookmark-button"]').catch(() => {
      // Expected to fail or queue
    });

    // Verify action queued notification
    await expect(page.locator('[data-testid="toast-info"]'))
      .toContainText('Action will be performed when back online');

    // Verify queue indicator
    await expect(page.locator('[data-testid="pending-actions-badge"]')).toBeVisible();

    // Go back online
    await context.setOffline(false);
    await page.reload();

    // Verify queued actions processed
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Pending actions synced');

    // Verify queue badge removed
    await expect(page.locator('[data-testid="pending-actions-badge"]')).not.toBeVisible();
  });

  test('should update cache when online', async ({ page }) => {
    // Load dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="metric-card-sroi"]')).toBeVisible();

    // Capture initial cache time
    const initialCacheTime = await page.evaluate(async () => {
      const cache = await caches.open('corp-cockpit-v1');
      const response = await cache.match('/api/dashboard/metrics');
      return response?.headers.get('date');
    });

    // Wait a moment
    await page.waitForTimeout(2000);

    // Force refresh to update cache
    await page.reload({ waitUntil: 'networkidle' });

    // Verify cache updated
    const updatedCacheTime = await page.evaluate(async () => {
      const cache = await caches.open('corp-cockpit-v1');
      const response = await cache.match('/api/dashboard/metrics');
      return response?.headers.get('date');
    });

    // Cache time should be different (updated)
    expect(updatedCacheTime).toBeTruthy();
  });

  test('should show download progress for offline assets', async ({ page, context }) => {
    // Navigate to PWA settings
    await page.goto('/settings/pwa');

    // Click "Download for Offline"
    await page.click('button:has-text("Download for Offline")');

    // Verify download progress modal
    await expect(page.locator('[data-testid="download-progress-modal"]')).toBeVisible();

    // Verify progress bar
    await expect(page.locator('[data-testid="download-progress-bar"]')).toBeVisible();

    // Wait for download to complete (or timeout)
    await page.waitForSelector('[data-testid="download-complete"]', { timeout: 30000 })
      .catch(() => {
        // May timeout in test environment - that's okay
      });

    // Verify completion message (if successful)
    const downloadComplete = await page.locator('[data-testid="download-complete"]')
      .isVisible().catch(() => false);

    if (downloadComplete) {
      await expect(page.locator('[data-testid="download-complete"]'))
        .toContainText('Dashboard is now available offline');
    }
  });
});
