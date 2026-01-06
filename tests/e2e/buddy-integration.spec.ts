/**
 * E2E Test: Buddy System → CSR Platform Integration
 *
 * Test Coverage:
 * - Complete user journey: Buddy matching → Event generation → Metrics display
 * - API integration between Buddy System and CSR Platform
 * - Event processing pipeline validation
 * - Dashboard widget rendering with real data
 * - Data lineage verification
 *
 * Success Criteria:
 * - Events published from Buddy System reach CSR Platform
 * - Profile data aggregated correctly
 * - Metrics calculated and displayed on dashboard
 * - Visual elements render correctly
 * - Performance < 3 seconds for end-to-end flow
 */

import { test, expect, Page } from '@playwright/test';
import { E2ETestDataFactory } from '../fixtures/e2e-data-factory';
import { BuddySystemAPI } from '../api-clients/buddy-system-api';
import { CSRPlatformAPI } from '../api-clients/csr-platform-api';
import { waitForEvent, waitForMetricUpdate } from '../utils/e2e-helpers';

// Test configuration
const BUDDY_SYSTEM_URL = process.env.BUDDY_SYSTEM_URL || 'http://localhost:3001';
const CSR_PLATFORM_URL = process.env.CSR_PLATFORM_URL || 'http://localhost:4321';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';

