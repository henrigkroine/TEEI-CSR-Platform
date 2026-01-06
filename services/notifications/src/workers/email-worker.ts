import { Worker, Job, Queue } from 'bullmq';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { notificationsQueue, notificationsDeliveryReceipts } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { compileTemplate, compileSubject } from '../lib/template-compiler.js';
import { sendEmail } from '../providers/sendgrid.js';
import { sendSms } from '../providers/twilio-stub.js';
import { sendPush } from '../providers/fcm-stub.js';
import { checkRateLimit, incrementUsage } from '../lib/rate-limiter.js';

const logger = createServiceLogger('notifications:email-worker');

/**
 * Notification job data
 */
export interface NotificationJob {
  notificationId: string;
  companyId?: string;
  userId?: string;
  type: 'email' | 'sms' | 'push';
  channel: string;
  templateId: string;
  recipient: string;
  subject?: string;
  payload: Record<string, any>;
}

/**
 * BullMQ queue for notifications
 */
let notificationQueue: Queue<NotificationJob> | null = null;
let notificationWorker: Worker<NotificationJob> | null = null;

/**
 * Initialize notification queue and worker
 */
export function initializeEmailWorker(): void {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // Create queue
  notificationQueue = new Queue<NotificationJob>('notifications', {
    connection: {
      host: new URL(redisUrl).hostname,
      port: parseInt(new URL(redisUrl).port || '6379'),
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5 seconds, then 10s, then 20s
      },
      removeOnComplete: {
        age: 7 * 24 * 3600, // Keep completed jobs for 7 days
        count: 10000,
      },
      removeOnFail: {
        age: 30 * 24 * 3600, // Keep failed jobs for 30 days
      },
    },
  });

  // Create worker
  notificationWorker = new Worker<NotificationJob>(
    'notifications',
    async (job: Job<NotificationJob>) => {
      return await processNotification(job);
    },
    {
      connection: {
        host: new URL(redisUrl).hostname,
        port: parseInt(new URL(redisUrl).port || '6379'),
      },
      concurrency: 10, // Process 10 notifications concurrently
      limiter: {
        max: 100, // Max 100 jobs
        duration: 1000, // per second
      },
    }
  );

  // Worker event handlers
  notificationWorker.on('completed', (job) => {
    logger.info(`Notification sent successfully: ${job.id}`, {
      notificationId: job.data.notificationId,
      type: job.data.type,
      recipient: job.data.recipient,
    });
  });

  notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification failed: ${job?.id}`, {
      notificationId: job?.data.notificationId,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  notificationWorker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  logger.info('Email worker initialized with BullMQ');
}

/**
 * Process notification job
 */
async function processNotification(job: Job<NotificationJob>): Promise<void> {
  const { notificationId, companyId, type, channel, templateId, recipient, subject, payload } =
    job.data;

  logger.info(`Processing notification: ${notificationId}`, { type, channel, templateId });

  try {
    // Check rate limit if companyId is present
    if (companyId) {
      const rateLimitCheck = await checkRateLimit(companyId, type);

      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason || 'Rate limit exceeded');
      }
    }

    // Update status to sending
    const db = getDb();
    await db
      .update(notificationsQueue)
      .set({
        status: 'sending',
        updatedAt: new Date(),
      })
      .where(eq(notificationsQueue.id, notificationId));

    // Send based on type
    let result: { success: boolean; messageId?: string; error?: string };

    switch (type) {
      case 'email':
        result = await sendEmailNotification(templateId, recipient, subject || '', payload);
        break;
      case 'sms':
        result = await sendSmsNotification(recipient, payload);
        break;
      case 'push':
        result = await sendPushNotification(recipient, payload);
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    // Update status to sent
    await db
      .update(notificationsQueue)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notificationsQueue.id, notificationId));

    // Increment usage counter
    if (companyId) {
      await incrementUsage(companyId, type);
    }

    // Record delivery receipt (initial send)
    await db.insert(notificationsDeliveryReceipts).values({
      notificationId,
      eventType: 'sent',
      eventData: {
        messageId: result.messageId,
        channel,
      },
    });

    logger.info(`Notification sent: ${notificationId}`, {
      messageId: result.messageId,
      type,
      recipient,
    });
  } catch (error: any) {
    logger.error(`Notification processing failed: ${notificationId}`, error);

    // Update status to failed
    const db = getDb();
    await db
      .update(notificationsQueue)
      .set({
        status: 'failed',
        failureReason: error.message,
        retryCount: job.attemptsMade,
        updatedAt: new Date(),
      })
      .where(eq(notificationsQueue.id, notificationId));

    throw error; // Re-throw to trigger retry
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  templateId: string,
  recipient: string,
  subject: string,
  payload: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Compile template
  const { html, text } = compileTemplate(templateId, payload);
  const compiledSubject = subject ? compileSubject(subject, payload) : 'Notification from TEEI Platform';

  // Send via SendGrid
  return await sendEmail({
    to: recipient,
    subject: compiledSubject,
    html,
    text,
  });
}

/**
 * Send SMS notification
 */
async function sendSmsNotification(
  recipient: string,
  payload: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return await sendSms({
    to: recipient,
    body: payload.body || payload.message || 'You have a new notification',
  });
}

/**
 * Send push notification
 */
async function sendPushNotification(
  token: string,
  payload: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return await sendPush({
    token,
    title: payload.title || 'Notification',
    body: payload.body || payload.message || 'You have a new notification',
    data: payload.data,
  });
}

/**
 * Queue notification for processing
 */
export async function queueNotification(data: NotificationJob): Promise<string> {
  if (!notificationQueue) {
    throw new Error('Notification queue not initialized');
  }

  const job = await notificationQueue.add('send-notification', data, {
    jobId: data.notificationId, // Use notification ID as job ID for idempotency
  });

  logger.info(`Queued notification: ${data.notificationId}`, {
    jobId: job.id,
    type: data.type,
  });

  return job.id || data.notificationId;
}

/**
 * Get queue status
 */
export async function getQueueStatus(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  if (!notificationQueue) {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  const [waiting, active, completed, failed] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

/**
 * Pause queue processing
 */
export async function pauseQueue(): Promise<void> {
  if (notificationQueue) {
    await notificationQueue.pause();
    logger.info('Notification queue paused');
  }
}

/**
 * Resume queue processing
 */
export async function resumeQueue(): Promise<void> {
  if (notificationQueue) {
    await notificationQueue.resume();
    logger.info('Notification queue resumed');
  }
}

/**
 * Clean up old jobs
 */
export async function cleanupOldJobs(): Promise<void> {
  if (!notificationQueue) return;

  // Remove completed jobs older than 7 days
  await notificationQueue.clean(7 * 24 * 3600 * 1000, 100, 'completed');
  // Remove failed jobs older than 30 days
  await notificationQueue.clean(30 * 24 * 3600 * 1000, 100, 'failed');

  logger.info('Cleaned up old jobs');
}

/**
 * Graceful shutdown
 */
export async function shutdownEmailWorker(): Promise<void> {
  logger.info('Shutting down email worker...');

  if (notificationWorker) {
    await notificationWorker.close();
    logger.info('Worker closed');
  }

  if (notificationQueue) {
    await notificationQueue.close();
    logger.info('Queue closed');
  }
}

logger.info('Email worker module loaded');
