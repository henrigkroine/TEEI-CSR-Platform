import { z } from 'zod';
/**
 * Placement Event - normalized from Mentorship system
 * Represents a mentorship placement or job placement outcome
 */
export declare const PlacementEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"ingest.placement.created">;
    data: z.ZodObject<{
        sourceSystem: z.ZodEnum<["mentorship", "job_board", "manual"]>;
        sourceId: z.ZodString;
        sourceTenantId: z.ZodOptional<z.ZodString>;
        userId: z.ZodString;
        companyId: z.ZodString;
        placementType: z.ZodEnum<["mentorship_match", "job_placement", "internship", "apprenticeship", "volunteer_placement", "other"]>;
        placementDate: z.ZodString;
        status: z.ZodEnum<["active", "completed", "terminated", "on_hold"]>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        mentorId: z.ZodOptional<z.ZodString>;
        mentorName: z.ZodOptional<z.ZodString>;
        employerId: z.ZodOptional<z.ZodString>;
        employerName: z.ZodOptional<z.ZodString>;
        jobTitle: z.ZodOptional<z.ZodString>;
        jobDescription: z.ZodOptional<z.ZodString>;
        jobLevel: z.ZodOptional<z.ZodEnum<["entry", "mid", "senior", "executive"]>>;
        industry: z.ZodOptional<z.ZodString>;
        salary: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            currency: string;
            min?: number | undefined;
            max?: number | undefined;
        }, {
            currency: string;
            min?: number | undefined;
            max?: number | undefined;
        }>>;
        focusAreas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        goalsSet: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        meetingFrequency: z.ZodOptional<z.ZodEnum<["weekly", "biweekly", "monthly", "as_needed"]>>;
        outcome: z.ZodOptional<z.ZodObject<{
            successful: z.ZodOptional<z.ZodBoolean>;
            completionReason: z.ZodOptional<z.ZodString>;
            feedback: z.ZodOptional<z.ZodString>;
            rating: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            feedback?: string | undefined;
            rating?: number | undefined;
            successful?: boolean | undefined;
            completionReason?: string | undefined;
        }, {
            feedback?: string | undefined;
            rating?: number | undefined;
            successful?: boolean | undefined;
            completionReason?: string | undefined;
        }>>;
        totalHours: z.ZodOptional<z.ZodNumber>;
        sessionsCompleted: z.ZodOptional<z.ZodNumber>;
        sdgGoals: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        location: z.ZodOptional<z.ZodObject<{
            country: z.ZodOptional<z.ZodString>;
            city: z.ZodOptional<z.ZodString>;
            remote: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            country?: string | undefined;
            city?: string | undefined;
            remote?: boolean | undefined;
        }, {
            country?: string | undefined;
            city?: string | undefined;
            remote?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "active" | "terminated" | "on_hold";
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "job_board";
        sourceId: string;
        placementType: "other" | "mentorship_match" | "job_placement" | "internship" | "apprenticeship" | "volunteer_placement";
        placementDate: string;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            remote?: boolean | undefined;
        } | undefined;
        sessionsCompleted?: number | undefined;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        jobTitle?: string | undefined;
        jobLevel?: "entry" | "mid" | "senior" | "executive" | undefined;
        outcome?: {
            feedback?: string | undefined;
            rating?: number | undefined;
            successful?: boolean | undefined;
            completionReason?: string | undefined;
        } | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        mentorId?: string | undefined;
        mentorName?: string | undefined;
        employerId?: string | undefined;
        employerName?: string | undefined;
        jobDescription?: string | undefined;
        industry?: string | undefined;
        salary?: {
            currency: string;
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        focusAreas?: string[] | undefined;
        goalsSet?: string[] | undefined;
        meetingFrequency?: "weekly" | "biweekly" | "monthly" | "as_needed" | undefined;
        totalHours?: number | undefined;
    }, {
        status: "completed" | "active" | "terminated" | "on_hold";
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "job_board";
        sourceId: string;
        placementType: "other" | "mentorship_match" | "job_placement" | "internship" | "apprenticeship" | "volunteer_placement";
        placementDate: string;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            remote?: boolean | undefined;
        } | undefined;
        sessionsCompleted?: number | undefined;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        jobTitle?: string | undefined;
        jobLevel?: "entry" | "mid" | "senior" | "executive" | undefined;
        outcome?: {
            feedback?: string | undefined;
            rating?: number | undefined;
            successful?: boolean | undefined;
            completionReason?: string | undefined;
        } | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        mentorId?: string | undefined;
        mentorName?: string | undefined;
        employerId?: string | undefined;
        employerName?: string | undefined;
        jobDescription?: string | undefined;
        industry?: string | undefined;
        salary?: {
            currency: string;
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        focusAreas?: string[] | undefined;
        goalsSet?: string[] | undefined;
        meetingFrequency?: "weekly" | "biweekly" | "monthly" | "as_needed" | undefined;
        totalHours?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "ingest.placement.created";
    data: {
        status: "completed" | "active" | "terminated" | "on_hold";
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "job_board";
        sourceId: string;
        placementType: "other" | "mentorship_match" | "job_placement" | "internship" | "apprenticeship" | "volunteer_placement";
        placementDate: string;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            remote?: boolean | undefined;
        } | undefined;
        sessionsCompleted?: number | undefined;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        jobTitle?: string | undefined;
        jobLevel?: "entry" | "mid" | "senior" | "executive" | undefined;
        outcome?: {
            feedback?: string | undefined;
            rating?: number | undefined;
            successful?: boolean | undefined;
            completionReason?: string | undefined;
        } | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        mentorId?: string | undefined;
        mentorName?: string | undefined;
        employerId?: string | undefined;
        employerName?: string | undefined;
        jobDescription?: string | undefined;
        industry?: string | undefined;
        salary?: {
            currency: string;
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        focusAreas?: string[] | undefined;
        goalsSet?: string[] | undefined;
        meetingFrequency?: "weekly" | "biweekly" | "monthly" | "as_needed" | undefined;
        totalHours?: number | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "ingest.placement.created";
    data: {
        status: "completed" | "active" | "terminated" | "on_hold";
        userId: string;
        companyId: string;
        sourceSystem: "mentorship" | "manual" | "job_board";
        sourceId: string;
        placementType: "other" | "mentorship_match" | "job_placement" | "internship" | "apprenticeship" | "volunteer_placement";
        placementDate: string;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            remote?: boolean | undefined;
        } | undefined;
        sessionsCompleted?: number | undefined;
        sdgGoals?: number[] | undefined;
        sourceTenantId?: string | undefined;
        tags?: string[] | undefined;
        jobTitle?: string | undefined;
        jobLevel?: "entry" | "mid" | "senior" | "executive" | undefined;
        outcome?: {
            feedback?: string | undefined;
            rating?: number | undefined;
            successful?: boolean | undefined;
            completionReason?: string | undefined;
        } | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        mentorId?: string | undefined;
        mentorName?: string | undefined;
        employerId?: string | undefined;
        employerName?: string | undefined;
        jobDescription?: string | undefined;
        industry?: string | undefined;
        salary?: {
            currency: string;
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        focusAreas?: string[] | undefined;
        goalsSet?: string[] | undefined;
        meetingFrequency?: "weekly" | "biweekly" | "monthly" | "as_needed" | undefined;
        totalHours?: number | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type PlacementEvent = z.infer<typeof PlacementEventSchema>;
/**
 * Factory function to create a PlacementEvent
 */
export declare function createPlacementEvent(data: z.infer<typeof PlacementEventSchema>['data'], metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
}): PlacementEvent;
//# sourceMappingURL=placement-event.d.ts.map