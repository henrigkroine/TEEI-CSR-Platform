import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const OrchestrationJourneyMilestoneReachedSchema = BaseEventSchema.extend({
  type: z.literal('orchestration.journey.milestone.reached'),
  data: z.object({
    userId: z.string().uuid(),
    milestone: z.enum([
      'buddy_matched',
      'first_language_session',
      'language_level_up',
      'first_mentorship_session',
      'course_enrolled',
      'course_completed',
      'credential_earned',
      'job_ready',
    ]),
    reachedAt: z.string().datetime(),
    previousMilestone: z.string().optional(),
  }),
});

export type OrchestrationJourneyMilestoneReached = z.infer<
  typeof OrchestrationJourneyMilestoneReachedSchema
>;
