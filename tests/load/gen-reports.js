/**
 * k6 Load Test: Gen-AI Reporting Service
 *
 * Tests report generation endpoint with varying load profiles
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/QA-Platform Lead/K6 Scenarios
 *
 * Usage:
 *   k6 run --env API_URL=http://localhost:3004 --env JWT_TOKEN=your-token gen-reports.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const reportGenerationRate = new Rate('report_generation_success');
const citationCount = new Trend('citations_per_section');
const tokenUsage = new Trend('tokens_used');
const estimatedCost = new Trend('estimated_cost_usd');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 5 },   // Warm up: 5 concurrent users
    { duration: '5m', target: 10 },  // Normal load: 10 concurrent users
    { duration: '3m', target: 20 },  // Peak load: 20 concurrent users
    { duration: '2m', target: 5 },   // Scale down
    { duration: '1m', target: 0 },   // Cool down
  ],
  thresholds: {
    // 95th percentile < 2s, 99th percentile < 5s
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    // Error rate < 1%
    'http_req_failed': ['rate<0.01'],
    // At least 95% of reports should generate successfully
    'report_generation_success': ['rate>0.95'],
    // At least one citation per section
    'citations_per_section': ['avg>=1'],
  },
  ext: {
    loadimpact: {
      name: 'Gen-AI Reporting Load Test',
      projectID: 3636739,
    },
  },
};

// Test data
const companyIds = [
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
];

const sectionCombinations = [
  ['impact-summary'],
  ['impact-summary', 'sroi-narrative'],
  ['impact-summary', 'sroi-narrative', 'outcome-trends'],
];

const locales = ['en', 'es', 'fr'];

export default function() {
  const API_URL = __ENV.API_URL || 'http://localhost:3004';
  const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token';

  // Randomly select test parameters
  const companyId = companyIds[Math.floor(Math.random() * companyIds.length)];
  const sections = sectionCombinations[Math.floor(Math.random() * sectionCombinations.length)];
  const locale = locales[Math.floor(Math.random() * locales.length)];

  const payload = {
    companyId,
    period: {
      start: '2024-01-01',
      end: '2024-12-31',
    },
    locale,
    sections,
    deterministic: false,
    temperature: 0.7,
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JWT_TOKEN}`,
    },
    tags: {
      name: 'GenerateReport',
      locale,
      sections_count: sections.length,
    },
  };

  // Make request
  const response = http.post(
    `${API_URL}/v1/gen-reports/generate`,
    JSON.stringify(payload),
    params
  );

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has reportId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.reportId !== undefined;
      } catch (e) {
        return false;
      }
    },
    'has sections': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.sections) && body.sections.length > 0;
      } catch (e) {
        return false;
      }
    },
    'has lineage': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.lineage && body.lineage.tokensUsed > 0;
      } catch (e) {
        return false;
      }
    },
  });

  reportGenerationRate.add(success);

  // Extract metrics from response
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);

      // Track citation counts
      body.sections.forEach(section => {
        citationCount.add(section.citations.length);
      });

      // Track token usage and cost
      if (body.lineage) {
        tokenUsage.add(body.lineage.tokensUsed);
        estimatedCost.add(parseFloat(body.lineage.estimatedCostUsd));
      }
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }

  // Realistic think time: users don't generate reports continuously
  sleep(Math.random() * 3 + 2); // 2-5 seconds between requests
}

// Optional: Setup function runs once per VU before default function
export function setup() {
  console.log('Starting Gen-AI Reporting Load Test');
  console.log(`API URL: ${__ENV.API_URL || 'http://localhost:3004'}`);
  console.log('Warming up...');
}

// Optional: Teardown function runs once per VU after test completion
export function teardown(data) {
  console.log('Gen-AI Reporting Load Test Complete');
}

// Optional: Check function to validate individual requests
export function handleSummary(data) {
  return {
    'gen-reports-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const summary = [];
  const indent = opts.indent || '';
  const enableColors = opts.enableColors || false;

  summary.push(`${indent}Gen-AI Reporting Load Test Results\n`);
  summary.push(`${indent}Checks........................: ${data.metrics.checks.passes}/${data.metrics.checks.fails + data.metrics.checks.passes} passed`);
  summary.push(`${indent}Report Generation Rate.......: ${(data.metrics.report_generation_success.values.rate * 100).toFixed(2)}%`);
  summary.push(`${indent}Avg Citations per Section....: ${data.metrics.citations_per_section.values.avg.toFixed(2)}`);
  summary.push(`${indent}Avg Tokens Used..............: ${data.metrics.tokens_used.values.avg.toFixed(0)}`);
  summary.push(`${indent}Avg Cost per Report..........: $${data.metrics.estimated_cost_usd.values.avg.toFixed(4)}`);
  summary.push(`${indent}Response Time p(95)..........: ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms`);
  summary.push(`${indent}Response Time p(99)..........: ${data.metrics.http_req_duration.values['p(99)'].toFixed(0)}ms`);

  return summary.join('\n');
}
