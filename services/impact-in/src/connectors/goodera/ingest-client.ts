import type { VolunteerEvent, DonationEvent } from '@teei/event-contracts';
import { createVolunteerEvent, createDonationEvent } from '@teei/event-contracts';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:goodera-ingest');

export interface GooderaIngestConfig {
  apiUrl: string;
  apiKey: string;
  projectId: string;
  mockMode?: boolean;
}

export interface GooderaIngestResult {
  success: boolean;
  volunteers: VolunteerEvent[];
  donations: DonationEvent[];
  errors: string[];
  metadata: {
    totalRecords: number;
    recordsProcessed: number;
    recordsFailed: number;
    lastSyncTimestamp: string;
  };
}

/**
 * Goodera Ingest Client
 * Pulls volunteering and donation data from Goodera API
 */
export class GooderaIngestClient {
  private config: GooderaIngestConfig;
  private rateLimitDelay = 600; // 100 req/min = 600ms between requests
  private lastRequestTime = 0;

  constructor(config: GooderaIngestConfig) {
    this.config = config;
  }

  /**
   * Fetch volunteer activities from Goodera
   */
  async fetchVolunteerActivities(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<GooderaIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchData(companyId, 'volunteers');
    }

    const volunteers: VolunteerEvent[] = [];
    const donations: DonationEvent[] = [];
    const errors: string[] = [];
    let totalRecords = 0;
    let recordsProcessed = 0;
    let recordsFailed = 0;
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        await this.enforceRateLimit();

        const queryParams = new URLSearchParams({
          project_id: this.config.projectId,
          page: page.toString(),
          limit: limit.toString(),
          activity_type: 'volunteering',
          ...(since && { since }),
        });

