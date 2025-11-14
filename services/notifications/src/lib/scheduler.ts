import cron from 'node-cron';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { notificationsQueue } from '@teei/shared-schema';
import { eq, lte, and } from 'drizzle-orm';

const logger = createServiceLogger('notifications:scheduler');

/**
 * Scheduled notification jobs
 */
const scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

/**
 * Initialize notification scheduler
 * Sets up cron jobs for recurring notifications
 */
export function initializeScheduler(): void {
  // Process scheduled notifications every minute
  const processScheduledJob = cron.schedule('* * * * *', async () => {
    await processScheduledNotifications();
  });

  scheduledJobs.set('process-scheduled', processScheduledJob);

  // Weekly report: Every Monday at 9am
  const weeklyReportJob = cron.schedule('0 9 * * 1', async () => {
    logger.info('Triggered weekly report generation');
    // This would typically emit an event that triggers report generation
    // which then triggers notification sending
    // await emitEvent('reporting.weekly.trigger', {});
  });

  scheduledJobs.set('weekly-report', weeklyReportJob);

  logger.info('Notification scheduler initialized with cron jobs');
}

/**
 * Process notifications that are due to be sent
 */
export async function processScheduledNotifications(): Promise<void> {
  try {
    const db = getDb();
    const now = new Date();

    // Find notifications scheduled for now or earlier that haven't been sent
    const dueNotifications = await db
      .select()
      .from(notificationsQueue)
      .where(
        and(
          eq(notificationsQueue.status, 'queued'),
          lte(notificationsQueue.scheduledAt, now)
        )
      )
      .limit(100); // Process in batches

    if (dueNotifications.length === 0) {
      return;
    }

    logger.info(`Processing ${dueNotifications.length} scheduled notifications`);

    // Update status to 'sending' to prevent duplicate processing
    for (const notification of dueNotifications) {
      await db
        .update(notificationsQueue)
        .set({
          status: 'sending',
          updatedAt: now,
        })
        .where(eq(notificationsQueue.id, notification.id));
    }

    // Queue them for processing by the worker
    // The actual sending is handled by the email worker
    logger.info(`Queued ${dueNotifications.length} notifications for sending`);
  } catch (error: any) {
    logger.error('Failed to process scheduled notifications:', error);
  }
}

/**
 * Schedule a notification for future delivery
 */
export async function scheduleNotification(
  notification: {
    companyId?: string;
    userId?: string;
    type: 'email' | 'sms' | 'push';
    channel: string;
    templateId: string;
    recipient: string;
    subject?: string;
    payload: Record<string, any>;
    scheduledAt: Date;
  }
): Promise<string> {
  try {
    const db = getDb();

    const [created] = await db
      .insert(notificationsQueue)
      .values({
        ...notification,
        status: 'queued',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info('Notification scheduled', {
      id: created.id,
      type: notification.type,
      scheduledAt: notification.scheduledAt,
    });

    return created.id;
  } catch (error: any) {
    logger.error('Failed to schedule notification:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<boolean> {
  try {
    const db = getDb();

    // Only cancel if still queued
    const result = await db
      .update(notificationsQueue)
      .set({
        status: 'failed',
        failureReason: 'Cancelled by user',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationsQueue.id, notificationId),
          eq(notificationsQueue.status, 'queued')
        )
      )
      .returning();

    if (result.length > 0) {
      logger.info(`Cancelled scheduled notification: ${notificationId}`);
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error('Failed to cancel notification:', error);
    return false;
  }
}

/**
 * Add a custom cron job
 */
export function addCronJob(
  name: string,
  cronExpression: string,
  handler: () => Promise<void>
): void {
  if (scheduledJobs.has(name)) {
    logger.warn(`Cron job ${name} already exists, stopping old job`);
    scheduledJobs.get(name)!.stop();
  }

  const job = cron.schedule(cronExpression, async () => {
    logger.info(`Running cron job: ${name}`);
    try {
      await handler();
    } catch (error: any) {
      logger.error(`Cron job ${name} failed:`, error);
    }
  });

  scheduledJobs.set(name, job);
  logger.info(`Added cron job: ${name} with expression: ${cronExpression}`);
}

/**
 * Remove a cron job
 */
export function removeCronJob(name: string): boolean {
  const job = scheduledJobs.get(name);
  if (job) {
    job.stop();
    scheduledJobs.delete(name);
    logger.info(`Removed cron job: ${name}`);
    return true;
  }
  return false;
}

/**
 * Get all active cron jobs
 */
export function getActiveCronJobs(): string[] {
  return Array.from(scheduledJobs.keys());
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopAllCronJobs(): void {
  scheduledJobs.forEach((job, name) => {
    job.stop();
    logger.info(`Stopped cron job: ${name}`);
  });
  scheduledJobs.clear();
}

logger.info('Scheduler module loaded');
