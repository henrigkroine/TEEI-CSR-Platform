import { z } from 'zod';
export declare const OrchestrationJourneyMilestoneReachedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"orchestration.journey.milestone.reached">;
    data: z.ZodObject<{
        userId: z.ZodString;
        milestone: z.ZodEnum<["buddy_matched", "first_language_session", "language_level_up", "first_mentorship_session", "course_enrolled", "course_completed", "credential_earned", "job_ready"]>;
        reachedAt: z.ZodString;
        previousMilestone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        reachedAt: string;
        milestone: "buddy_matched" | "first_language_session" | "language_level_up" | "first_mentorship_session" | "course_enrolled" | "course_completed" | "credential_earned" | "job_ready";
        previousMilestone?: string | undefined;
    }, {
        userId: string;
        reachedAt: string;
        milestone: "buddy_matched" | "first_language_session" | "language_level_up" | "first_mentorship_session" | "course_enrolled" | "course_completed" | "credential_earned" | "job_ready";
        previousMilestone?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "orchestration.journey.milestone.reached";
    data: {
        userId: string;
        reachedAt: string;
        milestone: "buddy_matched" | "first_language_session" | "language_level_up" | "first_mentorship_session" | "course_enrolled" | "course_completed" | "credential_earned" | "job_ready";
        previousMilestone?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "orchestration.journey.milestone.reached";
    data: {
        userId: string;
        reachedAt: string;
        milestone: "buddy_matched" | "first_language_session" | "language_level_up" | "first_mentorship_session" | "course_enrolled" | "course_completed" | "credential_earned" | "job_ready";
        previousMilestone?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type OrchestrationJourneyMilestoneReached = z.infer<typeof OrchestrationJourneyMilestoneReachedSchema>;
//# sourceMappingURL=journey-milestone-reached.d.ts.map