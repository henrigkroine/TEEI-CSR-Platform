/**
 * k6 Load Test: Webhook Ingestion
 *
 * Test: 1000 req/sec sustained for 5 minutes
 * Target: p95 < 500ms, error rate < 1%
 *
 * Run: k6 run tests/k6/ingestion-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const ingestionDuration = new Trend('ingestion_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 200 },   // Ramp up to 200 RPS
    { duration: '1m', target: 500 },    // Ramp up to 500 RPS
    { duration: '1m', target: 1000 },   // Ramp up to 1000 RPS
    { duration: '5m', target: 1000 },   // Sustain 1000 RPS for 5 minutes
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests should be below 500ms
    errors: ['rate<0.01'],               // Error rate should be below 1%
    http_req_failed: ['rate<0.01'],     // Request failure rate should be below 1%
  },
};

// Test data generator
function generateWebhookPayload() {
  return {
    type: 'session.completed',
    sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: `user-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toISOString(),
    data: {
      duration: Math.floor(Math.random() * 3600),
      outcome: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
      score: Math.random() * 10,
      metadata: {
        source: 'load-test',
        program: 'buddy',
      },
    },
  };
}

export default function () {
  const baseUrl = __ENV.API_URL || 'http://localhost:3001';
  const payload = JSON.stringify(generateWebhookPayload());

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': __ENV.API_KEY || 'test-key',
    },
    tags: { name: 'WebhookIngestion' },
  };

  // Send webhook
  const startTime = Date.now();
  const response = http.post(`${baseUrl}/webhooks/ingest`, payload, params);
  const duration = Date.now() - startTime;

  // Record metrics
  ingestionDuration.add(duration);

  // Validate response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
    'has success field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Small delay to simulate realistic traffic
  sleep(0.01);
}

// Summary handler
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'reports/ingestion-load-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const summary = [];
  summary.push(`\n${'='.repeat(80)}`);
  summary.push(`Ingestion Load Test Summary`);
  summary.push(`${'='.repeat(80)}\n`);

  const metrics = data.metrics;

  summary.push(`Total Requests: ${metrics.http_reqs?.values?.count || 0}`);
  summary.push(`Request Rate: ${metrics.http_reqs?.values?.rate?.toFixed(2) || 0} req/s`);
  summary.push(`Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%`);
  summary.push(`\nResponse Times:`);
  summary.push(`  p50: ${metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 0}ms`);
  summary.push(`  p75: ${metrics.http_req_duration?.values?.['p(75)']?.toFixed(2) || 0}ms`);
  summary.push(`  p95: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms`);
  summary.push(`  p99: ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms`);

  summary.push(`\n${'='.repeat(80)}\n`);

  return summary.join('\n');
}
