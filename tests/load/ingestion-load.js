import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * k6 Load Test: Event Ingestion
 *
 * Tests high-volume event ingestion:
 * - Journey events
 * - Impact events
 * - Analytics events
 * - Batch ingestion
 *
 * Run: k6 run tests/load/ingestion-load.js
 */

// Custom metrics
const errorRate = new Rate('errors');
const ingestionTime = new Trend('ingestion_time');
const eventsIngested = new Counter('events_ingested');
const batchIngestionTime = new Trend('batch_ingestion_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp to 50 producers
    { duration: '3m', target: 100 },   // Ramp to 100 producers
    { duration: '5m', target: 100 },   // Sustain 100 producers
    { duration: '1m', target: 0 },     // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<1000'],      // 95% under 1s
    'http_req_failed': ['rate<0.01'],         // <1% errors (ingestion should be reliable)
    'errors': ['rate<0.01'],                  // <1% custom errors
    'ingestion_time': ['p(95)<500'],          // Single event p95 < 500ms
    'batch_ingestion_time': ['p(95)<2000'],   // Batch ingestion p95 < 2s
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4321';
const API_TOKEN = __ENV.API_TOKEN || '';

// Event types
const EVENT_TYPES = {
  JOURNEY: 'journey_event',
  IMPACT: 'impact_event',
  ANALYTICS: 'analytics_event',
  USER_ACTION: 'user_action',
};

// Generate realistic event data
function generateJourneyEvent() {
  return {
    type: EVENT_TYPES.JOURNEY,
    userId: `user_${Math.floor(Math.random() * 10000)}`,
    sessionId: `session_${Date.now()}_${Math.random()}`,
    eventName: ['page_view', 'button_click', 'form_submit'][Math.floor(Math.random() * 3)],
    timestamp: new Date().toISOString(),
    properties: {
      page: '/dashboard',
      referrer: 'https://example.com',
      browser: 'Chrome',
      device: 'desktop',
    },
  };
}

function generateImpactEvent() {
  return {
    type: EVENT_TYPES.IMPACT,
    organizationId: `org_${Math.floor(Math.random() * 100)}`,
    eventType: ['volunteer_hours', 'donation', 'program_enrollment'][Math.floor(Math.random() * 3)],
    timestamp: new Date().toISOString(),
    metrics: {
      value: Math.random() * 10000,
      quantity: Math.floor(Math.random() * 100),
      currency: 'USD',
    },
    metadata: {
      program: `Program ${Math.floor(Math.random() * 10)}`,
      category: ['education', 'health', 'environment'][Math.floor(Math.random() * 3)],
    },
  };
}

function generateAnalyticsEvent() {
  return {
    type: EVENT_TYPES.ANALYTICS,
    userId: `user_${Math.floor(Math.random() * 10000)}`,
    eventName: 'metric_calculated',
    timestamp: new Date().toISOString(),
    data: {
      metricType: ['sroi', 'vis', 'impact_score'][Math.floor(Math.random() * 3)],
      value: Math.random() * 100,
      duration: Math.random() * 1000,
    },
  };
}

function generateBatchEvents(count = 10) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const eventType = Math.random();
    if (eventType < 0.4) {
      events.push(generateJourneyEvent());
    } else if (eventType < 0.7) {
      events.push(generateImpactEvent());
    } else {
      events.push(generateAnalyticsEvent());
    }
  }
  return events;
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { 'Authorization': `Bearer ${API_TOKEN}` }),
  };

  // 70% single events, 30% batch ingestion
  if (Math.random() < 0.7) {
    ingestSingleEvent(headers);
  } else {
    ingestBatchEvents(headers);
  }

  sleep(0.1); // High-frequency ingestion (10 events/sec per VU)
}

function ingestSingleEvent(headers) {
  // Randomly choose event type
  const eventType = Math.random();
  let event;

  if (eventType < 0.4) {
    event = generateJourneyEvent();
  } else if (eventType < 0.7) {
    event = generateImpactEvent();
  } else {
    event = generateAnalyticsEvent();
  }

  const start = Date.now();

  const res = http.post(`${BASE_URL}/api/events/ingest`, JSON.stringify(event), {
    headers,
    tags: { name: 'ingest-single', event_type: event.type },
  });

  const duration = Date.now() - start;
  ingestionTime.add(duration);

  const success = check(res, {
    'ingestion successful': (r) => [200, 201, 202].includes(r.status),
    'ingestion has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.eventId !== undefined || body.id !== undefined || r.status === 202;
      } catch {
        return r.status === 202; // Accepted (async processing)
      }
    },
    'ingestion < 500ms': () => duration < 500,
  });

  if (success) {
    eventsIngested.add(1);
    errorRate.add(0);
  } else {
    errorRate.add(1);
    console.error(`Event ingestion failed: ${res.status} (${duration}ms)`);
  }
}

