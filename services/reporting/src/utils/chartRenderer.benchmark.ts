/**
 * Chart Renderer Performance Benchmarks
 *
 * Benchmark script to measure chart rendering performance
 * Run with: tsx src/utils/chartRenderer.benchmark.ts
 *
 * @module utils/chartRenderer.benchmark
 */

import {
  renderChart,
  renderChartsBatch,
  getRenderStats,
  resetRenderStats,
  clearChartCache,
  warmCache,
  cleanup,
  type ChartConfig,
} from './chartRenderer.js';

// Sample chart configurations
const benchmarkCharts: { name: string; config: ChartConfig }[] = [
  {
    name: 'Simple Line Chart',
    config: {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Revenue',
            data: [12, 19, 3, 5, 2, 3],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
        ],
      },
    },
  },
  {
    name: 'Complex Line Chart (3 series)',
    config: {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `Month ${i + 1}`),
        datasets: [
          {
            label: 'Series 1',
            data: Array.from({ length: 24 }, () => Math.random() * 100),
            borderColor: '#3b82f6',
          },
          {
            label: 'Series 2',
            data: Array.from({ length: 24 }, () => Math.random() * 100),
            borderColor: '#10b981',
          },
          {
            label: 'Series 3',
            data: Array.from({ length: 24 }, () => Math.random() * 100),
            borderColor: '#f59e0b',
          },
        ],
      },
    },
  },
  {
    name: 'Bar Chart',
    config: {
      type: 'bar',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: 'Impact Score',
            data: [65, 72, 81, 88],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
          },
        ],
      },
    },
  },
  {
    name: 'Pie Chart',
    config: {
      type: 'pie',
      data: {
        labels: ['Integration', 'Language', 'Job Readiness', 'Community'],
        datasets: [
          {
            label: 'Outcome Distribution',
            data: [30, 25, 25, 20],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
          },
        ],
      },
    },
  },
  {
    name: 'Doughnut Chart',
    config: {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Pending'],
        datasets: [
          {
            label: 'Project Status',
            data: [45, 35, 20],
            backgroundColor: ['#10b981', '#f59e0b', '#6b7280'],
          },
        ],
      },
    },
  },
  {
    name: 'Radar Chart',
    config: {
      type: 'radar',
      data: {
        labels: ['Communication', 'Technical', 'Leadership', 'Teamwork', 'Problem Solving'],
        datasets: [
          {
            label: 'Skills Assessment',
            data: [85, 75, 80, 90, 88],
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: '#3b82f6',
          },
        ],
      },
    },
  },
  {
    name: 'Area Chart',
    config: {
      type: 'area',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Volunteer Hours',
            data: [120, 145, 160, 180],
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderColor: '#10b981',
            fill: true,
          },
        ],
      },
    },
  },
];

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // charts per second
}

/**
 * Run benchmark for a single chart configuration
 */
