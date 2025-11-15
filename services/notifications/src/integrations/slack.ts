/**
 * Slack Webhook Integration
 *
 * Supports:
 * - SLA breach alerts
 * - Approval workflow notifications
 * - Delivery failures
 * - Synthetic monitor failures
 *
 * Features:
 * - Rich text formatting with Slack Block Kit
 * - Severity-based channel routing
 * - Rate limiting and retry logic
 * - Message deduplication
 */

import axios, { AxiosError } from 'axios';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { slackChannels } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

const logger = createServiceLogger('notifications:slack');

/**
 * Slack message severity levels
 */
export type SlackSeverity = 'critical' | 'warning' | 'info' | 'success';

/**
 * Alert types that can be sent to Slack
 */
export type SlackAlertType =
  | 'sla_breach'
  | 'approval_required'
  | 'approval_approved'
  | 'approval_rejected'
  | 'delivery_failure'
  | 'synthetic_monitor_failure'
  | 'synthetic_monitor_recovery'
  | 'report_generated'
  | 'export_completed'
  | 'export_failed';

/**
 * Slack message payload
 */
export interface SlackMessage {
  companyId: string;
  alertType: SlackAlertType;
  severity: SlackSeverity;
  title: string;
  message: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  actions?: Array<{ text: string; url: string; style?: 'primary' | 'danger' }>;
  timestamp?: Date;
  deduplicationKey?: string;
}

/**
 * Slack webhook configuration per company
 */
interface SlackChannel {
  companyId: string;
  channelType: string;
  webhookUrl: string;
  enabled: boolean;
}

/**
 * Send result
 */
interface SendResult {
  success: boolean;
  messageTs?: string;
  error?: string;
  retryAfter?: number;
}

/**
 * Rate limiter for Slack webhooks (1 message per second per webhook)
 */
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

/**
 * Deduplication cache (keep last 1000 message keys for 5 minutes)
 */
const deduplicationCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_DEDUP_ENTRIES = 1000;

/**
 * Check if we should send this message (deduplication)
 */
function shouldSendMessage(key: string): boolean {
  if (!key) return true;

  const now = Date.now();
  const lastSent = deduplicationCache.get(key);

  if (lastSent && now - lastSent < DEDUP_WINDOW_MS) {
    logger.debug(`Message deduplicated: ${key}`);
    return false;
  }

  // Cleanup old entries if cache is too large
  if (deduplicationCache.size > MAX_DEDUP_ENTRIES) {
    const sortedEntries = Array.from(deduplicationCache.entries())
      .sort((a, b) => a[1] - b[1]);

    for (let i = 0; i < 100; i++) {
      deduplicationCache.delete(sortedEntries[i][0]);
    }
  }

  deduplicationCache.set(key, now);
  return true;
}

/**
 * Get Slack channel configuration for company and alert type
 */
async function getSlackChannel(
  companyId: string,
  alertType: SlackAlertType
): Promise<SlackChannel | null> {
  try {
    const db = getDb();

    // Map alert types to channel types
    const channelTypeMap: Record<SlackAlertType, string> = {
      sla_breach: 'alerts',
      approval_required: 'approvals',
      approval_approved: 'approvals',
      approval_rejected: 'approvals',
      delivery_failure: 'alerts',
      synthetic_monitor_failure: 'monitoring',
      synthetic_monitor_recovery: 'monitoring',
      report_generated: 'reports',
      export_completed: 'reports',
      export_failed: 'alerts',
    };

    const channelType = channelTypeMap[alertType];

    const [channel] = await db
      .select()
      .from(slackChannels)
      .where(eq(slackChannels.companyId, companyId))
      .where(eq(slackChannels.channelType, channelType))
      .where(eq(slackChannels.enabled, true));

    if (!channel) {
      logger.debug(`No Slack channel configured for ${companyId}/${channelType}`);
      return null;
    }

    return {
      companyId: channel.companyId,
      channelType: channel.channelType,
      webhookUrl: channel.webhookUrl,
      enabled: channel.enabled,
    };
  } catch (error: any) {
    logger.error('Failed to get Slack channel config:', error);
    return null;
  }
}

/**
 * Check rate limit for webhook
 */
function checkRateLimit(webhookUrl: string): boolean {
  const now = Date.now();
  const lastSent = rateLimitMap.get(webhookUrl);

  if (lastSent && now - lastSent < RATE_LIMIT_MS) {
    return false; // Rate limited
  }

  return true;
}

