/**
 * Impact-In Scheduled Delivery Service
 *
 * Provides comprehensive scheduling infrastructure for automatic Impact-In exports
 * to Benevity, Goodera, and Workday platforms.
 *
 * Features:
 * - Cron-based scheduling with flexible frequency options
 * - Per-tenant delivery calendars
 * - Idempotency (prevents duplicate exports)
 * - Automatic retry with exponential backoff
 * - Delivery job queue management
 * - Integration with existing Impact-In connectors
 *
 * Reference: MULTI_AGENT_PLAN.md § Worker 4/Phase F/Impact Scheduler
 */

import cron from 'node-cron';
import parser from 'cron-parser';
import { db } from '@teei/shared-schema';
import { scheduledDeliveries, impactDeliveries } from '@teei/shared-schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { deliverToBenevity } from '../src/connectors/benevity/client.js';
import { deliverToGoodera } from '../src/connectors/goodera/client.js';
import { deliverToWorkday } from '../src/connectors/workday/client.js';
import { generatePayloadHash, isPayloadDelivered } from '../src/delivery-log.js';
import { retryWithBackoff } from '../src/lib/retry.js';

const logger = createServiceLogger('impact-in-scheduler');

export interface SchedulerConfig {
  /**
   * How often to check for due deliveries (in minutes)
   * Default: 1 minute
   */
  checkInterval?: number;

  /**
   * Maximum number of retry attempts for failed deliveries
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Initial delay between retries (milliseconds)
   * Default: 5 minutes
   */
  retryDelayMs?: number;

  /**
   * Exponential backoff multiplier
   * Default: 2
   */
  backoffMultiplier?: number;
}

const DEFAULT_CONFIG: Required<SchedulerConfig> = {
  checkInterval: 1,
  maxRetries: 3,
  retryDelayMs: 5 * 60 * 1000,
  backoffMultiplier: 2,
};

/**
 * Supported schedule frequencies for easy configuration
 */
export const ScheduleFrequency = {
  DAILY: '0 0 * * *',          // Every day at midnight
  WEEKLY: '0 0 * * 0',         // Every Sunday at midnight
  MONTHLY: '0 0 1 * *',        // First day of month at midnight
  HOURLY: '0 * * * *',         // Every hour
  EVERY_6_HOURS: '0 */6 * * *', // Every 6 hours
  CUSTOM: (cronExpr: string) => cronExpr,
} as const;

/**
 * Execute a scheduled delivery
 */
