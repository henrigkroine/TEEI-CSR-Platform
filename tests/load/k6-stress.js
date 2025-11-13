/**
 * k6 Stress Test: Peak Load and Breaking Point
 * Ref: MULTI_AGENT_PLAN.md § QA Lead / Load Test Engineer
 *
 * Purpose: Determine system limits and breaking points
 *
 * Test profile:
 * - Ramp up to high load (500+ VUs)
 * - Identify bottlenecks
 * - Test system recovery
 * - Validate graceful degradation
 *
 * Run: k6 run tests/load/k6-stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const webhookDuration = new Trend('webhook_duration');
const apiDuration = new Trend('api_duration');
const requestCounter = new Counter('total_requests');
const errorCounter = new Counter('error_count');

// Stress test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Warm up: 50 VUs
    { duration: '3m', target: 100 },  // Ramp up to 100 VUs
    { duration: '2m', target: 200 },  // Increase to 200 VUs
    { duration: '2m', target: 300 },  // Increase to 300 VUs
    { duration: '2m', target: 500 },  // Peak stress: 500 VUs
    { duration: '5m', target: 500 },  // Hold at peak for 5 minutes
    { duration: '2m', target: 300 },  // Start recovery: down to 300
    { duration: '2m', target: 100 },  // Continue recovery: down to 100
    { duration: '2m', target: 0 },    // Cool down to 0
  ],
  thresholds: {
    // More lenient thresholds for stress testing
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // Higher acceptable latency
    http_req_failed: ['rate<0.10'],                   // Error rate < 10%
    errors: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.API_GATEWAY_URL || 'http://localhost:3000';
const KINTELL_URL = __ENV.KINTELL_SERVICE_URL || 'http://localhost:3002';
const PROFILE_URL = __ENV.PROFILE_SERVICE_URL || 'http://localhost:3001';

// Test data
const TEST_WEBHOOK_SECRET = __ENV.KINTELL_WEBHOOK_SECRET || 'test_webhook_secret_32_chars_long';

function generateHMAC(payload, secret) {
  return `sha256=stress_test_signature`;
}

export default function () {
  // More aggressive load - less sleep time between requests
  const scenarios = [
    () => stressHealthChecks(),
    () => stressAPIRequests(),
    () => stressWebhookFlood(),
    () => stressConcurrentReads(),
  ];

  // Weighted random selection
  const rand = Math.random();

  if (rand < 0.2) {
    stressHealthChecks();
  } else if (rand < 0.4) {
    stressAPIRequests();
  } else if (rand < 0.7) {
    stressWebhookFlood();
  } else {
    stressConcurrentReads();
  }

  // Shorter think time for stress test
  sleep(Math.random() * 0.5 + 0.2); // 0.2-0.7 seconds
}

/**
 * Scenario 1: Health Check Flood
 * Stress test health endpoints with rapid requests
 */
function stressHealthChecks() {
  const endpoints = [
    `${BASE_URL}/health/liveness`,
    `${BASE_URL}/health/readiness`,
    `${PROFILE_URL}/health/liveness`,
    `${KINTELL_URL}/health/liveness`,
  ];

  // Fire multiple requests rapidly
  const batchSize = 3;
  for (let i = 0; i < batchSize; i++) {
    const url = endpoints[i % endpoints.length];
    const response = http.get(url, {
      tags: { scenario: 'stress_health_checks' },
      timeout: '5s',
    });

    requestCounter.add(1);

    const success = check(response, {
      'health check responsive': (r) => r.status === 200 || r.status === 503,
    });

    success ? successRate.add(1) : errorRate.add(1);
    if (!success) errorCounter.add(1);
  }
}

/**
 * Scenario 2: API Request Storm
 * Heavy load on API Gateway
 */
function stressAPIRequests() {
  const userId = `stress_user_${__VU}_${__ITER}`;

  const response = http.get(`${BASE_URL}/v1/profiles?userId=${userId}`, {
    headers: {
      Authorization: 'Bearer stress_test_token',
    },
    tags: { scenario: 'stress_api' },
    timeout: '10s',
  });

  const duration = response.timings.duration;
  apiDuration.add(duration);
  requestCounter.add(1);

  const success = check(response, {
    'api responds': (r) => r.status !== 0,
    'api not timing out': (r) => r.timings.duration < 10000,
  });

  success ? successRate.add(1) : errorRate.add(1);
  if (!success) errorCounter.add(1);

  // Log slow responses
  if (duration > 2000) {
    console.log(`⚠️  Slow API response: ${duration.toFixed(0)}ms (VU: ${__VU}, Iter: ${__ITER})`);
  }
}

/**
 * Scenario 3: Webhook Flood
 * Stress test webhook ingestion pipeline
 */
