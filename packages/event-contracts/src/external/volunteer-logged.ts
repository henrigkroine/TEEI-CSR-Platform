import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Volunteer event from external CSR platforms (Benevity, Goodera)
 * Represents volunteer hours logged by employees
 */
export const VolunteerLoggedSchema = BaseEventSchema.extend({
  type: z.literal('external.volunteer.logged'),
  data: z.object({
    externalId: z.string(), // ID from external platform
    source: z.enum(['benevity', 'goodera', 'workday']),
    userId: z.string().uuid(),
    companyId: z.string().uuid(),
    activityName: z.string(),
    activityType: z.enum([
      'skills_based',
      'general',
      'mentorship',
      'tutoring',
      'event',
      'other',
    ]),
    hours: z.number().positive(),
    activityDate: z.string().datetime(),
    causeArea: z.string().optional(),
    nonprofitName: z.string().optional(),
    nonprofitId: z.string().optional(),
    location: z.string().optional(),
    teamBased: z.boolean().default(false),
    teamSize: z.number().int().positive().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type VolunteerLogged = z.infer<typeof VolunteerLoggedSchema>;
