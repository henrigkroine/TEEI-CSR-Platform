import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Event emitted when a participant attends a buddy program event.
 *
 * This event captures attendance at formal buddy program events
 * (distinct from informal hangouts logged in buddy.event.logged).
 * Used for CSR Platform metrics: SROI, VIS, engagement tracking.
 */
export const BuddyEventAttendedSchema = BaseEventSchema.extend({
  type: z.literal('buddy.event.attended'),
  data: z.object({
    eventId: z.string().uuid().describe('ID from Buddy System events table'),
    userId: z.string().uuid().describe('ID of user who attended'),
    matchId: z.string().uuid().optional().describe('Associated buddy match if applicable'),
    eventTitle: z.string().max(200),
    eventType: z.enum([
      'cultural', // Cultural exchange event
      'educational', // Workshop, training
      'professional', // Career/networking
      'social', // Community gathering
      'support', // Support group, check-in
      'recreational', // Sports, hobbies
      'language', // Language practice
      'other'
    ]),
    eventFormat: z.enum(['in-person', 'online', 'hybrid']),
    attendedAt: z.string().datetime().describe('When user attended (event date)'),
    location: z.string().max(200).optional(),
    durationMinutes: z.number().int().positive().optional().describe('Event duration in minutes'),
    attendeeCount: z.number().int().positive().optional().describe('Total attendees'),
    organizer: z.string().max(100).optional().describe('Event organizer'),
    categories: z.array(z.string()).optional().describe('Event categories/tags'),
    // SDG mapping fields for impact tracking
    sdgGoals: z.array(z.number().int().min(1).max(17)).optional().describe('UN SDG goals (1-17)'),
  }),
});

export type BuddyEventAttended = z.infer<typeof BuddyEventAttendedSchema>;
