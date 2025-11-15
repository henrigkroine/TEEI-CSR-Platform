/**
 * Flakiness Tracker
 *
 * Detects and tracks flaky tests across CI runs.
 * Auto-quarantines tests with >10% failure rate.
 *
 * Features:
 * - Track test failures over time
 * - Calculate flakiness rate
 * - Auto-quarantine flaky tests
 * - Generate flakiness reports
 *
 * Usage:
 *   import { trackTestResult, analyzeFlakiness, quarantineFlaky } from './flakiness-tracker';
 */

import fs from 'fs';
import path from 'path';

// Configuration
const FLAKINESS_DB_PATH = path.join(process.cwd(), 'tests/flakiness-db.json');
const FLAKINESS_THRESHOLD = 0.1; // 10% failure rate
const MIN_RUNS_FOR_DETECTION = 10; // Minimum runs before declaring flaky
const QUARANTINE_DIR = path.join(process.cwd(), 'tests/quarantine');

export interface TestResult {
  testName: string;
  testFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: string;
  runId?: string;
  error?: string;
}

export interface FlakinessRecord {
  testName: string;
  testFile: string;
  totalRuns: number;
  failures: number;
  passes: number;
  flakinessRate: number;
  lastFailure: string | null;
  lastSuccess: string | null;
  isQuarantined: boolean;
  quarantinedAt: string | null;
  failureHistory: Array<{
    timestamp: string;
    status: 'passed' | 'failed';
    runId?: string;
  }>;
}

export interface FlakinessDatabase {
  version: string;
  lastUpdated: string;
  records: Record<string, FlakinessRecord>;
}

/**
 * Load flakiness database
 */
export function loadDatabase(): FlakinessDatabase {
  if (fs.existsSync(FLAKINESS_DB_PATH)) {
    const data = fs.readFileSync(FLAKINESS_DB_PATH, 'utf-8');
    return JSON.parse(data);
  }

  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    records: {}
  };
}

/**
 * Save flakiness database
 */
