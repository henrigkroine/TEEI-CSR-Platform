import { getEncryptionService } from './encryption.js';
import type { EncryptionService } from './encryption.js';

/**
 * GDPR Compliance Service
 *
 * Provides utilities for:
 * - PII encryption/decryption
 * - Consent validation
 * - Data export (portability)
 * - Data erasure
 * - Audit logging
 */

export interface PIIField {
  fieldName: string;
  value: string;
  context: string; // e.g., 'user:123:email'
}

export interface EncryptedPIIField {
  fieldName: string;
  encryptedValue: string;
  searchHash?: string;
}

export interface DataExportOptions {
  format: 'json' | 'csv';
  includeSystems: string[];
  includeMetrics?: boolean;
  includeDerived?: boolean;
}

export interface UserDataExport {
  userId: string;
  exportedAt: string;
  format: string;
  systems: {
    [systemName: string]: any;
  };
  metadata: {
    exportedBy: string;
    requestId?: string;
    consentStatus: ConsentSummary;
  };
}

export interface ConsentSummary {
  marketing: boolean;
  analytics: boolean;
  buddyProgram: boolean;
  dataSharing: boolean;
  lastUpdated: string;
}

export interface DeletionResult {
  userId: string;
  deletedAt: string;
  systemsDeleted: string[];
  verificationHash: string;
  retainedData?: {
    category: string;
    reason: string;
    anonymized: boolean;
  }[];
}

export class GDPRService {
  private encryption: EncryptionService;

  constructor(encryptionService?: EncryptionService) {
    this.encryption = encryptionService || getEncryptionService();
  }

  /**
   * Encrypts multiple PII fields
   */
  encryptPIIFields(fields: PIIField[]): EncryptedPIIField[] {
    return fields.map(field => ({
      fieldName: field.fieldName,
      encryptedValue: this.encryption.encryptToString(field.value, field.context),
      searchHash: this.isSearchableField(field.fieldName)
        ? this.encryption.createSearchableHash(field.value, field.context)
        : undefined,
    }));
  }

  /**
   * Decrypts multiple PII fields
   */
  decryptPIIFields(
    fields: EncryptedPIIField[],
    context: string
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const field of fields) {
      try {
        result[field.fieldName] = this.encryption.decryptFromString(
          field.encryptedValue,
          context
        );
      } catch (error) {
        throw new Error(
          `Failed to decrypt ${field.fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return result;
  }

  /**
   * Determines if a field should have a searchable hash
   */
  private isSearchableField(fieldName: string): boolean {
    const searchableFields = ['email', 'phone', 'nationalId'];
    return searchableFields.includes(fieldName);
  }

  /**
   * Creates a searchable hash for finding users by encrypted fields
   */
  createSearchHash(value: string, fieldName: string): string {
    return this.encryption.createSearchableHash(value, `search:${fieldName}`);
  }

  /**
   * Validates consent for a specific purpose
   */
  validateConsent(
    consents: ConsentSummary,
    purpose: keyof ConsentSummary
  ): boolean {
    if (purpose === 'lastUpdated') {
      throw new Error('Cannot validate consent for lastUpdated field');
    }
    return consents[purpose] === true;
  }

  /**
   * Exports user data in GDPR-compliant format
   * Implements Article 20 - Right to data portability
   */
  async exportUserData(
    userId: string,
    userData: any,
    options: DataExportOptions
  ): Promise<UserDataExport> {
    const exportData: UserDataExport = {
      userId,
      exportedAt: new Date().toISOString(),
      format: options.format,
      systems: {},
      metadata: {
        exportedBy: userId,
        consentStatus: userData.consentStatus || {
          marketing: false,
          analytics: false,
          buddyProgram: false,
          dataSharing: false,
          lastUpdated: new Date().toISOString(),
        },
      },
    };

    // Include data from specified systems
    for (const system of options.includeSystems) {
      exportData.systems[system] = userData[system] || {};
    }

    return exportData;
  }

  /**
   * Converts export to CSV format
   */
  exportToCSV(data: UserDataExport): string {
    const rows: string[][] = [];

    // Header
    rows.push(['Category', 'Field', 'Value']);

    // Flatten nested data
    for (const [system, systemData] of Object.entries(data.systems)) {
      if (typeof systemData === 'object' && systemData !== null) {
        this.flattenObjectToRows(systemData, system, rows);
      }
    }

    // Convert to CSV
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Helper to flatten nested objects for CSV export
   */
  private flattenObjectToRows(
    obj: any,
    prefix: string,
    rows: string[][]
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        this.flattenObjectToRows(value, `${prefix}.${key}`, rows);
      } else {
        rows.push([
          prefix,
          key,
          Array.isArray(value) ? JSON.stringify(value) : String(value),
        ]);
      }
    }
  }

  /**
   * Anonymizes user data for retention after deletion request
   * Keeps statistical data but removes PII
   */
  anonymizeUserData(userData: any): any {
    const anonymized = { ...userData };

    // Remove all PII fields
    const piiFields = [
      'email',
      'phone',
      'displayName',
      'address',
      'dateOfBirth',
      'nationalId',
      'emergencyContact',
    ];

    for (const field of piiFields) {
      if (field in anonymized) {
        delete anonymized[field];
      }
    }

    // Replace identifiable fields with anonymized values
    if (anonymized.id) {
      anonymized.id = `ANONYMIZED_${this.generateAnonymizedId()}`;
    }

    // Keep statistical/aggregate data
    // e.g., events attended, skills learned (without names)

    return anonymized;
  }

  /**
   * Generates a verification hash for deleted data
   * Used to prove deletion occurred
   */
  generateDeletionHash(userId: string, deletedData: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify({
      userId,
      deletedAt: new Date().toISOString(),
      dataHash: crypto.createHash('sha256').update(JSON.stringify(deletedData)).digest('hex'),
    });

    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generates an anonymized ID
   */
  private generateAnonymizedId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Checks if data should be retained per retention policy
   */
  shouldRetainData(
    dataCategory: string,
    retentionPolicies: Map<string, number>
  ): boolean {
    const retentionDays = retentionPolicies.get(dataCategory);

    if (retentionDays === undefined) {
      // No policy = don't retain
      return false;
    }

    if (retentionDays === -1) {
      // -1 means indefinite retention
      return true;
    }

    return retentionDays > 0;
  }

  /**
   * Calculates data retention expiry date
   */
  calculateRetentionExpiry(createdAt: Date, retentionDays: number): Date {
    const expiry = new Date(createdAt);
    expiry.setDate(expiry.getDate() + retentionDays);
    return expiry;
  }
}

/**
 * Singleton instance
 */
let gdprServiceInstance: GDPRService | null = null;

export function getGDPRService(): GDPRService {
  if (!gdprServiceInstance) {
    gdprServiceInstance = new GDPRService();
  }
  return gdprServiceInstance;
}
