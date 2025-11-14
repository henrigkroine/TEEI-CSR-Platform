import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Event emitted when a buddy match is ended or dissolved.
 *
 * This event triggers profile updates and allows the CSR Platform to track:
 * - Match duration for impact metrics
 * - Reasons for ending (for program improvement)
 * - Whether participants completed their journey
 */
export const BuddyMatchEndedSchema = BaseEventSchema.extend({
  type: z.literal('buddy.match.ended'),
  data: z.object({
    matchId: z.string().uuid(),
    participantId: z.string().uuid(),
    buddyId: z.string().uuid(),
    endedAt: z.string().datetime(),
    duration: z.number().int().positive().describe('Match duration in days'),
    reason: z.enum([
      'completed', // Natural completion of program
      'participant_request', // Participant initiated end
      'buddy_request', // Buddy initiated end
      'mutual_agreement', // Both agreed to end
      'inactivity', // Automatic end due to no engagement
      'violation', // Policy violation
      'program_ended', // Program/company ended
      'other'
    ]),
    reasonDetails: z.string().max(500).optional().describe('Additional context about ending'),
    sessionsCompleted: z.number().int().nonnegative().optional().describe('Number of sessions during match'),
    eventsAttended: z.number().int().nonnegative().optional().describe('Events attended together'),
    feedback: z.object({
      participantSatisfaction: z.number().min(0).max(1).optional().describe('Normalized 0-1 satisfaction score'),
      buddySatisfaction: z.number().min(0).max(1).optional().describe('Normalized 0-1 satisfaction score'),
    }).optional(),
  }),
});

export type BuddyMatchEnded = z.infer<typeof BuddyMatchEndedSchema>;
