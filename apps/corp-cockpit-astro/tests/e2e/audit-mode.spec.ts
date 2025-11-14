import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Audit Mode
 *
 * Tests the audit mode functionality including:
 * - Enabling/disabling audit mode
 * - UI freeze and interaction restrictions
 * - Evidence ID overlay display
 * - Lineage chain visualization
 * - Audit mode persistence
 */

test.describe('Audit Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user with audit permissions
    await page.goto('/login');
    await page.fill('input[name="email"]', 'auditor@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should enable audit mode', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Verify audit mode toggle exists
    await expect(page.locator('[data-testid="audit-mode-toggle"]')).toBeVisible();

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');

    // Verify audit mode enabled
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-mode-indicator"]'))
      .toContainText('Audit Mode Active');

    // Verify audit mode badge
    await expect(page.locator('[data-testid="audit-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-badge"]')).toHaveClass(/audit-active/);

    // Verify toast notification
    await expect(page.locator('[data-testid="toast-info"]'))
      .toContainText('Audit mode enabled');
  });

  test('should freeze UI when audit mode is active', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Verify interactive buttons are disabled
    await expect(page.locator('button:has-text("Create Report")')).toBeDisabled();
    await expect(page.locator('button:has-text("Export")')).toBeDisabled();
    await expect(page.locator('button:has-text("Edit Dashboard")')).toBeDisabled();

    // Verify filters are disabled
    await expect(page.locator('[data-testid="date-range-picker"]')).toBeDisabled();
    await expect(page.locator('[data-testid="metric-filter"]')).toBeDisabled();

    // Verify navigation still works (read-only)
    await page.click('a[href="/reports"]');
    await expect(page).toHaveURL('/reports');
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Verify action buttons disabled on reports page
    await expect(page.locator('button:has-text("Create Report")')).toBeDisabled();
    await expect(page.locator('button:has-text("Delete")')).toBeDisabled();
  });

  test('should display evidence ID overlay on metric hover', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Hover over SROI metric card
    const sroiCard = page.locator('[data-testid="metric-card-sroi"]');
    await sroiCard.hover();

    // Verify evidence overlay appears
    await expect(page.locator('[data-testid="evidence-overlay"]')).toBeVisible();

    // Verify evidence ID displayed
    await expect(page.locator('[data-testid="evidence-id"]')).toBeVisible();
    const evidenceId = await page.locator('[data-testid="evidence-id"]').textContent();
    expect(evidenceId).toMatch(/EV-[A-Z0-9]{8,}/); // Format: EV-XXXXXXXX

    // Verify evidence metadata
    await expect(page.locator('[data-testid="evidence-source"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-timestamp"]')).toBeVisible();

    // Verify confidence score displayed
    await expect(page.locator('[data-testid="evidence-confidence"]')).toBeVisible();
    const confidence = await page.locator('[data-testid="evidence-confidence"]').textContent();
    expect(confidence).toMatch(/\d+%/); // Format: XX%
  });

  test('should show lineage chain when clicking evidence ID', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Hover over VIS metric card
    const visCard = page.locator('[data-testid="metric-card-vis"]');
    await visCard.hover();

    // Wait for evidence overlay
    await expect(page.locator('[data-testid="evidence-overlay"]')).toBeVisible();

    // Click on evidence ID to open lineage
    await page.click('[data-testid="evidence-id"]');

    // Verify lineage drawer opens
    await expect(page.locator('[data-testid="lineage-drawer"]')).toBeVisible();

    // Verify lineage chain displayed
    await expect(page.locator('[data-testid="lineage-chain"]')).toBeVisible();

    // Verify lineage nodes
    const lineageNodes = page.locator('[data-testid="lineage-node"]');
    const nodeCount = await lineageNodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(2); // At least source and derived

    // Verify first node (source)
    const firstNode = lineageNodes.first();
    await expect(firstNode.locator('[data-testid="node-type"]')).toContainText('Source');
    await expect(firstNode.locator('[data-testid="node-source"]')).toBeVisible();

    // Verify last node (current metric)
    const lastNode = lineageNodes.last();
    await expect(lastNode.locator('[data-testid="node-type"]')).toContainText('Derived');

    // Verify lineage connectors visible
    await expect(page.locator('[data-testid="lineage-connector"]').first()).toBeVisible();
  });

  test('should display transformation steps in lineage', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');

    // Open evidence for participation rate metric
    const participationCard = page.locator('[data-testid="metric-card-participation"]');
    await participationCard.hover();
    await page.click('[data-testid="evidence-id"]');

    // Verify lineage drawer open
    await expect(page.locator('[data-testid="lineage-drawer"]')).toBeVisible();

    // Verify transformation steps displayed
    const transformations = page.locator('[data-testid="transformation-step"]');
    const transformCount = await transformations.count();
    expect(transformCount).toBeGreaterThan(0);

    // Verify first transformation has details
    const firstTransform = transformations.first();
    await expect(firstTransform.locator('[data-testid="transform-type"]')).toBeVisible();
    await expect(firstTransform.locator('[data-testid="transform-formula"]')).toBeVisible();

    // Click on transformation to expand details
    await firstTransform.click();

    // Verify expanded transformation details
    await expect(page.locator('[data-testid="transform-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="transform-inputs"]')).toBeVisible();
    await expect(page.locator('[data-testid="transform-output"]')).toBeVisible();
  });

  test('should show provenance metadata in audit mode', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');

    // Hover over SROI card
    await page.locator('[data-testid="metric-card-sroi"]').hover();

    // Click evidence ID
    await page.click('[data-testid="evidence-id"]');

    // Verify provenance panel in lineage drawer
    await expect(page.locator('[data-testid="provenance-panel"]')).toBeVisible();

    // Verify provenance metadata fields
    await expect(page.locator('[data-testid="provenance-created-by"]')).toBeVisible();
    await expect(page.locator('[data-testid="provenance-created-at"]')).toBeVisible();
    await expect(page.locator('[data-testid="provenance-data-source"]')).toBeVisible();
    await expect(page.locator('[data-testid="provenance-collection-method"]')).toBeVisible();

    // Verify quality indicators
    await expect(page.locator('[data-testid="data-quality-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-status"]')).toBeVisible();

    // Verify compliance tags
    const complianceTags = page.locator('[data-testid="compliance-tag"]');
    const tagCount = await complianceTags.count();
    expect(tagCount).toBeGreaterThan(0);
  });

  test('should exit audit mode', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Verify UI is frozen
    await expect(page.locator('button:has-text("Create Report")')).toBeDisabled();

    // Disable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');

    // Verify audit mode disabled
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).not.toBeVisible();

    // Verify toast notification
    await expect(page.locator('[data-testid="toast-info"]'))
      .toContainText('Audit mode disabled');

    // Verify UI is unfrozen
    await expect(page.locator('button:has-text("Create Report")')).toBeEnabled();
    await expect(page.locator('button:has-text("Export")')).toBeEnabled();

    // Verify filters re-enabled
    await expect(page.locator('[data-testid="date-range-picker"]')).toBeEnabled();
  });

  test('should persist audit mode across page navigation', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Navigate to reports page
    await page.click('a[href="/reports"]');
    await expect(page).toHaveURL('/reports');

    // Verify audit mode still active
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Navigate to evidence explorer
    await page.goto('/evidence');

    // Verify audit mode still active
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Verify UI still frozen
    await expect(page.locator('button:has-text("Add Evidence")')).toBeDisabled();
  });

  test('should show audit log of viewed evidence', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');

    // View evidence for multiple metrics
    await page.locator('[data-testid="metric-card-sroi"]').hover();
    await page.click('[data-testid="evidence-id"]');
    await page.click('[data-testid="close-drawer"]');

    await page.locator('[data-testid="metric-card-vis"]').hover();
    await page.click('[data-testid="evidence-id"]');
    await page.click('[data-testid="close-drawer"]');

    // Open audit session log
    await page.click('[data-testid="audit-session-log"]');

    // Verify audit log modal
    await expect(page.locator('[data-testid="audit-log-modal"]')).toBeVisible();

    // Verify logged evidence views
    const logEntries = page.locator('[data-testid="audit-log-entry"]');
    const entryCount = await logEntries.count();
    expect(entryCount).toBeGreaterThanOrEqual(2);

    // Verify log entries have timestamps
    await expect(logEntries.first().locator('[data-testid="log-timestamp"]')).toBeVisible();

    // Verify log entries have evidence IDs
    await expect(logEntries.first().locator('[data-testid="log-evidence-id"]')).toBeVisible();

    // Verify export audit log button
    await expect(page.locator('button:has-text("Export Audit Log")')).toBeVisible();
  });

  test('should handle audit mode for read-only users', async ({ page }) => {
    // Logout and login as read-only user
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'viewer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');
    await expect(page.locator('[data-testid="audit-mode-indicator"]')).toBeVisible();

    // Verify evidence overlay works
    await page.locator('[data-testid="metric-card-sroi"]').hover();
    await expect(page.locator('[data-testid="evidence-overlay"]')).toBeVisible();

    // Click evidence ID
    await page.click('[data-testid="evidence-id"]');

    // Verify lineage drawer opens
    await expect(page.locator('[data-testid="lineage-drawer"]')).toBeVisible();

    // Verify read-only user can view but not modify
    await expect(page.locator('button:has-text("Edit Evidence")')).not.toBeVisible();
  });

  test('should highlight compliance-critical evidence', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Enable audit mode
    await page.click('[data-testid="audit-mode-toggle"]');

    // Hover over compliance-related metric
    await page.locator('[data-testid="metric-card-gdpr-compliance"]').hover();

    // Verify evidence overlay shows compliance badge
    await expect(page.locator('[data-testid="compliance-critical-badge"]')).toBeVisible();

    // Click evidence ID
    await page.click('[data-testid="evidence-id"]');

    // Verify lineage shows compliance checkpoints
    await expect(page.locator('[data-testid="compliance-checkpoint"]')).toBeVisible();

    // Verify compliance validation steps
    const validationSteps = page.locator('[data-testid="compliance-validation"]');
    const stepCount = await validationSteps.count();
    expect(stepCount).toBeGreaterThan(0);

    // Verify compliance framework tags
    await expect(page.locator('[data-testid="framework-tag-gdpr"]')).toBeVisible();
  });
});
