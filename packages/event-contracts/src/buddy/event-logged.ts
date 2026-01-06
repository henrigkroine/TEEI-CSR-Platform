import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const BuddyEventLoggedSchema = BaseEventSchema.extend({
  type: z.literal('buddy.event.logged'),
  data: z.object({
    eventId: z.string().uuid(),
    matchId: z.string().uuid(),
    eventType: z.string(), // hangout, activity, workshop, etc.
    eventDate: z.string().datetime(),
    description: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string().uuid()).optional(),
  }),
});

export type BuddyEventLogged = z.infer<typeof BuddyEventLoggedSchema>;
