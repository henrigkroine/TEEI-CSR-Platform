import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const UpskillingProgressUpdatedSchema = BaseEventSchema.extend({
  type: z.literal('upskilling.progress.updated'),
  data: z.object({
    progressId: z.string().uuid(),
    userId: z.string().uuid(),
    provider: z.string(),
    courseId: z.string(),
    courseName: z.string(),
    progressPercent: z.number().int().min(0).max(100),
    status: z.enum(['enrolled', 'in_progress', 'completed', 'dropped']),
    updatedAt: z.string().datetime(),
  }),
});

export type UpskillingProgressUpdated = z.infer<typeof UpskillingProgressUpdatedSchema>;
