/**
 * k6 Load Test: Notifications Service
 * Tests notification sending and quota checking
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/K6 Scenarios
 *
 * Usage: k6 run --env API_URL=http://localhost:3006 --env JWT_TOKEN=token notifications.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const sendSuccessRate = new Rate('notification_send_success');
const notificationsQueued = new Counter('notifications_queued_total');

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Warm up
    { duration: '3m', target: 30 },  // Normal load
    { duration: '2m', target: 60 },  // Peak load
    { duration: '1m', target: 0 },   // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<100', 'p(99)<200'],
    'http_req_failed': ['rate<0.005'],
    'notification_send_success': ['rate>0.98'],
  },
};

const companyId = '550e8400-e29b-41d4-a716-446655440000';

export default function() {
  const API_URL = __ENV.API_URL || 'http://localhost:3006';
  const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token';
  const headers = {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Test send notification
  group('Send Notification', () => {
    const payload = {
      companyId,
      type: 'email',
      templateId: 'test-template',
      recipient: `test-${__VU}-${__ITER}@example.com`,
      subject: 'Load Test Notification',
      payload: {
        testData: 'k6 load test',
        vu: __VU,
        iter: __ITER,
      },
    };

    const response = http.post(
      `${API_URL}/v1/notifications/send`,
      JSON.stringify(payload),
      { headers, tags: { name: 'SendNotification' } }
    );

    const success = check(response, {
      'send status 202': (r) => r.status === 202,
      'send has notificationId': (r) => JSON.parse(r.body).notificationId !== undefined,
      'send status queued': (r) => JSON.parse(r.body).status === 'queued',
    });

    sendSuccessRate.add(success);
    if (success) {
      notificationsQueued.add(1);
    }
  });

  sleep(1);

  // Test quota check
  group('Check Quota', () => {
    const response = http.get(
      `${API_URL}/v1/notifications/quota?companyId=${companyId}`,
      { headers, tags: { name: 'CheckQuota' } }
    );

    check(response, {
      'quota status 200': (r) => r.status === 200,
      'quota has limits': (r) => JSON.parse(r.body).quotas !== undefined,
      'email quota exists': (r) => JSON.parse(r.body).quotas.email !== undefined,
    });
  });

  sleep(Math.random() * 2);
}
