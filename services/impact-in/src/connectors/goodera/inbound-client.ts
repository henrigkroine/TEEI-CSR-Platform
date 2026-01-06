/**
 * Goodera Inbound Client
 * Pulls volunteering and giving data FROM Goodera's platform
 * Supports OAuth2, pagination, and incremental sync
 */

import { request } from 'undici';
import { createServiceLogger } from '@teei/shared-utils';
import type { VolunteerLogged, DonationMade } from '@teei/event-contracts';

const logger = createServiceLogger('impact-in:goodera:inbound');

export interface GooderaInboundConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  companyId: string;
}

export interface GooderaVolunteerActivity {
  activity_id: string;
  employee_id: string;
  activity_title: string;
  activity_category: string;
  hours_volunteered: number;
  activity_date: string;
  cause: string;
  ngo_name?: string;
  ngo_id?: string;
  city?: string;
  is_group_activity?: boolean;
  group_size?: number;
}

export interface GooderaContribution {
  contribution_id: string;
  employee_id: string;
  amount: number;
  currency: string;
  contribution_date: string;
  ngo_name: string;
  ngo_id?: string;
  tax_id?: string;
  cause: string;
  is_matched?: boolean;
  match_amount?: number;
  contribution_type?: string;
  frequency?: string;
  campaign_id?: string;
}

export interface GooderaApiResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface SyncResult {
  volunteers: VolunteerLogged[];
  donations: DonationMade[];
  errors: string[];
  syncedAt: Date;
}

/**
 * Goodera Inbound Client for pulling volunteering and giving data
 */
