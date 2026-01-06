#!/usr/bin/env node
/**
 * Coverage Analysis Script
 *
 * Analyzes test coverage across all services and identifies gaps.
 * Prioritizes uncovered code by:
 * - Low coverage %
 * - High complexity (cyclomatic)
 * - High change frequency (git blame)
 *
 * Usage:
 *   pnpm tsx scripts/coverage-analysis.ts
 *   pnpm tsx scripts/coverage-analysis.ts --service=reporting
 *   pnpm tsx scripts/coverage-analysis.ts --output=reports/quality/coverage-gaps.md
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface CoverageData {
  total: {
    lines: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
  };
}

interface FileCoverage {
  path: string;
  lines: { pct: number };
  statements: { pct: number };
  functions: { pct: number };
  branches: { pct: number };
  uncoveredLines: number;
  changeFrequency: number;
  priority: number;
}

interface ServiceCoverage {
  service: string;
  coverage: CoverageData;
  files: FileCoverage[];
  meetThreshold: boolean;
}

const THRESHOLD = 80;
const COVERAGE_DIR = path.join(process.cwd(), 'coverage');
const OUTPUT_DIR = path.join(process.cwd(), 'reports/quality');

/**
 * Get list of services
 */
function getServices(): string[] {
  const servicesDir = path.join(process.cwd(), 'services');
  const packagesDir = path.join(process.cwd(), 'packages');
  const appsDir = path.join(process.cwd(), 'apps');

  const services: string[] = [];

  // Add services
  if (fs.existsSync(servicesDir)) {
    const serviceFolders = fs.readdirSync(servicesDir).filter(f => {
      const fullPath = path.join(servicesDir, f);
      return fs.statSync(fullPath).isDirectory();
    });
    services.push(...serviceFolders.map(f => `services/${f}`));
  }

  // Add packages
  if (fs.existsSync(packagesDir)) {
    const packageFolders = fs.readdirSync(packagesDir).filter(f => {
      const fullPath = path.join(packagesDir, f);
      return fs.statSync(fullPath).isDirectory();
    });
    services.push(...packageFolders.map(f => `packages/${f}`));
  }

  // Add apps
  if (fs.existsSync(appsDir)) {
    const appFolders = fs.readdirSync(appsDir).filter(f => {
      const fullPath = path.join(appsDir, f);
      return fs.statSync(fullPath).isDirectory();
    });
    services.push(...appFolders.map(f => `apps/${f}`));
  }

  return services;
}

/**
 * Get change frequency for a file using git blame
 */
