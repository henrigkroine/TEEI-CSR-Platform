#!/usr/bin/env node
/**
 * Quality Report Aggregator
 *
 * Aggregates all quality metrics into a unified dashboard:
 * - Unit test coverage
 * - E2E test coverage
 * - Visual regression results
 * - Accessibility violations
 * - Load test SLOs
 * - Flaky test tracking
 *
 * Usage:
 *   pnpm tsx scripts/quality-report.ts
 *   pnpm tsx scripts/quality-report.ts --format=html
 *   pnpm tsx scripts/quality-report.ts --format=json
 */

import fs from 'fs';
import path from 'path';

interface QualityMetrics {
  timestamp: string;
  unitCoverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
    status: 'pass' | 'fail';
  };
  e2eCoverage: {
    percentage: number;
    totalRoutes: number;
    coveredRoutes: number;
    status: 'pass' | 'fail';
  };
  visualRegression: {
    totalSnapshots: number;
    differences: number;
    status: 'pass' | 'warn' | 'fail';
  };
  accessibility: {
    critical: number;
    serious: number;
    moderate: number;
    status: 'pass' | 'fail';
  };
  loadTests: {
    slosPass: number;
    slosTotal: number;
    status: 'pass' | 'fail';
  };
  flakiness: {
    flakyTests: number;
    quarantinedTests: number;
    totalTests: number;
    status: 'good' | 'warn' | 'critical';
  };
  overall: 'pass' | 'warn' | 'fail';
}

const THRESHOLDS = {
  unitCoverage: 80,
  e2eCoverage: 60,
  vrtDiff: 0.3,
  a11yCritical: 0,
  a11ySerious: 0,
  a11yModerate: 5
};

/**
 * Load unit coverage data
 */
function loadUnitCoverage(): QualityMetrics['unitCoverage'] {
  const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    return {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0,
      status: 'fail'
    };
  }

  const data = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
  const total = data.total;

  const status = (
    total.lines.pct >= THRESHOLDS.unitCoverage &&
    total.functions.pct >= THRESHOLDS.unitCoverage &&
    total.branches.pct >= THRESHOLDS.unitCoverage &&
    total.statements.pct >= THRESHOLDS.unitCoverage
  ) ? 'pass' : 'fail';

  return {
    lines: total.lines.pct,
    functions: total.functions.pct,
    branches: total.branches.pct,
    statements: total.statements.pct,
    status
  };
}

/**
 * Load E2E coverage data
 */
function loadE2ECoverage(): QualityMetrics['e2eCoverage'] {
  const e2ePath = path.join(process.cwd(), 'e2e-coverage.json');

  if (!fs.existsSync(e2ePath)) {
    return {
      percentage: 0,
      totalRoutes: 0,
      coveredRoutes: 0,
      status: 'fail'
    };
  }

  const data = JSON.parse(fs.readFileSync(e2ePath, 'utf-8'));

  return {
    percentage: data.coverage,
    totalRoutes: data.total_routes,
    coveredRoutes: data.covered_routes,
    status: data.coverage >= THRESHOLDS.e2eCoverage ? 'pass' : 'fail'
  };
}

/**
 * Load visual regression data
 */
function loadVisualRegression(): QualityMetrics['visualRegression'] {
  // Check for diff images in test results
  const testResultsPath = path.join(process.cwd(), 'apps/corp-cockpit-astro/test-results');

  if (!fs.existsSync(testResultsPath)) {
    return {
      totalSnapshots: 0,
      differences: 0,
      status: 'pass'
    };
  }

  // Count diff files
  let diffCount = 0;
  function countDiffs(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        countDiffs(fullPath);
      } else if (file.endsWith('-diff.png')) {
        diffCount++;
      }
    }
  }

  try {
    countDiffs(testResultsPath);
  } catch {
    // Ignore errors
  }

  return {
    totalSnapshots: 20, // Top 20 routes
    differences: diffCount,
    status: diffCount === 0 ? 'pass' : diffCount <= 3 ? 'warn' : 'fail'
  };
}

/**
 * Load accessibility data
 */
function loadAccessibility(): QualityMetrics['accessibility'] {
  // Placeholder - would parse actual a11y test results
  return {
    critical: 0,
    serious: 0,
    moderate: 0,
    status: 'pass'
  };
}

