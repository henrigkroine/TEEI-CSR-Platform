/**
 * Microsoft Teams Webhook Integration
 *
 * Supports:
 * - SLA breach alerts
 * - Approval workflow notifications
 * - Delivery failures
 * - Synthetic monitor failures
 *
 * Features:
 * - Adaptive Card formatting for rich UI
 * - Severity-based channel routing
 * - Rate limiting and retry logic
 * - Message deduplication
 */

import axios, { AxiosError } from 'axios';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { teamsChannels } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

const logger = createServiceLogger('notifications:teams');

/**
 * Teams message severity levels
 */
export type TeamsSeverity = 'critical' | 'warning' | 'info' | 'success';

/**
 * Alert types that can be sent to Teams
 */
export type TeamsAlertType =
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
 * Teams message payload
 */
export interface TeamsMessage {
  companyId: string;
  alertType: TeamsAlertType;
  severity: TeamsSeverity;
  title: string;
  message: string;
  facts?: Array<{ name: string; value: string }>;
  actions?: Array<{ title: string; url: string; isPrimary?: boolean }>;
  timestamp?: Date;
  deduplicationKey?: string;
}

/**
 * Teams webhook configuration per company
 */
interface TeamsChannel {
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
  messageId?: string;
  error?: string;
  retryAfter?: number;
}

/**
 * Rate limiter for Teams webhooks
 */
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];

/**
 * Deduplication cache
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
 * Get Teams channel configuration for company and alert type
 */
async function getTeamsChannel(
  companyId: string,
  alertType: TeamsAlertType
): Promise<TeamsChannel | null> {
  try {
    const db = getDb();

    const channelTypeMap: Record<TeamsAlertType, string> = {
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
      .from(teamsChannels)
      .where(eq(teamsChannels.companyId, companyId))
      .where(eq(teamsChannels.channelType, channelType))
      .where(eq(teamsChannels.enabled, true));

    if (!channel) {
      logger.debug(`No Teams channel configured for ${companyId}/${channelType}`);
      return null;
    }

    return {
      companyId: channel.companyId,
      channelType: channel.channelType,
      webhookUrl: channel.webhookUrl,
      enabled: channel.enabled,
    };
  } catch (error: any) {
    logger.error('Failed to get Teams channel config:', error);
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
    return false;
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
 * Format message as Microsoft Teams Adaptive Card
 */
function formatTeamsAdaptiveCard(message: TeamsMessage): any {
  const themeColor = getSeverityColor(message.severity);
  const icon = getSeverityIcon(message.severity);

  const card: any = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: '1.4',
          body: [
            // Header with icon and title
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'TextBlock',
                      text: icon,
                      size: 'large',
                      spacing: 'none',
                    },
                  ],
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: message.title,
                      weight: 'bolder',
                      size: 'large',
                      wrap: true,
                      spacing: 'none',
                    },
                  ],
                },
              ],
            },
            // Message body
            {
              type: 'TextBlock',
              text: message.message,
              wrap: true,
              spacing: 'medium',
            },
          ],
        },
      },
    ],
  };

  const cardContent = card.attachments[0].content;

  // Add facts if provided
  if (message.facts && message.facts.length > 0) {
    cardContent.body.push({
      type: 'FactSet',
      facts: message.facts.map(fact => ({
        title: fact.name,
        value: fact.value,
      })),
      spacing: 'medium',
    });
  }

  // Add timestamp
  const timestamp = message.timestamp || new Date();
  cardContent.body.push({
    type: 'TextBlock',
    text: `${timestamp.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })}`,
    size: 'small',
    color: 'default',
    isSubtle: true,
    spacing: 'medium',
  });

  // Add actions if provided
  if (message.actions && message.actions.length > 0) {
    cardContent.actions = message.actions.map(action => ({
      type: 'Action.OpenUrl',
      title: action.title,
      url: action.url,
      style: action.isPrimary ? 'positive' : 'default',
    }));
  }

  // Set theme color
  card.attachments[0].content.msteams = {
    width: 'Full',
  };

  // Add accent color bar (via container style)
  cardContent.body.unshift({
    type: 'Container',
    style: getSeverityStyle(message.severity),
    items: [
      {
        type: 'TextBlock',
        text: ' ',
        size: 'small',
      },
    ],
    spacing: 'none',
  });

  return card;
}

/**
 * Get color for severity
 */
