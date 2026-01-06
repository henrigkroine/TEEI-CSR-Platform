import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * k6 Load Test: Reporting Service
 *
 * Tests SROI and VIS calculations under load:
 * - SROI calculations
 * - VIS calculations
 * - Report generation
 * - Export functionality
 *
 * Run: k6 run tests/load/reporting-load.js
 */

// Custom metrics
const errorRate = new Rate('errors');
const sroiCalcTime = new Trend('sroi_calculation_time');
const visCalcTime = new Trend('vis_calculation_time');
const reportGenTime = new Trend('report_generation_time');
const calculationsTotal = new Counter('calculations_total');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm up
    { duration: '1m', target: 50 },   // Ramp to 50 concurrent users
    { duration: '5m', target: 100 },  // Ramp to 100 concurrent users
    { duration: '3m', target: 100 },  // Sustain 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<3000'],       // 95% under 3s
    'http_req_failed': ['rate<0.05'],          // <5% errors
    'errors': ['rate<0.05'],                   // <5% custom errors
    'sroi_calculation_time': ['p(95)<1000'],   // SROI calc p95 < 1s
    'vis_calculation_time': ['p(95)<1000'],    // VIS calc p95 < 1s
    'report_generation_time': ['p(95)<5000'],  // Report gen p95 < 5s
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4321';
const API_TOKEN = __ENV.API_TOKEN || '';

const API_URL = `${BASE_URL}/api/reporting`;

// Test data generators
function generateSROIInput() {
  return {
    investment: Math.floor(Math.random() * 1000000) + 50000, // $50k-$1M
    socialValue: Math.floor(Math.random() * 5000000) + 100000, // $100k-$5M
    periodMonths: Math.floor(Math.random() * 24) + 6, // 6-30 months
    categories: [
      { name: 'Education', value: Math.random() * 100000 },
      { name: 'Healthcare', value: Math.random() * 150000 },
      { name: 'Environment', value: Math.random() * 80000 },
    ],
  };
}

function generateVISInput() {
  return {
    volunteers: Math.floor(Math.random() * 500) + 10, // 10-510 volunteers
    hoursPerVolunteer: Math.floor(Math.random() * 40) + 5, // 5-45 hours
    skillLevel: ['entry', 'intermediate', 'expert'][Math.floor(Math.random() * 3)],
    activities: [
      { type: 'mentoring', hours: Math.random() * 100 },
      { type: 'training', hours: Math.random() * 50 },
      { type: 'consulting', hours: Math.random() * 75 },
    ],
  };
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { 'Authorization': `Bearer ${API_TOKEN}` }),
  };

  // Weighted random selection of operations
  const operation = Math.random();

  if (operation < 0.4) {
    // 40% SROI calculations
    performSROICalculation(headers);
  } else if (operation < 0.7) {
    // 30% VIS calculations
    performVISCalculation(headers);
  } else if (operation < 0.9) {
    // 20% List reports
    listReports(headers);
  } else {
    // 10% Generate full report
    generateReport(headers);
  }

  sleep(1); // Think time between requests
}

function performSROICalculation(headers) {
  const payload = generateSROIInput();

  const start = Date.now();

  const res = http.post(`${API_URL}/sroi/calculate`, JSON.stringify(payload), {
    headers,
    tags: { name: 'sroi-calculate' },
  });

  const duration = Date.now() - start;
  sroiCalcTime.add(duration);
  calculationsTotal.add(1);

  const success = check(res, {
    'SROI calc successful': (r) => r.status === 200,
    'SROI has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.sroi !== undefined && typeof body.sroi === 'number';
      } catch {
        return false;
      }
    },
    'SROI calc < 2s': () => duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`SROI calculation failed: ${res.status} (${duration}ms)`);
  } else {
    errorRate.add(0);
    const sroi = JSON.parse(res.body).sroi;
    console.log(`SROI calculated: ${sroi.toFixed(2)}x (${duration}ms)`);
  }
}

function performVISCalculation(headers) {
  const payload = generateVISInput();

  const start = Date.now();

  const res = http.post(`${API_URL}/vis/calculate`, JSON.stringify(payload), {
    headers,
    tags: { name: 'vis-calculate' },
  });

  const duration = Date.now() - start;
  visCalcTime.add(duration);
  calculationsTotal.add(1);

  const success = check(res, {
    'VIS calc successful': (r) => r.status === 200,
    'VIS has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.visScore !== undefined && typeof body.visScore === 'number';
      } catch {
        return false;
      }
    },
    'VIS calc < 2s': () => duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`VIS calculation failed: ${res.status} (${duration}ms)`);
  } else {
    errorRate.add(0);
    const vis = JSON.parse(res.body).visScore;
    console.log(`VIS calculated: ${vis.toFixed(0)} (${duration}ms)`);
  }
}

function listReports(headers) {
  const res = http.get(`${API_URL}/reports`, {
    headers,
    tags: { name: 'list-reports' },
  });

  check(res, {
    'list reports successful': (r) => r.status === 200,
    'reports is array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || Array.isArray(body.reports);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);
}

function generateReport(headers) {
  // First, create a report
  const reportPayload = {
    title: `Load Test Report ${Date.now()}`,
    type: 'monthly',
    dateRange: {
      start: '2025-10-01',
      end: '2025-10-31',
    },
    includeCharts: true,
    format: 'json',
  };

  const start = Date.now();

  const createRes = http.post(`${API_URL}/reports/generate`, JSON.stringify(reportPayload), {
    headers,
    tags: { name: 'generate-report' },
  });

  const duration = Date.now() - start;
  reportGenTime.add(duration);

  const success = check(createRes, {
    'report generation successful': (r) => [200, 201, 202].includes(r.status),
    'report has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.reportId !== undefined || body.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Report generation failed: ${createRes.status} (${duration}ms)`);
  } else {
    errorRate.add(0);
    console.log(`Report generated (${duration}ms)`);

    // If successful and we got a report ID, try to fetch it
    try {
      const body = JSON.parse(createRes.body);
      const reportId = body.reportId || body.id;

      if (reportId) {
        sleep(0.5); // Small delay before fetching

        const fetchRes = http.get(`${API_URL}/reports/${reportId}`, {
          headers,
          tags: { name: 'fetch-report' },
        });

        check(fetchRes, {
          'fetch report successful': (r) => r.status === 200,
        });
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
}

export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data),
    'results/reporting-load-summary.json': JSON.stringify(data),
  };

  return summary;
}

function textSummary(data) {
  let summary = '\n';
  summary += 'Reporting Service Load Test Summary\n';
  summary += '===================================\n\n';

  // Overall stats
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `Total Calculations: ${data.metrics.calculations_total.values.count}\n\n`;

  // Response times
  summary += 'Overall Response Times:\n';
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  // Calculation times
  summary += 'SROI Calculation Times:\n';
  summary += `  Avg: ${data.metrics.sroi_calculation_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95: ${data.metrics.sroi_calculation_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99: ${data.metrics.sroi_calculation_time.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += 'VIS Calculation Times:\n';
  summary += `  Avg: ${data.metrics.vis_calculation_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95: ${data.metrics.vis_calculation_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99: ${data.metrics.vis_calculation_time.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += 'Report Generation Times:\n';
  summary += `  Avg: ${data.metrics.report_generation_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95: ${data.metrics.report_generation_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99: ${data.metrics.report_generation_time.values['p(99)'].toFixed(2)}ms\n\n`;

  // Error rate
  summary += `Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;

  return summary;
}
