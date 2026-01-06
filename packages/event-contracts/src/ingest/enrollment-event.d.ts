import { z } from 'zod';
/**
 * Enrollment Event - normalized from internal TEEI systems (Language, Mentorship, Upskilling)
 * Represents a user enrolling in a program or course
 */
export declare const EnrollmentEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"ingest.enrollment.created">;
    data: z.ZodObject<{
        sourceSystem: z.ZodEnum<["kintell", "upskilling", "mentorship", "manual"]>;
        sourceId: z.ZodString;
        sourceTenantId: z.ZodOptional<z.ZodString>;
        userId: z.ZodString;
        companyId: z.ZodString;
        programType: z.ZodEnum<["language_course", "upskilling_course", "mentorship_program", "buddy_program", "certification_program", "other"]>;
        programId: z.ZodString;
        programName: z.ZodString;
        programDescription: z.ZodOptional<z.ZodString>;
        enrollmentDate: z.ZodString;
        status: z.ZodEnum<["enrolled", "in_progress", "completed", "withdrawn", "failed"]>;
        completionDate: z.ZodOptional<z.ZodString>;
        completionPercentage: z.ZodOptional<z.ZodNumber>;
        outcome: z.ZodOptional<z.ZodObject<{
            passed: z.ZodOptional<z.ZodBoolean>;
            score: z.ZodOptional<z.ZodNumber>;
            grade: z.ZodOptional<z.ZodString>;
            certificateIssued: z.ZodOptional<z.ZodBoolean>;
            certificateId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            passed?: boolean | undefined;
            score?: number | undefined;
            grade?: string | undefined;
            certificateIssued?: boolean | undefined;
            certificateId?: string | undefined;
        }, {
            passed?: boolean | undefined;
            score?: number | undefined;
            grade?: string | undefined;
            certificateIssued?: boolean | undefined;
            certificateId?: string | undefined;
        }>>;
        hoursCompleted: z.ZodOptional<z.ZodNumber>;
        estimatedHours: z.ZodOptional<z.ZodNumber>;
        sdgGoals: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        cohortId: z.ZodOptional<z.ZodString>;
        instructorId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "enrolled" | "in_progress" | "withdrawn" | "failed";
        programId: string;
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "kintell" | "upskilling";
        sourceId: string;
        programType: "other" | "language_course" | "upskilling_course" | "mentorship_program" | "buddy_program" | "certification_program";
        programName: string;
        enrollmentDate: string;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        programDescription?: string | undefined;
        completionDate?: string | undefined;
        completionPercentage?: number | undefined;
        outcome?: {
            passed?: boolean | undefined;
            score?: number | undefined;
            grade?: string | undefined;
            certificateIssued?: boolean | undefined;
            certificateId?: string | undefined;
        } | undefined;
        hoursCompleted?: number | undefined;
        estimatedHours?: number | undefined;
        cohortId?: string | undefined;
        instructorId?: string | undefined;
    }, {
        status: "completed" | "enrolled" | "in_progress" | "withdrawn" | "failed";
        programId: string;
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "kintell" | "upskilling";
        sourceId: string;
        programType: "other" | "language_course" | "upskilling_course" | "mentorship_program" | "buddy_program" | "certification_program";
        programName: string;
        enrollmentDate: string;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        programDescription?: string | undefined;
        completionDate?: string | undefined;
        completionPercentage?: number | undefined;
        outcome?: {
            passed?: boolean | undefined;
            score?: number | undefined;
            grade?: string | undefined;
            certificateIssued?: boolean | undefined;
            certificateId?: string | undefined;
        } | undefined;
        hoursCompleted?: number | undefined;
        estimatedHours?: number | undefined;
        cohortId?: string | undefined;
        instructorId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "ingest.enrollment.created";
    data: {
        status: "completed" | "enrolled" | "in_progress" | "withdrawn" | "failed";
        programId: string;
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "kintell" | "upskilling";
        sourceId: string;
        programType: "other" | "language_course" | "upskilling_course" | "mentorship_program" | "buddy_program" | "certification_program";
        programName: string;
        enrollmentDate: string;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        programDescription?: string | undefined;
        completionDate?: string | undefined;
        completionPercentage?: number | undefined;
        outcome?: {
            passed?: boolean | undefined;
            score?: number | undefined;
            grade?: string | undefined;
            certificateIssued?: boolean | undefined;
            certificateId?: string | undefined;
        } | undefined;
        hoursCompleted?: number | undefined;
        estimatedHours?: number | undefined;
        cohortId?: string | undefined;
        instructorId?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "ingest.enrollment.created";
    data: {
        status: "completed" | "enrolled" | "in_progress" | "withdrawn" | "failed";
        programId: string;
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "kintell" | "upskilling";
        sourceId: string;
        programType: "other" | "language_course" | "upskilling_course" | "mentorship_program" | "buddy_program" | "certification_program";
        programName: string;
        enrollmentDate: string;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        programDescription?: string | undefined;
        completionDate?: string | undefined;
        completionPercentage?: number | undefined;
        outcome?: {
            passed?: boolean | undefined;
            score?: number | undefined;
            grade?: string | undefined;
            certificateIssued?: boolean | undefined;
            certificateId?: string | undefined;
        } | undefined;
        hoursCompleted?: number | undefined;
        estimatedHours?: number | undefined;
        cohortId?: string | undefined;
        instructorId?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type EnrollmentEvent = z.infer<typeof EnrollmentEventSchema>;
/**
 * Factory function to create an EnrollmentEvent
 */
export declare function createEnrollmentEvent(data: z.infer<typeof EnrollmentEventSchema>['data'], metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
}): EnrollmentEvent;
//# sourceMappingURL=enrollment-event.d.ts.map