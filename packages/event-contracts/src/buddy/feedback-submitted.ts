import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const BuddyFeedbackSubmittedSchema = BaseEventSchema.extend({
  type: z.literal('buddy.feedback.submitted'),
  data: z.object({
    feedbackId: z.string().uuid(),
    matchId: z.string().uuid(),
    fromRole: z.enum(['participant', 'buddy']),
    rating: z.number().min(0).max(1), // Normalized 0-1
    feedbackText: z.string().optional(),
    submittedAt: z.string().datetime(),
    categories: z
      .object({
        communication: z.number().min(0).max(1).optional(),
        helpfulness: z.number().min(0).max(1).optional(),
        engagement: z.number().min(0).max(1).optional(),
      })
      .optional(),
  }),
});

export type BuddyFeedbackSubmitted = z.infer<typeof BuddyFeedbackSubmittedSchema>;
