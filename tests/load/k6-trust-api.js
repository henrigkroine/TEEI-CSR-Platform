/**
 * k6 Load Test: Trust API Endpoints
 * Agent: 4.3 Performance Test Engineer (k6)
 * Ref: AGENTS.md § Trust Boardroom Implementation
 *
 * Purpose: Test Trust API endpoints (/trust/v1/*) under load
 *
 * Endpoints tested:
 * - GET /trust/v1/evidence/:reportId
 * - GET /trust/v1/ledger/:reportId
 * - GET /trust/v1/policies
 * - GET /trust/v1/boardroom/:reportId/status
 *
 * Metrics to capture:
 * - Trust API latency (p95 < 300ms, p99 < 800ms)
 * - Ledger verification latency (p95 < 150ms)
 * - Evidence retrieval latency (p95 < 200ms)
 * - Policy lookup latency (p95 < 100ms)
 *
 * Run: k6 run tests/load/k6-trust-api.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const trustApiLatency = new Trend('trust_api_latency');
const ledgerVerificationLatency = new Trend('ledger_verification_latency');
const evidenceRetrievalLatency = new Trend('evidence_retrieval_latency');
const policyLookupLatency = new Trend('policy_lookup_latency');
const boardroomStatusLatency = new Trend('boardroom_status_latency');
const trustApiErrors = new Rate('trust_api_errors');

// Configuration
export const options = {
  scenarios: {
    trust_endpoints: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
    },
    trust_spike: {
      executor: 'ramping-vus',
      startTime: '2m',
      startVUs: 20,
      stages: [
        { duration: '30s', target: 100 }, // Spike to 100 VUs
        { duration: '1m', target: 100 },  // Sustain spike
        { duration: '30s', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    trust_api_latency: ['p(95)<200', 'p(99)<500'],
    ledger_verification_latency: ['p(95)<150', 'p(99)<300'],
    evidence_retrieval_latency: ['p(95)<200', 'p(99)<400'],
    policy_lookup_latency: ['p(95)<100', 'p(99)<200'],
    boardroom_status_latency: ['p(95)<150', 'p(99)<300'],
    trust_api_errors: ['rate<0.01'],
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = __ENV.TEST_TOKEN || 'test_bearer_token_for_load_testing';
const TEST_REPORT_ID = __ENV.TEST_REPORT_ID || 'report-trust-test-001';
const TEST_COMPANY_ID = __ENV.TEST_COMPANY_ID || 'company-trust-test-001';

// Generate test report IDs (simulating multiple reports in system)
function getTestReportId(vu, iter) {
  const reportIndex = (vu * 100 + iter) % 1000; // Cycle through 1000 report IDs
  return `report-trust-${reportIndex.toString().padStart(4, '0')}`;
}

// Main test function
export default function () {
  const reportId = getTestReportId(__VU, __ITER);

  // Weighted distribution of scenarios
  const rand = Math.random();

  if (rand < 0.3) {
    testEvidenceRetrieval(reportId);
  } else if (rand < 0.5) {
    testLedgerVerification(reportId);
  } else if (rand < 0.7) {
    testPolicyLookup();
  } else if (rand < 0.85) {
    testBoardroomStatus(reportId);
  } else {
    testFullTrustFlow(reportId);
  }

  // Think time between requests
  sleep(Math.random() * 1.5 + 0.5); // 0.5-2 seconds
}

/**
 * Scenario 1: Evidence Retrieval
 * GET /trust/v1/evidence/:reportId
 */
function testEvidenceRetrieval(reportId) {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/trust/v1/evidence/${reportId}`, {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'evidence_retrieval' },
  });
  const duration = Date.now() - start;

  evidenceRetrievalLatency.add(duration);
  trustApiLatency.add(duration);

  const success = check(response, {
    'evidence: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'evidence: has citations array': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.citations !== undefined;
        } catch {
          return false;
        }
      }
      return true; // 404 is acceptable
    },
    'evidence: response time < 300ms': (r) => r.timings.duration < 300,
  });

  if (!success && response.status >= 500) {
    trustApiErrors.add(1);
  }
}

/**
 * Scenario 2: Ledger Verification
 * GET /trust/v1/ledger/:reportId
 */
function testLedgerVerification(reportId) {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/trust/v1/ledger/${reportId}`, {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'ledger_verification' },
  });
  const duration = Date.now() - start;

  ledgerVerificationLatency.add(duration);
  trustApiLatency.add(duration);

  const success = check(response, {
    'ledger: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'ledger: has verified flag': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.verified !== undefined;
        } catch {
          return false;
        }
      }
      return true; // 404 is acceptable
    },
    'ledger: has timestamp': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.timestamp !== undefined || body.createdAt !== undefined;
        } catch {
          return false;
        }
      }
      return true; // 404 is acceptable
    },
    'ledger: response time < 200ms': (r) => r.timings.duration < 200,
  });

  if (!success && response.status >= 500) {
    trustApiErrors.add(1);
  }
}

