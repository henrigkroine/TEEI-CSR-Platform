/**
 * Campaign Dashboard Data Routes
 *
 * SWARM 6: Agent 4.5 - dashboard-data-provider
 *
 * High-performance dashboard data APIs for campaign metrics:
 * - Dashboard overview (all metrics in single request)
 * - Time-series data (metrics over time)
 * - Capacity utilization (seats/credits/learners)
 * - Financials (budget tracking)
 * - Volunteers (leaderboard)
 * - Impact (SROI, VIS, outcomes)
 *
 * Features:
 * - Redis caching (5min active, 1hr completed)
 * - Optimized queries (<300ms target)
 * - Cache warming for top campaigns
 * - Pattern-based invalidation
 *
 * @see /docs/CAMPAIGN_DASHBOARD_QUERIES.md
 * @module routes/campaign-dashboard
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { campaignMetricsSnapshots } from '@teei/shared-schema';
import { eq, desc, and, gte, lte, sql, asc } from 'drizzle-orm';
import {
  getCampaignCache,
  type CampaignDashboardResponse,
  type CampaignTimeSeriesResponse,
  type CampaignCapacityResponse,
  type CampaignFinancialsResponse,
  type CampaignVolunteersResponse,
  type CampaignImpactResponse,
} from '../cache/campaign-cache.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CampaignIdParamSchema = z.object({
  id: z.string().uuid('Invalid campaign ID'),
});

const TimeSeriesQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get utilization status based on percentage
 */
function getUtilizationStatus(utilization: number): 'low' | 'healthy' | 'warning' | 'critical' {
  if (utilization >= 1.0) return 'critical';
  if (utilization >= 0.8) return 'warning';
  if (utilization >= 0.5) return 'healthy';
  return 'low';
}

/**
 * Calculate impact score (normalized SROI + VIS)
 */
function calculateImpactScore(sroi: number | null, vis: number | null): number | null {
  if (sroi === null && vis === null) return null;
  const sroiNormalized = sroi ? sroi / 10 : 0; // SROI scale 0-10
  const visNormalized = vis ? vis / 100 : 0;   // VIS scale 0-100
  return ((sroiNormalized + visNormalized) / 2) * 10; // 0-10 scale
}

/**
 * Parse date range from period parameter
 */
function parsePeriodToDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'all':
      startDate.setFullYear(2020, 0, 1); // Far past date
      break;
  }

  return { startDate, endDate };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/campaigns/:id/dashboard
 *
 * All metrics for dashboard in a single request
 * Target: <300ms (cached), <500ms (uncached)
 */
async function getDashboard(
  request: FastifyRequest<{ Params: z.infer<typeof CampaignIdParamSchema> }>,
  reply: FastifyReply
) {
  const { id: campaignId } = request.params;
  const cache = getCampaignCache();

  // Try cache first
  const cached = await cache.getDashboard(campaignId);
  if (cached) {
    reply.header('X-Cache', 'HIT');
    return cached;
  }

  // Fetch latest snapshot from database
  const snapshot = await db
    .select()
    .from(campaignMetricsSnapshots)
    .where(eq(campaignMetricsSnapshots.campaignId, campaignId))
    .orderBy(desc(campaignMetricsSnapshots.snapshotDate))
    .limit(1);

  if (snapshot.length === 0) {
    return reply.status(404).send({
      error: 'Campaign not found or no metrics available',
      campaignId,
    });
  }

  const latest = snapshot[0];
  const volunteersUtil = parseFloat(latest.volunteersUtilization);
  const beneficiariesUtil = parseFloat(latest.beneficiariesUtilization);
  const budgetUtil = parseFloat(latest.budgetUtilization);
  const sroi = latest.sroiScore ? parseFloat(latest.sroiScore) : null;
  const vis = latest.averageVISScore ? parseFloat(latest.averageVISScore) : null;

  const response: CampaignDashboardResponse = {
    campaignId,
    campaignName: latest.fullSnapshot.campaignName,
    status: latest.fullSnapshot.status,
    snapshotDate: latest.snapshotDate.toISOString(),
    capacity: {
      volunteers: {
        current: latest.volunteersCurrent,
        target: latest.volunteersTarget,
        utilization: volunteersUtil,
        status: getUtilizationStatus(volunteersUtil),
      },
      beneficiaries: {
        current: latest.beneficiariesCurrent,
        target: latest.beneficiariesTarget,
        utilization: beneficiariesUtil,
        status: getUtilizationStatus(beneficiariesUtil),
      },
      budget: {
        spent: parseFloat(latest.budgetSpent),
        allocated: parseFloat(latest.budgetAllocated),
        utilization: budgetUtil,
        currency: 'EUR', // TODO: Get from campaign
        status: getUtilizationStatus(budgetUtil),
      },
    },
    impact: {
      sroi,
      vis,
      hoursLogged: parseFloat(latest.totalHoursLogged),
      sessionsCompleted: latest.totalSessionsCompleted,
      impactScore: calculateImpactScore(sroi, vis),
    },
  };

  // Cache the response
  await cache.setDashboard(campaignId, response, latest.fullSnapshot.status);
  reply.header('X-Cache', 'MISS');

  return response;
}

