import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const UpskillingCourseCompletedSchema = BaseEventSchema.extend({
  type: z.literal('upskilling.course.completed'),
  data: z.object({
    progressId: z.string().uuid(),
    userId: z.string().uuid(),
    provider: z.string(), // ecornell, itslearning, etc.
    courseId: z.string(),
    courseName: z.string(),
    completedAt: z.string().datetime(),
    finalScore: z.number().min(0).max(100).optional(),
    credentialRef: z.string().optional(),
  }),
});

export type UpskillingCourseCompleted = z.infer<typeof UpskillingCourseCompletedSchema>;
