/**
 * Demo Tenant Service
 * Business logic for demo tenant lifecycle
 */

import type {
  CreateDemoTenantRequest,
  RefreshDemoTenantRequest,
  ExportDemoTenantRequest,
  WarmTilesRequest,
  DemoTenant,
  DeleteDemoTenantResult,
  SeedResult,
  WarmTilesResult,
  DemoTenantStatus,
} from '@teei/shared-types/demo';
import { Readable } from 'stream';

/**
 * Demo Tenant Service
 */
export class DemoTenantService {
  private masterSalt: string;
  private demoTenants: Map<string, DemoTenant>;

  constructor() {
    // In production, load from secure config/vault
    this.masterSalt = process.env.DEMO_MASTER_SALT || 'default-demo-salt-change-me';

    // In production, this would be database-backed
    this.demoTenants = new Map();
  }

  /**
   * Create a new demo tenant with seeded data
   */
  async createDemoTenant(request: CreateDemoTenantRequest): Promise<{
    tenant: DemoTenant;
    seedResult: SeedResult;
  }> {
    const tenantId = `demo-${request.tenantName}`;

    // Check if tenant already exists
    if (this.demoTenants.has(tenantId)) {
      throw new Error(`Demo tenant ${tenantId} already exists`);
    }

    // Create tenant metadata
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 day TTL

    const tenant: DemoTenant = {
      tenantId,
      name: request.tenantName,
      status: 'creating',
      size: request.size,
      regions: request.regions,
      vertical: request.vertical,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      seedProgress: 0,
      adminEmail: request.adminEmail,
      metadata: request.metadata,
    };

    this.demoTenants.set(tenantId, tenant);

    try {
      // Update status to seeding
      tenant.status = 'seeding';
      this.demoTenants.set(tenantId, tenant);

      // Seed data (call impact-in service)
      const seedResult = await this.seedDemoData(request);

      // Update tenant with seed stats
      tenant.seedStats = {
        usersCreated: seedResult.results.reduce((sum, r) => sum + r.uniqueSubjects, 0),
        eventsCreated: seedResult.totalEvents,
        tilesWarmed: 0,
        reportsGenerated: 0,
      };

      // Update status to ready
      tenant.status = 'ready';
      tenant.seedProgress = 100;
      this.demoTenants.set(tenantId, tenant);

      return { tenant, seedResult };
    } catch (error) {
      // Update tenant with error
      tenant.status = 'error';
      tenant.errorMessage = error instanceof Error ? error.message : String(error);
      this.demoTenants.set(tenantId, tenant);

      throw error;
    }
  }

  /**
   * Get demo tenant by ID
   */
  async getDemoTenant(tenantId: string): Promise<DemoTenant | null> {
    return this.demoTenants.get(tenantId) || null;
  }

  /**
   * List all demo tenants
   */
  async listDemoTenants(): Promise<DemoTenant[]> {
    return Array.from(this.demoTenants.values());
  }

