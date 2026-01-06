/**
 * Demo Factory Types
 *
 * Type definitions for demo tenant creation, management, and data generation
 */
import { z } from 'zod';
/**
 * Demo tenant data volume sizes
 */
export declare const DemoDataVolumeSchema: z.ZodEnum<["small", "medium", "large"]>;
export type DemoDataVolume = z.infer<typeof DemoDataVolumeSchema>;
/**
 * Supported regions for demo data
 */
export declare const DemoRegionSchema: z.ZodEnum<["NA", "EU", "UK", "APAC", "LATAM"]>;
export type DemoRegion = z.infer<typeof DemoRegionSchema>;
/**
 * Industry verticals for contextualized demo data
 */
export declare const DemoVerticalSchema: z.ZodEnum<["technology", "finance", "healthcare", "retail", "manufacturing", "education", "nonprofit"]>;
export type DemoVertical = z.infer<typeof DemoVerticalSchema>;
/**
 * Demo tenant status
 */
export declare const DemoTenantStatusSchema: z.ZodEnum<["creating", "active", "refreshing", "tearing_down", "deleted"]>;
export type DemoTenantStatus = z.infer<typeof DemoTenantStatusSchema>;
/**
 * Data volume configurations with event counts
 */
export interface DemoVolumeConfig {
    size: DemoDataVolume;
    monthsOfData: number;
    volunteerEvents: number;
    donationEvents: number;
    sessionEvents: number;
    enrollmentEvents: number;
    placementEvents: number;
    users: number;
    companies: number;
}
/**
 * Demo tenant creation request
 */
export declare const CreateDemoTenantRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    name: z.ZodString;
    volume: z.ZodEnum<["small", "medium", "large"]>;
    regions: z.ZodArray<z.ZodEnum<["NA", "EU", "UK", "APAC", "LATAM"]>, "many">;
    vertical: z.ZodEnum<["technology", "finance", "healthcare", "retail", "manufacturing", "education", "nonprofit"]>;
    customSalt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tenantId: string;
    volume: "medium" | "small" | "large";
    regions: ("NA" | "EU" | "UK" | "APAC" | "LATAM")[];
    vertical: "technology" | "finance" | "healthcare" | "retail" | "manufacturing" | "education" | "nonprofit";
    metadata?: Record<string, unknown> | undefined;
    customSalt?: string | undefined;
}, {
    name: string;
    tenantId: string;
    volume: "medium" | "small" | "large";
    regions: ("NA" | "EU" | "UK" | "APAC" | "LATAM")[];
    vertical: "technology" | "finance" | "healthcare" | "retail" | "manufacturing" | "education" | "nonprofit";
    metadata?: Record<string, unknown> | undefined;
    customSalt?: string | undefined;
}>;
export type CreateDemoTenantRequest = z.infer<typeof CreateDemoTenantRequestSchema>;
/**
 * Demo tenant refresh request
 */
export declare const RefreshDemoTenantRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    preserveUsers: z.ZodDefault<z.ZodBoolean>;
    newVolume: z.ZodOptional<z.ZodEnum<["small", "medium", "large"]>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    preserveUsers: boolean;
    newVolume?: "medium" | "small" | "large" | undefined;
}, {
    tenantId: string;
    preserveUsers?: boolean | undefined;
    newVolume?: "medium" | "small" | "large" | undefined;
}>;
export type RefreshDemoTenantRequest = z.infer<typeof RefreshDemoTenantRequestSchema>;
/**
 * Demo tenant export bundle
 */
