/**
 * Workday SCIM Client
 * Pulls user directory, org structure, and cost center data from Workday
 * Implements SCIM 2.0 protocol for user provisioning
 */

import { request } from 'undici';
import { createServiceLogger } from '@teei/shared-utils';
import type { UserSynced } from '@teei/event-contracts';

const logger = createServiceLogger('impact-in:workday:scim');

export interface WorkdaySCIMConfig {
  scimUrl: string; // e.g., https://wd5-impl-services1.workday.com/ccx/scim/{tenant}/v2
  username: string; // Integration System User
  password: string; // ISU password
  tenantId: string;
  companyId: string;
}

export interface SCIMUser {
  id: string;
  externalId?: string;
  userName: string;
  name: {
    givenName: string;
    familyName: string;
    formatted?: string;
  };
  emails: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  active: boolean;
  title?: string;
  department?: string;
  costCenter?: string;
  manager?: {
    value: string; // Manager's user ID
    $ref?: string;
  };
  addresses?: Array<{
    type?: string;
    locality?: string; // City
    country?: string;
  }>;
  timezone?: string;
  employeeNumber?: string;
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: {
    employeeNumber?: string;
    costCenter?: string;
    organization?: string;
    division?: string;
    department?: string;
    manager?: {
      value: string;
      $ref?: string;
    };
  };
}

export interface SCIMListResponse {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: SCIMUser[];
}

export interface SyncResult {
  users: UserSynced[];
  errors: string[];
  syncedAt: Date;
}

/**
 * Workday SCIM Client for pulling user directory data
 */
export class WorkdaySCIMClient {
  private config: WorkdaySCIMConfig;

  constructor(config: WorkdaySCIMConfig) {
    this.config = config;
  }

  /**
   * Sync user data from Workday SCIM endpoint
   * @param filter - SCIM filter (e.g., 'active eq true')
   * @param maxResults - Maximum number of results to fetch (default: 1000)
   */
  async syncUsers(filter?: string, maxResults: number = 1000): Promise<SyncResult> {
    logger.info('Starting Workday SCIM sync', { filter, maxResults });

    const result: SyncResult = {
      users: [],
      errors: [],
      syncedAt: new Date(),
    };

    try {
      const users = await this.fetchAllUsers(filter, maxResults);
      result.users = users;

      logger.info('Workday SCIM sync completed', {
        users: result.users.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Workday SCIM sync failed', { error: error.message });
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Fetch all users from Workday SCIM with pagination
   */
  private async fetchAllUsers(filter?: string, maxResults: number = 1000): Promise<UserSynced[]> {
    const users: UserSynced[] = [];
    const pageSize = 100; // SCIM typically uses 100 per page
    let startIndex = 1;
    let hasMore = true;

    while (hasMore && users.length < maxResults) {
      const queryParams = new URLSearchParams({
        startIndex: startIndex.toString(),
        count: Math.min(pageSize, maxResults - users.length).toString(),
        ...(filter && { filter }),
      });

      const url = `${this.config.scimUrl}/Users?${queryParams}`;

      logger.debug('Fetching SCIM users', { startIndex, pageSize });

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
          'Content-Type': 'application/scim+json',
          Accept: 'application/scim+json',
        },
      });

      if (response.statusCode !== 200) {
        const body = await response.body.text();
        throw new Error(`Workday SCIM API error (${response.statusCode}): ${body}`);
      }

      const data: SCIMListResponse = await response.body.json();

      for (const scimUser of data.Resources || []) {
        try {
          const event = this.mapSCIMUser(scimUser);
          users.push(event);
        } catch (error: any) {
          logger.warn('Failed to map SCIM user', { userId: scimUser.id, error: error.message });
        }
      }

      // Check if there are more results
      hasMore = startIndex + data.itemsPerPage - 1 < data.totalResults;
      startIndex += data.itemsPerPage;

      // Safety check: don't exceed maxResults
      if (users.length >= maxResults) {
        hasMore = false;
      }
    }

    logger.info('Fetched SCIM users', { count: users.length });

    return users;
  }

  /**
   * Get a single user by ID
   */
  async getUser(userId: string): Promise<UserSynced | null> {
    try {
      const url = `${this.config.scimUrl}/Users/${userId}`;

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
          'Content-Type': 'application/scim+json',
          Accept: 'application/scim+json',
        },
      });

