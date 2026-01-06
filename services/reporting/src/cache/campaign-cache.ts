/**
 * Campaign Dashboard Cache Layer
 *
 * SWARM 6: Agent 4.5 - dashboard-data-provider
 *
 * Provides high-performance caching for campaign dashboard data:
 * - Dashboard overview metrics
 * - Time-series data
 * - Capacity metrics
 * - Financial metrics
 * - Volunteer leaderboards
 * - Impact summaries
 *
 * Features:
 * - Differential TTLs (active vs completed campaigns)
 * - Cache warming for top campaigns
 * - Pattern-based invalidation
 * - Campaign-specific invalidation
 *
 * @module cache/campaign-cache
 */

import { RedisCache, getRedisCache } from './redis-cache.js';

/**
 * Campaign-specific cache configuration
 */
export interface CampaignCacheConfig {
  ttl: {
    activeCampaigns: number;    // 5 minutes for active campaigns
    completedCampaigns: number; // 1 hour for completed campaigns
    timeSeries: number;         // 10 minutes for time-series data
    forecast: number;           // 1 hour for forecast/projections
  };
}

const DEFAULT_CAMPAIGN_CACHE_CONFIG: CampaignCacheConfig = {
  ttl: {
    activeCampaigns: 300,      // 5 minutes
    completedCampaigns: 3600,  // 1 hour
    timeSeries: 600,           // 10 minutes
    forecast: 3600,            // 1 hour
  },
};

/**
 * Campaign Dashboard Response Types
 */
export interface CampaignDashboardResponse {
  campaignId: string;
  campaignName: string;
  status: string;
  snapshotDate: string;
  capacity: {
    volunteers: {
      current: number;
      target: number;
      utilization: number;
      status: 'low' | 'healthy' | 'warning' | 'critical';
    };
    beneficiaries: {
      current: number;
      target: number;
      utilization: number;
      status: 'low' | 'healthy' | 'warning' | 'critical';
    };
    budget: {
      spent: number;
      allocated: number;
      utilization: number;
      currency: string;
      status: 'low' | 'healthy' | 'warning' | 'critical';
    };
  };
  impact: {
    sroi: number | null;
    vis: number | null;
    hoursLogged: number;
    sessionsCompleted: number;
    impactScore: number | null;
  };
}

export interface CampaignTimeSeriesResponse {
  campaignId: string;
  period: {
    start: string;
    end: string;
  };
  dataPoints: Array<{
    date: string;
    sroi: number | null;
    vis: number | null;
    hours: number;
    sessions: number;
    volunteersUtilization: number;
    beneficiariesUtilization: number;
    budgetUtilization: number;
  }>;
}

export interface CampaignCapacityResponse {
  campaignId: string;
  volunteers: {
    target: number;
    current: number;
    utilization: number;
    remaining: number;
    status: 'low' | 'healthy' | 'warning' | 'critical';
  };
  beneficiaries: {
    target: number;
    current: number;
    utilization: number;
    remaining: number;
    status: 'low' | 'healthy' | 'warning' | 'critical';
  };
  sessions: {
    target: number | null;
    current: number;
    utilization: number | null;
    remaining: number | null;
    status: 'low' | 'healthy' | 'warning' | 'critical' | null;
  };
  alerts: Array<{
    type: 'capacity_warning' | 'capacity_critical' | 'budget_warning' | 'performance_low';
    message: string;
    threshold: number;
    currentValue: number;
  }>;
}

export interface CampaignFinancialsResponse {
  campaignId: string;
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
    utilization: number;
    currency: string;
  };
  burnRate: {
    current: number; // Per day
    projected: number; // Linear projection
    status: 'on_track' | 'over_budget' | 'under_budget';
  };
  forecast: {
    daysUntilDepletion: number | null;
    projectedEndDate: string | null;
  };
}

export interface CampaignVolunteersResponse {
  campaignId: string;
  topVolunteers: Array<{
    userId: string;
    displayName: string;
    visScore: number;
    hoursLogged: number;
    sessionsCompleted: number;
    rank: number;
  }>;
  totalVolunteers: number;
  averageVIS: number;
  averageHours: number;
}

