/**
 * k6 Stress Test - NLQ Service
 *
 * Purpose: Find the breaking point of the NLQ service
 *
 * Tests:
 * 1. Maximum concurrent users before degradation
 * 2. Rate limiter effectiveness under heavy load
 * 3. Redis connection pool limits
 * 4. Database connection pool limits
 * 5. LLM API rate limit handling
 * 6. Cache stampede protection
 *
 * This test gradually increases load until:
 * - Error rate exceeds 5%
 * - p95 latency exceeds 5s
 * - Service becomes unresponsive
 *
 * Run: k6 run tests/k6/nlq-stress.js
 * Run with specific target: MAX_VUS=500 k6 run tests/k6/nlq-stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  nlqMetrics,
  COMPANIES,
  CANONICAL_QUESTIONS,
  randomChoice,
  buildAskRequest,
  trackResponseMetrics,
} from './nlq-helpers.js';

// ===== CONFIGURATION =====

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3008/v1/nlq';
const MAX_VUS = parseInt(__ENV.MAX_VUS || '500');

// Shared test data
const canonicalQuestions = new SharedArray('canonical', () => CANONICAL_QUESTIONS);
const companies = new SharedArray('companies', () => COMPANIES);

// Additional stress test metrics
const stressMetrics = {
  connectionErrors: new Counter('stress_connection_errors'),
  timeoutErrors: new Counter('stress_timeout_errors'),
  serverErrors: new Counter('stress_server_errors'),
  rateLimitHits: new Counter('stress_rate_limit_hits'),
  cacheSyncErrors: new Counter('stress_cache_sync_errors'),
  dbPoolExhaustion: new Counter('stress_db_pool_exhaustion'),
  concurrentRequests: new Trend('stress_concurrent_requests'),
};

// ===== TEST OPTIONS =====

export const options = {
  scenarios: {
    // Stress test: Gradually increase load to find breaking point
    stress_ramp: {
      executor: 'ramping-vus',
      exec: 'stressTest',
      stages: [
        // Phase 1: Baseline
        { duration: '1m', target: 50 },

        // Phase 2: Moderate stress
        { duration: '2m', target: 100 },
        { duration: '1m', target: 100 },

        // Phase 3: High stress
        { duration: '2m', target: 200 },
        { duration: '1m', target: 200 },

        // Phase 4: Very high stress
        { duration: '2m', target: 300 },
        { duration: '1m', target: 300 },

        // Phase 5: Extreme stress (if MAX_VUS allows)
        { duration: '2m', target: Math.min(400, MAX_VUS) },
        { duration: '1m', target: Math.min(400, MAX_VUS) },

        // Phase 6: Maximum stress
        { duration: '2m', target: MAX_VUS },
        { duration: '2m', target: MAX_VUS },

        // Phase 7: Recovery test
        { duration: '1m', target: 100 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulStop: '30s',
      tags: { test_type: 'stress' },
    },

    // Cache stampede protection test
    stampede_test: {
      executor: 'constant-vus',
      exec: 'stampedeTest',
      vus: 100,
      duration: '30s',
      startTime: '5m', // Start during high stress phase
      gracefulStop: '10s',
      tags: { test_type: 'stampede' },
    },

    // Rate limit boundary test
    rate_limit_test: {
      executor: 'ramping-arrival-rate',
      exec: 'rateLimitTest',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 50 },  // 50 req/s
        { duration: '30s', target: 100 }, // 100 req/s
        { duration: '30s', target: 200 }, // 200 req/s
        { duration: '30s', target: 300 }, // 300 req/s
      ],
      startTime: '10m', // Start later in test
      gracefulStop: '10s',
      tags: { test_type: 'rate_limit' },
    },
  },

  // Stress test thresholds (more lenient than performance test)
  thresholds: {
    // Allow higher latency but track degradation
    'http_req_duration{test_type:stress}': [
      'p(50)<2000',
      'p(95)<5000',
      'p(99)<10000',
    ],

    // Error rate can be higher but should stay reasonable
    'http_req_failed': ['rate<0.10'], // Allow up to 10% errors
    'nlq_errors': ['rate<0.10'],

    // Rate limit hits expected under stress
    'stress_rate_limit_hits': ['count>0'], // Should hit rate limits

    // Connection issues indicate infrastructure limits
    'stress_connection_errors': ['count<100'],
    'stress_timeout_errors': ['count<50'],
  },
};

// ===== SCENARIO 1: STRESS TEST =====

/**
 * Main stress test - gradually increase load
 */
