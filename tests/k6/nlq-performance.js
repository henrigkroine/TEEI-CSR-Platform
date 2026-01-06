/**
 * k6 Performance Test - NLQ Service
 *
 * Tests the Natural Language Query service under realistic load conditions.
 *
 * Performance Targets:
 * - p95 latency ≤ 2.5s for all NLQ queries
 * - Cache hit rate ≥ 80% for canonical questions
 * - Error rate < 1%
 * - Safety check failures logged and tracked
 *
 * Scenarios:
 * 1. Canonical questions (high cache hit rate expected)
 * 2. Autocomplete queries (fast responses)
 * 3. History pagination (consistent performance)
 * 4. Mixed load (realistic user behavior)
 *
 * Run: k6 run tests/k6/nlq-performance.js
 * Run with cloud output: k6 run --out cloud tests/k6/nlq-performance.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import {
  nlqMetrics,
  COMPANIES,
  CANONICAL_QUESTIONS,
  AUTOCOMPLETE_QUERIES,
  randomChoice,
  generateVariedQuestion,
  validateAskResponse,
  trackResponseMetrics,
  buildAskRequest,
  buildHistoryParams,
  printTestSummary,
} from './nlq-helpers.js';

// ===== CONFIGURATION =====

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3008/v1/nlq';

// Shared test data (loaded once and shared across VUs)
const canonicalQuestions = new SharedArray('canonical', () => CANONICAL_QUESTIONS);
const companies = new SharedArray('companies', () => COMPANIES);

// ===== TEST OPTIONS =====

export const options = {
  scenarios: {
    // Scenario 1: Canonical questions with high cache hit rate
    canonical_questions: {
      executor: 'ramping-vus',
      exec: 'testCanonicalQuestions',
      stages: [
        { duration: '30s', target: 10 },  // Warm up
        { duration: '30s', target: 50 },  // Ramp to 50 users
        { duration: '2m', target: 50 },   // Sustained load
        { duration: '10s', target: 200 }, // Spike test
        { duration: '30s', target: 200 }, // Hold spike
        { duration: '20s', target: 0 },   // Ramp down
      ],
      gracefulStop: '30s',
      tags: { scenario: 'canonical' },
    },

    // Scenario 2: Autocomplete queries (lightweight, fast)
    autocomplete: {
      executor: 'constant-vus',
      exec: 'testAutocomplete',
      vus: 20,
      duration: '1m',
      startTime: '30s', // Start after canonical warm-up
      gracefulStop: '10s',
      tags: { scenario: 'autocomplete' },
    },

    // Scenario 3: History pagination
    history_pagination: {
      executor: 'per-vu-iterations',
      exec: 'testHistoryPagination',
      vus: 10,
      iterations: 5,
      startTime: '1m',
      maxDuration: '2m',
      gracefulStop: '10s',
      tags: { scenario: 'history' },
    },

    // Scenario 4: Query status polling (simulates frontend polling)
    query_status_polling: {
      executor: 'constant-arrival-rate',
      exec: 'testQueryStatus',
      rate: 10, // 10 requests per second
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 5,
      maxVUs: 20,
      startTime: '1m30s',
      gracefulStop: '10s',
      tags: { scenario: 'polling' },
    },
  },

  // Global thresholds
  thresholds: {
    // Primary SLA: p95 ≤ 2.5s
    'http_req_duration{endpoint:nlq_ask}': ['p(95)<2500'],

    // Cache performance: cached queries should be fast
    'nlq_cached_response_latency': ['p(95)<200'],

    // Uncached queries can be slower but still reasonable
    'nlq_uncached_response_latency': ['p(95)<3000'],

    // Error rate < 1%
    'http_req_failed': ['rate<0.01'],
    'nlq_errors': ['rate<0.01'],

    // Cache hit rate ≥ 80% for canonical questions
    'nlq_cache_hit_rate': ['rate>0.80'],

    // Intent classification should be fast
    'nlq_intent_classification_time': ['p(95)<1000'],

    // Query execution should be reasonable
    'nlq_query_execution_time': ['p(95)<2000'],

    // Answer quality
    'nlq_answer_confidence': ['avg>70'], // Average confidence > 70%

    // Safety checks should rarely fail
    'nlq_safety_check_failures': ['rate<0.05'],

    // Rate limits should not be hit frequently
    'nlq_rate_limit_rejections': ['count<10'],
  },
};

// ===== SCENARIO 1: CANONICAL QUESTIONS =====

/**
 * Test canonical questions with variations
 * These should have high cache hit rates after warm-up
 */