/**
 * GET /api/campaigns/:id/time-series
 *
 * Metrics over time (snapshots)
 * Target: <200ms (cached), <400ms (uncached)
 */
async function getTimeSeries(
  request: FastifyRequest<{
    Params: z.infer<typeof CampaignIdParamSchema>;
    Querystring: z.infer<typeof TimeSeriesQuerySchema>;
  }>,
  reply: FastifyReply
) {
  const { id: campaignId } = request.params;
  const { period, startDate: startDateStr, endDate: endDateStr } = request.query;
  const cache = getCampaignCache();

  // Parse date range
  let startDate: Date;
  let endDate: Date;

  if (startDateStr && endDateStr) {
    startDate = new Date(startDateStr);
    endDate = new Date(endDateStr);
  } else if (period) {
    ({ startDate, endDate } = parsePeriodToDateRange(period));
  } else {
    ({ startDate, endDate } = parsePeriodToDateRange('30d'));
  }

  const cacheKey = `${startDate.toISOString()}_${endDate.toISOString()}`;

  // Try cache first
  const cached = await cache.getTimeSeries(campaignId, cacheKey);
  if (cached) {
    reply.header('X-Cache', 'HIT');
    return cached;
  }

  // Fetch time-series data
  const snapshots = await db
    .select({
      snapshotDate: campaignMetricsSnapshots.snapshotDate,
      volunteersUtilization: campaignMetricsSnapshots.volunteersUtilization,
      beneficiariesUtilization: campaignMetricsSnapshots.beneficiariesUtilization,
      budgetUtilization: campaignMetricsSnapshots.budgetUtilization,
      sroiScore: campaignMetricsSnapshots.sroiScore,
      averageVISScore: campaignMetricsSnapshots.averageVISScore,
      totalHoursLogged: campaignMetricsSnapshots.totalHoursLogged,
      totalSessionsCompleted: campaignMetricsSnapshots.totalSessionsCompleted,
    })
    .from(campaignMetricsSnapshots)
    .where(
      and(
        eq(campaignMetricsSnapshots.campaignId, campaignId),
        gte(campaignMetricsSnapshots.snapshotDate, startDate),
        lte(campaignMetricsSnapshots.snapshotDate, endDate)
      )
    )
    .orderBy(asc(campaignMetricsSnapshots.snapshotDate));

  const response: CampaignTimeSeriesResponse = {
    campaignId,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    dataPoints: snapshots.map((s) => ({
      date: s.snapshotDate.toISOString(),
      sroi: s.sroiScore ? parseFloat(s.sroiScore) : null,
      vis: s.averageVISScore ? parseFloat(s.averageVISScore) : null,
      hours: parseFloat(s.totalHoursLogged),
      sessions: s.totalSessionsCompleted,
      volunteersUtilization: parseFloat(s.volunteersUtilization),
      beneficiariesUtilization: parseFloat(s.beneficiariesUtilization),
      budgetUtilization: parseFloat(s.budgetUtilization),
    })),
  };

  // Cache the response
  await cache.setTimeSeries(campaignId, cacheKey, response);
  reply.header('X-Cache', 'MISS');

  return response;
}

/**
 * GET /api/campaigns/:id/capacity
 *
 * Capacity utilization (seats/credits/learners)
 * Target: <150ms
 */
