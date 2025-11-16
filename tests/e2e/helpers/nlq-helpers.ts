/**
 * NLQ E2E Test Helper Utilities
 *
 * Common functions used across NLQ E2E tests
 * Provides page objects and utilities for testing Natural Language Query functionality
 */

import { Page, expect } from '@playwright/test';

// ===== TYPES =====

export interface NLQTestContext {
  companyId: string;
  userId: string;
  sessionId: string;
}

export interface NLQQueryResult {
  queryId: string;
  question: string;
  answerSummary: string;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  executionTimeMs: number;
  cached: boolean;
  dataRowCount: number;
}

export interface PerformanceMetrics {
  intentClassificationMs: number;
  queryExecutionMs: number;
  totalResponseMs: number;
  cached: boolean;
}

// ===== LOGIN HELPER =====

/**
 * Login helper specifically for NLQ tests
 */
export async function loginForNLQTests(page: Page): Promise<void> {
  await page.goto('/en/login');
  await page.fill('input[name="email"]', 'admin@teei.example');
  await page.fill('input[name="password"]', 'SecurePassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/cockpit/);
}

/**
 * Navigate to NLQ page
 */
export async function navigateToNLQPage(page: Page, companyId: string = 'company-1'): Promise<void> {
  await page.goto(`/en/cockpit/${companyId}/insights`);
  await page.waitForSelector('[data-testid="nlq-search-bar"]', { state: 'visible' });
}

// ===== SEARCH BAR HELPERS =====

/**
 * Submit a question via search bar
 */
export async function submitQuestion(
  page: Page,
  question: string,
  options: { waitForResult?: boolean; timeout?: number } = {}
): Promise<void> {
  const waitForResult = options.waitForResult !== false;
  const timeout = options.timeout || 5000;

  const searchInput = page.locator('[data-testid="nlq-search-input"]');
  await searchInput.clear();
  await searchInput.fill(question);
  await searchInput.press('Enter');

  if (waitForResult) {
    // Wait for answer card to appear
    await page.waitForSelector('[data-testid="answer-card"]', {
      state: 'visible',
      timeout
    });
  }
}

/**
 * Get autocomplete suggestions
 */
export async function getAutocompleteSuggestions(
  page: Page,
  partialQuery: string
): Promise<string[]> {
  const searchInput = page.locator('[data-testid="nlq-search-input"]');
  await searchInput.clear();
  await searchInput.fill(partialQuery);

  // Wait for suggestions to appear
  await page.waitForSelector('[data-testid="autocomplete-suggestion"]', {
    state: 'visible',
    timeout: 2000
  }).catch(() => null);

  const suggestions = await page.locator('[data-testid="autocomplete-suggestion"]').allTextContents();
  return suggestions;
}

/**
 * Click template card to populate question
 */
export async function clickTemplateCard(
  page: Page,
  templateName: string
): Promise<void> {
  const templateCard = page.locator(`[data-testid="template-card-${templateName}"]`);
  await expect(templateCard).toBeVisible();
  await templateCard.click();

  // Verify question was populated
  const searchInput = page.locator('[data-testid="nlq-search-input"]');
  await expect(searchInput).not.toHaveValue('');
}

// ===== ANSWER CARD HELPERS =====

/**
 * Get answer card details
 */
export async function getAnswerCardDetails(page: Page): Promise<NLQQueryResult> {
  const answerCard = page.locator('[data-testid="answer-card"]');
  await expect(answerCard).toBeVisible();

  const question = await answerCard.locator('[data-testid="answer-question"]').textContent() || '';
  const answerSummary = await answerCard.locator('[data-testid="answer-summary"]').textContent() || '';
  const confidenceBadge = await answerCard.locator('[data-testid="confidence-badge"]');
  const confidenceText = await confidenceBadge.textContent() || '';
  const queryIdElement = await answerCard.locator('[data-testid="query-id"]');
  const queryId = await queryIdElement.getAttribute('data-query-id') || '';

  // Parse confidence level from badge
  const confidenceLevel = confidenceText.toLowerCase().includes('high') ? 'high' :
                          confidenceText.toLowerCase().includes('medium') ? 'medium' : 'low';

  // Get metadata
  const metadataElement = answerCard.locator('[data-testid="answer-metadata"]');
  const executionTimeText = await metadataElement.locator('[data-testid="execution-time"]').textContent() || '0ms';
  const executionTimeMs = parseInt(executionTimeText.replace(/[^0-9]/g, '')) || 0;
  const cachedIndicator = await metadataElement.locator('[data-testid="cached-indicator"]').isVisible().catch(() => false);

  // Count data rows
  const dataRows = await answerCard.locator('[data-testid="data-row"]').count();

  return {
    queryId,
    question: question.trim(),
    answerSummary: answerSummary.trim(),
    confidence: 0.85, // Would need to extract from data attribute
    confidenceLevel,
    executionTimeMs,
    cached: cachedIndicator,
    dataRowCount: dataRows
  };
}

/**
 * Check if confidence badge is visible with correct styling
 */
export async function verifyConfidenceBadge(
  page: Page,
  expectedLevel: 'high' | 'medium' | 'low'
): Promise<void> {
  const badge = page.locator('[data-testid="confidence-badge"]');
  await expect(badge).toBeVisible();

  const badgeText = await badge.textContent();
  expect(badgeText?.toLowerCase()).toContain(expectedLevel);

  // Verify color coding
  const expectedColors = {
    high: /green|success/i,
    medium: /yellow|warning/i,
    low: /red|danger|error/i
  };

  const badgeClass = await badge.getAttribute('class') || '';
  expect(badgeClass).toMatch(expectedColors[expectedLevel]);
}

/**
 * Verify data visualization is rendered
 */
export async function verifyDataVisualization(
  page: Page,
  expectedType: 'table' | 'chart' | 'bar' | 'line' | 'pie'
): Promise<void> {
  const answerCard = page.locator('[data-testid="answer-card"]');

  if (expectedType === 'table') {
    const table = answerCard.locator('[data-testid="data-table"]');
    await expect(table).toBeVisible();
    // Verify table has rows
    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  } else {
    // Chart types
    const chart = answerCard.locator('[data-testid="data-chart"]');
    await expect(chart).toBeVisible();

    // Verify canvas or SVG element exists
    const visualElement = await chart.locator('canvas, svg').count();
    expect(visualElement).toBeGreaterThan(0);
  }
}

/**
 * Verify lineage view is available and expandable
 */
export async function verifyLineageView(page: Page): Promise<void> {
  const answerCard = page.locator('[data-testid="answer-card"]');
  const lineageButton = answerCard.locator('[data-testid="lineage-toggle-button"]');

  await expect(lineageButton).toBeVisible();
  await lineageButton.click();

  // Verify lineage panel appears
  const lineagePanel = answerCard.locator('[data-testid="lineage-panel"]');
  await expect(lineagePanel).toBeVisible();

  // Verify it contains data sources
  const dataSources = lineagePanel.locator('[data-testid="data-source"]');
  const sourceCount = await dataSources.count();
  expect(sourceCount).toBeGreaterThan(0);
}

// ===== EXPORT HELPERS =====

/**
 * Test export functionality
 */
export async function testExport(
  page: Page,
  format: 'csv' | 'json'
): Promise<void> {
  const answerCard = page.locator('[data-testid="answer-card"]');
  const exportButton = answerCard.locator(`[data-testid="export-${format}-button"]`);

  await expect(exportButton).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
}

// ===== FEEDBACK HELPERS =====

/**
 * Submit feedback (thumbs up/down)
 */
export async function submitFeedback(
  page: Page,
  rating: 'positive' | 'negative'
): Promise<void> {
  const answerCard = page.locator('[data-testid="answer-card"]');
  const feedbackButton = answerCard.locator(`[data-testid="feedback-${rating}"]`);

  await expect(feedbackButton).toBeVisible();
  await feedbackButton.click();

  // Wait for feedback confirmation
  await page.waitForSelector('[data-testid="feedback-submitted"]', {
    state: 'visible',
    timeout: 2000
  });
}

// ===== QUERY HISTORY HELPERS =====

/**
 * Open query history panel
 */
export async function openQueryHistory(page: Page): Promise<void> {
  const historyButton = page.locator('[data-testid="query-history-button"]');
  await historyButton.click();

  const historyPanel = page.locator('[data-testid="query-history-panel"]');
  await expect(historyPanel).toBeVisible();
}

/**
 * Re-run query from history
 */
export async function rerunQueryFromHistory(
  page: Page,
  questionText: string
): Promise<void> {
  await openQueryHistory(page);

  const historyItem = page.locator(`[data-testid="history-item"]:has-text("${questionText}")`);
  await expect(historyItem).toBeVisible();

  const rerunButton = historyItem.locator('[data-testid="rerun-query-button"]');
  await rerunButton.click();

  // Wait for answer card to update
  await page.waitForSelector('[data-testid="answer-card"]', { state: 'visible' });
}

// ===== PERFORMANCE HELPERS =====

/**
 * Measure query performance
 */
export async function measureQueryPerformance(
  page: Page,
  question: string
): Promise<PerformanceMetrics> {
  const startTime = Date.now();

  // Track network request
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/v1/nlq/ask') && response.status() === 200,
    { timeout: 10000 }
  );

  await submitQuestion(page, question, { waitForResult: false });

  const response = await responsePromise;
  const totalResponseMs = Date.now() - startTime;

  // Parse response to get breakdown
  const responseData = await response.json();
  const metadata = responseData.metadata || {};

  return {
    intentClassificationMs: metadata.intentClassificationMs || 0,
    queryExecutionMs: metadata.executionTimeMs || 0,
    totalResponseMs,
    cached: metadata.cached || false
  };
}

