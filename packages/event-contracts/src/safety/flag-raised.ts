import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const SafetyFlagRaisedSchema = BaseEventSchema.extend({
  type: z.literal('safety.flag.raised'),
  data: z.object({
    flagId: z.string().uuid(),
    contentId: z.string().uuid(),
    contentType: z.enum(['feedback_text', 'checkin_note', 'message', 'other']),
    flagReason: z.enum(['profanity', 'pii_leakage', 'hate_speech', 'other']),
    confidence: z.number().min(0).max(1),
    requiresHumanReview: z.boolean(),
    raisedAt: z.string().datetime(),
  }),
});

export type SafetyFlagRaised = z.infer<typeof SafetyFlagRaisedSchema>;
