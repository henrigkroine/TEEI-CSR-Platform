/**
 * Regional Executor
 *
 * Handles DSAR job execution respecting data residency and regional compliance
 */

import postgres from 'postgres';
import { createDsrOrchestrator, createPiiEncryption } from '@teei/compliance';
import type { DataRegion, DsarJob, ExportResult, DeleteResult, RegionalExecutorConfig } from '../types/index.js';
import { DsrRequestType } from '@teei/compliance';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';

/**
 * Regional Executor
 */
export class RegionalExecutor {
  private configs: Map<DataRegion, RegionalExecutorConfig>;
  private connections: Map<DataRegion, ReturnType<typeof postgres>>;

  constructor(configs: RegionalExecutorConfig[]) {
    this.configs = new Map(configs.map(c => [c.region, c]));
    this.connections = new Map();
  }

  /**
   * Get database connection for region
   */
  private getConnection(region: DataRegion): ReturnType<typeof postgres> {
    if (!this.connections.has(region)) {
      const config = this.configs.get(region);
      if (!config || !config.enabled) {
        throw new Error(`Region ${region} not configured or disabled`);
      }

      const sql = postgres(config.dbConnectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 30,
      });

      this.connections.set(region, sql);
    }

    return this.connections.get(region)!;
  }

  /**
   * Execute export job
   */
  async executeExport(job: DsarJob): Promise<ExportResult> {
    const sql = this.getConnection(job.region);
    const db = drizzle(sql);
    const dsr = createDsrOrchestrator(db);
    const piiEncryption = createPiiEncryption();

    // Export data
    const exportData = await dsr.exportUserData(job.userId, job.requestedBy);

    // Decrypt PII for user export
    if (exportData.data.pii && exportData.data.pii.encryptedEmail) {
      const decrypted = piiEncryption.decryptObject(
        exportData.data.pii,
        job.userId,
        {
          encryptedEmail: 'email',
          encryptedPhone: 'phone',
          encryptedAddress: 'address',
        }
      );
      exportData.data.pii = { ...exportData.data.pii, ...decrypted };
    }

    // Store export file
    const exportJson = JSON.stringify(exportData, null, 2);
    const exportPath = await this.storeExportFile(job, exportJson);

    // Create signature
    const signature = this.createSignature(exportJson);

    // Calculate expiry (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return {
      jobId: job.id,
      userId: job.userId,
      region: job.region,
      exportUrl: exportPath,
      expiresAt,
      recordCount: exportData.metadata.recordCount,
      sizeBytes: Buffer.byteLength(exportJson),
      completedAt: new Date(),
      signature,
    };
  }

  /**
   * Execute delete job
   */
  async executeDelete(job: DsarJob): Promise<DeleteResult> {
    const sql = this.getConnection(job.region);
    const db = drizzle(sql);
    const dsr = createDsrOrchestrator(db);

    // Request deletion (creates deletion queue entry)
    const deletionId = await dsr.requestDeletion({
      requestType: DsrRequestType.ERASURE,
      userId: job.userId,
      requestedBy: job.requestedBy,
      reason: job.metadata?.reason || 'User requested deletion',
    });

    // If immediate execution is requested, execute now
    // Otherwise, it will be processed after grace period
    let result;
    if (job.metadata?.immediate) {
      result = await dsr.executeDeletion(deletionId);
    } else {
      const status = await dsr.getDeletionStatus(deletionId);
      result = {
        userId: job.userId,
        status: status.status,
        deletedSources: [],
        verificationHash: 'pending',
        completedAt: new Date().toISOString(),
      };
    }

    // Calculate grace period end
    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 30);

    return {
      jobId: job.id,
      userId: job.userId,
      region: job.region,
      deletedSources: result.deletedSources || [],
      verificationHash: result.verificationHash,
      completedAt: new Date(),
      gracePeriodEndsAt: job.metadata?.immediate ? undefined : gracePeriodEndsAt,
    };
  }

  /**
   * Execute status check
   */
  async executeStatus(userId: string, region: DataRegion): Promise<any> {
    const sql = this.getConnection(region);
    const db = drizzle(sql);
    const dsr = createDsrOrchestrator(db);

    // Get pending deletions for user
    const pendingDeletions = await dsr.getPendingDeletions();
    const userDeletions = pendingDeletions.filter((d: any) => d.userId === userId);

    return {
      userId,
      region,
      pendingDeletions: userDeletions.length,
      deletions: userDeletions,
    };
  }

  /**
   * Store export file
   */
  private async storeExportFile(job: DsarJob, content: string): Promise<string> {
    const config = this.configs.get(job.region)!;

    // In production, this would upload to S3/GCS/Azure Blob Storage
    // For now, return a signed URL path
    const filename = `exports/${job.region}/${job.userId}/${job.id}.json`;

    // Store locally for demo (in production, use cloud storage SDK)
    const fs = await import('fs/promises');
    const path = `./data/${filename}`;
    await fs.mkdir(path.split('/').slice(0, -1).join('/'), { recursive: true });
    await fs.writeFile(path, content, 'utf-8');

    // Return signed URL (in production, generate presigned URL)
    return `${config.storageEndpoint}/${filename}?expires=30d`;
  }

  /**
   * Create cryptographic signature
   */
  private createSignature(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Validate region is enabled
   */
  isRegionEnabled(region: DataRegion): boolean {
    const config = this.configs.get(region);
    return !!config && config.enabled;
  }

  /**
   * Get all enabled regions
   */
  getEnabledRegions(): DataRegion[] {
    return Array.from(this.configs.values())
      .filter(c => c.enabled)
      .map(c => c.region);
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    for (const [region, conn] of this.connections.entries()) {
      await conn.end();
      this.connections.delete(region);
    }
  }
}

/**
 * Create regional executor from environment
 */
export function createRegionalExecutor(): RegionalExecutor {
  const configs: RegionalExecutorConfig[] = [
    {
      region: DataRegion.EU,
      dbConnectionString: process.env.DB_EU_CONNECTION_STRING || process.env.DATABASE_URL || '',
      storageEndpoint: process.env.STORAGE_EU_ENDPOINT || 'https://storage-eu.teei.com',
      encryptionKeyId: process.env.ENCRYPTION_KEY_EU || 'eu-key-v1',
      enabled: true,
    },
    {
      region: DataRegion.US,
      dbConnectionString: process.env.DB_US_CONNECTION_STRING || process.env.DATABASE_URL || '',
      storageEndpoint: process.env.STORAGE_US_ENDPOINT || 'https://storage-us.teei.com',
      encryptionKeyId: process.env.ENCRYPTION_KEY_US || 'us-key-v1',
      enabled: true,
    },
    {
      region: DataRegion.UK,
      dbConnectionString: process.env.DB_UK_CONNECTION_STRING || process.env.DATABASE_URL || '',
      storageEndpoint: process.env.STORAGE_UK_ENDPOINT || 'https://storage-uk.teei.com',
      encryptionKeyId: process.env.ENCRYPTION_KEY_UK || 'uk-key-v1',
      enabled: true,
    },
  ];

  return new RegionalExecutor(configs);
}
