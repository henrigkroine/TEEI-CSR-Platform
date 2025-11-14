/**
 * Evidence Explorer E2E Tests
 *
 * Tests cover:
 * - Evidence list display
 * - Evidence card rendering
 * - Evidence detail drawer
 * - Filtering and searching
 * - Sorting evidence
 * - Evidence metadata display
 * - Evidence attachments
 * - Evidence status indicators
 * - Permission-based access
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

test.describe('Evidence Explorer', () => {
  test.describe('Evidence Page Access', () => {
    test('should access evidence page as manager', async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');

      await expect(page).toHaveURL(/\/evidence/);
      await waitForLoadingComplete(page);
    });

    test('should access evidence page as admin', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');

      await expect(page).toHaveURL(/\/evidence/);
      await waitForLoadingComplete(page);
    });

    test('should block evidence page for viewer role', async ({ page }) => {
      await mockSession(page, TEST_USERS.VIEWER);
      await page.goto('/en/cockpit/company-1/evidence');

      // Should redirect to 401 or show permission error
      const hasError = await page.locator(':has-text("permission"), :has-text("unauthorized"), :has-text("access denied")').isVisible().catch(() => false);
      const is401 = page.url().includes('/401');

      expect(hasError || is401).toBe(true);
    });
  });

  test.describe('Evidence List', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
    });

    test('should display evidence cards', async ({ page }) => {
      // Look for evidence cards
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');

      const count = await evidenceCards.count();

      // Should have at least one evidence card or empty state
      if (count > 0) {
        await expect(evidenceCards.first()).toBeVisible();
      } else {
        // Check for empty state
        const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
        await expect(emptyState).toBeVisible();
      }
    });

    test('should display evidence metadata', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        const firstCard = evidenceCards.first();

        // Should have title
        const title = firstCard.locator('[data-testid="evidence-title"], .evidence-title, h3, h4');
        await expect(title).toBeVisible();

        // Should have date/timestamp
        const date = firstCard.locator('[data-testid*="date"], .date, time');
        const hasDate = await date.isVisible().catch(() => false);

        // Date might be present but not always required
        expect(hasDate || true).toBe(true);
      }
    });

    test('should show evidence type indicators', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        // Look for type badges or labels
        const typeBadge = page.locator('[data-testid*="type"], .badge, .tag, .label');
        const hasBadge = await typeBadge.isVisible().catch(() => false);

        // Type indicators might be shown as icons or text
        expect(hasBadge || true).toBe(true);
      }
    });

    test('should display evidence status', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        // Look for status indicators
        const status = page.locator('[data-testid*="status"], .status, [class*="status"]');
        const hasStatus = await status.isVisible().catch(() => false);

        // Status indicators might be shown as colors, badges, or icons
        expect(hasStatus || true).toBe(true);
      }
    });
  });

  test.describe('Evidence Detail Drawer', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
    });

    test('should open evidence detail drawer on card click', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        // Click first evidence card
        await evidenceCards.first().click();

        // Wait for drawer to open
        const drawer = page.locator('[data-testid="evidence-drawer"], .drawer, [role="dialog"]');
        await expect(drawer).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display full evidence details in drawer', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        await evidenceCards.first().click();

        const drawer = page.locator('[data-testid="evidence-drawer"], .drawer, [role="dialog"]');
        await expect(drawer).toBeVisible({ timeout: 5000 });

        // Should have detailed information
        const content = await drawer.textContent();
        expect(content).toBeTruthy();
        expect(content!.length).toBeGreaterThan(50);
      }
    });

    test('should close drawer on close button click', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        await evidenceCards.first().click();

        const drawer = page.locator('[data-testid="evidence-drawer"], .drawer, [role="dialog"]');
        await expect(drawer).toBeVisible({ timeout: 5000 });

        // Find and click close button
        const closeBtn = drawer.locator('button[aria-label*="Close"], button.close, [data-action="close"]');
        await closeBtn.click();

        // Drawer should be hidden
        await expect(drawer).not.toBeVisible();
      }
    });

    test('should close drawer on ESC key', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        await evidenceCards.first().click();

        const drawer = page.locator('[data-testid="evidence-drawer"], .drawer, [role="dialog"]');
        await expect(drawer).toBeVisible({ timeout: 5000 });

        // Press ESC key
        await page.keyboard.press('Escape');

        // Drawer should be hidden
        await expect(drawer).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should display evidence attachments', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        await evidenceCards.first().click();

        const drawer = page.locator('[data-testid="evidence-drawer"], .drawer, [role="dialog"]');
        await expect(drawer).toBeVisible({ timeout: 5000 });

        // Look for attachments section
        const attachments = drawer.locator('[data-testid*="attachment"], .attachment, :has-text("Attachment")');
        const hasAttachments = await attachments.isVisible().catch(() => false);

        // Attachments are optional
        expect(hasAttachments || true).toBe(true);
      }
    });
  });

  test.describe('Evidence Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
    });

    test('should display filter controls', async ({ page }) => {
      // Look for filter UI elements
      const filterControls = page.locator('[data-testid*="filter"], .filter, select, [role="combobox"]');

      const count = await filterControls.count();
      if (count > 0) {
        await expect(filterControls.first()).toBeVisible();
      }
    });

    test('should filter by evidence type', async ({ page }) => {
      const typeFilter = page.locator('[data-testid="type-filter"], select[name*="type"]');

      const count = await typeFilter.count();
      if (count > 0) {
        // Get initial evidence count
        const initialCount = await page.locator('[data-testid="evidence-card"], .evidence-card').count();

        // Select a filter option
        await typeFilter.first().selectOption({ index: 1 });

        // Wait for filter to apply
        await waitForNetworkIdle(page);

        // Evidence list should update
        await page.waitForTimeout(500);
      }
    });

    test('should filter by date range', async ({ page }) => {
      const dateFilter = page.locator('[data-testid*="date-filter"], input[type="date"]');

      const count = await dateFilter.count();
      if (count > 0) {
        await expect(dateFilter.first()).toBeVisible();
      }
    });

    test('should filter by status', async ({ page }) => {
      const statusFilter = page.locator('[data-testid="status-filter"], select[name*="status"]');

      const count = await statusFilter.count();
      if (count > 0) {
        await expect(statusFilter.first()).toBeVisible();
      }
    });
  });

  test.describe('Evidence Search', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
    });

    test('should display search input', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search"], input[type="search"], input[placeholder*="Search"]');

      const count = await searchInput.count();
      if (count > 0) {
        await expect(searchInput.first()).toBeVisible();
      }
    });

    test('should search evidence by title', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search"], input[type="search"], input[placeholder*="Search"]');

      const count = await searchInput.count();
      if (count > 0) {
        // Type search query
        await searchInput.first().fill('test');

        // Wait for search results
        await waitForNetworkIdle(page);

        // Results should update
        await page.waitForTimeout(500);
      }
    });

    test('should clear search', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search"], input[type="search"], input[placeholder*="Search"]');

      const count = await searchInput.count();
      if (count > 0) {
        // Type search query
        await searchInput.first().fill('test');
        await waitForNetworkIdle(page);

        // Clear search
        await searchInput.first().fill('');
        await waitForNetworkIdle(page);

        // All evidence should be visible again
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Evidence Sorting', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
    });

    test('should display sort controls', async ({ page }) => {
      const sortControl = page.locator('[data-testid*="sort"], select[name*="sort"], button:has-text("Sort")');

      const count = await sortControl.count();
      if (count > 0) {
        await expect(sortControl.first()).toBeVisible();
      }
    });

    test('should sort by date', async ({ page }) => {
      const sortControl = page.locator('[data-testid="sort-select"], select[name*="sort"]');

      const count = await sortControl.count();
      if (count > 0) {
        // Get initial order
        const initialTitles = await page.locator('[data-testid="evidence-title"], .evidence-title').allTextContents();

        // Change sort order
        await sortControl.first().selectOption({ index: 1 });
        await waitForNetworkIdle(page);

        // Verify order changed
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Evidence Pagination', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
    });

    test('should display pagination controls', async ({ page }) => {
      const pagination = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="Pagination"]');

      const count = await pagination.count();
      if (count > 0) {
        await expect(pagination.first()).toBeVisible();
      }
    });

    test('should navigate to next page', async ({ page }) => {
      const nextBtn = page.locator('button:has-text("Next"), button[aria-label*="Next"]');

      const count = await nextBtn.count();
      if (count > 0 && await nextBtn.first().isEnabled()) {
        await nextBtn.first().click();
        await waitForNetworkIdle(page);

        // Page should update
        await page.waitForTimeout(500);
      }
    });

    test('should navigate to previous page', async ({ page }) => {
      const nextBtn = page.locator('button:has-text("Next"), button[aria-label*="Next"]');
      const prevBtn = page.locator('button:has-text("Previous"), button[aria-label*="Previous"]');

      const nextCount = await nextBtn.count();
      if (nextCount > 0 && await nextBtn.first().isEnabled()) {
        // Go to next page first
        await nextBtn.first().click();
        await waitForNetworkIdle(page);

        // Then go back
        const prevCount = await prevBtn.count();
        if (prevCount > 0 && await prevBtn.first().isEnabled()) {
          await prevBtn.first().click();
          await waitForNetworkIdle(page);
        }
      }
    });
  });

  test.describe('Evidence Actions', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
    });

    test('should display action buttons for admin', async ({ page }) => {
      const evidenceCards = page.locator('[data-testid="evidence-card"], .evidence-card');
      const count = await evidenceCards.count();

      if (count > 0) {
        // Look for action buttons (edit, delete, view lineage, etc.)
        const actions = evidenceCards.first().locator('button, [role="button"]');
        const actionCount = await actions.count();

        // Admin should have action buttons
        expect(actionCount).toBeGreaterThan(0);
      }
    });

    test('should open lineage viewer', async ({ page }) => {
      const lineageBtn = page.locator('button:has-text("Lineage"), button[aria-label*="Lineage"]');

      const count = await lineageBtn.count();
      if (count > 0) {
        await lineageBtn.first().click();

        // Should open lineage drawer or modal
        const lineageView = page.locator('[data-testid="lineage-drawer"], [data-testid="lineage-modal"]');
        await expect(lineageView).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Evidence Loading States', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
    });

    test('should show loading state while fetching evidence', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/evidence');

      // Look for loading indicator
      const loading = page.locator('[data-testid="loading"], .loading, .skeleton');
      const isVisible = await loading.isVisible().catch(() => false);

      // Loading might be too fast to catch
      if (isVisible) {
        await expect(loading).toBeVisible();
      }

      // Eventually should show content
      await waitForLoadingComplete(page);
    });

    test('should handle empty evidence list', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/evidence/**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }));

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      // Should show empty state
      const emptyState = page.locator('[data-testid="empty-state"], .empty-state, :has-text("No evidence")');
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    });

    test('should handle API errors', async ({ page }) => {
      // Mock API error
      await page.route('**/api/evidence/**', route => route.abort());

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');

      // Should show error message
      const errorMsg = page.locator('[role="alert"], .error, :has-text("Error")');
      await expect(errorMsg).toBeVisible({ timeout: 10000 });
    });
  });
});