/**
 * Update rate limit timestamp
 */
function updateRateLimit(webhookUrl: string): void {
  rateLimitMap.set(webhookUrl, Date.now());
}

/**
 * Format message as Slack Block Kit
 */
function formatSlackBlocks(message: SlackMessage): any {
  const color = getSeverityColor(message.severity);
  const emoji = getSeverityEmoji(message.severity);

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${message.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.message,
      },
    },
  ];

  // Add fields if provided
  if (message.fields && message.fields.length > 0) {
    const fields = message.fields.map(field => ({
      type: 'mrkdwn',
      text: `*${field.title}*\n${field.value}`,
    }));

    blocks.push({
      type: 'section',
      fields,
    });
  }

  // Add timestamp
  const timestamp = message.timestamp || new Date();
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `<!date^${Math.floor(timestamp.getTime() / 1000)}^{date_short_pretty} at {time}|${timestamp.toISOString()}>`,
      },
    ],
  });

  // Add actions if provided
  if (message.actions && message.actions.length > 0) {
    blocks.push({
      type: 'actions',
      elements: message.actions.map(action => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: action.text,
          emoji: true,
        },
        url: action.url,
        style: action.style,
      })),
    });
  }

  return {
    attachments: [
      {
        color,
        blocks,
      },
    ],
  };
}

/**
 * Get color for severity
 */
function getSeverityColor(severity: SlackSeverity): string {
  switch (severity) {
    case 'critical':
      return '#DC2626'; // red-600
    case 'warning':
      return '#F59E0B'; // amber-500
    case 'info':
      return '#3B82F6'; // blue-500
    case 'success':
      return '#10B981'; // green-500
    default:
      return '#6B7280'; // gray-500
  }
}

/**
 * Get emoji for severity
 */
function getSeverityEmoji(severity: SlackSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'success':
      return '✅';
    default:
      return '📢';
  }
}

/**
 * Send message to Slack with retry logic
 */
