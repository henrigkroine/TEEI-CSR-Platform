import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
export const SafetyReviewCompletedSchema = BaseEventSchema.extend({
    type: z.literal('safety.review.completed'),
    data: z.object({
        reviewId: z.string().uuid(),
        flagId: z.string().uuid(),
        reviewerId: z.string().uuid(),
        decision: z.enum(['approved', 'rejected', 'escalated']),
        notes: z.string().optional(),
        completedAt: z.string().datetime(),
    }),
});
//# sourceMappingURL=review-completed.js.map