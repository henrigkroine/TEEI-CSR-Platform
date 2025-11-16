/**
 * NLQ Rate Limiter - Per-tenant quota enforcement with Redis-backed counters
 *
 * Features:
 * - Daily/hourly query limits per company
 * - Concurrent query limits to prevent resource exhaustion
 * - Redis for fast quota checks (avoid DB bottleneck)
 * - PostgreSQL sync for persistence and audit trail
 * - Admin overrides and temporary quota increases
 * - Automatic quota reset with cron jobs
 *
 * Rate Limiting Strategy:
 * - Daily: 500 queries/day (default, configurable per tenant)
 * - Hourly: 50 queries/hour (burst protection)
 * - Concurrent: 5 simultaneous queries (prevent resource starvation)
 *
 * Redis Key Structure:
 * - nlq:ratelimit:daily:{companyId} - Daily query count
 * - nlq:ratelimit:hourly:{companyId} - Hourly query count
 * - nlq:ratelimit:concurrent:{companyId} - Current concurrent count
 * - nlq:ratelimit:config:{companyId} - Cached config from DB
 */

import Redis from 'ioredis';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { nlqRateLimits } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

// Simple logger for now
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// ===== CONSTANTS =====

const RATE_LIMIT_PREFIX = 'nlq:ratelimit';
const DAILY_PREFIX = `${RATE_LIMIT_PREFIX}:daily`;
const HOURLY_PREFIX = `${RATE_LIMIT_PREFIX}:hourly`;
const CONCURRENT_PREFIX = `${RATE_LIMIT_PREFIX}:concurrent`;
const CONFIG_PREFIX = `${RATE_LIMIT_PREFIX}:config`;

// Default limits
const DEFAULT_DAILY_LIMIT = 500;
const DEFAULT_HOURLY_LIMIT = 50;
const DEFAULT_CONCURRENT_LIMIT = 5;

// TTLs
const DAILY_TTL_SECONDS = 86400; // 24 hours
const HOURLY_TTL_SECONDS = 3600; // 1 hour
const CONFIG_CACHE_TTL_SECONDS = 300; // 5 minutes

// Redis sync
const SYNC_TO_DB_INTERVAL_MS = 3600000; // 1 hour

// ===== INTERFACES =====

export interface RateLimitConfig {
  dailyQueryLimit: number;
  hourlyQueryLimit: number;
  concurrentQueryLimit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  resetAt?: Date;
  remainingDaily?: number;
  remainingHourly?: number;
  remainingConcurrent?: number;
}

export interface QuotaInfo {
  companyId: string;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  dailyResetAt: Date;
  hourlyLimit: number;
  hourlyUsed: number;
  hourlyRemaining: number;
  hourlyResetAt: Date;
  concurrentLimit: number;
  concurrentUsed: number;
  concurrentRemaining: number;
  limitExceededCount: number;
  lastLimitExceededAt?: Date;
}

export interface AdminQuotaUpdate {
  companyId: string;
  dailyQueryLimit?: number;
  hourlyQueryLimit?: number;
  concurrentQueryLimit?: number;
  reason?: string;
  expiresAt?: Date; // For temporary increases
}

// ===== DATABASE & REDIS CLIENTS =====

let db: ReturnType<typeof drizzle> | null = null;
let redisClient: Redis | null = null;

function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL || 'postgres://teei:teei_dev_password@localhost:5432/teei_platform';
    const sql = postgres(connectionString);
    db = drizzle(sql);
  }
  return db;
}

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      logger.info('NLQ Rate Limiter Redis connected');
    });

    redisClient.on('error', (error) => {
      logger.error('NLQ Rate Limiter Redis error', { error });
    });

    logger.info('NLQ Rate Limiter Redis client initialized', { redisUrl });
  }

  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('NLQ Rate Limiter Redis client closed');
  }
}

// ===== CUSTOM ERRORS =====

export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public limitType: 'daily' | 'hourly' | 'concurrent',
    public resetAt?: Date,
    public remaining: number = 0
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

// ===== RATE LIMITER CLASS =====

