import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import exec from 'k6/execution';

/**
 * k6 Load Test: KEDA Autoscaling Validation
 *
 * Tests KEDA autoscaling behavior for:
 * - Q2Q-AI service (NATS queue depth trigger)
 * - Reporting service (HTTP request rate trigger)
 * - Impact Calculator (CPU-based HPA)
 *
 * Run: k6 run tests/load/keda-validation.js
 *
 * Expected Outcomes:
 * - Q2Q-AI scales from 2 to ~8-10 replicas during burst
 * - Reporting scales from 3 to ~10-12 replicas at 100 concurrent users
 * - Impact Calculator scales based on CPU utilization (target 70%)
 * - Scale-up latency < 30 seconds
 * - Scale-down delay prevents thrashing (5 min stabilization)
 * - CPU p95 < 80% across all services
 */

// Custom metrics
const errorRate = new Rate('errors');
const q2qProcessingTime = new Trend('q2q_processing_time');
const reportingResponseTime = new Trend('reporting_response_time');
const impactCalcTime = new Trend('impact_calculation_time');
const requestsTotal = new Counter('requests_total');
const concurrentUsers = new Gauge('concurrent_users');

// Test configuration
export const options = {
  stages: [
    // Phase 1: Baseline (validate min replicas)
    { duration: '1m', target: 10 },   // Warm up with 10 users

    // Phase 2: Gradual ramp (observe scale-up behavior)
    { duration: '2m', target: 100 },  // Ramp to 100 concurrent users over 2 minutes

    // Phase 3: Sustained load (validate scaling and stability)
    { duration: '5m', target: 100 },  // Sustain 100 users for 5 minutes

    // Phase 4: Burst test (test max scaling)
    { duration: '1m', target: 200 },  // Spike to 200 users
    { duration: '2m', target: 200 },  // Hold burst for 2 minutes

    // Phase 5: Gradual ramp down (observe scale-down behavior)
    { duration: '2m', target: 50 },   // Ramp down to 50 users
    { duration: '3m', target: 50 },   // Hold for scale-down stabilization

    // Phase 6: Cool down
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],

  thresholds: {
    'http_req_duration': ['p(95)<3000'],           // 95% under 3s
    'http_req_failed': ['rate<0.05'],              // <5% errors
    'errors': ['rate<0.05'],                       // <5% custom errors
    'q2q_processing_time': ['p(95)<2000'],         // Q2Q p95 < 2s
    'reporting_response_time': ['p(95)<1500'],     // Reporting p95 < 1.5s
    'impact_calculation_time': ['p(95)<1000'],     // Impact calc p95 < 1s
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4321';
const API_TOKEN = __ENV.API_TOKEN || '';

const Q2Q_URL = `${BASE_URL}/api/q2q`;
const REPORTING_URL = `${BASE_URL}/api/reporting`;
const IMPACT_CALC_URL = `${BASE_URL}/api/impact-calculator`;

// Test data generators
function generateQ2QTask() {
  return {
    feedbackId: `fb-${exec.scenario.iterationInTest}`,
    qualitativeFeedback: [
      'Our volunteering program has dramatically improved employee engagement',
      'The CSR initiative helped us reach underserved communities',
      'Staff satisfaction scores increased by 40% after the program launch',
      'We saw measurable improvements in community health outcomes',
      'The partnership created lasting environmental benefits',
    ][Math.floor(Math.random() * 5)],
    context: {
      program: 'employee-volunteering',
      region: ['EMEA', 'APAC', 'AMER'][Math.floor(Math.random() * 3)],
      category: ['education', 'environment', 'health', 'community'][Math.floor(Math.random() * 4)],
    },
    priority: Math.random() > 0.7 ? 'high' : 'normal',
  };
}

function generateReportRequest() {
  return {
    title: `KEDA Test Report ${Date.now()}`,
    type: ['quarterly', 'annual', 'impact-summary'][Math.floor(Math.random() * 3)],
    dateRange: {
      start: '2025-01-01',
      end: '2025-10-31',
    },
    includeCharts: true,
    includeNarrative: Math.random() > 0.5,
    format: 'json',
  };
}

function generateImpactCalcInput() {
  return {
    programId: `prog-${Math.floor(Math.random() * 1000)}`,
    metrics: {
      volunteers: Math.floor(Math.random() * 500) + 10,
      hours: Math.floor(Math.random() * 5000) + 100,
      beneficiaries: Math.floor(Math.random() * 10000) + 50,
      investment: Math.floor(Math.random() * 500000) + 10000,
    },
    calculationType: ['sroi', 'vis', 'combined'][Math.floor(Math.random() * 3)],
    complexity: Math.random() > 0.7 ? 'high' : 'standard',
  };
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { 'Authorization': `Bearer ${API_TOKEN}` }),
  };

  // Update concurrent users metric
  concurrentUsers.add(exec.instance.vusActive);

  // Weighted distribution across services
  // This simulates realistic production load patterns
  const operation = Math.random();

  if (operation < 0.35) {
    // 35% Q2Q-AI requests (tests NATS queue depth scaling)
    testQ2QService(headers);
  } else if (operation < 0.70) {
    // 35% Reporting requests (tests HTTP rate scaling)
    testReportingService(headers);
  } else {
    // 30% Impact Calculator requests (tests CPU-based scaling)
    testImpactCalculator(headers);
  }

  // Variable think time based on load phase
  const currentVUs = exec.instance.vusActive;
  if (currentVUs > 150) {
    sleep(0.5); // Faster pace during burst
  } else if (currentVUs > 75) {
    sleep(1);   // Normal pace during sustained load
  } else {
    sleep(2);   // Slower pace during ramp up/down
  }
}

