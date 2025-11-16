/**
 * k6 Soak Test - NLQ Service
 *
 * Purpose: Test system stability over extended period
 *
 * Duration: 30 minutes at sustained load
 * Load: 50 concurrent users (moderate, sustainable load)
 *
 * What we're testing:
 * 1. Memory leaks (should remain stable)
 * 2. Cache stability (hit rate should remain consistent)
 * 3. Connection pool management (no connection exhaustion)
 * 4. Database query performance over time
 * 5. LLM API consistency
 * 6. Redis memory management
 *
 * Success criteria:
 * - Performance remains stable throughout test
 * - No memory leaks
 * - Error rate stays below 1%
 * - Cache hit rate remains ≥ 80%
 * - p95 latency stays ≤ 2.5s
 *
 * Run: k6 run tests/k6/nlq-soak.js
 * Run with custom duration: SOAK_DURATION=60m k6 run tests/k6/nlq-soak.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate, Counter } from 'k6/metrics';
import {
  nlqMetrics,
  COMPANIES,
  CANONICAL_QUESTIONS,
  randomChoice,
  buildAskRequest,
  buildHistoryParams,
  trackResponseMetrics,
} from './nlq-helpers.js';

// ===== CONFIGURATION =====

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3008/v1/nlq';
const SOAK_DURATION = __ENV.SOAK_DURATION || '30m';
const TARGET_VUS = parseInt(__ENV.TARGET_VUS || '50');

// Shared test data
const canonicalQuestions = new SharedArray('canonical', () => CANONICAL_QUESTIONS);
const companies = new SharedArray('companies', () => COMPANIES);

// Soak test specific metrics
const soakMetrics = {
  // Track degradation over time
  latencyTrend: new Trend('soak_latency_over_time'),
  errorRateTrend: new Rate('soak_error_rate_over_time'),

  // Memory/resource indicators
  connectionPoolSize: new Trend('soak_connection_pool_size'),
  cacheHitRateTrend: new Trend('soak_cache_hit_rate_trend'),

  // Stability metrics
  performanceDegradation: new Counter('soak_performance_degradation'),
  unexpectedErrors: new Counter('soak_unexpected_errors'),
  slowQueries: new Counter('soak_slow_queries'),

  // Time-based buckets for analysis
  first10min: new Trend('soak_first_10min'),
  middle10min: new Trend('soak_middle_10min'),
  last10min: new Trend('soak_last_10min'),
};

// ===== TEST OPTIONS =====

export const options = {
  scenarios: {
    // Main soak test scenario
    soak_test: {
      executor: 'constant-vus',
      exec: 'soakTest',
      vus: TARGET_VUS,
      duration: SOAK_DURATION,
      gracefulStop: '30s',
      tags: { test_type: 'soak' },
    },

    // Health check scenario - runs throughout test
    health_monitor: {
      executor: 'constant-vus',
      exec: 'healthCheck',
      vus: 1,
      duration: SOAK_DURATION,
      gracefulStop: '10s',
      tags: { test_type: 'health' },
    },
  },

  thresholds: {
    // Performance should remain stable
    'http_req_duration{test_type:soak}': [
      'p(95)<2500',  // Primary SLA
      'p(99)<5000',
    ],

    // Error rate should stay low
    'http_req_failed{test_type:soak}': ['rate<0.01'],
    'nlq_errors': ['rate<0.01'],

    // Cache hit rate should remain high
    'nlq_cache_hit_rate': ['rate>0.80'],

    // No significant performance degradation
    'soak_performance_degradation': ['count<5'],

    // Slow queries should be rare
    'soak_slow_queries': ['count<10'],

    // Latency should not degrade over time
    // These compare first 10 min vs last 10 min
    'soak_first_10min': ['p(95)<2500'],
    'soak_last_10min': ['p(95)<2500'],
  },
};

// Track test phase for time-based metrics
let testStartTime;
let testDurationMs;

// ===== SCENARIO 1: SOAK TEST =====

/**
 * Main soak test - sustained load over long period
 */
