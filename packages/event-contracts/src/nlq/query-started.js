import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
export const NLQQueryStartedSchema = BaseEventSchema.extend({
    type: z.literal('nlq.query.started'),
    data: z.object({
        queryId: z.string().uuid(),
        companyId: z.string().uuid(),
        userId: z.string().uuid().optional(),
        normalizedQuestion: z.string(),
        templateId: z.string().optional(),
        startedAt: z.string().datetime(),
    }),
});
//# sourceMappingURL=query-started.js.map