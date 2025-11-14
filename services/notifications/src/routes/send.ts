import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { notificationsQueue, notificationsDeliveryReceipts } from '@teei/shared-schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { queueNotification } from '../workers/email-worker.js';
import { scheduleNotification, cancelScheduledNotification } from '../lib/scheduler.js';
import { getQuotaStatus } from '../lib/rate-limiter.js';
import { processSendGridWebhook } from '../providers/sendgrid.js';
import { processTwilioWebhook } from '../providers/twilio-stub.js';

const logger = createServiceLogger('notifications:routes');

/**
 * Notification send request schema
 */
const sendNotificationSchema = z.object({
  companyId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  type: z.enum(['email', 'sms', 'push']),
  templateId: z.string(),
  recipient: z.string(),
  subject: z.string().optional(),
  payload: z.record(z.any()),
});

/**
 * Schedule notification request schema
 */
const scheduleNotificationSchema = sendNotificationSchema.extend({
  scheduledAt: z.string().datetime(),
});

/**
 * Register notification routes
 */
export async function notificationRoutes(
  app: FastifyInstance,
  options: any
): Promise<void> {
  /**
   * POST /v1/notifications/send
   * Send notification immediately
   */
  app.post('/notifications/send', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = sendNotificationSchema.parse(request.body);

      const db = getDb();

      // Determine channel based on type
      const channel = body.type === 'email'
        ? 'sendgrid'
        : body.type === 'sms'
        ? 'twilio'
        : 'fcm';

      // Create notification record
      const [notification] = await db
        .insert(notificationsQueue)
        .values({
          companyId: body.companyId,
          userId: body.userId,
          type: body.type,
          channel,
          templateId: body.templateId,
          recipient: body.recipient,
          subject: body.subject,
          payload: body.payload,
          status: 'queued',
          retryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Queue for immediate processing
      await queueNotification({
        notificationId: notification.id,
        companyId: body.companyId,
        userId: body.userId,
        type: body.type,
        channel,
        templateId: body.templateId,
        recipient: body.recipient,
        subject: body.subject,
        payload: body.payload,
      });

      return reply.code(202).send({
        success: true,
        notificationId: notification.id,
        status: 'queued',
        message: 'Notification queued for sending',
      });
    } catch (error: any) {
      logger.error('Send notification failed:', error);
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /v1/notifications/schedule
   * Schedule notification for future delivery
   */
  app.post('/notifications/schedule', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = scheduleNotificationSchema.parse(request.body);

      const scheduledAt = new Date(body.scheduledAt);
      const now = new Date();

      if (scheduledAt <= now) {
        return reply.code(400).send({
          success: false,
          error: 'Scheduled time must be in the future',
        });
      }

      const channel = body.type === 'email'
        ? 'sendgrid'
        : body.type === 'sms'
        ? 'twilio'
        : 'fcm';

      const notificationId = await scheduleNotification({
        companyId: body.companyId,
        userId: body.userId,
        type: body.type,
        channel,
        templateId: body.templateId,
        recipient: body.recipient,
        subject: body.subject,
        payload: body.payload,
        scheduledAt,
      });

      return reply.code(201).send({
        success: true,
        notificationId,
        scheduledAt: scheduledAt.toISOString(),
        message: 'Notification scheduled successfully',
      });
    } catch (error: any) {
      logger.error('Schedule notification failed:', error);
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /v1/notifications/:id/cancel
   * Cancel scheduled notification
   */
  app.delete('/notifications/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const cancelled = await cancelScheduledNotification(id);

      if (!cancelled) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found or already sent',
        });
      }

      return reply.send({
        success: true,
        message: 'Notification cancelled successfully',
      });
    } catch (error: any) {
      logger.error('Cancel notification failed:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /v1/notifications/history
   * Query notification history
   */
  app.get('/notifications/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as {
        companyId?: string;
        userId?: string;
        type?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };

      const db = getDb();
      const limit = parseInt(query.limit || '50');
      const offset = parseInt(query.offset || '0');

      // Build query conditions
      const conditions = [];
      if (query.companyId) {
        conditions.push(eq(notificationsQueue.companyId, query.companyId));
      }
      if (query.userId) {
        conditions.push(eq(notificationsQueue.userId, query.userId));
      }
      if (query.type) {
        conditions.push(eq(notificationsQueue.type, query.type as any));
      }
      if (query.status) {
        conditions.push(eq(notificationsQueue.status, query.status as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const notifications = await db
        .select()
        .from(notificationsQueue)
        .where(whereClause)
        .orderBy(desc(notificationsQueue.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({
        success: true,
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          templateId: n.templateId,
          recipient: n.recipient,
          status: n.status,
          scheduledAt: n.scheduledAt,
          sentAt: n.sentAt,
          failureReason: n.failureReason,
          retryCount: n.retryCount,
          createdAt: n.createdAt,
        })),
        pagination: {
          limit,
          offset,
          total: notifications.length,
        },
      });
    } catch (error: any) {
      logger.error('Get history failed:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /v1/notifications/:id
   * Get notification details with delivery receipts
   */
  app.get('/notifications/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();

      const [notification] = await db
        .select()
        .from(notificationsQueue)
        .where(eq(notificationsQueue.id, id));

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Notification not found',
        });
      }

      // Get delivery receipts
      const receipts = await db
        .select()
        .from(notificationsDeliveryReceipts)
        .where(eq(notificationsDeliveryReceipts.notificationId, id))
        .orderBy(desc(notificationsDeliveryReceipts.receivedAt));

      return reply.send({
        success: true,
        notification: {
          id: notification.id,
          type: notification.type,
          channel: notification.channel,
          templateId: notification.templateId,
          recipient: notification.recipient,
          subject: notification.subject,
          status: notification.status,
          scheduledAt: notification.scheduledAt,
          sentAt: notification.sentAt,
          failureReason: notification.failureReason,
          retryCount: notification.retryCount,
          createdAt: notification.createdAt,
        },
        deliveryReceipts: receipts.map(r => ({
          id: r.id,
          eventType: r.eventType,
          eventData: r.eventData,
          receivedAt: r.receivedAt,
        })),
      });
    } catch (error: any) {
      logger.error('Get notification failed:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /v1/notifications/quota
   * Check remaining quota
   */
  app.get('/notifications/quota', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { companyId: string };

      if (!query.companyId) {
        return reply.code(400).send({
          success: false,
          error: 'companyId query parameter required',
        });
      }

      const quotaStatus = await getQuotaStatus(query.companyId);

      return reply.send({
        success: true,
        companyId: query.companyId,
        quotas: {
          email: {
            limit: quotaStatus.email.limit,
            used: quotaStatus.email.limit - quotaStatus.email.remaining,
            remaining: quotaStatus.email.remaining,
            resetAt: quotaStatus.email.resetAt,
          },
          sms: {
            limit: quotaStatus.sms.limit,
            used: quotaStatus.sms.limit - quotaStatus.sms.remaining,
            remaining: quotaStatus.sms.remaining,
            resetAt: quotaStatus.sms.resetAt,
          },
          push: {
            limit: quotaStatus.push.limit,
            used: quotaStatus.push.limit - quotaStatus.push.remaining,
            remaining: quotaStatus.push.remaining,
            resetAt: quotaStatus.push.resetAt,
          },
        },
      });
    } catch (error: any) {
      logger.error('Get quota failed:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /v1/notifications/webhooks/sendgrid
   * Webhook receiver for SendGrid delivery events
   */
  app.post('/notifications/webhooks/sendgrid', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const events = request.body as any[];

      if (!Array.isArray(events)) {
        return reply.code(400).send({ error: 'Invalid webhook payload' });
      }

      const db = getDb();

      for (const event of events) {
        try {
          const processed = processSendGridWebhook(event);

          // Save delivery receipt
          await db.insert(notificationsDeliveryReceipts).values({
            notificationId: processed.notificationId || event.sg_message_id,
            eventType: processed.eventType,
            eventData: processed.eventData,
            receivedAt: processed.timestamp,
          });

          logger.info('Processed SendGrid webhook event', {
            eventType: processed.eventType,
            notificationId: processed.notificationId,
          });
        } catch (err: any) {
          logger.error('Failed to process SendGrid webhook event:', err);
          // Continue processing other events
        }
      }

      return reply.code(200).send({ received: events.length });
    } catch (error: any) {
      logger.error('SendGrid webhook failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  /**
   * POST /v1/notifications/webhooks/twilio
   * Webhook receiver for Twilio delivery events
   */
  app.post('/notifications/webhooks/twilio', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const event = request.body as any;

      const processed = processTwilioWebhook(event);
      const db = getDb();

      await db.insert(notificationsDeliveryReceipts).values({
        notificationId: processed.notificationId || event.MessageSid,
        eventType: processed.eventType,
        eventData: processed.eventData,
        receivedAt: processed.timestamp,
      });

      logger.info('Processed Twilio webhook event', {
        eventType: processed.eventType,
        notificationId: processed.notificationId,
      });

      return reply.code(200).send({ received: true });
    } catch (error: any) {
      logger.error('Twilio webhook failed:', error);
      return reply.code(500).send({ error: error.message });
    }
  });

  logger.info('Notification routes registered');
}