export class NLQRateLimiter {
  private redis: Redis;
  private database: ReturnType<typeof drizzle>;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.redis = getRedisClient();
    this.database = getDb();
    this.startSyncInterval();
  }

  /**
   * Check if company is within rate limits
   * Checks daily, hourly, and concurrent limits in parallel
   */
  async checkLimit(companyId: string): Promise<RateLimitResult> {
    try {
      const config = await this.getOrCreateConfig(companyId);
      const now = new Date();

      // Get current usage from Redis
      const [dailyUsed, hourlyUsed, concurrentUsed] = await Promise.all([
        this.getCounter(`${DAILY_PREFIX}:${companyId}`),
        this.getCounter(`${HOURLY_PREFIX}:${companyId}`),
        this.getCounter(`${CONCURRENT_PREFIX}:${companyId}`),
      ]);

      // Calculate remaining
      const dailyRemaining = config.dailyQueryLimit - dailyUsed;
      const hourlyRemaining = config.hourlyQueryLimit - hourlyUsed;
      const concurrentRemaining = config.concurrentQueryLimit - concurrentUsed;

      // Check daily limit
      if (dailyRemaining <= 0) {
        const resetAt = this.getDailyResetTime();
        await this.recordLimitExceeded(companyId);
        return {
          allowed: false,
          reason: `Daily query limit exceeded (${config.dailyQueryLimit} queries/day)`,
          resetAt,
          remainingDaily: 0,
          remainingHourly: hourlyRemaining,
          remainingConcurrent: concurrentRemaining,
        };
      }

      // Check hourly limit
      if (hourlyRemaining <= 0) {
        const resetAt = this.getHourlyResetTime();
        await this.recordLimitExceeded(companyId);
        return {
          allowed: false,
          reason: `Hourly query limit exceeded (${config.hourlyQueryLimit} queries/hour)`,
          resetAt,
          remainingDaily: dailyRemaining,
          remainingHourly: 0,
          remainingConcurrent: concurrentRemaining,
        };
      }

      // Check concurrent limit
      if (concurrentRemaining <= 0) {
        await this.recordLimitExceeded(companyId);
        return {
          allowed: false,
          reason: `Concurrent query limit exceeded (${config.concurrentQueryLimit} simultaneous queries)`,
          remainingDaily: dailyRemaining,
          remainingHourly: hourlyRemaining,
          remainingConcurrent: 0,
        };
      }

      // All checks passed
      return {
        allowed: true,
        remainingDaily: dailyRemaining,
        remainingHourly: hourlyRemaining,
        remainingConcurrent: concurrentRemaining,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { companyId, error });
      // Fail open - allow request if rate limiter is down
      return {
        allowed: true,
        reason: 'Rate limiter error - allowing request',
      };
    }
  }

  /**
   * Increment usage counters after successful request
   * Increments both daily and hourly counters, increments concurrent
   */
  async incrementUsage(companyId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      // Increment daily counter with TTL
      const dailyKey = `${DAILY_PREFIX}:${companyId}`;
      pipeline.incr(dailyKey);
      pipeline.expire(dailyKey, DAILY_TTL_SECONDS);

      // Increment hourly counter with TTL
      const hourlyKey = `${HOURLY_PREFIX}:${companyId}`;
      pipeline.incr(hourlyKey);
      pipeline.expire(hourlyKey, HOURLY_TTL_SECONDS);

      // Increment concurrent counter (no TTL - will be decremented manually)
      const concurrentKey = `${CONCURRENT_PREFIX}:${companyId}`;
      pipeline.incr(concurrentKey);

      await pipeline.exec();

      logger.debug('Rate limit usage incremented', { companyId });
    } catch (error) {
      logger.error('Failed to increment usage', { companyId, error });
      // Non-critical error, don't throw
    }
  }

  /**
   * Decrement concurrent query counter when request completes
   */
  async decrementConcurrent(companyId: string): Promise<void> {
    try {
      const concurrentKey = `${CONCURRENT_PREFIX}:${companyId}`;
      const current = await this.redis.get(concurrentKey);

      if (current && parseInt(current, 10) > 0) {
        await this.redis.decr(concurrentKey);
        logger.debug('Concurrent counter decremented', { companyId });
      }
    } catch (error) {
      logger.error('Failed to decrement concurrent', { companyId, error });
      // Non-critical error, don't throw
    }
  }

  /**
   * Get remaining quota information for a company
   */
  async getRemainingQuota(companyId: string): Promise<QuotaInfo> {
    try {
      const config = await this.getOrCreateConfig(companyId);
      const [dailyUsed, hourlyUsed, concurrentUsed, dbRecord] = await Promise.all([
        this.getCounter(`${DAILY_PREFIX}:${companyId}`),
        this.getCounter(`${HOURLY_PREFIX}:${companyId}`),
        this.getCounter(`${CONCURRENT_PREFIX}:${companyId}`),
        this.getDbRecord(companyId),
      ]);

      return {
        companyId,
        dailyLimit: config.dailyQueryLimit,
        dailyUsed,
        dailyRemaining: Math.max(0, config.dailyQueryLimit - dailyUsed),
        dailyResetAt: this.getDailyResetTime(),
        hourlyLimit: config.hourlyQueryLimit,
        hourlyUsed,
        hourlyRemaining: Math.max(0, config.hourlyQueryLimit - hourlyUsed),
        hourlyResetAt: this.getHourlyResetTime(),
        concurrentLimit: config.concurrentQueryLimit,
        concurrentUsed,
        concurrentRemaining: Math.max(0, config.concurrentQueryLimit - concurrentUsed),
        limitExceededCount: dbRecord?.limitExceededCount || 0,
        lastLimitExceededAt: dbRecord?.lastLimitExceededAt ? new Date(dbRecord.lastLimitExceededAt) : undefined,
      };
    } catch (error) {
      logger.error('Failed to get remaining quota', { companyId, error });
      throw error;
    }
  }

  /**
   * Reset daily quota for all companies (cron job)
   */
  async resetDailyQuota(): Promise<void> {
    try {
      const pattern = `${DAILY_PREFIX}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        logger.info('No daily quotas to reset');
        return;
      }

      // Delete all daily counters (they'll be recreated on next request)
      await this.redis.del(...keys);

      // Update database reset timestamps
      const now = new Date();
      const resetAt = this.getDailyResetTime();

      // Note: This is a bulk update, individual company resets happen lazily
      logger.info('Daily quotas reset', { keysDeleted: keys.length, resetAt });
    } catch (error) {
      logger.error('Failed to reset daily quota', { error });
      throw error;
    }
  }

  /**
   * Reset hourly quota for all companies (cron job)
   */
  async resetHourlyQuota(): Promise<void> {
    try {
      const pattern = `${HOURLY_PREFIX}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        logger.info('No hourly quotas to reset');
        return;
      }

      // Delete all hourly counters
      await this.redis.del(...keys);

      logger.info('Hourly quotas reset', { keysDeleted: keys.length });
    } catch (error) {
      logger.error('Failed to reset hourly quota', { error });
      throw error;
    }
  }

  /**
   * Admin: Update quota limits for a company
   */
  async updateQuotaLimits(update: AdminQuotaUpdate): Promise<void> {
    try {
      const { companyId, dailyQueryLimit, hourlyQueryLimit, concurrentQueryLimit } = update;

      // Update database
      const updateData: any = { updatedAt: new Date() };
      if (dailyQueryLimit !== undefined) updateData.dailyQueryLimit = dailyQueryLimit;
      if (hourlyQueryLimit !== undefined) updateData.hourlyQueryLimit = hourlyQueryLimit;
      if (concurrentQueryLimit !== undefined) updateData.concurrentQueryLimit = concurrentQueryLimit;

      await this.database
        .update(nlqRateLimits)
        .set(updateData)
        .where(eq(nlqRateLimits.companyId, companyId));

      // Invalidate Redis config cache
      await this.redis.del(`${CONFIG_PREFIX}:${companyId}`);

      logger.info('Quota limits updated', { companyId, update });
    } catch (error) {
      logger.error('Failed to update quota limits', { update, error });
      throw error;
    }
  }

  /**
   * Admin: Reset quota usage for a company
   */
  async resetCompanyQuota(companyId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      // Delete all counters for this company
      pipeline.del(`${DAILY_PREFIX}:${companyId}`);
      pipeline.del(`${HOURLY_PREFIX}:${companyId}`);
      pipeline.del(`${CONCURRENT_PREFIX}:${companyId}`);

      await pipeline.exec();

      logger.info('Company quota reset', { companyId });
    } catch (error) {
      logger.error('Failed to reset company quota', { companyId, error });
      throw error;
    }
  }

  /**
   * Sync Redis counters to PostgreSQL (called periodically)
   */
  async syncToDatabase(): Promise<void> {
    try {
      // Get all company IDs with active counters
      const dailyKeys = await this.redis.keys(`${DAILY_PREFIX}:*`);
      const hourlyKeys = await this.redis.keys(`${HOURLY_PREFIX}:*`);
      const concurrentKeys = await this.redis.keys(`${CONCURRENT_PREFIX}:*`);

      // Extract unique company IDs
      const companyIds = new Set<string>();
      [...dailyKeys, ...hourlyKeys, ...concurrentKeys].forEach(key => {
        const companyId = key.split(':').pop();
        if (companyId) companyIds.add(companyId);
      });

      if (companyIds.size === 0) {
        logger.debug('No counters to sync to database');
        return;
      }

      // Sync each company
      const syncPromises = Array.from(companyIds).map(async companyId => {
        const [dailyUsed, hourlyUsed, concurrentUsed] = await Promise.all([
          this.getCounter(`${DAILY_PREFIX}:${companyId}`),
          this.getCounter(`${HOURLY_PREFIX}:${companyId}`),
          this.getCounter(`${CONCURRENT_PREFIX}:${companyId}`),
        ]);

        await this.database
          .update(nlqRateLimits)
          .set({
            queriesUsedToday: dailyUsed,
            queriesUsedThisHour: hourlyUsed,
            currentConcurrent: concurrentUsed,
            updatedAt: new Date(),
          })
          .where(eq(nlqRateLimits.companyId, companyId));
      });

      await Promise.all(syncPromises);

      logger.info('Synced counters to database', { companiesCount: companyIds.size });
    } catch (error) {
      logger.error('Failed to sync to database', { error });
      // Don't throw - this is a background task
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Get or create rate limit configuration for a company
   */
  private async getOrCreateConfig(companyId: string): Promise<RateLimitConfig> {
    try {
      // Try to get from Redis cache first
      const cachedConfig = await this.redis.get(`${CONFIG_PREFIX}:${companyId}`);
      if (cachedConfig) {
        return JSON.parse(cachedConfig);
      }

      // Get from database
      let [dbRecord] = await this.database
        .select()
        .from(nlqRateLimits)
        .where(eq(nlqRateLimits.companyId, companyId))
        .limit(1);

      // Create if doesn't exist
      if (!dbRecord) {
        const now = new Date();
        [dbRecord] = await this.database
          .insert(nlqRateLimits)
          .values({
            companyId,
            dailyQueryLimit: DEFAULT_DAILY_LIMIT,
            hourlyQueryLimit: DEFAULT_HOURLY_LIMIT,
            concurrentQueryLimit: DEFAULT_CONCURRENT_LIMIT,
            queriesUsedToday: 0,
            queriesUsedThisHour: 0,
            currentConcurrent: 0,
            dailyResetAt: this.getDailyResetTime(),
            hourlyResetAt: this.getHourlyResetTime(),
            limitExceededCount: 0,
          })
          .returning();

        logger.info('Created new rate limit config', { companyId });
      }

      const config: RateLimitConfig = {
        dailyQueryLimit: dbRecord.dailyQueryLimit || DEFAULT_DAILY_LIMIT,
        hourlyQueryLimit: dbRecord.hourlyQueryLimit || DEFAULT_HOURLY_LIMIT,
        concurrentQueryLimit: dbRecord.concurrentQueryLimit || DEFAULT_CONCURRENT_LIMIT,
      };

      // Cache in Redis
      await this.redis.setex(
        `${CONFIG_PREFIX}:${companyId}`,
        CONFIG_CACHE_TTL_SECONDS,
        JSON.stringify(config)
      );

      return config;
    } catch (error) {
      logger.error('Failed to get/create config', { companyId, error });
      // Return defaults if error
      return {
        dailyQueryLimit: DEFAULT_DAILY_LIMIT,
        hourlyQueryLimit: DEFAULT_HOURLY_LIMIT,
        concurrentQueryLimit: DEFAULT_CONCURRENT_LIMIT,
      };
    }
  }

  /**
   * Get counter value from Redis
   */
  private async getCounter(key: string): Promise<number> {
    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      logger.error('Failed to get counter', { key, error });
      return 0;
    }
  }

  /**
   * Get database record for a company
   */
  private async getDbRecord(companyId: string) {
    try {
      const [record] = await this.database
        .select()
        .from(nlqRateLimits)
        .where(eq(nlqRateLimits.companyId, companyId))
        .limit(1);

      return record;
    } catch (error) {
      logger.error('Failed to get DB record', { companyId, error });
      return null;
    }
  }

  /**
   * Record that a limit was exceeded
   */
  private async recordLimitExceeded(companyId: string): Promise<void> {
    try {
      await this.database
        .update(nlqRateLimits)
        .set({
          limitExceededCount: nlqRateLimits.limitExceededCount + 1,
          lastLimitExceededAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(nlqRateLimits.companyId, companyId));
    } catch (error) {
      logger.error('Failed to record limit exceeded', { companyId, error });
      // Non-critical, don't throw
    }
  }

  /**
   * Get next daily reset time (midnight UTC)
   */
  private getDailyResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get next hourly reset time (top of next hour)
   */
  private getHourlyResetTime(): Date {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    return nextHour;
  }

  /**
   * Start background sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncToDatabase().catch(err => {
        logger.error('Sync interval error', { error: err });
      });
    }, SYNC_TO_DB_INTERVAL_MS);

    logger.info('Started rate limiter sync interval', { intervalMs: SYNC_TO_DB_INTERVAL_MS });
  }

  /**
   * Stop background sync interval
   */
  async shutdown(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Final sync before shutdown
    await this.syncToDatabase();

    await closeRedisClient();
    logger.info('Rate limiter shut down');
  }
}

// ===== SINGLETON INSTANCE =====

let rateLimiterInstance: NLQRateLimiter | null = null;

export function getNLQRateLimiter(): NLQRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new NLQRateLimiter();
  }
  return rateLimiterInstance;
}

export async function shutdownRateLimiter(): Promise<void> {
  if (rateLimiterInstance) {
    await rateLimiterInstance.shutdown();
    rateLimiterInstance = null;
  }
}
