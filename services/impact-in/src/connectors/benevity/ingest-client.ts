import type { VolunteerEvent, DonationEvent } from '@teei/event-contracts';
import { createVolunteerEvent, createDonationEvent } from '@teei/event-contracts';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:benevity-ingest');

export interface BenevityIngestConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  mockMode?: boolean;
}

export interface BenevityAuthToken {
  accessToken: string;
  expiresAt: number;
}

export interface BenevityVolunteerActivity {
  id: string;
  userId: string;
  activityName: string;
  activityDescription?: string;
  activityType: string;
  hoursLogged: number;
  activityDate: string;
  nonprofitName?: string;
  nonprofitId?: string;
  causeArea?: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  tags?: string[];
  location?: {
    country?: string;
    city?: string;
  };
}

export interface BenevityDonation {
  id: string;
  userId: string;
  donationType: string;
  amount: number;
  currency: string;
  nonprofitName: string;
  nonprofitId?: string;
  causeArea?: string;
  donationDate: string;
  companyMatch?: {
    matched: boolean;
    matchAmount?: number;
    matchRatio?: number;
  };
  taxDeductible?: boolean;
  receiptNumber?: string;
  tags?: string[];
  campaignId?: string;
  campaignName?: string;
}

export interface BenevityIngestResult {
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
 * Benevity Ingest Client
 * Pulls volunteering and donation data from Benevity API
 */
export class BenevityIngestClient {
  private config: BenevityIngestConfig;
  private authToken: BenevityAuthToken | null = null;

  constructor(config: BenevityIngestConfig) {
    this.config = config;
  }

  /**
   * Fetch volunteer activities from Benevity
   * @param companyId TEEI company ID
   * @param since ISO datetime to fetch records from
   * @param limit Max records to fetch per page
   */
  async fetchVolunteerActivities(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<BenevityIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchVolunteerActivities(companyId, since, limit);
    }

    await this.ensureValidToken();

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
        const queryParams = new URLSearchParams({
          tenant_id: this.config.tenantId,
          page: page.toString(),
          limit: limit.toString(),
          ...(since && { since }),
        });