async function getCapacity(
  request: FastifyRequest<{ Params: z.infer<typeof CampaignIdParamSchema> }>,
  reply: FastifyReply
) {
  const { id: campaignId } = request.params;
  const cache = getCampaignCache();

  // Try cache first
  const cached = await cache.getCapacity(campaignId);
  if (cached) {
    reply.header('X-Cache', 'HIT');
    return cached;
  }

  // Fetch latest snapshot
  const snapshot = await db
    .select()
    .from(campaignMetricsSnapshots)
    .where(eq(campaignMetricsSnapshots.campaignId, campaignId))
    .orderBy(desc(campaignMetricsSnapshots.snapshotDate))
    .limit(1);

  if (snapshot.length === 0) {
    return reply.status(404).send({
      error: 'Campaign not found or no metrics available',
      campaignId,
    });
  }

  const latest = snapshot[0];
  const volunteersUtil = parseFloat(latest.volunteersUtilization);
  const beneficiariesUtil = parseFloat(latest.beneficiariesUtilization);
  const sessionsUtil = latest.sessionsUtilization ? parseFloat(latest.sessionsUtilization) : null;

  const response: CampaignCapacityResponse = {
    campaignId,
    volunteers: {
      target: latest.volunteersTarget,
      current: latest.volunteersCurrent,
      utilization: volunteersUtil,
      remaining: Math.max(0, latest.volunteersTarget - latest.volunteersCurrent),
      status: getUtilizationStatus(volunteersUtil),
    },
    beneficiaries: {
      target: latest.beneficiariesTarget,
      current: latest.beneficiariesCurrent,
      utilization: beneficiariesUtil,
      remaining: Math.max(0, latest.beneficiariesTarget - latest.beneficiariesCurrent),
      status: getUtilizationStatus(beneficiariesUtil),
    },
    sessions: {
      target: latest.sessionsTarget,
      current: latest.sessionsCurrent,
      utilization: sessionsUtil,
      remaining:
        latest.sessionsTarget !== null
          ? Math.max(0, latest.sessionsTarget - latest.sessionsCurrent)
          : null,
      status: sessionsUtil !== null ? getUtilizationStatus(sessionsUtil) : null,
    },
    alerts: latest.fullSnapshot.alerts || [],
  };

  // Cache the response
  await cache.setCapacity(campaignId, response, latest.fullSnapshot.status);
  reply.header('X-Cache', 'MISS');

  return response;
}

/**
 * GET /api/campaigns/:id/financials
 *
 * Budget spend tracking
 * Target: <150ms
 */
async function getFinancials(
  request: FastifyRequest<{ Params: z.infer<typeof CampaignIdParamSchema> }>,
  reply: FastifyReply
) {
  const { id: campaignId } = request.params;
  const cache = getCampaignCache();

  // Try cache first
  const cached = await cache.getFinancials(campaignId);
  if (cached) {
    reply.header('X-Cache', 'HIT');
    return cached;
  }

  // Fetch latest snapshot
  const snapshot = await db
    .select()
    .from(campaignMetricsSnapshots)
    .where(eq(campaignMetricsSnapshots.campaignId, campaignId))
    .orderBy(desc(campaignMetricsSnapshots.snapshotDate))
    .limit(1);

  if (snapshot.length === 0) {
    return reply.status(404).send({
      error: 'Campaign not found or no metrics available',
      campaignId,
    });
  }

  const latest = snapshot[0];
  const budgetAllocated = parseFloat(latest.budgetAllocated);
  const budgetSpent = parseFloat(latest.budgetSpent);
  const budgetRemaining = parseFloat(latest.budgetRemaining);
  const budgetUtil = parseFloat(latest.budgetUtilization);

  // Calculate burn rate (simplified - would need historical data for accurate calculation)
  const currentBurnRate = budgetSpent / 30; // Rough estimate per day
  const projectedBurnRate = budgetAllocated / 90; // Assume 90-day campaign

  let status: 'on_track' | 'over_budget' | 'under_budget' = 'on_track';
  if (budgetUtil > 1.0) status = 'over_budget';
  else if (currentBurnRate < projectedBurnRate * 0.8) status = 'under_budget';

  // Forecast days until budget depletion
  let daysUntilDepletion: number | null = null;
  let projectedEndDate: string | null = null;
  if (currentBurnRate > 0 && budgetRemaining > 0) {
    daysUntilDepletion = Math.ceil(budgetRemaining / currentBurnRate);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysUntilDepletion);
    projectedEndDate = endDate.toISOString();
  }

  const response: CampaignFinancialsResponse = {
    campaignId,
    budget: {
      allocated: budgetAllocated,
      spent: budgetSpent,
      remaining: budgetRemaining,
      utilization: budgetUtil,
      currency: 'EUR', // TODO: Get from campaign
    },
    burnRate: {
      current: currentBurnRate,
      projected: projectedBurnRate,
      status,
    },
    forecast: {
      daysUntilDepletion,
      projectedEndDate,
    },
  };

  // Cache the response
  await cache.setFinancials(campaignId, response, latest.fullSnapshot.status);
  reply.header('X-Cache', 'MISS');

  return response;
}

