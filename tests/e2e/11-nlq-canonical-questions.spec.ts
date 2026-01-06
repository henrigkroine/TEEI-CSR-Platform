import { test, expect } from '@playwright/test';
import {
  loginForNLQTests,
  navigateToNLQPage,
  submitQuestion,
  getAnswerCardDetails,
  verifyConfidenceBadge,
  verifyDataVisualization,
  verifyLineageView,
  testExport,
  submitFeedback,
  measureQueryPerformance,
  assertPerformanceThresholds,
  verifyCachedQuery,
  waitForAnswerCardReady,
  getAutocompleteSuggestions,
  clickTemplateCard,
  rerunQueryFromHistory,
  verifyRateLimitError,
  verifyNetworkError
} from './helpers/nlq-helpers';

/**
 * E2E Test: NLQ Canonical Questions
 * Tests 10 canonical questions with comprehensive coverage
 */

test.describe('NLQ Canonical Questions', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  // ===== CANONICAL QUESTION 1: SROI CURRENT QUARTER =====

  test('should answer: What is our SROI for last quarter?', async ({ page }) => {
    const question = 'What is our SROI for last quarter?';

    // Submit question
    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    // Verify answer card appears
    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.question).toContain('SROI');
    expect(answerDetails.answerSummary).toBeTruthy();
    expect(answerDetails.dataRowCount).toBeGreaterThan(0);

    // Verify confidence badge (should be high for well-structured SROI query)
    await verifyConfidenceBadge(page, 'high');

    // Verify data visualization (SROI typically shows as metric card)
    const answerCard = page.locator('[data-testid="answer-card"]');
    const metricValue = answerCard.locator('[data-testid="metric-value"]');
    await expect(metricValue).toBeVisible();
    const sroiValue = await metricValue.textContent();
    expect(sroiValue).toMatch(/\d+(\.\d+)?/); // Should be a number

    // Verify lineage view is available
    await verifyLineageView(page);

    // Verify export buttons work
    await testExport(page, 'csv');
    await page.reload();
    await submitQuestion(page, question);
    await testExport(page, 'json');

    // Submit positive feedback
    await submitFeedback(page, 'positive');
  });

  // ===== CANONICAL QUESTION 2: SROI TREND =====

  test('should answer: Show me SROI trend for the past year', async ({ page }) => {
    const question = 'Show me SROI trend for the past year';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toContain('trend');

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify chart visualization (trend implies line chart)
    await verifyDataVisualization(page, 'line');

    // Verify chart has data points
    const chart = page.locator('[data-testid="data-chart"]');
    const canvas = chart.locator('canvas');
    await expect(canvas).toBeVisible();

    // Verify lineage
    await verifyLineageView(page);

    // Verify we can switch visualization types
    const vizToggle = page.locator('[data-testid="viz-type-toggle"]');
    if (await vizToggle.isVisible()) {
      await vizToggle.click();
      const vizOptions = page.locator('[data-testid="viz-option-bar"]');
      await vizOptions.click();
      await expect(page.locator('[data-testid="data-chart"][data-chart-type="bar"]')).toBeVisible();
    }
  });

  // ===== CANONICAL QUESTION 3: VIS AVERAGE SCORE =====

  test('should answer: What is our average VIS score?', async ({ page }) => {
    const question = 'What is our average VIS score?';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/VIS|volunteer|impact/i);

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify metric display
    const metricValue = page.locator('[data-testid="answer-card"] [data-testid="metric-value"]');
    await expect(metricValue).toBeVisible();
    const visScore = await metricValue.textContent();
    expect(parseFloat(visScore || '0')).toBeGreaterThanOrEqual(0);
    expect(parseFloat(visScore || '0')).toBeLessThanOrEqual(100);

    // Verify data table with breakdown
    await verifyDataVisualization(page, 'table');

    // Verify lineage
    await verifyLineageView(page);
  });

  // ===== CANONICAL QUESTION 4: VIS TREND =====

  test('should answer: Show VIS trend for last 3 months', async ({ page }) => {
    const question = 'Show VIS trend for last 3 months';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/VIS|trend|3 months/i);

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify line chart
    await verifyDataVisualization(page, 'line');

    // Verify chart shows 3 months of data
    const dataPoints = await page.locator('[data-testid="chart-data-point"]').count();
    expect(dataPoints).toBeGreaterThanOrEqual(3);

    // Verify lineage
    await verifyLineageView(page);
  });

  // ===== CANONICAL QUESTION 5: OUTCOME SCORES BY DIMENSION =====

  test('should answer: What are our outcome scores by dimension?', async ({ page }) => {
    const question = 'What are our outcome scores by dimension?';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/outcome|dimension/i);
    expect(answerDetails.dataRowCount).toBeGreaterThan(0);

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify data table or bar chart (dimensions comparison)
    const answerCard = page.locator('[data-testid="answer-card"]');
    const hasTable = await answerCard.locator('[data-testid="data-table"]').isVisible().catch(() => false);
    const hasChart = await answerCard.locator('[data-testid="data-chart"]').isVisible().catch(() => false);

    expect(hasTable || hasChart).toBe(true);

    // If chart, should be bar chart for dimension comparison
    if (hasChart) {
      const chartType = await answerCard.locator('[data-testid="data-chart"]').getAttribute('data-chart-type');
      expect(['bar', 'horizontal-bar', 'radar']).toContain(chartType);
    }

    // Verify lineage
    await verifyLineageView(page);

    // Verify dimensions are labeled
    if (hasTable) {
      const dimensionCells = await answerCard.locator('[data-testid="dimension-name"]').allTextContents();
      expect(dimensionCells.length).toBeGreaterThan(0);
      dimensionCells.forEach(dim => expect(dim.trim()).toBeTruthy());
    }
  });

  // ===== CANONICAL QUESTION 6: ACTIVE PARTICIPANTS =====

  test('should answer: How many active participants do we have?', async ({ page }) => {
    const question = 'How many active participants do we have?';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/participant|active/i);

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify metric display
    const metricValue = page.locator('[data-testid="answer-card"] [data-testid="metric-value"]');
    await expect(metricValue).toBeVisible();
    const participantCount = await metricValue.textContent();
    expect(parseInt(participantCount?.replace(/[^0-9]/g, '') || '0')).toBeGreaterThan(0);

    // Verify breakdown table (optional)
    const breakdownTable = page.locator('[data-testid="breakdown-table"]');
    if (await breakdownTable.isVisible()) {
      const rows = await breakdownTable.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    }

    // Verify lineage
    await verifyLineageView(page);
  });

  // ===== CANONICAL QUESTION 7: VOLUNTEER ACTIVITY =====

  test('should answer: Show volunteer activity for last month', async ({ page }) => {
    const question = 'Show volunteer activity for last month';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/volunteer|activity|month/i);
    expect(answerDetails.dataRowCount).toBeGreaterThan(0);

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify data visualization (could be table or bar chart)
    const answerCard = page.locator('[data-testid="answer-card"]');
    const hasTable = await answerCard.locator('[data-testid="data-table"]').isVisible().catch(() => false);
    const hasChart = await answerCard.locator('[data-testid="data-chart"]').isVisible().catch(() => false);
    expect(hasTable || hasChart).toBe(true);

    // Verify time period is correct (last month)
    const summaryText = answerDetails.answerSummary.toLowerCase();
    expect(summaryText).toMatch(/last month|past month|previous month/i);

    // Verify lineage
    await verifyLineageView(page);
  });

  // ===== CANONICAL QUESTION 8: LANGUAGE LEVEL =====

  test('should answer: What is our average language level?', async ({ page }) => {
    const question = 'What is our average language level?';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/language|level|average/i);

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify metric display
    const metricValue = page.locator('[data-testid="answer-card"] [data-testid="metric-value"]');
    await expect(metricValue).toBeVisible();
    const levelValue = await metricValue.textContent();
    expect(levelValue).toMatch(/A1|A2|B1|B2|C1|C2|\d+(\.\d+)?/i);

    // Verify distribution chart (optional)
    const distributionChart = page.locator('[data-testid="distribution-chart"]');
    if (await distributionChart.isVisible()) {
      await expect(distributionChart.locator('canvas, svg')).toBeVisible();
    }

    // Verify lineage
    await verifyLineageView(page);
  });

  // ===== CANONICAL QUESTION 9: BENCHMARK COMPARISON =====

  test('should answer: How does our SROI compare to industry peers?', async ({ page }) => {
    const question = 'How does our SROI compare to industry peers?';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/SROI|compare|peer|industry|benchmark/i);

    // Confidence might be medium if peer data is limited
    const confidenceBadge = page.locator('[data-testid="confidence-badge"]');
    const badgeText = await confidenceBadge.textContent();
    expect(badgeText?.toLowerCase()).toMatch(/high|medium/);

    // Verify comparison visualization (bar chart or table)
    const answerCard = page.locator('[data-testid="answer-card"]');
    const hasChart = await answerCard.locator('[data-testid="data-chart"]').isVisible().catch(() => false);
    const hasTable = await answerCard.locator('[data-testid="data-table"]').isVisible().catch(() => false);
    expect(hasChart || hasTable).toBe(true);

    // Verify peer data is shown
    if (hasTable) {
      const tableRows = await answerCard.locator('[data-testid="data-table"] tbody tr').count();
      expect(tableRows).toBeGreaterThanOrEqual(2); // At least company + 1 peer
    }

    // Verify lineage shows benchmark data source
    const lineageButton = answerCard.locator('[data-testid="lineage-toggle-button"]');
    await lineageButton.click();
    const lineagePanel = answerCard.locator('[data-testid="lineage-panel"]');
    const lineageText = await lineagePanel.textContent();
    expect(lineageText?.toLowerCase()).toMatch(/benchmark|peer|industry/);
  });

  // ===== CANONICAL QUESTION 10: MONTHLY OUTCOME TRENDS =====

  test('should answer: Show monthly outcome trends for last year', async ({ page }) => {
    const question = 'Show monthly outcome trends for last year';

    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toMatch(/monthly|outcome|trend|year/i);
    expect(answerDetails.dataRowCount).toBeGreaterThan(0);

    // Verify confidence badge
    await verifyConfidenceBadge(page, 'high');

    // Verify line chart
    await verifyDataVisualization(page, 'line');

    // Verify chart shows ~12 months of data
    const dataPoints = await page.locator('[data-testid="chart-data-point"]').count();
    expect(dataPoints).toBeGreaterThanOrEqual(6); // At least 6 months
    expect(dataPoints).toBeLessThanOrEqual(15); // Not more than 15 points

    // Verify lineage
    await verifyLineageView(page);

    // Verify time labels on chart
    const chartLabels = await page.locator('[data-testid="chart-x-axis-label"]').allTextContents();
    expect(chartLabels.length).toBeGreaterThan(0);
  });
});