export declare const DemoTenantExportSchema: z.ZodObject<{
    tenantId: z.ZodString;
    format: z.ZodDefault<z.ZodEnum<["json", "csv", "sql"]>>;
    includeEvents: z.ZodDefault<z.ZodBoolean>;
    includeAggregates: z.ZodDefault<z.ZodBoolean>;
    includeReports: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    format: "json" | "csv" | "sql";
    tenantId: string;
    includeEvents: boolean;
    includeAggregates: boolean;
    includeReports: boolean;
}, {
    tenantId: string;
    format?: "json" | "csv" | "sql" | undefined;
    includeEvents?: boolean | undefined;
    includeAggregates?: boolean | undefined;
    includeReports?: boolean | undefined;
}>;
export type DemoTenantExport = z.infer<typeof DemoTenantExportSchema>;
/**
 * Demo tenant metadata
 */
export interface DemoTenantMetadata {
    tenantId: string;
    name: string;
    status: DemoTenantStatus;
    volume: DemoVolumeConfig;
    regions: DemoRegion[];
    vertical: DemoVertical;
    createdAt: string;
    updatedAt: string;
    expiresAt: string | null;
    stats: {
        totalEvents: number;
        totalUsers: number;
        totalCompanies: number;
        dataFreshness: string;
        aggregatesWarmed: boolean;
        reportsGenerated: number;
    };
}
/**
 * Demo tenant creation progress
 */
export interface DemoTenantProgress {
    tenantId: string;
    stage: 'initializing' | 'seeding' | 'aggregating' | 'warming' | 'complete';
    progress: number;
    message: string;
    currentTask: string | null;
    estimatedTimeRemaining: number | null;
    errors: Array<{
        timestamp: string;
        message: string;
        code: string;
    }>;
}
/**
 * Demo seeding options
 */
export interface DemoSeedOptions {
    tenantId: string;
    volume: DemoDataVolume;
    regions: DemoRegion[];
    vertical: DemoVertical;
    startDate: string;
    endDate: string;
    salt: string;
    idempotencyKey: string;
}
/**
 * Demo event types
 */
export declare const DemoEventTypeSchema: z.ZodEnum<["volunteer", "donation", "session", "enrollment", "placement"]>;
export type DemoEventType = z.infer<typeof DemoEventTypeSchema>;
/**
 * Demo event seeding result
 */
export interface DemoEventSeedResult {
    type: DemoEventType;
    count: number;
    firstEventId: string;
    lastEventId: string;
    duration: number;
    errors: number;
}
/**
 * Demo warmup result
 */
export interface DemoWarmupResult {
    tenantId: string;
    aggregatesComputed: number;
    tilesWarmed: number;
    reportsGenerated: number;
    duration: number;
    freshness: string;
}
/**
 * Demo teardown request
 */
export declare const DemoTeardownRequestSchema: z.ZodObject<{
    tenantId: z.ZodString;
    confirm: z.ZodLiteral<true>;
    cascade: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    confirm: true;
    cascade: boolean;
}, {
    tenantId: string;
    confirm: true;
    cascade?: boolean | undefined;
}>;
export type DemoTeardownRequest = z.infer<typeof DemoTeardownRequestSchema>;
/**
 * Demo teardown result
 */
export interface DemoTeardownResult {
    tenantId: string;
    eventsDeleted: number;
    aggregatesDeleted: number;
    reportsDeleted: number;
    duration: number;
    success: boolean;
}
/**
 * Demo factory audit event
 */
export interface DemoFactoryAuditEvent {
    timestamp: string;
    tenantId: string;
    action: 'create' | 'refresh' | 'delete' | 'export';
    userId: string | null;
    metadata: Record<string, unknown>;
    success: boolean;
    errorMessage: string | null;
}
/**
 * Pre-defined volume configurations
 */
export declare const DEMO_VOLUME_CONFIGS: Record<DemoDataVolume, DemoVolumeConfig>;
/**
 * Default TTL for demo tenants (in days)
 */
export declare const DEMO_TENANT_DEFAULT_TTL_DAYS = 30;
/**
 * Maximum concurrent demo tenant creations
 */
export declare const DEMO_FACTORY_MAX_CONCURRENT_CREATES = 3;
//# sourceMappingURL=index.d.ts.map