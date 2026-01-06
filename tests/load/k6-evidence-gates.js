/**
 * k6 Load Test: Evidence Gates & Citation Validation
 * Agent: 4.3 Performance Test Engineer (k6)
 * Ref: AGENTS.md § Trust Boardroom Implementation
 *
 * Purpose: Test evidence gate enforcement and citation validation under load
 *
 * Metrics to capture:
 * - Citation validation latency (p95 < 100ms)
 * - Evidence gate error rate (< 1%)
 * - Report generation p95/p99 response times
 * - PII redaction overhead
 *
 * Run: k6 run tests/load/k6-evidence-gates.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const evidenceGateErrors = new Rate('evidence_gate_errors');
const citationValidationLatency = new Trend('citation_validation_latency');
const piiRedactionLatency = new Trend('pii_redaction_latency');
const validReportLatency = new Trend('valid_report_latency');
const invalidReportLatency = new Trend('invalid_report_latency');

// Configuration
export const options = {
  scenarios: {
    evidence_validation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // Warm up to 10 VUs
        { duration: '1m', target: 50 },   // Ramp to 50 VUs (normal load)
        { duration: '2m', target: 50 },   // Sustain 50 VUs
        { duration: '30s', target: 100 }, // Spike to 100 VUs
        { duration: '1m', target: 100 },  // Sustain spike
        { duration: '30s', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    evidence_gate_errors: ['rate<0.01'],
    citation_validation_latency: ['p(95)<100', 'p(99)<200'],
    pii_redaction_latency: ['p(95)<50', 'p(99)<100'],
    valid_report_latency: ['p(95)<800', 'p(99)<1500'],
    invalid_report_latency: ['p(95)<200', 'p(99)<400'],
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = __ENV.TEST_TOKEN || 'test_bearer_token_for_load_testing';
const TEST_COMPANY_ID = __ENV.TEST_COMPANY_ID || 'company-load-test-001';

// Test data: Valid report with citations
function generateValidReport(vu, iter) {
  return {
    companyId: `${TEST_COMPANY_ID}-${vu}`,
    periodStart: '2025-01-01',
    periodEnd: '2025-03-31',
    template: 'quarterly',
    locale: 'en',
    sections: [
      {
        type: 'summary',
        content: `Quarterly impact summary for VU ${vu}. This report demonstrates evidence-based reporting with proper citations [cite:evidence-${vu}-001]. Our volunteer engagement increased by 15% quarter-over-quarter [cite:evidence-${vu}-002]. The social return on investment (SROI) reached 3.2:1 [cite:evidence-${vu}-003].`,
      },
      {
        type: 'metrics',
        content: `Key metrics for Q1 2025: Total volunteer hours: 1,245 [cite:evidence-${vu}-004]. Unique volunteers: 87 [cite:evidence-${vu}-005]. Partner organizations: 12 [cite:evidence-${vu}-006].`,
      },
      {
        type: 'deep-dive',
        content: `Deep dive analysis shows strong correlation between volunteer training hours and impact outcomes [cite:evidence-${vu}-007]. The Volunteer Impact Score (VIS) averaged 72.3 across all programs [cite:evidence-${vu}-008].`,
      },
    ],
    evidenceIds: [
      `evidence-${vu}-001`,
      `evidence-${vu}-002`,
      `evidence-${vu}-003`,
      `evidence-${vu}-004`,
      `evidence-${vu}-005`,
      `evidence-${vu}-006`,
      `evidence-${vu}-007`,
      `evidence-${vu}-008`,
    ],
    citationConfig: {
      minCitationsPerParagraph: 1,
      citationDensity: 0.5,
    },
  };
}

// Test data: Invalid report (missing citations)
function generateInvalidReport(vu, iter) {
  return {
    companyId: `${TEST_COMPANY_ID}-${vu}`,
    periodStart: '2025-01-01',
    periodEnd: '2025-03-31',
    template: 'quarterly',
    locale: 'en',
    sections: [
      {
        type: 'summary',
        content: `This paragraph has no citations and should be rejected by evidence gates. It makes claims without backing them up with evidence. This will trigger a 422 validation error.`,
      },
      {
        type: 'metrics',
        content: 'Another paragraph without any evidence citations. This should also fail validation checks.',
      },
    ],
    evidenceIds: [],
    citationConfig: {
      minCitationsPerParagraph: 1,
      citationDensity: 0.5,
    },
  };
}

// Test data: Report with PII (should be redacted)
function generateReportWithPII(vu, iter) {
  return {
    companyId: `${TEST_COMPANY_ID}-${vu}`,
    periodStart: '2025-01-01',
    periodEnd: '2025-03-31',
    template: 'quarterly',
    locale: 'en',
    sections: [
      {
        type: 'summary',
        content: `Volunteer John Doe (SSN: 123-45-6789, email: john.doe@example.com) contributed 40 hours [cite:evidence-${vu}-001]. Credit card ending in 4242 was used for donation [cite:evidence-${vu}-002].`,
      },
    ],
    evidenceIds: [`evidence-${vu}-001`, `evidence-${vu}-002`],
    piiRedaction: {
      enabled: true,
      entities: ['PERSON', 'EMAIL', 'SSN', 'CREDIT_CARD'],
    },
  };
}

// Main test function
export default function () {
  const scenarios = [
    testValidReportGeneration,
    testInvalidReportRejection,
    testPIIRedaction,
    testCitationDensityValidation,
  ];

  // Weighted distribution of test scenarios
  const rand = Math.random();

  if (rand < 0.4) {
    testValidReportGeneration();
  } else if (rand < 0.7) {
    testInvalidReportRejection();
  } else if (rand < 0.85) {
    testPIIRedaction();
  } else {
    testCitationDensityValidation();
  }

  // Think time between requests
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

/**
 * Scenario 1: Valid Report Generation
 * Tests successful report generation with proper citations
 */
