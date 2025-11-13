import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const BuddyMatchCreatedSchema = BaseEventSchema.extend({
  type: z.literal('buddy.match.created'),
  data: z.object({
    matchId: z.string().uuid(),
    participantId: z.string().uuid(),
    buddyId: z.string().uuid(),
    matchedAt: z.string().datetime(),
    matchingCriteria: z
      .object({
        language: z.string().optional(),
        interests: z.array(z.string()).optional(),
        location: z.string().optional(),
      })
      .optional(),
  }),
});

export type BuddyMatchCreated = z.infer<typeof BuddyMatchCreatedSchema>;