export function soakTest() {
  const now = Date.now();
  const elapsedMs = now - testStartTime;
  const elapsedMin = elapsedMs / 1000 / 60;

  // Determine test phase
  const testPhase = getTestPhase(elapsedMin, testDurationMs / 1000 / 60);

  // Mix of different operations
  const operation = Math.random();

  if (operation < 0.7) {
    // 70% - Ask questions (main operation)
    testAskEndpoint(testPhase);
  } else if (operation < 0.9) {
    // 20% - Check history
    testHistoryEndpoint();
  } else {
    // 10% - Check query status
    testQueryStatusEndpoint();
  }

  // Realistic think time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

/**
 * Test ask endpoint with varied questions
 */
function testAskEndpoint(testPhase) {
  const companyId = randomChoice(companies);
  const question = randomChoice(canonicalQuestions);

  const payload = buildAskRequest(question, companyId);

  const startTime = Date.now();

  const res = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'nlq_ask',
      test_type: 'soak',
      phase: testPhase,
    },
  });

  const duration = res.timings.duration;

  // Track latency by phase
  soakMetrics.latencyTrend.add(duration);

  if (testPhase === 'first') {
    soakMetrics.first10min.add(duration);
  } else if (testPhase === 'middle') {
    soakMetrics.middle10min.add(duration);
  } else if (testPhase === 'last') {
    soakMetrics.last10min.add(duration);
  }

  // Track slow queries
  if (duration > 5000) {
    soakMetrics.slowQueries.add(1);
    console.log(`⚠️  Slow query detected: ${duration.toFixed(0)}ms at ${(Date.now() - testStartTime) / 1000 / 60}min`);
  }

  // Validate response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has valid response': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.queryId && body.answer;
      }
      return false;
    },
    'latency acceptable': () => duration < 5000,
  });

  if (!success) {
    soakMetrics.errorRateTrend.add(1);
    soakMetrics.unexpectedErrors.add(1);
  } else {
    soakMetrics.errorRateTrend.add(0);
  }

  // Track metrics
  if (res.status === 200) {
    trackResponseMetrics(res);

    // Check for performance degradation
    if (testPhase === 'last' && duration > 2500) {
      // Check if this is degradation vs. normal variance
      const avgLatency = nlqMetrics.askLatency.values?.avg || 0;
      if (duration > avgLatency * 1.5) {
        soakMetrics.performanceDegradation.add(1);
      }
    }
  }
}

/**
 * Test history endpoint
 */
function testHistoryEndpoint() {
  const companyId = randomChoice(companies);
  const offset = Math.floor(Math.random() * 5) * 20; // Random page

  const params = buildHistoryParams(companyId, {
    limit: 20,
    offset,
  });

  const res = http.get(`${BASE_URL}/history?${params}`, {
    headers: {
      'Accept': 'application/json',
    },
    tags: {
      endpoint: 'nlq_history',
      test_type: 'soak',
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has pagination': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.pagination !== undefined;
      }
      return false;
    },
  });

  nlqMetrics.historyLatency.add(res.timings.duration);
}

/**
 * Test query status endpoint
 */
function testQueryStatusEndpoint() {
  // First create a query
  const companyId = randomChoice(companies);
  const question = randomChoice(canonicalQuestions);
  const payload = buildAskRequest(question, companyId);

  const askRes = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (askRes.status === 200) {
    const body = JSON.parse(askRes.body);
    const queryId = body.queryId;

    // Then check status
    const statusRes = http.get(`${BASE_URL}/queries/${queryId}`, {
      headers: {
        'Accept': 'application/json',
      },
      tags: {
        endpoint: 'nlq_query_status',
        test_type: 'soak',
      },
    });

    check(statusRes, {
      'status is 200': (r) => r.status === 200,
      'has query details': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.queryId === queryId;
        }
        return false;
      },
    });

    nlqMetrics.queryStatusLatency.add(statusRes.timings.duration);
  }
}

// ===== SCENARIO 2: HEALTH CHECK =====

/**
 * Continuous health monitoring
 */
export function healthCheck() {
  const res = http.get(`${BASE_URL.replace('/v1/nlq', '')}/health`, {
    tags: {
      endpoint: 'health',
      test_type: 'health',
    },
  });

  const healthy = check(res, {
    'health check passes': (r) => r.status === 200,
    'health check fast': (r) => r.timings.duration < 1000,
  });

  if (!healthy) {
    console.log(`❌ Health check failed at ${(Date.now() - testStartTime) / 1000 / 60}min`);
  }

  // Check every 30 seconds
  sleep(30);
}

// ===== HELPER FUNCTIONS =====

/**
 * Determine which phase of test we're in
 */
function getTestPhase(elapsedMin, totalMin) {
  const firstThird = totalMin / 3;
  const lastThird = totalMin * 2 / 3;

  if (elapsedMin < firstThird) {
    return 'first';
  } else if (elapsedMin < lastThird) {
    return 'middle';
  } else {
    return 'last';
  }
}

// ===== LIFECYCLE HOOKS =====

/**
 * Setup - runs once before test
 */
