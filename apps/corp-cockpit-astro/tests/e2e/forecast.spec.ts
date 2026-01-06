/**
 * E2E Tests for Forecast Dashboard
 *
 * Tests cover:
 * - Metric selection and forecast generation
 * - Confidence bands rendering
 * - Scenario comparison display
 * - Backtest results
 * - Advanced settings modal
 * - Export functionality
 * - Loading states and error handling
 * - Accessibility compliance
 *
 * @author confidence-band-renderer & scenario-modeler
 */

import { test, expect, type Page } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

// Test data
const TEST_COMPANY_ID = 'test-company-123';
const TEST_LANG = 'en';
const FORECAST_URL = `/${TEST_LANG}/cockpit/${TEST_COMPANY_ID}/forecast`;

// Mock forecast API response
const mockForecastResponse = {
  historical: [
    { date: '2024-01', value: 3.2 },
    { date: '2024-02', value: 3.4 },
    { date: '2024-03', value: 3.5 },
    { date: '2024-04', value: 3.6 },
    { date: '2024-05', value: 3.7 },
    { date: '2024-06', value: 3.8 },
  ],
  forecast: {
    predictions: [
      { date: '2024-07', value: 3.9 },
      { date: '2024-08', value: 4.0 },
      { date: '2024-09', value: 4.1 },
      { date: '2024-10', value: 4.2 },
      { date: '2024-11', value: 4.3 },
      { date: '2024-12', value: 4.4 },
    ],
    confidenceBands: {
      lower80: [3.6, 3.7, 3.8, 3.9, 4.0, 4.1],
      upper80: [4.2, 4.3, 4.4, 4.5, 4.6, 4.7],
      lower95: [3.4, 3.5, 3.6, 3.7, 3.8, 3.9],
      upper95: [4.4, 4.5, 4.6, 4.7, 4.8, 4.9],
    },
  },
  scenarios: {
    optimistic: [
      { date: '2024-07', value: 4.2 },
      { date: '2024-08', value: 4.3 },
      { date: '2024-09', value: 4.4 },
      { date: '2024-10', value: 4.5 },
      { date: '2024-11', value: 4.6 },
      { date: '2024-12', value: 4.7 },
    ],
    realistic: [
      { date: '2024-07', value: 3.9 },
      { date: '2024-08', value: 4.0 },
      { date: '2024-09', value: 4.1 },
      { date: '2024-10', value: 4.2 },
      { date: '2024-11', value: 4.3 },
      { date: '2024-12', value: 4.4 },
    ],
    pessimistic: [
      { date: '2024-07', value: 3.6 },
      { date: '2024-08', value: 3.7 },
      { date: '2024-09', value: 3.8 },
      { date: '2024-10', value: 3.9 },
      { date: '2024-11', value: 4.0 },
      { date: '2024-12', value: 4.1 },
    ],
  },
  backtest: {
    folds: [
      {
        trainPeriod: { start: '2023-01', end: '2023-08' },
        testPeriod: { start: '2023-09', end: '2023-12' },
        predictions: [
          { date: '2023-09', actual: 3.1, predicted: 3.0 },
          { date: '2023-10', actual: 3.2, predicted: 3.1 },
          { date: '2023-11', actual: 3.3, predicted: 3.2 },
          { date: '2023-12', actual: 3.4, predicted: 3.3 },
        ],
        mae: 0.1,
        rmse: 0.12,
        mape: 3.2,
      },
      {
        trainPeriod: { start: '2023-02', end: '2023-09' },
        testPeriod: { start: '2023-10', end: '2024-01' },
        predictions: [
          { date: '2023-10', actual: 3.2, predicted: 3.15 },
          { date: '2023-11', actual: 3.3, predicted: 3.25 },
          { date: '2023-12', actual: 3.4, predicted: 3.35 },
          { date: '2024-01', actual: 3.5, predicted: 3.45 },
        ],
        mae: 0.05,
        rmse: 0.06,
        mape: 1.5,
      },
    ],
    avgMetrics: {
      mae: 0.075,
      rmse: 0.09,
      mape: 2.35,
    },
  },
  metric: {
    name: 'SROI Ratio',
    unit: 'ratio',
  },
};