export function saveDatabase(db: FlakinessDatabase): void {
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(FLAKINESS_DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Track a test result
 */
export function trackTestResult(result: TestResult): FlakinessRecord {
  const db = loadDatabase();
  const key = `${result.testFile}::${result.testName}`;

  // Get or create record
  let record = db.records[key];
  if (!record) {
    record = {
      testName: result.testName,
      testFile: result.testFile,
      totalRuns: 0,
      failures: 0,
      passes: 0,
      flakinessRate: 0,
      lastFailure: null,
      lastSuccess: null,
      isQuarantined: false,
      quarantinedAt: null,
      failureHistory: []
    };
  }

  // Update record
  record.totalRuns++;
  if (result.status === 'failed') {
    record.failures++;
    record.lastFailure = result.timestamp;
  } else if (result.status === 'passed') {
    record.passes++;
    record.lastSuccess = result.timestamp;
  }

  // Update history (keep last 50 runs)
  record.failureHistory.push({
    timestamp: result.timestamp,
    status: result.status,
    runId: result.runId
  });

  if (record.failureHistory.length > 50) {
    record.failureHistory = record.failureHistory.slice(-50);
  }

  // Calculate flakiness rate
  if (record.totalRuns > 0) {
    record.flakinessRate = record.failures / record.totalRuns;
  }

  // Save record
  db.records[key] = record;
  saveDatabase(db);

  return record;
}

/**
 * Analyze flakiness across all tests
 */
export function analyzeFlakiness(): {
  flakyTests: FlakinessRecord[];
  stableTests: FlakinessRecord[];
  quarantinedTests: FlakinessRecord[];
  totalTests: number;
} {
  const db = loadDatabase();
  const records = Object.values(db.records);

  const flakyTests = records.filter(r =>
    r.totalRuns >= MIN_RUNS_FOR_DETECTION &&
    r.flakinessRate >= FLAKINESS_THRESHOLD &&
    !r.isQuarantined
  );

  const stableTests = records.filter(r =>
    r.totalRuns >= MIN_RUNS_FOR_DETECTION &&
    r.flakinessRate < FLAKINESS_THRESHOLD
  );

  const quarantinedTests = records.filter(r => r.isQuarantined);

  return {
    flakyTests,
    stableTests,
    quarantinedTests,
    totalTests: records.length
  };
}

/**
 * Quarantine a flaky test
 */
export function quarantineTest(testFile: string, testName: string): void {
  const db = loadDatabase();
  const key = `${testFile}::${testName}`;
  const record = db.records[key];

  if (!record) {
    throw new Error(`Test not found: ${key}`);
  }

  if (record.isQuarantined) {
    console.log(`Test already quarantined: ${testName}`);
    return;
  }

  record.isQuarantined = true;
  record.quarantinedAt = new Date().toISOString();

  db.records[key] = record;
  saveDatabase(db);

  console.log(`✓ Quarantined test: ${testName}`);
  console.log(`  File: ${testFile}`);
  console.log(`  Flakiness rate: ${(record.flakinessRate * 100).toFixed(2)}%`);
  console.log(`  Failures: ${record.failures}/${record.totalRuns}`);
}

/**
 * Auto-quarantine all flaky tests
 */
export function autoQuarantineFlaky(): FlakinessRecord[] {
  const { flakyTests } = analyzeFlakiness();
  const quarantined: FlakinessRecord[] = [];

  for (const test of flakyTests) {
    try {
      quarantineTest(test.testFile, test.testName);
      quarantined.push(test);
    } catch (error) {
      console.error(`Failed to quarantine test ${test.testName}:`, error);
    }
  }

  return quarantined;
}

/**
 * Restore a quarantined test
 */
export function restoreTest(testFile: string, testName: string): void {
  const db = loadDatabase();
  const key = `${testFile}::${testName}`;
  const record = db.records[key];

  if (!record) {
    throw new Error(`Test not found: ${key}`);
  }

  if (!record.isQuarantined) {
    console.log(`Test is not quarantined: ${testName}`);
    return;
  }

  record.isQuarantined = false;
  record.quarantinedAt = null;

  db.records[key] = record;
  saveDatabase(db);

  console.log(`✓ Restored test: ${testName}`);
}

/**
 * Generate flakiness report
 */
export function generateReport(outputPath?: string): string {
  const analysis = analyzeFlakiness();
  const db = loadDatabase();

  const report = [];
  report.push('# Test Flakiness Report\n');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  report.push(`Database last updated: ${db.lastUpdated}\n\n`);

  report.push('## Summary\n');
  report.push(`- Total tests tracked: ${analysis.totalTests}`);
  report.push(`- Stable tests: ${analysis.stableTests.length}`);
  report.push(`- Flaky tests: ${analysis.flakyTests.length}`);
  report.push(`- Quarantined tests: ${analysis.quarantinedTests.length}\n`);

  if (analysis.flakyTests.length > 0) {
    report.push('## Flaky Tests (Not Quarantined)\n');
    report.push('| Test | File | Flakiness Rate | Failures | Total Runs | Last Failure |');
    report.push('|------|------|----------------|----------|------------|--------------|');

    for (const test of analysis.flakyTests.sort((a, b) => b.flakinessRate - a.flakinessRate)) {
      report.push(
        `| ${test.testName} | ${test.testFile} | ${(test.flakinessRate * 100).toFixed(2)}% | ${test.failures} | ${test.totalRuns} | ${test.lastFailure || 'N/A'} |`
      );
    }
    report.push('');
  }

  if (analysis.quarantinedTests.length > 0) {
    report.push('## Quarantined Tests\n');
    report.push('| Test | File | Flakiness Rate | Quarantined At |');
    report.push('|------|------|----------------|----------------|');

    for (const test of analysis.quarantinedTests) {
      report.push(
        `| ${test.testName} | ${test.testFile} | ${(test.flakinessRate * 100).toFixed(2)}% | ${test.quarantinedAt || 'N/A'} |`
      );
    }
    report.push('');
  }

  report.push('## Recommendations\n');
  if (analysis.flakyTests.length > 0) {
    report.push(`- ${analysis.flakyTests.length} flaky test(s) should be investigated and fixed`);
    report.push('- Consider auto-quarantining these tests to prevent CI instability');
  }
  if (analysis.quarantinedTests.length > 0) {
    report.push(`- ${analysis.quarantinedTests.length} test(s) are quarantined and need fixing`);
  }
  if (analysis.flakyTests.length === 0 && analysis.quarantinedTests.length === 0) {
    report.push('- ✓ No flaky tests detected!');
  }

  const reportText = report.join('\n');

  if (outputPath) {
    fs.writeFileSync(outputPath, reportText);
    console.log(`Report saved to: ${outputPath}`);
  }

  return reportText;
}

/**
 * Reset flakiness data for a test
 */
export function resetTest(testFile: string, testName: string): void {
  const db = loadDatabase();
  const key = `${testFile}::${testName}`;

  if (db.records[key]) {
    delete db.records[key];
    saveDatabase(db);
    console.log(`✓ Reset flakiness data for: ${testName}`);
  }
}

/**
 * Clear all flakiness data
 */
export function clearAll(): void {
  const db: FlakinessDatabase = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    records: {}
  };
  saveDatabase(db);
  console.log('✓ Cleared all flakiness data');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'analyze':
      const analysis = analyzeFlakiness();
      console.log('Flakiness Analysis:');
      console.log(`  Total tests: ${analysis.totalTests}`);
      console.log(`  Flaky tests: ${analysis.flakyTests.length}`);
      console.log(`  Quarantined tests: ${analysis.quarantinedTests.length}`);
      break;

    case 'report':
      const reportPath = args[1] || path.join(process.cwd(), 'reports/quality/flakiness-report.md');
      generateReport(reportPath);
      break;

    case 'quarantine':
      const quarantined = autoQuarantineFlaky();
      console.log(`Quarantined ${quarantined.length} flaky test(s)`);
      break;

    case 'restore':
      if (args.length < 3) {
        console.error('Usage: flakiness-tracker restore <test-file> <test-name>');
        process.exit(1);
      }
      restoreTest(args[1], args[2]);
      break;

    case 'reset':
      if (args.length < 3) {
        console.error('Usage: flakiness-tracker reset <test-file> <test-name>');
        process.exit(1);
      }
      resetTest(args[1], args[2]);
      break;

    case 'clear':
      clearAll();
      break;

    default:
      console.log('Flakiness Tracker CLI');
      console.log('');
      console.log('Commands:');
      console.log('  analyze              - Analyze flakiness across all tests');
      console.log('  report [output]      - Generate flakiness report');
      console.log('  quarantine           - Auto-quarantine all flaky tests');
      console.log('  restore <file> <name> - Restore a quarantined test');
      console.log('  reset <file> <name>  - Reset flakiness data for a test');
      console.log('  clear                - Clear all flakiness data');
      break;
  }
}
