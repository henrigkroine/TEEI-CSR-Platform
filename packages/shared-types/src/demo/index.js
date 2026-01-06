/**
 * Demo Factory Types
 *
 * Type definitions for demo tenant creation, management, and data generation
 */
import { z } from 'zod';
/**
 * Demo tenant data volume sizes
 */
export const DemoDataVolumeSchema = z.enum(['small', 'medium', 'large']);
/**
 * Supported regions for demo data
 */
export const DemoRegionSchema = z.enum(['NA', 'EU', 'UK', 'APAC', 'LATAM']);
/**
 * Industry verticals for contextualized demo data
 */
export const DemoVerticalSchema = z.enum([
    'technology',
    'finance',
    'healthcare',
    'retail',
    'manufacturing',
    'education',
    'nonprofit',
]);
/**
 * Demo tenant status
 */
export const DemoTenantStatusSchema = z.enum([
    'creating',
    'active',
    'refreshing',
    'tearing_down',
    'deleted',
]);
/**
 * Demo tenant creation request
 */
export const CreateDemoTenantRequestSchema = z.object({
    tenantId: z.string().regex(/^demo-/, 'Tenant ID must start with "demo-"'),
    name: z.string().min(1).max(255),
    volume: DemoDataVolumeSchema,
    regions: z.array(DemoRegionSchema).min(1),
    vertical: DemoVerticalSchema,
    customSalt: z.string().min(16).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
/**
 * Demo tenant refresh request
 */
export const RefreshDemoTenantRequestSchema = z.object({
    tenantId: z.string(),
    preserveUsers: z.boolean().default(false),
    newVolume: DemoDataVolumeSchema.optional(),
});
/**
 * Demo tenant export bundle
 */
export const DemoTenantExportSchema = z.object({
    tenantId: z.string(),
    format: z.enum(['json', 'csv', 'sql']).default('json'),
    includeEvents: z.boolean().default(true),
    includeAggregates: z.boolean().default(true),
    includeReports: z.boolean().default(true),
});
/**
 * Demo event types
 */
export const DemoEventTypeSchema = z.enum([
    'volunteer',
    'donation',
    'session',
    'enrollment',
    'placement',
]);
/**
 * Demo teardown request
 */
export const DemoTeardownRequestSchema = z.object({
    tenantId: z.string(),
    confirm: z.literal(true),
    cascade: z.boolean().default(true), // Delete all related data
});
/**
 * Pre-defined volume configurations
 */
export const DEMO_VOLUME_CONFIGS = {
    small: {
        size: 'small',
        monthsOfData: 6,
        volunteerEvents: 500,
        donationEvents: 200,
        sessionEvents: 100,
        enrollmentEvents: 50,
        placementEvents: 30,
        users: 50,
        companies: 5,
    },
    medium: {
        size: 'medium',
        monthsOfData: 12,
        volunteerEvents: 5000,
        donationEvents: 2000,
        sessionEvents: 1000,
        enrollmentEvents: 500,
        placementEvents: 300,
        users: 250,
        companies: 20,
    },
    large: {
        size: 'large',
        monthsOfData: 24,
        volunteerEvents: 50000,
        donationEvents: 20000,
        sessionEvents: 10000,
        enrollmentEvents: 5000,
        placementEvents: 3000,
        users: 1000,
        companies: 100,
    },
};
/**
 * Default TTL for demo tenants (in days)
 */
export const DEMO_TENANT_DEFAULT_TTL_DAYS = 30;
/**
 * Maximum concurrent demo tenant creations
 */
export const DEMO_FACTORY_MAX_CONCURRENT_CREATES = 3;
//# sourceMappingURL=index.js.map