/**
 * NLQ Cache Performance Benchmark
 *
 * Measures cache performance and validates p95 ≤2.5s latency target
 *
 * Usage:
 *   tsx src/cache/benchmark.ts
 */

import { getNLQCache, generateCacheKey } from './nlq-cache.js';
import { getCacheWarmer } from './cache-warmer.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('insights-nlq:benchmark');

// ===== BENCHMARK CONFIGURATION =====

const BENCHMARK_CONFIG = {
  warmupQueries: 50,        // Number of queries to pre-warm
  testQueries: 1000,        // Total queries to execute
  concurrentRequests: 10,   // Concurrent query load
  queryLatencyMs: 1500,     // Simulated query execution time
  companyCount: 5,          // Number of companies to test
};

// ===== MOCK QUERY EXECUTOR =====

/**
 * Simulates expensive query execution
 */
async function executeExpensiveQuery(
  question: string,
  companyId: string
): Promise<any> {
  // Simulate query latency
  await new Promise(resolve =>
    setTimeout(resolve, BENCHMARK_CONFIG.queryLatencyMs)
  );

  return {
    question,
    companyId,
    results: Array.from({ length: 10 }, (_, i) => ({
      id: i,
      value: Math.random() * 100,
    })),
    executedAt: new Date().toISOString(),
  };
}

// ===== BENCHMARK RUNNER =====

interface BenchmarkResult {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  totalDuration: number;
  queriesPerSecond: number;
}

async function runBenchmark(): Promise<BenchmarkResult> {
  const cache = getNLQCache();
  const warmer = getCacheWarmer();

  logger.info('Starting NLQ Cache Benchmark', BENCHMARK_CONFIG);

  // ===== PHASE 1: Cache Warmup =====
  logger.info('Phase 1: Pre-warming cache...');

  const warmupStart = Date.now();
  const companies = Array.from(
    { length: BENCHMARK_CONFIG.companyCount },
    (_, i) => `company-${i + 1}`
  );

  await warmer.warmup(companies);

  const warmupDuration = Date.now() - warmupStart;
  logger.info('Warmup completed', { duration: warmupDuration });

  // ===== PHASE 2: Query Execution =====
  logger.info('Phase 2: Executing queries...');

  const latencies: number[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;

  const questions = [
    'What is our SROI for last quarter?',
    'Show me SROI trend for the past year',
    'What is our average VIS score?',
    'Show VIS trend for last 3 months',
    'What are our outcome scores by dimension?',
    'How many active participants do we have?',
    'Show participant engagement over time',
    'How many volunteers were active last month?',
    'What is our average language level?',
    'What is our job readiness score?',
  ];

  const timeRanges = ['last_quarter', 'last_year', 'last_30d', 'ytd'];

  const benchmarkStart = Date.now();

  // Execute queries in batches
  const batchSize = BENCHMARK_CONFIG.concurrentRequests;
  const batches = Math.ceil(BENCHMARK_CONFIG.testQueries / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const batchPromises: Promise<void>[] = [];

    for (let i = 0; i < batchSize; i++) {
      const queryIndex = batch * batchSize + i;
      if (queryIndex >= BENCHMARK_CONFIG.testQueries) break;

      const question = questions[queryIndex % questions.length];
      const companyId = companies[queryIndex % companies.length];
      const timeRange = timeRanges[queryIndex % timeRanges.length];

      const promise = (async () => {
        const cacheKey = generateCacheKey({
          normalizedQuestion: question,
          companyId,
          timeRange,
        });

        const startTime = Date.now();

        const result = await cache.withStampedeProtection(
          cacheKey,
          async () => executeExpensiveQuery(question, companyId),
          3600,
          'benchmark-template',
          question
        );

        const latency = Date.now() - startTime;
        latencies.push(latency);

        if (result.cached) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
      })();

      batchPromises.push(promise);
    }

    await Promise.all(batchPromises);

    // Progress logging
    if ((batch + 1) % 10 === 0) {
      const progress = ((batch + 1) / batches) * 100;
      logger.info(`Progress: ${progress.toFixed(0)}%`, {
        queriesExecuted: latencies.length,
        hitRate: (cacheHits / (cacheHits + cacheMisses)) * 100,
      });
    }
  }

  const totalDuration = Date.now() - benchmarkStart;

  // ===== PHASE 3: Calculate Statistics =====
  logger.info('Phase 3: Calculating statistics...');

  latencies.sort((a, b) => a - b);

  const p50Index = Math.floor(latencies.length * 0.5);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);

  const result: BenchmarkResult = {
    totalQueries: latencies.length,
    cacheHits,
    cacheMisses,
    hitRate: (cacheHits / (cacheHits + cacheMisses)) * 100,
    latencies,
    p50: latencies[p50Index],
    p95: latencies[p95Index],
    p99: latencies[p99Index],
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    minLatency: latencies[0],
    maxLatency: latencies[latencies.length - 1],
    totalDuration,
    queriesPerSecond: (latencies.length / totalDuration) * 1000,
  };

  return result;
}

// ===== REPORT GENERATION =====