// Helper function to mock API responses
async function setupMockAPI(page: Page) {
  await page.route('**/api/forecasts/generate*', async (route) => {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockForecastResponse),
    });
  });

  await page.route('**/forecasts/export/pdf*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('mock-pdf-content'),
    });
  });

  await page.route('**/forecasts/export/csv*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/csv',
      body: 'Date,Value\n2024-07,3.9\n2024-08,4.0',
    });
  });
}

test.describe('Forecast Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAPI(page);
    await page.goto(FORECAST_URL);
  });

  test('should display page header and controls', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Predictive Analytics & Forecasting');
    await expect(page.getByText('Back to Dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export PDF/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
  });

  test('should render forecast builder controls', async ({ page }) => {
    // Wait for React hydration
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Check metric selector
    await expect(page.locator('label:has-text("Metric")')).toBeVisible();
    const metricSelect = page.locator('#metric-select');
    await expect(metricSelect).toBeVisible();
    await expect(metricSelect).toHaveValue('sroi_ratio');

    // Check horizon slider
    await expect(page.locator('label:has-text("Forecast Horizon")')).toBeVisible();
    const horizonSlider = page.locator('#horizon-slider');
    await expect(horizonSlider).toBeVisible();
    await expect(horizonSlider).toHaveValue('6');

    // Check model buttons
    await expect(page.getByRole('radio', { name: 'ETS' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Prophet' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Ensemble' })).toBeVisible();

    // Check generate button
    await expect(page.getByRole('button', { name: /Generate Forecast/i })).toBeVisible();
  });

  test('should generate forecast when button clicked', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Click generate button
    const generateBtn = page.getByRole('button', { name: /Generate Forecast/i });
    await generateBtn.click();

    // Check loading state
    await expect(page.getByText(/Generating Forecast/i)).toBeVisible();

    // Wait for results
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });

    // Verify summary cards are displayed
    await expect(page.getByText('6-Month Estimate')).toBeVisible();
    await expect(page.getByText('Expected Growth')).toBeVisible();
    await expect(page.getByText('Mean Absolute Error')).toBeVisible();
  });

  test('should render confidence bands chart', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Generate forecast
    await page.getByRole('button', { name: /Generate Forecast/i }).click();
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });

    // Check that Forecast tab is active by default
    const forecastTab = page.getByRole('tab', { name: 'Forecast' });
    await expect(forecastTab).toHaveAttribute('aria-selected', 'true');

    // Check chart is rendered
    await expect(page.getByText('Forecast with Confidence Bands')).toBeVisible();
    await expect(page.getByText(/Understanding Confidence Bands/i)).toBeVisible();

    // Verify canvas element (Chart.js renders to canvas)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should display scenario comparison', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Generate forecast
    await page.getByRole('button', { name: /Generate Forecast/i }).click();
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });

    // Switch to Scenarios tab
    const scenariosTab = page.getByRole('tab', { name: 'Scenarios' });
    await scenariosTab.click();
    await expect(scenariosTab).toHaveAttribute('aria-selected', 'true');

    // Verify three scenario columns
    await expect(page.getByText('Optimistic')).toBeVisible();
    await expect(page.getByText('Realistic')).toBeVisible();
    await expect(page.getByText('Pessimistic')).toBeVisible();

    // Check scenario data is displayed
    await expect(page.getByText(/growth/i)).toBeVisible();

    // Verify assumptions tooltips
    const optimisticInfo = page.locator('button[aria-label="Show optimistic scenario assumptions"]');
    await expect(optimisticInfo).toBeVisible();
  });

  test('should show assumptions when info button clicked', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Generate forecast and go to scenarios
    await page.getByRole('button', { name: /Generate Forecast/i }).click();
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });
    await page.getByRole('tab', { name: 'Scenarios' }).click();

    // Click info button for optimistic scenario
    const infoBtn = page.locator('button[aria-label="Show optimistic scenario assumptions"]');
    await infoBtn.click();

    // Verify assumption text is shown
    await expect(page.getByText(/Upper 80% confidence/i)).toBeVisible();
  });

  test('should display backtest results', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Generate forecast
    await page.getByRole('button', { name: /Generate Forecast/i }).click();
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });

    // Switch to Accuracy tab
    const accuracyTab = page.getByRole('tab', { name: 'Accuracy' });
    await accuracyTab.click();
    await expect(accuracyTab).toHaveAttribute('aria-selected', 'true');

    // Verify accuracy metrics
    await expect(page.getByText('MAE (Mean Absolute Error)')).toBeVisible();
    await expect(page.getByText('RMSE (Root Mean Squared Error)')).toBeVisible();
    await expect(page.getByText('MAPE (Mean Absolute % Error)')).toBeVisible();
    await expect(page.getByText('Overall Rating')).toBeVisible();

    // Verify charts
    await expect(page.getByText('Actual vs. Predicted Values')).toBeVisible();
    await expect(page.getByText('Residual Plot')).toBeVisible();

    // Verify fold details table
    await expect(page.getByText('Cross-Validation Fold Details')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Fold' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Training Period' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Test Period' })).toBeVisible();
  });

  test('should open and close advanced settings modal', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Click advanced settings button
    const settingsBtn = page.getByRole('button', { name: /Advanced Settings/i });
    await settingsBtn.click();

    // Verify modal is open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Advanced Forecast Settings')).toBeVisible();

    // Verify tabs
    await expect(page.getByRole('tab', { name: 'ETS Model' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Prophet Model' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Ensemble' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Validation' })).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: 'Cancel' });
    await closeBtn.click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should configure ETS settings', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Open settings
    await page.getByRole('button', { name: /Advanced Settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // ETS tab should be active by default
    const etsTab = page.getByRole('tab', { name: 'ETS Model' });
    await expect(etsTab).toHaveAttribute('aria-selected', 'true');

    // Change ETS method
    const methodSelect = page.locator('select').first();
    await methodSelect.selectOption('holt');
    await expect(methodSelect).toHaveValue('holt');

    // Adjust seasonal period slider
    const seasonalSlider = page.locator('input[type="range"]').first();
    await seasonalSlider.fill('6');

    // Toggle damped trend checkbox
    const dampedCheckbox = page.locator('#ets-damped');
    await dampedCheckbox.check();
    await expect(dampedCheckbox).toBeChecked();
  });

  test('should configure Prophet settings', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Open settings and switch to Prophet tab
    await page.getByRole('button', { name: /Advanced Settings/i }).click();
    const prophetTab = page.getByRole('tab', { name: 'Prophet Model' });
    await prophetTab.click();

    // Change growth type
    const logisticRadio = page.locator('input[type="radio"][value="logistic"]');
    await logisticRadio.check();
    await expect(logisticRadio).toBeChecked();

    // Toggle seasonality checkboxes
    const weeklyCheckbox = page.locator('#prophet-weekly');
    await weeklyCheckbox.uncheck();
    await expect(weeklyCheckbox).not.toBeChecked();

    const yearlyCheckbox = page.locator('#prophet-yearly');
    await expect(yearlyCheckbox).toBeChecked(); // Should be checked by default
  });

  test('should export forecast to PDF', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Click export PDF button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export PDF/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/forecast-.*\.pdf/);
  });

  test('should export forecast to CSV', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Click export CSV button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/forecast-.*\.csv/);
  });

  test('should change metric and regenerate', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Generate initial forecast
    await page.getByRole('button', { name: /Generate Forecast/i }).click();
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });

    // Change metric
    const metricSelect = page.locator('#metric-select');
    await metricSelect.selectOption('vis_score');
    await expect(metricSelect).toHaveValue('vis_score');

    // Generate new forecast
    await page.getByRole('button', { name: /Generate Forecast/i }).click();
    await expect(page.getByText(/Generating Forecast/i)).toBeVisible();
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });
  });

  test('should adjust forecast horizon', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    const horizonSlider = page.locator('#horizon-slider');

    // Change horizon to 12 months
    await horizonSlider.fill('12');
    await expect(page.getByText('12 months')).toBeVisible();

    // Change horizon to 3 months
    await horizonSlider.fill('3');
    await expect(page.getByText('3 months')).toBeVisible();
  });

  test('should switch between models', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Click ETS model button
    const etsBtn = page.getByRole('radio', { name: 'ETS' });
    await etsBtn.click();
    await expect(etsBtn).toHaveAttribute('aria-checked', 'true');

    // Click Prophet model button
    const prophetBtn = page.getByRole('radio', { name: 'Prophet' });
    await prophetBtn.click();
    await expect(prophetBtn).toHaveAttribute('aria-checked', 'true');
    await expect(etsBtn).toHaveAttribute('aria-checked', 'false');
  });

  test('should handle forecast generation error gracefully', async ({ page }) => {
    // Override mock to return error
    await page.route('**/api/forecasts/generate*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto(FORECAST_URL);
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Try to generate forecast
    await page.getByRole('button', { name: /Generate Forecast/i }).click();

    // Verify error message is shown
    await expect(page.getByText(/Failed to generate forecast/i)).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Tab through controls
    await page.keyboard.press('Tab'); // Back link
    await page.keyboard.press('Tab'); // Export PDF
    await page.keyboard.press('Tab'); // Export CSV
    await page.keyboard.press('Tab'); // Metric select
    await page.keyboard.press('Tab'); // Horizon slider
    await page.keyboard.press('Tab'); // Model button 1

    // Activate model button with Space
    await page.keyboard.press('Space');

    // Tab to generate button
    await page.keyboard.press('Tab'); // Model button 2
    await page.keyboard.press('Tab'); // Model button 3
    await page.keyboard.press('Tab'); // Advanced settings
    await page.keyboard.press('Tab'); // Generate button

    // Activate with Enter
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Generating Forecast/i)).toBeVisible();
  });

  test('should meet WCAG 2.2 AA accessibility standards', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Inject axe-core
    await injectAxe(page);

    // Run accessibility checks
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Check ARIA labels on key elements
    await expect(page.locator('[aria-label="Forecast horizon: 6 months"]')).toBeVisible();
    await expect(page.locator('[role="radiogroup"][aria-label="Select forecasting model"]')).toBeVisible();

    // Generate forecast to check chart ARIA labels
    await page.getByRole('button', { name: /Generate Forecast/i }).click();
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });

    await expect(page.locator('[role="img"][aria-label*="Forecast chart"]')).toBeVisible();
  });

  test('should display loading skeleton during generation', async ({ page }) => {
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Click generate
    await page.getByRole('button', { name: /Generate Forecast/i }).click();

    // Check loading state with progress
    const loadingText = page.getByText(/Generating Forecast\.\.\. \d+%/);
    await expect(loadingText).toBeVisible();

    // Wait for completion
    await page.waitForSelector('text=6-Month Estimate', { timeout: 5000 });
    await expect(loadingText).not.toBeVisible();
  });

  test('should render responsively on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('#forecast-card-container', { state: 'visible' });

    // Verify main elements are still visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#metric-select')).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Forecast/i })).toBeVisible();

    // Check that export buttons stack vertically (should have full width)
    const exportBtn = page.getByRole('button', { name: /Export PDF/i });
    const bbox = await exportBtn.boundingBox();
    expect(bbox?.width).toBeGreaterThan(300); // Should be nearly full width on mobile
  });
});