        const response = await fetch(
          `${this.config.apiUrl}/api/v2/volunteer-activities?${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${this.authToken?.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Benevity API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        totalRecords += data.records?.length || 0;

        // Process each volunteer activity
        for (const activity of data.records || []) {
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

        hasMore = data.hasMore && page < 10; // Safety limit
        page++;
      }

      logger.info('Benevity volunteer activities fetched', {
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
      logger.error('Failed to fetch Benevity volunteer activities', { error: error.message });
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
   * Fetch donations from Benevity
   * @param companyId TEEI company ID
   * @param since ISO datetime to fetch records from
   * @param limit Max records to fetch per page
   */
  async fetchDonations(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<BenevityIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchDonations(companyId, since, limit);
    }

    await this.ensureValidToken();

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
        const queryParams = new URLSearchParams({
          tenant_id: this.config.tenantId,
          page: page.toString(),
          limit: limit.toString(),
          ...(since && { since }),
        });

        const response = await fetch(
          `${this.config.apiUrl}/api/v2/donations?${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${this.authToken?.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Benevity API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        totalRecords += data.records?.length || 0;

        // Process each donation
        for (const donation of data.records || []) {
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

        hasMore = data.hasMore && page < 10; // Safety limit
        page++;
      }

      logger.info('Benevity donations fetched', {
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
      logger.error('Failed to fetch Benevity donations', { error: error.message });
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
   * Map Benevity volunteer activity to TEEI VolunteerEvent
   */
  private mapVolunteerActivity(
    activity: BenevityVolunteerActivity,
    companyId: string
  ): VolunteerEvent {
    return createVolunteerEvent({
      sourceSystem: 'benevity',
      sourceId: activity.id,
      sourceTenantId: this.config.tenantId,
      userId: activity.userId, // Will be resolved to TEEI UUID later
      externalUserId: activity.userId,
      companyId,
      activityName: activity.activityName,
      activityDescription: activity.activityDescription,
      activityType: this.mapActivityType(activity.activityType),
      hoursLogged: activity.hoursLogged,
      activityDate: activity.activityDate,
      nonprofitName: activity.nonprofitName,
      nonprofitId: activity.nonprofitId,
      causeArea: activity.causeArea,
      verified: activity.verified,
      verifiedBy: activity.verifiedBy,
      verifiedAt: activity.verifiedAt,
      tags: activity.tags,
      location: activity.location,
    });
  }

  /**
   * Map Benevity donation to TEEI DonationEvent
   */
  private mapDonation(donation: BenevityDonation, companyId: string): DonationEvent {
    return createDonationEvent({
      sourceSystem: 'benevity',
      sourceId: donation.id,
      sourceTenantId: this.config.tenantId,
      userId: donation.userId, // Will be resolved to TEEI UUID later
      externalUserId: donation.userId,
      companyId,
      donationType: this.mapDonationType(donation.donationType),
      amount: donation.amount,
      currency: donation.currency,
      nonprofitName: donation.nonprofitName,
      nonprofitId: donation.nonprofitId,
      causeArea: donation.causeArea,
      donationDate: donation.donationDate,
      companyMatch: donation.companyMatch,
      taxDeductible: donation.taxDeductible,
      receiptNumber: donation.receiptNumber,
      tags: donation.tags,
      campaignId: donation.campaignId,
      campaignName: donation.campaignName,
    });
  }

  /**
   * Map Benevity activity type to TEEI activity type
   */
  private mapActivityType(benevityType: string): any {
    const typeMap: Record<string, string> = {
      'skills-based': 'skills_volunteering',
      'hands-on': 'hands_on_volunteering',
      'virtual': 'virtual_volunteering',
      'board': 'board_service',
      'pro-bono': 'pro_bono',
    };
    return typeMap[benevityType.toLowerCase()] || 'other';
  }

  /**
   * Map Benevity donation type to TEEI donation type
   */
  private mapDonationType(benevityType: string): any {
    const typeMap: Record<string, string> = {
      'one-time': 'one_time',
      'recurring': 'recurring',
      'matching': 'matching_gift',
      'payroll': 'payroll_deduction',
      'volunteer-grant': 'volunteer_grant',
      'disaster': 'disaster_relief',
    };
    return typeMap[benevityType.toLowerCase()] || 'other';
  }

  /**
   * Ensure we have a valid OAuth token
   */
  private async ensureValidToken(): Promise<void> {
    if (this.authToken && Date.now() < this.authToken.expiresAt) {
      return;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'volunteer_read donation_read',
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // 1 min buffer
      };

      logger.info('Benevity OAuth token obtained');
    } catch (error: any) {
      throw new Error(`Benevity OAuth failed: ${error.message}`);
    }
  }

  /**
   * Mock implementation for testing
   */
  private async mockFetchVolunteerActivities(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<BenevityIngestResult> {
    logger.info('[MOCK] Fetching Benevity volunteer activities', { companyId, since, limit });

    const mockActivities: VolunteerEvent[] = [
      createVolunteerEvent({
        sourceSystem: 'benevity',
        sourceId: 'bene-vol-001',
        sourceTenantId: this.config.tenantId,
        userId: crypto.randomUUID(),
        externalUserId: 'ext-user-001',
        companyId,
        activityName: 'Food bank volunteering',
        activityType: 'hands_on_volunteering',
        hoursLogged: 4,
        activityDate: new Date().toISOString(),
        nonprofitName: 'Local Food Bank',
        verified: true,
      }),
    ];

    return {
      success: true,
      volunteers: mockActivities,
      donations: [],
      errors: [],
      metadata: {
        totalRecords: 1,
        recordsProcessed: 1,
        recordsFailed: 0,
        lastSyncTimestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Mock implementation for donations
   */
  private async mockFetchDonations(
    companyId: string,
    since?: string,
    limit: number = 100
  ): Promise<BenevityIngestResult> {
    logger.info('[MOCK] Fetching Benevity donations', { companyId, since, limit });

    const mockDonations: DonationEvent[] = [
      createDonationEvent({
        sourceSystem: 'benevity',
        sourceId: 'bene-don-001',
        sourceTenantId: this.config.tenantId,
        userId: crypto.randomUUID(),
        externalUserId: 'ext-user-001',
        companyId,
        donationType: 'one_time',
        amount: 100,
        currency: 'USD',
        nonprofitName: 'Red Cross',
        donationDate: new Date().toISOString(),
        companyMatch: {
          matched: true,
          matchAmount: 100,
          matchRatio: 1.0,
        },
      }),
    ];

    return {
      success: true,
      volunteers: [],
      donations: mockDonations,
      errors: [],
      metadata: {
        totalRecords: 1,
        recordsProcessed: 1,
        recordsFailed: 0,
        lastSyncTimestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (this.config.mockMode) {
      return true;
    }

    try {
      await this.ensureValidToken();
      return this.authToken !== null;
    } catch {
      return false;
    }
  }
}