function testValidReportGeneration() {
  const payload = JSON.stringify(generateValidReport(__VU, __ITER));

  const start = Date.now();
  const response = http.post(`${BASE_URL}/api/gen-reports/generate`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'valid_report' },
  });
  const duration = Date.now() - start;

  citationValidationLatency.add(duration);
  validReportLatency.add(duration);

  const success = check(response, {
    'valid report: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'valid report: has reportId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.reportId !== undefined;
      } catch {
        return false;
      }
    },
    'valid report: response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (!success) {
    evidenceGateErrors.add(1);
  }
}

/**
 * Scenario 2: Invalid Report Rejection
 * Tests that reports without citations are properly rejected (422 status)
 */
function testInvalidReportRejection() {
  const payload = JSON.stringify(generateInvalidReport(__VU, __ITER));

  const start = Date.now();
  const response = http.post(`${BASE_URL}/api/gen-reports/generate`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'invalid_report' },
  });
  const duration = Date.now() - start;

  invalidReportLatency.add(duration);

  // Evidence gate should reject with 422
  const isExpectedRejection = response.status === 422 || response.status === 400;
  evidenceGateErrors.add(!isExpectedRejection ? 1 : 0);

  check(response, {
    'invalid report: returns 422 or 400': (r) => r.status === 422 || r.status === 400,
    'invalid report: has violations array': (r) => {
      if (r.status === 422 || r.status === 400) {
        try {
          const body = JSON.parse(r.body);
          return body.violations !== undefined || body.error !== undefined;
        } catch {
          return false;
        }
      }
      return false;
    },
    'invalid report: response time < 400ms': (r) => r.timings.duration < 400,
  });
}

/**
 * Scenario 3: PII Redaction
 * Tests that PII is properly redacted before report generation
 */
function testPIIRedaction() {
  const payload = JSON.stringify(generateReportWithPII(__VU, __ITER));

  const start = Date.now();
  const response = http.post(`${BASE_URL}/api/gen-reports/generate`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'pii_redaction' },
  });
  const duration = Date.now() - start;

  piiRedactionLatency.add(duration);

  check(response, {
    'pii redaction: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'pii redaction: no PII in response': (r) => {
      try {
        const body = JSON.parse(r.body);
        const bodyStr = JSON.stringify(body);
        // Check that obvious PII patterns are not present
        return (
          !bodyStr.includes('john.doe@example.com') &&
          !bodyStr.includes('123-45-6789') &&
          !bodyStr.includes('4242')
        );
      } catch {
        return false;
      }
    },
    'pii redaction: response time < 1s': (r) => r.timings.duration < 1000,
  });
}

/**
 * Scenario 4: Citation Density Validation
 * Tests edge cases around citation density requirements
 */
function testCitationDensityValidation() {
  // Report with exactly minimum citations per paragraph
  const payload = JSON.stringify({
    companyId: `${TEST_COMPANY_ID}-${__VU}`,
    periodStart: '2025-01-01',
    periodEnd: '2025-03-31',
    template: 'quarterly',
    locale: 'en',
    sections: [
      {
        type: 'summary',
        content: `Single paragraph with exactly one citation at minimum threshold [cite:evidence-${__VU}-001].`,
      },
    ],
    evidenceIds: [`evidence-${__VU}-001`],
    citationConfig: {
      minCitationsPerParagraph: 1,
      citationDensity: 0.5,
    },
  });

  const start = Date.now();
  const response = http.post(`${BASE_URL}/api/gen-reports/generate`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'citation_density' },
  });
  const duration = Date.now() - start;

  citationValidationLatency.add(duration);

  check(response, {
    'citation density: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'citation density: response time < 800ms': (r) => r.timings.duration < 800,
  });
}

/**
 * Setup: Run once before test starts
 */
export function setup() {
  console.log('Starting k6 evidence gates load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log('Test duration: ~6 minutes');
  console.log('Scenarios: Valid reports, Invalid reports, PII redaction, Citation density');

  // Verify service is reachable
  const healthCheck = http.get(`${BASE_URL}/health/liveness`);
  if (healthCheck.status !== 200) {
    console.warn('Health check failed - service may not be ready');
  }

  return {
    startTime: Date.now(),
  };
}

/**
 * Teardown: Run once after test completes
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n=== Evidence Gates Load Test Complete ===`);
  console.log(`Total duration: ${duration.toFixed(1)}s`);
  console.log('Check results above for citation validation and evidence gate metrics\n');
}

/**
 * Handle summary data
 */
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
    '/home/user/TEEI-CSR-Platform/reports/k6-evidence-gates-results.json': JSON.stringify(data),
  };
}

// Minimal text summary helper
function textSummary(data, options = {}) {
  return ''; // Let k6 generate default summary
}
