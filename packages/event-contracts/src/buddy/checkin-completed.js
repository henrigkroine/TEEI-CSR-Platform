import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
export const BuddyCheckinCompletedSchema = BaseEventSchema.extend({
    type: z.literal('buddy.checkin.completed'),
    data: z.object({
        checkinId: z.string().uuid(),
        matchId: z.string().uuid(),
        checkinDate: z.string().datetime(),
        mood: z.enum(['great', 'good', 'okay', 'struggling', 'difficult']).optional(),
        notes: z.string().optional(),
        questionResponses: z.record(z.unknown()).optional(),
    }),
});
//# sourceMappingURL=checkin-completed.js.map