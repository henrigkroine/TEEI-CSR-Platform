/**
 * Tenant Lifecycle Types
 * Tenant creation, suspension, termination, and snapshots
 */

export type TenantStatus = 'active' | 'suspended' | 'terminated' | 'provisioning';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: string;
  residencyRegion: string;
  residencyLocked: boolean;
  createdAt: Date;
  suspendedAt?: Date;
  terminatedAt?: Date;
  metadata: Record<string, any>;
}

export interface TenantCreate {
  name: string;
  slug: string;
  plan: string;
  residencyRegion: string;
  adminEmail?: string;
  metadata?: Record<string, any>;
}

export interface TenantUpdate {
  name?: string;
  metadata?: Record<string, any>;
}

export interface TenantSuspend {
  reason: string;
  notifyUsers?: boolean;
}

export interface TenantTerminate {
  reason: string;
  confirmationToken: string; // Must match tenant ID
  snapshotId: string; // Required export snapshot
}

export interface SecretRotation {
  secretTypes?: Array<'api_key' | 'signing_key' | 'encryption_key'>;
  gracePeriodHours?: number;
}

export interface RotatedKey {
  type: string;
  oldKeyId: string;
  newKeyId: string;
  expiresAt: Date;
}

export interface TenantSnapshot {
  id: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  sizeBytes?: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface SnapshotCreate {
  includeMetrics?: boolean;
  includePii?: boolean;
}

export interface TenantWebhookEvent {
  event: 'tenant.created' | 'tenant.suspended' | 'tenant.reactivated' | 'tenant.terminated' | 'tenant.secrets_rotated';
  tenantId: string;
  timestamp: Date;
  data: Record<string, any>;
}
