import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Event emitted when a skill exchange session is completed between buddy pairs or community members.
 *
 * Captures both formal and informal skill sharing sessions for:
 * - VIS (Volunteer Impact Score) calculation
 * - SROI contribution (skills transferred = social value)
 * - SDG 4 (Quality Education) mapping
 */
export const BuddySkillShareCompletedSchema = BaseEventSchema.extend({
  type: z.literal('buddy.skill_share.completed'),
  data: z.object({
    sessionId: z.string().uuid().describe('ID from skill_sessions table'),
    skillId: z.number().int().positive().describe('ID from skills table'),
    skillName: z.string().max(100).describe('Name of skill shared'),
    skillCategory: z.string().max(50).optional().describe('Category (e.g., language, tech, professional)'),
    teacherId: z.string().uuid().describe('User who taught the skill'),
    learnerId: z.string().uuid().describe('User who learned the skill'),
    matchId: z.string().uuid().optional().describe('Associated buddy match if applicable'),
    completedAt: z.string().datetime(),
    scheduledAt: z.string().datetime().optional().describe('When session was scheduled'),
    durationMinutes: z.number().int().positive().optional().describe('Session duration'),
    format: z.enum(['in-person', 'online', 'hybrid']).optional(),
    proficiencyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Level taught'),
    feedback: z.object({
      teacherRating: z.number().min(0).max(1).optional().describe('Normalized 0-1 rating'),
      learnerRating: z.number().min(0).max(1).optional().describe('Normalized 0-1 rating'),
      teacherComment: z.string().max(500).optional(),
      learnerComment: z.string().max(500).optional(),
      learnerProgress: z.enum(['no-progress', 'some-progress', 'good-progress', 'excellent-progress']).optional(),
    }).optional(),
    // Impact tracking
    sdgGoals: z.array(z.number().int().min(1).max(17)).optional().describe('UN SDG goals (typically 4, 8)'),
    valuationPoints: z.number().int().positive().optional().describe('Points for SROI calculation'),
  }),
});

export type BuddySkillShareCompleted = z.infer<typeof BuddySkillShareCompletedSchema>;
