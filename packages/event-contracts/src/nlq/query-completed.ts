import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const NLQQueryCompletedSchema = BaseEventSchema.extend({
  type: z.literal('nlq.query.completed'),
  data: z.object({
    queryId: z.string().uuid(),
    companyId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    templateId: z.string(),
    executionTimeMs: z.number().int().positive(),
    cached: z.boolean(),
    resultRowCount: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(1),
    safetyPassed: z.boolean(),
    completedAt: z.string().datetime(),
  }),
});

export type NLQQueryCompleted = z.infer<typeof NLQQueryCompletedSchema>;
