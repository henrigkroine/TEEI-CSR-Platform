import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Trust Center E2E Tests
 * Agent 4.1: E2E Test Engineer (Trust Center)
 *
 * This configuration sets up comprehensive end-to-end testing for:
 * - Public trust center pages
 * - System status displays
 * - Security & compliance information
 * - Evidence API endpoints
 * - WCAG 2.2 AA accessibility compliance
 * - Multi-browser compatibility
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only (2 retries as per pattern)
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
    // Base URL for Trust Center (Astro dev server on port 4322)
    baseURL: process.env.TRUST_CENTER_URL || 'http://localhost:4322',

    // Collect trace when retrying the failed test (on-first-retry pattern)
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
  // Trust Center is an Astro app, use astro dev server
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:4322',
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
  },
});
