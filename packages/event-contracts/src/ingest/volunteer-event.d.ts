import { z } from 'zod';
/**
 * Volunteer Event - normalized from external platforms (Benevity, Goodera)
 * Represents a volunteering activity by an employee
 */
export declare const VolunteerEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"ingest.volunteer.logged">;
    data: z.ZodObject<{
        sourceSystem: z.ZodEnum<["benevity", "goodera", "workday", "manual"]>;
        sourceId: z.ZodString;
        sourceTenantId: z.ZodString;
        userId: z.ZodString;
        externalUserId: z.ZodString;
        companyId: z.ZodString;
        activityName: z.ZodString;
        activityDescription: z.ZodOptional<z.ZodString>;
        activityType: z.ZodEnum<["skills_volunteering", "hands_on_volunteering", "virtual_volunteering", "board_service", "pro_bono", "other"]>;
        hoursLogged: z.ZodNumber;
        activityDate: z.ZodString;
        nonprofitName: z.ZodOptional<z.ZodString>;
        nonprofitId: z.ZodOptional<z.ZodString>;
        causeArea: z.ZodOptional<z.ZodString>;
        sdgGoals: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        verified: z.ZodDefault<z.ZodBoolean>;
        verifiedBy: z.ZodOptional<z.ZodString>;
        verifiedAt: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        location: z.ZodOptional<z.ZodObject<{
            country: z.ZodOptional<z.ZodString>;
            city: z.ZodOptional<z.ZodString>;
            coordinates: z.ZodOptional<z.ZodObject<{
                lat: z.ZodNumber;
                lon: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                lat: number;
                lon: number;
            }, {
                lat: number;
                lon: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            country?: string | undefined;
            city?: string | undefined;
            coordinates?: {
                lat: number;
                lon: number;
            } | undefined;
        }, {
            country?: string | undefined;
            city?: string | undefined;
            coordinates?: {
                lat: number;
                lon: number;
            } | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        activityName: string;
        activityType: "other" | "skills_volunteering" | "hands_on_volunteering" | "virtual_volunteering" | "board_service" | "pro_bono";
        hoursLogged: number;
        activityDate: string;
        verified: boolean;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            coordinates?: {
                lat: number;
                lon: number;
            } | undefined;
        } | undefined;
        sdgGoals?: number[] | undefined;
        activityDescription?: string | undefined;
        nonprofitName?: string | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        verifiedBy?: string | undefined;
        verifiedAt?: string | undefined;
        tags?: string[] | undefined;
    }, {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        activityName: string;
        activityType: "other" | "skills_volunteering" | "hands_on_volunteering" | "virtual_volunteering" | "board_service" | "pro_bono";
        hoursLogged: number;
        activityDate: string;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            coordinates?: {
                lat: number;
                lon: number;
            } | undefined;
        } | undefined;
        sdgGoals?: number[] | undefined;
        activityDescription?: string | undefined;
        nonprofitName?: string | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        verified?: boolean | undefined;
        verifiedBy?: string | undefined;
        verifiedAt?: string | undefined;
        tags?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "ingest.volunteer.logged";
    data: {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        activityName: string;
        activityType: "other" | "skills_volunteering" | "hands_on_volunteering" | "virtual_volunteering" | "board_service" | "pro_bono";
        hoursLogged: number;
        activityDate: string;
        verified: boolean;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            coordinates?: {
                lat: number;
                lon: number;
            } | undefined;
        } | undefined;
        sdgGoals?: number[] | undefined;
        activityDescription?: string | undefined;
        nonprofitName?: string | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        verifiedBy?: string | undefined;
        verifiedAt?: string | undefined;
        tags?: string[] | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "ingest.volunteer.logged";
    data: {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        activityName: string;
        activityType: "other" | "skills_volunteering" | "hands_on_volunteering" | "virtual_volunteering" | "board_service" | "pro_bono";
        hoursLogged: number;
        activityDate: string;
        location?: {
            country?: string | undefined;
            city?: string | undefined;
            coordinates?: {
                lat: number;
                lon: number;
            } | undefined;
        } | undefined;
        sdgGoals?: number[] | undefined;
        activityDescription?: string | undefined;
        nonprofitName?: string | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        verified?: boolean | undefined;
        verifiedBy?: string | undefined;
        verifiedAt?: string | undefined;
        tags?: string[] | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type VolunteerEvent = z.infer<typeof VolunteerEventSchema>;
/**
 * Factory function to create a VolunteerEvent
 */
export declare function createVolunteerEvent(data: z.infer<typeof VolunteerEventSchema>['data'], metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
}): VolunteerEvent;
//# sourceMappingURL=volunteer-event.d.ts.map