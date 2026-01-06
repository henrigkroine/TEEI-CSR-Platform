/**
 * Export Audit Logger
 *
 * Tracks all report exports for compliance, security, and analytics.
 * Implements GDPR-compliant logging with PII masking and retention policies.
 *
 * Features:
 * - Log all export attempts (success and failure)
 * - PII masking for IP addresses and user data
 * - Per-tenant audit queries
 * - Export statistics and analytics
 * - CSV export for compliance reporting
 * - Configurable retention policies
 *
 * @module lib/exportAudit
 */

import { createServiceLogger } from '@teei/shared-utils';
import { randomBytes } from 'crypto';

const logger = createServiceLogger('reporting:export-audit');

/**
 * Export audit log entry
 */
export interface ExportAuditEntry {
  exportId: string;
  tenantId: string;
  userId: string;
  userName: string; // Masked in logs
  exportType: 'pdf' | 'csv' | 'json' | 'ppt';
  reportId?: string; // Single report export
  reportIds?: string[]; // Batch export
  reportConfig?: string; // Hash of report configuration
  timestamp: Date;
  ipAddress: string; // Masked in logs
  userAgent?: string;
  fileSize?: number; // Bytes
  status: 'initiated' | 'success' | 'failed';
  errorMessage?: string;
  renderTime?: number; // Milliseconds
  metadata?: Record<string, any>;
}

/**
 * Export audit filters for querying
 */
export interface ExportAuditFilters {
  exportType?: 'pdf' | 'csv' | 'json' | 'ppt';
  userId?: string;
  reportId?: string;
  status?: 'initiated' | 'success' | 'failed';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Export statistics by period
 */
export interface ExportStats {
  tenantId: string;
  period: {
    from: Date;
    to: Date;
  };
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byUser: Record<string, number>;
  successRate: number;
  averageFileSize: number;
  averageRenderTime: number;
  totalDataExported: number; // Total bytes
}

/**
 * In-memory audit log store
 *
 * PRODUCTION NOTE: Replace with database table for persistence.
 * Recommended schema:
 * - Table: export_audit_logs
 * - Columns: Match ExportAuditEntry interface
 * - Indexes: tenantId, userId, timestamp, status
 * - Retention: Automated cleanup based on retention_until column
 */
const auditLogs: ExportAuditEntry[] = [];

/**
 * Retention policy (days)
 * GDPR compliance: default 90 days
 */
const RETENTION_DAYS = parseInt(process.env.EXPORT_AUDIT_RETENTION_DAYS || '90', 10);

/**
 * Log export attempt (initiated)
 *
 * Call this BEFORE starting the export to track attempts.
 * Returns exportId to use for success/failure logging.
 *
 * @param entry - Export audit entry (without exportId, status, timestamp)
 * @returns exportId for subsequent logging
 *
 * @example
 * const exportId = logExportAttempt({
 *   tenantId: 'tenant-123',
 *   userId: 'user-456',
 *   userName: 'Jane Doe',
 *   exportType: 'pdf',
 *   reportId: 'report-789',
 *   ipAddress: '192.168.1.100',
 *   userAgent: 'Mozilla/5.0...',
 * });
 */
export function logExportAttempt(
  entry: Omit<ExportAuditEntry, 'exportId' | 'status' | 'timestamp'>
): string {
  const exportId = generateExportId();

  const auditEntry: ExportAuditEntry = {
    ...entry,
    exportId,
    status: 'initiated',
    timestamp: new Date(),
  };

  // Mask PII before storing
  const maskedEntry = maskPII(auditEntry);
  auditLogs.push(maskedEntry);

  // Log to service logger (with masked data)
  logger.info('Export initiated', {
    exportId,
    tenantId: maskedEntry.tenantId,
    exportType: maskedEntry.exportType,
    userId: maskedEntry.userId,
    userName: maskUserName(maskedEntry.userName),
    ipAddress: maskIPAddress(maskedEntry.ipAddress),
  });

  // In production: persist to database
  // await db.insert(exportAuditLogs).values(maskedEntry);

  return exportId;
}

/**
 * Log export success
 *
 * Call this AFTER successful export completion.
 *
 * @param exportId - Export ID from logExportAttempt
 * @param result - Export result details
 *
 * @example
 * logExportSuccess(exportId, {
 *   fileSize: 1024567,
 *   renderTime: 2340,
 *   metadata: { pageCount: 12 }
 * });
 */
export function logExportSuccess(
  exportId: string,
  result: {
    fileSize: number;
    renderTime?: number;
    metadata?: Record<string, any>;
  }
): void {
  const entry = auditLogs.find((e) => e.exportId === exportId);

  if (!entry) {
    logger.warn('Export entry not found for success logging', { exportId });
    return;
  }

  // Update entry
  entry.status = 'success';
  entry.fileSize = result.fileSize;
  entry.renderTime = result.renderTime;
  entry.metadata = result.metadata;

  logger.info('Export completed successfully', {
    exportId,
    tenantId: entry.tenantId,
    exportType: entry.exportType,
    fileSize: formatBytes(result.fileSize),
    renderTime: result.renderTime ? `${result.renderTime}ms` : undefined,
  });

  // In production: update database
  // await db.update(exportAuditLogs).set({ status: 'success', ...result }).where(eq(exportAuditLogs.exportId, exportId));
}

/**
 * Log export failure
 *
 * Call this if export fails with error.
 *
 * @param exportId - Export ID from logExportAttempt
 * @param error - Error message or Error object
 *
 * @example
 * logExportFailure(exportId, error.message);
 */
export function logExportFailure(exportId: string, error: string | Error): void {
  const entry = auditLogs.find((e) => e.exportId === exportId);

  if (!entry) {
    logger.warn('Export entry not found for failure logging', { exportId });
    return;
  }

  const errorMessage = typeof error === 'string' ? error : error.message;

  // Update entry
  entry.status = 'failed';
  entry.errorMessage = errorMessage;

  logger.error('Export failed', {
    exportId,
    tenantId: entry.tenantId,
    exportType: entry.exportType,
    error: errorMessage,
  });

  // In production: update database
  // await db.update(exportAuditLogs).set({ status: 'failed', errorMessage }).where(eq(exportAuditLogs.exportId, exportId));
}

/**
 * Get export audit logs for a tenant
 *
 * @param tenantId - Tenant ID
 * @param filters - Optional filters
 * @returns Array of audit log entries (PII masked)
 *
 * @example
 * const logs = getExportLogs('tenant-123', {
 *   exportType: 'pdf',
 *   status: 'success',
 *   startDate: new Date('2024-01-01'),
 *   limit: 100
 * });
 */
export function getExportLogs(
  tenantId: string,
  filters?: ExportAuditFilters
): ExportAuditEntry[] {
  let filtered = auditLogs.filter((log) => log.tenantId === tenantId);

  // Apply filters
  if (filters?.exportType) {
    filtered = filtered.filter((log) => log.exportType === filters.exportType);
  }

  if (filters?.userId) {
    filtered = filtered.filter((log) => log.userId === filters.userId);
  }

  if (filters?.reportId) {
    filtered = filtered.filter(
      (log) =>
        log.reportId === filters.reportId ||
        log.reportIds?.includes(filters.reportId!)
    );
  }

  if (filters?.status) {
    filtered = filtered.filter((log) => log.status === filters.status);
  }

  if (filters?.startDate) {
    filtered = filtered.filter((log) => log.timestamp >= filters.startDate!);
  }

  if (filters?.endDate) {
    filtered = filtered.filter((log) => log.timestamp <= filters.endDate!);
  }

  // Apply retention policy
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);
  filtered = filtered.filter((log) => log.timestamp >= retentionDate);