export interface CampaignImpactResponse {
  campaignId: string;
  sroi: {
    score: number | null;
    trend: 'up' | 'down' | 'stable' | null;
    changePercent: number | null;
  };
  vis: {
    average: number | null;
    trend: 'up' | 'down' | 'stable' | null;
    changePercent: number | null;
  };
  outcomes: {
    integration: number | null;
    language: number | null;
    jobReadiness: number | null;
    wellbeing: number | null;
  };
  engagement: {
    totalHours: number;
    totalSessions: number;
    volunteerRetentionRate: number | null;
    beneficiaryDropoutRate: number | null;
  };
  topEvidence: Array<{
    id: string;
    snippet: string;
    outcomeType: string;
    sroiContribution: number;
  }>;
}

/**
 * Campaign Cache Service
 */
export class CampaignCache {
  private redisCache: RedisCache;
  private config: CampaignCacheConfig;

  constructor(
    redisCache: RedisCache = getRedisCache(),
    config: Partial<CampaignCacheConfig> = {}
  ) {
    this.redisCache = redisCache;
    this.config = { ...DEFAULT_CAMPAIGN_CACHE_CONFIG, ...config };
  }

  /**
   * Get TTL based on campaign status
   */
  private getTTL(campaignStatus: string): number {
    const isActive = ['recruiting', 'active', 'paused'].includes(campaignStatus.toLowerCase());
    return isActive
      ? this.config.ttl.activeCampaigns
      : this.config.ttl.completedCampaigns;
  }

  /**
   * Cache dashboard overview
   */
  async getDashboard(campaignId: string): Promise<CampaignDashboardResponse | null> {
    return this.redisCache.get<CampaignDashboardResponse>('campaign-dashboard', campaignId);
  }

  async setDashboard(
    campaignId: string,
    data: CampaignDashboardResponse,
    campaignStatus: string
  ): Promise<void> {
    const ttl = this.getTTL(campaignStatus);
    return this.redisCache.set('campaign-dashboard', campaignId, data, ttl);
  }

  /**
   * Cache time-series data
   */
  async getTimeSeries(
    campaignId: string,
    period: string
  ): Promise<CampaignTimeSeriesResponse | null> {
    const key = `${campaignId}:${period}`;
    return this.redisCache.get<CampaignTimeSeriesResponse>('campaign-timeseries', key);
  }

  async setTimeSeries(
    campaignId: string,
    period: string,
    data: CampaignTimeSeriesResponse
  ): Promise<void> {
    const key = `${campaignId}:${period}`;
    return this.redisCache.set(
      'campaign-timeseries',
      key,
      data,
      this.config.ttl.timeSeries
    );
  }

  /**
   * Cache capacity data
   */
  async getCapacity(campaignId: string): Promise<CampaignCapacityResponse | null> {
    return this.redisCache.get<CampaignCapacityResponse>('campaign-capacity', campaignId);
  }

  async setCapacity(
    campaignId: string,
    data: CampaignCapacityResponse,
    campaignStatus: string
  ): Promise<void> {
    const ttl = this.getTTL(campaignStatus);
    return this.redisCache.set('campaign-capacity', campaignId, data, ttl);
  }

  /**
   * Cache financials data
   */
  async getFinancials(campaignId: string): Promise<CampaignFinancialsResponse | null> {
    return this.redisCache.get<CampaignFinancialsResponse>('campaign-financials', campaignId);
  }

  async setFinancials(
    campaignId: string,
    data: CampaignFinancialsResponse,
    campaignStatus: string
  ): Promise<void> {
    const ttl = this.getTTL(campaignStatus);
    return this.redisCache.set('campaign-financials', campaignId, data, ttl);
  }

  /**
   * Cache volunteers leaderboard
   */
  async getVolunteers(campaignId: string): Promise<CampaignVolunteersResponse | null> {
    return this.redisCache.get<CampaignVolunteersResponse>('campaign-volunteers', campaignId);
  }