export function testCanonicalQuestions() {
  const companyId = randomChoice(companies);
  const baseQuestion = randomChoice(canonicalQuestions);

  // Add variation to test cache normalization
  const question = generateVariedQuestion(baseQuestion);

  const payload = buildAskRequest(question, companyId);

  const res = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'nlq_ask',
      cached: 'unknown', // Will be determined from response
    },
  });

  // Validate response
  const success = check(res, validateAskResponse(res));

  // Track custom metrics
  trackResponseMetrics(res);

  // Record latency
  nlqMetrics.askLatency.add(res.timings.duration);

  // Think time (users take time to read results)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// ===== SCENARIO 2: AUTOCOMPLETE =====

/**
 * Test autocomplete/suggestion functionality
 * These should be very fast as they don't execute full queries
 */
export function testAutocomplete() {
  const companyId = randomChoice(companies);
  const partialQuery = randomChoice(AUTOCOMPLETE_QUERIES);

  // For now, we test the ask endpoint with short queries
  // In production, there might be a dedicated autocomplete endpoint
  const payload = buildAskRequest(partialQuery, companyId);

  const res = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'nlq_autocomplete',
    },
  });

  // For autocomplete, we expect either success or validation error (too short)
  check(res, {
    'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });

  if (res.status === 200) {
    trackResponseMetrics(res);
  }

  // Very short think time for autocomplete
  sleep(0.5);
}

// ===== SCENARIO 3: HISTORY PAGINATION =====

/**
 * Test query history pagination
 * Simulates users browsing their query history
 */
export function testHistoryPagination() {
  const companyId = randomChoice(companies);

  // Fetch multiple pages
  for (let page = 0; page < 3; page++) {
    const offset = page * 20;
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
        page: page.toString(),
      },
    });

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'has queries array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.queries);
      },
      'has pagination': (r) => {
        const body = JSON.parse(r.body);
        return body.pagination && typeof body.pagination.total === 'number';
      },
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    nlqMetrics.historyLatency.add(res.timings.duration);

    if (!success) {
      nlqMetrics.errorRate.add(1);
    } else {
      nlqMetrics.errorRate.add(0);
    }

    // Think time between pages
    sleep(1);
  }
}

// ===== SCENARIO 4: QUERY STATUS POLLING =====

/**
 * Test query status endpoint
 * Simulates frontend polling for query results
 */
export function testQueryStatus() {
  // First, create a query
  const companyId = randomChoice(companies);
  const question = randomChoice(canonicalQuestions);
  const payload = buildAskRequest(question, companyId);

  const askRes = http.post(`${BASE_URL}/ask`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: 'nlq_ask',
    },
  });

  if (askRes.status === 200) {
    const body = JSON.parse(askRes.body);
    const queryId = body.queryId;

    // Poll for status (simulating async processing)
    const statusRes = http.get(`${BASE_URL}/queries/${queryId}`, {
      headers: {
        'Accept': 'application/json',
      },
      tags: {
        endpoint: 'nlq_query_status',
      },
    });

    const success = check(statusRes, {
      'status is 200': (r) => r.status === 200,
      'has query details': (r) => {
        const body = JSON.parse(r.body);
        return body.queryId === queryId;
      },
      'has execution status': (r) => {
        const body = JSON.parse(r.body);
        return body.execution && body.execution.status;
      },
      'response time < 200ms': (r) => r.timings.duration < 200,
    });

    nlqMetrics.queryStatusLatency.add(statusRes.timings.duration);

    if (!success) {
      nlqMetrics.errorRate.add(1);
    } else {
      nlqMetrics.errorRate.add(0);
    }
  }
}

