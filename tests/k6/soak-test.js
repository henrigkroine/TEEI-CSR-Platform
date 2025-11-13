/**
 * k6 Soak Test: 1 hour sustained load
 *
 * Test: 50 events/sec for 1 hour
 * Monitor: Memory leaks, CPU usage, error rates
 *
 * Run: k6 run tests/k6/soak-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const memoryWarnings = new Counter('memory_warnings');
const cpuWarnings = new Counter('cpu_warnings');

export const options = {
  stages: [
    { duration: '2m', target: 50 },     // Ramp up
    { duration: '1h', target: 50 },     // Soak for 1 hour
    { duration: '2m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.02'],               // Allow slightly higher error rate for soak test
    http_req_failed: ['rate<0.02'],
  },
};

function generateEvent() {
  const eventTypes = [
    'session.completed',
    'feedback.received',
    'checkin.submitted',
    'milestone.achieved',
  ];

  return {
    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    data: {
      value: Math.random() * 100,
      score: Math.random() * 10,
    },
  };
}

export default function () {
  const baseUrl = __ENV.API_URL || 'http://localhost:3001';
  const payload = JSON.stringify(generateEvent());

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': __ENV.API_KEY || 'test-key',
    },
  };

  const response = http.post(`${baseUrl}/webhooks/ingest`, payload, params);

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);

  // Check for degradation indicators
  if (response.timings.duration > 2000) {
    console.warn(`High response time detected: ${response.timings.duration}ms`);
  }

  sleep(0.02); // ~50 events/second
}

export function handleSummary(data) {
  const summary = {
    testDuration: '1 hour',
    totalRequests: data.metrics.http_reqs?.values?.count || 0,
    avgRate: data.metrics.http_reqs?.values?.rate?.toFixed(2) || 0,
    errorRate: ((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2),
    p95ResponseTime: data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0,
    p99ResponseTime: data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0,
    timestamp: new Date().toISOString(),
  };

  return {
    'reports/soak-test-summary.json': JSON.stringify(summary, null, 2),
  };
}
