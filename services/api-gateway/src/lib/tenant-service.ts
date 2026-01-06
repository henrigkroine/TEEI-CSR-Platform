/**
 * Tenant Lifecycle Service
 * Orchestrates tenant provisioning, suspension, termination, and snapshots
 */

import { createServiceLogger } from '@teei/shared-utils';
import { randomUUID } from 'crypto';
import {
  Tenant,
  TenantCreate,
  TenantUpdate,
  TenantSuspend,
  TenantTerminate,
  SecretRotation,
  RotatedKey,
  TenantSnapshot,
  SnapshotCreate,
  TenantWebhookEvent,
} from '../types/tenant.js';

const logger = createServiceLogger('tenant-service');

/**
 * In-memory storage for demo
 * Production: PostgreSQL with proper tenant isolation
 */
class TenantStore {
  private tenants: Map<string, Tenant> = new Map();
  private snapshots: Map<string, TenantSnapshot> = new Map();
  private webhookEvents: TenantWebhookEvent[] = [];

  create(tenant: Tenant): Tenant {
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  getById(id: string): Tenant | null {
    return this.tenants.get(id) || null;
  }

  getBySlug(slug: string): Tenant | null {
    for (const tenant of this.tenants.values()) {
      if (tenant.slug === slug) {
        return tenant;
      }
    }
    return null;
  }

  list(status?: string): Tenant[] {
    const tenants = Array.from(this.tenants.values());
    return status ? tenants.filter(t => t.status === status) : tenants;
  }

  update(id: string, updates: Partial<Tenant>): Tenant | null {
    const tenant = this.tenants.get(id);
    if (!tenant) return null;

    const updated = { ...tenant, ...updates };
    this.tenants.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tenants.delete(id);
  }

  // Snapshots
  createSnapshot(snapshot: TenantSnapshot): TenantSnapshot {
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  getSnapshot(id: string): TenantSnapshot | null {
    return this.snapshots.get(id) || null;
  }

  updateSnapshot(id: string, updates: Partial<TenantSnapshot>): TenantSnapshot | null {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return null;

    const updated = { ...snapshot, ...updates };
    this.snapshots.set(id, updated);
    return updated;
  }

  // Webhooks
  addWebhookEvent(event: TenantWebhookEvent): void {
    this.webhookEvents.push(event);
  }

  getWebhookEvents(): TenantWebhookEvent[] {
    return this.webhookEvents;
  }
}

const store = new TenantStore();

export class TenantService {
  async listTenants(status?: string, page: number = 1, limit: number = 50): Promise<{ tenants: Tenant[]; pagination: any }> {
    const allTenants = store.list(status);
    const totalCount = allTenants.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const tenants = allTenants.slice(start, end);

    return {
      tenants,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getTenant(id: string): Promise<Tenant | null> {
    return store.getById(id);
  }

  async createTenant(data: TenantCreate, actorId: string): Promise<Tenant> {
    // Check slug uniqueness
    const existingBySlug = store.getBySlug(data.slug);
    if (existingBySlug) {
      throw new Error('Tenant slug already exists');
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(data.slug)) {
      throw new Error('Invalid slug format. Use lowercase letters, numbers, and hyphens only');
    }

    const now = new Date();
    const id = randomUUID();

    const tenant: Tenant = {
      id,
      name: data.name,
      slug: data.slug,
      status: 'provisioning',
      plan: data.plan,
      residencyRegion: data.residencyRegion,
      residencyLocked: false,
      createdAt: now,
      metadata: data.metadata || {},
    };

    store.create(tenant);

    // Fire webhook event
    this.fireWebhook({
      event: 'tenant.created',
      tenantId: id,
      timestamp: now,
      data: { plan: data.plan, region: data.residencyRegion },
    });

    // Async provisioning tasks (in production, use job queue)
    setTimeout(async () => {
      try {
        await this.provisionTenantResources(id);
        store.update(id, { status: 'active' });
        logger.info('Tenant provisioning completed', { id, slug: data.slug });
      } catch (error) {
        logger.error('Tenant provisioning failed', { id, error });
        store.update(id, { status: 'suspended', metadata: { ...tenant.metadata, provisioningError: true } });
      }
    }, 2000);

    logger.info('Tenant created', { id, slug: data.slug, plan: data.plan });
    return tenant;
  }

  async updateTenant(id: string, data: TenantUpdate): Promise<Tenant | null> {
    const tenant = store.getById(id);
    if (!tenant) return null;

    const updated = store.update(id, data);
    logger.info('Tenant updated', { id });
    return updated;
  }

  async suspendTenant(id: string, data: TenantSuspend, actorId: string): Promise<Tenant | null> {
    const tenant = store.getById(id);
    if (!tenant) return null;

    if (tenant.status === 'terminated') {
      throw new Error('Cannot suspend terminated tenant');
    }

    const now = new Date();
    const updated = store.update(id, {
      status: 'suspended',
      suspendedAt: now,
      metadata: {
        ...tenant.metadata,
        suspensionReason: data.reason,
        suspendedBy: actorId,
      },
    });

    // Fire webhook
    this.fireWebhook({
      event: 'tenant.suspended',
      tenantId: id,
      timestamp: now,
      data: { reason: data.reason },
    });

    // Notify users if requested
    if (data.notifyUsers) {
      logger.info('Sending suspension notifications', { id });
      // TODO: Send emails via notification service
    }

    logger.info('Tenant suspended', { id, reason: data.reason });
    return updated;
  }

  async reactivateTenant(id: string, actorId: string): Promise<Tenant | null> {
    const tenant = store.getById(id);
    if (!tenant) return null;

    if (tenant.status !== 'suspended') {
      throw new Error('Only suspended tenants can be reactivated');
    }

    const updated = store.update(id, {
      status: 'active',
      metadata: {
        ...tenant.metadata,
        reactivatedBy: actorId,
        reactivatedAt: new Date().toISOString(),
      },
    });

    // Fire webhook
    this.fireWebhook({
      event: 'tenant.reactivated',
      tenantId: id,
      timestamp: new Date(),
      data: {},
    });

    logger.info('Tenant reactivated', { id });
    return updated;
  }

  async terminateTenant(id: string, data: TenantTerminate, actorId: string): Promise<{ jobId: string; estimatedCompletionTime: Date }> {
    const tenant = store.getById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Validate confirmation token
    if (data.confirmationToken !== id) {
      throw new Error('Confirmation token does not match tenant ID');
    }

    // Validate snapshot exists
    const snapshot = store.getSnapshot(data.snapshotId);
    if (!snapshot || snapshot.tenantId !== id || snapshot.status !== 'completed') {
      throw new Error('Valid completed snapshot required before termination');
    }

    if (tenant.status === 'terminated') {
      throw new Error('Tenant already terminated');
    }

    const now = new Date();
    const jobId = randomUUID();

    // Mark as terminated immediately
    store.update(id, {
      status: 'terminated',
      terminatedAt: now,
      metadata: {
        ...tenant.metadata,
        terminationReason: data.reason,
        terminatedBy: actorId,
        terminationJobId: jobId,
      },
    });

    // Fire webhook
    this.fireWebhook({
      event: 'tenant.terminated',
      tenantId: id,
      timestamp: now,
      data: { reason: data.reason, snapshotId: data.snapshotId },
    });

    // Async cleanup (in production, use job queue)
    setTimeout(async () => {
      try {
        await this.cleanupTenantResources(id);
        logger.info('Tenant cleanup completed', { id, jobId });
      } catch (error) {
        logger.error('Tenant cleanup failed', { id, jobId, error });
      }
    }, 5000);

    logger.warn('Tenant terminated', { id, reason: data.reason, actorId });

    return {
      jobId,
      estimatedCompletionTime: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes
    };
  }

  async rotateTenantSecrets(id: string, data: SecretRotation): Promise<{ rotatedKeys: RotatedKey[] }> {
    const tenant = store.getById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const secretTypes = data.secretTypes || ['api_key', 'signing_key', 'encryption_key'];
    const gracePeriodHours = data.gracePeriodHours || 24;
    const expiresAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);

    const rotatedKeys: RotatedKey[] = secretTypes.map(type => ({
      type,
      oldKeyId: `old_${type}_${randomUUID().substring(0, 8)}`,
      newKeyId: `new_${type}_${randomUUID().substring(0, 8)}`,
      expiresAt,
    }));

    // Store new keys in Vault (production)
    logger.info('Secrets rotated', { id, secretTypes, gracePeriodHours });

    // Fire webhook
    this.fireWebhook({
      event: 'tenant.secrets_rotated',
      tenantId: id,
      timestamp: new Date(),
      data: { secretTypes, gracePeriodHours },
    });

    return { rotatedKeys };
  }

  async createSnapshot(id: string, data: SnapshotCreate): Promise<{ snapshotId: string; jobId: string; estimatedCompletionTime: Date }> {
    const tenant = store.getById(id);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const now = new Date();
    const snapshotId = randomUUID();
    const jobId = randomUUID();

    const snapshot: TenantSnapshot = {
      id: snapshotId,
      tenantId: id,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    store.createSnapshot(snapshot);

    // Async snapshot creation
    setTimeout(async () => {
      try {
        const exportData = await this.exportTenantData(id, data);
        const sizeBytes = JSON.stringify(exportData).length;

        store.updateSnapshot(snapshotId, {
          status: 'completed',
          downloadUrl: `/api/tenants/${id}/snapshot/${snapshotId}/download`,
          sizeBytes,
        });

        logger.info('Snapshot completed', { id, snapshotId, sizeBytes });
      } catch (error) {
        logger.error('Snapshot failed', { id, snapshotId, error });
        store.updateSnapshot(snapshotId, { status: 'failed' });
      }
    }, 3000);

    logger.info('Snapshot job started', { id, snapshotId, includeMetrics: data.includeMetrics, includePii: data.includePii });

    return {
      snapshotId,
      jobId,
      estimatedCompletionTime: new Date(now.getTime() + 5 * 60 * 1000),
    };
  }

  async getSnapshot(tenantId: string, snapshotId: string): Promise<TenantSnapshot | null> {
    const snapshot = store.getSnapshot(snapshotId);
    if (!snapshot || snapshot.tenantId !== tenantId) {
      return null;
    }
    return snapshot;
  }

  // ==================== Helpers ====================

  private async provisionTenantResources(tenantId: string): Promise<void> {
    // Mock provisioning tasks:
    // - Create database schema
    // - Set up S3 buckets
    // - Initialize Redis namespace
    // - Configure monitoring
    logger.info('Provisioning tenant resources', { tenantId });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async cleanupTenantResources(tenantId: string): Promise<void> {
    // Mock cleanup tasks:
    // - Delete database data
    // - Remove S3 objects
    // - Clear Redis cache
    // - Archive logs
    logger.info('Cleaning up tenant resources', { tenantId });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async exportTenantData(tenantId: string, options: SnapshotCreate): Promise<any> {
    // Mock export
    return {
      tenantId,
      exportedAt: new Date().toISOString(),
      users: options.includePii ? 50 : 0,
      configs: 12,
      metrics: options.includeMetrics ? 1500 : 0,
    };
  }

  private fireWebhook(event: TenantWebhookEvent): void {
    store.addWebhookEvent(event);
    // TODO: Send webhook to registered endpoints
    logger.info('Webhook fired', { event: event.event, tenantId: event.tenantId });
  }
}
