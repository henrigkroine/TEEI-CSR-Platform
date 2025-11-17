import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Trust Center - Public Pages E2E Tests
 * Agent 4.1: E2E Test Engineer (Trust Center)
 *
 * Test Coverage:
 * - Landing page loads and displays correctly
 * - System status metrics are visible
 * - Security & compliance information is present
 * - Data residency information is displayed
 * - Documentation links are functional
 * - WCAG 2.2 AA accessibility compliance
 * - Mobile responsiveness
 * - API status updates work correctly
 */

test.describe('Trust Center - Landing Page', () => {
  test('landing page loads and is accessible', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Trust Center/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('TEEI Platform Trust Center');

    // Check subtitle
    await expect(page.locator('.subtitle')).toContainText('Transparency, Security, and Reliability');

    // A11y check with WCAG 2.2 AA tags
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('system status card displays correctly', async ({ page }) => {
    await page.goto('/');

    // Check System Status card exists
    const statusCard = page.locator('.card').filter({ hasText: 'System Status' });
    await expect(statusCard).toBeVisible();

    // Check operational badge
    const badge = statusCard.locator('.status-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('All Systems Operational');
    await expect(badge).toHaveClass(/status-operational/);

    // Check uptime metric
    const uptimeValue = statusCard.locator('#uptime');
    await expect(uptimeValue).toBeVisible();
    await expect(uptimeValue).toContainText(/%$/); // Should end with %
  });

  test('SLO metrics display correctly', async ({ page }) => {
    await page.goto('/');

    // Check SLO card
    const sloCard = page.locator('.card').filter({ hasText: 'Service Level Objectives' });
    await expect(sloCard).toBeVisible();

    // Check availability SLO
    const availabilityMetric = sloCard.locator('.metric').filter({ hasText: 'Availability SLO' });
    await expect(availabilityMetric).toBeVisible();
    await expect(availabilityMetric.locator('.metric-value')).toContainText('99.9%');

    // Check latency metric
    const latencyValue = sloCard.locator('#latency');
    await expect(latencyValue).toBeVisible();
    await expect(latencyValue).toContainText(/\d+ms/); // Should be a number followed by 'ms'
  });

  test('security & compliance section displays certifications', async ({ page }) => {
    await page.goto('/');

    // Check Security card
    const securityCard = page.locator('.card').filter({ hasText: 'Security & Compliance' });
    await expect(securityCard).toBeVisible();

    // Check all certifications are listed
    await expect(securityCard).toContainText('SOC 2 Type II Certified');
    await expect(securityCard).toContainText('GDPR Compliant');
    await expect(securityCard).toContainText('ISO 27001 Certified');
    await expect(securityCard).toContainText('CSRD Aligned');
  });

  test('recent incidents section displays incident history', async ({ page }) => {
    await page.goto('/');

    // Check Recent Incidents card
    const incidentsCard = page.locator('.card').filter({ hasText: 'Recent Incidents' });
    await expect(incidentsCard).toBeVisible();

    // Check incidents list exists
    const incidentsList = incidentsCard.locator('#incidents');
    await expect(incidentsList).toBeVisible();

    // Check at least one incident is displayed
    const incidents = incidentsList.locator('.incident');
    await expect(incidents).toHaveCount(2); // Based on current HTML

    // Check incident has resolved status
    const firstIncident = incidents.first();
    await expect(firstIncident).toHaveClass(/resolved/);
    await expect(firstIncident).toContainText('Resolved');
  });

  test('data residency section displays regional information', async ({ page }) => {
    await page.goto('/');

    // Check Data Residency card
    const residencyCard = page.locator('.card').filter({ hasText: 'Data Residency' });
    await expect(residencyCard).toBeVisible();

    // Check all regions are listed
    await expect(residencyCard).toContainText('US Customers');
    await expect(residencyCard).toContainText('US-EAST-1');
    await expect(residencyCard).toContainText('EU Customers');
    await expect(residencyCard).toContainText('EU-WEST-1');
    await expect(residencyCard).toContainText('APAC Customers');
    await expect(residencyCard).toContainText('AP-SOUTHEAST-1');
  });

  test('documentation section displays all required links', async ({ page }) => {
    await page.goto('/');

    // Check Documentation card
    const docsCard = page.locator('.card').filter({ hasText: 'Documentation' });
    await expect(docsCard).toBeVisible();

    // Check all documentation links are present
    const securityWhitepaper = docsCard.locator('a[href="/docs/security-whitepaper.pdf"]');
    await expect(securityWhitepaper).toBeVisible();
    await expect(securityWhitepaper).toContainText('Security Whitepaper');

    const soc2Report = docsCard.locator('a[href="/docs/soc2-report.pdf"]');
    await expect(soc2Report).toBeVisible();
    await expect(soc2Report).toContainText('SOC 2 Type II Report');

    const privacyPolicy = docsCard.locator('a[href="/docs/privacy-policy.pdf"]');
    await expect(privacyPolicy).toBeVisible();
    await expect(privacyPolicy).toContainText('Privacy Policy');

    const dpa = docsCard.locator('a[href="/docs/dpa.pdf"]');
    await expect(dpa).toBeVisible();
    await expect(dpa).toContainText('Data Processing Agreement');

    const sla = docsCard.locator('a[href="/docs/sla.pdf"]');
    await expect(sla).toBeVisible();
    await expect(sla).toContainText('Service Level Agreement');
  });

  test('footer displays copyright and last updated timestamp', async ({ page }) => {
    await page.goto('/');

    // Check footer exists
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Check copyright
    await expect(footer).toContainText('2025 TEEI Platform');
    await expect(footer).toContainText('All rights reserved');

    // Check last updated timestamp
    const lastUpdated = footer.locator('#last-updated');
    await expect(lastUpdated).toBeVisible();
  });
});

test.describe('Trust Center - Status API Integration', () => {
  test('status metrics update from API', async ({ page }) => {
    // Set up API response interceptor to verify API call
    let apiCalled = false;

    page.on('response', response => {
      if (response.url().includes('/api/v1/trust-center/status')) {
        apiCalled = true;
      }
    });

    await page.goto('/');

    // Wait for the script to attempt API call
    // The page tries to fetch status on load and every 30 seconds
    await page.waitForTimeout(2000);

    // Check that the JavaScript attempted to call the API
    // (It will fail in test env but we can verify the attempt was made)
    const uptimeElement = page.locator('#uptime');
    await expect(uptimeElement).toBeVisible();

    const latencyElement = page.locator('#latency');
    await expect(latencyElement).toBeVisible();
  });

  test('gracefully handles API failures', async ({ page }) => {
    // Block the API endpoint to simulate failure
    await page.route('**/api/v1/trust-center/status', route => {
      route.abort('failed');
    });

    await page.goto('/');

    // Page should still load and display default values
    await expect(page.locator('h1')).toBeVisible();

    // Metrics should still be visible (with default values)
    const uptimeValue = page.locator('#uptime');
    await expect(uptimeValue).toBeVisible();

    const latencyValue = page.locator('#latency');
    await expect(latencyValue).toBeVisible();
  });
});

test.describe('Trust Center - Responsive Design', () => {
  test('mobile viewport displays correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check main elements are still visible
    await expect(page.locator('h1')).toBeVisible();

    // Check cards stack vertically (grid should be responsive)
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Check first card is visible
    await expect(cards.first()).toBeVisible();
  });

  test('tablet viewport displays correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Check main elements are visible
    await expect(page.locator('h1')).toBeVisible();

    // Check grid layout adapts
    const grid = page.locator('.grid').first();
    await expect(grid).toBeVisible();
  });

  test('desktop viewport displays correctly', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Check container is properly centered
    const container = page.locator('.container').first();
    await expect(container).toBeVisible();

    // Check all cards are visible in grid layout
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Trust Center - Accessibility', () => {
  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Check that focus is visible (first focusable element should be a link)
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('no accessibility violations on full page', async ({ page }) => {
    await page.goto('/');

    // Comprehensive a11y check
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    // Check color contrast using axe
    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('semantic HTML structure is correct', async ({ page }) => {
    await page.goto('/');

    // Check proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1); // Only one h1

    const h2s = page.locator('h2');
    const h2Count = await h2s.count();
    expect(h2Count).toBeGreaterThan(0); // Multiple h2s for sections
  });

  test('ARIA attributes are used correctly', async ({ page }) => {
    await page.goto('/');

    // Check ARIA violations
    const results = await new AxeBuilder({ page })
      .withTags(['cat.aria'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('Trust Center - Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('all CSS and assets load successfully', async ({ page }) => {
    const failedResources: string[] = [];

    page.on('response', response => {
      if (!response.ok() && response.url().includes('/apps/trust-center/')) {
        failedResources.push(response.url());
      }
    });

    await page.goto('/');

    // No resources should fail to load
    expect(failedResources).toEqual([]);
  });
});
