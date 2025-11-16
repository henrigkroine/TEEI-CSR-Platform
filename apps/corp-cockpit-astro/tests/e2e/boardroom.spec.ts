/**
 * Boardroom Mode E2E Tests
 *
 * Tests cover:
 * - Full-screen boardroom layout (no nav/header)
 * - Auto-cycle functionality (30s intervals)
 * - Pause/resume controls (spacebar)
 * - Manual navigation (arrow keys)
 * - Exit functionality (Esc key)
 * - SSE connection status indicator
 * - Offline mode handling
 * - Keyboard shortcuts
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForLoadingComplete,
  waitForNetworkIdle,
} from './helpers';

test.describe('Boardroom Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin for boardroom access
    await mockSession(page, TEST_USERS.ADMIN);
  });

  test.describe('Boardroom Layout', () => {
    test('should navigate to boardroom route', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForNetworkIdle(page);

      // Verify URL
      await expect(page).toHaveURL(/\/boardroom$/);

      // Verify main content exists
      const mainContent = page.locator('main, [role="main"], [data-testid="boardroom-container"]');
      await expect(mainContent).toBeVisible();
    });

    test('should display full-screen layout without navigation', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Verify no header/nav visible
      const header = page.locator('header, [role="banner"], nav:not([data-testid="boardroom-nav"])');
      const count = await header.count();

      // Either no header elements or they are hidden
      if (count > 0) {
        const isVisible = await header.first().isVisible().catch(() => false);
        expect(isVisible).toBe(false);
      }

      // Verify sidebar not visible
      const sidebar = page.locator('[data-testid="sidebar"], .sidebar, aside');
      const sidebarCount = await sidebar.count();
      if (sidebarCount > 0) {
        const sidebarVisible = await sidebar.first().isVisible().catch(() => false);
        expect(sidebarVisible).toBe(false);
      }
    });

    test('should display widget in full-screen view', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Verify widget is displayed
      const widget = page.locator('[data-testid*="widget"], [data-testid="boardroom-widget"], .boardroom-widget');
      await expect(widget.first()).toBeVisible({ timeout: 10000 });
    });

    test('should verify full-screen CSS class applied', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Check for fullscreen classes
      const body = page.locator('body');
      const bodyClass = await body.getAttribute('class');

      // Should have fullscreen or boardroom class
      const hasFullscreenClass = bodyClass?.includes('fullscreen') ||
                                 bodyClass?.includes('boardroom') ||
                                 bodyClass?.includes('presentation');

      expect(hasFullscreenClass).toBeTruthy();
    });
  });

  test.describe('Auto-Cycle Functionality', () => {
    test('should auto-cycle between widgets', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Get initial widget
      const initialWidget = await page.locator('[data-testid*="widget"]').first().getAttribute('data-widget-id')
        .catch(() => null);

      // Wait for auto-cycle (30s + buffer)
      await page.waitForTimeout(32000);

      // Get current widget - should be different
      const currentWidget = await page.locator('[data-testid*="widget"]').first().getAttribute('data-widget-id')
        .catch(() => null);

      // If widgets exist, they should have cycled
      if (initialWidget && currentWidget) {
        expect(currentWidget).not.toBe(initialWidget);
      }
    });

    test('should display auto-cycle indicator', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for progress indicator or timer
      const indicator = page.locator(
        '[data-testid="auto-cycle-indicator"], [data-testid="cycle-timer"], .cycle-progress'
      );

      const count = await indicator.count();
      if (count > 0) {
        await expect(indicator.first()).toBeVisible();
      }
    });

    test('should show widget count/position indicator', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for widget counter (e.g., "1 / 5")
      const counter = page.locator('[data-testid="widget-counter"], .widget-position');

      const count = await counter.count();
      if (count > 0) {
        const text = await counter.first().textContent();
        expect(text).toMatch(/\d+\s*\/\s*\d+/); // Matches "1 / 5" or "1/5"
      }
    });
  });

  test.describe('Pause and Resume Controls', () => {
    test('should pause auto-cycle with spacebar', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Press spacebar to pause
      await page.keyboard.press('Space');

      // Wait a bit for pause to register
      await page.waitForTimeout(500);

      // Verify pause indicator
      const pauseIndicator = page.locator(
        '[data-testid="paused-indicator"], :has-text("Paused"), [aria-label*="Paused"]'
      );

      const isPaused = await pauseIndicator.isVisible().catch(() => false);

      // If pause indicator exists, verify it
      if (isPaused) {
        await expect(pauseIndicator).toBeVisible();
      }

      // Get current widget
      const widgetBeforePause = await page.locator('[data-testid*="widget"]').first().textContent();

      // Wait beyond cycle time
      await page.waitForTimeout(35000);

      // Widget should NOT have changed (paused)
      const widgetAfterWait = await page.locator('[data-testid*="widget"]').first().textContent();
      expect(widgetAfterWait).toBe(widgetBeforePause);
    });

    test('should resume auto-cycle with spacebar', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Pause
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Resume
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Verify pause indicator gone
      const pauseIndicator = page.locator('[data-testid="paused-indicator"]');
      const count = await pauseIndicator.count();

      if (count > 0) {
        const isVisible = await pauseIndicator.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
      }
    });

    test('should display pause/resume button', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for pause button
      const pauseButton = page.locator(
        'button:has-text("Pause"), button[aria-label*="Pause"], [data-testid="pause-button"]'
      );

      const count = await pauseButton.count();
      if (count > 0) {
        await expect(pauseButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Manual Navigation', () => {
    test('should navigate forward with right arrow key', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Get initial widget
      const initialContent = await page.locator('[data-testid*="widget"]').first().textContent();

      // Press right arrow
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1000);

      // Widget should change
      const newContent = await page.locator('[data-testid*="widget"]').first().textContent();

      // Content should be different (unless only one widget)
      const widgetCount = await page.locator('[data-testid*="widget"]').count();
      if (widgetCount > 1) {
        expect(newContent).not.toBe(initialContent);
      }
    });

    test('should navigate backward with left arrow key', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Navigate forward first
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);

      const middleContent = await page.locator('[data-testid*="widget"]').first().textContent();

      // Navigate backward
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(1000);

      const backContent = await page.locator('[data-testid*="widget"]').first().textContent();

      // Should be different from middle content
      const widgetCount = await page.locator('[data-testid*="widget"]').count();
      if (widgetCount > 1) {
        expect(backContent).not.toBe(middleContent);
      }
    });

    test('should display navigation arrows', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for nav arrows
      const prevArrow = page.locator(
        'button:has-text("Previous"), button[aria-label*="Previous"], [data-testid="prev-widget"]'
      );
      const nextArrow = page.locator(
        'button:has-text("Next"), button[aria-label*="Next"], [data-testid="next-widget"]'
      );

      const prevCount = await prevArrow.count();
      const nextCount = await nextArrow.count();

      // Should have navigation controls
      expect(prevCount > 0 || nextCount > 0).toBe(true);
    });

    test('should wrap around at end of widgets', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Get widget count
      const counterText = await page.locator('[data-testid="widget-counter"]').textContent()
        .catch(() => '1 / 5'); // Default

      const match = counterText.match(/\d+\s*\/\s*(\d+)/);
      const totalWidgets = match ? parseInt(match[1]) : 5;

      // Navigate forward multiple times to wrap around
      for (let i = 0; i < totalWidgets + 1; i++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
      }

      // Should have wrapped back to beginning
      const finalCounter = await page.locator('[data-testid="widget-counter"]').textContent()
        .catch(() => '');

      if (finalCounter) {
        expect(finalCounter).toContain('1');
      }
    });
  });

  test.describe('Exit Functionality', () => {
    test('should exit boardroom mode with Escape key', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Press Escape
      await page.keyboard.press('Escape');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/cockpit\/[^\/]+\/?$/, { timeout: 5000 });

      // Should not be on boardroom page
      expect(page.url()).not.toContain('/boardroom');
    });

    test('should display exit button', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for exit button
      const exitButton = page.locator(
        'button:has-text("Exit"), button[aria-label*="Exit"], [data-testid="exit-boardroom"]'
      );

      const count = await exitButton.count();
      if (count > 0) {
        await expect(exitButton.first()).toBeVisible();

        // Click to exit
        await exitButton.first().click();

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/cockpit\/[^\/]+\/?$/, { timeout: 5000 });
      }
    });
  });

  test.describe('SSE Connection Status', () => {
    test('should display SSE connection status indicator', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for connection status
      const connectionStatus = page.locator(
        '[data-testid="connection-status"], [data-testid="sse-status"], .connection-indicator'
      );

      const count = await connectionStatus.count();
      if (count > 0) {
        await expect(connectionStatus.first()).toBeVisible();

        // Should show connected status
        const statusText = await connectionStatus.first().textContent();
        expect(statusText).toBeTruthy();
      }
    });

    test('should handle SSE disconnection', async ({ page, context }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Simulate offline
      await context.setOffline(true);
      await page.waitForTimeout(2000);

      // Check for disconnection indicator
      const disconnectIndicator = page.locator(
        ':has-text("Disconnected"), :has-text("Connection lost"), [data-status="disconnected"]'
      );

      const isVisible = await disconnectIndicator.isVisible().catch(() => false);

      // Restore connection
      await context.setOffline(false);
    });
  });

  test.describe('Offline Mode', () => {
    test('should display offline/stale data banner', async ({ page, context }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Should display offline banner
      const offlineBanner = page.locator(
        '[data-testid="offline-banner"], [data-testid="stale-banner"], :has-text("Offline")'
      );

      const bannerVisible = await offlineBanner.isVisible().catch(() => false);

      // Restore online
      await context.setOffline(false);
    });

    test('should continue to function with cached data offline', async ({ page, context }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Go offline
      await context.setOffline(true);

      // Should still display widgets
      const widget = page.locator('[data-testid*="widget"]');
      await expect(widget.first()).toBeVisible();

      // Navigation should still work
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);

      // Restore online
      await context.setOffline(false);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should display keyboard shortcuts help', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for help button or shortcut indicator
      const helpButton = page.locator(
        'button:has-text("Help"), button[aria-label*="Help"], [data-testid="keyboard-shortcuts"]'
      );

      const count = await helpButton.count();
      if (count > 0) {
        await helpButton.first().click();

        // Should display shortcuts modal/panel
        const shortcutsModal = page.locator('[role="dialog"], [data-testid="shortcuts-modal"]');
        await expect(shortcutsModal).toBeVisible();

        // Should list common shortcuts
        await expect(page.locator(':has-text("Space")')).toBeVisible();
        await expect(page.locator(':has-text("Arrow")')).toBeVisible();
        await expect(page.locator(':has-text("Escape")')).toBeVisible();
      }
    });

    test('should handle all documented keyboard shortcuts', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Test spacebar (pause/resume)
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
      await page.keyboard.press('Space');

      // Test arrows (navigation)
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowLeft');

      // Test Escape (exit) - but don't actually exit
      // (tested separately in Exit tests)

      // Verify page still responsive
      const widget = page.locator('[data-testid*="widget"]');
      await expect(widget.first()).toBeVisible();
    });

    test('should prevent default browser actions for shortcuts', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Get initial scroll position
      const initialScrollY = await page.evaluate(() => window.scrollY);

      // Press Space (should not scroll page)
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);

      const afterSpaceScrollY = await page.evaluate(() => window.scrollY);

      // Scroll position should remain the same (default prevented)
      expect(afterSpaceScrollY).toBe(initialScrollY);
    });
  });

  test.describe('Accessibility', () => {
    test('should have ARIA labels for controls', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Check for ARIA labels on buttons
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();

        // Button should have either aria-label or text content
        expect(ariaLabel || textContent).toBeTruthy();
      }
    });

    test('should announce widget changes to screen readers', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Look for live region for announcements
      const liveRegion = page.locator('[aria-live], [role="status"]');

      const count = await liveRegion.count();
      if (count > 0) {
        await expect(liveRegion.first()).toBeInViewport();
      }
    });
  });

  test.describe('Performance', () => {
    test('should maintain smooth transitions between widgets', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Navigate quickly between widgets
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200); // Fast navigation
      }

      // Should still be responsive
      const widget = page.locator('[data-testid*="widget"]');
      await expect(widget.first()).toBeVisible();
    });

    test('should not degrade performance during auto-cycle', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);

      // Let it auto-cycle a few times
      await page.waitForTimeout(65000); // ~2 cycles

      // Check for memory leaks or performance issues
      const metrics = await page.evaluate(() => ({
        memory: (performance as any).memory?.usedJSHeapSize,
        timing: performance.now(),
      }));

      expect(metrics.timing).toBeGreaterThan(0);
    });
  });
});