test.describe('Buddy System → CSR Platform Integration E2E', () => {
  let dataFactory: E2ETestDataFactory;
  let buddyAPI: BuddySystemAPI;
  let csrAPI: CSRPlatformAPI;
  let testUser1: any;
  let testUser2: any;

  test.beforeAll(async () => {
    dataFactory = new E2ETestDataFactory();
    buddyAPI = new BuddySystemAPI(BUDDY_SYSTEM_URL);
    csrAPI = new CSRPlatformAPI(API_GATEWAY_URL);

    // Create test users in Buddy System
    testUser1 = await dataFactory.createTestUser({
      email: `test-user-1-${Date.now()}@teei-e2e.com`,
      firstName: 'Alice',
      lastName: 'Requester',
      role: 'participant',
      primaryLanguage: 'en',
      interests: ['technology', 'mentorship'],
      location: 'Oslo, Norway'
    });

    testUser2 = await dataFactory.createTestUser({
      email: `test-user-2-${Date.now()}@teei-e2e.com`,
      firstName: 'Bob',
      lastName: 'Buddy',
      role: 'buddy',
      primaryLanguage: 'en',
      interests: ['technology', 'teaching'],
      location: 'Oslo, Norway'
    });

    // Authenticate test users
    await buddyAPI.authenticate(testUser1.email, 'test-password');
  });

  test.afterAll(async () => {
    // Cleanup test data
    await dataFactory.cleanup();
  });

  test.describe('User Journey: Buddy Matching Flow', () => {
    test('should create buddy match and reflect in CSR dashboard', async ({ page }) => {
      test.setTimeout(60000); // 60 second timeout for full flow

      // Step 1: Navigate to Buddy System and create match request
      await page.goto(`${BUDDY_SYSTEM_URL}/dashboard`);
      await expect(page).toHaveTitle(/Buddy System/);

      // Send buddy request
      await page.click('button:has-text("Find a Buddy")');
      await page.fill('input[name="search"]', testUser2.firstName);
      await page.click(`button[data-user-id="${testUser2.id}"]`);
      await page.click('button:has-text("Send Request")');

      // Verify request sent confirmation
      await expect(page.locator('.toast-success')).toContainText('Buddy request sent');

      // Step 2: Accept request as second user
      const user2Context = await page.context().browser()?.newContext();
      if (!user2Context) throw new Error('Failed to create context');

      const user2Page = await user2Context.newPage();
      await buddyAPI.authenticate(testUser2.email, 'test-password');
      await user2Page.goto(`${BUDDY_SYSTEM_URL}/dashboard`);

      await user2Page.click('button:has-text("Buddy Requests")');
      await user2Page.click(`button[data-request-id]:has-text("Accept")`);

      // Verify match confirmation
      await expect(user2Page.locator('.toast-success')).toContainText('Buddy match created');

      // Step 3: Wait for webhook event to be published
      await page.waitForTimeout(2000); // Allow webhook processing

      // Step 4: Verify event published to CSR Platform
      const matchEvent = await csrAPI.waitForEvent('buddy.match.created', {
        participantId: testUser1.id.toString(),
        buddyId: testUser2.id.toString(),
        timeout: 10000
      });

      expect(matchEvent).toBeDefined();
      expect(matchEvent.data.participantId).toBe(testUser1.id.toString());
      expect(matchEvent.data.buddyId).toBe(testUser2.id.toString());
      expect(matchEvent.metadata.correlationId).toBeDefined();

      // Step 5: Verify Profile Service updated
      const profile = await csrAPI.getUnifiedProfile(testUser1.id.toString());
      expect(profile).toBeDefined();
      expect(profile.identities).toContainEqual(
        expect.objectContaining({
          platform: 'buddy-system',
          platformUserId: testUser1.id.toString()
        })
      );

      // Step 6: Navigate to CSR Platform Dashboard
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await expect(page).toHaveTitle(/CSR Dashboard/);

      // Step 7: Verify metrics displayed
      const buddyMatchWidget = page.locator('[data-widget="buddy-matches"]');
      await expect(buddyMatchWidget).toBeVisible();

      const matchCount = await buddyMatchWidget.locator('.metric-value').textContent();
      expect(parseInt(matchCount || '0')).toBeGreaterThanOrEqual(1);

      // Step 8: Verify data lineage
      await buddyMatchWidget.click();
      const lineagePanel = page.locator('[data-panel="data-lineage"]');
      await expect(lineagePanel).toBeVisible();

      await expect(lineagePanel).toContainText('buddy-system');
      await expect(lineagePanel).toContainText('buddy.match.created');

      // Step 9: Take screenshot for visual regression
      await page.screenshot({
        path: 'test-results/screenshots/buddy-match-dashboard.png',
        fullPage: true
      });

      // Cleanup
      await user2Context.close();
    });

    test('should track match end event', async ({ page }) => {
      // Create a match first
      const matchId = await dataFactory.createBuddyMatch(testUser1.id, testUser2.id);

      // End the match
      await page.goto(`${BUDDY_SYSTEM_URL}/dashboard`);
      await page.click(`button[data-match-id="${matchId}"]:has-text("End Match")`);
      await page.fill('textarea[name="reason"]', 'Test completed successfully');
      await page.click('button:has-text("Confirm")');

      // Verify event published
      const endEvent = await csrAPI.waitForEvent('buddy.match.ended', {
        matchId: matchId.toString(),
        timeout: 10000
      });

      expect(endEvent).toBeDefined();
      expect(endEvent.data.reason).toContain('Test completed');

      // Verify dashboard reflects ended match
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      const endedMatchesWidget = page.locator('[data-widget="ended-matches"]');
      await expect(endedMatchesWidget).toBeVisible();
    });
  });

  test.describe('User Journey: Event Attendance Flow', () => {
    test('should track event creation, attendance, and display metrics', async ({ page }) => {
      test.setTimeout(60000);

      // Step 1: Create event in Buddy System
      await page.goto(`${BUDDY_SYSTEM_URL}/events/create`);

      const eventData = {
        title: `E2E Test Event ${Date.now()}`,
        description: 'Integration test event',
        category: 'workshop',
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        location: 'Oslo Tech Hub',
        capacity: 50
      };

      await page.fill('input[name="title"]', eventData.title);
      await page.fill('textarea[name="description"]', eventData.description);
      await page.selectOption('select[name="category"]', eventData.category);
      await page.fill('input[name="date"]', eventData.date.split('T')[0]);
      await page.fill('input[name="location"]', eventData.location);
      await page.fill('input[name="capacity"]', eventData.capacity.toString());
      await page.click('button[type="submit"]');

      // Verify event created
      await expect(page.locator('.toast-success')).toContainText('Event created');

      // Get event ID from URL
      const eventUrl = page.url();
      const eventId = eventUrl.match(/\/events\/(\d+)/)?.[1];
      expect(eventId).toBeDefined();

      // Step 2: Register for event
      await page.click('button:has-text("Register")');
      await expect(page.locator('.toast-success')).toContainText('Registration confirmed');

      // Step 3: Mark as attended (simulate event completion)
      await dataFactory.markEventAsAttended(parseInt(eventId!), testUser1.id);

      // Step 4: Wait for webhook event
      await page.waitForTimeout(2000);

      // Step 5: Verify event published
      const attendedEvent = await csrAPI.waitForEvent('buddy.event.attended', {
        userId: testUser1.id.toString(),
        timeout: 10000
      });

      expect(attendedEvent).toBeDefined();
      expect(attendedEvent.data.eventTitle).toBe(eventData.title);
      expect(attendedEvent.data.eventType).toBe('educational');

      // Step 6: Navigate to CSR Dashboard
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);

      // Step 7: Verify event metrics
      const eventWidget = page.locator('[data-widget="events-attended"]');
      await expect(eventWidget).toBeVisible();

      const eventCount = await eventWidget.locator('.metric-value').textContent();
      expect(parseInt(eventCount || '0')).toBeGreaterThanOrEqual(1);

      // Step 8: Verify event details in drill-down
      await eventWidget.click();
      const eventDetails = page.locator('[data-panel="event-details"]');
      await expect(eventDetails).toContainText(eventData.title);
      await expect(eventDetails).toContainText('workshop');

      // Step 9: Screenshot
      await page.screenshot({
        path: 'test-results/screenshots/event-attendance-dashboard.png',
        fullPage: true
      });
    });

    test('should calculate impact for multiple event attendances', async ({ page }) => {
      // Create and attend 3 events
      const eventIds = [];
      for (let i = 0; i < 3; i++) {
        const eventId = await dataFactory.createAndAttendEvent({
          userId: testUser1.id,
          category: 'cultural-exchange',
          title: `Cultural Event ${i + 1}`
        });
        eventIds.push(eventId);
      }

      // Wait for all events to process
      await page.waitForTimeout(5000);

      // Navigate to dashboard
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);

      // Verify aggregate metrics
      const impactWidget = page.locator('[data-widget="cultural-impact"]');
      await expect(impactWidget).toBeVisible();

      const impactScore = await impactWidget.locator('.metric-value').textContent();
      expect(parseFloat(impactScore || '0')).toBeGreaterThan(0);
    });
  });

  test.describe('User Journey: Skill Sharing Flow', () => {
    test('should track skill share completion and calculate SROI', async ({ page }) => {
      test.setTimeout(60000);

      // Step 1: Create skill in Buddy System
      const skill = await dataFactory.createSkill({
        name: 'JavaScript Programming',
        category: 'Technology',
        description: 'Learn modern JavaScript'
      });

      // Step 2: Create skill share session
      await page.goto(`${BUDDY_SYSTEM_URL}/skills`);
      await page.click(`button[data-skill-id="${skill.id}"]:has-text("Learn")`);

      // Select teacher (testUser2)
      await page.click(`button[data-user-id="${testUser2.id}"]`);
      await page.click('button:has-text("Request Session")');

      // Step 3: Complete session (as teacher)
      const sessionId = await dataFactory.completeSkillSession({
        skillId: skill.id,
        teacherId: testUser2.id,
        learnerId: testUser1.id,
        teacherRating: 5,
        learnerRating: 4,
        teacherFeedback: 'Great learner, very engaged',
        learnerFeedback: 'Excellent teacher, clear explanations'
      });

      // Step 4: Wait for events to publish
      await page.waitForTimeout(3000);

      // Step 5: Verify skill share event
      const skillEvent = await csrAPI.waitForEvent('buddy.skill_share.completed', {
        sessionId: sessionId.toString(),
        timeout: 10000
      });

      expect(skillEvent).toBeDefined();
      expect(skillEvent.data.skillName).toBe('JavaScript Programming');
      expect(skillEvent.data.teacherId).toBe(testUser2.id.toString());
      expect(skillEvent.data.learnerId).toBe(testUser1.id.toString());

      // Step 6: Verify feedback events
      const feedbackEvents = await csrAPI.getEventsByType('buddy.feedback.submitted', {
        matchId: sessionId.toString()
      });

      expect(feedbackEvents).toHaveLength(2); // Teacher and learner feedback

      // Step 7: Navigate to CSR Dashboard
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);

      // Step 8: Verify SROI calculation
      const sroiWidget = page.locator('[data-widget="sroi-calculator"]');
      await expect(sroiWidget).toBeVisible();

      const sroiValue = await sroiWidget.locator('.sroi-value').textContent();
      expect(parseFloat(sroiValue || '0')).toBeGreaterThan(0);

      // Step 9: Verify skill share metrics
      const skillShareWidget = page.locator('[data-widget="skill-sharing"]');
      await expect(skillShareWidget).toBeVisible();

      await skillShareWidget.click();
      const skillDetails = page.locator('[data-panel="skill-details"]');
      await expect(skillDetails).toContainText('JavaScript Programming');
      await expect(skillDetails).toContainText('Technology');

      // Step 10: Screenshot
      await page.screenshot({
        path: 'test-results/screenshots/skill-sharing-sroi.png',
        fullPage: true
      });
    });
  });

  test.describe('User Journey: Milestone Achievement Flow', () => {
    test('should track milestone achievements and display progress', async ({ page }) => {
      // Trigger milestone by completing multiple actions
      await dataFactory.triggerMilestone(testUser1.id, {
        milestoneId: 1,
        title: 'First Match',
        category: 'buddy-relationships',
        points: 100
      });

      // Wait for event processing
      await page.waitForTimeout(2000);

      // Verify milestone event
      const milestoneEvent = await csrAPI.waitForEvent('buddy.milestone.reached', {
        userId: testUser1.id.toString(),
        timeout: 10000
      });

      expect(milestoneEvent).toBeDefined();
      expect(milestoneEvent.data.milestoneTitle).toBe('First Match');
      expect(milestoneEvent.data.points).toBe(100);

      // Navigate to dashboard
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);

      // Verify milestone displayed
      const milestonesWidget = page.locator('[data-widget="milestones"]');
      await expect(milestonesWidget).toBeVisible();
      await expect(milestonesWidget).toContainText('First Match');
      await expect(milestonesWidget).toContainText('100');
    });
  });

  test.describe('Data Lineage Verification', () => {
    test('should trace data from Buddy System to CSR Dashboard', async ({ page }) => {
      // Create complete user journey
      const journeyData = await dataFactory.createCompleteUserJourney(testUser1.id);

      // Wait for all events to process
      await page.waitForTimeout(5000);

      // Navigate to CSR Dashboard
      await page.goto(`${CSR_PLATFORM_URL}/data-lineage`);

      // Search for user
      await page.fill('input[name="search"]', testUser1.email);
      await page.click('button:has-text("Search")');

      // Verify lineage visualization
      const lineageGraph = page.locator('[data-viz="lineage-graph"]');
      await expect(lineageGraph).toBeVisible();

      // Verify all event types present
      const eventNodes = lineageGraph.locator('.event-node');
      await expect(eventNodes).toHaveCount(journeyData.eventCount);

      // Verify source system labeled
      await expect(lineageGraph).toContainText('buddy-system');

      // Screenshot
      await page.screenshot({
        path: 'test-results/screenshots/data-lineage.png',
        fullPage: true
      });
    });

    test('should show event correlation IDs in lineage', async () => {
      const events = await csrAPI.getEventsByUser(testUser1.id.toString());

      // Verify all events have correlation IDs
      for (const event of events) {
        expect(event.metadata.correlationId).toBeDefined();
        expect(event.metadata.correlationId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      }

      // Verify events can be grouped by correlation
      const groupedEvents = events.reduce((acc, event) => {
        const corrId = event.metadata.correlationId;
        if (!acc[corrId]) acc[corrId] = [];
        acc[corrId].push(event);
        return acc;
      }, {} as Record<string, any[]>);

      expect(Object.keys(groupedEvents).length).toBeGreaterThan(0);
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should complete buddy match flow in < 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      // Create match
      const matchId = await dataFactory.createBuddyMatch(testUser1.id, testUser2.id);

      // Wait for event to reach CSR Platform
      await csrAPI.waitForEvent('buddy.match.created', {
        participantId: testUser1.id.toString(),
        timeout: 5000
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // 3 second SLA
      console.log(`Buddy match flow completed in ${duration}ms`);
    });

    test('should process 10 events in < 10 seconds', async ({ page }) => {
      const startTime = Date.now();

      // Create 10 events in parallel
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          dataFactory.createAndAttendEvent({
            userId: testUser1.id,
            category: 'social',
            title: `Batch Event ${i}`
          })
        );
      }

      await Promise.all(promises);

      // Wait for all events to process
      await page.waitForTimeout(5000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000);
      console.log(`Processed 10 events in ${duration}ms`);
    });
  });

  test.describe('Error Handling and Resilience', () => {
    test('should handle webhook delivery failures gracefully', async ({ page }) => {
      // Temporarily disable CSR webhook endpoint
      await csrAPI.disableWebhookEndpoint();

      // Create event in Buddy System
      await page.goto(`${BUDDY_SYSTEM_URL}/dashboard`);
      await page.click('button:has-text("Find a Buddy")');

      // Verify Buddy System continues to function
      await expect(page.locator('input[name="search"]')).toBeVisible();

      // Re-enable webhook endpoint
      await csrAPI.enableWebhookEndpoint();

      // Verify events are retried and eventually delivered
      await page.waitForTimeout(65000); // Wait for circuit breaker retry

      // Check if events eventually arrived
      const events = await csrAPI.getRecentEvents({ limit: 10 });
      expect(events.length).toBeGreaterThan(0);
    });

    test('should handle duplicate event IDs (idempotency)', async ({ page }) => {
      const eventData = {
        matchId: `test-match-${Date.now()}`,
        participantId: testUser1.id.toString(),
        buddyId: testUser2.id.toString()
      };

      // Send same event twice
      await csrAPI.publishEvent('buddy.match.created', eventData, 'test-correlation-id');
      await csrAPI.publishEvent('buddy.match.created', eventData, 'test-correlation-id');

      // Wait for processing
      await page.waitForTimeout(3000);

      // Verify only one event processed
      const profile = await csrAPI.getUnifiedProfile(testUser1.id.toString());
      const matchEvents = profile.events.filter((e: any) => e.type === 'buddy.match.created');

      // Should have deduplicated based on event ID or correlation ID
      expect(matchEvents.length).toBe(1);
    });
  });
});
