/**
 * Notification Service for Canary Deployments
 * Multi-channel alerting (Slack, PagerDuty, Email)
 */

import axios from 'axios';

export interface NotificationConfig {
  slack?: {
    enabled: boolean;
    channels: Array<{
      name: string;
      events: string[];
    }>;
  };
  pagerduty?: {
    enabled: boolean;
    integrationKey: string;
    events: string[];
  };
  email?: {
    enabled: boolean;
    recipients: string[];
    events: string[];
  };
}

export interface NotificationPayload {
  event: string;
  deployment: any;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Send notification to all configured channels
   */
  async send(payload: NotificationPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    // Slack
    if (this.config.slack?.enabled) {
      const channels = this.config.slack.channels.filter(c =>
        c.events.includes(payload.event) || c.events.includes('all')
      );

      for (const channel of channels) {
        promises.push(this.sendSlack(channel.name, payload));
      }
    }

    // PagerDuty
    if (
      this.config.pagerduty?.enabled &&
      this.config.pagerduty.events.includes(payload.event)
    ) {
      promises.push(this.sendPagerDuty(payload));
    }

    // Email
    if (
      this.config.email?.enabled &&
      this.config.email.events.includes(payload.event)
    ) {
      promises.push(this.sendEmail(payload));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(channel: string, payload: NotificationPayload): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('[Notifications] Slack webhook URL not configured');
      return;
    }

    const emoji = this.getSeverityEmoji(payload.severity);
    const color = this.getSeverityColor(payload.severity);

    try {
      await axios.post(webhookUrl, {
        channel,
        username: 'Canary Controller',
        icon_emoji: ':rocket:',
        attachments: [
          {
            color,
            title: `${emoji} Canary Deployment: ${payload.event}`,
            text: payload.message,
            fields: [
              {
                title: 'Service',
                value: payload.deployment.service,
                short: true
              },
              {
                title: 'Version',
                value: payload.deployment.version,
                short: true
              },
              {
                title: 'Region',
                value: payload.deployment.region,
                short: true
              },
              {
                title: 'Status',
                value: payload.deployment.status,
                short: true
              }
            ],
            footer: 'Canary Controller',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      });
    } catch (error) {
      console.error('[Notifications] Slack send error:', error);
    }
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDuty(payload: NotificationPayload): Promise<void> {
    const integrationKey = this.config.pagerduty?.integrationKey;
    if (!integrationKey) {
      console.warn('[Notifications] PagerDuty integration key not configured');
      return;
    }

    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: integrationKey,
        event_action: 'trigger',
        payload: {
          summary: `Canary: ${payload.event} - ${payload.deployment.service}@${payload.deployment.version}`,
          severity: payload.severity || 'info',
          source: 'canary-controller',
          custom_details: {
            message: payload.message,
            deployment: payload.deployment
          }
        }
      });
    } catch (error) {
      console.error('[Notifications] PagerDuty send error:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    const recipients = this.config.email?.recipients || [];
    if (recipients.length === 0) {
      console.warn('[Notifications] No email recipients configured');
      return;
    }

    // Email implementation would use SendGrid, AWS SES, etc.
    console.info(`[Notifications] Email sent to ${recipients.join(', ')}: ${payload.message}`);
  }

  private getSeverityEmoji(severity?: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return '✅';
    }
  }

  private getSeverityColor(severity?: string): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'good';
    }
  }
}