/**
 * Scenario 3: Policy Lookup
 * GET /trust/v1/policies (public endpoint, no auth)
 */
function testPolicyLookup() {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/trust/v1/policies`, {
    tags: { scenario: 'policy_lookup' },
  });
  const duration = Date.now() - start;

  policyLookupLatency.add(duration);
  trustApiLatency.add(duration);

  const success = check(response, {
    'policies: status is 200': (r) => r.status === 200,
    'policies: has regions': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.regions !== undefined || body.policies !== undefined;
      } catch {
        return false;
      }
    },
    'policies: has retention info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.retention !== undefined ||
          (body.policies && body.policies.some((p) => p.retention !== undefined))
        );
      } catch {
        return false;
      }
    },
    'policies: response time < 150ms': (r) => r.timings.duration < 150,
  });

  if (!success && response.status >= 500) {
    trustApiErrors.add(1);
  }
}

/**
 * Scenario 4: Boardroom Status
 * GET /trust/v1/boardroom/:reportId/status
 */
function testBoardroomStatus(reportId) {
  const start = Date.now();
  const response = http.get(`${BASE_URL}/api/trust/v1/boardroom/${reportId}/status`, {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'boardroom_status' },
  });
  const duration = Date.now() - start;

  boardroomStatusLatency.add(duration);
  trustApiLatency.add(duration);

  const success = check(response, {
    'boardroom: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'boardroom: has status field': (r) => {
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined || body.state !== undefined;
        } catch {
          return false;
        }
      }
      return true; // 404 is acceptable
    },
    'boardroom: response time < 200ms': (r) => r.timings.duration < 200,
  });

  if (!success && response.status >= 500) {
    trustApiErrors.add(1);
  }
}

/**
 * Scenario 5: Full Trust Flow
 * Test complete trust verification flow: evidence → ledger → policies
 */
function testFullTrustFlow(reportId) {
  const flowStart = Date.now();

  // Step 1: Get evidence
  const evidenceResponse = http.get(`${BASE_URL}/api/trust/v1/evidence/${reportId}`, {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'full_trust_flow', step: 'evidence' },
  });

  check(evidenceResponse, {
    'flow evidence: status ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.1); // Small delay between steps

  // Step 2: Verify ledger
  const ledgerResponse = http.get(`${BASE_URL}/api/trust/v1/ledger/${reportId}`, {
    headers: {
      Authorization: `Bearer ${TEST_TOKEN}`,
    },
    tags: { scenario: 'full_trust_flow', step: 'ledger' },
  });

  check(ledgerResponse, {
    'flow ledger: status ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.1); // Small delay between steps

  // Step 3: Get policies
  const policiesResponse = http.get(`${BASE_URL}/api/trust/v1/policies`, {
    tags: { scenario: 'full_trust_flow', step: 'policies' },
  });

  check(policiesResponse, {
    'flow policies: status is 200': (r) => r.status === 200,
  });

  const flowDuration = Date.now() - flowStart;
  trustApiLatency.add(flowDuration);

  // Check total flow duration
  check({ flowDuration }, {
    'full flow: total time < 1s': () => flowDuration < 1000,
  });
}

/**
 * Setup: Run once before test starts
 */
export function setup() {
  console.log('Starting k6 Trust API load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log('Test duration: ~4 minutes (2m constant + 2m spike)');
  console.log('Endpoints: /trust/v1/evidence, /trust/v1/ledger, /trust/v1/policies, /trust/v1/boardroom');

  // Verify service is reachable
  const healthCheck = http.get(`${BASE_URL}/health/liveness`);
  if (healthCheck.status !== 200) {
    console.warn('Health check failed - service may not be ready');
  }

  // Test a sample Trust API endpoint
  const policiesCheck = http.get(`${BASE_URL}/api/trust/v1/policies`);
  if (policiesCheck.status !== 200) {
    console.warn('Trust API policies endpoint not responding - tests may fail');
  } else {
    console.log('✓ Trust API policies endpoint is reachable');
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
  console.log(`\n=== Trust API Load Test Complete ===`);
  console.log(`Total duration: ${duration.toFixed(1)}s`);
  console.log('Check results above for trust API, ledger, and evidence metrics\n');
}

/**
 * Handle summary data
 */
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
    '/home/user/TEEI-CSR-Platform/reports/k6-trust-api-results.json': JSON.stringify(data),
  };
}

// Minimal text summary helper
function textSummary(data, options = {}) {
  return ''; // Let k6 generate default summary
}
