import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Directory Entry - normalized from Workday SCIM/directory sync
 * Represents an employee record for VIS/SROI attribution
 */
export const DirectoryEntrySchema = BaseEventSchema.extend({
  type: z.literal('ingest.directory.synced'),
  data: z.object({
    // Source tracking
    sourceSystem: z.enum(['workday', 'adp', 'bamboohr', 'manual']),
    sourceId: z.string(), // Employee ID in source system
    sourceTenantId: z.string(), // Tenant/org ID in source system

    // Employee identity
    userId: z.string().uuid().optional(), // TEEI user ID (if already exists)
    externalUserId: z.string(), // Employee ID in HR system
    companyId: z.string().uuid(), // TEEI company ID

    // Personal info (PII - will be redacted before storage)
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().optional(),

    // Employment details
    employeeNumber: z.string().optional(),
    employeeType: z.enum([
      'full_time',
      'part_time',
      'contractor',
      'intern',
      'temporary',
      'other'
    ]).optional(),
    status: z.enum(['active', 'inactive', 'terminated', 'on_leave']),

    // Organization hierarchy (for VIS/SROI attribution)
    department: z.string().optional(),
    division: z.string().optional(),
    businessUnit: z.string().optional(),
    costCenter: z.string().optional(),
    location: z.object({
      country: z.string(),
      region: z.string().optional(),
      city: z.string().optional(),
      office: z.string().optional(),
    }).optional(),

    // Manager/reporting structure
    managerId: z.string().optional(),
    managerEmail: z.string().email().optional(),

    // Job details
    jobTitle: z.string().optional(),
    jobLevel: z.string().optional(),
    jobFamily: z.string().optional(),

    // Dates
    hireDate: z.string().datetime().optional(),
    terminationDate: z.string().datetime().optional(),
    lastUpdated: z.string().datetime(),

    // Permissions
    permissions: z.object({
      canVolunteer: z.boolean().default(true),
      canDonate: z.boolean().default(true),
      canAccessPlatform: z.boolean().default(true),
    }).optional(),

    // Metadata
    customFields: z.record(z.unknown()).optional(),
  }),
});

export type DirectoryEntry = z.infer<typeof DirectoryEntrySchema>;

/**
 * Factory function to create a DirectoryEntry
 */
export function createDirectoryEntry(
  data: z.infer<typeof DirectoryEntrySchema>['data'],
  metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
  }
): DirectoryEntry {
  return {
    id: crypto.randomUUID(),
    version: 'v1',
    timestamp: new Date().toISOString(),
    type: 'ingest.directory.synced',
    correlationId: metadata?.correlationId,
    causationId: metadata?.causationId,
    metadata,
    data,
  };
}
