/**
 * Campaign Dashboard Routes Tests
 *
 * SWARM 6: Agent 4.5 - dashboard-data-provider
 *
 * Test coverage for all 6 dashboard endpoints:
 * - Dashboard overview
 * - Time-series data
 * - Capacity metrics
 * - Financial metrics
 * - Volunteer leaderboard
 * - Impact summary
 *
 * Tests include:
 * - Caching behavior (HIT/MISS)
 * - Query performance
 * - Error handling
 * - Data validation
 *
 * @module tests/campaign-dashboard
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { campaignDashboardRoutes } from '../src/routes/campaign-dashboard.js';
import { db } from '../src/db/index.js';
import { campaignMetricsSnapshots } from '@teei/shared-schema';
import { getCampaignCache } from '../src/cache/campaign-cache.js';

describe('Campaign Dashboard Routes', () => {
  let app: FastifyInstance;
  let testCampaignId: string;
  let cache: ReturnType<typeof getCampaignCache>;

  beforeAll(async () => {
    // Setup Fastify app
    app = Fastify();
    await app.register(campaignDashboardRoutes, { prefix: '/api' });

    // Get cache instance
    cache = getCampaignCache();

    // Create test campaign snapshot
    testCampaignId = '123e4567-e89b-12d3-a456-426614174000';

    // Insert test snapshot data
    await db.insert(campaignMetricsSnapshots).values({
      campaignId: testCampaignId,
      snapshotDate: new Date(),
      volunteersTarget: 50,
      volunteersCurrent: 45,
      volunteersUtilization: '0.9000',
      beneficiariesTarget: 50,
      beneficiariesCurrent: 38,
      beneficiariesUtilization: '0.7600',
      sessionsTarget: 500,
      sessionsCurrent: 243,
      sessionsUtilization: '0.4860',
      budgetAllocated: '25000.00',
      budgetSpent: '18500.00',
      budgetRemaining: '6500.00',
      budgetUtilization: '0.7400',
      sroiScore: '5.67',
      averageVISScore: '82.3',
      totalHoursLogged: '1245.50',
      totalSessionsCompleted: 243,
      seatsUsed: 45,
      seatsCommitted: 50,
      fullSnapshot: {
        campaignName: 'Test Campaign - Mentors for Syrian Refugees',
        status: 'active',
        programTemplateId: '223e4567-e89b-12d3-a456-426614174001',
        beneficiaryGroupId: '323e4567-e89b-12d3-a456-426614174002',
        companyId: '423e4567-e89b-12d3-a456-426614174003',
        engagement: {
          volunteerRetentionRate: 0.87,
          beneficiaryDropoutRate: 0.12,
          avgSessionsPerVolunteer: 5.4,
          avgSessionsPerBeneficiary: 6.4,
        },
        outcomeScores: {
          integration: 0.65,
          language: 0.78,
          jobReadiness: 0.82,
          wellbeing: 0.71,
        },
        alerts: [
          {
            type: 'capacity_warning',
            threshold: 0.8,
            currentValue: 0.9,
            message: 'Campaign approaching volunteer capacity (90%)',
          },
        ],
      },
    });

    // Insert additional snapshots for time-series testing
    for (let i = 1; i <= 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      await db.insert(campaignMetricsSnapshots).values({
        campaignId: testCampaignId,
        snapshotDate: date,
        volunteersTarget: 50,
        volunteersCurrent: 40 + i,
        volunteersUtilization: `0.${80 + i}00`,
        beneficiariesTarget: 50,
        beneficiariesCurrent: 30 + i,
        beneficiariesUtilization: `0.${60 + i}00`,
        sessionsTarget: 500,
        sessionsCurrent: 200 + (i * 10),
        sessionsUtilization: `0.${40 + i}00`,
        budgetAllocated: '25000.00',
        budgetSpent: `${15000 + i * 500}.00`,
        budgetRemaining: `${10000 - i * 500}.00`,
        budgetUtilization: `0.${60 + i}00`,
        sroiScore: `${5.0 + i * 0.1}`,
        averageVISScore: `${75.0 + i * 1.5}`,
        totalHoursLogged: `${1000 + i * 50}.00`,
        totalSessionsCompleted: 200 + (i * 10),
        fullSnapshot: {
          campaignName: 'Test Campaign - Mentors for Syrian Refugees',
          status: 'active',
          programTemplateId: '223e4567-e89b-12d3-a456-426614174001',
          beneficiaryGroupId: '323e4567-e89b-12d3-a456-426614174002',
          companyId: '423e4567-e89b-12d3-a456-426614174003',
        },
      });
    }

    await app.ready();
  });

  afterAll(async () => {
    // Cleanup test data
    await db
      .delete(campaignMetricsSnapshots)
      .where({ campaignId: testCampaignId });

    await app.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cache.invalidateCampaign(testCampaignId);
  });

  describe('GET /api/campaigns/:id/dashboard', () => {
    it('should return complete dashboard metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/dashboard`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('campaignId', testCampaignId);
      expect(data).toHaveProperty('campaignName');
      expect(data).toHaveProperty('status', 'active');
      expect(data).toHaveProperty('capacity');
      expect(data).toHaveProperty('impact');

      // Validate capacity structure
      expect(data.capacity.volunteers).toMatchObject({
        current: 45,
        target: 50,
        utilization: 0.9,
        status: 'warning',
      });

      expect(data.capacity.beneficiaries).toMatchObject({
        current: 38,
        target: 50,
        utilization: 0.76,
        status: 'healthy',
      });

      // Validate impact structure
      expect(data.impact).toMatchObject({
        sroi: 5.67,
        vis: 82.3,
        hoursLogged: 1245.5,
        sessionsCompleted: 243,
      });

      expect(data.impact.impactScore).toBeGreaterThan(0);

      // Should have X-Cache: MISS header on first request
      expect(response.headers['x-cache']).toBe('MISS');
    });

    it('should return cached data on second request', async () => {
      // First request
      await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/dashboard`,
      });

      // Second request should hit cache
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/dashboard`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-cache']).toBe('HIT');
    });

    it('should return 404 for non-existent campaign', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${nonExistentId}/dashboard`,
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('campaignId', nonExistentId);
    });

    it('should validate UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/campaigns/invalid-uuid/dashboard',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/campaigns/:id/time-series', () => {
    it('should return time-series data with default period (30d)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/time-series`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('campaignId', testCampaignId);
      expect(data).toHaveProperty('period');
      expect(data.period).toHaveProperty('start');
      expect(data.period).toHaveProperty('end');
      expect(data).toHaveProperty('dataPoints');
      expect(Array.isArray(data.dataPoints)).toBe(true);

      // Should have at least the test snapshots we created
      expect(data.dataPoints.length).toBeGreaterThan(0);

      // Validate data point structure
      const firstPoint = data.dataPoints[0];
      expect(firstPoint).toHaveProperty('date');
      expect(firstPoint).toHaveProperty('sroi');
      expect(firstPoint).toHaveProperty('vis');
      expect(firstPoint).toHaveProperty('hours');
      expect(firstPoint).toHaveProperty('sessions');
      expect(firstPoint).toHaveProperty('volunteersUtilization');
      expect(firstPoint).toHaveProperty('beneficiariesUtilization');
      expect(firstPoint).toHaveProperty('budgetUtilization');
    });

    it('should support different period options', async () => {
      const periods = ['7d', '30d', '90d', 'all'];

      for (const period of periods) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/campaigns/${testCampaignId}/time-series?period=${period}`,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data).toHaveProperty('dataPoints');
        expect(Array.isArray(data.dataPoints)).toBe(true);
      }
    });

    it('should support custom date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/time-series?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data.period.start).toBe(startDate.toISOString());
      expect(data.period.end).toBe(endDate.toISOString());
    });

    it('should cache time-series data', async () => {
      // First request
      const response1 = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/time-series?period=7d`,
      });

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second request should hit cache
      const response2 = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/time-series?period=7d`,
      });

      expect(response2.headers['x-cache']).toBe('HIT');
    });
  });

  describe('GET /api/campaigns/:id/capacity', () => {
    it('should return capacity metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/capacity`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('campaignId', testCampaignId);

      // Validate volunteers capacity
      expect(data.volunteers).toMatchObject({
        target: 50,
        current: 45,
        utilization: 0.9,
        remaining: 5,
        status: 'warning',
      });

      // Validate beneficiaries capacity
      expect(data.beneficiaries).toMatchObject({
        target: 50,
        current: 38,
        utilization: 0.76,
        remaining: 12,
        status: 'healthy',
      });

      // Validate sessions capacity
      expect(data.sessions).toMatchObject({
        target: 500,
        current: 243,
        remaining: 257,
      });

      // Validate alerts
      expect(Array.isArray(data.alerts)).toBe(true);
      expect(data.alerts.length).toBeGreaterThan(0);
      expect(data.alerts[0]).toHaveProperty('type', 'capacity_warning');
    });

    it('should cache capacity data', async () => {
      const response1 = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/capacity`,
      });

      expect(response1.headers['x-cache']).toBe('MISS');

      const response2 = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/capacity`,
      });

      expect(response2.headers['x-cache']).toBe('HIT');
    });
  });

  describe('GET /api/campaigns/:id/financials', () => {
    it('should return financial metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/financials`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('campaignId', testCampaignId);

      // Validate budget
      expect(data.budget).toMatchObject({
        allocated: 25000,
        spent: 18500,
        remaining: 6500,
        utilization: 0.74,
        currency: 'EUR',
      });

      // Validate burn rate
      expect(data.burnRate).toHaveProperty('current');
      expect(data.burnRate).toHaveProperty('projected');
      expect(data.burnRate).toHaveProperty('status');
      expect(['on_track', 'over_budget', 'under_budget']).toContain(data.burnRate.status);

      // Validate forecast
      expect(data.forecast).toHaveProperty('daysUntilDepletion');
      expect(data.forecast).toHaveProperty('projectedEndDate');
    });

    it('should calculate burn rate correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/financials`,
      });

      const data = JSON.parse(response.body);

      expect(data.burnRate.current).toBeGreaterThan(0);
      expect(data.burnRate.projected).toBeGreaterThan(0);

      // If spending is on track, current should be close to projected
      if (data.burnRate.status === 'on_track') {
        const ratio = data.burnRate.current / data.burnRate.projected;
        expect(ratio).toBeGreaterThan(0.8);
        expect(ratio).toBeLessThan(1.2);
      }
    });
  });

  describe('GET /api/campaigns/:id/volunteers', () => {
    it('should return volunteer leaderboard structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/volunteers`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('campaignId', testCampaignId);
      expect(data).toHaveProperty('topVolunteers');
      expect(data).toHaveProperty('totalVolunteers', 45);
      expect(data).toHaveProperty('averageVIS', 82.3);
      expect(data).toHaveProperty('averageHours');

      expect(Array.isArray(data.topVolunteers)).toBe(true);
    });

    it('should calculate average hours correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/volunteers`,
      });

      const data = JSON.parse(response.body);

      // averageHours = totalHours / totalVolunteers
      const expectedAverage = 1245.5 / 45;
      expect(data.averageHours).toBeCloseTo(expectedAverage, 2);
    });
  });

  describe('GET /api/campaigns/:id/impact', () => {
    it('should return impact summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/impact`,
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);

      expect(data).toHaveProperty('campaignId', testCampaignId);

      // Validate SROI
      expect(data.sroi).toMatchObject({
        score: 5.67,
        trend: expect.stringMatching(/^(up|down|stable)$/),
      });

      // Validate VIS
      expect(data.vis).toMatchObject({
        average: 82.3,
        trend: expect.stringMatching(/^(up|down|stable)$/),
      });

      // Validate outcomes
      expect(data.outcomes).toMatchObject({
        integration: 0.65,
        language: 0.78,
        jobReadiness: 0.82,
        wellbeing: 0.71,
      });

      // Validate engagement
      expect(data.engagement).toMatchObject({
        totalHours: 1245.5,
        totalSessions: 243,
        volunteerRetentionRate: 0.87,
        beneficiaryDropoutRate: 0.12,
      });

      // Validate evidence
      expect(Array.isArray(data.topEvidence)).toBe(true);
    });

    it('should calculate trend correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/impact`,
      });

      const data = JSON.parse(response.body);

      // SROI trend should be 'up' since latest (5.67) > previous (5.6)
      expect(['up', 'stable']).toContain(data.sroi.trend);

      // VIS trend should be 'up' since latest (82.3) > previous (80.8)
      expect(['up', 'stable']).toContain(data.vis.trend);

      // Change percent should be present
      if (data.sroi.changePercent !== null) {
        expect(typeof data.sroi.changePercent).toBe('number');
      }
    });
  });

  describe('Performance', () => {
    it('should complete dashboard request in <300ms (cached)', async () => {
      // Prime the cache
      await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/dashboard`,
      });

      // Measure cached request
      const start = Date.now();
      await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/dashboard`,
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should complete time-series request in <200ms (cached)', async () => {
      // Prime the cache
      await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/time-series?period=7d`,
      });

      // Measure cached request
      const start = Date.now();
      await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/time-series?period=7d`,
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all campaign caches', async () => {
      // Prime caches
      await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/dashboard`,
      });

      await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/capacity`,
      });

      // Invalidate
      const invalidated = await cache.invalidateCampaign(testCampaignId);
      expect(invalidated).toBeGreaterThan(0);

      // Next request should be cache MISS
      const response = await app.inject({
        method: 'GET',
        url: `/api/campaigns/${testCampaignId}/dashboard`,
      });

      expect(response.headers['x-cache']).toBe('MISS');
    });
  });
});
