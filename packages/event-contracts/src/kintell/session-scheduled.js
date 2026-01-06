import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
export const KintellSessionScheduledSchema = BaseEventSchema.extend({
    type: z.literal('kintell.session.scheduled'),
    data: z.object({
        sessionId: z.string().uuid(),
        externalSessionId: z.string().optional(),
        sessionType: z.enum(['language', 'mentorship']),
        participantId: z.string().uuid(),
        volunteerId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
    }),
});
//# sourceMappingURL=session-scheduled.js.map