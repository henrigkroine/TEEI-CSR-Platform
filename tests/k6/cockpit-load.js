/**
 * k6 Load Test - Corporate Cockpit
 *
 * Tests the performance of the analytics service endpoints under load.
 * Target: p75 < 500ms for all cockpit queries
 *
 * Run: k6 run tests/k6/cockpit-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const metricsLatency = new Trend('metrics_latency');
const sroiLatency = new Trend('sroi_latency');
const visLatency = new Trend('vis_latency');
const evidenceLatency = new Trend('evidence_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 users
    { duration: '1m', target: 50 },   // Ramp-up to 50 users
    { duration: '2m', target: 100 },  // Ramp-up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '1m', target: 50 },   // Ramp-down to 50 users
    { duration: '30s', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(75)<500', 'p(95)<1000', 'p(99)<2000'], // 75% < 500ms, 95% < 1s, 99% < 2s
    http_req_failed: ['rate<0.05'], // Error rate < 5%
    errors: ['rate<0.05'], // Custom error rate < 5%
    cache_hits: ['rate>0.70'], // Cache hit rate > 70%
    metrics_latency: ['p(75)<500'], // Metrics endpoint p75 < 500ms
    sroi_latency: ['p(75)<500'], // SROI endpoint p75 < 500ms
    vis_latency: ['p(75)<500'], // VIS endpoint p75 < 500ms
    evidence_latency: ['p(75)<500'], // Evidence endpoint p75 < 500ms
  },
};

// Base URL for analytics service
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3007';

// Test data - sample company and metric IDs
const COMPANIES = [
  'c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o', // Acme Corporation
  'd2b3c4d5-e6f7-8g9h-0i1j-2k3l4m5n6o7p', // TechCo Inc
];

const PERIODS = ['2024-11', '2024-10', '2024-09', '2024-Q3', '2024-Q2'];
const METRIC_IDS = [
  'm1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o',
  'm2b3c4d5-e6f7-8g9h-0i1j-2k3l4m5n6o7p',
];

/**
 * Main test scenario - simulates real user behavior
 */
export default function () {
  // Randomly select test data
  const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  const period = PERIODS[Math.floor(Math.random() * PERIODS.length)];
  const metricId = METRIC_IDS[Math.floor(Math.random() * METRIC_IDS.length)];

  // 1. Get company metrics for period (most common query)
  testMetricsEndpoint(company, period);

  sleep(1); // Think time

  // 2. Get SROI report
  testSROIEndpoint(company);

  sleep(1);

  // 3. Get VIS report
  testVISEndpoint(company);

  sleep(1);

  // 4. Get evidence for metric (when user clicks "View Evidence")
  testEvidenceEndpoint(metricId);

  sleep(2); // Think time between sessions
}

/**
 * Test GET /metrics/company/:companyId/period/:period
 */
function testMetricsEndpoint(companyId, period) {
  const url = `${BASE_URL}/metrics/company/${companyId}/period/${period}`;
  const startTime = new Date();

  const res = http.get(url, {
    headers: {
      'Accept': 'application/json',
    },
    tags: { name: 'GetMetrics' },
  });

  const duration = new Date() - startTime;
  metricsLatency.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has metrics data': (r) => {
      const body = JSON.parse(r.body);
      return body && body.companyId === companyId;
    },
    'response time < 500ms': () => duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  // Check for cache hit
  if (res.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }
}

/**
 * Test GET /metrics/sroi/:companyId
 */
function testSROIEndpoint(companyId) {
  const url = `${BASE_URL}/metrics/sroi/${companyId}`;
  const startTime = new Date();

  const res = http.get(url, {
    headers: {
      'Accept': 'application/json',
    },
    tags: { name: 'GetSROI' },
  });

  const duration = new Date() - startTime;
  sroiLatency.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has SROI ratio': (r) => {
      const body = JSON.parse(r.body);
      return body && body.sroiRatio !== undefined;
    },
    'response time < 500ms': () => duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  if (res.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }
}

/**
 * Test GET /metrics/vis/:companyId
 */
function testVISEndpoint(companyId) {
  const url = `${BASE_URL}/metrics/vis/${companyId}`;
  const startTime = new Date();

  const res = http.get(url, {
    headers: {
      'Accept': 'application/json',
    },
    tags: { name: 'GetVIS' },
  });

  const duration = new Date() - startTime;
  visLatency.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has VIS score': (r) => {
      const body = JSON.parse(r.body);
      return body && body.visScore !== undefined;
    },
    'response time < 500ms': () => duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  if (res.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }
}

/**
 * Test GET /metrics/:metricId/evidence
 */
function testEvidenceEndpoint(metricId) {
  const url = `${BASE_URL}/metrics/${metricId}/evidence`;
  const startTime = new Date();

  const res = http.get(url, {
    headers: {
      'Accept': 'application/json',
    },
    tags: { name: 'GetEvidence' },
  });

  const duration = new Date() - startTime;
  evidenceLatency.add(duration);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has evidence snippets': (r) => {
      const body = JSON.parse(r.body);
      return body && Array.isArray(body.evidence);
    },
    'response time < 500ms': () => duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  if (res.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  } else {
    cacheHitRate.add(0);
  }
}

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('Starting cockpit load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Performance budget: p75 < 500ms`);
  console.log(`Test companies: ${COMPANIES.length}`);
  console.log(`Test periods: ${PERIODS.length}`);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('Load test complete!');
}

/**
 * Handle summary - custom report at the end
 */
export function handleSummary(data) {
  const metricsP75 = data.metrics.metrics_latency.values['p(75)'];
  const sroiP75 = data.metrics.sroi_latency.values['p(75)'];
  const visP75 = data.metrics.vis_latency.values['p(75)'];
  const evidenceP75 = data.metrics.evidence_latency.values['p(75)'];
  const cacheHitRate = data.metrics.cache_hits.values.rate;

  console.log('\n========================================');
  console.log('COCKPIT PERFORMANCE TEST RESULTS');
  console.log('========================================\n');
  console.log(`Metrics endpoint p75:   ${metricsP75.toFixed(2)}ms ${metricsP75 < 500 ? '✅' : '❌'}`);
  console.log(`SROI endpoint p75:      ${sroiP75.toFixed(2)}ms ${sroiP75 < 500 ? '✅' : '❌'}`);
  console.log(`VIS endpoint p75:       ${visP75.toFixed(2)}ms ${visP75 < 500 ? '✅' : '❌'}`);
  console.log(`Evidence endpoint p75:  ${evidenceP75.toFixed(2)}ms ${evidenceP75 < 500 ? '✅' : '❌'}`);
  console.log(`\nCache hit rate:         ${(cacheHitRate * 100).toFixed(1)}% ${cacheHitRate > 0.70 ? '✅' : '❌'}`);
  console.log(`\nOverall:                ${
    metricsP75 < 500 && sroiP75 < 500 && visP75 < 500 && evidenceP75 < 500 && cacheHitRate > 0.70
      ? '✅ PASS'
      : '❌ FAIL'
  }`);
  console.log('========================================\n');

  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data),
  };
}