function printBenchmarkReport(result: BenchmarkResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('  NLQ CACHE PERFORMANCE BENCHMARK REPORT');
  console.log('='.repeat(70));

  console.log('\n📊 QUERY STATISTICS');
  console.log('─'.repeat(70));
  console.log(`  Total Queries:      ${result.totalQueries.toLocaleString()}`);
  console.log(`  Cache Hits:         ${result.cacheHits.toLocaleString()} ✓`);
  console.log(`  Cache Misses:       ${result.cacheMisses.toLocaleString()} ✗`);
  console.log(`  Hit Rate:           ${result.hitRate.toFixed(2)}%`);

  console.log('\n⚡ LATENCY METRICS (milliseconds)');
  console.log('─'.repeat(70));
  console.log(`  Minimum:            ${result.minLatency.toFixed(2)} ms`);
  console.log(`  Average:            ${result.avgLatency.toFixed(2)} ms`);
  console.log(`  p50 (Median):       ${result.p50.toFixed(2)} ms`);
  console.log(`  p95:                ${result.p95.toFixed(2)} ms ${result.p95 <= 2500 ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  p99:                ${result.p99.toFixed(2)} ms`);
  console.log(`  Maximum:            ${result.maxLatency.toFixed(2)} ms`);

  console.log('\n🚀 THROUGHPUT');
  console.log('─'.repeat(70));
  console.log(`  Total Duration:     ${(result.totalDuration / 1000).toFixed(2)} seconds`);
  console.log(`  Queries/Second:     ${result.queriesPerSecond.toFixed(2)} QPS`);

  console.log('\n🎯 TARGET VALIDATION');
  console.log('─'.repeat(70));
  const p95Target = 2500; // 2.5 seconds
  const hitRateTarget = 80; // 80%

  const p95Pass = result.p95 <= p95Target;
  const hitRatePass = result.hitRate >= hitRateTarget;

  console.log(`  p95 ≤ ${p95Target}ms:        ${p95Pass ? '✓ PASS' : '✗ FAIL'} (${result.p95.toFixed(2)} ms)`);
  console.log(`  Hit Rate ≥ ${hitRateTarget}%:      ${hitRatePass ? '✓ PASS' : '✗ FAIL'} (${result.hitRate.toFixed(2)}%)`);

  if (p95Pass && hitRatePass) {
    console.log('\n✅ ALL TARGETS MET!');
  } else {
    console.log('\n❌ SOME TARGETS MISSED');
    if (!p95Pass) {
      console.log(`   - p95 latency ${result.p95.toFixed(2)}ms exceeds ${p95Target}ms target`);
    }
    if (!hitRatePass) {
      console.log(`   - Hit rate ${result.hitRate.toFixed(2)}% below ${hitRateTarget}% target`);
    }
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// ===== LATENCY DISTRIBUTION =====

function printLatencyDistribution(latencies: number[]): void {
  console.log('\n📈 LATENCY DISTRIBUTION');
  console.log('─'.repeat(70));

  const buckets = [
    { label: '0-10ms (Cache Hit)', min: 0, max: 10 },
    { label: '10-50ms', min: 10, max: 50 },
    { label: '50-100ms', min: 50, max: 100 },
    { label: '100-500ms', min: 100, max: 500 },
    { label: '500-1000ms', min: 500, max: 1000 },
    { label: '1000-2000ms', min: 1000, max: 2000 },
    { label: '2000-3000ms (Target)', min: 2000, max: 3000 },
    { label: '3000+ms', min: 3000, max: Infinity },
  ];

  buckets.forEach(bucket => {
    const count = latencies.filter(
      lat => lat >= bucket.min && lat < bucket.max
    ).length;
    const percentage = (count / latencies.length) * 100;
    const bar = '█'.repeat(Math.floor(percentage / 2));

    console.log(`  ${bucket.label.padEnd(25)} ${count.toString().padStart(5)} (${percentage.toFixed(1).padStart(5)}%) ${bar}`);
  });
}

// ===== MAIN =====

async function main() {
  try {
    const result = await runBenchmark();

    printBenchmarkReport(result);
    printLatencyDistribution(result.latencies);

    // Get cache stats
    const cache = getNLQCache();
    const stats = await cache.getStats();

    console.log('\n💾 REDIS CACHE STATISTICS');
    console.log('─'.repeat(70));
    console.log(`  Total Keys:         ${stats.totalKeys.toLocaleString()}`);
    console.log(`  Memory Used:        ${stats.memoryUsed}`);
    console.log(`  Average TTL:        ${stats.avgTtl} seconds`);

    console.log('\n🔥 TOP QUERIES');
    console.log('─'.repeat(70));
    stats.topQueries.slice(0, 5).forEach((query, idx) => {
      console.log(`  ${idx + 1}. ${query.question} (${query.hits} hits)`);
    });

    process.exit(result.p95 <= 2500 && result.hitRate >= 80 ? 0 : 1);
  } catch (error) {
    logger.error('Benchmark failed', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runBenchmark, printBenchmarkReport, printLatencyDistribution };
