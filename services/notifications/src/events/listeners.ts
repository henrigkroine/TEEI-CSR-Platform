import { createServiceLogger } from '@teei/shared-utils';
import { EventBus } from '@teei/events';
import { queueNotification } from '../workers/email-worker.js';
import { getDb } from '@teei/shared-schema';
import { notificationsQueue } from '@teei/shared-schema';

const logger = createServiceLogger('notifications:events');

/**
 * Initialize event listeners for notifications
 */
export function initializeEventListeners(eventBus: EventBus): void {
  /**
   * Listen to reporting.generated event
   * Send weekly report email when report is generated
   */
  eventBus.subscribe('reporting.generated', async (event) => {
    try {
      logger.info('Received reporting.generated event', { eventId: event.id });

      const { companyId, reportId, reportUrl, reportPeriod, metrics } = event.data;

      // Create notification record
      const db = getDb();
      const [notification] = await db
        .insert(notificationsQueue)
        .values({
          companyId,
          type: 'email',
          channel: 'sendgrid',
          templateId: 'weekly-report',
          recipient: event.data.recipientEmail || 'admin@example.com',
          subject: `Weekly Impact Report - ${reportPeriod.start} to ${reportPeriod.end}`,
          payload: {
            companyName: event.data.companyName || 'Your Company',
            reportPeriod,
            metrics,
            reportUrl,
          },
          status: 'queued',
          retryCount: 0,
        })
        .returning();

      // Queue for sending
      await queueNotification({
        notificationId: notification.id,
        companyId,
        type: 'email',
        channel: 'sendgrid',
        templateId: 'weekly-report',
        recipient: notification.recipient,
        subject: notification.subject || undefined,
        payload: notification.payload as Record<string, any>,
      });

      logger.info('Queued weekly report notification', { notificationId: notification.id });
    } catch (error: any) {
      logger.error('Failed to process reporting.generated event:', error);
    }
  });

  /**
   * Listen to slo.breached event
   * Send SLO breach alert immediately
   */
  eventBus.subscribe('slo.breached', async (event) => {
    try {
      logger.info('Received slo.breached event', { eventId: event.id });

      const { serviceName, metric, threshold, current, timestamp, dashboardUrl } = event.data;

      // Create notification record
      const db = getDb();
      const [notification] = await db
        .insert(notificationsQueue)
        .values({
          type: 'email',
          channel: 'sendgrid',
          templateId: 'alert-slo-breach',
          recipient: event.data.alertEmail || 'oncall@example.com',
          subject: `SLO BREACH ALERT: ${serviceName} - ${metric}`,
          payload: {
            serviceName,
            metric,
            threshold,
            current,
            timestamp,
            dashboardUrl,
          },
          status: 'queued',
          retryCount: 0,
        })
        .returning();

      // Queue for immediate sending (high priority)
      await queueNotification({
        notificationId: notification.id,
        type: 'email',
        channel: 'sendgrid',
        templateId: 'alert-slo-breach',
        recipient: notification.recipient,
        subject: notification.subject || undefined,
        payload: notification.payload as Record<string, any>,
      });

      logger.info('Queued SLO breach alert notification', { notificationId: notification.id });
    } catch (error: any) {
      logger.error('Failed to process slo.breached event:', error);
    }
  });

  /**
   * Listen to privacy.export.completed event
   * Send GDPR data export notification
   */
  eventBus.subscribe('privacy.export.completed', async (event) => {
    try {
      logger.info('Received privacy.export.completed event', { eventId: event.id });

      const { userId, userName, userEmail, downloadUrl, requestDate, exportDate, fileFormat, fileSize, expiryDays } = event.data;

      // Create notification record
      const db = getDb();
      const [notification] = await db
        .insert(notificationsQueue)
        .values({
          userId,
          type: 'email',
          channel: 'sendgrid',
          templateId: 'data-export-ready',
          recipient: userEmail,
          subject: 'Your Personal Data Export is Ready',
          payload: {
            userName,
            requestDate,
            exportDate,
            fileFormat,
            fileSize,
            downloadUrl,
            expiryDays: expiryDays || 7,
            privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || 'https://teei-platform.com/privacy',
          },
          status: 'queued',
          retryCount: 0,
        })
        .returning();

      // Queue for sending
      await queueNotification({
        notificationId: notification.id,
        userId,
        type: 'email',
        channel: 'sendgrid',
        templateId: 'data-export-ready',
        recipient: notification.recipient,
        subject: notification.subject || undefined,
        payload: notification.payload as Record<string, any>,
      });

      logger.info('Queued GDPR export notification', { notificationId: notification.id });
    } catch (error: any) {
      logger.error('Failed to process privacy.export.completed event:', error);
    }
  });

  /**
   * Listen to user.registered event
   * Send welcome email to new users
   */
  eventBus.subscribe('user.registered', async (event) => {
    try {
      logger.info('Received user.registered event', { eventId: event.id });

      const { userId, userName, userEmail, companyId, dashboardUrl, helpCenterUrl } = event.data;

      // Create notification record
      const db = getDb();
      const [notification] = await db
        .insert(notificationsQueue)
        .values({
          companyId,
          userId,
          type: 'email',
          channel: 'sendgrid',
          templateId: 'welcome',
          recipient: userEmail,
          subject: 'Welcome to TEEI Platform',
          payload: {
            userName,
            dashboardUrl: dashboardUrl || 'https://app.teei-platform.com',
            helpCenterUrl: helpCenterUrl || 'https://help.teei-platform.com',
          },
          status: 'queued',
          retryCount: 0,
        })
        .returning();

      // Queue for sending
      await queueNotification({
        notificationId: notification.id,
        companyId,
        userId,
        type: 'email',
        channel: 'sendgrid',
        templateId: 'welcome',
        recipient: notification.recipient,
        subject: notification.subject || undefined,
        payload: notification.payload as Record<string, any>,
      });

      logger.info('Queued welcome notification', { notificationId: notification.id });
    } catch (error: any) {
      logger.error('Failed to process user.registered event:', error);
    }
  });

  logger.info('Event listeners initialized for notifications');
}