function ingestBatchEvents(headers) {
  const batchSize = Math.floor(Math.random() * 20) + 10; // 10-30 events per batch
  const events = generateBatchEvents(batchSize);

  const start = Date.now();

  const res = http.post(`${BASE_URL}/api/events/ingest/batch`, JSON.stringify({ events }), {
    headers,
    tags: { name: 'ingest-batch', batch_size: batchSize },
  });

  const duration = Date.now() - start;
  batchIngestionTime.add(duration);

  const success = check(res, {
    'batch ingestion successful': (r) => [200, 201, 202].includes(r.status),
    'batch ingestion confirmed': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accepted !== undefined || body.count !== undefined || r.status === 202;
      } catch {
        return r.status === 202;
      }
    },
    'batch ingestion < 2s': () => duration < 2000,
  });

  if (success) {
    eventsIngested.add(batchSize);
    errorRate.add(0);
    console.log(`Batch ingested: ${batchSize} events (${duration}ms)`);
  } else {
    errorRate.add(1);
    console.error(`Batch ingestion failed: ${res.status} (${duration}ms)`);
  }
}

export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data),
    'results/ingestion-load-summary.json': JSON.stringify(data),
  };

  return summary;
}

function textSummary(data) {
  let summary = '\n';
  summary += 'Event Ingestion Load Test Summary\n';
  summary += '==================================\n\n';

  // Overall stats
  const totalRequests = data.metrics.http_reqs.values.count;
  const totalEvents = data.metrics.events_ingested.values.count;
  const testDuration = data.state.testRunDurationMs / 1000;

  summary += `Total Requests: ${totalRequests}\n`;
  summary += `Total Events Ingested: ${totalEvents}\n`;
  summary += `Test Duration: ${testDuration.toFixed(0)}s\n`;
  summary += `Events/Second: ${(totalEvents / testDuration).toFixed(2)}\n`;
  summary += `Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;

  // Response times
  summary += 'Overall Response Times:\n';
  summary += `  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  P50: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms\n`;
  summary += `  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;

  // Ingestion times
  summary += 'Single Event Ingestion Times:\n';
  summary += `  Avg: ${data.metrics.ingestion_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95: ${data.metrics.ingestion_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99: ${data.metrics.ingestion_time.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += 'Batch Ingestion Times:\n';
  summary += `  Avg: ${data.metrics.batch_ingestion_time.values.avg.toFixed(2)}ms\n`;
  summary += `  P95: ${data.metrics.batch_ingestion_time.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  P99: ${data.metrics.batch_ingestion_time.values['p(99)'].toFixed(2)}ms\n\n`;

  // Throughput analysis
  const p95Latency = data.metrics.http_req_duration.values['p(95)'];
  const avgVUs = data.metrics.vus.values.value;
  const theoreticalThroughput = (avgVUs / (p95Latency / 1000)).toFixed(2);

  summary += `Throughput Analysis:\n`;
  summary += `  Actual Throughput: ${(totalRequests / testDuration).toFixed(2)} req/s\n`;
  summary += `  Theoretical Max: ${theoreticalThroughput} req/s (based on P95 latency)\n\n`;

  // Error rate
  summary += `Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;

  // Performance assessment
  const errorRatePercent = data.metrics.errors.values.rate * 100;
  const p95UnderThreshold = p95Latency < 1000;

  summary += '\nPerformance Assessment:\n';
  if (errorRatePercent < 1 && p95UnderThreshold) {
    summary += '  ✅ EXCELLENT - System handling load well\n';
  } else if (errorRatePercent < 5 && p95Latency < 2000) {
    summary += '  ⚠️  ACCEPTABLE - System under stress\n';
  } else {
    summary += '  ❌ POOR - System struggling with load\n';
  }

  return summary;
}