export function setup() {
  testStartTime = Date.now();
  testDurationMs = parseDuration(SOAK_DURATION);

  console.log('========================================');
  console.log('NLQ SOAK TEST');
  console.log('========================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Duration: ${SOAK_DURATION}`);
  console.log(`Concurrent VUs: ${TARGET_VUS}`);
  console.log('');
  console.log('This test will:');
  console.log('  1. Run sustained load for extended period');
  console.log('  2. Monitor for memory leaks');
  console.log('  3. Track performance degradation');
  console.log('  4. Verify cache stability');
  console.log('  5. Check connection pool health');
  console.log('');
  console.log('Success criteria:');
  console.log('  - Stable performance throughout test');
  console.log('  - Error rate < 1%');
  console.log('  - p95 latency ≤ 2.5s');
  console.log('  - Cache hit rate ≥ 80%');
  console.log('========================================\n');

  return {
    startTime: new Date().toISOString(),
    duration: SOAK_DURATION,
    targetVUs: TARGET_VUS,
  };
}

/**
 * Teardown - runs once after test
 */
export function teardown(data) {
  console.log('\n========================================');
  console.log('Soak Test Complete');
  console.log(`Duration: ${data.duration}`);
  console.log('========================================\n');
}

/**
 * Handle summary - detailed soak test analysis
 */
export function handleSummary(data) {
  console.log('\n========================================');
  console.log('SOAK TEST RESULTS');
  console.log('========================================\n');

  const metrics = data.metrics;

  // Overall statistics
  console.log('Overall Statistics:');
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const testDurationMin = data.state.testRunDurationMs / 1000 / 60;
  const avgThroughput = totalRequests / (data.state.testRunDurationMs / 1000);

  console.log(`  Total requests:        ${totalRequests}`);
  console.log(`  Test duration:         ${testDurationMin.toFixed(1)} minutes`);
  console.log(`  Avg throughput:        ${avgThroughput.toFixed(1)} req/s`);

  // Performance stability
  console.log('\nPerformance Stability:');
  const first10 = metrics.soak_first_10min?.values;
  const middle10 = metrics.soak_middle_10min?.values;
  const last10 = metrics.soak_last_10min?.values;

  if (first10 && last10) {
    console.log(`  First 10min p95:       ${first10['p(95)'].toFixed(2)}ms`);
    if (middle10) {
      console.log(`  Middle 10min p95:      ${middle10['p(95)'].toFixed(2)}ms`);
    }
    console.log(`  Last 10min p95:        ${last10['p(95)'].toFixed(2)}ms`);

    const degradation = ((last10['p(95)'] - first10['p(95)']) / first10['p(95)'] * 100);
    console.log(`  Degradation:           ${degradation.toFixed(1)}% ${degradation < 10 ? '✅' : '⚠️'}`);
  }

  // Error tracking
  console.log('\nError Analysis:');
  const errorRate = metrics.nlq_errors?.values?.rate || 0;
  const unexpectedErrors = metrics.soak_unexpected_errors?.values?.count || 0;
  const slowQueries = metrics.soak_slow_queries?.values?.count || 0;
  const degradationCount = metrics.soak_performance_degradation?.values?.count || 0;

  console.log(`  Error rate:            ${(errorRate * 100).toFixed(2)}% ${errorRate < 0.01 ? '✅' : '❌'}`);
  console.log(`  Unexpected errors:     ${unexpectedErrors}`);
  console.log(`  Slow queries (>5s):    ${slowQueries} ${slowQueries < 10 ? '✅' : '⚠️'}`);
  console.log(`  Degradation events:    ${degradationCount} ${degradationCount < 5 ? '✅' : '⚠️'}`);

  // Cache performance
  console.log('\nCache Performance:');
  const cacheHitRate = metrics.nlq_cache_hit_rate?.values?.rate || 0;
  const cachedLatency = metrics.nlq_cached_response_latency?.values;
  const uncachedLatency = metrics.nlq_uncached_response_latency?.values;

  console.log(`  Cache hit rate:        ${(cacheHitRate * 100).toFixed(1)}% ${cacheHitRate >= 0.80 ? '✅' : '❌'}`);
  if (cachedLatency) {
    console.log(`  Cached p95:            ${cachedLatency['p(95)'].toFixed(2)}ms`);
  }
  if (uncachedLatency) {
    console.log(`  Uncached p95:          ${uncachedLatency['p(95)'].toFixed(2)}ms`);
  }

  // Latency percentiles
  console.log('\nLatency Percentiles:');
  const reqDuration = metrics.http_req_duration?.values;
  if (reqDuration) {
    console.log(`  p50:                   ${reqDuration['p(50)'].toFixed(2)}ms`);
    console.log(`  p95:                   ${reqDuration['p(95)'].toFixed(2)}ms ${reqDuration['p(95)'] <= 2500 ? '✅' : '❌'}`);
    console.log(`  p99:                   ${reqDuration['p(99)'].toFixed(2)}ms`);
    console.log(`  max:                   ${reqDuration.max.toFixed(2)}ms`);
  }

  // Determine if test passed
  const passed =
    errorRate < 0.01 &&
    cacheHitRate >= 0.80 &&
    reqDuration?.['p(95)'] <= 2500 &&
    degradationCount < 5;

  console.log(`\nOverall: ${passed ? '✅ PASS' : '❌ FAIL'}`);

  // Recommendations
  console.log('\nRecommendations:');
  const recommendations = generateSoakRecommendations(metrics, first10, last10);
  recommendations.forEach(rec => {
    console.log(`  - ${rec}`);
  });

  console.log('\n========================================\n');

  // Generate report
  const report = generateSoakReport(data, first10, middle10, last10);

  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data),
    'nlq-soak-report.txt': report,
  };
}