  /**
   * Refresh demo tenant data
   */
  async refreshDemoTenant(
    tenantId: string,
    request: RefreshDemoTenantRequest
  ): Promise<SeedResult> {
    const tenant = this.demoTenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Demo tenant ${tenantId} not found`);
    }

    tenant.status = 'seeding';
    tenant.seedProgress = 0;
    this.demoTenants.set(tenantId, tenant);

    try {
      // Re-seed data
      const seedResult = await this.seedDemoData({
        tenantName: tenant.name,
        size: tenant.size,
        regions: tenant.regions,
        vertical: tenant.vertical,
        timeRangeMonths: 12,
        includeSeasonality: true,
        locale: 'en',
        adminEmail: tenant.adminEmail,
        metadata: tenant.metadata,
      });

      // Update tenant
      tenant.status = 'ready';
      tenant.seedProgress = 100;
      tenant.lastRefreshedAt = new Date().toISOString();
      this.demoTenants.set(tenantId, tenant);

      return seedResult;
    } catch (error) {
      tenant.status = 'error';
      tenant.errorMessage = error instanceof Error ? error.message : String(error);
      this.demoTenants.set(tenantId, tenant);

      throw error;
    }
  }

  /**
   * Warm analytics tiles
   */
  async warmTiles(tenantId: string, request: WarmTilesRequest): Promise<WarmTilesResult> {
    const startTime = Date.now();

    // TODO: Call analytics service to warm tiles
    // For now, return mock result

    const tilesWarmed = request.tileTypes || [
      'volunteer_hours',
      'donation_total',
      'learning_completions',
      'sroi',
      'vis',
      'engagement_rate',
    ];

    return {
      tenantId,
      tilesWarmed,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Export demo tenant data
   */
  async exportDemoTenant(
    tenantId: string,
    request: ExportDemoTenantRequest
  ): Promise<Readable> {
    const tenant = this.demoTenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Demo tenant ${tenantId} not found`);
    }

    // TODO: Implement actual export logic
    // For now, return a simple JSON stream

    const exportData = {
      tenant,
      exportedAt: new Date().toISOString(),
      format: request.format,
      includeEvents: request.includeEvents,
      includeTiles: request.includeTiles,
      includeReports: request.includeReports,
    };

    const stream = Readable.from([JSON.stringify(exportData, null, 2)]);
    return stream;
  }

  /**
   * Delete demo tenant and all data
   */
  async deleteDemoTenant(tenantId: string): Promise<DeleteDemoTenantResult> {
    const startTime = Date.now();

    const tenant = this.demoTenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Demo tenant ${tenantId} not found`);
    }

    try {
      // Update status
      tenant.status = 'deleting';
      this.demoTenants.set(tenantId, tenant);

      // TODO: Delete all resources
      // - Users
      // - Events
      // - Tiles
      // - Reports
      // - Other tenant data

      // Remove from map
      this.demoTenants.delete(tenantId);

      return {
        tenantId,
        success: true,
        resourcesDeleted: {
          users: tenant.seedStats?.usersCreated || 0,
          events: tenant.seedStats?.eventsCreated || 0,
          tiles: tenant.seedStats?.tilesWarmed || 0,
          reports: tenant.seedStats?.reportsGenerated || 0,
          other: 0,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        tenantId,
        success: false,
        resourcesDeleted: {
          users: 0,
          events: 0,
          tiles: 0,
          reports: 0,
          other: 0,
        },
        durationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Seed demo data
   * TODO: Call impact-in service to actually seed data
   */
  private async seedDemoData(request: CreateDemoTenantRequest): Promise<SeedResult> {
    // This would call the impact-in DemoSeeder in production
    // For now, return mock result

    const totalEvents = this.estimateEvents(request.size);

    return {
      tenantId: `demo-${request.tenantName}`,
      status: 'success',
      results: [
        {
          eventType: 'volunteer',
          count: Math.floor(totalEvents * 0.4),
          uniqueSubjects: 50,
          dateRange: {
            start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          durationMs: 1000,
        },
        {
          eventType: 'donation',
          count: Math.floor(totalEvents * 0.3),
          uniqueSubjects: 40,
          dateRange: {
            start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          durationMs: 800,
        },
        {
          eventType: 'session',
          count: Math.floor(totalEvents * 0.2),
          uniqueSubjects: 30,
          dateRange: {
            start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          durationMs: 600,
        },
        {
          eventType: 'enrollment',
          count: Math.floor(totalEvents * 0.08),
          uniqueSubjects: 25,
          dateRange: {
            start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          durationMs: 400,
        },
        {
          eventType: 'buddy',
          count: Math.floor(totalEvents * 0.02),
          uniqueSubjects: 20,
          dateRange: {
            start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          durationMs: 300,
        },
      ],
      totalEvents,
      totalDurationMs: 3100,
    };
  }

  /**
   * Estimate total events for size
   */
  private estimateEvents(size: string): number {
    switch (size) {
      case 'small':
        return 1125;
      case 'medium':
        return 25250;
      case 'large':
        return 126000;
      default:
        return 1000;
    }
  }
}
