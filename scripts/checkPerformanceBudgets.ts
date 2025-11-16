/**
 * Performance Budget Enforcement Script
 *
 * Runs Lighthouse CI on key routes and enforces performance budgets.
 * Exits with error if any budget fails (for CI/CD pipelines).
 *
 * Performance Budgets:
 * - FCP (First Contentful Paint): ≤2.0s
 * - LCP (Largest Contentful Paint): ≤2.5s
 * - TBT (Total Blocking Time): ≤300ms
 * - CLS (Cumulative Layout Shift): ≤0.1
 * - Performance Score: ≥90
 *
 * Usage:
 * ```bash
 * # Run against local development server
 * tsx scripts/checkPerformanceBudgets.ts
 *
 * # Run against custom URL
 * BASE_URL=https://staging.example.com tsx scripts/checkPerformanceBudgets.ts
 *
 * # Verbose output
 * VERBOSE=1 tsx scripts/checkPerformanceBudgets.ts
 * ```
 *
 * @module scripts/checkPerformanceBudgets
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Performance budget thresholds
 */
interface PerformanceBudget {
  /** First Contentful Paint (ms) */
  fcp: number;
  /** Largest Contentful Paint (ms) */
  lcp: number;
  /** Total Blocking Time (ms) */
  tbt: number;
  /** Cumulative Layout Shift */
  cls: number;
  /** Overall Performance Score (0-100) */
  performanceScore: number;
}

/**
 * Lighthouse result metrics
 */
interface LighthouseMetrics {
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  performanceScore: number;
  url: string;
}

/**
 * Budget enforcement result
 */
interface BudgetResult {
  url: string;
  passed: boolean;
  metrics: LighthouseMetrics;
  failures: string[];
}

/**
 * Performance budgets (from requirements)
 */
const PERFORMANCE_BUDGETS: PerformanceBudget = {
  fcp: 2000, // 2.0s
  lcp: 2500, // 2.5s
  tbt: 300, // 300ms
  cls: 0.1, // 0.1
  performanceScore: 90, // 90/100
};

/**
 * Key routes to test
 */
const ROUTES_TO_TEST = [
  '/',
  '/dashboard',
  '/reports',
  '/export',
];

/**
 * Configuration
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const VERBOSE = process.env.VERBOSE === '1';
const LIGHTHOUSE_OUTPUT_DIR = join(process.cwd(), '.lighthouse');

/**
 * Log with optional verbose mode
 */
function log(message: string, level: 'info' | 'error' | 'success' = 'info'): void {
  const prefix = {
    info: '[INFO]',
    error: '[ERROR]',
    success: '[SUCCESS]',
  }[level];

  console.log(`${prefix} ${message}`);
}

/**
 * Ensure Lighthouse output directory exists
 */