async function sendToWebhook(
  webhookUrl: string,
  payload: any,
  retryCount = 0
): Promise<SendResult> {
  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      return {
        success: true,
        messageTs: response.data.ts,
      };
    }

    return {
      success: false,
      error: `Unexpected status code: ${response.status}`,
    };
  } catch (error: any) {
    const axiosError = error as AxiosError;

    // Handle rate limiting (429)
    if (axiosError.response?.status === 429) {
      const retryAfter = parseInt(
        axiosError.response.headers['retry-after'] || '60',
        10
      );

      logger.warn(`Slack rate limit hit. Retry after ${retryAfter}s`);

      return {
        success: false,
        error: 'Rate limited by Slack',
        retryAfter: retryAfter * 1000,
      };
    }

    // Retry on network errors or 5xx errors
    if (
      retryCount < MAX_RETRIES &&
      (!axiosError.response || axiosError.response.status >= 500)
    ) {
      const delay = RETRY_DELAYS[retryCount];
      logger.info(`Retrying Slack webhook after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return sendToWebhook(webhookUrl, payload, retryCount + 1);
    }

    logger.error('Slack webhook failed:', {
      error: axiosError.message,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });

    return {
      success: false,
      error: axiosError.message,
    };
  }
}

/**
 * Send message to Slack
 */
export async function sendSlackMessage(message: SlackMessage): Promise<SendResult> {
  try {
    // Check deduplication
    if (message.deduplicationKey && !shouldSendMessage(message.deduplicationKey)) {
      return {
        success: true, // Already sent, consider it success
        error: 'Deduplicated',
      };
    }

    // Get channel config
    const channel = await getSlackChannel(message.companyId, message.alertType);

    if (!channel) {
      return {
        success: false,
        error: 'No Slack channel configured',
      };
    }

    // Check rate limit
    if (!checkRateLimit(channel.webhookUrl)) {
      logger.warn('Slack webhook rate limited (internal)', {
        companyId: message.companyId,
        alertType: message.alertType,
      });

      // Wait and try once more
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }

    // Format message
    const payload = formatSlackBlocks(message);

    // Send to webhook
    const result = await sendToWebhook(channel.webhookUrl, payload);

    // Update rate limit if successful
    if (result.success) {
      updateRateLimit(channel.webhookUrl);

      logger.info('Slack message sent', {
        companyId: message.companyId,
        alertType: message.alertType,
        severity: message.severity,
        messageTs: result.messageTs,
      });
    }

    return result;
  } catch (error: any) {
    logger.error('Failed to send Slack message:', error);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send SLA breach alert
 */
export async function sendSLABreachAlert(params: {
  companyId: string;
  slaName: string;
  currentValue: number;
  threshold: number;
  dashboardUrl: string;
}): Promise<SendResult> {
  return sendSlackMessage({
    companyId: params.companyId,
    alertType: 'sla_breach',
    severity: 'critical',
    title: 'SLA Breach Detected',
    message: `The SLA "${params.slaName}" has breached its threshold.`,
    fields: [
      { title: 'SLA', value: params.slaName, short: true },
      { title: 'Current Value', value: `${params.currentValue.toFixed(2)}%`, short: true },
      { title: 'Threshold', value: `${params.threshold}%`, short: true },
    ],
    actions: [
      { text: 'View Dashboard', url: params.dashboardUrl, style: 'primary' },
    ],
    deduplicationKey: `sla_breach:${params.companyId}:${params.slaName}`,
  });
}

/**
 * Send approval workflow notification
 */
export async function sendApprovalNotification(params: {
  companyId: string;
  reportTitle: string;
  requester: string;
  approvalUrl: string;
  status: 'required' | 'approved' | 'rejected';
}): Promise<SendResult> {
  const alertType = params.status === 'required'
    ? 'approval_required'
    : params.status === 'approved'
    ? 'approval_approved'
    : 'approval_rejected';

  const severity = params.status === 'required'
    ? 'warning'
    : params.status === 'approved'
    ? 'success'
    : 'info';

  const title = params.status === 'required'
    ? 'Approval Required'
    : params.status === 'approved'
    ? 'Report Approved'
    : 'Report Rejected';

  const message = params.status === 'required'
    ? `${params.requester} has submitted a report for approval.`
    : params.status === 'approved'
    ? `The report has been approved.`
    : `The report has been rejected.`;

  return sendSlackMessage({
    companyId: params.companyId,
    alertType,
    severity,
    title,
    message,
    fields: [
      { title: 'Report', value: params.reportTitle, short: false },
      { title: 'Requester', value: params.requester, short: true },
    ],
    actions: params.status === 'required' ? [
      { text: 'Review & Approve', url: params.approvalUrl, style: 'primary' },
    ] : [
      { text: 'View Report', url: params.approvalUrl },
    ],
    deduplicationKey: `approval:${params.companyId}:${params.reportTitle}:${params.status}`,
  });
}

/**
 * Send delivery failure alert
 */
export async function sendDeliveryFailureAlert(params: {
  companyId: string;
  recipient: string;
  subject: string;
  reason: string;
}): Promise<SendResult> {
  return sendSlackMessage({
    companyId: params.companyId,
    alertType: 'delivery_failure',
    severity: 'warning',
    title: 'Email Delivery Failed',
    message: `Failed to deliver email to ${params.recipient}.`,
    fields: [
      { title: 'Recipient', value: params.recipient, short: true },
      { title: 'Subject', value: params.subject, short: true },
      { title: 'Reason', value: params.reason, short: false },
    ],
  });
}

/**
 * Send synthetic monitor alert
 */
export async function sendSyntheticMonitorAlert(params: {
  companyId: string;
  monitorName: string;
  status: 'failure' | 'recovery';
  errorMessage?: string;
  dashboardUrl: string;
}): Promise<SendResult> {
  const alertType = params.status === 'failure'
    ? 'synthetic_monitor_failure'
    : 'synthetic_monitor_recovery';

  const severity = params.status === 'failure' ? 'critical' : 'success';
  const title = params.status === 'failure'
    ? 'Synthetic Monitor Failed'
    : 'Synthetic Monitor Recovered';

  const message = params.status === 'failure'
    ? `Monitor "${params.monitorName}" is failing.`
    : `Monitor "${params.monitorName}" has recovered.`;

  const fields = [
    { title: 'Monitor', value: params.monitorName, short: true },
  ];

  if (params.errorMessage) {
    fields.push({ title: 'Error', value: params.errorMessage, short: false });
  }

  return sendSlackMessage({
    companyId: params.companyId,
    alertType,
    severity,
    title,
    message,
    fields,
    actions: [
      { text: 'View Monitor', url: params.dashboardUrl, style: 'primary' },
    ],
    deduplicationKey: `synthetic:${params.companyId}:${params.monitorName}:${params.status}`,
  });
}
