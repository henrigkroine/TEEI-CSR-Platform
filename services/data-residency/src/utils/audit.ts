import { createHash } from 'crypto';
import { getDatabase } from '../db/index.js';
import { residencyAuditLogs } from '../db/schema.js';
import type { Region, ResidencyType } from '../types/index.js';

/**
 * Hash company ID to prevent PII in audit logs
 */
export function hashCompanyId(companyId: string): string {
  return createHash('sha256').update(companyId).digest('hex');
}

/**
 * Log residency validation check
 */
export async function logResidencyCheck(params: {
  companyId: string;
  requestedRegion: Region;
  assignedRegion: Region;
  residencyType: ResidencyType;
  allowed: boolean;
  operation?: string;
  requestId?: string;
}): Promise<void> {
  try {
    const db = getDatabase();
    const companyIdHash = hashCompanyId(params.companyId);

    await db.insert(residencyAuditLogs).values({
      companyIdHash,
      requestedRegion: params.requestedRegion,
      assignedRegion: params.assignedRegion,
      residencyType: params.residencyType,
      allowed: params.allowed ? 'true' : 'false',
      operation: params.operation,
      requestId: params.requestId,
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to log residency check:', error);
  }
}

/**
 * Get audit logs for analysis (admin only)
 * Returns aggregated stats, not individual records with PII
 */
export async function getResidencyStats(params: {
  startDate?: Date;
  endDate?: Date;
  region?: Region;
}): Promise<{
  totalChecks: number;
  allowedChecks: number;
  deniedChecks: number;
  byRegion: Record<string, number>;
  byResidencyType: Record<string, number>;
}> {
  const db = getDatabase();
  const logs = await db.select().from(residencyAuditLogs);

  let filtered = logs;

  if (params.startDate) {
    filtered = filtered.filter(log => new Date(log.timestamp) >= params.startDate!);
  }

  if (params.endDate) {
    filtered = filtered.filter(log => new Date(log.timestamp) <= params.endDate!);
  }

  if (params.region) {
    filtered = filtered.filter(log => log.assignedRegion === params.region);
  }

  const stats = {
    totalChecks: filtered.length,
    allowedChecks: filtered.filter(log => log.allowed === 'true').length,
    deniedChecks: filtered.filter(log => log.allowed === 'false').length,
    byRegion: {} as Record<string, number>,
    byResidencyType: {} as Record<string, number>,
  };

  // Count by region
  filtered.forEach(log => {
    stats.byRegion[log.assignedRegion] = (stats.byRegion[log.assignedRegion] || 0) + 1;
  });

  // Count by residency type
  filtered.forEach(log => {
    stats.byResidencyType[log.residencyType] = (stats.byResidencyType[log.residencyType] || 0) + 1;
  });

  return stats;
}