export function stressTest() {
  const companyId = randomChoice(companies);
  const question = randomChoice(canonicalQuestions);

  const payload = buildAskRequest(question, companyId);

  const res = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s', // Longer timeout for stress test
    tags: {
      endpoint: 'nlq_ask',
      test_type: 'stress',
    },
  });

  // Track response
  const success = check(res, {
    'status is 2xx or 429': (r) => r.status >= 200 && r.status < 300 || r.status === 429,
  });

  // Categorize errors
  if (res.status === 0) {
    // Connection error
    stressMetrics.connectionErrors.add(1);
  } else if (res.status === 408 || res.timings.duration > 10000) {
    // Timeout
    stressMetrics.timeoutErrors.add(1);
  } else if (res.status >= 500) {
    // Server error
    stressMetrics.serverErrors.add(1);
  } else if (res.status === 429) {
    // Rate limit
    stressMetrics.rateLimitHits.add(1);
  }

  // Check for specific error patterns
  if (res.status === 500 && res.body.includes('database connection')) {
    stressMetrics.dbPoolExhaustion.add(1);
  }

  if (res.status === 500 && res.body.includes('cache')) {
    stressMetrics.cacheSyncErrors.add(1);
  }

  // Track metrics if successful
  if (res.status === 200) {
    trackResponseMetrics(res);
  }

  // Minimal sleep to maintain pressure
  sleep(0.1);
}

// ===== SCENARIO 2: CACHE STAMPEDE TEST =====

/**
 * Test cache stampede protection
 * All VUs request the same uncached query simultaneously
 */
export function stampedeTest() {
  const companyId = companies[0]; // All use same company
  const timestamp = Math.floor(Date.now() / 60000); // Changes every minute
  const question = `What was our SROI for timestamp ${timestamp}?`; // Unique per minute

  const payload = buildAskRequest(question, companyId);

  const startTime = Date.now();

  const res = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '15s',
    tags: {
      endpoint: 'nlq_ask',
      test_type: 'stampede',
    },
  });

  const duration = Date.now() - startTime;

  check(res, {
    'stampede status is 200': (r) => r.status === 200,
    'stampede response time < 15s': () => duration < 15000,
    'stampede has answer': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.answer && body.answer.summary;
      }
      return false;
    },
  });

  // Track if this was a cache hit (first request shouldn't be)
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    const cached = body.metadata.cached;

    console.log(`Stampede test: ${cached ? 'CACHE HIT' : 'CACHE MISS'} - ${duration}ms`);
  }
}

// ===== SCENARIO 3: RATE LIMIT TEST =====

/**
 * Test rate limiter behavior at boundaries
 */
export function rateLimitTest() {
  const companyId = companies[0]; // Use same company to hit rate limit

  const payload = buildAskRequest(
    `Test query ${Date.now()}`,
    companyId
  );

  const res = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'nlq_ask',
      test_type: 'rate_limit',
    },
  });

  if (res.status === 429) {
    stressMetrics.rateLimitHits.add(1);

    // Validate rate limit response
    check(res, {
      'rate limit has error message': (r) => {
        const body = JSON.parse(r.body);
        return body.error === 'Rate limit exceeded';
      },
      'rate limit has reset time': (r) => {
        const body = JSON.parse(r.body);
        return body.resetAt !== undefined;
      },
      'rate limit has remaining count': (r) => {
        const body = JSON.parse(r.body);
        return body.limits !== undefined;
      },
    });
  }

  // No sleep - we want to hit rate limits
}

// ===== LIFECYCLE HOOKS =====

/**
 * Setup - runs once before test
 */
