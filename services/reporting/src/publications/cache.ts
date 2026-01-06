/**
 * Publication Cache Manager - Worker 19
 *
 * ETag-based caching for publication responses.
 * Implements stale-while-revalidate pattern for performance.
 *
 * @module publications/cache
 */

import crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';

interface CacheEntry {
  data: any;
  etag: string;
  timestamp: number;
}

export class PublicationCache {
  private client: RedisClientType | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private useRedis: boolean = false;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.client = createClient({ url: redisUrl });
      this.client.connect().then(() => {
        this.useRedis = true;
        console.log('[PublicationCache] Redis connected');
      }).catch(err => {
        console.error('[PublicationCache] Redis connection failed, using memory cache:', err);
        this.useRedis = false;
      });
    }
  }

  /**
   * Generate ETag from data
   */
  generateETag(data: any): string {
    const content = JSON.stringify(data);
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }

  /**
   * Get cached publication
   */
  async get(slug: string): Promise<CacheEntry | null> {
    const key = `pub:${slug}`;

    if (this.useRedis && this.client) {
      try {
        const cached = await this.client.get(key);
        return cached ? JSON.parse(cached) : null;
      } catch (err) {
        console.error('[PublicationCache] Redis get failed:', err);
        return this.memoryCache.get(key) || null;
      }
    }

    return this.memoryCache.get(key) || null;
  }

  /**
   * Set cached publication
   */
  async set(slug: string, data: any, ttlSeconds: number = 300): Promise<string> {
    const key = `pub:${slug}`;
    const etag = this.generateETag(data);
    const entry: CacheEntry = {
      data,
      etag,
      timestamp: Date.now(),
    };

    if (this.useRedis && this.client) {
      try {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(entry));
      } catch (err) {
        console.error('[PublicationCache] Redis set failed:', err);
        this.memoryCache.set(key, entry);
      }
    } else {
      this.memoryCache.set(key, entry);
      // Auto-expire from memory cache
      setTimeout(() => {
        this.memoryCache.delete(key);
      }, ttlSeconds * 1000);
    }

    return etag;
  }

  /**
   * Invalidate cached publication
   */
  async invalidate(slug: string): Promise<void> {
    const key = `pub:${slug}`;

    if (this.useRedis && this.client) {
      try {
        await this.client.del(key);
      } catch (err) {
        console.error('[PublicationCache] Redis delete failed:', err);
      }
    }

    this.memoryCache.delete(key);
  }

  /**
   * Check if ETag matches (for 304 Not Modified)
   */
  async checkETag(slug: string, clientETag: string): Promise<boolean> {
    const cached = await this.get(slug);
    if (!cached) return false;
    return cached.etag === clientETag;
  }

  /**
   * Close cache connections
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
    this.memoryCache.clear();
  }
}

// Singleton instance
export const publicationCache = new PublicationCache(process.env.REDIS_URL);
