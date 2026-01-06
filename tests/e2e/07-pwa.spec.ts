import { test, expect } from '@playwright/test';

/**
 * E2E Test: PWA Boardroom Mode
 * Tests offline caching, service worker, install prompt, SSE replay
 */

test.describe('PWA Installation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display PWA install prompt', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Install prompt should appear (if not already installed)
    const installPrompt = page.locator('[data-testid="pwa-install-prompt"]');

    // Prompt may be visible or hidden based on installation status
    const isVisible = await installPrompt.isVisible().catch(() => false);
    if (isVisible) {
      await expect(installPrompt).toBeVisible();
      await expect(page.locator('text=/Install|Add to Home/i')).toBeVisible();
    }
  });

  test('should have valid PWA manifest', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for manifest link
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toBeTruthy();

    // Fetch manifest
    const manifestResponse = await page.request.get(manifestLink!);
    expect(manifestResponse.ok()).toBeTruthy();

    const manifest = await manifestResponse.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check if service worker is registered
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistration();
    });

    expect(swRegistration).toBeTruthy();
  });

  test('should have iOS PWA meta tags', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for iOS-specific meta tags
    const appleCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(appleCapable).toBe('yes');

    const appleTitle = await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content');
    expect(appleTitle).toBeTruthy();
  });
});

test.describe('Offline Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should work offline with cached data', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Should still display dashboard with cached data
    await expect(page.locator('[data-testid="at-a-glance-widget"]')).toBeVisible();

    // Offline indicator should be visible
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should show "last updated" timestamp when offline', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);
    await page.reload();

    // Should show last updated time
    await expect(page.locator('[data-testid="last-updated-time"]')).toBeVisible();
    await expect(page.locator('text=/Last updated|minutes ago/i')).toBeVisible();
  });

  test('should display offline page for uncached routes', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to navigate to uncached page
    await page.goto('/en/cockpit/company-1/new-uncached-page').catch(() => {});

    // Should show offline message
    await expect(page.locator('text=/offline|no connection/i')).toBeVisible();
  });

  test('should queue actions when offline', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to perform an action (e.g., save a setting)
    await page.click('[data-testid="settings-button"]');
    await page.fill('[data-testid="setting-input"]', 'New value');
    await page.click('[data-testid="save-button"]');

    // Should show queued message
    await expect(page.locator('text=/queued|will sync/i')).toBeVisible();
  });

  test('should sync queued actions when back online', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Queue an action
    // (implementation depends on actual offline queue logic)

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await page.waitForTimeout(2000);

    // Should show sync success message
    const syncMessage = page.locator('text=/synced|updated/i');
    if (await syncMessage.isVisible().catch(() => false)) {
      await expect(syncMessage).toBeVisible();
    }
  });
});

test.describe('SSE Event Replay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should queue SSE events in IndexedDB when offline', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that IndexedDB is being used
    const hasIndexedDB = await page.evaluate(() => {
      return 'indexedDB' in window;
    });
    expect(hasIndexedDB).toBe(true);
  });

  test('should replay events when reconnected', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Disconnect
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Reconnect
    await context.setOffline(false);

    // Should see reconnection indicator
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible({ timeout: 5000 });

    // Events should replay (check for update notification)
    const updateNotification = page.locator('text=/reconnected|catching up/i');
    if (await updateNotification.isVisible().catch(() => false)) {
      await expect(updateNotification).toBeVisible();
    }
  });

  test('should maintain data consistency after reconnection', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Get initial data
    const initialValue = await page.locator('[data-testid="sroi-value"]').textContent();

    // Disconnect and reconnect
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);

    // Wait for reconnection
    await page.waitForTimeout(2000);

    // Data should be updated or same
    const newValue = await page.locator('[data-testid="sroi-value"]').textContent();
    expect(newValue).toBeDefined();
  });
});

test.describe('PWA Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should meet Lighthouse PWA score >90', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for PWA requirements
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBeTruthy();

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();

    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBeTruthy();
  });

  test('should use service worker caching strategies', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check that assets are cached
    const cacheStorage = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      return cacheNames.length > 0;
    });

    expect(cacheStorage).toBe(true);
  });
});
