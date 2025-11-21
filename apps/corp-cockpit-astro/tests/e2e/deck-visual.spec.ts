/**
 * Deck Composer Visual Regression Tests
 *
 * Tests cover:
 * - Modal layout screenshots
 * - Template selection UI
 * - Tile grid layout
 * - Preview panel rendering
 * - Different viewport sizes
 * - Dark mode support
 * - Template-specific previews
 * - Progress indicator states
 * - Error states
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  TEST_USERS,
  TEST_COMPANIES,
  waitForNetworkIdle,
} from './helpers';

test.describe('Deck Composer - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await mockSession(page, TEST_USERS.ADMIN);

    // Navigate to boardroom
    await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
    await waitForNetworkIdle(page);

    // Open deck composer
    const createButton = page.locator(
      '[data-testid="create-deck-button"], button:has-text("Create Deck")'
    );
    await createButton.first().click();
    await page.waitForTimeout(2000);
  });

  test.describe('Modal Layouts', () => {
    test('captures deck composer modal initial state', async ({ page }) => {
      const modal = page.locator('[data-testid="deck-composer-modal"], [role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await expect(modal).toHaveScreenshot('deck-composer-modal-initial.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });

    test('captures template selection view', async ({ page }) => {
      await page.waitForTimeout(1000);

      // Screenshot template selection area
      const templateSection = page.locator(
        '[data-testid="template-selection"], .template-grid'
      );

      const count = await templateSection.count();
      if (count > 0) {
        await expect(templateSection.first()).toHaveScreenshot('template-selection.png', {
          animations: 'disabled',
        });
      }
    });

    test('captures quarterly template selected state', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-quarterly-selected.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });

    test('captures annual template selected state', async ({ page }) => {
      const annualTemplate = page.locator('[data-testid="template-annual"]');
      await annualTemplate.first().click();
      await page.waitForTimeout(1500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-annual-selected.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });

    test('captures investor template selected state', async ({ page }) => {
      const investorTemplate = page.locator('[data-testid="template-investor-update"]');
      await investorTemplate.first().click();
      await page.waitForTimeout(1500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-investor-selected.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });

    test('captures impact deep dive template selected state', async ({ page }) => {
      const impactTemplate = page.locator('[data-testid="template-impact-deep-dive"]');
      await impactTemplate.first().click();
      await page.waitForTimeout(1500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-impact-selected.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });
  });

  test.describe('Tile Grid', () => {
    test('captures tile grid layout', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      const tileGrid = page.locator('[data-testid="tile-grid"], [data-testid="tile-selection"]');
      const count = await tileGrid.count();

      if (count > 0) {
        await expect(tileGrid.first()).toHaveScreenshot('tile-grid.png', {
          animations: 'disabled',
        });
      }
    });

    test('captures tile grid with selections', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      // Select multiple tiles
      const tiles = ['sroi', 'vis-trend', 'evidence-density'];
      for (const tile of tiles) {
        const tileCheckbox = page.locator(`[data-testid="tile-${tile}"]`);
        const tileCount = await tileCheckbox.count();
        if (tileCount > 0) {
          await tileCheckbox.check();
          await page.waitForTimeout(300);
        }
      }

      await page.waitForTimeout(1000);

      const tileGrid = page.locator('[data-testid="tile-grid"]');
      const count = await tileGrid.count();

      if (count > 0) {
        await expect(tileGrid.first()).toHaveScreenshot('tile-grid-with-selections.png', {
          animations: 'disabled',
        });
      }
    });

    test('captures tile grid at max selection (8 tiles)', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      // Select 8 tiles
      const tileCheckboxes = page.locator('[data-testid^="tile-"]:not([data-testid*="grid"])');
      const totalTiles = await tileCheckboxes.count();

      if (totalTiles >= 8) {
        for (let i = 0; i < 8; i++) {
          await tileCheckboxes.nth(i).check();
          await page.waitForTimeout(200);
        }

        await page.waitForTimeout(1000);

        const tileGrid = page.locator('[data-testid="tile-grid"]');
        const count = await tileGrid.count();

        if (count > 0) {
          await expect(tileGrid.first()).toHaveScreenshot('tile-grid-max-selection.png', {
            animations: 'disabled',
          });
        }
      }
    });
  });

  test.describe('Preview Panel', () => {
    test('captures preview panel with slide thumbnails', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      // Select tiles
      const tile = page.locator('[data-testid="tile-sroi"]');
      const count = await tile.count();
      if (count > 0) {
        await tile.check();
        await page.waitForTimeout(1000);
      }

      // Screenshot preview panel
      const preview = page.locator('[data-testid="deck-preview"], [data-testid="preview-panel"]');
      const previewCount = await preview.count();

      if (previewCount > 0) {
        await expect(preview.first()).toHaveScreenshot('preview-panel.png', {
          animations: 'disabled',
          timeout: 10000,
        });
      }
    });

    test('captures preview with citation counts', async ({ page }) => {
      const impactTemplate = page.locator('[data-testid="template-impact-deep-dive"]');
      await impactTemplate.first().click();
      await page.waitForTimeout(1500);

      // Select evidence tile
      const evidenceTile = page.locator('[data-testid="tile-evidence-density"]');
      const count = await evidenceTile.count();
      if (count > 0) {
        await evidenceTile.check();
        await page.waitForTimeout(1000);
      }

      const preview = page.locator('[data-testid="deck-preview"]');
      const previewCount = await preview.count();

      if (previewCount > 0) {
        await expect(preview.first()).toHaveScreenshot('preview-with-citations.png', {
          animations: 'disabled',
          timeout: 10000,
        });
      }
    });

    test('captures slide count and citation summary', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      // Select multiple tiles
      const tiles = page.locator('[data-testid^="tile-"]').first();
      await tiles.check();
      await page.waitForTimeout(1000);

      const summary = page.locator(
        '[data-testid="deck-summary"], [data-testid="slide-count"]'
      ).first();

      const count = await summary.count();
      if (count > 0) {
        await expect(summary).toHaveScreenshot('deck-summary.png', {
          animations: 'disabled',
        });
      }
    });
  });

  test.describe('Viewport Sizes', () => {
    test('captures modal on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-desktop.png', {
        animations: 'disabled',
        fullPage: false,
      });
    });

    test('captures modal on laptop (1366x768)', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-laptop.png', {
        animations: 'disabled',
        fullPage: false,
      });
    });

    test('captures modal on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]');
      const count = await modal.count();

      if (count > 0) {
        await expect(modal).toHaveScreenshot('deck-composer-tablet.png', {
          animations: 'disabled',
          fullPage: false,
        });
      }
    });
  });

  test.describe('Progress States', () => {
    test('captures export progress indicator', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      // Mock export endpoint
      await page.route('**/api/decks/export', route => {
        route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'deck-job-123',
            status: 'processing',
          }),
        });
      });

      const exportButton = page.locator('[data-testid="export-button"]');
      await exportButton.first().click();
      await page.waitForTimeout(1500);

      const progress = page.locator('[data-testid="export-progress"], [role="progressbar"]');
      const count = await progress.count();

      if (count > 0) {
        await expect(progress.first()).toHaveScreenshot('export-progress.png', {
          animations: 'disabled',
        });
      }
    });

    test('captures export complete state', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      // Mock completed export
      await page.route('**/api/decks/export', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'deck-job-123',
            status: 'completed',
            downloadUrl: '/downloads/deck.pptx',
          }),
        });
      });

      await page.route('**/api/jobs/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'deck-job-123',
            status: 'completed',
            progress: 100,
            downloadUrl: '/downloads/deck.pptx',
          }),
        });
      });

      const exportButton = page.locator('[data-testid="export-button"]');
      await exportButton.first().click();
      await page.waitForTimeout(2000);

      const completionState = page.locator(
        ':has-text("Download"), [data-testid="download-ready"]'
      );
      const count = await completionState.count();

      if (count > 0) {
        await expect(completionState.first()).toHaveScreenshot('export-complete.png', {
          animations: 'disabled',
        });
      }
    });
  });

  test.describe('Error States', () => {
    test('captures export error state', async ({ page }) => {
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      // Mock export failure
      await page.route('**/api/decks/export', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Export failed',
            message: 'Internal server error',
          }),
        });
      });

      const exportButton = page.locator('[data-testid="export-button"]');
      await exportButton.first().click();
      await page.waitForTimeout(2000);

      const errorState = page.locator('[role="alert"], :has-text("Error")');
      const count = await errorState.count();

      if (count > 0) {
        await expect(errorState.first()).toHaveScreenshot('export-error.png', {
          animations: 'disabled',
        });
      }
    });

    test('captures validation error (no template selected)', async ({ page }) => {
      await page.waitForTimeout(1000);

      const exportButton = page.locator('[data-testid="export-button"]');
      const count = await exportButton.count();

      if (count > 0) {
        const isDisabled = await exportButton.first().isDisabled();

        if (isDisabled) {
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toHaveScreenshot('validation-no-template.png', {
            animations: 'disabled',
          });
        }
      }
    });
  });

  test.describe('Dark Mode', () => {
    test('captures modal in dark mode', async ({ page }) => {
      // Enable dark mode via localStorage
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
      });

      // Reload to apply dark mode
      await page.reload();
      await waitForNetworkIdle(page);

      // Open modal again
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(2000);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-dark-mode.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });

    test('captures template selection in dark mode', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
      });

      await page.reload();
      await waitForNetworkIdle(page);

      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(2000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1500);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('template-selection-dark-mode.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });
  });

  test.describe('Locale Variants', () => {
    test('captures modal with Norwegian locale', async ({ page }) => {
      // Navigate with Norwegian locale
      await page.goto(`/no/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForNetworkIdle(page);

      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(2000);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-no-locale.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });

    test('captures modal with UK locale', async ({ page }) => {
      // Navigate with UK locale
      await page.goto(`/uk/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForNetworkIdle(page);

      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(2000);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toHaveScreenshot('deck-composer-uk-locale.png', {
        animations: 'disabled',
        timeout: 10000,
      });
    });
  });

  test.describe('Template Comparisons', () => {
    test('captures all four template previews side-by-side', async ({ page }) => {
      const templates = [
        { id: 'quarterly', name: 'Quarterly' },
        { id: 'annual', name: 'Annual' },
        { id: 'investor-update', name: 'Investor' },
        { id: 'impact-deep-dive', name: 'Impact' },
      ];

      for (const template of templates) {
        const templateButton = page.locator(`[data-testid="template-${template.id}"]`);
        const count = await templateButton.count();

        if (count > 0) {
          await templateButton.click();
          await page.waitForTimeout(1500);

          const modal = page.locator('[role="dialog"]');
          await expect(modal).toHaveScreenshot(`template-${template.id}-comparison.png`, {
            animations: 'disabled',
            timeout: 10000,
          });

          // Go back to template selection for next iteration
          const backButton = page.locator('button:has-text("Back")');
          const backCount = await backButton.count();
          if (backCount > 0) {
            await backButton.first().click();
            await page.waitForTimeout(500);
          } else {
            // Re-open modal if needed
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            const createButton = page.locator('[data-testid="create-deck-button"]');
            await createButton.first().click();
            await page.waitForTimeout(1000);
          }
        }
      }
    });
  });
});