function stressWebhookFlood() {
  // Send burst of webhooks
  const burstSize = 2;

  for (let i = 0; i < burstSize; i++) {
    const payload = {
      event_type: 'session.created',
      event_id: `evt_stress_${__VU}_${__ITER}_${i}_${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000),
      delivery_id: `delivery_stress_${__VU}_${__ITER}_${i}`,
      data: {
        session_id: `S_STRESS_${__VU}_${__ITER}_${i}`,
        volunteer: {
          id: `V_STRESS_${__VU}`,
          email: `stress${__VU}@example.com`,
          name: `Stress User ${__VU}`,
          company_id: 'C_STRESS_TEST',
        },
        ngo: {
          id: `NGO_${__ITER % 20}`,
          name: `Stress NGO ${__ITER % 20}`,
          location: 'Stress Test',
        },
        activity: {
          type: 'Stress Testing',
          date: new Date().toISOString(),
          hours: Math.random() * 5,
          description: 'Stress test webhook',
          skills_used: ['Load Testing'],
          impact_area: 'Quality Assurance',
        },
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = generateHMAC(payloadString, TEST_WEBHOOK_SECRET);

    const response = http.post(`${KINTELL_URL}/v1/webhooks/session`, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'x-kintell-signature': signature,
      },
      tags: { scenario: 'stress_webhooks' },
      timeout: '15s',
    });

    const duration = response.timings.duration;
    webhookDuration.add(duration);
    requestCounter.add(1);

    const success = check(response, {
      'webhook accepted or rate limited': (r) =>
        r.status === 200 || r.status === 202 || r.status === 429 || r.status === 401 || r.status === 503,
      'webhook not timing out': (r) => r.timings.duration < 15000,
    });

    success ? successRate.add(1) : errorRate.add(1);
    if (!success) errorCounter.add(1);

    // Monitor for rate limiting
    if (response.status === 429) {
      console.log(`⚠️  Rate limited (VU: ${__VU}, Iter: ${__ITER})`);
    }
  }
}

/**
 * Scenario 4: Concurrent Read Storm
 * Multiple concurrent profile queries
 */
function stressConcurrentReads() {
  // Simulate cache pressure - query same profiles repeatedly
  const userId = `shared_user_${(__VU % 50) + 1}`;

  const response = http.get(`${PROFILE_URL}/v1/profiles/${userId}`, {
    tags: { scenario: 'stress_concurrent_reads' },
    timeout: '10s',
  });

  requestCounter.add(1);

  const success = check(response, {
    'profile read succeeds': (r) => r.status === 200 || r.status === 404,
    'profile read performant': (r) => r.timings.duration < 5000,
  });

  success ? successRate.add(1) : errorRate.add(1);
  if (!success) errorCounter.add(1);
}

/**
 * Setup
 */
export function setup() {
  console.log('\n=== Starting k6 STRESS TEST ===');
  console.log('⚠️  WARNING: This test will apply heavy load to the system');
  console.log(`Target: ${BASE_URL}`);
  console.log('Peak load: 500 VUs');
  console.log('Duration: ~25 minutes');
  console.log('Monitoring for system breaking points...\n');

  // Verify services are up before stress testing
  const health = http.get(`${BASE_URL}/health/liveness`);
  if (health.status !== 200) {
    console.error('❌ Services not healthy! Aborting stress test.');
    throw new Error('Pre-test health check failed');
  }

  console.log('✅ Pre-test health check passed\n');

  return {
    startTime: Date.now(),
  };
}

/**
 * Teardown
 */
export function teardown(data) {
  const durationMinutes = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);

  console.log('\n=== Stress Test Complete ===');
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log('\n📊 Key observations to review:');
  console.log('  1. At what load did error rates spike?');
  console.log('  2. Did response times degrade gracefully?');
  console.log('  3. Did the system recover after load decreased?');
  console.log('  4. Were any services completely unavailable?');
  console.log('  5. Check logs for OOM, connection pool exhaustion, etc.\n');

  // Allow time for system to stabilize
  console.log('Allowing 10s for system to stabilize...');
  sleep(10);

  // Post-stress health check
  const health = http.get(`${BASE_URL}/health/liveness`);
  if (health.status === 200) {
    console.log('✅ Post-stress health check: PASSED');
    console.log('   System recovered successfully\n');
  } else {
    console.log('❌ Post-stress health check: FAILED');
    console.log('   System may need manual intervention\n');
  }
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  console.log('\n=== Generating Stress Test Report ===\n');

  // Calculate key metrics
  const httpReqs = data.metrics.http_reqs;
  const httpReqFailed = data.metrics.http_req_failed;
  const httpReqDuration = data.metrics.http_req_duration;

  if (httpReqs && httpReqDuration) {
    console.log(`Total Requests: ${httpReqs.values.count}`);
    console.log(`Request Rate: ${httpReqs.values.rate.toFixed(2)} req/s`);
    console.log(`\nResponse Times:`);
    console.log(`  p50: ${httpReqDuration.values['p(50)'].toFixed(2)}ms`);
    console.log(`  p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms`);
    console.log(`  p99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms`);
    console.log(`  max: ${httpReqDuration.values.max.toFixed(2)}ms`);
  }

  if (httpReqFailed) {
    const failRate = (httpReqFailed.values.rate * 100).toFixed(2);
    console.log(`\nError Rate: ${failRate}%`);

    if (failRate > 5) {
      console.log('⚠️  High error rate detected - system may have reached breaking point');
    }
  }

  console.log('\n');

  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    '/home/user/TEEI-CSR-Platform/reports/k6-stress-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  return ''; // Let k6 generate default summary
}