/**
 * GET /api/campaigns/:id/volunteers
 *
 * Volunteer leaderboard (top VIS)
 * Target: <200ms
 *
 * NOTE: This would require joining with volunteer/user data
 * For now, returning mock structure
 */
async function getVolunteers(
  request: FastifyRequest<{ Params: z.infer<typeof CampaignIdParamSchema> }>,
  reply: FastifyReply
) {
  const { id: campaignId } = request.params;
  const cache = getCampaignCache();

  // Try cache first
  const cached = await cache.getVolunteers(campaignId);
  if (cached) {
    reply.header('X-Cache', 'HIT');
    return cached;
  }

  // Fetch latest snapshot for aggregate data
  const snapshot = await db
    .select()
    .from(campaignMetricsSnapshots)
    .where(eq(campaignMetricsSnapshots.campaignId, campaignId))
    .orderBy(desc(campaignMetricsSnapshots.snapshotDate))
    .limit(1);

  if (snapshot.length === 0) {
    return reply.status(404).send({
      error: 'Campaign not found or no metrics available',
      campaignId,
    });
  }

  const latest = snapshot[0];

  // TODO: Query actual volunteer data from program instances / sessions
  // For now, return structure with aggregate data
  const response: CampaignVolunteersResponse = {
    campaignId,
    topVolunteers: [], // TODO: Implement actual query
    totalVolunteers: latest.volunteersCurrent,
    averageVIS: latest.averageVISScore ? parseFloat(latest.averageVISScore) : 0,
    averageHours:
      latest.volunteersCurrent > 0
        ? parseFloat(latest.totalHoursLogged) / latest.volunteersCurrent
        : 0,
  };

  // Cache the response
  await cache.setVolunteers(campaignId, response, latest.fullSnapshot.status);
  reply.header('X-Cache', 'MISS');

  return response;
}

/**
 * GET /api/campaigns/:id/impact
 *
 * Impact summary (SROI, VIS, outcomes)
 * Target: <200ms
 */
