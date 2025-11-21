import type { DirectoryEntry } from '@teei/event-contracts';
import { createDirectoryEntry } from '@teei/event-contracts';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:workday-ingest');

export interface WorkdayIngestConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  mockMode?: boolean;
}

export interface WorkdayAuthToken {
  accessToken: string;
  expiresAt: number;
}

export interface WorkdayIngestResult {
  success: boolean;
  directoryEntries: DirectoryEntry[];
  errors: string[];
  metadata: {
    totalRecords: number;
    recordsProcessed: number;
    recordsFailed: number;
    lastSyncTimestamp: string;
  };
}

/**
 * Workday Ingest Client
 * Pulls employee directory data via SCIM 2.0 API
 */
export class WorkdayIngestClient {
  private config: WorkdayIngestConfig;
  private authToken: WorkdayAuthToken | null = null;

  constructor(config: WorkdayIngestConfig) {
    this.config = config;
  }

  /**
   * Fetch employee directory via SCIM 2.0
   * @param companyId TEEI company ID
   * @param filter SCIM filter expression (optional)
   */
  async fetchDirectory(
    companyId: string,
    filter?: string
  ): Promise<WorkdayIngestResult> {
    if (this.config.mockMode) {
      return this.mockFetchDirectory(companyId);
    }

    await this.ensureValidToken();

    const directoryEntries: DirectoryEntry[] = [];
    const errors: string[] = [];
    let totalRecords = 0;
    let recordsProcessed = 0;
    let recordsFailed = 0;
    let startIndex = 1;
    const count = 100; // SCIM page size
    let totalResults = 0;

    try {
      do {
        const queryParams = new URLSearchParams({
          startIndex: startIndex.toString(),
          count: count.toString(),
          ...(filter && { filter }),
        });

        const response = await fetch(
          `${this.config.apiUrl}/scim/v2/Users?${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${this.authToken?.accessToken}`,
              'Content-Type': 'application/scim+json',
              'X-Workday-Tenant': this.config.tenantId,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Workday SCIM error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        totalResults = data.totalResults || 0;
        totalRecords += data.Resources?.length || 0;

        // Process each employee
        for (const user of data.Resources || []) {
          try {
            const directoryEntry = this.mapSCIMUser(user, companyId);
            directoryEntries.push(directoryEntry);
            recordsProcessed++;
          } catch (error: any) {
            logger.error('Failed to map SCIM user', {
              userId: user.id,
              error: error.message,
            });
            errors.push(`User ${user.id}: ${error.message}`);
            recordsFailed++;
          }
        }

        startIndex += count;
      } while (startIndex <= totalResults && startIndex < 1000); // Safety limit

      logger.info('Workday directory synced', {
        companyId,
        totalRecords,
        recordsProcessed,
        recordsFailed,
      });

      return {
        success: errors.length === 0,
        directoryEntries,
        errors,
        metadata: {
          totalRecords,
          recordsProcessed,
          recordsFailed,
          lastSyncTimestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error('Failed to fetch Workday directory', { error: error.message });
      return {
        success: false,
        directoryEntries,
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
   * Map SCIM user to TEEI DirectoryEntry
   */
  private mapSCIMUser(scimUser: any, companyId: string): DirectoryEntry {
    const workdayExtension = scimUser['urn:ietf:params:scim:schemas:extension:workday:2.0:User'] || {};

    return createDirectoryEntry({
      sourceSystem: 'workday',
      sourceId: scimUser.id || scimUser.externalId,
      sourceTenantId: this.config.tenantId,
      externalUserId: scimUser.externalId || scimUser.userName,
      companyId,

      // Personal info (PII)
      email: scimUser.emails?.[0]?.value || scimUser.userName,
      firstName: scimUser.name?.givenName || '',
      lastName: scimUser.name?.familyName || '',
      displayName: scimUser.displayName || scimUser.name?.formatted,

      // Employment details
      employeeNumber: workdayExtension.employeeID || scimUser.externalId,
      employeeType: this.mapEmployeeType(workdayExtension.employeeType),
      status: scimUser.active ? 'active' : 'inactive',

      // Organization
      department: scimUser.department || workdayExtension.department,
      division: workdayExtension.division,
      businessUnit: workdayExtension.businessUnit,
      costCenter: workdayExtension.costCenter,
      location: {
        country: scimUser.addresses?.[0]?.country,
        region: scimUser.addresses?.[0]?.region,
        city: scimUser.addresses?.[0]?.locality,
        office: workdayExtension.location,
      },

      // Manager
      managerId: scimUser.manager?.value,
      managerEmail: scimUser.manager?.$ref,

      // Job
      jobTitle: scimUser.title || workdayExtension.jobTitle,
      jobLevel: workdayExtension.jobLevel,
      jobFamily: workdayExtension.jobFamily,

      // Dates
      hireDate: workdayExtension.hireDate,
      terminationDate: workdayExtension.terminationDate,
      lastUpdated: scimUser.meta?.lastModified || new Date().toISOString(),

      // Permissions
      permissions: {
        canVolunteer: true,
        canDonate: true,
        canAccessPlatform: scimUser.active,
      },

      // Custom fields
      customFields: workdayExtension.customFields,
    });
  }

  /**
   * Map Workday employee type to TEEI employee type
   */
  private mapEmployeeType(workdayType: string): any {
    const typeMap: Record<string, string> = {
      'Full_Time': 'full_time',
      'Part_Time': 'part_time',
      'Contractor': 'contractor',
      'Intern': 'intern',
      'Temporary': 'temporary',
    };
    return typeMap[workdayType] || 'other';
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
          scope: 'scim',
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000) - 60000,
      };

      logger.info('Workday OAuth token obtained');
    } catch (error: any) {
      throw new Error(`Workday OAuth failed: ${error.message}`);
    }
  }

  /**
   * Mock implementation
   */
  private async mockFetchDirectory(companyId: string): Promise<WorkdayIngestResult> {
    logger.info('[MOCK] Fetching Workday directory', { companyId });

    const mockEntries: DirectoryEntry[] = [
      createDirectoryEntry({
        sourceSystem: 'workday',
        sourceId: 'wd-emp-001',
        sourceTenantId: this.config.tenantId,
        externalUserId: 'john.doe@company.com',
        companyId,
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        employeeNumber: 'EMP001',
        employeeType: 'full_time',
        status: 'active',
        department: 'Engineering',
        jobTitle: 'Software Engineer',
        hireDate: '2023-01-15T00:00:00Z',
        lastUpdated: new Date().toISOString(),
        location: {
          country: 'US',
          city: 'San Francisco',
        },
      }),
    ];

    return {
      success: true,
      directoryEntries: mockEntries,
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