function testQ2QService(headers) {
  const payload = generateQ2QTask();
  const start = Date.now();

  const res = http.post(`${Q2Q_URL}/submit`, JSON.stringify(payload), {
    headers,
    tags: { name: 'q2q-submit', service: 'q2q-ai' },
  });

  const duration = Date.now() - start;
  q2qProcessingTime.add(duration);
  requestsTotal.add(1);

  const success = check(res, {
    'Q2Q submit successful': (r) => [200, 201, 202].includes(r.status),
    'Q2Q has task ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.taskId !== undefined || body.id !== undefined;
      } catch {
        return false;
      }
    },
    'Q2Q response < 3s': () => duration < 3000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Q2Q submit failed: ${res.status} (${duration}ms)`);
  } else {
    errorRate.add(0);
  }
}

function testReportingService(headers) {
  const operation = Math.random();

  if (operation < 0.6) {
    // 60% - Generate reports (high load operation)
    const payload = generateReportRequest();
    const start = Date.now();

    const res = http.post(`${REPORTING_URL}/reports/generate`, JSON.stringify(payload), {
      headers,
      tags: { name: 'report-generate', service: 'reporting' },
    });

    const duration = Date.now() - start;
    reportingResponseTime.add(duration);
    requestsTotal.add(1);

    const success = check(res, {
      'Report generation successful': (r) => [200, 201, 202].includes(r.status),
      'Report has ID': (r) => {
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
    } else {
      errorRate.add(0);
    }
  } else {
    // 40% - List reports (lighter operation)
    const start = Date.now();

    const res = http.get(`${REPORTING_URL}/reports`, {
      headers,
      tags: { name: 'report-list', service: 'reporting' },
    });

    const duration = Date.now() - start;
    reportingResponseTime.add(duration);
    requestsTotal.add(1);

    check(res, {
      'List reports successful': (r) => r.status === 200,
    }) || errorRate.add(1);
  }
}

function testImpactCalculator(headers) {
  const payload = generateImpactCalcInput();
  const start = Date.now();

  const res = http.post(`${IMPACT_CALC_URL}/calculate`, JSON.stringify(payload), {
    headers,
    tags: { name: 'impact-calculate', service: 'impact-calculator' },
  });

  const duration = Date.now() - start;
  impactCalcTime.add(duration);
  requestsTotal.add(1);

  const success = check(res, {
    'Impact calc successful': (r) => r.status === 200,
    'Impact has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.impact !== undefined || body.score !== undefined;
      } catch {
        return false;
      }
    },
    'Impact calc < 2s': () => duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Impact calculation failed: ${res.status} (${duration}ms)`);
  } else {
    errorRate.add(0);
  }
}

