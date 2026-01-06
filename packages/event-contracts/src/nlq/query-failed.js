import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
export const NLQQueryFailedSchema = BaseEventSchema.extend({
    type: z.literal('nlq.query.failed'),
    data: z.object({
        queryId: z.string().uuid(),
        companyId: z.string().uuid(),
        userId: z.string().uuid().optional(),
        normalizedQuestion: z.string(),
        templateId: z.string().optional(),
        errorMessage: z.string(),
        errorType: z.enum(['validation', 'execution', 'timeout', 'unknown']),
        executionTimeMs: z.number().int().nonnegative(),
        failedAt: z.string().datetime(),
    }),
});
//# sourceMappingURL=query-failed.js.map