/**
 * Assert performance thresholds
 */
export function assertPerformanceThresholds(
  metrics: PerformanceMetrics,
  thresholds: {
    intentClassification?: number;
    totalResponse?: number;
    cachedResponse?: number;
  }
): void {
  if (thresholds.intentClassification && metrics.intentClassificationMs > thresholds.intentClassification) {
    throw new Error(
      `Intent classification took ${metrics.intentClassificationMs}ms, expected < ${thresholds.intentClassification}ms`
    );
  }

  if (metrics.cached && thresholds.cachedResponse && metrics.totalResponseMs > thresholds.cachedResponse) {
    throw new Error(
      `Cached response took ${metrics.totalResponseMs}ms, expected < ${thresholds.cachedResponse}ms`
    );
  }

  if (!metrics.cached && thresholds.totalResponse && metrics.totalResponseMs > thresholds.totalResponse) {
    throw new Error(
      `Total response took ${metrics.totalResponseMs}ms, expected < ${thresholds.totalResponse}ms`
    );
  }
}

// ===== ERROR HANDLING HELPERS =====

/**
 * Verify rate limit error handling
 */
export async function verifyRateLimitError(page: Page): Promise<void> {
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/rate limit|too many requests/i);

  // Verify retry-after info is shown
  const retryInfo = page.locator('[data-testid="retry-after"]');
  await expect(retryInfo).toBeVisible();
}

