import { z } from 'zod';
export declare const UpskillingProgressUpdatedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"upskilling.progress.updated">;
    data: z.ZodObject<{
        progressId: z.ZodString;
        userId: z.ZodString;
        provider: z.ZodString;
        courseId: z.ZodString;
        courseName: z.ZodString;
        progressPercent: z.ZodNumber;
        status: z.ZodEnum<["enrolled", "in_progress", "completed", "dropped"]>;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "enrolled" | "in_progress" | "dropped";
        userId: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        progressPercent: number;
        updatedAt: string;
    }, {
        status: "completed" | "enrolled" | "in_progress" | "dropped";
        userId: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        progressPercent: number;
        updatedAt: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "upskilling.progress.updated";
    data: {
        status: "completed" | "enrolled" | "in_progress" | "dropped";
        userId: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        progressPercent: number;
        updatedAt: string;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "upskilling.progress.updated";
    data: {
        status: "completed" | "enrolled" | "in_progress" | "dropped";
        userId: string;
        progressId: string;
        provider: string;
        courseId: string;
        courseName: string;
        progressPercent: number;
        updatedAt: string;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type UpskillingProgressUpdated = z.infer<typeof UpskillingProgressUpdatedSchema>;
//# sourceMappingURL=progress-updated.d.ts.map