/**
 * Privacy Orchestrator Types
 *
 * Production-grade DSAR orchestration with regional execution and SLA tracking
 */

import { DsrRequestType, DsrStatus } from '@teei/compliance';

/**
 * Data Residency Regions
 */
export enum DataRegion {
  EU = 'EU',           // European Union (GDPR)
  US = 'US',           // United States
  UK = 'UK',           // United Kingdom
  APAC = 'APAC',       // Asia-Pacific
  CA = 'CA',           // Canada
  LATAM = 'LATAM',     // Latin America
}

/**
 * DSAR Job Priority
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 20,
}

/**
 * DSAR Request Input
 */
export interface DsarRequestInput {
  userId: string;
  requestType: DsrRequestType;
  requestedBy: string;
  reason?: string;
  priority?: JobPriority;
  region?: DataRegion;
  email?: string;
  metadata?: Record<string, any>;
}

/**
 * DSAR Job
 */
export interface DsarJob {
  id: string;
  userId: string;
  requestType: DsrRequestType;
  requestedBy: string;
  status: DsrStatus;
  priority: JobPriority;
  region: DataRegion;
  createdAt: Date;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

/**
 * SLA Configuration
 */
export interface SlaConfig {
  exportSla: number;      // Hours for export completion (default: 24)
  deleteSla: number;      // Hours for delete completion (default: 72)
  statusSla: number;      // Seconds for status response (default: 5)
  consentSla: number;     // Seconds for consent response (default: 2)
}

/**
 * SLA Metrics
 */
export interface SlaMetrics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageCompletionTime: number;
  p95CompletionTime: number;
  p99CompletionTime: number;
  slaCompliance: number; // Percentage
  breaches: number;
}

/**
 * Regional Executor Config
 */
export interface RegionalExecutorConfig {
  region: DataRegion;
  dbConnectionString: string;
  storageEndpoint: string;
  encryptionKeyId: string;
  enabled: boolean;
}

/**
 * Consent Record
 */
export interface ConsentRecord {
  userId: string;
  consentType: string;
  status: 'granted' | 'withdrawn';
  grantedAt?: Date;
  withdrawnAt?: Date;
  legalBasis: string;
  metadata?: Record<string, any>;
}

/**
 * Export Result
 */
export interface ExportResult {
  jobId: string;
  userId: string;
  region: DataRegion;
  exportUrl: string;
  expiresAt: Date;
  recordCount: number;
  sizeBytes: number;
  completedAt: Date;
  signature: string;
}

/**
 * Delete Result
 */
export interface DeleteResult {
  jobId: string;
  userId: string;
  region: DataRegion;
  deletedSources: string[];
  verificationHash: string;
  completedAt: Date;
  gracePeriodEndsAt?: Date;
}

/**
 * Status Response
 */
export interface StatusResponse {
  jobId: string;
  status: DsrStatus;
  requestType: DsrRequestType;
  progress: number; // 0-100
  createdAt: Date;
  estimatedCompletionAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: ExportResult | DeleteResult;
}