export class GooderaInboundClient {
  private config: GooderaInboundConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: GooderaInboundConfig) {
    this.config = config;
  }

  /**
   * Sync volunteering and donation data from Goodera
   * @param since - Sync data since this timestamp (ISO 8601)
   * @param maxPages - Maximum pages to fetch (default: 10)
   */
  async sync(since?: string, maxPages: number = 10): Promise<SyncResult> {
    logger.info('Starting Goodera sync', { since, maxPages });

    const result: SyncResult = {
      volunteers: [],
      donations: [],
      errors: [],
      syncedAt: new Date(),
    };

    try {
      await this.ensureAccessToken();

      // Fetch volunteer activities
      try {
        const volunteers = await this.fetchVolunteerActivities(since, maxPages);
        result.volunteers = volunteers;
      } catch (error: any) {
        logger.error('Failed to fetch volunteer activities', { error: error.message });
        result.errors.push(`Volunteer activities: ${error.message}`);
      }

      // Fetch contributions (donations)
      try {
        const donations = await this.fetchContributions(since, maxPages);
        result.donations = donations;
      } catch (error: any) {
        logger.error('Failed to fetch contributions', { error: error.message });
        result.errors.push(`Contributions: ${error.message}`);
      }

      logger.info('Goodera sync completed', {
        volunteers: result.volunteers.length,
        donations: result.donations.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Goodera sync failed', { error: error.message });
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Fetch volunteer activities from Goodera with pagination
   */
  private async fetchVolunteerActivities(
    since?: string,
    maxPages: number = 10
  ): Promise<VolunteerLogged[]> {
    const activities: VolunteerLogged[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '100',
        ...(since && { from_date: since }),
      });

      const url = `${this.config.apiUrl}/v2/volunteer-activities?${queryParams}`;

      logger.debug('Fetching volunteer activities', { page: currentPage });

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.statusCode !== 200) {
        const body = await response.body.text();
        throw new Error(`Goodera API error (${response.statusCode}): ${body}`);
      }

      const data: GooderaApiResponse<GooderaVolunteerActivity> = await response.body.json();

      for (const activity of data.data) {
        try {
          const event = this.mapVolunteerActivity(activity);
          activities.push(event);
        } catch (error: any) {
          logger.warn('Failed to map volunteer activity', {
            activityId: activity.activity_id,
            error: error.message,
          });
        }
      }

      if (currentPage >= data.meta.last_page) {
        break;
      }

      currentPage++;
    }

    logger.info('Fetched volunteer activities', { count: activities.length });

    return activities;
  }

  /**
   * Fetch contributions from Goodera with pagination
   */
  private async fetchContributions(since?: string, maxPages: number = 10): Promise<DonationMade[]> {
    const donations: DonationMade[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '100',
        ...(since && { from_date: since }),
      });

      const url = `${this.config.apiUrl}/v2/contributions?${queryParams}`;

      logger.debug('Fetching contributions', { page: currentPage });

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.statusCode !== 200) {
        const body = await response.body.text();
        throw new Error(`Goodera API error (${response.statusCode}): ${body}`);
      }

      const data: GooderaApiResponse<GooderaContribution> = await response.body.json();

      for (const contribution of data.data) {
        try {
          const event = this.mapContribution(contribution);
          donations.push(event);
        } catch (error: any) {
          logger.warn('Failed to map contribution', {
            contributionId: contribution.contribution_id,
            error: error.message,
          });
        }
      }

      if (currentPage >= data.meta.last_page) {
        break;
      }

      currentPage++;
    }

    logger.info('Fetched contributions', { count: donations.length });

    return donations;
  }

  /**
   * Map Goodera volunteer activity to our event contract
   */
  private mapVolunteerActivity(activity: GooderaVolunteerActivity): VolunteerLogged {
    const activityTypeMap: Record<string, VolunteerLogged['data']['activityType']> = {
      'skills-based': 'skills_based',
      'general': 'general',
      'mentorship': 'mentorship',
      'tutoring': 'tutoring',
      'event': 'event',
    };

    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'external.volunteer.logged',
      data: {
        externalId: activity.activity_id,
        source: 'goodera',
        userId: activity.employee_id,
        companyId: this.config.companyId,
        activityName: activity.activity_title,
        activityType: activityTypeMap[activity.activity_category] || 'other',
        hours: activity.hours_volunteered,
        activityDate: activity.activity_date,
        causeArea: activity.cause,
        nonprofitName: activity.ngo_name,
        nonprofitId: activity.ngo_id,
        location: activity.city,
        teamBased: activity.is_group_activity || false,
        teamSize: activity.group_size,
      },
    };
  }

  /**
   * Map Goodera contribution to our event contract
   */
  private mapContribution(contribution: GooderaContribution): DonationMade {
    const donationTypeMap: Record<string, DonationMade['data']['donationType']> = {
      'one-time': 'one_time',
      'recurring': 'recurring',
      'payroll': 'payroll',
    };

    const recurrenceMap: Record<string, DonationMade['data']['recurrenceFrequency']> = {
      'weekly': 'weekly',
      'bi-weekly': 'bi_weekly',
      'monthly': 'monthly',
      'quarterly': 'quarterly',
      'annual': 'annual',
    };

    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'external.donation.made',
      data: {
        externalId: contribution.contribution_id,
        source: 'goodera',
        userId: contribution.employee_id,
        companyId: this.config.companyId,
        amount: contribution.amount,
        currency: contribution.currency || 'USD',
        donationDate: contribution.contribution_date,
        nonprofitName: contribution.ngo_name,
        nonprofitId: contribution.ngo_id,
        nonprofitEin: contribution.tax_id,
        causeArea: contribution.cause,
        matchEligible: contribution.is_matched || false,
        matchAmount: contribution.match_amount,
        donationType: donationTypeMap[contribution.contribution_type || 'one-time'] || 'one_time',
        recurrenceFrequency: contribution.frequency
          ? recurrenceMap[contribution.frequency]
          : undefined,
        campaign: contribution.campaign_id,
      },
    };
  }

  /**
   * Ensure we have a valid OAuth2 access token
   */
  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return;
    }

    logger.info('Obtaining new Goodera access token');

    const response = await request(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'volunteer:read contributions:read',
      }).toString(),
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Failed to obtain access token: ${body}`);
    }

    const data: any = await response.body.json();

    this.accessToken = data.access_token;
    this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000);

    logger.info('Goodera access token obtained', { expiresAt: this.tokenExpiresAt });
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureAccessToken();

      const response = await request(`${this.config.apiUrl}/v2/health`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { success: true };
      }

      return { success: false, error: `HTTP ${response.statusCode}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create Goodera inbound client from environment variables
 */
export function createGooderaInboundClient(companyId: string): GooderaInboundClient {
  const config: GooderaInboundConfig = {
    apiUrl: process.env.GOODERA_API_URL || 'https://api.goodera.com',
    clientId: process.env.GOODERA_CLIENT_ID!,
    clientSecret: process.env.GOODERA_CLIENT_SECRET!,
    tokenUrl: process.env.GOODERA_TOKEN_URL || 'https://api.goodera.com/oauth/token',
    companyId,
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error('Goodera credentials are required');
  }

  return new GooderaInboundClient(config);
}