export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data),
    'results/keda-validation-summary.json': JSON.stringify(data),
    'results/keda-validation-summary.html': htmlSummary(data),
  };

  return summary;
}

function textSummary(data) {
  let summary = '\n';
  summary += '╔═══════════════════════════════════════════════════════════════╗\n';
  summary += '║       KEDA Autoscaling Validation - Test Summary             ║\n';
  summary += '╚═══════════════════════════════════════════════════════════════╝\n\n';

  // Overall stats
  summary += '📊 Overall Statistics:\n';
  summary += '─────────────────────────────────────────────────────────────────\n';
  summary += `Total Requests:     ${data.metrics.http_reqs.values.count}\n`;
  summary += `Request Rate:       ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `Failed Requests:    ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `Error Rate:         ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += `Peak Concurrent:    ${Math.round(data.metrics.concurrent_users.values.max)} VUs\n\n`;

  // Response times
  summary += '⏱️  Response Time Analysis:\n';
  summary += '─────────────────────────────────────────────────────────────────\n';
  summary += `Overall P50:        ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
  summary += `Overall P95:        ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms ${data.metrics.http_req_duration.values['p(95)'] < 3000 ? '✅' : '❌'}\n`;
  summary += `Overall P99:        ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  // Per-service breakdown
  summary += '🔧 Service-Specific Performance:\n';
  summary += '─────────────────────────────────────────────────────────────────\n';

  summary += 'Q2Q-AI Service (NATS Queue Depth Scaler):\n';
  summary += `  Avg:              ${data.metrics.q2q_processing_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95:              ${data.metrics.q2q_processing_time.values['p(95)'].toFixed(2)}ms ${data.metrics.q2q_processing_time.values['p(95)'] < 2000 ? '✅' : '❌'}\n`;
  summary += `  P99:              ${data.metrics.q2q_processing_time.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += 'Reporting Service (HTTP Rate Scaler):\n';
  summary += `  Avg:              ${data.metrics.reporting_response_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95:              ${data.metrics.reporting_response_time.values['p(95)'].toFixed(2)}ms ${data.metrics.reporting_response_time.values['p(95)'] < 1500 ? '✅' : '❌'}\n`;
  summary += `  P99:              ${data.metrics.reporting_response_time.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += 'Impact Calculator (CPU-Based HPA):\n';
  summary += `  Avg:              ${data.metrics.impact_calculation_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95:              ${data.metrics.impact_calculation_time.values['p(95)'].toFixed(2)}ms ${data.metrics.impact_calculation_time.values['p(95)'] < 1000 ? '✅' : '❌'}\n`;
  summary += `  P99:              ${data.metrics.impact_calculation_time.values['p(99)'].toFixed(2)}ms\n\n`;

  // Validation checklist
  summary += '✓ Validation Checklist:\n';
  summary += '─────────────────────────────────────────────────────────────────\n';
  summary += `${data.metrics.http_req_failed.values.rate < 0.05 ? '✅' : '❌'} Error rate < 5%\n`;
  summary += `${data.metrics.http_req_duration.values['p(95)'] < 3000 ? '✅' : '❌'} Overall P95 < 3000ms\n`;
  summary += `${data.metrics.q2q_processing_time.values['p(95)'] < 2000 ? '✅' : '❌'} Q2Q P95 < 2000ms\n`;
  summary += `${data.metrics.reporting_response_time.values['p(95)'] < 1500 ? '✅' : '❌'} Reporting P95 < 1500ms\n`;
  summary += `${data.metrics.impact_calculation_time.values['p(95)'] < 1000 ? '✅' : '❌'} Impact Calc P95 < 1000ms\n\n`;

  summary += '📋 Next Steps:\n';
  summary += '─────────────────────────────────────────────────────────────────\n';
  summary += '1. Verify pod scaling events in Kubernetes:\n';
  summary += '   kubectl get hpa -n default -w\n';
  summary += '   kubectl get scaledobject -n default\n\n';
  summary += '2. Check KEDA metrics:\n';
  summary += '   kubectl get scaledobject teei-q2q-ai-scaler -o yaml\n';
  summary += '   kubectl get scaledobject teei-reporting-scaler -o yaml\n\n';
  summary += '3. Monitor CPU utilization:\n';
  summary += '   kubectl top pods -n default\n\n';
  summary += '4. Review scale-up/down timing in events:\n';
  summary += '   kubectl get events --sort-by=.lastTimestamp\n\n';

  return summary;
}

function htmlSummary(data) {
  // Simple HTML summary
  return `
<!DOCTYPE html>
<html>
<head>
  <title>KEDA Validation Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
    .metric { display: inline-block; margin: 10px; padding: 15px; background: #e9ecef; border-radius: 5px; min-width: 200px; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
    .pass { color: #28a745; }
    .fail { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #007bff; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>KEDA Autoscaling Validation Results</h1>
    <p>Test completed: ${new Date().toISOString()}</p>

    <h2>Key Metrics</h2>
    <div class="metric">
      <div class="metric-label">Total Requests</div>
      <div class="metric-value">${data.metrics.http_reqs.values.count}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Request Rate</div>
      <div class="metric-value">${data.metrics.http_reqs.values.rate.toFixed(2)}/s</div>
    </div>
    <div class="metric">
      <div class="metric-label">Error Rate</div>
      <div class="metric-value ${data.metrics.errors.values.rate < 0.05 ? 'pass' : 'fail'}">
        ${(data.metrics.errors.values.rate * 100).toFixed(2)}%
      </div>
    </div>

    <h2>Response Time Analysis</h2>
    <table>
      <tr>
        <th>Service</th>
        <th>Avg (ms)</th>
        <th>P95 (ms)</th>
        <th>P99 (ms)</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Q2Q-AI (NATS)</td>
        <td>${data.metrics.q2q_processing_time.values.avg.toFixed(2)}</td>
        <td>${data.metrics.q2q_processing_time.values['p(95)'].toFixed(2)}</td>
        <td>${data.metrics.q2q_processing_time.values['p(99)'].toFixed(2)}</td>
        <td class="${data.metrics.q2q_processing_time.values['p(95)'] < 2000 ? 'pass' : 'fail'}">
          ${data.metrics.q2q_processing_time.values['p(95)'] < 2000 ? '✅ PASS' : '❌ FAIL'}
        </td>
      </tr>
      <tr>
        <td>Reporting (HTTP)</td>
        <td>${data.metrics.reporting_response_time.values.avg.toFixed(2)}</td>
        <td>${data.metrics.reporting_response_time.values['p(95)'].toFixed(2)}</td>
        <td>${data.metrics.reporting_response_time.values['p(99)'].toFixed(2)}</td>
        <td class="${data.metrics.reporting_response_time.values['p(95)'] < 1500 ? 'pass' : 'fail'}">
          ${data.metrics.reporting_response_time.values['p(95)'] < 1500 ? '✅ PASS' : '❌ FAIL'}
        </td>
      </tr>
      <tr>
        <td>Impact Calculator (CPU)</td>
        <td>${data.metrics.impact_calculation_time.values.avg.toFixed(2)}</td>
        <td>${data.metrics.impact_calculation_time.values['p(95)'].toFixed(2)}</td>
        <td>${data.metrics.impact_calculation_time.values['p(99)'].toFixed(2)}</td>
        <td class="${data.metrics.impact_calculation_time.values['p(95)'] < 1000 ? 'pass' : 'fail'}">
          ${data.metrics.impact_calculation_time.values['p(95)'] < 1000 ? '✅ PASS' : '❌ FAIL'}
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}