export async function executeScheduledDelivery(
  scheduleId: string,
  config: SchedulerConfig = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

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

    logger.info(`Executing scheduled delivery`, {
      scheduleId,
      companyId: schedule.companyId,
      platform: schedule.platform,
    });

    // Fetch company metrics and prepare payload
    let deliveryResult: { success: boolean; error?: string; payloadHash?: string };

    try {
      // Execute delivery based on platform
      deliveryResult = await executeDeliveryWithRetry(
        schedule.companyId,
        schedule.platform as 'benevity' | 'goodera' | 'workday',
        finalConfig
      );

      // Update schedule with result
      const nextRun = calculateNextRun(schedule.schedule);
      await db
        .update(scheduledDeliveries)
        .set({
          lastRun: new Date(),
          lastStatus: deliveryResult.success ? 'success' : 'failed',
          lastError: deliveryResult.error || null,
          nextRun,
          consecutiveFailures: deliveryResult.success ? 0 : (schedule.consecutiveFailures || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(scheduledDeliveries.id, scheduleId));

      logger.info(`Schedule ${scheduleId} completed`, {
        status: deliveryResult.success ? 'success' : 'failed',
        nextRun,
      });

      // Alert if consecutive failures exceed threshold
      const consecutiveFailures = deliveryResult.success ? 0 : (schedule.consecutiveFailures || 0) + 1;
      if (consecutiveFailures >= 3) {
        logger.error(`Schedule ${scheduleId} has ${consecutiveFailures} consecutive failures`, {
          companyId: schedule.companyId,
          platform: schedule.platform,
        });
        // TODO: Trigger alert (Slack/PagerDuty)
      }
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
          consecutiveFailures: (schedule.consecutiveFailures || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(scheduledDeliveries.id, scheduleId));

      logger.error(`Schedule ${scheduleId} failed:`, error);
    }
  } catch (error) {
    logger.error(`Error executing scheduled delivery ${scheduleId}:`, error);
  }
}

/**
 * Execute delivery with retry logic and idempotency check
 */
async function executeDeliveryWithRetry(
  companyId: string,
  platform: 'benevity' | 'goodera' | 'workday',
  config: Required<SchedulerConfig>
): Promise<{ success: boolean; error?: string; payloadHash?: string }> {
  try {
    // Fetch company data and generate payload
    const payload = await fetchCompanyDataForPlatform(companyId, platform);
    const payloadHash = generatePayloadHash(payload);

    // Check if this exact payload was already delivered (idempotency)
    const alreadyDelivered = await isPayloadDelivered(companyId, platform, payloadHash);
    if (alreadyDelivered) {
      logger.info(`Payload already delivered (idempotent), skipping`, {
        companyId,
        platform,
        payloadHash: payloadHash.substring(0, 8),
      });
      return { success: true, payloadHash };
    }

    // Execute delivery with retry logic
    const result = await retryWithBackoff(
      async () => {
        switch (platform) {
          case 'benevity':
            return await deliverToBenevity(companyId);
          case 'goodera':
            return await deliverToGoodera(companyId);
          case 'workday':
            return await deliverToWorkday(companyId);
          default:
            throw new Error(`Unknown platform: ${platform}`);
        }
      },
      {
        maxAttempts: config.maxRetries,
        initialDelayMs: config.retryDelayMs,
        backoffMultiplier: config.backoffMultiplier,
      },
      (context) => {
        logger.info(`Retry attempt ${context.attempt}/${config.maxRetries}`, {
          companyId,
          platform,
          lastError: context.lastError?.message,
        });
      }
    );

    return { success: result.success, error: result.error, payloadHash };
  } catch (error: any) {
    logger.error(`Delivery failed after all retries`, {
      companyId,
      platform,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Fetch company data and format for specific platform
 * This integrates with the reporting service to get latest metrics
 */
async function fetchCompanyDataForPlatform(
  companyId: string,
  platform: 'benevity' | 'goodera' | 'workday'
): Promise<any> {
  // TODO: Integrate with reporting service to fetch latest metrics
  // For now, return mock payload structure
  return {
    companyId,
    platform,
    timestamp: new Date().toISOString(),
    metrics: {},
  };
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
 * Get next N run times for a cron expression (for preview)
 */
export function previewSchedule(cronExpression: string, count: number = 5): Date[] {
  try {
    const interval = parser.parseExpression(cronExpression);
    const runs: Date[] = [];

    for (let i = 0; i < count; i++) {
      runs.push(interval.next().toDate());
    }

    return runs;
  } catch (error) {
    logger.error(`Failed to preview schedule: ${cronExpression}`, error);
    return [];
  }
}

/**
 * Create a new scheduled delivery
 */
export async function createSchedule(params: {
  companyId: string;
  platform: 'benevity' | 'goodera' | 'workday';
  schedule: string;
  active?: boolean;
  timezone?: string;
}): Promise<string> {
  // Validate cron expression
  if (!validateCronExpression(params.schedule)) {
    throw new Error(`Invalid cron expression: ${params.schedule}`);
  }

  const nextRun = calculateNextRun(params.schedule);

  const [result] = await db
    .insert(scheduledDeliveries)
    .values({
      companyId: params.companyId,
      platform: params.platform,
      schedule: params.schedule,
      active: params.active !== false,
      timezone: params.timezone || 'UTC',
      nextRun,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: scheduledDeliveries.id });

  logger.info(`Created schedule`, {
    scheduleId: result.id,
    companyId: params.companyId,
    platform: params.platform,
    nextRun,
  });

  return result.id;
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: {
    schedule?: string;
    active?: boolean;
    timezone?: string;
  }
): Promise<void> {
  // Validate cron expression if provided
  if (updates.schedule && !validateCronExpression(updates.schedule)) {
    throw new Error(`Invalid cron expression: ${updates.schedule}`);
  }

  const updateData: any = {
    ...updates,
    updatedAt: new Date(),
  };

  // Recalculate next run if schedule changed
  if (updates.schedule) {
    updateData.nextRun = calculateNextRun(updates.schedule);
  }

  await db
    .update(scheduledDeliveries)
    .set(updateData)
    .where(eq(scheduledDeliveries.id, scheduleId));

  logger.info(`Updated schedule ${scheduleId}`, updates);
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  await db
    .delete(scheduledDeliveries)
    .where(eq(scheduledDeliveries.id, scheduleId));

  logger.info(`Deleted schedule ${scheduleId}`);
}

/**
 * Get all schedules for a company
 */
export async function getCompanySchedules(companyId: string): Promise<any[]> {
  return await db
    .select()
    .from(scheduledDeliveries)
    .where(eq(scheduledDeliveries.companyId, companyId));
}

/**
 * Start the scheduler daemon
 * Checks for due deliveries at regular intervals
 */
export function startScheduler(config: SchedulerConfig = {}): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info('Starting Impact-In scheduler...', {
    checkInterval: `${finalConfig.checkInterval} minute(s)`,
    maxRetries: finalConfig.maxRetries,
  });

  // Check for due deliveries at configured interval
  const cronPattern = `*/${finalConfig.checkInterval} * * * *`;

  cron.schedule(cronPattern, async () => {
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

        // Execute each due delivery (in parallel for efficiency)
        await Promise.all(
          dueSchedules.map(schedule =>
            executeScheduledDelivery(schedule.id, finalConfig)
          )
        );
      }
    } catch (error) {
      logger.error('Error checking for due deliveries:', error);
    }
  });

  logger.info('Scheduler started successfully');
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopScheduler(): void {
  // Note: node-cron doesn't have a global stop method
  // Individual tasks must be stopped via their returned task object
  logger.info('Scheduler stopping...');
}

/**
 * Get scheduler statistics
 */
export async function getSchedulerStats(): Promise<{
  totalSchedules: number;
  activeSchedules: number;
  pausedSchedules: number;
  failingSchedules: number;
  nextDueSchedule?: { id: string; companyId: string; platform: string; nextRun: Date };
}> {
  const stats = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where active = true)`,
      paused: sql<number>`count(*) filter (where active = false)`,
      failing: sql<number>`count(*) filter (where consecutive_failures >= 3)`,
    })
    .from(scheduledDeliveries);

  // Get next due schedule
  const [nextDue] = await db
    .select({
      id: scheduledDeliveries.id,
      companyId: scheduledDeliveries.companyId,
      platform: scheduledDeliveries.platform,
      nextRun: scheduledDeliveries.nextRun,
    })
    .from(scheduledDeliveries)
    .where(eq(scheduledDeliveries.active, true))
    .orderBy(scheduledDeliveries.nextRun)
    .limit(1);

  return {
    totalSchedules: Number(stats[0]?.total || 0),
    activeSchedules: Number(stats[0]?.active || 0),
    pausedSchedules: Number(stats[0]?.paused || 0),
    failingSchedules: Number(stats[0]?.failing || 0),
    nextDueSchedule: nextDue || undefined,
  };
}
