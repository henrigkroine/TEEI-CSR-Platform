/**
 * k6 Load Test for NLQ Service - k6-perf-author
 * Tests performance targets: avg plan ≤350ms, p95 e2e ≤2.5s
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const planTimeMetric = new Trend('nlq_plan_time_ms');
const e2eTimeMetric = new Trend('nlq_e2e_time_ms');
const errorRate = new Rate('nlq_errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Hold at 50 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    'nlq_plan_time_ms': ['avg<350', 'p(95)<500'], // Plan time: avg ≤350ms, p95 <500ms
    'nlq_e2e_time_ms': ['p(95)<2500', 'p(99)<5000'], // E2E: p95 ≤2.5s, p99 <5s
    'nlq_errors': ['rate<0.05'], // Error rate < 5%
    'http_req_duration': ['p(95)<3000'], // Overall HTTP p95 <3s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3015';

// Sample queries
const sampleQueries = [
  'How many volunteer hours in the last quarter?',
  'Show me donation amounts by region for 2024',
  'What is the average SROI ratio this year?',
  'Count unique participants by activity type',
  'Show me carbon offset trends by month',
];

export default function () {
  // Select random query
  const query = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
  const tenantId = `tenant_${__VU}`;

  // Test 1: NLQ Query Execution
  const payload = JSON.stringify({
    query,
    tenantId,
    includeEvidence: true,
    includeSql: false,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/v1/insights/nlq/query`, payload, params);
  const endTime = Date.now();

  const e2eTime = endTime - startTime;
  e2eTimeMetric.add(e2eTime);

  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has success field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
    'has metadata': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.metadata !== undefined;
      } catch {
        return false;
      }
    },
    'has citations': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.citations && body.citations.length >= 1;
      } catch {
        return false;
      }
    },
    'meets standards': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.metadata.meetsStandards === true;
      } catch {
        return false;
      }
    },
  });

  // Record error if failed
  errorRate.add(!success);

  // Extract plan time from metadata
  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      if (body.metadata && body.metadata.planTimeMs) {
        planTimeMetric.add(body.metadata.planTimeMs);
      }

      // Log if exceeds targets
      if (body.metadata.planTimeMs > 350) {
        console.warn(`Plan time exceeded 350ms: ${body.metadata.planTimeMs}ms`);
      }

      if (body.metadata.totalTimeMs > 2500) {
        console.warn(`Total time exceeded 2.5s: ${body.metadata.totalTimeMs}ms`);
      }
    } catch (err) {
      console.error('Failed to parse response:', err);
    }
  }

  // Think time
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

/**
 * Scenario 2: Spike Test
 */
export function spikeTest() {
  const payload = JSON.stringify({
    query: 'Show me volunteer hours by region',
    tenantId: `tenant_${__VU}`,
    includeEvidence: true,
  });

  const res = http.post(`${BASE_URL}/v1/insights/nlq/query`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'spike test - status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}

/**
 * Scenario 3: Stress Test - Heavy Queries
 */
export function stressTest() {
  const heavyQuery = 'Show me volunteer hours, donations, SROI, carbon offset by region, department, and month for the last 2 years';

  const payload = JSON.stringify({
    query: heavyQuery,
    tenantId: `tenant_${__VU}`,
    includeEvidence: true,
  });

  const res = http.post(`${BASE_URL}/v1/insights/nlq/query`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  });

  check(res, {
    'stress test - completes within 10s': (r) => r.timings.duration < 10000,
    'stress test - does not error': (r) => r.status < 500,
  });
}
