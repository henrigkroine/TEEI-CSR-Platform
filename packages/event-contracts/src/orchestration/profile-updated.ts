import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const OrchestrationProfileUpdatedSchema = BaseEventSchema.extend({
  type: z.literal('orchestration.profile.updated'),
  data: z.object({
    userId: z.string().uuid(),
    updatedFields: z.array(z.string()),
    updatedAt: z.string().datetime(),
    trigger: z.string().optional(), // Event that triggered this update
  }),
});

export type OrchestrationProfileUpdated = z.infer<typeof OrchestrationProfileUpdatedSchema>;