function getSeverityColor(severity: TeamsSeverity): string {
  switch (severity) {
    case 'critical':
      return 'DC2626'; // red-600
    case 'warning':
      return 'F59E0B'; // amber-500
    case 'info':
      return '3B82F6'; // blue-500
    case 'success':
      return '10B981'; // green-500
    default:
      return '6B7280'; // gray-500
  }
}

/**
 * Get icon for severity
 */
function getSeverityIcon(severity: TeamsSeverity): string {
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
 * Get container style for severity
 */
function getSeverityStyle(severity: TeamsSeverity): string {
  switch (severity) {
    case 'critical':
      return 'attention';
    case 'warning':
      return 'warning';
    case 'success':
      return 'good';
    case 'info':
    default:
      return 'default';
  }
}

/**
 * Send message to Teams webhook with retry logic
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
        messageId: response.data.activityId,
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

      logger.warn(`Teams rate limit hit. Retry after ${retryAfter}s`);

      return {
        success: false,
        error: 'Rate limited by Teams',
        retryAfter: retryAfter * 1000,
      };
    }

    // Retry on network errors or 5xx errors
    if (
      retryCount < MAX_RETRIES &&
      (!axiosError.response || axiosError.response.status >= 500)
    ) {
      const delay = RETRY_DELAYS[retryCount];
      logger.info(`Retrying Teams webhook after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return sendToWebhook(webhookUrl, payload, retryCount + 1);
    }

    logger.error('Teams webhook failed:', {
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
 * Send message to Microsoft Teams
 */
export async function sendTeamsMessage(message: TeamsMessage): Promise<SendResult> {
  try {
    // Check deduplication
    if (message.deduplicationKey && !shouldSendMessage(message.deduplicationKey)) {
      return {
        success: true,
        error: 'Deduplicated',
      };
    }

    // Get channel config
    const channel = await getTeamsChannel(message.companyId, message.alertType);

    if (!channel) {
      return {
        success: false,
        error: 'No Teams channel configured',
      };
    }

    // Check rate limit
    if (!checkRateLimit(channel.webhookUrl)) {
      logger.warn('Teams webhook rate limited (internal)', {
        companyId: message.companyId,
        alertType: message.alertType,
      });

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }

    // Format message
    const payload = formatTeamsAdaptiveCard(message);

    // Send to webhook
    const result = await sendToWebhook(channel.webhookUrl, payload);

    if (result.success) {
      updateRateLimit(channel.webhookUrl);

      logger.info('Teams message sent', {
        companyId: message.companyId,
        alertType: message.alertType,
        severity: message.severity,
        messageId: result.messageId,
      });
    }

    return result;
  } catch (error: any) {
    logger.error('Failed to send Teams message:', error);

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
  return sendTeamsMessage({
    companyId: params.companyId,
    alertType: 'sla_breach',
    severity: 'critical',
    title: 'SLA Breach Detected',
    message: `The SLA "${params.slaName}" has breached its threshold.`,
    facts: [
      { name: 'SLA', value: params.slaName },
      { name: 'Current Value', value: `${params.currentValue.toFixed(2)}%` },
      { name: 'Threshold', value: `${params.threshold}%` },
    ],
    actions: [
      { title: 'View Dashboard', url: params.dashboardUrl, isPrimary: true },
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

  return sendTeamsMessage({
    companyId: params.companyId,
    alertType,
    severity,
    title,
    message,
    facts: [
      { name: 'Report', value: params.reportTitle },
      { name: 'Requester', value: params.requester },
    ],
    actions: params.status === 'required' ? [
      { title: 'Review & Approve', url: params.approvalUrl, isPrimary: true },
    ] : [
      { title: 'View Report', url: params.approvalUrl },
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
  return sendTeamsMessage({
    companyId: params.companyId,
    alertType: 'delivery_failure',
    severity: 'warning',
    title: 'Email Delivery Failed',
    message: `Failed to deliver email to ${params.recipient}.`,
    facts: [
      { name: 'Recipient', value: params.recipient },
      { name: 'Subject', value: params.subject },
      { name: 'Reason', value: params.reason },
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

  const facts = [
    { name: 'Monitor', value: params.monitorName },
  ];

  if (params.errorMessage) {
    facts.push({ name: 'Error', value: params.errorMessage });
  }

  return sendTeamsMessage({
    companyId: params.companyId,
    alertType,
    severity,
    title,
    message,
    facts,
    actions: [
      { title: 'View Monitor', url: params.dashboardUrl, isPrimary: true },
    ],
    deduplicationKey: `synthetic:${params.companyId}:${params.monitorName}:${params.status}`,
  });
}