// ===== LIFECYCLE HOOKS =====

/**
 * Setup - runs once before test
 */
export function setup() {
  console.log('========================================');
  console.log('NLQ PERFORMANCE TEST');
  console.log('========================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Performance target: p95 ≤ 2.5s`);
  console.log(`Cache hit rate target: ≥ 80%`);
  console.log(`Test companies: ${companies.length}`);
  console.log(`Canonical questions: ${canonicalQuestions.length}`);
  console.log('========================================\n');

  // Verify service is available
  const healthCheck = http.get(`${BASE_URL.replace('/v1/nlq', '')}/health`, {
    timeout: '10s',
  });

  if (healthCheck.status !== 200) {
    console.error('❌ Service health check failed!');
    console.error(`Status: ${healthCheck.status}`);
    throw new Error('Service unavailable');
  }

  console.log('✅ Service health check passed\n');

  return {
    startTime: new Date().toISOString(),
  };
}

/**
 * Teardown - runs once after test
 */
export function teardown(data) {
  console.log('\n========================================');
  console.log('Test completed');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('========================================\n');
}

/**
 * Handle summary - custom report at the end
 */
export function handleSummary(data) {
  printTestSummary('NLQ Performance Test Results', data);

  // Additional detailed metrics
  console.log('Detailed Metrics:\n');

  const metrics = data.metrics;

  // Cache performance breakdown
  console.log('Cache Performance:');
  if (metrics.nlq_cached_response_latency) {
    console.log(`  Cached p50:    ${metrics.nlq_cached_response_latency.values['p(50)'].toFixed(2)}ms`);
    console.log(`  Cached p95:    ${metrics.nlq_cached_response_latency.values['p(95)'].toFixed(2)}ms`);
    console.log(`  Cached p99:    ${metrics.nlq_cached_response_latency.values['p(99)'].toFixed(2)}ms`);
  }

  if (metrics.nlq_uncached_response_latency) {
    console.log(`  Uncached p50:  ${metrics.nlq_uncached_response_latency.values['p(50)'].toFixed(2)}ms`);
    console.log(`  Uncached p95:  ${metrics.nlq_uncached_response_latency.values['p(95)'].toFixed(2)}ms`);
    console.log(`  Uncached p99:  ${metrics.nlq_uncached_response_latency.values['p(99)'].toFixed(2)}ms`);
  }

  // Intent and execution timing
  console.log('\nTiming Breakdown:');
  if (metrics.nlq_intent_classification_time) {
    console.log(`  Intent classification p95: ${metrics.nlq_intent_classification_time.values['p(95)'].toFixed(2)}ms`);
  }
  if (metrics.nlq_query_execution_time) {
    console.log(`  Query execution p95:       ${metrics.nlq_query_execution_time.values['p(95)'].toFixed(2)}ms`);
  }

  // Answer quality
  console.log('\nAnswer Quality:');
  if (metrics.nlq_answer_confidence) {
    console.log(`  Avg confidence:  ${metrics.nlq_answer_confidence.values.avg.toFixed(1)}%`);
    console.log(`  Min confidence:  ${metrics.nlq_answer_confidence.values.min.toFixed(1)}%`);
    console.log(`  Max confidence:  ${metrics.nlq_answer_confidence.values.max.toFixed(1)}%`);
  }

  if (metrics.nlq_intent_confidence) {
    console.log(`  Avg intent conf: ${metrics.nlq_intent_confidence.values.avg.toFixed(1)}%`);
  }

  // Cost tracking
  console.log('\nCost Metrics:');
  if (metrics.nlq_tokens_used) {
    console.log(`  Avg tokens:      ${metrics.nlq_tokens_used.values.avg.toFixed(0)}`);
    console.log(`  Total tokens:    ${(metrics.nlq_tokens_used.values.count * metrics.nlq_tokens_used.values.avg).toFixed(0)}`);
  }

  if (metrics.nlq_estimated_cost_usd) {
    const avgCostMicro = metrics.nlq_estimated_cost_usd.values.avg;
    const totalCostMicro = metrics.nlq_estimated_cost_usd.values.count * avgCostMicro;
    console.log(`  Avg cost/query:  $${(avgCostMicro / 1000000).toFixed(6)}`);
    console.log(`  Total cost:      $${(totalCostMicro / 1000000).toFixed(4)}`);
  }

  // Result sizes
  console.log('\nResult Sizes:');
  if (metrics.nlq_result_row_count) {
    console.log(`  Avg rows:        ${metrics.nlq_result_row_count.values.avg.toFixed(0)}`);
    console.log(`  Max rows:        ${metrics.nlq_result_row_count.values.max.toFixed(0)}`);
  }

  // Endpoint-specific performance
  console.log('\nEndpoint Performance:');
  if (metrics.nlq_ask_latency) {
    console.log(`  /ask p95:        ${metrics.nlq_ask_latency.values['p(95)'].toFixed(2)}ms`);
  }
  if (metrics.nlq_history_latency) {
    console.log(`  /history p95:    ${metrics.nlq_history_latency.values['p(95)'].toFixed(2)}ms`);
  }
  if (metrics.nlq_query_status_latency) {
    console.log(`  /queries p95:    ${metrics.nlq_query_status_latency.values['p(95)'].toFixed(2)}ms`);
  }

  console.log('\n========================================\n');

  // Return results for file output
  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data),
    'nlq-performance-report.txt': generateTextReport(data),
  };
}

