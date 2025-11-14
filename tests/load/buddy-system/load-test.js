/**
 * K6 Load Test: Buddy System → CSR Platform Integration
 *
 * Test Scenarios:
 * - Concurrent user simulation (1000+ buddies)
 * - Event burst testing (1000 events/sec)
 * - Sustained load testing (24 hours)
 * - Breaking point analysis
 * - Resource usage monitoring
 *
 * Usage:
 *   k6 run --vus 100 --duration 5m load-test.js                    # Basic load
 *   k6 run --vus 1000 --duration 1h load-test.js                   # Sustained load
 *   k6 run --stage 1m:100 --stage 5m:1000 --stage 1m:0 load-test.js # Ramp test
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import crypto from 'k6/crypto';

// Custom metrics
const webhookDeliveryRate = new Rate('webhook_delivery_success');
const webhookErrorRate = new Rate('webhook_errors');
const webhookLatency = new Trend('webhook_latency');
const eventProcessingTime = new Trend('event_processing_time');
const activeUsers = new Gauge('active_concurrent_users');
const eventsProcessed = new Counter('events_processed_total');

// Configuration
const BUDDY_CONNECTOR_URL = __ENV.BUDDY_CONNECTOR_URL || 'http://localhost:3010';
const WEBHOOK_SECRET = __ENV.BUDDY_WEBHOOK_SECRET || 'test-webhook-secret';
const API_GATEWAY_URL = __ENV.API_GATEWAY_URL || 'http://localhost:3000';

// Test options
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Warm up
    { duration: '5m', target: 100 },   // Normal load
    { duration: '5m', target: 500 },   // High load
    { duration: '5m', target: 1000 },  // Peak load
    { duration: '5m', target: 500 },   // Scale down
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
    'webhook_delivery_success': ['rate>0.99'],          // 99% success rate
    'webhook_errors': ['rate<0.01'],                    // <1% error rate
    'webhook_latency': ['p(95)<500', 'p(99)<1000'],
    'event_processing_time': ['p(95)<2000', 'p(99)<5000'],
  },
};

/**
 * Generate HMAC signature for webhook
 */
function generateSignature(payload, secret) {
  return crypto.hmac('sha256', secret, payload, 'hex');
}

/**
 * Generate random user ID
 */
function generateUserId() {
  return `user-${randomString(16)}`;
}

/**
 * Generate random match ID
 */
function generateMatchId() {
  return `match-${randomString(16)}`;
}

/**
 * Generate random event ID
 */
function generateEventId() {
  return `event-${randomString(32)}`;
}

/**
 * Create webhook payload
 */
function createWebhookPayload(eventType, data) {
  return {
    type: eventType,
    data: data,
    metadata: {
      id: generateEventId(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      correlationId: generateEventId(),
    },
  };
}

/**
 * Send webhook to Buddy Connector
 */
function sendWebhook(eventType, data) {
  const payload = createWebhookPayload(eventType, data);
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, WEBHOOK_SECRET);

  const startTime = Date.now();

  const response = http.post(
    `${BUDDY_CONNECTOR_URL}/v1/webhooks/buddy-events`,
    payloadString,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-delivery-id': generateEventId(),
        'x-webhook-signature': signature,
      },
      tags: { name: eventType },
    }
  );

  const endTime = Date.now();
  const latency = endTime - startTime;

  webhookLatency.add(latency);

  const success = check(response, {
    'webhook accepted': (r) => r.status === 200 || r.status === 202,
    'response time < 500ms': (r) => latency < 500,
  });

  if (success) {
    webhookDeliveryRate.add(true);
    eventsProcessed.add(1);
  } else {
    webhookDeliveryRate.add(false);
    webhookErrorRate.add(true);
  }

  return response;
}

/**
 * Verify event processed
 */
function verifyEventProcessed(eventId) {
  const startTime = Date.now();

  const response = http.get(
    `${API_GATEWAY_URL}/v1/events/${eventId}`,
    {
      headers: {
        'Authorization': `Bearer ${__ENV.TEST_API_TOKEN || 'test-token'}`,
      },
    }
  );

  const endTime = Date.now();
  const processingTime = endTime - startTime;

  eventProcessingTime.add(processingTime);

  return check(response, {
    'event found': (r) => r.status === 200,
    'event processed': (r) => {
      const body = JSON.parse(r.body);
      return body.processedAt !== null;
    },
  });
}

/**
 * Main test scenario
 */
