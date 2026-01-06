/**
 * Benevity Inbound Client
 * Pulls volunteering and giving data FROM Benevity's platform
 * Supports OAuth2, pagination, and incremental sync
 */

import { request } from 'undici';
import { createServiceLogger } from '@teei/shared-utils';
import type { VolunteerLogged, DonationMade } from '@teei/event-contracts';

const logger = createServiceLogger('impact-in:benevity:inbound');

export interface BenevityInboundConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  companyId: string;
}

export interface BenevityVolunteerActivity {
  id: string;
  user_id: string;
  activity_name: string;
  activity_type: string;
  hours: number;
  activity_date: string;
  cause_area?: string;
  nonprofit_name?: string;
  nonprofit_id?: string;
  location?: string;
  team_based?: boolean;
  team_size?: number;
}

export interface BenevityDonation {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  donation_date: string;
  nonprofit_name: string;
  nonprofit_id?: string;
  nonprofit_ein?: string;
  cause_area?: string;
  match_eligible?: boolean;
  match_amount?: number;
  donation_type?: string;
  recurrence_frequency?: string;
  campaign?: string;
}

export interface BenevityPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface SyncResult {
  volunteers: VolunteerLogged[];
  donations: DonationMade[];
  errors: string[];
  syncedAt: Date;
}

/**
 * Benevity Inbound Client for pulling volunteering and giving data
 */
