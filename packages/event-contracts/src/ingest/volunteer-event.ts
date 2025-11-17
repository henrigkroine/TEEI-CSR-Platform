import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Volunteer Event - normalized from external platforms (Benevity, Goodera)
 * Represents a volunteering activity by an employee
 */
export const VolunteerEventSchema = BaseEventSchema.extend({
  type: z.literal('ingest.volunteer.logged'),
  data: z.object({
    // Source tracking
    sourceSystem: z.enum(['benevity', 'goodera', 'workday', 'manual']),
    sourceId: z.string(), // Unique ID from source system
    sourceTenantId: z.string(), // Tenant/org ID in source system

    // Volunteer details
    userId: z.string().uuid(), // TEEI user ID (resolved from external ID)
    externalUserId: z.string(), // User ID in source system
    companyId: z.string().uuid(), // TEEI company ID

    // Activity details
    activityName: z.string(),
    activityDescription: z.string().optional(),
    activityType: z.enum([
      'skills_volunteering',
      'hands_on_volunteering',
      'virtual_volunteering',
      'board_service',
      'pro_bono',
      'other'
    ]),

    // Hours and impact
    hoursLogged: z.number().min(0),
    activityDate: z.string().datetime(),

    // Organization/cause
    nonprofitName: z.string().optional(),
    nonprofitId: z.string().optional(), // EIN or external ID
    causeArea: z.string().optional(),

    // SDG alignment (if provided)
    sdgGoals: z.array(z.number().int().min(1).max(17)).optional(),

    // Verification
    verified: z.boolean().default(false),
    verifiedBy: z.string().optional(),
    verifiedAt: z.string().datetime().optional(),

    // Metadata
    tags: z.array(z.string()).optional(),
    location: z.object({
      country: z.string().optional(),
      city: z.string().optional(),
      coordinates: z.object({
        lat: z.number(),
        lon: z.number(),
      }).optional(),
    }).optional(),
  }),
});

export type VolunteerEvent = z.infer<typeof VolunteerEventSchema>;

/**
 * Factory function to create a VolunteerEvent
 */
export function createVolunteerEvent(
  data: z.infer<typeof VolunteerEventSchema>['data'],
  metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
  }
): VolunteerEvent {
  return {
    id: crypto.randomUUID(),
    version: 'v1',
    timestamp: new Date().toISOString(),
    type: 'ingest.volunteer.logged',
    correlationId: metadata?.correlationId,
    causationId: metadata?.causationId,
    metadata,
    data,
  };
}
