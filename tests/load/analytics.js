/**
 * k6 Load Test: Analytics Service
 * Tests trends, cohorts, and funnels endpoints
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/K6 Scenarios
 *
 * Usage: k6 run --env API_URL=http://localhost:3007 --env JWT_TOKEN=token analytics.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const querySuccessRate = new Rate('query_success');
const queryDuration = new Trend('query_duration_ms');
const cacheHitRate = new Rate('cache_hits');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up
    { duration: '3m', target: 50 },   // Normal load
    { duration: '2m', target: 100 },  // Peak load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'http_req_failed': ['rate<0.005'],
    'query_success': ['rate>0.99'],
  },
};

const companyId = '550e8400-e29b-41d4-a716-446655440000';

export default function() {
  const API_URL = __ENV.API_URL || 'http://localhost:3007';
  const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token';
  const headers = {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Accept': 'application/json',
  };

  // Test Trends endpoint
  group('Trends API', () => {
    const response = http.get(
      `${API_URL}/v1/analytics/trends?companyId=${companyId}&metrics=participants,sessions&startDate=2024-01-01&endDate=2024-12-31&interval=month&page=1&limit=100`,
      { headers, tags: { name: 'Trends' } }
    );

    const success = check(response, {
      'trends status 200': (r) => r.status === 200,
      'trends has data': (r) => JSON.parse(r.body).data.length > 0,
      'trends has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
    });

    querySuccessRate.add(success);

    if (success) {
      const body = JSON.parse(response.body);
      if (body.metadata) {
        queryDuration.add(body.metadata.queryDurationMs);
        cacheHitRate.add(body.metadata.cacheHit ? 1 : 0);
      }
    }
  });

  sleep(1);

  // Test Cohorts endpoint
  group('Cohorts API', () => {
    const response = http.get(
      `${API_URL}/v1/analytics/cohorts?companyId=${companyId}&metrics=avg_confidence,avg_belonging&cohortDimension=program&startDate=2024-01-01&endDate=2024-12-31`,
      { headers, tags: { name: 'Cohorts' } }
    );

    check(response, {
      'cohorts status 200': (r) => r.status === 200,
      'cohorts has data': (r) => JSON.parse(r.body).data.length > 0,
    });
  });

  sleep(1);

  // Test Funnels endpoint
  group('Funnels API', () => {
    const response = http.get(
      `${API_URL}/v1/analytics/funnels?companyId=${companyId}&funnelType=enrollment&startDate=2024-01-01&endDate=2024-12-31`,
      { headers, tags: { name: 'Funnels' } }
    );

    check(response, {
      'funnels status 200': (r) => r.status === 200,
      'funnels has stages': (r) => JSON.parse(r.body).data.stages.length > 0,
      'funnels has conversion': (r) => JSON.parse(r.body).data.overallConversionRate >= 0,
    });
  });

  sleep(Math.random() * 2 + 1);
}