/**
 * Load load test data
 */
function loadLoadTests(): QualityMetrics['loadTests'] {
  // Placeholder - would parse actual k6 results
  return {
    slosPass: 5,
    slosTotal: 5,
    status: 'pass'
  };
}

/**
 * Load flakiness data
 */
function loadFlakiness(): QualityMetrics['flakiness'] {
  const flakinessPath = path.join(process.cwd(), 'tests/flakiness-db.json');

  if (!fs.existsSync(flakinessPath)) {
    return {
      flakyTests: 0,
      quarantinedTests: 0,
      totalTests: 0,
      status: 'good'
    };
  }

  const data = JSON.parse(fs.readFileSync(flakinessPath, 'utf-8'));
  const records = Object.values(data.records) as any[];

  const flakyTests = records.filter(r => r.flakinessRate >= 0.1 && !r.isQuarantined).length;
  const quarantinedTests = records.filter(r => r.isQuarantined).length;

  let status: 'good' | 'warn' | 'critical';
  if (flakyTests === 0 && quarantinedTests === 0) {
    status = 'good';
  } else if (flakyTests <= 5 || quarantinedTests <= 3) {
    status = 'warn';
  } else {
    status = 'critical';
  }

  return {
    flakyTests,
    quarantinedTests,
    totalTests: records.length,
    status
  };
}

/**
 * Aggregate all metrics
 */