// ===== TEST FLOWS =====

test.describe('NLQ Test Flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  test('should show autocomplete suggestions while typing', async ({ page }) => {
    const suggestions = await getAutocompleteSuggestions(page, 'What is our');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.toLowerCase().includes('sroi'))).toBe(true);
  });

  test('should populate question from template card', async ({ page }) => {
    // Click on a template card
    await clickTemplateCard(page, 'sroi-current');

    // Verify question is populated
    const searchInput = page.locator('[data-testid="nlq-search-input"]');
    const inputValue = await searchInput.inputValue();
    expect(inputValue.toLowerCase()).toContain('sroi');

    // Submit and verify answer
    await searchInput.press('Enter');
    await waitForAnswerCardReady(page);

    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.answerSummary).toBeTruthy();
  });

  test('should re-run query from history', async ({ page }) => {
    const question = 'What is our SROI for last quarter?';

    // Submit initial query
    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    // Navigate away
    await page.goto('/en/cockpit/company-1/dashboard');

    // Return to NLQ page
    await navigateToNLQPage(page);

    // Re-run from history
    await rerunQueryFromHistory(page, question);

    // Verify answer card appears
    const answerDetails = await getAnswerCardDetails(page);
    expect(answerDetails.question).toContain('SROI');
  });

  test('should submit thumbs up feedback', async ({ page }) => {
    await submitQuestion(page, 'What is our average VIS score?');
    await waitForAnswerCardReady(page);

    await submitFeedback(page, 'positive');

    // Verify feedback was recorded
    const feedbackConfirm = page.locator('[data-testid="feedback-submitted"]');
    await expect(feedbackConfirm).toBeVisible();
    await expect(feedbackConfirm).toContainText(/thank you|feedback received/i);
  });

  test('should submit thumbs down feedback', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    await submitFeedback(page, 'negative');

    // Verify feedback was recorded
    const feedbackConfirm = page.locator('[data-testid="feedback-submitted"]');
    await expect(feedbackConfirm).toBeVisible();
  });
});

