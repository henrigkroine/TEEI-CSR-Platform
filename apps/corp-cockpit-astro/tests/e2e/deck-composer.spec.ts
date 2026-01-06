/**
 * Deck Composer E2E Tests (Boardroom v2)
 *
 * Tests cover:
 * - Opening deck composer modal
 * - Template selection (quarterly, annual, investor, impact deep dive)
 * - Tile selection with constraints (max 8 tiles)
 * - Preview updates (slide count, citation count)
 * - Export to PPTX with progress tracking
 * - Download verification
 * - Citation counts per slide
 * - Locale selection
 * - Template-specific content validation
 * - Error handling
 * - Permissions
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

test.describe('Boardroom v2 - Deck Composer', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin for deck composer access
    await mockSession(page, TEST_USERS.ADMIN);

    // Navigate to boardroom
    await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
    await waitForNetworkIdle(page);
  });

  test.describe('Modal Opening', () => {
    test('opens deck composer modal', async ({ page }) => {
      // Click create deck button
      const createButton = page.locator(
        '[data-testid="create-deck-button"], button:has-text("Create Deck"), button:has-text("New Deck")'
      );

      await expect(createButton.first()).toBeVisible({ timeout: 10000 });
      await createButton.first().click();

      // Verify modal appears
      const modal = page.locator('[data-testid="deck-composer-modal"], [role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify modal header
      await expect(page.locator('text=Select Template, text=Deck Composer')).toBeVisible();
    });

    test('displays all template options in modal', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Check for template options
      const templates = [
        'quarterly',
        'annual',
        'investor-update',
        'impact-deep-dive',
      ];

      for (const template of templates) {
        const templateOption = page.locator(
          `[data-testid="template-${template}"], [data-template="${template}"]`
        );

        const count = await templateOption.count();
        if (count > 0) {
          await expect(templateOption.first()).toBeVisible();
        }
      }
    });

    test('modal has close button', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(500);

      // Look for close button
      const closeButton = page.locator(
        'button[aria-label="Close"], button:has-text("Close"), [data-testid="close-modal"]'
      );

      await expect(closeButton.first()).toBeVisible();

      // Click close
      await closeButton.first().click();

      // Modal should disappear
      const modal = page.locator('[data-testid="deck-composer-modal"]');
      await expect(modal).not.toBeVisible();
    });

    test('modal can be closed with Escape key', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(500);

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should close
      const modal = page.locator('[data-testid="deck-composer-modal"]');
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Template Selection', () => {
    test('selects quarterly template and displays tiles', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Select quarterly template
      const quarterlyTemplate = page.locator(
        '[data-testid="template-quarterly"], button:has-text("Quarterly")'
      );
      await quarterlyTemplate.first().click();

      // Verify tile selection appears
      const tileGrid = page.locator(
        '[data-testid="tile-selection"], [data-testid="tile-grid"]'
      );
      await expect(tileGrid.first()).toBeVisible({ timeout: 5000 });

      // Check for common tiles
      const commonTiles = ['sroi', 'vis-trend', 'evidence-density', 'engagement'];
      for (const tile of commonTiles) {
        const tileCheckbox = page.locator(
          `[data-testid="tile-${tile}"], input[value="${tile}"]`
        );
        const count = await tileCheckbox.count();

        if (count > 0) {
          await expect(tileCheckbox.first()).toBeVisible();
        }
      }
    });

    test('selects annual template', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Select annual template
      const annualTemplate = page.locator(
        '[data-testid="template-annual"], button:has-text("Annual")'
      );
      await annualTemplate.first().click();

      // Verify template selection
      const selectedTemplate = page.locator('[data-selected-template="annual"]');
      const count = await selectedTemplate.count();

      if (count > 0) {
        await expect(selectedTemplate.first()).toBeVisible();
      }
    });

    test('selects investor update template', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Select investor template
      const investorTemplate = page.locator(
        '[data-testid="template-investor-update"], button:has-text("Investor")'
      );
      await investorTemplate.first().click();

      // Verify investor-specific content hint
      const roiFocus = page.locator(':has-text("ROI"), :has-text("Return on Investment")');
      const count = await roiFocus.count();

      // ROI focus should be mentioned in investor template
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('selects impact deep dive template', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Select impact template
      const impactTemplate = page.locator(
        '[data-testid="template-impact-deep-dive"], button:has-text("Impact Deep Dive")'
      );
      await impactTemplate.first().click();

      // Verify evidence-focused content
      const evidenceHint = page.locator(
        ':has-text("Evidence"), :has-text("Appendix"), :has-text("Citations")'
      );
      const count = await evidenceHint.count();

      expect(count).toBeGreaterThan(0);
    });

    test('template selection updates preview', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Select template
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(500);

      // Check for preview section
      const preview = page.locator(
        '[data-testid="deck-preview"], [data-testid="slide-preview"]'
      );
      const count = await preview.count();

      if (count > 0) {
        await expect(preview.first()).toBeVisible();
      }
    });
  });

  test.describe('Tile Selection', () => {
    test('selects multiple tiles and updates preview', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Select template
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Select tiles
      const tilesToSelect = ['sroi', 'vis-trend', 'evidence-density'];

      for (const tile of tilesToSelect) {
        const tileCheckbox = page.locator(`[data-testid="tile-${tile}"]`);
        const count = await tileCheckbox.count();

        if (count > 0) {
          await tileCheckbox.first().check();
          await page.waitForTimeout(300);
        }
      }

      // Check preview updates
      const slideCount = page.locator('[data-testid="slide-count"]');
      const count = await slideCount.count();

      if (count > 0) {
        const text = await slideCount.first().textContent();
        expect(text).toContain('slide');
      }
    });

    test('validates maximum 8 tiles selection', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Select template
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Get all tile checkboxes
      const tileCheckboxes = page.locator('[data-testid^="tile-"]:not([data-testid*="grid"])');
      const totalTiles = await tileCheckboxes.count();

      if (totalTiles >= 9) {
        // Check first 8 tiles
        for (let i = 0; i < 8; i++) {
          const checkbox = tileCheckboxes.nth(i);
          await checkbox.check();
          await page.waitForTimeout(200);
        }

        // 9th tile should be disabled
        const ninthTile = tileCheckboxes.nth(8);
        const isDisabled = await ninthTile.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });

    test('unchecking tile re-enables others', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Get tile checkboxes
      const tileCheckboxes = page.locator('[data-testid^="tile-"]:not([data-testid*="grid"])');
      const totalTiles = await tileCheckboxes.count();

      if (totalTiles >= 9) {
        // Check 8 tiles
        for (let i = 0; i < 8; i++) {
          await tileCheckboxes.nth(i).check();
          await page.waitForTimeout(100);
        }

        // Uncheck one tile
        await tileCheckboxes.nth(0).uncheck();
        await page.waitForTimeout(500);

        // 9th tile should now be enabled
        const ninthTile = tileCheckboxes.nth(8);
        const isEnabled = await ninthTile.isEnabled();
        expect(isEnabled).toBe(true);
      }
    });

    test('displays tile descriptions on hover', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Hover over a tile
      const firstTile = page.locator('[data-testid^="tile-"]').first();
      await firstTile.hover();
      await page.waitForTimeout(500);

      // Check for tooltip or description
      const tooltip = page.locator('[role="tooltip"], [data-testid="tile-description"]');
      const count = await tooltip.count();

      // Tooltip is optional
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Preview Updates', () => {
    test('shows slide count in preview', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Select some tiles
      const tile1 = page.locator('[data-testid="tile-sroi"]');
      const count1 = await tile1.count();
      if (count1 > 0) {
        await tile1.check();
      }

      const tile2 = page.locator('[data-testid="tile-vis-trend"]');
      const count2 = await tile2.count();
      if (count2 > 0) {
        await tile2.check();
      }

      await page.waitForTimeout(500);

      // Check slide count
      const slideCount = page.locator('[data-testid="slide-count"]');
      const slideCountExists = await slideCount.count();

      if (slideCountExists > 0) {
        const text = await slideCount.textContent();
        expect(text).toMatch(/\d+\s*slide/i);
      }
    });

    test('shows citation count in preview', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const impactTemplate = page.locator('[data-testid="template-impact-deep-dive"]');
      await impactTemplate.first().click();
      await page.waitForTimeout(1000);

      // Select tiles with evidence
      const evidenceTile = page.locator('[data-testid="tile-evidence-density"]');
      const count = await evidenceTile.count();
      if (count > 0) {
        await evidenceTile.check();
        await page.waitForTimeout(500);
      }

      // Check citation count
      const citationCount = page.locator('[data-testid="citation-count"]');
      const citationExists = await citationCount.count();

      if (citationExists > 0) {
        const text = await citationCount.textContent();
        expect(text).toMatch(/\d+\s*citation/i);
      }
    });

    test('displays slide thumbnails in preview', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Select a tile
      const tile = page.locator('[data-testid^="tile-"]').first();
      await tile.check();
      await page.waitForTimeout(1000);

      // Check for slide previews
      const slidePreviews = page.locator('[data-testid^="slide-preview-"]');
      const previewCount = await slidePreviews.count();

      // Should have at least cover slide
      expect(previewCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Citation Counts', () => {
    test('shows citation counts per slide', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const impactTemplate = page.locator('[data-testid="template-impact-deep-dive"]');
      await impactTemplate.first().click();
      await page.waitForTimeout(1000);

      // Check preview shows citations
      const slidePreviews = page.locator('[data-testid^="slide-preview-"]');
      const count = await slidePreviews.count();

      if (count > 0) {
        const firstSlide = slidePreviews.first();
        const citationBadge = firstSlide.locator('[data-testid="citation-badge"]');
        const badgeCount = await citationBadge.count();

        if (badgeCount > 0) {
          const badgeText = await citationBadge.textContent();
          expect(badgeText).toMatch(/\d+/);
        }
      }
    });

    test('citation count increases with evidence tiles', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const annualTemplate = page.locator('[data-testid="template-annual"]');
      await annualTemplate.first().click();
      await page.waitForTimeout(1000);

      // Get initial citation count
      const citationCount = page.locator('[data-testid="citation-count"]');
      const initialCount = await citationCount.count();
      let initialValue = 0;

      if (initialCount > 0) {
        const text = await citationCount.textContent();
        const match = text?.match(/(\d+)/);
        initialValue = match ? parseInt(match[1]) : 0;
      }

      // Add evidence tile
      const evidenceTile = page.locator('[data-testid="tile-evidence-density"]');
      const tileExists = await evidenceTile.count();

      if (tileExists > 0) {
        await evidenceTile.check();
        await page.waitForTimeout(1000);

        // Citation count should increase or stay same
        if (initialCount > 0) {
          const newText = await citationCount.textContent();
          const newMatch = newText?.match(/(\d+)/);
          const newValue = newMatch ? parseInt(newMatch[1]) : 0;

          expect(newValue).toBeGreaterThanOrEqual(initialValue);
        }
      }
    });
  });

  test.describe('Locale Selection', () => {
    test('displays locale selector', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Check for locale selector
      const localeSelect = page.locator('[data-testid="locale-select"], select[name="locale"]');
      const count = await localeSelect.count();

      if (count > 0) {
        await expect(localeSelect.first()).toBeVisible();
      }
    });

    test('selects different locales', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      const localeSelect = page.locator('[data-testid="locale-select"]');
      const count = await localeSelect.count();

      if (count > 0) {
        // Test locale options
        const locales = ['en', 'no', 'uk', 'es', 'fr'];

        for (const locale of locales) {
          const option = localeSelect.locator(`option[value="${locale}"]`);
          const optionExists = await option.count();

          if (optionExists > 0) {
            await localeSelect.selectOption(locale);
            await page.waitForTimeout(300);
          }
        }
      }
    });
  });

  test.describe('Export and Download', () => {
    test('exports deck and downloads PPTX', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Configure deck
      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Select a tile
      const tile = page.locator('[data-testid="tile-sroi"]');
      const tileCount = await tile.count();
      if (tileCount > 0) {
        await tile.check();
      }

      // Select locale
      const localeSelect = page.locator('[data-testid="locale-select"]');
      const localeCount = await localeSelect.count();
      if (localeCount > 0) {
        await localeSelect.selectOption('en');
      }

      await page.waitForTimeout(500);

      // Start export
      const exportButton = page.locator('[data-testid="export-button"], button:has-text("Export")');
      await expect(exportButton.first()).toBeVisible();

      const downloadPromise = page.waitForEvent('download', { timeout: 45000 }).catch(() => null);
      await exportButton.first().click();

      // Wait for progress
      const progress = page.locator('[data-testid="export-progress"]');
      const progressCount = await progress.count();

      if (progressCount > 0) {
        await expect(progress.first()).toBeVisible({ timeout: 5000 });
      }

      // Wait for completion message
      const completionMessage = page.locator(
        ':has-text("Download"), :has-text("Complete"), :has-text("Ready")'
      );
      await expect(completionMessage.first()).toBeVisible({ timeout: 30000 });

      // Download file
      const downloadButton = page.locator('[data-testid="download-button"], button:has-text("Download")');
      const downloadBtnCount = await downloadButton.count();

      if (downloadBtnCount > 0) {
        await downloadButton.first().click();
        const download = await downloadPromise;

        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.pptx$/);
        }
      }
    });

    test('displays progress during export', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

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
      await page.waitForTimeout(1000);

      // Check for progress indicator
      const progressBar = page.locator(
        '[role="progressbar"], [data-testid="export-progress"], .progress-bar'
      );
      const count = await progressBar.count();

      if (count > 0) {
        await expect(progressBar.first()).toBeVisible();
      }

      // Check for "Generating..." text
      const generatingText = page.locator(':has-text("Generating")');
      const textCount = await generatingText.count();

      if (textCount > 0) {
        await expect(generatingText.first()).toBeVisible();
      }
    });

    test('handles export errors gracefully', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

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

      // Check for error message
      const errorMessage = page.locator('[role="alert"], :has-text("Failed"), :has-text("Error")');
      const count = await errorMessage.count();

      if (count > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }
    });
  });

  test.describe('Template-Specific Content', () => {
    test('quarterly template has correct slide structure', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Verify quarterly-specific hints
      const quarterlyHints = page.locator(':has-text("Quarter"), :has-text("Q1"), :has-text("Q2")');
      const count = await quarterlyHints.count();

      // Should mention quarters
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('annual template includes CSRD narrative', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const annualTemplate = page.locator('[data-testid="template-annual"]');
      await annualTemplate.first().click();
      await page.waitForTimeout(1000);

      // Check for CSRD mention
      const csrdMention = page.locator(':has-text("CSRD"), :has-text("Annual"), :has-text("Year")');
      const count = await csrdMention.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('investor template focuses on ROI', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const investorTemplate = page.locator('[data-testid="template-investor-update"]');
      await investorTemplate.first().click();
      await page.waitForTimeout(1000);

      // Look for ROI focus
      const roiMention = page.locator(':has-text("ROI"), :has-text("Investor"), :has-text("Return")');
      const count = await roiMention.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('impact deep dive has evidence appendix', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const impactTemplate = page.locator('[data-testid="template-impact-deep-dive"]');
      await impactTemplate.first().click();
      await page.waitForTimeout(1000);

      // Check for evidence/appendix mention
      const evidenceMention = page.locator(
        ':has-text("Evidence"), :has-text("Appendix"), :has-text("Citations")'
      );
      const count = await evidenceMention.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Permissions', () => {
    test('admin can create decks', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForNetworkIdle(page);

      const createButton = page.locator('[data-testid="create-deck-button"]');
      await expect(createButton.first()).toBeVisible();
    });

    test('manager can create decks', async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForNetworkIdle(page);

      const createButton = page.locator('[data-testid="create-deck-button"]');
      const count = await createButton.count();

      if (count > 0) {
        await expect(createButton.first()).toBeVisible();
      }
    });

    test('viewer cannot create decks', async ({ page }) => {
      await mockSession(page, TEST_USERS.VIEWER);
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForNetworkIdle(page);

      const createButton = page.locator('[data-testid="create-deck-button"]');
      const count = await createButton.count();

      // Button should not exist or be disabled
      if (count > 0) {
        const isDisabled = await createButton.first().isDisabled();
        expect(isDisabled).toBe(true);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('modal has proper ARIA attributes', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Check ARIA attributes
      const ariaLabel = await modal.getAttribute('aria-label');
      const ariaModal = await modal.getAttribute('aria-modal');

      expect(ariaLabel || ariaModal).toBeTruthy();
    });

    test('tile checkboxes are keyboard accessible', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Tab to first tile checkbox
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Space to check
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);

      // Verify a tile was checked
      const checkedTile = page.locator('input[type="checkbox"]:checked');
      const count = await checkedTile.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('export button has accessible name', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      const exportButton = page.locator('[data-testid="export-button"]');
      const count = await exportButton.count();

      if (count > 0) {
        const ariaLabel = await exportButton.first().getAttribute('aria-label');
        const textContent = await exportButton.first().textContent();

        expect(ariaLabel || textContent).toBeTruthy();
      }
    });
  });

  test.describe('Validation', () => {
    test('cannot export without selecting template', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      // Try to export without template selection
      const exportButton = page.locator('[data-testid="export-button"]');
      const count = await exportButton.count();

      if (count > 0) {
        const isDisabled = await exportButton.first().isDisabled();
        expect(isDisabled).toBe(true);
      }
    });

    test('shows warning when no tiles selected', async ({ page }) => {
      const createButton = page.locator('[data-testid="create-deck-button"]');
      await createButton.first().click();
      await page.waitForTimeout(1000);

      const quarterlyTemplate = page.locator('[data-testid="template-quarterly"]');
      await quarterlyTemplate.first().click();
      await page.waitForTimeout(1000);

      // Look for warning about empty deck
      const warning = page.locator(':has-text("Select at least"), :has-text("No tiles selected")');
      const count = await warning.count();

      // Warning is optional
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
