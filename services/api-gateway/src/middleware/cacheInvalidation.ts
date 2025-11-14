/**
 * Redis Cache Invalidation Helpers
 * Manages cache invalidation for tenant membership and RBAC changes
 */

import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function initCacheInvalidation(redis: Redis): void {
  redisClient = redis;
}

/**
 * Invalidate all tenant cache entries for a specific user
 * Use when: user is deleted, deactivated, or role changes globally
 */
export async function invalidateUserTenantCache(userId: string): Promise<void> {
  if (!redisClient) {
    console.warn('[CacheInvalidation] Redis client not initialized');
    return;
  }

  try {
    // Find all keys matching pattern tenant:{userId}:*
    const pattern = `tenant:${userId}:*`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`[CacheInvalidation] Invalidated ${keys.length} cache entries for user ${userId}`);
    }
  } catch (error) {
    console.error('[CacheInvalidation] Failed to invalidate user tenant cache:', error);
  }
}

/**
 * Invalidate specific tenant membership cache
 * Use when: user's role/permissions change in a specific company
 */
export async function invalidateTenantMembership(userId: string, companyId: string): Promise<void> {
  if (!redisClient) {
    console.warn('[CacheInvalidation] Redis client not initialized');
    return;
  }

  try {
    const key = `tenant:${userId}:${companyId}`;
    await redisClient.del(key);
    console.log(`[CacheInvalidation] Invalidated tenant cache for user ${userId} in company ${companyId}`);
  } catch (error) {
    console.error('[CacheInvalidation] Failed to invalidate tenant membership cache:', error);
  }
}

/**
 * Invalidate all tenant cache entries for a company
 * Use when: company is deleted or deactivated
 */
export async function invalidateCompanyTenantCache(companyId: string): Promise<void> {
  if (!redisClient) {
    console.warn('[CacheInvalidation] Redis client not initialized');
    return;
  }

  try {
    // Find all keys matching pattern tenant:*:{companyId}
    const pattern = `tenant:*:${companyId}`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`[CacheInvalidation] Invalidated ${keys.length} cache entries for company ${companyId}`);
    }
  } catch (error) {
    console.error('[CacheInvalidation] Failed to invalidate company tenant cache:', error);
  }
}

/**
 * Pub/Sub pattern for distributed cache invalidation
 * Notifies all gateway instances when cache should be invalidated
 */
export class CacheInvalidationPubSub {
  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private channelName = 'cache:invalidation';

  constructor(redis: Redis) {
    this.redis = redis;
    // Create separate connections for pub/sub (Redis requirement)
    this.subscriber = redis.duplicate();
    this.publisher = redis.duplicate();
  }

  /**
   * Start listening for invalidation events
   */
  async startListening(): Promise<void> {
    await this.subscriber.subscribe(this.channelName);

    this.subscriber.on('message', async (channel, message) => {
      if (channel !== this.channelName) return;

      try {
        const event = JSON.parse(message);

        switch (event.type) {
          case 'user':
            await invalidateUserTenantCache(event.userId);
            break;
          case 'tenant':
            await invalidateTenantMembership(event.userId, event.companyId);
            break;
          case 'company':
            await invalidateCompanyTenantCache(event.companyId);
            break;
          default:
            console.warn('[CacheInvalidation] Unknown invalidation type:', event.type);
        }
      } catch (error) {
        console.error('[CacheInvalidation] Failed to process invalidation event:', error);
      }
    });

    console.log('[CacheInvalidation] Started listening for cache invalidation events');
  }

  /**
   * Publish user cache invalidation to all instances
   */
  async publishUserInvalidation(userId: string): Promise<void> {
    await this.publisher.publish(
      this.channelName,
      JSON.stringify({ type: 'user', userId })
    );
  }

  /**
   * Publish tenant membership invalidation to all instances
   */
  async publishTenantInvalidation(userId: string, companyId: string): Promise<void> {
    await this.publisher.publish(
      this.channelName,
      JSON.stringify({ type: 'tenant', userId, companyId })
    );
  }

  /**
   * Publish company cache invalidation to all instances
   */
  async publishCompanyInvalidation(companyId: string): Promise<void> {
    await this.publisher.publish(
      this.channelName,
      JSON.stringify({ type: 'company', companyId })
    );
  }

  /**
   * Stop listening and close connections
   */
  async stop(): Promise<void> {
    await this.subscriber.unsubscribe();
    await this.subscriber.quit();
    await this.publisher.quit();
    console.log('[CacheInvalidation] Stopped listening for cache invalidation events');
  }
}

/**
 * Example usage in route handlers
 *
 * // When updating a user's role in company_users table:
 * await db.query(
 *   'UPDATE company_users SET role = $1 WHERE user_id = $2 AND company_id = $3',
 *   [newRole, userId, companyId]
 * );
 *
 * // Invalidate cache locally and notify other instances
 * await invalidateTenantMembership(userId, companyId);
 * await pubsub.publishTenantInvalidation(userId, companyId);
 *
 * // When deactivating a user:
 * await db.query('UPDATE company_users SET is_active = false WHERE user_id = $1', [userId]);
 * await invalidateUserTenantCache(userId);
 * await pubsub.publishUserInvalidation(userId);
 */
