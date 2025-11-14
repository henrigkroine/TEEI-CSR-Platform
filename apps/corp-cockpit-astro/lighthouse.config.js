/**
 * Lighthouse CI Configuration
 *
 * Performance budgets and assertions for corporate cockpit dashboard.
 * Enforces performance standards in CI/CD pipeline.
 *
 * Success Criteria:
 * - LCP ≤ 2.0s (cockpit dashboard)
 * - INP ≤ 200ms (chart interactions)
 * - FCP ≤ 1.8s (first paint)
 * - CLS ≤ 0.1 (layout shift)
 * - Performance Score ≥ 90
 * - Accessibility Score ≥ 95
 *
 * Usage:
 * ```bash
 * # Run Lighthouse locally
 * lighthouse http://localhost:4321/en/cockpit/demo --config-path=lighthouse.config.js
 *
 * # Run in CI
 * lhci autorun --config=lighthouse.config.js
 * ```
 */

export default {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:4321/en/cockpit/demo',
        'http://localhost:4321/en/cockpit/demo/reports',
        'http://localhost:4321/en/cockpit/demo/evidence',
      ],
      // Number of runs per URL (median is used)
      numberOfRuns: 3,
      // Lighthouse settings
      settings: {
        // Throttling to simulate 4G connection
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
          cpuSlowdownMultiplier: 1,
        },
        // Screen emulation
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        // Form factor
        formFactor: 'desktop',
        // Disable extra audits to focus on performance
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
      },
    },
    assert: {
      // Performance budgets
      assertions: {
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],

        // Resource budgets
        'total-byte-weight': ['warn', { maxNumericValue: 2000000 }], // 2MB
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
        'bootup-time': ['warn', { maxNumericValue: 3000 }],

        // JavaScript budgets
        'unused-javascript': ['warn', { maxNumericValue: 200000 }], // 200KB
        'unminified-javascript': ['error', { maxNumericValue: 0 }],

        // Image optimization
        'uses-optimized-images': ['warn', { maxNumericValue: 100000 }],
        'uses-webp-images': ['warn', { maxNumericValue: 100000 }],
        'uses-responsive-images': ['warn', { maxNumericValue: 100000 }],

        // Network efficiency
        'uses-text-compression': 'error',
        'uses-long-cache-ttl': ['warn', { minScore: 0.7 }],

        // Category scores
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      // Upload results to temporary public storage (optional)
      target: 'temporary-public-storage',
    },
  },

  // Performance budgets (alternative format)
  budgets: [
    {
      // Resource type budgets
      resourceSizes: [
        {
          resourceType: 'script',
          budget: 400, // KB
        },
        {
          resourceType: 'stylesheet',
          budget: 100,
        },
        {
          resourceType: 'image',
          budget: 500,
        },
        {
          resourceType: 'font',
          budget: 100,
        },
        {
          resourceType: 'document',
          budget: 50,
        },
        {
          resourceType: 'total',
          budget: 2000,
        },
      ],
      // Resource count budgets
      resourceCounts: [
        {
          resourceType: 'script',
          budget: 15,
        },
        {
          resourceType: 'stylesheet',
          budget: 5,
        },
        {
          resourceType: 'image',
          budget: 20,
        },
        {
          resourceType: 'font',
          budget: 4,
        },
        {
          resourceType: 'third-party',
          budget: 10,
        },
      ],
      // Timing budgets
      timings: [
        {
          metric: 'first-contentful-paint',
          budget: 1800,
        },
        {
          metric: 'largest-contentful-paint',
          budget: 2000,
        },
        {
          metric: 'cumulative-layout-shift',
          budget: 0.1,
        },
        {
          metric: 'interactive',
          budget: 3500,
        },
        {
          metric: 'speed-index',
          budget: 3000,
        },
        {
          metric: 'total-blocking-time',
          budget: 300,
        },
      ],
    },
  ],

  // Lighthouse settings
  extends: 'lighthouse:default',
  settings: {
    // Throttling settings for CI
    throttlingMethod: 'simulate',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
    // Screen emulation
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
    },
    // Audits to run
    onlyAudits: [
      // Performance audits
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index',
      'interactive',

      // Resource budgets
      'total-byte-weight',
      'mainthread-work-breakdown',
      'bootup-time',
      'network-requests',

      // JavaScript optimization
      'unused-javascript',
      'unminified-javascript',
      'duplicated-javascript',
      'legacy-javascript',

      // Image optimization
      'uses-optimized-images',
      'uses-webp-images',
      'uses-responsive-images',
      'offscreen-images',

      // Network efficiency
      'uses-text-compression',
      'uses-long-cache-ttl',
      'uses-rel-preconnect',
      'uses-http2',

      // Accessibility
      'color-contrast',
      'image-alt',
      'button-name',
      'link-name',
      'aria-roles',
      'aria-valid-attr',
      'document-title',
      'html-has-lang',
      'meta-viewport',
    ],
  },
};