async function benchmarkSingleChart(
  name: string,
  config: ChartConfig,
  iterations: number = 10
): Promise<BenchmarkResult> {
  console.log(`\nBenchmarking: ${name}`);
  console.log(`Iterations: ${iterations}`);

  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    await renderChart(config, {
      useCache: false, // Disable cache for pure rendering benchmark
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    times.push(duration);

    process.stdout.write(`  Iteration ${i + 1}/${iterations}: ${duration}ms\r`);
  }

  console.log(''); // New line after iterations

  const totalTime = times.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const throughput = 1000 / averageTime;

  return {
    name,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    throughput,
  };
}

/**
 * Benchmark cache performance
 */
async function benchmarkCache(): Promise<void> {
  console.log('\n=== Cache Performance Benchmark ===\n');

  const config = benchmarkCharts[0].config;

  // Clear cache
  await clearChartCache();
  resetRenderStats();

  // Cold render (no cache)
  console.log('Cold render (cache miss):');
  const coldStart = Date.now();
  await renderChart(config, { useCache: true });
  const coldTime = Date.now() - coldStart;
  console.log(`  Time: ${coldTime}ms`);

  // Warm render (cache hit)
  console.log('\nWarm render (cache hit):');
  const warmStart = Date.now();
  await renderChart(config, { useCache: true });
  const warmTime = Date.now() - warmStart;
  console.log(`  Time: ${warmTime}ms`);

  const speedup = (coldTime / warmTime).toFixed(2);
  console.log(`\nCache speedup: ${speedup}x faster`);

  const stats = getRenderStats();
  console.log(`\nCache statistics:`);
  console.log(`  Total renders: ${stats.totalRenders}`);
  console.log(`  Cache hits: ${stats.cacheHits}`);
  console.log(`  Cache misses: ${stats.cacheMisses}`);
  console.log(`  Hit rate: ${((stats.cacheHits / stats.totalRenders) * 100).toFixed(1)}%`);
}

/**
 * Benchmark batch rendering
 */
async function benchmarkBatch(): Promise<void> {
  console.log('\n=== Batch Rendering Benchmark ===\n');

  const configs = benchmarkCharts.slice(0, 5).map(b => b.config);

  // Sequential rendering
  console.log('Sequential rendering:');
  const seqStart = Date.now();
  for (const config of configs) {
    await renderChart(config, { useCache: false });
  }
  const seqTime = Date.now() - seqStart;
  console.log(`  Time: ${seqTime}ms (${(seqTime / configs.length).toFixed(0)}ms per chart)`);

  // Batch rendering
  console.log('\nBatch rendering (parallel):');
  const batchStart = Date.now();
  await renderChartsBatch(configs, { useCache: false });
  const batchTime = Date.now() - batchStart;
  console.log(`  Time: ${batchTime}ms (${(batchTime / configs.length).toFixed(0)}ms per chart)`);

  const improvement = (((seqTime - batchTime) / seqTime) * 100).toFixed(1);
  console.log(`\nBatch improvement: ${improvement}% faster`);
}

/**
 * Benchmark different output sizes
 */
async function benchmarkSizes(): Promise<void> {
  console.log('\n=== Output Size Benchmark ===\n');

  const config = benchmarkCharts[0].config;
  const sizes = [
    { width: 400, height: 300, name: 'Small' },
    { width: 800, height: 500, name: 'Medium' },
    { width: 1200, height: 800, name: 'Large' },
    { width: 1920, height: 1080, name: 'HD' },
  ];

  for (const size of sizes) {
    const startTime = Date.now();
    const result = await renderChart(config, {
      width: size.width,
      height: size.height,
      useCache: false,
    });
    const endTime = Date.now();

    const fileSizeKB = (result.buffer.length / 1024).toFixed(1);
    console.log(
      `${size.name} (${size.width}x${size.height}): ${endTime - startTime}ms, ${fileSizeKB} KB`
    );
  }
}

/**
 * Benchmark cache warming
 */
async function benchmarkCacheWarming(): Promise<void> {
  console.log('\n=== Cache Warming Benchmark ===\n');

  await clearChartCache();

  const configs = benchmarkCharts.map(b => b.config);

  // Measure warming time
  console.log('Warming cache...');
  const warmStart = Date.now();
  await warmCache(configs);
  const warmTime = Date.now() - warmStart;

  console.log(`Cache warming time: ${warmTime}ms for ${configs.length} charts`);
  console.log(`Average: ${(warmTime / configs.length).toFixed(0)}ms per chart`);

  // Measure retrieval time
  console.log('\nRetrieving from cache...');
  const retrieveStart = Date.now();
  await renderChartsBatch(configs, { useCache: true });
  const retrieveTime = Date.now() - retrieveStart;

  console.log(`Cache retrieval time: ${retrieveTime}ms for ${configs.length} charts`);
  console.log(`Average: ${(retrieveTime / configs.length).toFixed(0)}ms per chart`);

  const stats = getRenderStats();
  console.log(`\nCache hit rate: ${((stats.cacheHits / stats.totalRenders) * 100).toFixed(1)}%`);
}

/**
 * Print summary table
 */
function printSummary(results: BenchmarkResult[]): void {
  console.log('\n=== Benchmark Summary ===\n');

  console.log('┌────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬────────────┐');
  console.log('│ Chart Type                     │ Avg (ms) │ Min (ms) │ Max (ms) │ Throughput │ Total (ms) │');
  console.log('├────────────────────────────────┼──────────┼──────────┼──────────┼────────────┼────────────┤');

  for (const result of results) {
    const name = result.name.padEnd(30);
    const avg = result.averageTime.toFixed(0).padStart(8);
    const min = result.minTime.toFixed(0).padStart(8);
    const max = result.maxTime.toFixed(0).padStart(8);
    const throughput = result.throughput.toFixed(2).padStart(10) + '/s';
    const total = result.totalTime.toFixed(0).padStart(10);

    console.log(`│ ${name} │ ${avg} │ ${min} │ ${max} │ ${throughput} │ ${total} │`);
  }

  console.log('└────────────────────────────────┴──────────┴──────────┴──────────┴────────────┴────────────┘');

  // Overall statistics
  const totalTime = results.reduce((a, b) => a + b.totalTime, 0);
  const avgThroughput = results.reduce((a, b) => a + b.throughput, 0) / results.length;

  console.log(`\nOverall Statistics:`);
  console.log(`  Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  Average throughput: ${avgThroughput.toFixed(2)} charts/second`);
}

/**
 * Main benchmark runner
 */
async function runBenchmarks(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          Chart Renderer Performance Benchmarks                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    // 1. Single chart benchmarks
    console.log('\n=== Individual Chart Type Benchmarks ===\n');
    const results: BenchmarkResult[] = [];

    for (const chart of benchmarkCharts) {
      const result = await benchmarkSingleChart(chart.name, chart.config, 5);
      results.push(result);
    }

    printSummary(results);

    // 2. Cache benchmark
    await benchmarkCache();

    // 3. Batch benchmark
    await benchmarkBatch();

    // 4. Size benchmark
    await benchmarkSizes();

    // 5. Cache warming benchmark
    await benchmarkCacheWarming();

    // Final statistics
    const stats = getRenderStats();
    console.log('\n=== Final Statistics ===\n');
    console.log(`Total renders: ${stats.totalRenders}`);
    console.log(`Cache hits: ${stats.cacheHits}`);
    console.log(`Cache misses: ${stats.cacheMisses}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Average render time: ${stats.averageRenderTime.toFixed(0)}ms`);
    console.log(
      `Overall hit rate: ${((stats.cacheHits / stats.totalRenders) * 100).toFixed(1)}%`
    );

    const totalTime = Date.now() - startTime;
    console.log(`\nTotal benchmark time: ${(totalTime / 1000).toFixed(2)}s`);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
  } finally {
    // Cleanup
    await cleanup();
  }
}

// Run benchmarks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks()
    .then(() => {
      console.log('\n✅ Benchmarks completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Benchmarks failed:', error);
      process.exit(1);
    });
}

export { runBenchmarks, benchmarkSingleChart, benchmarkCache, benchmarkBatch };
