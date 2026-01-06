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
export type DemoDataVolume = z.infer<typeof DemoDataVolumeSchema>;

/**
 * Supported regions for demo data
 */
export const DemoRegionSchema = z.enum(['NA', 'EU', 'UK', 'APAC', 'LATAM']);
export type DemoRegion = z.infer<typeof DemoRegionSchema>;

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
export type DemoVertical = z.infer<typeof DemoVerticalSchema>;

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
export const CreateDemoTenantRequestSchema = z.object({
  tenantId: z.string().regex(/^demo-/, 'Tenant ID must start with "demo-"'),
  name: z.string().min(1).max(255),
  volume: DemoDataVolumeSchema,
  regions: z.array(DemoRegionSchema).min(1),
  vertical: DemoVerticalSchema,
  customSalt: z.string().min(16).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateDemoTenantRequest = z.infer<typeof CreateDemoTenantRequestSchema>;

/**
 * Demo tenant refresh request
 */
export const RefreshDemoTenantRequestSchema = z.object({
  tenantId: z.string(),
  preserveUsers: z.boolean().default(false),
  newVolume: DemoDataVolumeSchema.optional(),
});
export type RefreshDemoTenantRequest = z.infer<typeof RefreshDemoTenantRequestSchema>;

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
  progress: number; // 0-100
  message: string;
  currentTask: string | null;
  estimatedTimeRemaining: number | null; // seconds
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
  startDate: string; // ISO date
  endDate: string; // ISO date
  salt: string;
  idempotencyKey: string;
}

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
export type DemoEventType = z.infer<typeof DemoEventTypeSchema>;

/**
 * Demo event seeding result
 */
export interface DemoEventSeedResult {
  type: DemoEventType;
  count: number;
  firstEventId: string;
  lastEventId: string;
  duration: number; // milliseconds
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
  duration: number; // milliseconds
  freshness: string; // ISO timestamp
}

/**
 * Demo teardown request
 */
export const DemoTeardownRequestSchema = z.object({
  tenantId: z.string(),
  confirm: z.literal(true),
  cascade: z.boolean().default(true), // Delete all related data
});
export type DemoTeardownRequest = z.infer<typeof DemoTeardownRequestSchema>;

/**
 * Demo teardown result
 */
export interface DemoTeardownResult {
  tenantId: string;
  eventsDeleted: number;
  aggregatesDeleted: number;
  reportsDeleted: number;
  duration: number; // milliseconds
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
export const DEMO_VOLUME_CONFIGS: Record<DemoDataVolume, DemoVolumeConfig> = {
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
