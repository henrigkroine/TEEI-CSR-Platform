import { z } from 'zod';

/**
 * Data residency region types
 */
export type Region = 'eu-central-1' | 'us-east-1';

/**
 * Residency enforcement types
 * - strict: Data MUST stay in assigned region (GDPR compliance for EU)
 * - flexible: Data can be served from either region (latency-based routing)
 */
export type ResidencyType = 'strict' | 'flexible';

/**
 * Company region mapping
 */
export interface CompanyRegion {
  id: string;
  companyId: string;
  region: Region;
  residencyType: ResidencyType;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Residency validation request
 */
export interface ResidencyValidationRequest {
  companyId: string;
  requestedRegion: Region;
  operation?: string;
}

/**
 * Residency validation response
 */
export interface ResidencyValidationResponse {
  allowed: boolean;
  companyRegion: Region;
  requestedRegion: Region;
  residencyType: ResidencyType;
  reason?: string;
}

/**
 * Audit log entry for residency checks
 */
export interface ResidencyAuditLog {
  id: string;
  companyIdHash: string; // SHA-256 hash of company_id (no PII)
  requestedRegion: Region;
  assignedRegion: Region;
  residencyType: ResidencyType;
  allowed: boolean;
  operation?: string;
  timestamp: Date;
  requestId?: string;
}

/**
 * Zod validation schemas
 */
export const RegionSchema = z.enum(['eu-central-1', 'us-east-1']);
export const ResidencyTypeSchema = z.enum(['strict', 'flexible']);

export const CompanyRegionSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  region: RegionSchema,
  residencyType: ResidencyTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ResidencyValidationRequestSchema = z.object({
  companyId: z.string().uuid(),
  requestedRegion: RegionSchema,
  operation: z.string().optional(),
});

export const UpdateCompanyRegionSchema = z.object({
  region: RegionSchema,
  residencyType: ResidencyTypeSchema,
});
