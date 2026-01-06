import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
export const NLQQueryRejectedSchema = BaseEventSchema.extend({
    type: z.literal('nlq.query.rejected'),
    data: z.object({
        queryId: z.string().uuid(),
        companyId: z.string().uuid(),
        userId: z.string().uuid().optional(),
        normalizedQuestion: z.string(),
        rejectionReason: z.enum([
            'unsafe_content',
            'pii_detected',
            'rate_limit',
            'invalid_intent',
            'blacklisted_pattern',
        ]),
        safetyScore: z.number().min(0).max(1).optional(),
        rejectedAt: z.string().datetime(),
    }),
});
//# sourceMappingURL=query-rejected.js.map