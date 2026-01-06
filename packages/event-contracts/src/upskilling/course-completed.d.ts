import { z } from 'zod';
/**
 * Agent 22: event-contract-enricher
 * Enhanced with program context for better tracking and rollups
 */
export declare const UpskillingCourseCompletedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"upskilling.course.completed">;
    data: z.ZodObject<{
        progressId: z.ZodString;
        userId: z.ZodString;
        provider: z.ZodString;
        courseId: z.ZodString;
        courseName: z.ZodString;
        completedAt: z.ZodString;
        finalScore: z.ZodOptional<z.ZodNumber>;
        credentialRef: z.ZodOptional<z.ZodString>;
        programId: z.ZodOptional<z.ZodString>;
        campaignId: z.ZodOptional<z.ZodString>;
        beneficiaryGroupId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        completedAt: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        finalScore?: number | undefined;
        credentialRef?: string | undefined;
    }, {
        userId: string;
        completedAt: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        finalScore?: number | undefined;
        credentialRef?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "upskilling.course.completed";
    data: {
        userId: string;
        completedAt: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        finalScore?: number | undefined;
        credentialRef?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "upskilling.course.completed";
    data: {
        userId: string;
        completedAt: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        finalScore?: number | undefined;
        credentialRef?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type UpskillingCourseCompleted = z.infer<typeof UpskillingCourseCompletedSchema>;
//# sourceMappingURL=course-completed.d.ts.map