        const response = await fetch(
          `${this.config.apiUrl}/api/v1/activities?${queryParams}`,
          {
            headers: {
              'X-API-Key': this.config.apiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Goodera API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        totalRecords += data.data?.length || 0;

        for (const activity of data.data || []) {
          try {
            const volunteerEvent = this.mapVolunteerActivity(activity, companyId);
            volunteers.push(volunteerEvent);
            recordsProcessed++;
          } catch (error: any) {
            logger.error('Failed to map volunteer activity', {
              activityId: activity.id,
              error: error.message,
            });
            errors.push(`Activity ${activity.id}: ${error.message}`);
            recordsFailed++;
          }
        }

        hasMore = data.pagination?.hasMore && page < 10;
        page++;
      }

      logger.info('Goodera volunteer activities fetched', {
        companyId,
        totalRecords,
        recordsProcessed,
        recordsFailed,
      });

      return {
        success: errors.length === 0,
        volunteers,
        donations,
        errors,
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Failed to fetch Goodera volunteer activities', { error: error.message });
      return {
        success: false,
        volunteers,
        donations,
        errors: [error.message],
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Fetch donations from Goodera
   */
  async fetchDonations(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<GooderaIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchData(companyId, 'donations');
    }

    const volunteers: VolunteerEvent[] = [];
    const donations: DonationEvent[] = [];
    const errors: string[] = [];
    let totalRecords = 0;
    let recordsProcessed = 0;
    let recordsFailed = 0;
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        await this.enforceRateLimit();

        const queryParams = new URLSearchParams({
          project_id: this.config.projectId,
          page: page.toString(),
          limit: limit.toString(),
          activity_type: 'donation',
          ...(since && { since }),
        });

        const response = await fetch(
          `${this.config.apiUrl}/api/v1/activities?${queryParams}`,
          {
            headers: {
              'X-API-Key': this.config.apiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Goodera API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        totalRecords += data.data?.length || 0;

        for (const donation of data.data || []) {
          try {
            const donationEvent = this.mapDonation(donation, companyId);
            donations.push(donationEvent);
            recordsProcessed++;
          } catch (error: any) {
            logger.error('Failed to map donation', {
              donationId: donation.id,
              error: error.message,
            });
            errors.push(`Donation ${donation.id}: ${error.message}`);
            recordsFailed++;
          }
        }

        hasMore = data.pagination?.hasMore && page < 10;
        page++;
      }

      logger.info('Goodera donations fetched', {
        companyId,
        totalRecords,
        recordsProcessed,
        recordsFailed,
      });

      return {
        success: errors.length === 0,
        volunteers,
        donations,
        errors,
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Failed to fetch Goodera donations', { error: error.message });
      return {
        success: false,
        volunteers,
        donations,
        errors: [error.message],
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    }
  }

  private mapVolunteerActivity(activity: any, companyId: string): VolunteerEvent {
    return createVolunteerEvent({
      sourceSystem: 'goodera',
      sourceId: activity.id,
      sourceTenantId: this.config.projectId,
      userId: activity.user_id,
      externalUserId: activity.user_id,
      companyId,
      activityName: activity.name || activity.title,
      activityDescription: activity.description,
      activityType: this.mapActivityType(activity.type),
      hoursLogged: activity.hours || 0,
      activityDate: activity.date || activity.created_at,
      nonprofitName: activity.nonprofit?.name,
      nonprofitId: activity.nonprofit?.id,
      causeArea: activity.cause_area || activity.category,
      verified: activity.verified || false,
      tags: activity.tags,
      location: activity.location,
    });
  }

  private mapDonation(donation: any, companyId: string): DonationEvent {
    return createDonationEvent({
      sourceSystem: 'goodera',
      sourceId: donation.id,
      sourceTenantId: this.config.projectId,
      userId: donation.user_id,
      externalUserId: donation.user_id,
      companyId,
      donationType: this.mapDonationType(donation.type),
      amount: donation.amount,
      currency: donation.currency || 'USD',
      nonprofitName: donation.nonprofit?.name || donation.recipient_name,
      nonprofitId: donation.nonprofit?.id,
      causeArea: donation.cause_area || donation.category,
      donationDate: donation.date || donation.created_at,
      companyMatch: donation.company_match ? {
        matched: true,
        matchAmount: donation.company_match.amount,
        matchRatio: donation.company_match.ratio,
      } : undefined,
      tags: donation.tags,
      campaignId: donation.campaign?.id,
      campaignName: donation.campaign?.name,
    });
  }

  private mapActivityType(type: string): any {
    const typeMap: Record<string, string> = {
      'skills': 'skills_volunteering',
      'hands-on': 'hands_on_volunteering',
      'virtual': 'virtual_volunteering',
      'board': 'board_service',
    };
    return typeMap[type?.toLowerCase()] || 'other';
  }

  private mapDonationType(type: string): any {
    const typeMap: Record<string, string> = {
      'one-time': 'one_time',
      'recurring': 'recurring',
      'matching': 'matching_gift',
    };
    return typeMap[type?.toLowerCase()] || 'one_time';
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private async mockFetchData(companyId: string, type: 'volunteers' | 'donations'): Promise<GooderaIngestResult> {
    logger.info(`[MOCK] Fetching Goodera ${type}`, { companyId });

    if (type === 'volunteers') {
      return {
        success: true,
        volunteers: [
          createVolunteerEvent({
            sourceSystem: 'goodera',
            sourceId: 'goodera-vol-001',
            sourceTenantId: this.config.projectId,
            userId: crypto.randomUUID(),
            externalUserId: 'ext-user-001',
            companyId,
            activityName: 'Community service',
            activityType: 'hands_on_volunteering',
            hoursLogged: 5,
            activityDate: new Date().toISOString(),
            nonprofitName: 'Community Center',
            verified: true,
          }),
        ],
        donations: [],
        errors: [],
        metadata: {
          totalRecords: 1,
          recordsProcessed: 1,
          recordsFailed: 0,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    } else {
      return {
        success: true,
        volunteers: [],
        donations: [
          createDonationEvent({
            sourceSystem: 'goodera',
            sourceId: 'goodera-don-001',
            sourceTenantId: this.config.projectId,
            userId: crypto.randomUUID(),
            externalUserId: 'ext-user-001',
            companyId,
            donationType: 'one_time',
            amount: 50,
            currency: 'USD',
            nonprofitName: 'Education Fund',
            donationDate: new Date().toISOString(),
          }),
        ],
        errors: [],
        metadata: {
          totalRecords: 1,
          recordsProcessed: 1,
          recordsFailed: 0,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (this.config.mockMode) {
      return true;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/health`, {
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
