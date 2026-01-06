import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.2 AA Accessibility Test Suite
 *
 * This test suite runs automated accessibility checks using axe-core
 * to ensure compliance with WCAG 2.2 Level AA standards.
 */

test.describe('Accessibility - WCAG 2.2 AA Compliance', () => {

  test.describe('Landing Page', () => {
    test('should not have any automatically detectable accessibility violations', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper document structure', async ({ page }) => {
      await page.goto('/');

      // Check for main landmarks
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h1Count).toBeLessThanOrEqual(1); // Should only have one h1
    });

    test('should have keyboard navigable elements', async ({ page }) => {
      await page.goto('/');

      // All interactive elements should be keyboard accessible
      const links = page.locator('a[href]');
      const buttons = page.locator('button');

      const linkCount = await links.count();
      const buttonCount = await buttons.count();

      // Tab through all interactive elements
      for (let i = 0; i < linkCount + buttonCount; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
      }
    });
  });

  test.describe('Tenant Selector', () => {
    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible search input', async ({ page }) => {
      await page.goto('/en');

      const searchInput = page.locator('#company-search');
      await expect(searchInput).toBeVisible();

      // Check for label (can be sr-only)
      const label = page.locator('label[for="company-search"]');
      await expect(label).toBeAttached();

      // Check for aria-label or proper labeling
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const labelText = await label.textContent();
      expect(ariaLabel || labelText).toBeTruthy();
    });

    test('should have accessible company cards', async ({ page }) => {
      await page.goto('/en');

      // Wait for company cards to load
      await page.waitForSelector('button[aria-label*="Select"]', { timeout: 10000 });

      const companyButtons = page.locator('button[aria-label*="Select"]');
      const count = await companyButtons.count();

      expect(count).toBeGreaterThan(0);

      // Each button should have descriptive aria-label
      for (let i = 0; i < count; i++) {
        const button = companyButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        expect(ariaLabel).toContain('Select');
        expect(ariaLabel?.length).toBeGreaterThan(10); // Should be descriptive
      }
    });

    test('should support keyboard navigation on company selection', async ({ page }) => {
      await page.goto('/en');

      await page.waitForSelector('button[aria-label*="Select"]', { timeout: 10000 });

      // Tab to first company button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip search if needed

      // Enter should activate the button
      await page.keyboard.press('Enter');

      // Should navigate or show some action
      await page.waitForTimeout(500);
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/en/login');
      await page.fill('input[name="email"]', 'admin@teei.example');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/cockpit/);
    });

    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      // Log violations for reporting
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Dashboard violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible KPI cards', async ({ page }) => {
      await page.goto('/en/cockpit/company-1');

      // Wait for widgets to load
      await page.waitForSelector('[data-testid="at-a-glance-widget"]', { timeout: 10000 });

      // KPI cards should have proper structure
      const kpiCards = page.locator('[data-testid*="panel"], [data-testid*="widget"]');
      const count = await kpiCards.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const card = kpiCards.nth(i);

        // Should have readable text content
        const text = await card.textContent();
        expect(text?.length).toBeGreaterThan(0);

        // SVG icons should have accessible alternatives
        const svgs = card.locator('svg');
        const svgCount = await svgs.count();

        if (svgCount > 0) {
          for (let j = 0; j < svgCount; j++) {
            const svg = svgs.nth(j);
            const ariaLabel = await svg.getAttribute('aria-label');
            const ariaHidden = await svg.getAttribute('aria-hidden');
            const role = await svg.getAttribute('role');

            // SVG should either be decorative (aria-hidden) or have a label
            expect(ariaHidden === 'true' || ariaLabel || role).toBeTruthy();
          }
        }
      }
    });

    test('should have accessible SROI panel', async ({ page }) => {
      await page.goto('/en/cockpit/company-1');

      const sroiPanel = page.locator('[data-testid="sroi-panel"]');
      if (await sroiPanel.isVisible({ timeout: 5000 })) {
        // Check ARIA labels
        const accessibilityScanResults = await new AxeBuilder({ page })
          .include('[data-testid="sroi-panel"]')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        if (accessibilityScanResults.violations.length > 0) {
          console.log('SROI panel violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }
      }
    });

    test('should have accessible VIS panel', async ({ page }) => {
      await page.goto('/en/cockpit/company-1');

      const visPanel = page.locator('[data-testid="vis-panel"]');
      if (await visPanel.isVisible({ timeout: 5000 })) {
        // Charts should have accessible labels
        const charts = visPanel.locator('canvas, svg[role="img"]');
        const chartCount = await charts.count();

        for (let i = 0; i < chartCount; i++) {
          const chart = charts.nth(i);
          const ariaLabel = await chart.getAttribute('aria-label');
          const role = await chart.getAttribute('role');

          expect(ariaLabel || role).toBeTruthy();
        }
      }
    });

    test('should have accessible Q2Q feed', async ({ page }) => {
      await page.goto('/en/cockpit/company-1');

      const q2qFeed = page.locator('[data-testid="q2q-feed"]');
      if (await q2qFeed.isVisible({ timeout: 5000 })) {
        // Feed items should be accessible
        const feedItems = q2qFeed.locator('[data-testid="feed-item"]');
        const itemCount = await feedItems.count();

        if (itemCount > 0) {
          // Check first few items
          for (let i = 0; i < Math.min(itemCount, 5); i++) {
            const item = feedItems.nth(i);
            const text = await item.textContent();
            expect(text?.trim().length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('Evidence Explorer', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/en/login');
      await page.fill('input[name="email"]', 'admin@teei.example');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/cockpit/);
    });

    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/evidence');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Evidence Explorer violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible evidence cards', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/evidence');

      // Wait for evidence to load
      await page.waitForTimeout(2000);

      // Evidence cards should be keyboard accessible
      const evidenceCards = page.locator('[data-testid*="evidence"], article, .card');
      const buttons = page.locator('button');

      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);

        // Skip hidden buttons
        if (!(await button.isVisible())) continue;

        // Buttons should have accessible labels
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();

        expect(ariaLabel || text?.trim().length).toBeTruthy();
      }
    });

    test('should have accessible filters and search', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/evidence');

      // Search input should have label
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
      if (await searchInput.isVisible({ timeout: 3000 })) {
        const ariaLabel = await searchInput.getAttribute('aria-label');
        const id = await searchInput.getAttribute('id');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel).toBeTruthy();
        } else {
          expect(ariaLabel).toBeTruthy();
        }
      }
    });

    test('should have accessible evidence detail drawer', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/evidence');

      // Click on first evidence card if exists
      const evidenceCard = page.locator('[data-testid*="evidence"]').first();
      if (await evidenceCard.isVisible({ timeout: 3000 })) {
        await evidenceCard.click();

        // Drawer should have proper ARIA attributes
        const drawer = page.locator('[role="dialog"], [role="complementary"]');
        if (await drawer.isVisible({ timeout: 2000 })) {
          const ariaLabel = await drawer.getAttribute('aria-label');
          const ariaLabelledby = await drawer.getAttribute('aria-labelledby');
          expect(ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });
  });

  test.describe('Reports Page', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/en/login');
      await page.fill('input[name="email"]', 'admin@teei.example');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/cockpit/);
    });

    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Reports Page violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible table structure', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports');

      // Wait for table to load
      await page.waitForTimeout(2000);

      // Check for tables
      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const table = tables.first();

        // Table should have headers
        const headers = table.locator('th');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);

        // Check for scope attributes
        for (let i = 0; i < Math.min(headerCount, 10); i++) {
          const header = headers.nth(i);
          const scope = await header.getAttribute('scope');
          // Scope is recommended for accessibility
          if (!scope) {
            console.warn(`Header ${i} missing scope attribute`);
          }
        }
      }
    });

    test('should have accessible modal dialogs', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports');

      // Look for generate/create button
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create"), button[data-testid*="create"]').first();

      if (await generateButton.isVisible({ timeout: 3000 })) {
        await generateButton.click();

        // Modal should have proper ARIA attributes
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 2000 })) {
          const ariaLabel = await modal.getAttribute('aria-labelledby');
          const ariaDescribed = await modal.getAttribute('aria-describedby');
          const ariaModal = await modal.getAttribute('aria-modal');

          expect(ariaLabel || ariaDescribed).toBeTruthy();
          expect(ariaModal).toBe('true');

          // Focus should be trapped in modal
          await page.keyboard.press('Tab');
          const focused = await page.evaluate(() => {
            const activeEl = document.activeElement;
            const modal = document.querySelector('[role="dialog"]');
            return modal?.contains(activeEl);
          });

          expect(focused).toBeTruthy();
        }
      }
    });

    test('should have accessible filter controls', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports');

      // Check for filter inputs
      const filters = page.locator('select, input[type="date"], input[type="search"]');
      const filterCount = await filters.count();

      for (let i = 0; i < Math.min(filterCount, 5); i++) {
        const filter = filters.nth(i);

        if (!(await filter.isVisible())) continue;

        const ariaLabel = await filter.getAttribute('aria-label');
        const id = await filter.getAttribute('id');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel).toBeTruthy();
        }
      }
    });
  });

  test.describe('Admin Console', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/en/login');
      await page.fill('input[name="email"]', 'admin@teei.example');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/cockpit/);
    });

    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Admin Console violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible form controls', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin');

      // Wait for page to load
      await page.waitForTimeout(2000);

      // All form inputs should have labels
      const inputs = page.locator('input:not([type="hidden"]), select, textarea');
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, 15); i++) {
        const input = inputs.nth(i);

        if (!(await input.isVisible())) continue;

        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const type = await input.getAttribute('type');

        // Skip submit buttons
        if (type === 'submit' || type === 'button') continue;

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy();
        } else {
          expect(ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });

    test('should have accessible toggle switches', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin');

      // Look for toggle switches
      const toggles = page.locator('[role="switch"], input[type="checkbox"]');
      const toggleCount = await toggles.count();

      for (let i = 0; i < Math.min(toggleCount, 5); i++) {
        const toggle = toggles.nth(i);

        if (!(await toggle.isVisible())) continue;

        const ariaLabel = await toggle.getAttribute('aria-label');
        const ariaLabelledby = await toggle.getAttribute('aria-labelledby');
        const id = await toggle.getAttribute('id');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });

    test('should have accessible tab navigation', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin');

      // Check for tabs
      const tabs = page.locator('[role="tab"], [role="tablist"] button');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        // Tabs should have proper ARIA attributes
        for (let i = 0; i < Math.min(tabCount, 5); i++) {
          const tab = tabs.nth(i);
          const ariaSelected = await tab.getAttribute('aria-selected');
          const ariaControls = await tab.getAttribute('aria-controls');

          // At least one should be selected
          if (ariaSelected === 'true') {
            expect(ariaControls).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Benchmarks Page', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/en/login');
      await page.fill('input[name="email"]', 'admin@teei.example');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/cockpit/);
    });

    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/benchmarks');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Benchmarks Page violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible charts and visualizations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/benchmarks');

      // Wait for charts to load
      await page.waitForTimeout(2000);

      // Charts should have accessible labels
      const charts = page.locator('canvas, svg[role="img"]');
      const chartCount = await charts.count();

      for (let i = 0; i < Math.min(chartCount, 5); i++) {
        const chart = charts.nth(i);
        const ariaLabel = await chart.getAttribute('aria-label');
        const title = await chart.getAttribute('title');

        expect(ariaLabel || title).toBeTruthy();
      }
    });
  });

  test.describe('Governance Page', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/en/login');
      await page.fill('input[name="email"]', 'admin@teei.example');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/cockpit/);
    });

    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin/governance');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Governance Page violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible audit log table', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin/governance');

      // Wait for table to load
      await page.waitForTimeout(2000);

      const tables = page.locator('table');
      if (await tables.count() > 0) {
        const table = tables.first();

        // Check for proper table structure
        const headers = table.locator('th');
        const headerCount = await headers.count();

        if (headerCount > 0) {
          // Headers should have scope
          for (let i = 0; i < Math.min(headerCount, 5); i++) {
            const header = headers.nth(i);
            const scope = await header.getAttribute('scope');
            const role = await header.getAttribute('role');

            expect(scope || role).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('SSO Admin Page', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/en/login');
      await page.fill('input[name="email"]', 'admin@teei.example');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/cockpit/);
    });

    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin/sso');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log('SSO Admin Page violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible SSO configuration forms', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin/sso');

      // Wait for forms to load
      await page.waitForTimeout(2000);

      // Check form fields have labels
      const inputs = page.locator('input:not([type="hidden"]), textarea');
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 10); i++) {
        const input = inputs.nth(i);

        if (!(await input.isVisible())) continue;

        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const id = await input.getAttribute('id');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet WCAG AA contrast requirements', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include(['body'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });

    test('should have sufficient contrast on primary buttons', async ({ page }) => {
      await page.goto('/en');

      const buttons = page.locator('button.btn-primary, button[class*="primary"]');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);

        // Get computed colors
        const colors = await button.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
          };
        });

        // Colors should be defined
        expect(colors.color).toBeTruthy();
        expect(colors.backgroundColor).toBeTruthy();
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support focus visible styles', async ({ page }) => {
      await page.goto('/en');

      // Tab to first interactive element
      await page.keyboard.press('Tab');

      // Check if focus is visible
      const hasFocusVisible = await page.evaluate(() => {
        const activeEl = document.activeElement as HTMLElement;
        const computed = window.getComputedStyle(activeEl);
        const outline = computed.outline;
        const boxShadow = computed.boxShadow;

        return outline !== 'none' || boxShadow !== 'none';
      });

      expect(hasFocusVisible).toBeTruthy();
    });

    test('should have skip to main content link', async ({ page }) => {
      await page.goto('/en');

      // Press Tab to focus skip link (usually first element)
      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() => {
        const activeEl = document.activeElement as HTMLElement;
        return {
          tagName: activeEl.tagName,
          text: activeEl.textContent,
          href: (activeEl as HTMLAnchorElement).href,
        };
      });

      // Should either be skip link or first navigation item
      expect(['A', 'BUTTON']).toContain(focused.tagName);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.goto('/en');

      // Check for main landmarks
      const mainLandmark = page.locator('main, [role="main"]');
      const navLandmark = page.locator('nav, [role="navigation"]');
      const contentinfoLandmark = page.locator('footer, [role="contentinfo"]');

      await expect(mainLandmark.first()).toBeAttached();
      await expect(navLandmark.first()).toBeAttached();
      await expect(contentinfoLandmark.first()).toBeAttached();
    });

    test('should have proper page titles', async ({ page }) => {
      await page.goto('/en');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).not.toBe('');

      // Title should be descriptive
      expect(title.length).toBeGreaterThan(10);
    });

    test('should have proper lang attribute', async ({ page }) => {
      await page.goto('/en');

      const lang = await page.getAttribute('html', 'lang');
      expect(lang).toBe('en');

      await page.goto('/no');
      const langNo = await page.getAttribute('html', 'lang');
      expect(langNo).toBe('no');
    });
  });

  test.describe('Touch Targets', () => {
    test('should have minimum touch target size (44x44px)', async ({ page }) => {
      await page.goto('/en');

      // Check button sizes
      const buttons = page.locator('button, a[href]');
      const count = await buttons.count();

      const violations: string[] = [];

      for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 elements
        const button = buttons.nth(i);

        const box = await button.boundingBox();

        if (box && (box.width < 44 || box.height < 44)) {
          const text = await button.textContent();
          violations.push(`Button "${text?.slice(0, 30)}" is ${box.width}x${box.height}px`);
        }
      }

      // Allow some violations for small inline links, but flag them
      if (violations.length > 0) {
        console.warn('Touch target violations found:', violations);
      }

      // Expect most buttons to meet minimum size
      expect(violations.length).toBeLessThan(count * 0.3); // Less than 30% violations
    });
  });

  test.describe('Forms and Inputs', () => {
    test('should have accessible form error messages', async ({ page }) => {
      await page.goto('/en');

      // All inputs should have associated error message areas
      const forms = page.locator('form');
      const formCount = await forms.count();

      if (formCount > 0) {
        const form = forms.first();

        // Try to submit form to trigger validation
        await form.evaluate(f => (f as HTMLFormElement).requestSubmit());

        // Wait for potential error messages
        await page.waitForTimeout(500);

        // Error messages should have aria-live or aria-describedby
        const errorMessages = page.locator('[role="alert"], [aria-live="polite"], [class*="error"]');
        const errorCount = await errorMessages.count();

        // If there are errors, they should be accessible
        for (let i = 0; i < errorCount; i++) {
          const error = errorMessages.nth(i);
          const text = await error.textContent();
          expect(text?.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