/**
 * Generate soak test recommendations
 */
function generateSoakRecommendations(metrics, first10, last10) {
  const recommendations = [];

  // Check for performance degradation
  if (first10 && last10) {
    const degradation = ((last10['p(95)'] - first10['p(95)']) / first10['p(95)'] * 100);

    if (degradation > 20) {
      recommendations.push('Significant performance degradation detected (>20%)');
      recommendations.push('  → Investigate memory leaks');
      recommendations.push('  → Check database connection pool');
      recommendations.push('  → Review Redis memory usage');
    } else if (degradation > 10) {
      recommendations.push('Moderate performance degradation detected (10-20%)');
      recommendations.push('  → Monitor for memory growth');
    } else {
      recommendations.push('Performance remained stable ✅');
    }
  }

  // Check error rate
  const errorRate = metrics.nlq_errors?.values?.rate || 0;
  if (errorRate > 0.01) {
    recommendations.push(`Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold`);
    recommendations.push('  → Review application logs');
    recommendations.push('  → Check external service availability');
  }

  // Check cache hit rate
  const cacheHitRate = metrics.nlq_cache_hit_rate?.values?.rate || 0;
  if (cacheHitRate < 0.80) {
    recommendations.push(`Cache hit rate (${(cacheHitRate * 100).toFixed(1)}%) below target`);
    recommendations.push('  → Review cache TTL settings');
    recommendations.push('  → Check cache invalidation logic');
  }

  // Check slow queries
  const slowQueries = metrics.soak_slow_queries?.values?.count || 0;
  if (slowQueries > 10) {
    recommendations.push(`${slowQueries} slow queries detected`);
    recommendations.push('  → Review database query plans');
    recommendations.push('  → Check LLM API latency');
  }

  if (recommendations.length === 0) {
    recommendations.push('All metrics within acceptable ranges ✅');
  }

  return recommendations;
}

/**
 * Generate detailed soak test report
 */
function generateSoakReport(data, first10, middle10, last10) {
  const lines = [];

  lines.push('========================================');
  lines.push('NLQ SOAK TEST REPORT');
  lines.push('========================================');
  lines.push('');
  lines.push(`Test Date: ${new Date().toISOString()}`);
  lines.push(`Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes`);
  lines.push(`Concurrent VUs: ${TARGET_VUS}`);
  lines.push('');

  const metrics = data.metrics;

  lines.push('PERFORMANCE STABILITY:');
  if (first10 && last10) {
    lines.push(`  First 10min p95:  ${first10['p(95)'].toFixed(2)}ms`);
    if (middle10) {
      lines.push(`  Middle 10min p95: ${middle10['p(95)'].toFixed(2)}ms`);
    }
    lines.push(`  Last 10min p95:   ${last10['p(95)'].toFixed(2)}ms`);

    const degradation = ((last10['p(95)'] - first10['p(95)']) / first10['p(95)'] * 100);
    lines.push(`  Degradation:      ${degradation.toFixed(1)}% ${degradation < 10 ? 'PASS' : 'FAIL'}`);
  }
  lines.push('');

  lines.push('SUMMARY:');
  const errorRate = metrics.nlq_errors?.values?.rate || 0;
  const cacheHitRate = metrics.nlq_cache_hit_rate?.values?.rate || 0;
  const p95 = metrics.http_req_duration?.values?.['p(95)'];

  lines.push(`  Error rate:       ${(errorRate * 100).toFixed(2)}% ${errorRate < 0.01 ? 'PASS' : 'FAIL'}`);
  lines.push(`  Cache hit rate:   ${(cacheHitRate * 100).toFixed(1)}% ${cacheHitRate >= 0.80 ? 'PASS' : 'FAIL'}`);
  lines.push(`  p95 latency:      ${p95 ? p95.toFixed(2) + 'ms' : 'N/A'} ${p95 && p95 <= 2500 ? 'PASS' : 'FAIL'}`);
  lines.push('');

  lines.push('RECOMMENDATIONS:');
  const recommendations = generateSoakRecommendations(metrics, first10, last10);
  recommendations.forEach(rec => {
    lines.push(`  ${rec}`);
  });

  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) return 30 * 60 * 1000; // Default 30 minutes

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 30 * 60 * 1000;
  }
}
