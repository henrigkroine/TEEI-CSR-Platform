import { z } from 'zod';
/**
 * Directory Entry - normalized from Workday SCIM/directory sync
 * Represents an employee record for VIS/SROI attribution
 */
export declare const DirectoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"ingest.directory.synced">;
    data: z.ZodObject<{
        sourceSystem: z.ZodEnum<["workday", "adp", "bamboohr", "manual"]>;
        sourceId: z.ZodString;
        sourceTenantId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        externalUserId: z.ZodString;
        companyId: z.ZodString;
        email: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        employeeNumber: z.ZodOptional<z.ZodString>;
        employeeType: z.ZodOptional<z.ZodEnum<["full_time", "part_time", "contractor", "intern", "temporary", "other"]>>;
        status: z.ZodEnum<["active", "inactive", "terminated", "on_leave"]>;
        department: z.ZodOptional<z.ZodString>;
        division: z.ZodOptional<z.ZodString>;
        businessUnit: z.ZodOptional<z.ZodString>;
        costCenter: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodObject<{
            country: z.ZodString;
            region: z.ZodOptional<z.ZodString>;
            city: z.ZodOptional<z.ZodString>;
            office: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            country: string;
            city?: string | undefined;
            region?: string | undefined;
            office?: string | undefined;
        }, {
            country: string;
            city?: string | undefined;
            region?: string | undefined;
            office?: string | undefined;
        }>>;
        managerId: z.ZodOptional<z.ZodString>;
        managerEmail: z.ZodOptional<z.ZodString>;
        jobTitle: z.ZodOptional<z.ZodString>;
        jobLevel: z.ZodOptional<z.ZodString>;
        jobFamily: z.ZodOptional<z.ZodString>;
        hireDate: z.ZodOptional<z.ZodString>;
        terminationDate: z.ZodOptional<z.ZodString>;
        lastUpdated: z.ZodString;
        permissions: z.ZodOptional<z.ZodObject<{
            canVolunteer: z.ZodDefault<z.ZodBoolean>;
            canDonate: z.ZodDefault<z.ZodBoolean>;
            canAccessPlatform: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            canVolunteer: boolean;
            canDonate: boolean;
            canAccessPlatform: boolean;
        }, {
            canVolunteer?: boolean | undefined;
            canDonate?: boolean | undefined;
            canAccessPlatform?: boolean | undefined;
        }>>;
        customFields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "inactive" | "terminated" | "on_leave";
        companyId: string;
        sourceSystem: "manual" | "workday" | "adp" | "bamboohr";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        email: string;
        firstName: string;
        lastName: string;
        lastUpdated: string;
        location?: {
            country: string;
            city?: string | undefined;
            region?: string | undefined;
            office?: string | undefined;
        } | undefined;
        userId?: string | undefined;
        displayName?: string | undefined;
        employeeNumber?: string | undefined;
        employeeType?: "other" | "full_time" | "part_time" | "contractor" | "intern" | "temporary" | undefined;
        department?: string | undefined;
        division?: string | undefined;
        businessUnit?: string | undefined;
        costCenter?: string | undefined;
        managerId?: string | undefined;
        managerEmail?: string | undefined;
        jobTitle?: string | undefined;
        jobLevel?: string | undefined;
        jobFamily?: string | undefined;
        hireDate?: string | undefined;
        terminationDate?: string | undefined;
        permissions?: {
            canVolunteer: boolean;
            canDonate: boolean;
            canAccessPlatform: boolean;
        } | undefined;
        customFields?: Record<string, unknown> | undefined;
    }, {
        status: "active" | "inactive" | "terminated" | "on_leave";
        companyId: string;
        sourceSystem: "manual" | "workday" | "adp" | "bamboohr";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        email: string;
        firstName: string;
        lastName: string;
        lastUpdated: string;
        location?: {
            country: string;
            city?: string | undefined;
            region?: string | undefined;
            office?: string | undefined;
        } | undefined;
        userId?: string | undefined;
        displayName?: string | undefined;
        employeeNumber?: string | undefined;
        employeeType?: "other" | "full_time" | "part_time" | "contractor" | "intern" | "temporary" | undefined;
        department?: string | undefined;
        division?: string | undefined;
        businessUnit?: string | undefined;
        costCenter?: string | undefined;
        managerId?: string | undefined;
        managerEmail?: string | undefined;
        jobTitle?: string | undefined;
        jobLevel?: string | undefined;
        jobFamily?: string | undefined;
        hireDate?: string | undefined;
        terminationDate?: string | undefined;
        permissions?: {
            canVolunteer?: boolean | undefined;
            canDonate?: boolean | undefined;
            canAccessPlatform?: boolean | undefined;
        } | undefined;
        customFields?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "ingest.directory.synced";
    data: {
        status: "active" | "inactive" | "terminated" | "on_leave";
        companyId: string;
        sourceSystem: "manual" | "workday" | "adp" | "bamboohr";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        email: string;
        firstName: string;
        lastName: string;
        lastUpdated: string;
        location?: {
            country: string;
            city?: string | undefined;
            region?: string | undefined;
            office?: string | undefined;
        } | undefined;
        userId?: string | undefined;
        displayName?: string | undefined;
        employeeNumber?: string | undefined;
        employeeType?: "other" | "full_time" | "part_time" | "contractor" | "intern" | "temporary" | undefined;
        department?: string | undefined;
        division?: string | undefined;
        businessUnit?: string | undefined;
        costCenter?: string | undefined;
        managerId?: string | undefined;
        managerEmail?: string | undefined;
        jobTitle?: string | undefined;
        jobLevel?: string | undefined;
        jobFamily?: string | undefined;
        hireDate?: string | undefined;
        terminationDate?: string | undefined;
        permissions?: {
            canVolunteer: boolean;
            canDonate: boolean;
            canAccessPlatform: boolean;
        } | undefined;
        customFields?: Record<string, unknown> | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "ingest.directory.synced";
    data: {
        status: "active" | "inactive" | "terminated" | "on_leave";
        companyId: string;
        sourceSystem: "manual" | "workday" | "adp" | "bamboohr";
        sourceId: string;
        sourceTenantId: string;
        externalUserId: string;
        email: string;
        firstName: string;
        lastName: string;
        lastUpdated: string;
        location?: {
            country: string;
            city?: string | undefined;
            region?: string | undefined;
            office?: string | undefined;
        } | undefined;
        userId?: string | undefined;
        displayName?: string | undefined;
        employeeNumber?: string | undefined;
        employeeType?: "other" | "full_time" | "part_time" | "contractor" | "intern" | "temporary" | undefined;
        department?: string | undefined;
        division?: string | undefined;
        businessUnit?: string | undefined;
        costCenter?: string | undefined;
        managerId?: string | undefined;
        managerEmail?: string | undefined;
        jobTitle?: string | undefined;
        jobLevel?: string | undefined;
        jobFamily?: string | undefined;
        hireDate?: string | undefined;
        terminationDate?: string | undefined;
        permissions?: {
            canVolunteer?: boolean | undefined;
            canDonate?: boolean | undefined;
            canAccessPlatform?: boolean | undefined;
        } | undefined;
        customFields?: Record<string, unknown> | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type DirectoryEntry = z.infer<typeof DirectoryEntrySchema>;
/**
 * Factory function to create a DirectoryEntry
 */
export declare function createDirectoryEntry(data: z.infer<typeof DirectoryEntrySchema>['data'], metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
}): DirectoryEntry;
//# sourceMappingURL=directory-entry.d.ts.map