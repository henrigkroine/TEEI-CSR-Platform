import { z } from 'zod';
/**
 * Donation Event - normalized from external platforms (Benevity, Goodera)
 * Represents a charitable donation by an employee
 */
export declare const DonationEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"ingest.donation.made">;
    data: z.ZodObject<{
        sourceSystem: z.ZodEnum<["benevity", "goodera", "workday", "manual"]>;
        sourceId: z.ZodString;
        sourceTenantId: z.ZodString;
        userId: z.ZodString;
        externalUserId: z.ZodString;
        companyId: z.ZodString;
        donationType: z.ZodEnum<["one_time", "recurring", "matching_gift", "payroll_deduction", "volunteer_grant", "disaster_relief", "other"]>;
        amount: z.ZodNumber;
        currency: z.ZodString;
        amountUSD: z.ZodOptional<z.ZodNumber>;
        nonprofitName: z.ZodString;
        nonprofitId: z.ZodOptional<z.ZodString>;
        causeArea: z.ZodOptional<z.ZodString>;
        donationDate: z.ZodString;
        companyMatch: z.ZodOptional<z.ZodObject<{
            matched: z.ZodBoolean;
            matchAmount: z.ZodOptional<z.ZodNumber>;
            matchRatio: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            matched: boolean;
            matchAmount?: number | undefined;
            matchRatio?: number | undefined;
        }, {
            matched: boolean;
            matchAmount?: number | undefined;
            matchRatio?: number | undefined;
        }>>;
        sdgGoals: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        taxDeductible: z.ZodOptional<z.ZodBoolean>;
        receiptNumber: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        campaignId: z.ZodOptional<z.ZodString>;
        campaignName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        nonprofitName: string;
        donationType: "other" | "one_time" | "recurring" | "matching_gift" | "payroll_deduction" | "volunteer_grant" | "disaster_relief";
        amount: number;
        currency: string;
        donationDate: string;
        campaignId?: string | undefined;
        sdgGoals?: number[] | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        tags?: string[] | undefined;
        amountUSD?: number | undefined;
        companyMatch?: {
            matched: boolean;
            matchAmount?: number | undefined;
            matchRatio?: number | undefined;
        } | undefined;
        taxDeductible?: boolean | undefined;
        receiptNumber?: string | undefined;
        campaignName?: string | undefined;
    }, {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        nonprofitName: string;
        donationType: "other" | "one_time" | "recurring" | "matching_gift" | "payroll_deduction" | "volunteer_grant" | "disaster_relief";
        amount: number;
        currency: string;
        donationDate: string;
        campaignId?: string | undefined;
        sdgGoals?: number[] | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        tags?: string[] | undefined;
        amountUSD?: number | undefined;
        companyMatch?: {
            matched: boolean;
            matchAmount?: number | undefined;
            matchRatio?: number | undefined;
        } | undefined;
        taxDeductible?: boolean | undefined;
        receiptNumber?: string | undefined;
        campaignName?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "ingest.donation.made";
    data: {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        nonprofitName: string;
        donationType: "other" | "one_time" | "recurring" | "matching_gift" | "payroll_deduction" | "volunteer_grant" | "disaster_relief";
        amount: number;
        currency: string;
        donationDate: string;
        campaignId?: string | undefined;
        sdgGoals?: number[] | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        tags?: string[] | undefined;
        amountUSD?: number | undefined;
        companyMatch?: {
            matched: boolean;
            matchAmount?: number | undefined;
            matchRatio?: number | undefined;
        } | undefined;
        taxDeductible?: boolean | undefined;
        receiptNumber?: string | undefined;
        campaignName?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "ingest.donation.made";
    data: {
        userId: string;
        companyId: string;
        sourceSystem: "manual" | "benevity" | "goodera" | "workday";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        nonprofitName: string;
        donationType: "other" | "one_time" | "recurring" | "matching_gift" | "payroll_deduction" | "volunteer_grant" | "disaster_relief";
        amount: number;
        currency: string;
        donationDate: string;
        campaignId?: string | undefined;
        sdgGoals?: number[] | undefined;
        nonprofitId?: string | undefined;
        causeArea?: string | undefined;
        tags?: string[] | undefined;
        amountUSD?: number | undefined;
        companyMatch?: {
            matched: boolean;
            matchAmount?: number | undefined;
            matchRatio?: number | undefined;
        } | undefined;
        taxDeductible?: boolean | undefined;
        receiptNumber?: string | undefined;
        campaignName?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type DonationEvent = z.infer<typeof DonationEventSchema>;
/**
 * Factory function to create a DonationEvent
 */
export declare function createDonationEvent(data: z.infer<typeof DonationEventSchema>['data'], metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
}): DonationEvent;
//# sourceMappingURL=donation-event.d.ts.map