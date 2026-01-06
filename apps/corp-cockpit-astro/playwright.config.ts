import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Corporate CSR Platform E2E Tests
 *
 * This configuration sets up comprehensive end-to-end testing for:
 * - Authentication flows
 * - Multi-tenant isolation
 * - Dashboard metrics
 * - Evidence explorer
 * - Report generation
 * - Admin console
 * - Security constraints
 * - Performance budgets
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:6509',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot only on failure
    screenshot: 'only-on-failure',

    // Video only on failure
    video: 'retain-on-failure',

    // Default timeout for actions
    actionTimeout: 15000,

    // Default navigation timeout
    navigationTimeout: 30000,
  },

  // Global timeout for each test
  timeout: 60000,

  // Global timeout for entire test run
  globalTimeout: process.env.CI ? 600000 : undefined, // 10 minutes on CI

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5']
      },
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13']
      },
    },

    // Tablet viewport
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro']
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:6509',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: 'test-results',

  // Maximum time to wait for expect() to pass
  expect: {
    timeout: 10000,
    // Strict visual regression thresholds
    toHaveScreenshot: {
      // Maximum allowed pixel difference (0.2%)
      maxDiffPixelRatio: 0.002,
      // Maximum allowed different pixels
      maxDiffPixels: 100,
      // Threshold for pixel color difference (0-1)
      threshold: 0.2,
      // Animation handling
      animations: 'disabled',
      // CSS media type
      caret: 'hide',
    },
  },
});
