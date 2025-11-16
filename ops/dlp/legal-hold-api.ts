/**
 * Legal Hold API
 * Implements data preservation for legal discovery and compliance
 */

import { S3Client, PutObjectTaggingCommand, GetObjectTaggingCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export interface LegalHold {
  holdId: string;
  caseId: string;
  caseName: string;
  requestedBy: string;
  requestedAt: string;
  status: 'active' | 'released' | 'expired';
  expiresAt?: string;
  scope: {
    buckets: string[];
    prefixes?: string[];
    tags?: Record<string, string>;
    dateRange?: { start: string; end: string };
  };
  preservedObjects: string[];
  metadata: {
    legalEntity: string;
    jurisdiction: string;
    matter: string;
    notes?: string;
  };
}

export interface QuarantineRecord {
  recordId: string;
  bucket: string;
  key: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  quarantinedAt: string;
  releasedAt?: string;
  approvedBy?: string;
  findings: Array<{
    patternId: string;
    category: string;
    matchCount: number;
  }>;
}

export class LegalHoldManager {
  private s3Client: S3Client;
  private holds: Map<string, LegalHold> = new Map();
  private quarantine: Map<string, QuarantineRecord> = new Map();

  constructor(s3Config: { region: string; endpoint?: string }) {
    this.s3Client = new S3Client(s3Config);
  }

  /**
   * Create legal hold on data
   */
  async createHold(
    caseId: string,
    caseName: string,
    requestedBy: string,
    scope: LegalHold['scope'],
    metadata: LegalHold['metadata'],
    durationDays?: number,
  ): Promise<LegalHold> {
    const holdId = randomUUID();
    const now = new Date();

    const expiresAt = durationDays
      ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const hold: LegalHold = {
      holdId,
      caseId,
      caseName,
      requestedBy,
      requestedAt: now.toISOString(),
      status: 'active',
      expiresAt,
      scope,
      preservedObjects: [],
      metadata,
    };

    // Apply legal hold tags to objects in scope
    const preservedObjects = await this.applyHoldTags(hold);
    hold.preservedObjects = preservedObjects;

    this.holds.set(holdId, hold);

    console.log(`[Legal Hold] Created hold ${holdId} for case ${caseId} (${preservedObjects.length} objects)`);

    return hold;
  }

  /**
   * Apply legal hold tags to objects
   */
  private async applyHoldTags(hold: LegalHold): Promise<string[]> {
    const preservedObjects: string[] = [];

    for (const bucket of hold.scope.buckets) {
      const prefixes = hold.scope.prefixes || [''];

      for (const prefix of prefixes) {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        });

        const response = await this.s3Client.send(listCommand);
        const objects = response.Contents || [];

        for (const obj of objects) {
          if (!obj.Key) continue;

          // Filter by date range if specified
          if (hold.scope.dateRange && obj.LastModified) {
            const lastModified = obj.LastModified.toISOString();
            if (lastModified < hold.scope.dateRange.start || lastModified > hold.scope.dateRange.end) {
              continue;
            }
          }

          // Apply legal hold tag
          await this.tagObject(bucket, obj.Key, {
            'legal-hold': 'true',
            'hold-id': hold.holdId,
            'case-id': hold.caseId,
            'hold-expiry': hold.expiresAt || 'indefinite',
          });

          preservedObjects.push(`${bucket}/${obj.Key}`);
        }
      }
    }

    return preservedObjects;
  }

  /**
   * Tag S3 object
   */
  private async tagObject(bucket: string, key: string, tags: Record<string, string>): Promise<void> {
    // Get existing tags
    const getTagsCommand = new GetObjectTaggingCommand({ Bucket: bucket, Key: key });
    const existingTags = await this.s3Client.send(getTagsCommand);

    // Merge tags
    const tagSet = existingTags.TagSet || [];
    for (const [tagKey, tagValue] of Object.entries(tags)) {
      const existingTag = tagSet.find((t) => t.Key === tagKey);
      if (existingTag) {
        existingTag.Value = tagValue;
      } else {
        tagSet.push({ Key: tagKey, Value: tagValue });
      }
    }

    // Apply tags
    const putTagsCommand = new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: key,
      Tagging: { TagSet: tagSet },
    });

    await this.s3Client.send(putTagsCommand);
  }

  /**
   * Release legal hold
   */
  async releaseHold(holdId: string, releasedBy: string): Promise<void> {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    if (hold.status !== 'active') {
      throw new Error(`Legal hold is not active: ${holdId}`);
    }

    // Remove legal hold tags from all objects
    for (const objectPath of hold.preservedObjects) {
      const [bucket, ...keyParts] = objectPath.split('/');
      const key = keyParts.join('/');

      await this.removeHoldTags(bucket, key, holdId);
    }

    hold.status = 'released';
    this.holds.set(holdId, hold);

    console.log(`[Legal Hold] Released hold ${holdId} (${releasedBy})`);
  }

  /**
   * Remove legal hold tags from object
   */
  private async removeHoldTags(bucket: string, key: string, holdId: string): Promise<void> {
    const getTagsCommand = new GetObjectTaggingCommand({ Bucket: bucket, Key: key });
    const existingTags = await this.s3Client.send(getTagsCommand);

    // Remove hold-specific tags
    const tagSet = (existingTags.TagSet || []).filter(
      (t) => !(t.Key === 'legal-hold' || t.Key === 'hold-id' || t.Key === 'case-id' || t.Key === 'hold-expiry'),
    );

    const putTagsCommand = new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: key,
      Tagging: { TagSet: tagSet },
    });

    await this.s3Client.send(putTagsCommand);
  }

  /**
   * Get legal hold details
   */
  getHold(holdId: string): LegalHold | null {
    return this.holds.get(holdId) || null;
  }

  /**
   * List all legal holds
   */
  listHolds(status?: 'active' | 'released' | 'expired'): LegalHold[] {
    const holds = Array.from(this.holds.values());
    if (status) {
      return holds.filter((h) => h.status === status);
    }
    return holds;
  }

  /**
   * Add object to quarantine
   */
  async quarantineObject(
    bucket: string,
    key: string,
    reason: string,
    severity: QuarantineRecord['severity'],
    findings: QuarantineRecord['findings'],
  ): Promise<QuarantineRecord> {
    const recordId = randomUUID();

    const record: QuarantineRecord = {
      recordId,
      bucket,
      key,
      reason,
      severity,
      quarantinedAt: new Date().toISOString(),
      findings,
    };

    // Tag object as quarantined
    await this.tagObject(bucket, key, {
      quarantine: 'true',
      'quarantine-id': recordId,
      'quarantine-reason': reason,
      'quarantine-severity': severity,
    });

    this.quarantine.set(recordId, record);

    console.log(`[Quarantine] Quarantined ${bucket}/${key} (${severity}): ${reason}`);

    return record;
  }

  /**
   * Release object from quarantine (requires approval)
   */
  async releaseFromQuarantine(recordId: string, approvedBy: string): Promise<void> {
    const record = this.quarantine.get(recordId);
    if (!record) {
      throw new Error(`Quarantine record not found: ${recordId}`);
    }

    if (record.releasedAt) {
      throw new Error(`Already released: ${recordId}`);
    }

    // Remove quarantine tags
    await this.removeHoldTags(record.bucket, record.key, recordId);

    record.releasedAt = new Date().toISOString();
    record.approvedBy = approvedBy;
    this.quarantine.set(recordId, record);

    console.log(`[Quarantine] Released ${record.bucket}/${record.key} by ${approvedBy}`);
  }

  /**
   * List quarantined objects
   */
  listQuarantine(severity?: QuarantineRecord['severity']): QuarantineRecord[] {
    const records = Array.from(this.quarantine.values()).filter((r) => !r.releasedAt);
    if (severity) {
      return records.filter((r) => r.severity === severity);
    }
    return records;
  }

  /**
   * Check if object is under legal hold
   */
  async isUnderLegalHold(bucket: string, key: string): Promise<boolean> {
    const getTagsCommand = new GetObjectTaggingCommand({ Bucket: bucket, Key: key });
    const tags = await this.s3Client.send(getTagsCommand);

    return (tags.TagSet || []).some((t) => t.Key === 'legal-hold' && t.Value === 'true');
  }

  /**
   * Export legal hold audit trail
   */
  exportAuditTrail(holdId: string): string {
    const hold = this.holds.get(holdId);
    if (!hold) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    const auditTrail = {
      holdId: hold.holdId,
      caseId: hold.caseId,
      caseName: hold.caseName,
      requestedBy: hold.requestedBy,
      requestedAt: hold.requestedAt,
      status: hold.status,
      expiresAt: hold.expiresAt,
      scope: hold.scope,
      objectCount: hold.preservedObjects.length,
      metadata: hold.metadata,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(auditTrail, null, 2);
  }
}
