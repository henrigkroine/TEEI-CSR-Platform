import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * User sync event from external HR/directory systems (Workday SCIM)
 * Represents user profile data synchronized from external systems
 */
export const UserSyncedSchema = BaseEventSchema.extend({
  type: z.literal('external.user.synced'),
  data: z.object({
    externalId: z.string(), // Employee ID from external system
    source: z.enum(['workday', 'azure_ad', 'okta']),
    companyId: z.string().uuid(),
    action: z.enum(['created', 'updated', 'deactivated']),
    user: z.object({
      externalUserId: z.string(),
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      displayName: z.string().optional(),
      jobTitle: z.string().optional(),
      department: z.string().optional(),
      costCenter: z.string().optional(),
      managerId: z.string().optional(),
      location: z.string().optional(),
      country: z.string().optional(),
      timezone: z.string().optional(),
      startDate: z.string().datetime().optional(),
      employmentStatus: z.enum(['active', 'inactive', 'terminated', 'leave']).optional(),
      employmentType: z.enum(['full_time', 'part_time', 'contractor', 'intern']).optional(),
    }),
    orgStructure: z.object({
      organizationId: z.string().optional(),
      organizationName: z.string().optional(),
      costCenterId: z.string().optional(),
      costCenterName: z.string().optional(),
      businessUnit: z.string().optional(),
      division: z.string().optional(),
    }).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type UserSynced = z.infer<typeof UserSyncedSchema>;
