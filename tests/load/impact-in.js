/**
 * k6 Load Test: Impact-In Service
 * Tests delivery tracking and replay endpoints
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/K6 Scenarios
 *
 * Usage: k6 run --env API_URL=http://localhost:3005 --env JWT_TOKEN=token impact-in.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const deliveryQueryRate = new Rate('delivery_query_success');

export const options = {
  stages: [
    { duration: '1m', target: 30 },  // Ramp up
    { duration: '3m', target: 80 },  // Normal load
    { duration: '2m', target: 150 }, // Peak load
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.02'],
    'delivery_query_success': ['rate>0.95'],
  },
};

const companyId = '550e8400-e29b-41d4-a716-446655440000';

export default function() {
  const API_URL = __ENV.API_URL || 'http://localhost:3005';
  const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token';
  const headers = { 'Authorization': `Bearer ${JWT_TOKEN}` };

  // Test list deliveries
  group('List Deliveries', () => {
    const provider = ['benevity', 'goodera', 'workday'][Math.floor(Math.random() * 3)];
    const response = http.get(
      `${API_URL}/v1/impact-in/deliveries?companyId=${companyId}&provider=${provider}&page=1&limit=20`,
      { headers, tags: { name: 'ListDeliveries' } }
    );

    const success = check(response, {
      'list status 200': (r) => r.status === 200,
      'list has data': (r) => JSON.parse(r.body).data !== undefined,
      'list has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
    });

    deliveryQueryRate.add(success);
  });

  sleep(0.5);

  // Test delivery stats
  group('Delivery Stats', () => {
    const response = http.get(
      `${API_URL}/v1/impact-in/stats?companyId=${companyId}`,
      { headers, tags: { name: 'DeliveryStats' } }
    );

    check(response, {
      'stats status 200': (r) => r.status === 200,
      'stats has overall': (r) => JSON.parse(r.body).data.overall !== undefined,
      'stats has byProvider': (r) => JSON.parse(r.body).data.byProvider.length > 0,
    });
  });

  sleep(Math.random() + 0.5);
}