export default function () {
  const userId = generateUserId();
  const buddyId = generateUserId();
  const matchId = generateMatchId();

  activeUsers.add(1);

  group('Buddy Match Lifecycle', function () {
    // 1. Match created
    group('Match Created', function () {
      const response = sendWebhook('buddy.match.created', {
        matchId: matchId,
        participantId: userId,
        buddyId: buddyId,
        matchedAt: new Date().toISOString(),
        matchingCriteria: {
          language: 'en',
          interests: ['technology', 'sports'],
          location: 'Oslo',
        },
      });

      check(response, {
        'match created webhook accepted': (r) => r.status === 200 || r.status === 202,
      });
    });

    sleep(randomIntBetween(1, 3));

    // 2. Check-in completed
    group('Check-in Completed', function () {
      const response = sendWebhook('buddy.checkin.completed', {
        matchId: matchId,
        userId: userId,
        mood: 'great',
        notes: 'Going well!',
        checkinDate: new Date().toISOString(),
      });

      check(response, {
        'checkin webhook accepted': (r) => r.status === 200 || r.status === 202,
      });
    });

    sleep(randomIntBetween(1, 2));

    // 3. Event attended
    group('Event Attended', function () {
      const response = sendWebhook('buddy.event.attended', {
        eventId: generateEventId(),
        matchId: matchId,
        userId: userId,
        eventType: 'workshop',
        attendedAt: new Date().toISOString(),
      });

      check(response, {
        'event attended webhook accepted': (r) => r.status === 200 || r.status === 202,
      });
    });

    sleep(randomIntBetween(1, 2));

    // 4. Skill share completed
    group('Skill Share Completed', function () {
      const response = sendWebhook('buddy.skill_share.completed', {
        sessionId: generateEventId(),
        matchId: matchId,
        teacherId: buddyId,
        learnerId: userId,
        skill: 'TypeScript',
        duration: 120,
        completedAt: new Date().toISOString(),
      });

      check(response, {
        'skill share webhook accepted': (r) => r.status === 200 || r.status === 202,
      });
    });

    sleep(randomIntBetween(1, 2));

    // 5. Feedback submitted
    group('Feedback Submitted', function () {
      const response = sendWebhook('buddy.feedback.submitted', {
        matchId: matchId,
        fromUserId: userId,
        toUserId: buddyId,
        rating: 5,
        feedbackText: 'Excellent buddy experience!',
        submittedAt: new Date().toISOString(),
      });

      check(response, {
        'feedback webhook accepted': (r) => r.status === 200 || r.status === 202,
      });
    });

    sleep(randomIntBetween(1, 2));

    // 6. Milestone reached
    group('Milestone Reached', function () {
      const response = sendWebhook('buddy.milestone.reached', {
        matchId: matchId,
        userId: userId,
        milestoneType: 'integration_complete',
        description: 'Successfully integrated',
        achievedAt: new Date().toISOString(),
      });

      check(response, {
        'milestone webhook accepted': (r) => r.status === 200 || r.status === 202,
      });
    });

    sleep(randomIntBetween(1, 2));

    // 7. Match ended
    group('Match Ended', function () {
      const response = sendWebhook('buddy.match.ended', {
        matchId: matchId,
        participantId: userId,
        buddyId: buddyId,
        endedAt: new Date().toISOString(),
        reason: 'program_completed',
      });

      check(response, {
        'match ended webhook accepted': (r) => r.status === 200 || r.status === 202,
      });
    });
  });

  activeUsers.add(-1);

  // Think time between user sessions
  sleep(randomIntBetween(5, 15));
}

/**
 * Burst test scenario - sends many events in rapid succession
 */
export function burstTest() {
  const userId = generateUserId();
  const matchId = generateMatchId();

  for (let i = 0; i < 100; i++) {
    sendWebhook('buddy.checkin.completed', {
      matchId: matchId,
      userId: userId,
      mood: 'great',
      checkinDate: new Date().toISOString(),
    });
  }

  sleep(1);
}

/**
 * Stress test scenario - sustained high load
 */
export function stressTest() {
  const userId = generateUserId();
  const matchId = generateMatchId();

  // Rapid-fire events without sleep
  for (let i = 0; i < 10; i++) {
    const eventType = [
      'buddy.checkin.completed',
      'buddy.event.attended',
      'buddy.skill_share.completed',
    ][i % 3];

    sendWebhook(eventType, {
      matchId: matchId,
      userId: userId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Setup function - runs once at start
 */
export function setup() {
  console.log('Starting load test...');
  console.log(`Target: ${BUDDY_CONNECTOR_URL}`);
  console.log(`API Gateway: ${API_GATEWAY_URL}`);

  // Verify services are accessible
  const healthCheck = http.get(`${BUDDY_CONNECTOR_URL}/v1/webhooks/health`);

  if (healthCheck.status !== 200) {
    throw new Error('Buddy Connector is not healthy');
  }

  return {
    startTime: Date.now(),
  };
}

/**
 * Teardown function - runs once at end
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

/**
 * Handle summary - custom summary output
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}
