import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
/**
 * Event emitted when a user completes a milestone in the buddy program.
 *
 * Milestones track participant journey progress and are used for:
 * - VIS (Volunteer Impact Score) - milestones add significant points
 * - Journey orchestration triggers (e.g., first match, first event)
 * - Gamification and engagement metrics
 * - Achievement/badge system
 */
export const BuddyMilestoneReachedSchema = BaseEventSchema.extend({
    type: z.literal('buddy.milestone.reached'),
    data: z.object({
        milestoneId: z.number().int().positive().describe('ID from milestones table'),
        userId: z.string().uuid().describe('User who reached the milestone'),
        milestoneTitle: z.string().max(100),
        milestoneCategory: z.enum([
            'onboarding', // First steps, profile completion
            'cultural', // Cultural exchange milestones
            'language', // Language learning achievements
            'community', // Community engagement
            'professional', // Career/networking
            'skills', // Skills exchange
            'events', // Event participation
            'buddy-connection', // Buddy relationship milestones
            'impact', // Giving back, helping others
            'completion', // Program completion
            'other'
        ]),
        reachedAt: z.string().datetime(),
        points: z.number().int().nonnegative().describe('Points awarded for this milestone'),
        badgeIcon: z.string().max(50).optional().describe('Badge icon identifier'),
        targetRole: z.enum(['participant', 'buddy', 'all']).optional(),
        progress: z.object({
            currentStep: z.number().int().positive().optional(),
            totalSteps: z.number().int().positive().optional(),
            completedSteps: z.array(z.string()).optional().describe('IDs of completed steps'),
        }).optional(),
        metadata: z.object({
            isFirstTime: z.boolean().optional().describe('First time reaching this type of milestone'),
            streakCount: z.number().int().positive().optional().describe('Consecutive milestones in category'),
            relatedEntities: z.array(z.object({
                type: z.string(),
                id: z.string(),
            })).optional().describe('Related matches, events, sessions, etc.'),
        }).optional(),
    }),
});
//# sourceMappingURL=milestone-reached.js.map