async function getImpact(
  request: FastifyRequest<{ Params: z.infer<typeof CampaignIdParamSchema> }>,
  reply: FastifyReply
) {
  const { id: campaignId } = request.params;
  const cache = getCampaignCache();

  // Try cache first
  const cached = await cache.getImpact(campaignId);
  if (cached) {
    reply.header('X-Cache', 'HIT');
    return cached;
  }

  // Fetch latest and previous snapshots for trend analysis
  const snapshots = await db
    .select()
    .from(campaignMetricsSnapshots)
    .where(eq(campaignMetricsSnapshots.campaignId, campaignId))
    .orderBy(desc(campaignMetricsSnapshots.snapshotDate))
    .limit(2);

  if (snapshots.length === 0) {
    return reply.status(404).send({
      error: 'Campaign not found or no metrics available',
      campaignId,
    });
  }

  const latest = snapshots[0];
  const previous = snapshots.length > 1 ? snapshots[1] : null;

  // Calculate trends
  const currentSroi = latest.sroiScore ? parseFloat(latest.sroiScore) : null;
  const previousSroi = previous?.sroiScore ? parseFloat(previous.sroiScore) : null;
  const sroiTrend = calculateTrend(currentSroi, previousSroi);

  const currentVis = latest.averageVISScore ? parseFloat(latest.averageVISScore) : null;
  const previousVis = previous?.averageVISScore ? parseFloat(previous.averageVISScore) : null;
  const visTrend = calculateTrend(currentVis, previousVis);

  const response: CampaignImpactResponse = {
    campaignId,
    sroi: {
      score: currentSroi,
      trend: sroiTrend.direction,
      changePercent: sroiTrend.changePercent,
    },
    vis: {
      average: currentVis,
      trend: visTrend.direction,
      changePercent: visTrend.changePercent,
    },
    outcomes: {
      integration: latest.fullSnapshot.outcomeScores?.integration || null,
      language: latest.fullSnapshot.outcomeScores?.language || null,
      jobReadiness: latest.fullSnapshot.outcomeScores?.jobReadiness || null,
      wellbeing: latest.fullSnapshot.outcomeScores?.wellbeing || null,
    },
    engagement: {
      totalHours: parseFloat(latest.totalHoursLogged),
      totalSessions: latest.totalSessionsCompleted,
      volunteerRetentionRate: latest.fullSnapshot.engagement?.volunteerRetentionRate || null,
      beneficiaryDropoutRate: latest.fullSnapshot.engagement?.beneficiaryDropoutRate || null,
    },
    topEvidence: [], // TODO: Query from evidence_snippets table
  };

  // Cache the response
  await cache.setImpact(campaignId, response, latest.fullSnapshot.status);
  reply.header('X-Cache', 'MISS');

  return response;
}

/**
 * Helper: Calculate trend direction and change percentage
 */
function calculateTrend(
  current: number | null,
  previous: number | null
): { direction: 'up' | 'down' | 'stable' | null; changePercent: number | null } {
  if (current === null || previous === null) {
    return { direction: null, changePercent: null };
  }

  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) < 2) {
    direction = 'stable';
  } else if (change > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return { direction, changePercent };
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export const campaignDashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // Dashboard overview
  fastify.get('/campaigns/:id/dashboard', {
    schema: {
      description: 'Get complete dashboard metrics for a campaign (single request)',
      tags: ['campaigns', 'dashboard'],
      params: CampaignIdParamSchema,
      response: {
        200: {
          description: 'Campaign dashboard data',
          type: 'object',
        },
        404: {
          description: 'Campaign not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            campaignId: { type: 'string' },
          },
        },
      },
    },
    handler: getDashboard,
  });

  // Time-series data
  fastify.get('/campaigns/:id/time-series', {
    schema: {
      description: 'Get time-series metrics for a campaign',
      tags: ['campaigns', 'dashboard'],
      params: CampaignIdParamSchema,
      querystring: TimeSeriesQuerySchema,
      response: {
        200: {
          description: 'Time-series data',
          type: 'object',
        },
      },
    },
    handler: getTimeSeries,
  });

  // Capacity metrics
  fastify.get('/campaigns/:id/capacity', {
    schema: {
      description: 'Get capacity utilization metrics',
      tags: ['campaigns', 'dashboard'],
      params: CampaignIdParamSchema,
      response: {
        200: {
          description: 'Capacity data',
          type: 'object',
        },
      },
    },
    handler: getCapacity,
  });

  // Financial metrics
  fastify.get('/campaigns/:id/financials', {
    schema: {
      description: 'Get budget and financial metrics',
      tags: ['campaigns', 'dashboard'],
      params: CampaignIdParamSchema,
      response: {
        200: {
          description: 'Financial data',
          type: 'object',
        },
      },
    },
    handler: getFinancials,
  });

  // Volunteer leaderboard
  fastify.get('/campaigns/:id/volunteers', {
    schema: {
      description: 'Get volunteer leaderboard (top VIS scores)',
      tags: ['campaigns', 'dashboard'],
      params: CampaignIdParamSchema,
      response: {
        200: {
          description: 'Volunteer leaderboard',
          type: 'object',
        },
      },
    },
    handler: getVolunteers,
  });

  // Impact summary
  fastify.get('/campaigns/:id/impact', {
    schema: {
      description: 'Get impact summary (SROI, VIS, outcomes)',
      tags: ['campaigns', 'dashboard'],
      params: CampaignIdParamSchema,
      response: {
        200: {
          description: 'Impact summary',
          type: 'object',
        },
      },
    },
    handler: getImpact,
  });
};