      if (response.statusCode === 404) {
        return null;
      }

      if (response.statusCode !== 200) {
        const body = await response.body.text();
        throw new Error(`Workday SCIM API error (${response.statusCode}): ${body}`);
      }

      const scimUser: SCIMUser = await response.body.json();

      return this.mapSCIMUser(scimUser);
    } catch (error: any) {
      logger.error('Failed to fetch user', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Map SCIM user to our event contract
   */
  private mapSCIMUser(scimUser: SCIMUser): UserSynced {
    const enterprise = scimUser['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'];
    const primaryEmail = scimUser.emails.find((e) => e.primary)?.value || scimUser.emails[0]?.value;
    const address = scimUser.addresses?.[0];

    // Determine employment status based on active flag
    const employmentStatus = scimUser.active ? 'active' : 'inactive';

    return {
      id: crypto.randomUUID(),
      version: 'v1',
      timestamp: new Date().toISOString(),
      type: 'external.user.synced',
      data: {
        externalId: scimUser.id,
        source: 'workday',
        companyId: this.config.companyId,
        action: 'updated', // SCIM sync is typically 'updated'
        user: {
          externalUserId: scimUser.externalId || scimUser.id,
          email: primaryEmail || scimUser.userName,
          firstName: scimUser.name.givenName,
          lastName: scimUser.name.familyName,
          displayName: scimUser.name.formatted,
          jobTitle: scimUser.title,
          department: enterprise?.department || scimUser.department,
          costCenter: enterprise?.costCenter || scimUser.costCenter,
          managerId: enterprise?.manager?.value || scimUser.manager?.value,
          location: address?.locality,
          country: address?.country,
          timezone: scimUser.timezone,
          employmentStatus,
        },
        orgStructure: {
          organizationId: enterprise?.organization,
          organizationName: enterprise?.organization,
          costCenterId: enterprise?.costCenter,
          costCenterName: enterprise?.costCenter,
          businessUnit: enterprise?.organization,
          division: enterprise?.division,
        },
      },
    };
  }

  /**
   * Health check - verify SCIM endpoint connectivity
   */
  async healthCheck(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to fetch service provider config
      const url = `${this.config.scimUrl}/ServiceProviderConfig`;

      const response = await request(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
          Accept: 'application/scim+json',
        },
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        logger.info('Workday SCIM health check successful');
        return { success: true };
      }

      return { success: false, error: `HTTP ${response.statusCode}` };
    } catch (error: any) {
      logger.error('Workday SCIM health check failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all cost centers (via custom Workday API if available)
   * Note: SCIM 2.0 doesn't have a standard for cost centers, so this may need customization
   */
  async getCostCenters(): Promise<Array<{ id: string; name: string }>> {
    try {
      // This would typically be a custom Workday REST API endpoint
      // For now, we'll extract cost centers from user data
      const users = await this.fetchAllUsers('active eq true', 100);

      const costCentersMap = new Map<string, string>();

      for (const userEvent of users) {
        const costCenterId = userEvent.data.orgStructure?.costCenterId;
        const costCenterName = userEvent.data.orgStructure?.costCenterName;

        if (costCenterId) {
          costCentersMap.set(costCenterId, costCenterName || costCenterId);
        }
      }

      const costCenters = Array.from(costCentersMap.entries()).map(([id, name]) => ({
        id,
        name,
      }));

      logger.info('Extracted cost centers from user data', { count: costCenters.length });

      return costCenters;
    } catch (error: any) {
      logger.error('Failed to get cost centers', { error: error.message });
      return [];
    }
  }
}

/**
 * Create Workday SCIM client from environment variables
 */
export function createWorkdaySCIMClient(companyId: string): WorkdaySCIMClient {
  const config: WorkdaySCIMConfig = {
    scimUrl: process.env.WORKDAY_SCIM_URL!,
    username: process.env.WORKDAY_ISU_USERNAME!,
    password: process.env.WORKDAY_ISU_PASSWORD!,
    tenantId: process.env.WORKDAY_TENANT_ID!,
    companyId,
  };

  if (!config.scimUrl || !config.username || !config.password || !config.tenantId) {
    throw new Error('Workday SCIM credentials are required');
  }

  return new WorkdaySCIMClient(config);
}
