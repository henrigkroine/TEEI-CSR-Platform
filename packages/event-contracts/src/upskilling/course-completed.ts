import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Agent 22: event-contract-enricher
 * Enhanced with program context for better tracking and rollups
 */
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

    // Program Context (added by Agent 22)
    programId: z.string().uuid().optional(), // Links to programs table
    campaignId: z.string().uuid().optional(), // Links to program_campaigns table
    beneficiaryGroupId: z.string().uuid().optional(), // Links to beneficiary_groups table
  }),
});

export type UpskillingCourseCompleted = z.infer<typeof UpskillingCourseCompletedSchema>;
