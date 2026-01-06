import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
/**
 * Agent 22: event-contract-enricher
 * Enhanced with program context for better tracking and rollups
 */
export const BuddyMatchCreatedSchema = BaseEventSchema.extend({
    type: z.literal('buddy.match.created'),
    data: z.object({
        matchId: z.string().uuid(),
        participantId: z.string().uuid(),
        buddyId: z.string().uuid(),
        matchedAt: z.string().datetime(),
        matchingCriteria: z
            .object({
            language: z.string().optional(),
            interests: z.array(z.string()).optional(),
            location: z.string().optional(),
        })
            .optional(),
        // Program Context (added by Agent 22)
        programId: z.string().uuid().optional(), // Links to programs table
        campaignId: z.string().uuid().optional(), // Links to program_campaigns table
        beneficiaryGroupId: z.string().uuid().optional(), // Links to beneficiary_groups table
    }),
});
//# sourceMappingURL=match-created.js.map