  async setVolunteers(
    campaignId: string,
    data: CampaignVolunteersResponse,
    campaignStatus: string
  ): Promise<void> {
    const ttl = this.getTTL(campaignStatus);
    return this.redisCache.set('campaign-volunteers', campaignId, data, ttl);
  }

  /**
   * Cache impact summary
   */
  async getImpact(campaignId: string): Promise<CampaignImpactResponse | null> {
    return this.redisCache.get<CampaignImpactResponse>('campaign-impact', campaignId);
  }

  async setImpact(
    campaignId: string,
    data: CampaignImpactResponse,
    campaignStatus: string
  ): Promise<void> {
    const ttl = this.getTTL(campaignStatus);
    return this.redisCache.set('campaign-impact', campaignId, data, ttl);
  }

  /**
   * Invalidate all cache for a campaign
   */
  async invalidateCampaign(campaignId: string): Promise<number> {
    const patterns = [
      `campaign-dashboard:${campaignId}`,
      `campaign-timeseries:${campaignId}:*`,
      `campaign-capacity:${campaignId}`,
      `campaign-financials:${campaignId}`,
      `campaign-volunteers:${campaignId}`,
      `campaign-impact:${campaignId}`,
    ];

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      const count = await this.redisCache.invalidatePattern(pattern);
      totalInvalidated += count;
    }

    return totalInvalidated;
  }

  /**
   * Invalidate all campaign caches for a company
   */
  async invalidateCompanyCampaigns(companyId: string): Promise<number> {
    return this.redisCache.invalidatePattern(`campaign-*:*:${companyId}`);
  }

  /**
   * Warm cache for top campaigns
   *
   * @param campaigns - Array of campaign IDs with status
   * @param fetchers - Functions to fetch data for each endpoint
   */
  async warmCache(
    campaigns: Array<{ id: string; status: string }>,
    fetchers: {
      dashboard: (campaignId: string) => Promise<CampaignDashboardResponse>;
      capacity?: (campaignId: string) => Promise<CampaignCapacityResponse>;
      impact?: (campaignId: string) => Promise<CampaignImpactResponse>;
    }
  ): Promise<void> {
    console.log(`[CampaignCache] Warming cache for ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      try {
        // Always warm dashboard
        const dashboardData = await fetchers.dashboard(campaign.id);
        await this.setDashboard(campaign.id, dashboardData, campaign.status);

        // Optional: warm capacity
        if (fetchers.capacity) {
          const capacityData = await fetchers.capacity(campaign.id);
          await this.setCapacity(campaign.id, capacityData, campaign.status);
        }

        // Optional: warm impact
        if (fetchers.impact) {
          const impactData = await fetchers.impact(campaign.id);
          await this.setImpact(campaign.id, impactData, campaign.status);
        }
      } catch (error) {
        console.error(`[CampaignCache] Cache warming failed for campaign ${campaign.id}:`, error);
      }
    }

    console.log('[CampaignCache] Cache warming completed');
  }

  /**
   * Get cache statistics for campaigns
   */
  getStats() {
    return this.redisCache.getStats();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.redisCache.healthCheck();
  }
}

// Singleton instance
let campaignCacheInstance: CampaignCache | null = null;

/**
 * Get campaign cache singleton instance
 */
export function getCampaignCache(): CampaignCache {
  if (!campaignCacheInstance) {
    campaignCacheInstance = new CampaignCache();
  }
  return campaignCacheInstance;
}

/**
 * Initialize campaign cache with configuration
 */
export async function initializeCampaignCache(
  config?: Partial<CampaignCacheConfig>
): Promise<CampaignCache> {
  const cache = config ? new CampaignCache(getRedisCache(), config) : getCampaignCache();
  // Ensure Redis is connected
  const isHealthy = await cache.healthCheck();
  if (!isHealthy) {
    console.warn('[CampaignCache] Redis not connected, cache will be disabled');
  }
  return cache;
}
