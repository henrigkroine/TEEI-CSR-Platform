import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const KintellRatingCreatedSchema = BaseEventSchema.extend({
  type: z.literal('kintell.rating.created'),
  data: z.object({
    ratingId: z.string().uuid(),
    sessionId: z.string().uuid(),
    fromRole: z.enum(['participant', 'volunteer']),
    rating: z.number().min(0).max(1), // Normalized 0-1
    feedbackText: z.string().optional(),
    createdAt: z.string().datetime(),
  }),
});

export type KintellRatingCreated = z.infer<typeof KintellRatingCreatedSchema>;