function ensureOutputDir(): void {
  if (!existsSync(LIGHTHOUSE_OUTPUT_DIR)) {
    mkdirSync(LIGHTHOUSE_OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Run Lighthouse on a URL
 */
function runLighthouse(url: string): LighthouseMetrics | null {
  const outputPath = join(LIGHTHOUSE_OUTPUT_DIR, `lighthouse-${Date.now()}.json`);

  log(`Running Lighthouse on ${url}...`, 'info');

  try {
    // Run Lighthouse with performance-only category
    const command = `lighthouse "${url}" \
      --output=json \
      --output-path="${outputPath}" \
      --only-categories=performance \
      --preset=desktop \
      --quiet \
      --chrome-flags="--headless --no-sandbox --disable-gpu"`;

    if (VERBOSE) {
      log(`Command: ${command}`, 'info');
    }

    execSync(command, {
      stdio: VERBOSE ? 'inherit' : 'pipe',
      encoding: 'utf-8',
    });

    // Parse the output
    const reportJson = JSON.parse(readFileSync(outputPath, 'utf-8'));

    // Extract metrics
    const audits = reportJson.audits;
    const categories = reportJson.categories;

    const metrics: LighthouseMetrics = {
      fcp: audits['first-contentful-paint']?.numericValue || 0,
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      tbt: audits['total-blocking-time']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      performanceScore: (categories.performance?.score || 0) * 100,
      url,
    };

    if (VERBOSE) {
      log(`Metrics: ${JSON.stringify(metrics, null, 2)}`, 'info');
    }

    return metrics;
  } catch (error) {
    log(`Failed to run Lighthouse on ${url}: ${error}`, 'error');
    return null;
  }
}

/**
 * Check if metrics meet budgets
 */
function checkBudgets(metrics: LighthouseMetrics, budgets: PerformanceBudget): BudgetResult {
  const failures: string[] = [];

  // Check FCP
  if (metrics.fcp > budgets.fcp) {
    failures.push(
      `FCP: ${Math.round(metrics.fcp)}ms > ${budgets.fcp}ms (budget exceeded by ${Math.round(metrics.fcp - budgets.fcp)}ms)`
    );
  }

  // Check LCP
  if (metrics.lcp > budgets.lcp) {
    failures.push(
      `LCP: ${Math.round(metrics.lcp)}ms > ${budgets.lcp}ms (budget exceeded by ${Math.round(metrics.lcp - budgets.lcp)}ms)`
    );
  }

  // Check TBT
  if (metrics.tbt > budgets.tbt) {
    failures.push(
      `TBT: ${Math.round(metrics.tbt)}ms > ${budgets.tbt}ms (budget exceeded by ${Math.round(metrics.tbt - budgets.tbt)}ms)`
    );
  }

  // Check CLS
  if (metrics.cls > budgets.cls) {
    failures.push(
      `CLS: ${metrics.cls.toFixed(3)} > ${budgets.cls.toFixed(3)} (budget exceeded by ${(metrics.cls - budgets.cls).toFixed(3)})`
    );
  }

  // Check Performance Score
  if (metrics.performanceScore < budgets.performanceScore) {
    failures.push(
      `Performance Score: ${Math.round(metrics.performanceScore)}/100 < ${budgets.performanceScore}/100 (${Math.round(budgets.performanceScore - metrics.performanceScore)} points below budget)`
    );
  }

  return {
    url: metrics.url,
    passed: failures.length === 0,
    metrics,
    failures,
  };
}

/**
 * Print results summary
 */
function printSummary(results: BudgetResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE BUDGET RESULTS');
  console.log('='.repeat(80) + '\n');

  for (const result of results) {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.url}`);

    // Print metrics
    console.log(`  FCP: ${Math.round(result.metrics.fcp)}ms (budget: ${PERFORMANCE_BUDGETS.fcp}ms)`);
    console.log(`  LCP: ${Math.round(result.metrics.lcp)}ms (budget: ${PERFORMANCE_BUDGETS.lcp}ms)`);
    console.log(`  TBT: ${Math.round(result.metrics.tbt)}ms (budget: ${PERFORMANCE_BUDGETS.tbt}ms)`);
    console.log(`  CLS: ${result.metrics.cls.toFixed(3)} (budget: ${PERFORMANCE_BUDGETS.cls.toFixed(3)})`);
    console.log(
      `  Performance Score: ${Math.round(result.metrics.performanceScore)}/100 (budget: ${PERFORMANCE_BUDGETS.performanceScore}/100)`
    );

    // Print failures
    if (result.failures.length > 0) {
      console.log('\n  Failures:');
      for (const failure of result.failures) {
        console.log(`    - ${failure}`);
      }
    }

    console.log('');
  }

  console.log('='.repeat(80));

  // Summary stats
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`\nSummary: ${passedCount} passed, ${failedCount} failed (${results.length} total)`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  log('Starting performance budget checks...', 'info');
  log(`Base URL: ${BASE_URL}`, 'info');
  log(`Routes to test: ${ROUTES_TO_TEST.length}`, 'info');
  log(`Budgets: ${JSON.stringify(PERFORMANCE_BUDGETS)}`, 'info');

  // Ensure output directory
  ensureOutputDir();

  // Check if Lighthouse is installed
  try {
    execSync('lighthouse --version', { stdio: 'pipe' });
  } catch (error) {
    log('Lighthouse is not installed. Install it with: npm install -g lighthouse', 'error');
    process.exit(1);
  }

  const results: BudgetResult[] = [];

  // Test each route
  for (const route of ROUTES_TO_TEST) {
    const url = `${BASE_URL}${route}`;

    const metrics = runLighthouse(url);
    if (!metrics) {
      log(`Skipping budget check for ${url} (Lighthouse failed)`, 'error');
      continue;
    }

    const result = checkBudgets(metrics, PERFORMANCE_BUDGETS);
    results.push(result);

    if (result.passed) {
      log(`✅ ${url} passed all budgets`, 'success');
    } else {
      log(`❌ ${url} failed ${result.failures.length} budget(s)`, 'error');
    }
  }

  // Print summary
  printSummary(results);

  // Exit with error if any route failed
  const failedRoutes = results.filter((r) => !r.passed);
  if (failedRoutes.length > 0) {
    log(`Performance budgets failed for ${failedRoutes.length} route(s)`, 'error');
    process.exit(1);
  }

  log('All performance budgets passed! 🎉', 'success');
  process.exit(0);
}

// Run the script
main().catch((error) => {
  log(`Unexpected error: ${error}`, 'error');
  process.exit(1);
});
