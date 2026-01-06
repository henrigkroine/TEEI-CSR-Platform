import { z } from 'zod';
/**
 * Event emitted when a user completes a milestone in the buddy program.
 *
 * Milestones track participant journey progress and are used for:
 * - VIS (Volunteer Impact Score) - milestones add significant points
 * - Journey orchestration triggers (e.g., first match, first event)
 * - Gamification and engagement metrics
 * - Achievement/badge system
 */
export declare const BuddyMilestoneReachedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.milestone.reached">;
    data: z.ZodObject<{
        milestoneId: z.ZodNumber;
        userId: z.ZodString;
        milestoneTitle: z.ZodString;
        milestoneCategory: z.ZodEnum<["onboarding", "cultural", "language", "community", "professional", "skills", "events", "buddy-connection", "impact", "completion", "other"]>;
        reachedAt: z.ZodString;
        points: z.ZodNumber;
        badgeIcon: z.ZodOptional<z.ZodString>;
        targetRole: z.ZodOptional<z.ZodEnum<["participant", "buddy", "all"]>>;
        progress: z.ZodOptional<z.ZodObject<{
            currentStep: z.ZodOptional<z.ZodNumber>;
            totalSteps: z.ZodOptional<z.ZodNumber>;
            completedSteps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            currentStep?: number | undefined;
            totalSteps?: number | undefined;
            completedSteps?: string[] | undefined;
        }, {
            currentStep?: number | undefined;
            totalSteps?: number | undefined;
            completedSteps?: string[] | undefined;
        }>>;
        metadata: z.ZodOptional<z.ZodObject<{
            isFirstTime: z.ZodOptional<z.ZodBoolean>;
            streakCount: z.ZodOptional<z.ZodNumber>;
            relatedEntities: z.ZodOptional<z.ZodArray<z.ZodObject<{
                type: z.ZodString;
                id: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                id: string;
                type: string;
            }, {
                id: string;
                type: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            isFirstTime?: boolean | undefined;
            streakCount?: number | undefined;
            relatedEntities?: {
                id: string;
                type: string;
            }[] | undefined;
        }, {
            isFirstTime?: boolean | undefined;
            streakCount?: number | undefined;
            relatedEntities?: {
                id: string;
                type: string;
            }[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        milestoneId: number;
        milestoneTitle: string;
        milestoneCategory: "language" | "other" | "cultural" | "professional" | "onboarding" | "community" | "skills" | "events" | "buddy-connection" | "impact" | "completion";
        reachedAt: string;
        points: number;
        metadata?: {
            isFirstTime?: boolean | undefined;
            streakCount?: number | undefined;
            relatedEntities?: {
                id: string;
                type: string;
            }[] | undefined;
        } | undefined;
        badgeIcon?: string | undefined;
        targetRole?: "participant" | "buddy" | "all" | undefined;
        progress?: {
            currentStep?: number | undefined;
            totalSteps?: number | undefined;
            completedSteps?: string[] | undefined;
        } | undefined;
    }, {
        userId: string;
        milestoneId: number;
        milestoneTitle: string;
        milestoneCategory: "language" | "other" | "cultural" | "professional" | "onboarding" | "community" | "skills" | "events" | "buddy-connection" | "impact" | "completion";
        reachedAt: string;
        points: number;
        metadata?: {
            isFirstTime?: boolean | undefined;
            streakCount?: number | undefined;
            relatedEntities?: {
                id: string;
                type: string;
            }[] | undefined;
        } | undefined;
        badgeIcon?: string | undefined;
        targetRole?: "participant" | "buddy" | "all" | undefined;
        progress?: {
            currentStep?: number | undefined;
            totalSteps?: number | undefined;
            completedSteps?: string[] | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.milestone.reached";
    data: {
        userId: string;
        milestoneId: number;
        milestoneTitle: string;
        milestoneCategory: "language" | "other" | "cultural" | "professional" | "onboarding" | "community" | "skills" | "events" | "buddy-connection" | "impact" | "completion";
        reachedAt: string;
        points: number;
        metadata?: {
            isFirstTime?: boolean | undefined;
            streakCount?: number | undefined;
            relatedEntities?: {
                id: string;
                type: string;
            }[] | undefined;
        } | undefined;
        badgeIcon?: string | undefined;
        targetRole?: "participant" | "buddy" | "all" | undefined;
        progress?: {
            currentStep?: number | undefined;
            totalSteps?: number | undefined;
            completedSteps?: string[] | undefined;
        } | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.milestone.reached";
    data: {
        userId: string;
        milestoneId: number;
        milestoneTitle: string;
        milestoneCategory: "language" | "other" | "cultural" | "professional" | "onboarding" | "community" | "skills" | "events" | "buddy-connection" | "impact" | "completion";
        reachedAt: string;
        points: number;
        metadata?: {
            isFirstTime?: boolean | undefined;
            streakCount?: number | undefined;
            relatedEntities?: {
                id: string;
                type: string;
            }[] | undefined;
        } | undefined;
        badgeIcon?: string | undefined;
        targetRole?: "participant" | "buddy" | "all" | undefined;
        progress?: {
            currentStep?: number | undefined;
            totalSteps?: number | undefined;
            completedSteps?: string[] | undefined;
        } | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddyMilestoneReached = z.infer<typeof BuddyMilestoneReachedSchema>;
//# sourceMappingURL=milestone-reached.d.ts.map