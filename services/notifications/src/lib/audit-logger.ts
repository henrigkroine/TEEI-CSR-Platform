import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('notifications:audit');

/**
 * Notification audit log entry
 */
export interface AuditLogEntry {
  notificationId: string;
  tenantId: string;
  channel: 'email' | 'sms' | 'push';
  recipient: string; // Email, phone, or device token (masked)
  templateId?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  metadata?: Record<string, any>;
  errorMessage?: string;
  timestamp: Date;
  userId?: string; // Who triggered the notification
}

/**
 * In-memory audit log store (replace with database in production)
 * In production, write to a dedicated audit_logs table with retention policy
 */
const auditLogs: AuditLogEntry[] = [];

/**
 * Log notification attempt
 */
export function logNotificationAttempt(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const auditEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
  };

  // Mask sensitive data in logs
  const maskedEntry = {
    ...auditEntry,
    recipient: maskRecipient(auditEntry.recipient, auditEntry.channel),
  };

  auditLogs.push(auditEntry);

  logger.info('Notification audit log', maskedEntry);

  // In production, persist to database
  // await db.insert(auditLogs).values(auditEntry);
}

/**
 * Mask recipient for privacy
 */
function maskRecipient(recipient: string, channel: 'email' | 'sms' | 'push'): string {
  if (channel === 'email') {
    // example@domain.com → ex***@domain.com
    const [local, domain] = recipient.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  }

  if (channel === 'sms') {
    // +1234567890 → +123***7890
    return `${recipient.substring(0, 4)}***${recipient.substring(recipient.length - 4)}`;
  }

  if (channel === 'push') {
    // Device token → first 8 chars
    return `${recipient.substring(0, 8)}...`;
  }

  return recipient;
}

/**
 * Get audit logs for a tenant
 */
export function getAuditLogs(
  tenantId: string,
  options?: {
    channel?: 'email' | 'sms' | 'push';
    startDate?: Date;
    endDate?: Date;
    status?: string;
    limit?: number;
  }
): AuditLogEntry[] {
  let filtered = auditLogs.filter((log) => log.tenantId === tenantId);

  if (options?.channel) {
    filtered = filtered.filter((log) => log.channel === options.channel);
  }

  if (options?.startDate) {
    filtered = filtered.filter((log) => log.timestamp >= options.startDate!);
  }

  if (options?.endDate) {
    filtered = filtered.filter((log) => log.timestamp <= options.endDate!);
  }

  if (options?.status) {
    filtered = filtered.filter((log) => log.status === options.status);
  }

  // Sort by most recent first
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get notification statistics for a tenant
 */
export function getNotificationStats(
  tenantId: string,
  startDate: Date,
  endDate: Date
): {
  total: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
} {
  const logs = auditLogs.filter(
    (log) =>
      log.tenantId === tenantId &&
      log.timestamp >= startDate &&
      log.timestamp <= endDate
  );

  const byChannel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  logs.forEach((log) => {
    byChannel[log.channel] = (byChannel[log.channel] || 0) + 1;
    byStatus[log.status] = (byStatus[log.status] || 0) + 1;
  });

  const sent = byStatus['sent'] || 0;
  const delivered = byStatus['delivered'] || 0;
  const opened = byStatus['opened'] || 0;
  const clicked = byStatus['clicked'] || 0;

  return {
    total: logs.length,
    byChannel,
    byStatus,
    deliveryRate: sent > 0 ? delivered / sent : 0,
    openRate: delivered > 0 ? opened / delivered : 0,
    clickRate: opened > 0 ? clicked / opened : 0,
  };
}

/**
 * Export audit logs as CSV for compliance
 */
export function exportAuditLogsCSV(
  tenantId: string,
  startDate: Date,
  endDate: Date
): string {
  const logs = getAuditLogs(tenantId, { startDate, endDate });

  const headers = [
    'Timestamp',
    'Notification ID',
    'Channel',
    'Recipient',
    'Status',
    'Template ID',
    'User ID',
    'Error Message',
  ];

  const rows = logs.map((log) => [
    log.timestamp.toISOString(),
    log.notificationId,
    log.channel,
    maskRecipient(log.recipient, log.channel),
    log.status,
    log.templateId || '',
    log.userId || '',
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
