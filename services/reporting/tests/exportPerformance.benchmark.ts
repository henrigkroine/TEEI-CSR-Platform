/**
 * Export Performance Benchmarks
 *
 * Standalone benchmark script for measuring export performance
 * Run with: tsx tests/exportPerformance.benchmark.ts
 *
 * @module tests/exportPerformance.benchmark
 */

import { exportReportToPDF, exportMultipleReportsToPDF } from '../src/utils/pdfExport.js';
import { renderChart, renderChartsBatch, getRenderStats, resetRenderStats, clearChartCache } from '../src/utils/chartRenderer.js';
import { createTestReport, testCharts, testTenants, performanceThresholds } from './fixtures/exportTestData.js';
import type { PDFExportRequest } from '../types.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('export-benchmark');

/**
 * Benchmark Result
 */
interface BenchmarkResult {
  name: string;
  duration: number;
  threshold: number;
  passed: boolean;
  metadata?: Record<string, any>;
}

/**
 * Run all benchmarks
 */
async function runBenchmarks(): Promise<void> {
  console.log('\n🚀 Export Performance Benchmarks\n');
  console.log('━'.repeat(80));

  const results: BenchmarkResult[] = [];

  // Clear cache before benchmarks
  await clearChartCache();
  resetRenderStats();

  // Benchmark 1: Single PDF Export
  results.push(await benchmarkSinglePDFExport());

  // Benchmark 2: Batch PDF Export
  results.push(await benchmarkBatchPDFExport());

  // Benchmark 3: Chart Rendering (Cold)
  results.push(await benchmarkChartRenderingCold());

  // Benchmark 4: Chart Rendering (Cached)
  results.push(await benchmarkChartRenderingCached());

  // Benchmark 5: Batch Chart Rendering
  results.push(await benchmarkBatchChartRendering());

  // Benchmark 6: PDF with All Chart Types
  results.push(await benchmarkPDFWithAllCharts());

  // Print results
  printResults(results);

  // Print statistics
  printStatistics();

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

/**
 * Benchmark: Single PDF Export
 */
async function benchmarkSinglePDFExport(): Promise<BenchmarkResult> {
  console.log('\n📄 Benchmark: Single PDF Export');

  const report = createTestReport('acme', {
    includeCharts: true,
    chartCount: 3,
    sectionCount: 5,
  });

  const request: PDFExportRequest = {
    reportConfig: report,
    tenantId: testTenants.acme.id,
    options: {
      includeCharts: true,
      includeCitations: true,
      includeTableOfContents: true,
    },
  };

  const startTime = Date.now();
  const result = await exportReportToPDF(request);
  const duration = Date.now() - startTime;

  const passed = duration < performanceThresholds.singlePDFExport;
  const status = passed ? '✅' : '❌';

  console.log(`   ${status} Duration: ${duration}ms (threshold: ${performanceThresholds.singlePDFExport}ms)`);
  console.log(`   📊 Pages: ${result.pageCount}`);
  console.log(`   📦 Size: ${(result.fileSize! / 1024).toFixed(2)} KB`);

  return {
    name: 'Single PDF Export',
    duration,
    threshold: performanceThresholds.singlePDFExport,
    passed,
    metadata: {
      pageCount: result.pageCount,
      fileSize: result.fileSize,
    },
  };
}

/**
 * Benchmark: Batch PDF Export
 */
async function benchmarkBatchPDFExport(): Promise<BenchmarkResult> {
  console.log('\n📚 Benchmark: Batch PDF Export (3 reports)');

  const reportIds = ['report-batch-001', 'report-batch-002', 'report-batch-003'];

  const startTime = Date.now();

  // Note: This assumes reports exist or will fail gracefully
  const result = await exportMultipleReportsToPDF(
    reportIds,
    testTenants.acme.id,
    {
      includeCharts: true,
    }
  );

  const duration = Date.now() - startTime;
  const passed = duration < performanceThresholds.batchPDFExport;
  const status = passed ? '✅' : '❌';

  console.log(`   ${status} Duration: ${duration}ms (threshold: ${performanceThresholds.batchPDFExport}ms)`);
  if (result.success) {
    console.log(`   📦 Total Size: ${(result.fileSize! / 1024).toFixed(2)} KB`);
  }

  return {
    name: 'Batch PDF Export',
    duration,
    threshold: performanceThresholds.batchPDFExport,
    passed,
    metadata: {
      reportCount: reportIds.length,
      success: result.success,
    },
  };
}

/**
 * Benchmark: Chart Rendering (Cold)
 */
async function benchmarkChartRenderingCold(): Promise<BenchmarkResult> {
  console.log('\n📈 Benchmark: Chart Rendering (Cold Cache)');

  await clearChartCache();

  const chart = Object.values(testCharts)[0];

  const startTime = Date.now();
  const result = await renderChart(chart, { useCache: true });
  const duration = Date.now() - startTime;

  const passed = duration < performanceThresholds.chartRender;
  const status = passed ? '✅' : '❌';

  console.log(`   ${status} Duration: ${duration}ms (threshold: ${performanceThresholds.chartRender}ms)`);
  console.log(`   📊 Size: ${(result.buffer.length / 1024).toFixed(2)} KB`);
  console.log(`   🎯 Cache Hit: ${result.cacheHit}`);

  return {
    name: 'Chart Rendering (Cold)',
    duration,
    threshold: performanceThresholds.chartRender,
    passed,
    metadata: {
      cacheHit: result.cacheHit,
      bufferSize: result.buffer.length,
    },
  };
}

/**
 * Benchmark: Chart Rendering (Cached)
 */
async function benchmarkChartRenderingCached(): Promise<BenchmarkResult> {
  console.log('\n📈 Benchmark: Chart Rendering (Cached)');

  const chart = Object.values(testCharts)[0];

  // Prime cache
  await renderChart(chart, { useCache: true });

  // Measure cached render
  const startTime = Date.now();
  const result = await renderChart(chart, { useCache: true });
  const duration = Date.now() - startTime;

  const passed = duration < performanceThresholds.chartRenderCached;
  const status = passed ? '✅' : '❌';

  console.log(`   ${status} Duration: ${duration}ms (threshold: ${performanceThresholds.chartRenderCached}ms)`);
  console.log(`   🎯 Cache Hit: ${result.cacheHit}`);

  return {
    name: 'Chart Rendering (Cached)',
    duration,
    threshold: performanceThresholds.chartRenderCached,
    passed,
    metadata: {
      cacheHit: result.cacheHit,
      speedup: 'N/A', // Would need cold time to calculate
    },
  };
}

/**
 * Benchmark: Batch Chart Rendering
 */
async function benchmarkBatchChartRendering(): Promise<BenchmarkResult> {
  console.log('\n📊 Benchmark: Batch Chart Rendering (6 charts)');

  await clearChartCache();

  const charts = Object.values(testCharts);

  const startTime = Date.now();
  const results = await renderChartsBatch(charts);
  const duration = Date.now() - startTime;

  const threshold = performanceThresholds.chartRender * charts.length;
  const passed = duration < threshold;
  const status = passed ? '✅' : '❌';

  const totalSize = results.reduce((sum, r) => sum + r.buffer.length, 0);

  console.log(`   ${status} Duration: ${duration}ms (threshold: ${threshold}ms)`);
  console.log(`   📊 Charts: ${results.length}`);
  console.log(`   📦 Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`   ⚡ Avg per chart: ${(duration / charts.length).toFixed(0)}ms`);

  return {
    name: 'Batch Chart Rendering',
    duration,
    threshold,
    passed,
    metadata: {
      chartCount: charts.length,
      totalSize,
      avgPerChart: duration / charts.length,
    },
  };
}

/**
 * Benchmark: PDF with All Chart Types
 */
async function benchmarkPDFWithAllCharts(): Promise<BenchmarkResult> {
  console.log('\n📊 Benchmark: PDF with All Chart Types');

  const report = createTestReport('acme', {
    includeCharts: true,
    sectionCount: 6, // One section per chart type
  });

  const request: PDFExportRequest = {
    reportConfig: report,
    tenantId: testTenants.acme.id,
    options: {
      includeCharts: true,
    },
  };

  const startTime = Date.now();
  const result = await exportReportToPDF(request);
  const duration = Date.now() - startTime;

  const threshold = performanceThresholds.singlePDFExport;
  const passed = duration < threshold;
  const status = passed ? '✅' : '❌';

  console.log(`   ${status} Duration: ${duration}ms (threshold: ${threshold}ms)`);
  console.log(`   📄 Pages: ${result.pageCount}`);
  console.log(`   📦 Size: ${(result.fileSize! / 1024).toFixed(2)} KB`);

  return {
    name: 'PDF with All Chart Types',
    duration,
    threshold,
    passed,
    metadata: {
      pageCount: result.pageCount,
      fileSize: result.fileSize,
    },
  };
}

/**
 * Print benchmark results
 */
function printResults(results: BenchmarkResult[]): void {
  console.log('\n' + '━'.repeat(80));
  console.log('\n📊 Benchmark Results Summary\n');

  console.log('┌─────────────────────────────────────┬──────────┬─────────────┬────────┐');
  console.log('│ Benchmark                           │ Duration │ Threshold   │ Status │');
  console.log('├─────────────────────────────────────┼──────────┼─────────────┼────────┤');

  results.forEach(result => {
    const name = result.name.padEnd(35);
    const duration = `${result.duration}ms`.padStart(8);
    const threshold = `${result.threshold}ms`.padStart(11);
    const status = result.passed ? '  ✅   ' : '  ❌   ';

    console.log(`│ ${name} │ ${duration} │ ${threshold} │ ${status}│`);
  });

  console.log('└─────────────────────────────────────┴──────────┴─────────────┴────────┘');

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log(`\n✅ Passed: ${passedCount}/${totalCount} (${passRate}%)`);

  if (passedCount < totalCount) {
    console.log(`❌ Failed: ${totalCount - passedCount}`);
  }
}

/**
 * Print rendering statistics
 */
function printStatistics(): void {
  console.log('\n' + '━'.repeat(80));
  console.log('\n📈 Chart Rendering Statistics\n');

  const stats = getRenderStats();

  console.log(`   Total Renders:       ${stats.totalRenders}`);
  console.log(`   Cache Hits:          ${stats.cacheHits} (${((stats.cacheHits / stats.totalRenders) * 100).toFixed(1)}%)`);
  console.log(`   Cache Misses:        ${stats.cacheMisses}`);
  console.log(`   Average Render Time: ${stats.averageRenderTime.toFixed(0)}ms`);
  console.log(`   Total Render Time:   ${stats.totalRenderTime}ms`);
  console.log(`   Errors:              ${stats.errors}`);

  if (stats.cacheHits > 0) {
    const cacheEfficiency = ((stats.cacheHits / stats.totalRenders) * 100).toFixed(1);
    console.log(`\n   🎯 Cache Efficiency: ${cacheEfficiency}%`);
  }

  console.log('\n' + '━'.repeat(80) + '\n');
}

/**
 * Run benchmarks
 */
runBenchmarks().catch(error => {
  console.error('\n❌ Benchmark failed:', error);
  process.exit(1);
});
