import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import type { CompanyRegion } from '../db/schema.js';

export class ResidencyCache {
  private client: RedisClientType | null = null;
  private enabled: boolean;
  private ttl: number;

  constructor(redisUrl?: string, enabled: boolean = true, ttl: number = 300) {
    this.enabled = enabled && !!redisUrl;
    this.ttl = ttl;

    if (this.enabled && redisUrl) {
      this.client = createClient({ url: redisUrl });
      this.client.on('error', (err) => console.error('Redis Client Error', err));
    }
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.enabled && this.client && !this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  /**
   * Get company region from cache
   */
  async get(companyId: string): Promise<CompanyRegion | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    try {
      const key = `residency:company:${companyId}`;
      const cached = await this.client.get(key);

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set company region in cache
   */
  async set(companyId: string, region: CompanyRegion): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const key = `residency:company:${companyId}`;
      await this.client.setEx(key, this.ttl, JSON.stringify(region));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate company region cache
   */
  async invalidate(companyId: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const key = `residency:company:${companyId}`;
      await this.client.del(key);
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  /**
   * Check if cache is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled || !this.client) {
      return true; // Cache is optional, so not having it is "healthy"
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}
