import { z } from 'zod';
/**
 * Event emitted when a skill exchange session is completed between buddy pairs or community members.
 *
 * Captures both formal and informal skill sharing sessions for:
 * - VIS (Volunteer Impact Score) calculation
 * - SROI contribution (skills transferred = social value)
 * - SDG 4 (Quality Education) mapping
 */
export declare const BuddySkillShareCompletedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.skill_share.completed">;
    data: z.ZodObject<{
        sessionId: z.ZodString;
        skillId: z.ZodNumber;
        skillName: z.ZodString;
        skillCategory: z.ZodOptional<z.ZodString>;
        teacherId: z.ZodString;
        learnerId: z.ZodString;
        matchId: z.ZodOptional<z.ZodString>;
        completedAt: z.ZodString;
        scheduledAt: z.ZodOptional<z.ZodString>;
        durationMinutes: z.ZodOptional<z.ZodNumber>;
        format: z.ZodOptional<z.ZodEnum<["in-person", "online", "hybrid"]>>;
        proficiencyLevel: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
        feedback: z.ZodOptional<z.ZodObject<{
            teacherRating: z.ZodOptional<z.ZodNumber>;
            learnerRating: z.ZodOptional<z.ZodNumber>;
            teacherComment: z.ZodOptional<z.ZodString>;
            learnerComment: z.ZodOptional<z.ZodString>;
            learnerProgress: z.ZodOptional<z.ZodEnum<["no-progress", "some-progress", "good-progress", "excellent-progress"]>>;
        }, "strip", z.ZodTypeAny, {
            teacherRating?: number | undefined;
            learnerRating?: number | undefined;
            teacherComment?: string | undefined;
            learnerComment?: string | undefined;
            learnerProgress?: "no-progress" | "some-progress" | "good-progress" | "excellent-progress" | undefined;
        }, {
            teacherRating?: number | undefined;
            learnerRating?: number | undefined;
            teacherComment?: string | undefined;
            learnerComment?: string | undefined;
            learnerProgress?: "no-progress" | "some-progress" | "good-progress" | "excellent-progress" | undefined;
        }>>;
        sdgGoals: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        valuationPoints: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sessionId: string;
        skillId: number;
        skillName: string;
        teacherId: string;
        learnerId: string;
        completedAt: string;
        matchId?: string | undefined;
        feedback?: {
            teacherRating?: number | undefined;
            learnerRating?: number | undefined;
            teacherComment?: string | undefined;
            learnerComment?: string | undefined;
            learnerProgress?: "no-progress" | "some-progress" | "good-progress" | "excellent-progress" | undefined;
        } | undefined;
        durationMinutes?: number | undefined;
        sdgGoals?: number[] | undefined;
        skillCategory?: string | undefined;
        scheduledAt?: string | undefined;
        format?: "in-person" | "online" | "hybrid" | undefined;
        proficiencyLevel?: "beginner" | "intermediate" | "advanced" | undefined;
        valuationPoints?: number | undefined;
    }, {
        sessionId: string;
        skillId: number;
        skillName: string;
        teacherId: string;
        learnerId: string;
        completedAt: string;
        matchId?: string | undefined;
        feedback?: {
            teacherRating?: number | undefined;
            learnerRating?: number | undefined;
            teacherComment?: string | undefined;
            learnerComment?: string | undefined;
            learnerProgress?: "no-progress" | "some-progress" | "good-progress" | "excellent-progress" | undefined;
        } | undefined;
        durationMinutes?: number | undefined;
        sdgGoals?: number[] | undefined;
        skillCategory?: string | undefined;
        scheduledAt?: string | undefined;
        format?: "in-person" | "online" | "hybrid" | undefined;
        proficiencyLevel?: "beginner" | "intermediate" | "advanced" | undefined;
        valuationPoints?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.skill_share.completed";
    data: {
        sessionId: string;
        skillId: number;
        skillName: string;
        teacherId: string;
        learnerId: string;
        completedAt: string;
        matchId?: string | undefined;
        feedback?: {
            teacherRating?: number | undefined;
            learnerRating?: number | undefined;
            teacherComment?: string | undefined;
            learnerComment?: string | undefined;
            learnerProgress?: "no-progress" | "some-progress" | "good-progress" | "excellent-progress" | undefined;
        } | undefined;
        durationMinutes?: number | undefined;
        sdgGoals?: number[] | undefined;
        skillCategory?: string | undefined;
        scheduledAt?: string | undefined;
        format?: "in-person" | "online" | "hybrid" | undefined;
        proficiencyLevel?: "beginner" | "intermediate" | "advanced" | undefined;
        valuationPoints?: number | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.skill_share.completed";
    data: {
        sessionId: string;
        skillId: number;
        skillName: string;
        teacherId: string;
        learnerId: string;
        completedAt: string;
        matchId?: string | undefined;
        feedback?: {
            teacherRating?: number | undefined;
            learnerRating?: number | undefined;
            teacherComment?: string | undefined;
            learnerComment?: string | undefined;
            learnerProgress?: "no-progress" | "some-progress" | "good-progress" | "excellent-progress" | undefined;
        } | undefined;
        durationMinutes?: number | undefined;
        sdgGoals?: number[] | undefined;
        skillCategory?: string | undefined;
        scheduledAt?: string | undefined;
        format?: "in-person" | "online" | "hybrid" | undefined;
        proficiencyLevel?: "beginner" | "intermediate" | "advanced" | undefined;
        valuationPoints?: number | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddySkillShareCompleted = z.infer<typeof BuddySkillShareCompletedSchema>;
//# sourceMappingURL=skill-share-completed.d.ts.map