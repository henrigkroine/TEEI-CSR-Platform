import Redis from 'ioredis';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { notificationsQuotas } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

const logger = createServiceLogger('notifications:rate-limiter');

/**
 * Redis client for rate limiting
 */
let redisClient: Redis | null = null;

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  reason?: string;
}

/**
 * Notification type for rate limiting
 */
export type NotificationType = 'email' | 'sms' | 'push';

/**
 * Initialize Redis client for rate limiting
 */
export function initializeRateLimiter(): void {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for rate limiting');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
  } catch (error: any) {
    logger.error('Failed to initialize Redis:', error);
    logger.warn('Rate limiting will fall back to database-only mode');
  }
}

/**
 * Check if notification can be sent based on rate limits
 */
export async function checkRateLimit(
  companyId: string,
  type: NotificationType
): Promise<RateLimitResult> {
  try {
    // Get quota from database
    const db = getDb();
    let [quota] = await db
      .select()
      .from(notificationsQuotas)
      .where(eq(notificationsQuotas.companyId, companyId));

    // Create quota if doesn't exist
    if (!quota) {
      [quota] = await db
        .insert(notificationsQuotas)
        .values({
          companyId,
          emailDailyLimit: parseInt(process.env.EMAIL_DAILY_LIMIT || '1000'),
          emailDailyUsed: 0,
          smsDailyLimit: parseInt(process.env.SMS_DAILY_LIMIT || '100'),
          smsDailyUsed: 0,
          pushDailyLimit: parseInt(process.env.PUSH_DAILY_LIMIT || '10000'),
          pushDailyUsed: 0,
          lastResetAt: new Date(),
        })
        .returning();
    }

    // Check if quota needs reset (daily)
    const now = new Date();
    const lastReset = new Date(quota.lastResetAt);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      // Reset quota
      [quota] = await db
        .update(notificationsQuotas)
        .set({
          emailDailyUsed: 0,
          smsDailyUsed: 0,
          pushDailyUsed: 0,
          lastResetAt: now,
          updatedAt: now,
        })
        .where(eq(notificationsQuotas.companyId, companyId))
        .returning();
    }

    // Get limit and used based on type
    const { limit, used } = getQuotaForType(quota, type);

    // Calculate reset time (next midnight)
    const resetAt = new Date();
    resetAt.setDate(resetAt.getDate() + 1);
    resetAt.setHours(0, 0, 0, 0);

    // Check if allowed
    if (used >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt,
        reason: `Daily ${type} quota exceeded. Limit: ${limit}, Used: ${used}`,
      };
    }

    return {
      allowed: true,
      remaining: limit - used,
      limit,
      resetAt,
    };
  } catch (error: any) {
    logger.error('Rate limit check failed:', error);
    // Fail open - allow the notification but log the error
    return {
      allowed: true,
      remaining: 0,
      limit: 0,
      resetAt: new Date(),
      reason: 'Rate limit check failed - allowing notification',
    };
  }
}

/**
 * Increment usage counter for a company and type
 */
export async function incrementUsage(
  companyId: string,
  type: NotificationType
): Promise<void> {
  try {
    const db = getDb();

    // Determine which field to increment
    const updateField = type === 'email'
      ? { emailDailyUsed: (await getUsage(companyId, type)) + 1 }
      : type === 'sms'
      ? { smsDailyUsed: (await getUsage(companyId, type)) + 1 }
      : { pushDailyUsed: (await getUsage(companyId, type)) + 1 };

    await db
      .update(notificationsQuotas)
      .set({
        ...updateField,
        updatedAt: new Date(),
      })
      .where(eq(notificationsQuotas.companyId, companyId));

    logger.debug(`Incremented ${type} usage for company ${companyId}`);
  } catch (error: any) {
    logger.error('Failed to increment usage:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Get current usage for a company and type
 */
async function getUsage(companyId: string, type: NotificationType): Promise<number> {
  const db = getDb();
  const [quota] = await db
    .select()
    .from(notificationsQuotas)
    .where(eq(notificationsQuotas.companyId, companyId));

  if (!quota) return 0;

  return type === 'email'
    ? quota.emailDailyUsed
    : type === 'sms'
    ? quota.smsDailyUsed
    : quota.pushDailyUsed;
}

/**
 * Get quota info for notification type
 */
function getQuotaForType(
  quota: any,
  type: NotificationType
): { limit: number; used: number } {
  switch (type) {
    case 'email':
      return { limit: quota.emailDailyLimit, used: quota.emailDailyUsed };
    case 'sms':
      return { limit: quota.smsDailyLimit, used: quota.smsDailyUsed };
    case 'push':
      return { limit: quota.pushDailyLimit, used: quota.pushDailyUsed };
    default:
      return { limit: 0, used: 0 };
  }
}

/**
 * Get quota status for a company
 */
export async function getQuotaStatus(companyId: string): Promise<{
  email: RateLimitResult;
  sms: RateLimitResult;
  push: RateLimitResult;
}> {
  const [email, sms, push] = await Promise.all([
    checkRateLimit(companyId, 'email'),
    checkRateLimit(companyId, 'sms'),
    checkRateLimit(companyId, 'push'),
  ]);

  return { email, sms, push };
}

/**
 * Admin override: Update quota limits for a company
 */
export async function updateQuotaLimits(
  companyId: string,
  limits: {
    emailDailyLimit?: number;
    smsDailyLimit?: number;
    pushDailyLimit?: number;
  }
): Promise<void> {
  try {
    const db = getDb();
    await db
      .update(notificationsQuotas)
      .set({
        ...limits,
        updatedAt: new Date(),
      })
      .where(eq(notificationsQuotas.companyId, companyId));

    logger.info(`Updated quota limits for company ${companyId}`, limits);
  } catch (error: any) {
    logger.error('Failed to update quota limits:', error);
    throw error;
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{ healthy: boolean; message?: string }> {
  if (!redisClient) {
    return {
      healthy: false,
      message: 'Redis client not initialized',
    };
  }

  try {
    await redisClient.ping();
    return {
      healthy: true,
      message: 'Redis connected',
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: error.message,
    };
  }
}

// Initialize on module load
initializeRateLimiter();