  // Sort by most recent first
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  if (filters?.offset) {
    filtered = filtered.slice(filters.offset);
  }

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Get export statistics for a tenant
 *
 * @param tenantId - Tenant ID
 * @param period - Time period (from/to dates)
 * @returns Export statistics
 *
 * @example
 * const stats = getExportStats('tenant-123', {
 *   from: new Date('2024-01-01'),
 *   to: new Date('2024-12-31')
 * });
 */
export function getExportStats(
  tenantId: string,
  period: { from: Date; to: Date }
): ExportStats {
  const logs = auditLogs.filter(
    (log) =>
      log.tenantId === tenantId &&
      log.timestamp >= period.from &&
      log.timestamp <= period.to
  );

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  let totalFileSize = 0;
  let totalRenderTime = 0;
  let renderTimeCount = 0;

  logs.forEach((log) => {
    // By type
    byType[log.exportType] = (byType[log.exportType] || 0) + 1;

    // By status
    byStatus[log.status] = (byStatus[log.status] || 0) + 1;

    // By user
    const userKey = maskUserName(log.userName);
    byUser[userKey] = (byUser[userKey] || 0) + 1;

    // File size
    if (log.fileSize) {
      totalFileSize += log.fileSize;
    }

    // Render time
    if (log.renderTime) {
      totalRenderTime += log.renderTime;
      renderTimeCount++;
    }
  });

  const successCount = byStatus['success'] || 0;
  const totalCount = logs.length;

  return {
    tenantId,
    period,
    total: totalCount,
    byType,
    byStatus,
    byUser,
    successRate: totalCount > 0 ? successCount / totalCount : 0,
    averageFileSize: totalCount > 0 ? totalFileSize / totalCount : 0,
    averageRenderTime: renderTimeCount > 0 ? totalRenderTime / renderTimeCount : 0,
    totalDataExported: totalFileSize,
  };
}

/**
 * Export audit logs to CSV for compliance
 *
 * @param tenantId - Tenant ID
 * @param dateRange - Date range for export
 * @returns CSV string
 *
 * @example
 * const csv = exportAuditLogsCSV('tenant-123', {
 *   from: new Date('2024-01-01'),
 *   to: new Date('2024-12-31')
 * });
 *
 * // Save to file
 * fs.writeFileSync('audit-logs.csv', csv);
 */
export function exportAuditLogsCSV(
  tenantId: string,
  dateRange: { from: Date; to: Date }
): string {
  const logs = getExportLogs(tenantId, {
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  const headers = [
    'Export ID',
    'Timestamp',
    'Export Type',
    'User ID',
    'User Name',
    'Report ID',
    'Status',
    'File Size (bytes)',
    'Render Time (ms)',
    'IP Address',
    'Error Message',
  ];

  const rows = logs.map((log) => [
    log.exportId,
    log.timestamp.toISOString(),
    log.exportType,
    log.userId,
    maskUserName(log.userName),
    log.reportId || (log.reportIds ? log.reportIds.join(';') : ''),
    log.status,
    log.fileSize?.toString() || '',
    log.renderTime?.toString() || '',
    maskIPAddress(log.ipAddress),
    log.errorMessage || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csv;
}

/**
 * Clean up old audit logs based on retention policy
 *
 * Call this periodically (e.g., daily cron job) to enforce retention.
 *
 * @returns Number of logs deleted
 *
 * @example
 * const deleted = cleanupOldLogs();
 * console.log(`Deleted ${deleted} old audit logs`);
 */
export function cleanupOldLogs(): number {
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - RETENTION_DAYS);

  const initialCount = auditLogs.length;
  const filteredLogs = auditLogs.filter((log) => log.timestamp >= retentionDate);
  const deletedCount = initialCount - filteredLogs.length;

  // Update in-memory store
  auditLogs.length = 0;
  auditLogs.push(...filteredLogs);

  if (deletedCount > 0) {
    logger.info(`Cleaned up ${deletedCount} old audit logs`, {
      retentionDays: RETENTION_DAYS,
      cutoffDate: retentionDate.toISOString(),
    });
  }

  // In production: delete from database
  // await db.delete(exportAuditLogs).where(lt(exportAuditLogs.timestamp, retentionDate));

  return deletedCount;
}

/**
 * Get total count of audit logs for a tenant
 *
 * Useful for pagination.
 *
 * @param tenantId - Tenant ID
 * @param filters - Optional filters
 * @returns Total count
 */
export function getExportLogsCount(
  tenantId: string,
  filters?: Omit<ExportAuditFilters, 'limit' | 'offset'>
): number {
  const logs = getExportLogs(tenantId, { ...filters, limit: undefined, offset: undefined });
  return logs.length;
}

/**
 * PII Masking Utilities
 */

/**
 * Mask entire audit entry for storage
 */
function maskPII(entry: ExportAuditEntry): ExportAuditEntry {
  return {
    ...entry,
    userName: maskUserName(entry.userName),
    ipAddress: maskIPAddress(entry.ipAddress),
  };
}

/**
 * Mask user name for privacy
 *
 * Examples:
 * - "Jane Doe" -> "J*** D***"
 * - "john.smith@example.com" -> "j***@example.com"
 */
function maskUserName(userName: string): string {
  if (!userName) return '';

  // Email format
  if (userName.includes('@')) {
    const [local, domain] = userName.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }

  // Name format
  const parts = userName.split(' ');
  return parts.map((part) => `${part.charAt(0)}***`).join(' ');
}

/**
 * Mask IP address for privacy
 *
 * Examples:
 * - "192.168.1.100" -> "192.168.***.***"
 * - "2001:0db8:85a3::8a2e:0370:7334" -> "2001:0db8:****"
 */
function maskIPAddress(ipAddress: string): string {
  if (!ipAddress) return '';

  // IPv4
  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.***.***`;
  }

  // IPv6
  if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':');
    return `${parts[0]}:${parts[1]}:****`;
  }

  return '***';
}

/**
 * Generate unique export ID
 */
function generateExportId(): string {
  return `exp_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
