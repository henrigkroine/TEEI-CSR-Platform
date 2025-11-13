/**
 * k6 Load Test: Reporting Endpoints
 *
 * Test: 100 concurrent users
 * Target: p95 < 1000ms
 *
 * Run: k6 run tests/k6/reporting-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const reportingDuration = new Trend('reporting_duration');

export const options = {
  stages: [
    { duration: '30s', target: 20 },    // Ramp up to 20 VUs
    { duration: '1m', target: 50 },     // Ramp up to 50 VUs
    { duration: '2m', target: 100 },    // Ramp up to 100 VUs
    { duration: '5m', target: 100 },    // Sustain 100 VUs for 5 minutes
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% of requests should be below 1000ms
    errors: ['rate<0.01'],               // Error rate should be below 1%
    http_req_failed: ['rate<0.01'],
  },
};

const companyIds = [
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
];

export default function () {
  const baseUrl = __ENV.API_URL || 'http://localhost:3004';
  const companyId = companyIds[Math.floor(Math.random() * companyIds.length)];

  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.API_KEY || 'test-key'}`,
    },
  };

  // Test different endpoints
  const endpoints = [
    `/v1/metrics/${companyId}`,
    `/v1/metrics/${companyId}/sroi`,
    `/v1/metrics/${companyId}/vis`,
    `/v1/cohort/${companyId}/all`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const startTime = Date.now();
  const response = http.get(`${baseUrl}${endpoint}`, params);
  const duration = Date.now() - startTime;

  reportingDuration.add(duration);

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 1000,
    'has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  sleep(Math.random() * 2 + 1); // 1-3 seconds between requests
}