/**
 * Verify network error handling
 */
export async function verifyNetworkError(page: Page): Promise<void> {
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText(/network|connection|failed/i);

  // Verify retry button is available
  const retryButton = page.locator('[data-testid="retry-button"]');
  await expect(retryButton).toBeVisible();
}

// ===== CACHE HELPERS =====

/**
 * Clear query cache (admin only)
 */
export async function clearQueryCache(page: Page): Promise<void> {
  // Navigate to admin panel or use API
  await page.goto('/en/cockpit/company-1/admin/cache');
  const clearButton = page.locator('[data-testid="clear-nlq-cache-button"]');
  await clearButton.click();

  // Wait for confirmation
  await page.waitForSelector('[data-testid="cache-cleared-notification"]', {
    state: 'visible',
    timeout: 3000
  });
}

/**
 * Verify query is cached on second run
 */
export async function verifyCachedQuery(
  page: Page,
  question: string
): Promise<void> {
  // First run - should not be cached
  await submitQuestion(page, question);
  let details = await getAnswerCardDetails(page);
  expect(details.cached).toBe(false);

  // Second run - should be cached
  await page.reload();
  await submitQuestion(page, question);
  details = await getAnswerCardDetails(page);
  expect(details.cached).toBe(true);

  // Verify cached response is faster
  const metrics = await measureQueryPerformance(page, question);
  assertPerformanceThresholds(metrics, { cachedResponse: 200 });
}

// ===== WAIT HELPERS =====

/**
 * Wait for answer card to finish loading
 */
export async function waitForAnswerCardReady(page: Page, timeout: number = 5000): Promise<void> {
  const answerCard = page.locator('[data-testid="answer-card"]');
  await expect(answerCard).toBeVisible({ timeout });

  // Wait for loading spinner to disappear
  const loadingSpinner = answerCard.locator('[data-testid="loading-spinner"]');
  await expect(loadingSpinner).not.toBeVisible({ timeout: 1000 }).catch(() => {});

  // Ensure data is rendered
  await page.waitForTimeout(500);
}