export function setup() {
  console.log('========================================');
  console.log('NLQ STRESS TEST');
  console.log('========================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Max VUs: ${MAX_VUS}`);
  console.log('');
  console.log('This test will:');
  console.log('  1. Gradually increase load to find breaking point');
  console.log('  2. Test cache stampede protection');
  console.log('  3. Test rate limiter effectiveness');
  console.log('  4. Identify infrastructure bottlenecks');
  console.log('');
  console.log('Expected outcomes:');
  console.log('  - Rate limits should be hit');
  console.log('  - Some errors are expected at high load');
  console.log('  - Service should recover when load decreases');
  console.log('========================================\n');

  return {
    startTime: new Date().toISOString(),
    maxVUs: MAX_VUS,
  };
}

/**
 * Teardown - runs once after test
 */
export function teardown(data) {
  console.log('\n========================================');
  console.log('Stress Test Complete');
  console.log('========================================\n');
}

/**
 * Handle summary - detailed stress test report
 */
export function handleSummary(data) {
  console.log('\n========================================');
  console.log('STRESS TEST RESULTS');
  console.log('========================================\n');

  const metrics = data.metrics;

  // Overall statistics
  console.log('Overall Statistics:');
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const failedRequests = metrics.http_req_failed?.values?.count || 0;
  const failureRate = (failedRequests / totalRequests * 100);

  console.log(`  Total requests:        ${totalRequests}`);
  console.log(`  Failed requests:       ${failedRequests} (${failureRate.toFixed(2)}%)`);
  console.log(`  Max VUs reached:       ${data.metrics.vus_max?.values?.max || 0}`);

  // Latency under stress
  console.log('\nLatency Under Stress:');
  const p50 = metrics.http_req_duration?.values?.['p(50)'];
  const p95 = metrics.http_req_duration?.values?.['p(95)'];
  const p99 = metrics.http_req_duration?.values?.['p(99)'];
  const max = metrics.http_req_duration?.values?.max;

  console.log(`  p50:                   ${p50 ? p50.toFixed(2) + 'ms' : 'N/A'}`);
  console.log(`  p95:                   ${p95 ? p95.toFixed(2) + 'ms' : 'N/A'} ${p95 && p95 <= 5000 ? '✅' : '⚠️'}`);
  console.log(`  p99:                   ${p99 ? p99.toFixed(2) + 'ms' : 'N/A'}`);
  console.log(`  Max:                   ${max ? max.toFixed(2) + 'ms' : 'N/A'}`);

  // Error breakdown
  console.log('\nError Breakdown:');
  console.log(`  Connection errors:     ${metrics.stress_connection_errors?.values?.count || 0}`);
  console.log(`  Timeout errors:        ${metrics.stress_timeout_errors?.values?.count || 0}`);
  console.log(`  Server errors (5xx):   ${metrics.stress_server_errors?.values?.count || 0}`);
  console.log(`  Rate limit hits:       ${metrics.stress_rate_limit_hits?.values?.count || 0}`);
  console.log(`  DB pool exhaustion:    ${metrics.stress_db_pool_exhaustion?.values?.count || 0}`);
  console.log(`  Cache sync errors:     ${metrics.stress_cache_sync_errors?.values?.count || 0}`);

  // Breaking point analysis
  console.log('\nBreaking Point Analysis:');

  const breakingPoint = analyzeBreakingPoint(data);
  console.log(`  Estimated max VUs:     ${breakingPoint.maxVUs}`);
  console.log(`  Primary bottleneck:    ${breakingPoint.bottleneck}`);
  console.log(`  Max throughput:        ${breakingPoint.maxThroughput.toFixed(1)} req/s`);

  // Recommendations
  console.log('\nRecommendations:');
  const recommendations = generateRecommendations(breakingPoint, metrics);
  recommendations.forEach(rec => {
    console.log(`  - ${rec}`);
  });

  console.log('\n========================================\n');

  // Generate detailed report
  const report = generateStressReport(data, breakingPoint);

  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data),
    'nlq-stress-report.txt': report,
  };
}

/**
 * Analyze breaking point from test data
 */