export class BenevityInboundClient {
  private config: BenevityInboundConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: BenevityInboundConfig) {
    this.config = config;
  }

  /**
   * Sync volunteering and donation data from Benevity
   * @param since - Sync data since this timestamp (ISO 8601)
   * @param maxPages - Maximum pages to fetch (default: 10)
   */
  async sync(since?: string, maxPages: number = 10): Promise<SyncResult> {
    logger.info('Starting Benevity sync', { since, maxPages });

    const result: SyncResult = {
      volunteers: [],
      donations: [],
      errors: [],
      syncedAt: new Date(),
    };

    try {
      // Ensure we have a valid access token
      await this.ensureAccessToken();

      // Fetch volunteering activities
      try {
        const volunteers = await this.fetchVolunteerActivities(since, maxPages);
        result.volunteers = volunteers;
      } catch (error: any) {
        logger.error('Failed to fetch volunteer activities', { error: error.message });
        result.errors.push(`Volunteer activities: ${error.message}`);
      }

      // Fetch donations
      try {
        const donations = await this.fetchDonations(since, maxPages);
        result.donations = donations;
      } catch (error: any) {
        logger.error('Failed to fetch donations', { error: error.message });
        result.errors.push(`Donations: ${error.message}`);
      }

      logger.info('Benevity sync completed', {
        volunteers: result.volunteers.length,
        donations: result.donations.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Benevity sync failed', { error: error.message });
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Fetch volunteer activities from Benevity with pagination
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
        ...(since && { updated_since: since }),
      });

      const url = `${this.config.apiUrl}/v1/volunteer-activities?${queryParams}`;

      logger.debug('Fetching volunteer activities', { page: currentPage, url });

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.statusCode !== 200) {
        const body = await response.body.text();
        throw new Error(`Benevity API error (${response.statusCode}): ${body}`);
      }

      const data: BenevityPaginatedResponse<BenevityVolunteerActivity> = await response.body.json();

      // Map to our event contract
      for (const activity of data.data) {
        try {
          const event = this.mapVolunteerActivity(activity);
          activities.push(event);
        } catch (error: any) {
          logger.warn('Failed to map volunteer activity', {
            activityId: activity.id,
            error: error.message,
          });
        }
      }

      // Check if there are more pages
      if (currentPage >= data.pagination.total_pages) {
        break;
      }

      currentPage++;
    }

    logger.info('Fetched volunteer activities', { count: activities.length, pages: currentPage - 1 });

    return activities;
  }

  /**
   * Fetch donations from Benevity with pagination
   */
  private async fetchDonations(since?: string, maxPages: number = 10): Promise<DonationMade[]> {
    const donations: DonationMade[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '100',
        ...(since && { updated_since: since }),
      });

      const url = `${this.config.apiUrl}/v1/donations?${queryParams}`;

      logger.debug('Fetching donations', { page: currentPage, url });

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.statusCode !== 200) {
        const body = await response.body.text();
        throw new Error(`Benevity API error (${response.statusCode}): ${body}`);
      }

      const data: BenevityPaginatedResponse<BenevityDonation> = await response.body.json();

      // Map to our event contract
      for (const donation of data.data) {
        try {
          const event = this.mapDonation(donation);
          donations.push(event);
        } catch (error: any) {
          logger.warn('Failed to map donation', { donationId: donation.id, error: error.message });
        }
      }

      // Check if there are more pages
      if (currentPage >= data.pagination.total_pages) {
        break;
      }

      currentPage++;
    }

    logger.info('Fetched donations', { count: donations.length, pages: currentPage - 1 });

    return donations;
  }

  /**
   * Map Benevity volunteer activity to our event contract
   */
  private mapVolunteerActivity(activity: BenevityVolunteerActivity): VolunteerLogged {
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
        externalId: activity.id,
        source: 'benevity',
        userId: activity.user_id,
        companyId: this.config.companyId,
        activityName: activity.activity_name,
        activityType: activityTypeMap[activity.activity_type] || 'other',
        hours: activity.hours,
        activityDate: activity.activity_date,
        causeArea: activity.cause_area,
        nonprofitName: activity.nonprofit_name,
        nonprofitId: activity.nonprofit_id,
        location: activity.location,
        teamBased: activity.team_based || false,
        teamSize: activity.team_size,
      },
    };
  }

  /**
   * Map Benevity donation to our event contract
   */
  private mapDonation(donation: BenevityDonation): DonationMade {
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
        externalId: donation.id,
        source: 'benevity',
        userId: donation.user_id,
        companyId: this.config.companyId,
        amount: donation.amount,
        currency: donation.currency || 'USD',
        donationDate: donation.donation_date,
        nonprofitName: donation.nonprofit_name,
        nonprofitId: donation.nonprofit_id,
        nonprofitEin: donation.nonprofit_ein,
        causeArea: donation.cause_area,
        matchEligible: donation.match_eligible || false,
        matchAmount: donation.match_amount,
        donationType: donationTypeMap[donation.donation_type || 'one-time'] || 'one_time',
        recurrenceFrequency: donation.recurrence_frequency
          ? recurrenceMap[donation.recurrence_frequency]
          : undefined,
        campaign: donation.campaign,
      },
    };
  }

  /**
   * Ensure we have a valid OAuth2 access token
   */
  private async ensureAccessToken(): Promise<void> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return;
    }

    logger.info('Obtaining new Benevity access token');

    const response = await request(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'volunteer:read donations:read',
      }).toString(),
    });

    if (response.statusCode !== 200) {
      const body = await response.body.text();
      throw new Error(`Failed to obtain access token: ${body}`);
    }

    const data: any = await response.body.json();

    this.accessToken = data.access_token;
    this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000); // 60s buffer

    logger.info('Benevity access token obtained', { expiresAt: this.tokenExpiresAt });
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureAccessToken();

      const response = await request(`${this.config.apiUrl}/v1/health`, {
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
      logger.error('Benevity health check failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create Benevity inbound client from environment variables
 */
export function createBenevityInboundClient(companyId: string): BenevityInboundClient {
  const config: BenevityInboundConfig = {
    apiUrl: process.env.BENEVITY_API_URL || 'https://api.benevity.com',
    clientId: process.env.BENEVITY_CLIENT_ID!,
    clientSecret: process.env.BENEVITY_CLIENT_SECRET!,
    tokenUrl: process.env.BENEVITY_TOKEN_URL || 'https://api.benevity.com/oauth/token',
    companyId,
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error('Benevity credentials are required');
  }

  return new BenevityInboundClient(config);
}