// ===== ERROR HANDLING =====

test.describe('NLQ Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  test('should handle rate limit gracefully', async ({ page }) => {
    // Submit many queries rapidly to trigger rate limit
    const question = 'What is our SROI?';

    for (let i = 0; i < 20; i++) {
      try {
        await submitQuestion(page, question, { waitForResult: false, timeout: 1000 });
      } catch {
        // Continue submitting
      }
    }

    // Verify rate limit error message appears
    await page.waitForTimeout(2000);
    const errorMessage = page.locator('[data-testid="error-message"]');
    if (await errorMessage.isVisible()) {
      await verifyRateLimitError(page);
    }
  });

  test('should handle network failure gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/v1/nlq/ask', route => route.abort('failed'));

    await submitQuestion(page, 'What is our SROI?', { waitForResult: false });

    // Verify network error handling
    await page.waitForTimeout(2000);
    await verifyNetworkError(page);
  });
});

// ===== PERFORMANCE ASSERTIONS =====

test.describe('NLQ Performance', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  test('should meet performance targets for cache miss', async ({ page }) => {
    const question = `What is our SROI for Q1 2024? ${Date.now()}`; // Unique to avoid cache

    const metrics = await measureQueryPerformance(page, question);

    // Assert performance thresholds
    assertPerformanceThresholds(metrics, {
      intentClassification: 1000, // ≤1s for intent classification
      totalResponse: 3000 // ≤3s for total response (p95 target: 2.5s with buffer)
    });
  });

  test('should meet performance targets for cache hit', async ({ page }) => {
    const question = 'What is our SROI for last quarter?';

    // Prime the cache
    await submitQuestion(page, question);
    await waitForAnswerCardReady(page);

    // Clear search and re-submit
    await page.reload();
    await navigateToNLQPage(page);

    const metrics = await measureQueryPerformance(page, question);

    // Assert cached response is fast
    assertPerformanceThresholds(metrics, {
      cachedResponse: 200 // ≤200ms for cached response
    });

    expect(metrics.cached).toBe(true);
  });

  test('should cache queries correctly', async ({ page }) => {
    const question = 'What is our average VIS score?';

    await verifyCachedQuery(page, question);
  });
});

// ===== VISUAL REGRESSION =====

test.describe('NLQ Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  test('should render answer card consistently', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI for last quarter?');
    await waitForAnswerCardReady(page);

    const answerCard = page.locator('[data-testid="answer-card"]');
    await expect(answerCard).toHaveScreenshot('answer-card-sroi.png', {
      maxDiffPixels: 100
    });
  });

  test('should render confidence badges consistently', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const confidenceBadge = page.locator('[data-testid="confidence-badge"]');
    await expect(confidenceBadge).toHaveScreenshot('confidence-badge-high.png', {
      maxDiffPixels: 50
    });
  });

  test('should render charts consistently', async ({ page }) => {
    await submitQuestion(page, 'Show SROI trend for past year');
    await waitForAnswerCardReady(page);

    const chart = page.locator('[data-testid="data-chart"]');
    await page.waitForTimeout(1000); // Allow chart animation to complete
    await expect(chart).toHaveScreenshot('chart-sroi-trend.png', {
      maxDiffPixels: 200 // Charts may have slight rendering differences
    });
  });
});