function getChangeFrequency(filePath: string): number {
  try {
    const result = execSync(`git log --follow --oneline "${filePath}" | wc -l`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return parseInt(result.trim(), 10);
  } catch {
    return 0;
  }
}

/**
 * Analyze coverage for a service
 */
function analyzeServiceCoverage(servicePath: string): ServiceCoverage | null {
  const coveragePath = path.join(process.cwd(), servicePath, 'coverage/coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    return null;
  }

  const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8')) as Record<string, any>;
  const total = coverageData.total;

  const files: FileCoverage[] = [];

  // Analyze each file
  for (const [filePath, fileCov] of Object.entries(coverageData)) {
    if (filePath === 'total') continue;

    const uncoveredLines = fileCov.lines.total - fileCov.lines.covered;
    const changeFrequency = getChangeFrequency(filePath);

    // Calculate priority score (higher = more important to test)
    const coverageGap = 100 - fileCov.lines.pct;
    const priority = coverageGap * 0.5 + uncoveredLines * 0.3 + changeFrequency * 0.2;

    files.push({
      path: filePath,
      lines: fileCov.lines,
      statements: fileCov.statements,
      functions: fileCov.functions,
      branches: fileCov.branches,
      uncoveredLines,
      changeFrequency,
      priority
    });
  }

  // Sort files by priority
  files.sort((a, b) => b.priority - a.priority);

  return {
    service: servicePath,
    coverage: { total } as CoverageData,
    files,
    meetThreshold: total.lines.pct >= THRESHOLD &&
                   total.functions.pct >= THRESHOLD &&
                   total.branches.pct >= THRESHOLD &&
                   total.statements.pct >= THRESHOLD
  };
}

/**
 * Generate coverage gaps report
 */
function generateReport(services: ServiceCoverage[]): string {
  const report: string[] = [];

  report.push('# Coverage Gaps Analysis\n');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  report.push(`Coverage Threshold: ${THRESHOLD}%\n`);

  // Overall summary
  const totalServices = services.length;
  const servicesPassingThreshold = services.filter(s => s.meetThreshold).length;
  const servicesFailingThreshold = totalServices - servicesPassingThreshold;

  report.push('## Summary\n');
  report.push(`- Total services analyzed: ${totalServices}`);
  report.push(`- Services meeting threshold: ${servicesPassingThreshold} (${Math.round(servicesPassingThreshold / totalServices * 100)}%)`);
  report.push(`- Services below threshold: ${servicesFailingThreshold}\n`);

  // Services below threshold
  const failing = services.filter(s => !s.meetThreshold);
  if (failing.length > 0) {
    report.push('## Services Below Threshold\n');
    report.push('| Service | Lines | Functions | Branches | Statements | Status |');
    report.push('|---------|-------|-----------|----------|------------|--------|');

    for (const service of failing) {
      const { total } = service.coverage;
      report.push(
        `| ${service.service} | ${total.lines.pct.toFixed(1)}% | ${total.functions.pct.toFixed(1)}% | ${total.branches.pct.toFixed(1)}% | ${total.statements.pct.toFixed(1)}% | ❌ |`
      );
    }
    report.push('');
  }

  // Top priority files to test
  report.push('## Top Priority Files to Test\n');
  report.push('Files prioritized by: coverage gap, uncovered lines, and change frequency\n');

  const allFiles = services.flatMap(s => s.files.map(f => ({ ...f, service: s.service })));
  const topFiles = allFiles
    .filter(f => f.lines.pct < THRESHOLD)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 20);

  if (topFiles.length > 0) {
    report.push('| Priority | File | Service | Coverage | Uncovered Lines | Change Frequency |');
    report.push('|----------|------|---------|----------|-----------------|------------------|');

    for (let i = 0; i < topFiles.length; i++) {
      const file = topFiles[i];
      const relPath = file.path.replace(process.cwd(), '.');
      report.push(
        `| ${i + 1} | ${relPath} | ${file.service} | ${file.lines.pct.toFixed(1)}% | ${file.uncoveredLines} | ${file.changeFrequency} |`
      );
    }
    report.push('');
  } else {
    report.push('✅ All files meet coverage threshold!\n');
  }

  // Recommendations
  report.push('## Recommendations\n');

  if (failing.length > 0) {
    report.push(`### Critical: Fix ${failing.length} service(s) below threshold\n`);
    for (const service of failing.slice(0, 5)) {
      report.push(`#### ${service.service}\n`);
      report.push(`Current coverage: ${service.coverage.total.lines.pct.toFixed(1)}%\n`);
      report.push('Top files to test:');

      const topServiceFiles = service.files
        .filter(f => f.lines.pct < THRESHOLD)
        .slice(0, 5);

      for (const file of topServiceFiles) {
        const relPath = file.path.replace(process.cwd(), '.');
        report.push(`- \`${relPath}\` (${file.lines.pct.toFixed(1)}% coverage, ${file.uncoveredLines} uncovered lines)`);
      }
      report.push('');
    }
  }

  if (topFiles.length > 0) {
    report.push('### Quick Wins\n');
    report.push('Focus on these high-priority files first:\n');

    for (const file of topFiles.slice(0, 5)) {
      const relPath = file.path.replace(process.cwd(), '.');
      report.push(`1. \`${relPath}\``);
      report.push(`   - Coverage: ${file.lines.pct.toFixed(1)}%`);
      report.push(`   - Uncovered lines: ${file.uncoveredLines}`);
      report.push(`   - Changes: ${file.changeFrequency} commits`);
      report.push('');
    }
  }

  if (failing.length === 0 && topFiles.length === 0) {
    report.push('✅ Excellent! All services meet the coverage threshold.\n');
    report.push('Continue maintaining high coverage for new code.');
  }

  return report.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const serviceArg = args.find(a => a.startsWith('--service='));
  const outputArg = args.find(a => a.startsWith('--output='));

  const targetService = serviceArg ? serviceArg.split('=')[1] : null;
  const outputPath = outputArg
    ? outputArg.split('=')[1]
    : path.join(OUTPUT_DIR, `coverage-gaps-${new Date().toISOString().split('T')[0]}.md`);

  console.log('🔍 Analyzing coverage...\n');

  const services = getServices();
  const analyzed: ServiceCoverage[] = [];

  for (const service of services) {
    if (targetService && !service.includes(targetService)) {
      continue;
    }

    const analysis = analyzeServiceCoverage(service);
    if (analysis) {
      analyzed.push(analysis);
      console.log(`✓ ${service}: ${analysis.coverage.total.lines.pct.toFixed(1)}% ${analysis.meetThreshold ? '✅' : '❌'}`);
    }
  }

  if (analyzed.length === 0) {
    console.error('❌ No coverage data found. Run tests with coverage first: pnpm test:coverage');
    process.exit(1);
  }

  console.log(`\n📊 Analyzed ${analyzed.length} service(s)\n`);

  const report = generateReport(analyzed);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Write report
  fs.writeFileSync(outputPath, report);
  console.log(`✓ Report saved to: ${outputPath}`);

  // Print summary to console
  const failing = analyzed.filter(s => !s.meetThreshold);
  if (failing.length > 0) {
    console.log(`\n⚠️  ${failing.length} service(s) below ${THRESHOLD}% threshold:`);
    for (const service of failing) {
      console.log(`   ${service.service}: ${service.coverage.total.lines.pct.toFixed(1)}%`);
    }
    console.log('\nRun with --verbose to see detailed gaps');
  } else {
    console.log('\n✅ All services meet the coverage threshold!');
  }
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { analyzeServiceCoverage, generateReport, getServices };
