import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * k6 Load Test: Dashboard
 *
 * Simulates users browsing the Corporate Cockpit dashboard:
 * - Login
 * - View dashboard (metrics, charts)
 * - Navigate between pages
 * - Logout
 *
 * Run: k6 run tests/load/dashboard-load.js
 */

// Custom metrics
const errorRate = new Rate('errors');
const dashboardLoadTime = new Trend('dashboard_load_time');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up to 20 users over 1 minute
    { duration: '3m', target: 100 }, // Ramp up to 100 users over 3 minutes
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],

  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests should be below 2s
    'http_req_failed': ['rate<0.05'],    // Error rate should be below 5%
    'errors': ['rate<0.05'],             // Custom error rate below 5%
    'dashboard_load_time': ['p(95)<3000'], // Dashboard load time p95 < 3s
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4321';
const TEST_DURATION = __ENV.TEST_DURATION || '5m';

// Test data
const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'loadtest123' },
  { email: 'loadtest2@example.com', password: 'loadtest123' },
  { email: 'loadtest3@example.com', password: 'loadtest123' },
  { email: 'loadtest4@example.com', password: 'loadtest123' },
  { email: 'loadtest5@example.com', password: 'loadtest123' },
];

export default function () {
  // Select random test user
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  // 1. Login
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  });

  const loginSuccess = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    errorRate.add(1);
    console.error(`Login failed for ${user.email}: ${loginRes.status}`);
    return;
  }

  errorRate.add(0);

  // Extract auth token
  let token;
  try {
    token = JSON.parse(loginRes.body).token;
  } catch (e) {
    errorRate.add(1);
    console.error('Failed to parse login response');
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  sleep(1); // Think time

  // 2. Load dashboard
  const dashboardStart = Date.now();

  const dashboardRes = http.get(`${BASE_URL}/dashboard`, {
    headers: authHeaders,
    tags: { name: 'dashboard' },
  });

  const dashboardTime = Date.now() - dashboardStart;
  dashboardLoadTime.add(dashboardTime);

  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard has content': (r) => r.body && r.body.length > 1000,
  }) || errorRate.add(1);

  sleep(2); // User reads dashboard

  // 3. Fetch dashboard metrics
  const metricsRes = http.get(`${BASE_URL}/api/dashboard/metrics`, {
    headers: authHeaders,
    tags: { name: 'metrics' },
  });

  check(metricsRes, {
    'metrics loaded': (r) => r.status === 200,
    'metrics is json': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // 4. Fetch SROI chart data
  const sroiRes = http.get(`${BASE_URL}/api/reporting/sroi/trend`, {
    headers: authHeaders,
    tags: { name: 'sroi-chart' },
  });

  check(sroiRes, {
    'SROI data loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);

  // 5. Navigate to reports page
  const reportsRes = http.get(`${BASE_URL}/reports`, {
    headers: authHeaders,
    tags: { name: 'reports-page' },
  });

  check(reportsRes, {
    'reports page loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 6. Fetch reports list
  const reportsListRes = http.get(`${BASE_URL}/api/reporting/reports`, {
    headers: authHeaders,
    tags: { name: 'reports-list' },
  });

  check(reportsListRes, {
    'reports list loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);

  // 7. Navigate to settings
  const settingsRes = http.get(`${BASE_URL}/settings`, {
    headers: authHeaders,
    tags: { name: 'settings-page' },
  });

  check(settingsRes, {
    'settings page loaded': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 8. Logout (optional, session will expire)
  const logoutRes = http.post(`${BASE_URL}/api/auth/logout`, null, {
    headers: authHeaders,
    tags: { name: 'logout' },
  });

  check(logoutRes, {
    'logout successful': (r) => [200, 204].includes(r.status),
  });

  sleep(1); // Cool down between iterations
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts = {}) {
  const indent = opts.indent || '';
  const colors = opts.enableColors || false;

  let summary = '\n';
  summary += `${indent}Dashboard Load Test Summary\n`;
  summary += `${indent}===========================\n\n`;

  // Overall stats
  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate.toFixed(2)}%\n`;
  summary += `${indent}Virtual Users: ${data.metrics.vus.values.value}\n\n`;

  // Response times
  summary += `${indent}Response Times:\n`;
  summary += `${indent}  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  summary += `${indent}  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;

  // Custom metrics
  summary += `${indent}Dashboard Load Time (P95): ${data.metrics.dashboard_load_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n\n`;

  // Threshold results
  summary += `${indent}Thresholds:\n`;
  const thresholds = data.root_group.checks;
  for (const check of thresholds || []) {
    const symbol = check.passes === check.fails ? '✓' : '✗';
    summary += `${indent}  ${symbol} ${check.name}: ${check.passes}/${check.passes + check.fails}\n`;
  }

  return summary;
}