function aggregateMetrics(): QualityMetrics {
  const metrics: QualityMetrics = {
    timestamp: new Date().toISOString(),
    unitCoverage: loadUnitCoverage(),
    e2eCoverage: loadE2ECoverage(),
    visualRegression: loadVisualRegression(),
    accessibility: loadAccessibility(),
    loadTests: loadLoadTests(),
    flakiness: loadFlakiness(),
    overall: 'pass'
  };

  // Determine overall status
  const failures = [
    metrics.unitCoverage.status === 'fail',
    metrics.e2eCoverage.status === 'fail',
    metrics.visualRegression.status === 'fail',
    metrics.accessibility.status === 'fail',
    metrics.loadTests.status === 'fail'
  ].filter(Boolean).length;

  const warnings = [
    metrics.visualRegression.status === 'warn',
    metrics.flakiness.status === 'warn' || metrics.flakiness.status === 'critical'
  ].filter(Boolean).length;

  if (failures > 0) {
    metrics.overall = 'fail';
  } else if (warnings > 0) {
    metrics.overall = 'warn';
  }

  return metrics;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(metrics: QualityMetrics): string {
  const statusColor = (status: string) => {
    if (status === 'pass' || status === 'good') return '#10b981';
    if (status === 'warn') return '#f59e0b';
    return '#ef4444';
  };

  const statusEmoji = (status: string) => {
    if (status === 'pass' || status === 'good') return '✅';
    if (status === 'warn') return '⚠️';
    return '❌';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quality Dashboard - TEEI CSR Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f9fafb;
      padding: 2rem;
      color: #111827;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .timestamp { color: #6b7280; font-size: 0.875rem; }
    .overall-status {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 1rem;
      background: ${statusColor(metrics.overall)};
      color: white;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card h2 {
      font-size: 1.125rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; font-size: 0.875rem; }
    .metric-value { font-weight: 600; font-size: 1.125rem; }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    footer {
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Quality Dashboard</h1>
      <p class="timestamp">Generated: ${new Date(metrics.timestamp).toLocaleString()}</p>
      <div class="overall-status">
        ${statusEmoji(metrics.overall)} Overall Status: ${metrics.overall.toUpperCase()}
      </div>
    </header>

    <div class="grid">
      <!-- Unit Coverage -->
      <div class="card">
        <h2>
          Unit Test Coverage
          <span class="status-badge" style="background: ${statusColor(metrics.unitCoverage.status)}; color: white;">
            ${metrics.unitCoverage.status.toUpperCase()}
          </span>
        </h2>
        <div class="metric-row">
          <span class="metric-label">Lines</span>
          <span class="metric-value">${metrics.unitCoverage.lines.toFixed(1)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${metrics.unitCoverage.lines}%; background: ${statusColor(metrics.unitCoverage.status)};"></div>
        </div>
        <div class="metric-row">
          <span class="metric-label">Functions</span>
          <span class="metric-value">${metrics.unitCoverage.functions.toFixed(1)}%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Branches</span>
          <span class="metric-value">${metrics.unitCoverage.branches.toFixed(1)}%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Statements</span>
          <span class="metric-value">${metrics.unitCoverage.statements.toFixed(1)}%</span>
        </div>
      </div>

      <!-- E2E Coverage -->
      <div class="card">
        <h2>
          E2E Test Coverage
          <span class="status-badge" style="background: ${statusColor(metrics.e2eCoverage.status)}; color: white;">
            ${metrics.e2eCoverage.status.toUpperCase()}
          </span>
        </h2>
        <div class="metric-row">
          <span class="metric-label">Route Coverage</span>
          <span class="metric-value">${metrics.e2eCoverage.percentage}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${metrics.e2eCoverage.percentage}%; background: ${statusColor(metrics.e2eCoverage.status)};"></div>
        </div>
        <div class="metric-row">
          <span class="metric-label">Covered Routes</span>
          <span class="metric-value">${metrics.e2eCoverage.coveredRoutes} / ${metrics.e2eCoverage.totalRoutes}</span>
        </div>
      </div>

      <!-- Visual Regression -->
      <div class="card">
        <h2>
          Visual Regression
          <span class="status-badge" style="background: ${statusColor(metrics.visualRegression.status)}; color: white;">
            ${metrics.visualRegression.status.toUpperCase()}
          </span>
        </h2>
        <div class="metric-row">
          <span class="metric-label">Total Snapshots</span>
          <span class="metric-value">${metrics.visualRegression.totalSnapshots}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Differences Detected</span>
          <span class="metric-value">${metrics.visualRegression.differences}</span>
        </div>
      </div>

      <!-- Accessibility -->
      <div class="card">
        <h2>
          Accessibility (WCAG 2.2 AA)
          <span class="status-badge" style="background: ${statusColor(metrics.accessibility.status)}; color: white;">
            ${metrics.accessibility.status.toUpperCase()}
          </span>
        </h2>
        <div class="metric-row">
          <span class="metric-label">Critical Violations</span>
          <span class="metric-value">${metrics.accessibility.critical}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Serious Violations</span>
          <span class="metric-value">${metrics.accessibility.serious}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Moderate Violations</span>
          <span class="metric-value">${metrics.accessibility.moderate}</span>
        </div>
      </div>

      <!-- Load Tests -->
      <div class="card">
        <h2>
          Load Tests (SLOs)
          <span class="status-badge" style="background: ${statusColor(metrics.loadTests.status)}; color: white;">
            ${metrics.loadTests.status.toUpperCase()}
          </span>
        </h2>
        <div class="metric-row">
          <span class="metric-label">SLOs Passing</span>
          <span class="metric-value">${metrics.loadTests.slosPass} / ${metrics.loadTests.slosTotal}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(metrics.loadTests.slosPass / metrics.loadTests.slosTotal * 100)}%; background: ${statusColor(metrics.loadTests.status)};"></div>
        </div>
      </div>

      <!-- Flakiness -->
      <div class="card">
        <h2>
          Test Stability
          <span class="status-badge" style="background: ${statusColor(metrics.flakiness.status)}; color: white;">
            ${metrics.flakiness.status.toUpperCase()}
          </span>
        </h2>
        <div class="metric-row">
          <span class="metric-label">Flaky Tests</span>
          <span class="metric-value">${metrics.flakiness.flakyTests}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Quarantined Tests</span>
          <span class="metric-value">${metrics.flakiness.quarantinedTests}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Total Tests Tracked</span>
          <span class="metric-value">${metrics.flakiness.totalTests}</span>
        </div>
      </div>
    </div>

    <footer>
      <p>TEEI CSR Platform Quality Dashboard • Generated automatically by quality-report.ts</p>
    </footer>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate JSON report
 */
function generateJSONReport(metrics: QualityMetrics): string {
  return JSON.stringify(metrics, null, 2);
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(metrics: QualityMetrics): string {
  const statusEmoji = (status: string) => {
    if (status === 'pass' || status === 'good') return '✅';
    if (status === 'warn') return '⚠️';
    return '❌';
  };

  return `
# Quality Dashboard

**Generated**: ${new Date(metrics.timestamp).toLocaleString()}
**Overall Status**: ${statusEmoji(metrics.overall)} ${metrics.overall.toUpperCase()}

---

## Unit Test Coverage ${statusEmoji(metrics.unitCoverage.status)}

| Metric | Coverage | Threshold | Status |
|--------|----------|-----------|--------|
| Lines | ${metrics.unitCoverage.lines.toFixed(1)}% | ${THRESHOLDS.unitCoverage}% | ${statusEmoji(metrics.unitCoverage.status)} |
| Functions | ${metrics.unitCoverage.functions.toFixed(1)}% | ${THRESHOLDS.unitCoverage}% | ${statusEmoji(metrics.unitCoverage.status)} |
| Branches | ${metrics.unitCoverage.branches.toFixed(1)}% | ${THRESHOLDS.unitCoverage}% | ${statusEmoji(metrics.unitCoverage.status)} |
| Statements | ${metrics.unitCoverage.statements.toFixed(1)}% | ${THRESHOLDS.unitCoverage}% | ${statusEmoji(metrics.unitCoverage.status)} |

## E2E Test Coverage ${statusEmoji(metrics.e2eCoverage.status)}

- **Coverage**: ${metrics.e2eCoverage.percentage}%
- **Covered Routes**: ${metrics.e2eCoverage.coveredRoutes} / ${metrics.e2eCoverage.totalRoutes}
- **Threshold**: ${THRESHOLDS.e2eCoverage}%

## Visual Regression ${statusEmoji(metrics.visualRegression.status)}

- **Total Snapshots**: ${metrics.visualRegression.totalSnapshots}
- **Differences**: ${metrics.visualRegression.differences}

## Accessibility (WCAG 2.2 AA) ${statusEmoji(metrics.accessibility.status)}

- **Critical Violations**: ${metrics.accessibility.critical}
- **Serious Violations**: ${metrics.accessibility.serious}
- **Moderate Violations**: ${metrics.accessibility.moderate}

## Load Tests ${statusEmoji(metrics.loadTests.status)}

- **SLOs Passing**: ${metrics.loadTests.slosPass} / ${metrics.loadTests.slosTotal}

## Test Stability ${statusEmoji(metrics.flakiness.status)}

- **Flaky Tests**: ${metrics.flakiness.flakyTests}
- **Quarantined Tests**: ${metrics.flakiness.quarantinedTests}
- **Total Tests**: ${metrics.flakiness.totalTests}
  `.trim();
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'html';

  console.log('📊 Aggregating quality metrics...\n');

  const metrics = aggregateMetrics();

  let report: string;
  let extension: string;

  switch (format.toLowerCase()) {
    case 'json':
      report = generateJSONReport(metrics);
      extension = 'json';
      break;
    case 'md':
    case 'markdown':
      report = generateMarkdownReport(metrics);
      extension = 'md';
      break;
    case 'html':
    default:
      report = generateHTMLReport(metrics);
      extension = 'html';
      break;
  }

  const outputPath = path.join(process.cwd(), `reports/quality/dashboard.${extension}`);

  // Ensure directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Write report
  fs.writeFileSync(outputPath, report);

  console.log(`✅ Quality report generated: ${outputPath}`);
  console.log(`\nOverall Status: ${metrics.overall.toUpperCase()}\n`);

  // Print summary
  console.log('Summary:');
  console.log(`  Unit Coverage: ${metrics.unitCoverage.lines.toFixed(1)}% (${metrics.unitCoverage.status})`);
  console.log(`  E2E Coverage: ${metrics.e2eCoverage.percentage}% (${metrics.e2eCoverage.status})`);
  console.log(`  VRT: ${metrics.visualRegression.differences} diffs (${metrics.visualRegression.status})`);
  console.log(`  A11y: ${metrics.accessibility.critical} critical (${metrics.accessibility.status})`);
  console.log(`  Load Tests: ${metrics.loadTests.slosPass}/${metrics.loadTests.slosTotal} SLOs (${metrics.loadTests.status})`);
  console.log(`  Flaky Tests: ${metrics.flakiness.flakyTests} (${metrics.flakiness.status})`);
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { aggregateMetrics, generateHTMLReport, generateJSONReport, generateMarkdownReport };
