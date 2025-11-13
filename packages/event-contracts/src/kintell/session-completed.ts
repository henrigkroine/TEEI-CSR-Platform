import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const KintellSessionCompletedSchema = BaseEventSchema.extend({
  type: z.literal('kintell.session.completed'),
  data: z.object({
    sessionId: z.string().uuid(),
    externalSessionId: z.string().optional(), // Kintell's ID
    sessionType: z.enum(['language', 'mentorship']),
    participantId: z.string().uuid(),
    volunteerId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    durationMinutes: z.number().int().positive(),
    topics: z.array(z.string()).optional(),
    languageLevel: z.string().optional(), // CEFR level: A1, A2, B1, B2, C1, C2
  }),
});

export type KintellSessionCompleted = z.infer<typeof KintellSessionCompletedSchema>;