function analyzeBreakingPoint(data) {
  const metrics = data.metrics;

  // Determine max sustainable VUs
  let maxVUs = 50; // Default conservative estimate
  let bottleneck = 'Unknown';
  let maxThroughput = 0;

  // Analyze error patterns
  const connectionErrors = metrics.stress_connection_errors?.values?.count || 0;
  const dbPoolErrors = metrics.stress_db_pool_exhaustion?.values?.count || 0;
  const cacheErrors = metrics.stress_cache_sync_errors?.values?.count || 0;
  const rateLimitHits = metrics.stress_rate_limit_hits?.values?.count || 0;

  // Determine bottleneck
  if (connectionErrors > 10) {
    bottleneck = 'Network/Connection Pool';
    maxVUs = 100;
  } else if (dbPoolErrors > 10) {
    bottleneck = 'Database Connection Pool';
    maxVUs = 150;
  } else if (cacheErrors > 10) {
    bottleneck = 'Redis/Cache';
    maxVUs = 200;
  } else if (rateLimitHits > 100) {
    bottleneck = 'Rate Limiter';
    maxVUs = Math.floor(rateLimitHits / 2);
  } else {
    bottleneck = 'None detected';
    maxVUs = MAX_VUS;
  }

  // Calculate max throughput
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const totalDuration = data.state.testRunDurationMs / 1000;
  maxThroughput = totalRequests / totalDuration;

  return {
    maxVUs,
    bottleneck,
    maxThroughput,
  };
}

/**
 * Generate recommendations based on bottlenecks
 */
function generateRecommendations(breakingPoint, metrics) {
  const recommendations = [];

  switch (breakingPoint.bottleneck) {
    case 'Network/Connection Pool':
      recommendations.push('Increase HTTP connection pool size');
      recommendations.push('Enable HTTP keep-alive');
      recommendations.push('Add load balancer with more backend instances');
      break;

    case 'Database Connection Pool':
      recommendations.push('Increase PostgreSQL max_connections');
      recommendations.push('Optimize slow queries');
      recommendations.push('Add read replicas for query distribution');
      recommendations.push('Enable connection pooling (PgBouncer)');
      break;

    case 'Redis/Cache':
      recommendations.push('Increase Redis max connections');
      recommendations.push('Add Redis cluster nodes');
      recommendations.push('Optimize cache key size');
      recommendations.push('Review cache eviction policy');
      break;

    case 'Rate Limiter':
      recommendations.push('Review rate limit quotas');
      recommendations.push('Implement tiered rate limits by plan');
      recommendations.push('Add rate limit headers to help clients back off');
      break;

    default:
      recommendations.push('System handled load well');
      recommendations.push('Consider testing with higher VU count');
  }

  // Check latency
  const p95 = metrics.http_req_duration?.values?.['p(95)'];
  if (p95 && p95 > 2500) {
    recommendations.push('p95 latency exceeds target - optimize query execution');
  }

  return recommendations;
}

/**
 * Generate detailed stress test report
 */
function generateStressReport(data, breakingPoint) {
  const lines = [];

  lines.push('========================================');
  lines.push('NLQ STRESS TEST REPORT');
  lines.push('========================================');
  lines.push('');
  lines.push(`Test Date: ${new Date().toISOString()}`);
  lines.push(`Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes`);
  lines.push('');

  lines.push('BREAKING POINT ANALYSIS:');
  lines.push(`  Max sustainable VUs:  ${breakingPoint.maxVUs}`);
  lines.push(`  Primary bottleneck:   ${breakingPoint.bottleneck}`);
  lines.push(`  Max throughput:       ${breakingPoint.maxThroughput.toFixed(1)} req/s`);
  lines.push('');

  lines.push('ERROR SUMMARY:');
  const metrics = data.metrics;
  lines.push(`  Total requests:       ${metrics.http_reqs?.values?.count || 0}`);
  lines.push(`  Failed requests:      ${metrics.http_req_failed?.values?.count || 0}`);
  lines.push(`  Connection errors:    ${metrics.stress_connection_errors?.values?.count || 0}`);
  lines.push(`  Timeout errors:       ${metrics.stress_timeout_errors?.values?.count || 0}`);
  lines.push(`  Server errors:        ${metrics.stress_server_errors?.values?.count || 0}`);
  lines.push(`  Rate limit hits:      ${metrics.stress_rate_limit_hits?.values?.count || 0}`);
  lines.push(`  DB pool exhaustion:   ${metrics.stress_db_pool_exhaustion?.values?.count || 0}`);
  lines.push('');

  lines.push('RECOMMENDATIONS:');
  const recommendations = generateRecommendations(breakingPoint, metrics);
  recommendations.forEach(rec => {
    lines.push(`  - ${rec}`);
  });

  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}