/**
 * Generate human-readable text report
 */
function generateTextReport(data) {
  const lines = [];

  lines.push('========================================');
  lines.push('NLQ PERFORMANCE TEST REPORT');
  lines.push('========================================');
  lines.push('');
  lines.push(`Test Date: ${new Date().toISOString()}`);
  lines.push(`Duration: ${data.state.testRunDurationMs / 1000}s`);
  lines.push('');

  lines.push('PERFORMANCE TARGETS:');
  const askP95 = data.metrics.nlq_ask_latency?.values?.['p(95)'];
  const cacheHitRate = data.metrics.nlq_cache_hit_rate?.values?.rate;
  const errorRate = data.metrics.nlq_errors?.values?.rate;

  lines.push(`  ✓ p95 ≤ 2.5s:           ${askP95 ? askP95.toFixed(2) + 'ms' : 'N/A'} ${askP95 && askP95 <= 2500 ? 'PASS' : 'FAIL'}`);
  lines.push(`  ✓ Cache hit rate ≥ 80%: ${cacheHitRate ? (cacheHitRate * 100).toFixed(1) + '%' : 'N/A'} ${cacheHitRate && cacheHitRate >= 0.80 ? 'PASS' : 'FAIL'}`);
  lines.push(`  ✓ Error rate < 1%:      ${errorRate ? (errorRate * 100).toFixed(2) + '%' : 'N/A'} ${errorRate && errorRate < 0.01 ? 'PASS' : 'FAIL'}`);
  lines.push('');

  lines.push('RECOMMENDATIONS:');
  if (askP95 > 2500) {
    lines.push('  - p95 latency exceeds target. Consider:');
    lines.push('    * Optimizing database queries');
    lines.push('    * Increasing cache TTL');
    lines.push('    * Adding more Redis replicas');
    lines.push('    * Optimizing LLM API calls');
  }

  if (cacheHitRate < 0.80) {
    lines.push('  - Cache hit rate below target. Consider:');
    lines.push('    * Improving query normalization');
    lines.push('    * Increasing cache TTL');
    lines.push('    * Pre-warming cache with common queries');
  }

  if (errorRate > 0.01) {
    lines.push('  - Error rate above threshold. Investigate:');
    lines.push('    * Database connection issues');
    lines.push('    * LLM API failures');
    lines.push('    * Rate limiting configuration');
  }

  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}
