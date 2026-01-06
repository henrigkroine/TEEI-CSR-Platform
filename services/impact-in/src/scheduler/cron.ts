import cron from 'node-cron';
import parser from 'cron-parser';
import { db } from '@teei/shared-schema';
import { scheduledDeliveries, impactDeliveries } from '@teei/shared-schema';
import { eq, and, lte } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { deliverToBenevity } from '../connectors/benevity/client.js';
import { deliverToGoodera } from '../connectors/goodera/client.js';
import { deliverToWorkday } from '../connectors/workday/client.js';

const logger = createServiceLogger('impact-in-scheduler');

/**
 * Execute a scheduled delivery
 */
export async function executeScheduledDelivery(scheduleId: string) {
  try {
    // Get schedule details
    const [schedule] = await db
      .select()
      .from(scheduledDeliveries)
      .where(eq(scheduledDeliveries.id, scheduleId));

    if (!schedule) {
      logger.error(`Schedule not found: ${scheduleId}`);
      return;
    }

    if (!schedule.active) {
      logger.info(`Schedule ${scheduleId} is not active, skipping`);
      return;
    }

    logger.info(`Executing scheduled delivery: ${scheduleId} for company ${schedule.companyId}, platform ${schedule.platform}`);

    // Fetch company metrics and format payload
    let deliveryResult: { success: boolean; error?: string };

    try {
      switch (schedule.platform) {
        case 'benevity':
          deliveryResult = await deliverToBenevity(schedule.companyId);
          break;
        case 'goodera':
          deliveryResult = await deliverToGoodera(schedule.companyId);
          break;
        case 'workday':
          deliveryResult = await deliverToWorkday(schedule.companyId);
          break;
        default:
          throw new Error(`Unknown platform: ${schedule.platform}`);
      }

      // Update schedule with success
      const nextRun = calculateNextRun(schedule.schedule);
      await db
        .update(scheduledDeliveries)
        .set({
          lastRun: new Date(),
          lastStatus: deliveryResult.success ? 'success' : 'failed',
          lastError: deliveryResult.error || null,
          nextRun,
          updatedAt: new Date(),
        })
        .where(eq(scheduledDeliveries.id, scheduleId));

      logger.info(`Schedule ${scheduleId} completed: ${deliveryResult.success ? 'success' : 'failed'}`);
    } catch (error: any) {
      // Update schedule with failure
      const nextRun = calculateNextRun(schedule.schedule);
      await db
        .update(scheduledDeliveries)
        .set({
          lastRun: new Date(),
          lastStatus: 'failed',
          lastError: error.message,
          nextRun,
          updatedAt: new Date(),
        })
        .where(eq(scheduledDeliveries.id, scheduleId));

      logger.error(`Schedule ${scheduleId} failed:`, error);

      // Retry logic with exponential backoff
      await retryFailedDelivery(scheduleId, schedule);
    }
  } catch (error) {
    logger.error(`Error executing scheduled delivery ${scheduleId}:`, error);
  }
}

/**
 * Retry failed delivery with exponential backoff
 */
async function retryFailedDelivery(scheduleId: string, schedule: any) {
  const maxRetries = 3;
  const baseDelay = 5 * 60 * 1000; // 5 minutes

  // Get recent delivery attempts for this schedule
  const recentDeliveries = await db
    .select()
    .from(impactDeliveries)
    .where(
      and(
        eq(impactDeliveries.scheduleId, scheduleId),
        eq(impactDeliveries.status, 'failed')
      )
    )
    .orderBy(impactDeliveries.createdAt);

  const retryCount = recentDeliveries.length;

  if (retryCount < maxRetries) {
    const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
    logger.info(`Scheduling retry ${retryCount + 1}/${maxRetries} for schedule ${scheduleId} in ${delay}ms`);

    setTimeout(async () => {
      await executeScheduledDelivery(scheduleId);
    }, delay);
  } else {
    logger.error(`Max retries (${maxRetries}) reached for schedule ${scheduleId}`);
  }
}

/**
 * Calculate next run time based on cron expression
 */
export function calculateNextRun(cronExpression: string): Date {
  try {
    const interval = parser.parseExpression(cronExpression);
    return interval.next().toDate();
  } catch (error) {
    logger.error(`Invalid cron expression: ${cronExpression}`, error);
    // Default to 1 day from now if parsing fails
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}

/**
 * Validate cron expression
 */
export function validateCronExpression(cronExpression: string): boolean {
  try {
    parser.parseExpression(cronExpression);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Start the scheduler daemon
 * Checks for due deliveries every minute
 */
export function startScheduler() {
  logger.info('Starting Impact-In scheduler...');

  // Check for due deliveries every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find all active schedules that are due
      const dueSchedules = await db
        .select()
        .from(scheduledDeliveries)
        .where(
          and(
            eq(scheduledDeliveries.active, true),
            lte(scheduledDeliveries.nextRun, now)
          )
        );

      if (dueSchedules.length > 0) {
        logger.info(`Found ${dueSchedules.length} due deliveries`);

        // Execute each due delivery
        for (const schedule of dueSchedules) {
          await executeScheduledDelivery(schedule.id);
        }
      }
    } catch (error) {
      logger.error('Error checking for due deliveries:', error);
    }
  });

  logger.info('Scheduler started successfully');
}
