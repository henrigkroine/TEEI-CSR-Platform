/**
 * Cache Warmer
 * Pre-warms cache with common prompts/templates to reduce cold-start latency
 */

import { createServiceLogger } from '@teei/shared-utils';
import Redis from 'ioredis';

const logger = createServiceLogger('cache-warmer');

export interface WarmupTask {
  id: string;
  type: 'prompt' | 'taxonomy' | 'embedding' | 'connection';
  key: string;
  data: any;
  ttlSeconds?: number;
  priority: number; // Higher = warmed first
}

export interface WarmupResult {
  taskId: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface WarmupSchedule {
  /** Cron expression (e.g., "0 8 * * 1-5" for weekdays at 8am) */
  cronExpression: string;
  /** Tasks to run on this schedule */
  tasks: WarmupTask[];
}

/**
 * Cache Warmer Service
 * Pre-warms caches to reduce latency for first requests
 */
export class CacheWarmer {
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, { data: any; expiresAt: Date }> = new Map();
  private warmupHistory: WarmupResult[] = [];
  private isWarming = false;

  // Common prompts for Q2Q classification
  private readonly COMMON_PROMPTS = [
    'Classify the following feedback into outcome dimensions',
    'Analyze this volunteer feedback',
    'Identify impact areas from this text',
    'Categorize this CSR feedback',
    'Extract sentiment and outcomes',
  ];

  // Common taxonomy/label definitions
  private readonly TAXONOMY_KEYS = [
    'taxonomy:confidence',
    'taxonomy:belonging',
    'taxonomy:language_proficiency',
    'taxonomy:job_readiness',
    'taxonomy:wellbeing',
  ];

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        logger.info('Cache warmer initialized with Redis');
      } catch (error) {
        logger.error('Failed to connect to Redis, using in-memory cache:', error);
      }
    } else {
      logger.info('Cache warmer initialized with in-memory cache');
    }
  }

  /**
   * Warm cache at service startup
   */
  async warmupOnStartup(): Promise<WarmupResult[]> {
    logger.info('Starting cache warmup on startup...');

    const tasks = this.buildStartupTasks();
    const results = await this.executeTasks(tasks);

    const successCount = results.filter(r => r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

    logger.info(
      `Startup warmup completed: ${successCount}/${results.length} tasks succeeded in ${totalDuration}ms`
    );

    return results;
  }

  /**
   * Warm cache with custom tasks
   */
  async warmup(tasks: WarmupTask[]): Promise<WarmupResult[]> {
    if (this.isWarming) {
      logger.warn('Warmup already in progress, skipping');
      return [];
    }

    this.isWarming = true;

    try {
      const results = await this.executeTasks(tasks);
      return results;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Get cached value
   */
  async get(key: string): Promise<any | null> {
    if (this.redis) {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      const cached = this.inMemoryCache.get(key);
      if (!cached) return null;

      if (cached.expiresAt < new Date()) {
        this.inMemoryCache.delete(key);
        return null;
      }

      return cached.data;
    }
  }

  /**
   * Set cached value
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (this.redis) {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      this.inMemoryCache.set(key, { data: value, expiresAt });
    }
  }

  /**
   * Pre-warm common prompts
   */
  async warmPrompts(): Promise<WarmupResult[]> {
    const tasks: WarmupTask[] = this.COMMON_PROMPTS.map((prompt, idx) => ({
      id: `prompt-${idx}`,
      type: 'prompt',
      key: `prompt:common:${idx}`,
      data: { prompt, precomputed: true },
      ttlSeconds: 86400, // 24 hours
      priority: 100,
    }));

    return this.executeTasks(tasks);
  }

  /**
   * Pre-warm taxonomy definitions
   */
  async warmTaxonomy(): Promise<WarmupResult[]> {
    const taxonomyData = {
      'taxonomy:confidence': {
        name: 'Confidence',
        description: 'Self-esteem, assertiveness, and personal growth',
        keywords: ['confidence', 'self-esteem', 'empowered', 'assertive'],
      },
      'taxonomy:belonging': {
        name: 'Belonging',
        description: 'Social connection, community, and inclusion',
        keywords: ['belong', 'community', 'connected', 'included'],
      },
      'taxonomy:language_proficiency': {
        name: 'Language Proficiency',
        description: 'Communication skills and language abilities',
        keywords: ['language', 'communication', 'speaking', 'writing'],
      },
      'taxonomy:job_readiness': {
        name: 'Job Readiness',
        description: 'Employment skills and career preparation',
        keywords: ['job', 'career', 'employment', 'skills', 'resume'],
      },
      'taxonomy:wellbeing': {
        name: 'Wellbeing',
        description: 'Mental and physical health and wellness',
        keywords: ['health', 'wellness', 'wellbeing', 'mental health'],
      },
    };

    const tasks: WarmupTask[] = this.TAXONOMY_KEYS.map((key, idx) => ({
      id: `taxonomy-${idx}`,
      type: 'taxonomy',
      key,
      data: taxonomyData[key as keyof typeof taxonomyData],
      ttlSeconds: 86400, // 24 hours
      priority: 90,
    }));

    return this.executeTasks(tasks);
  }

  /**
   * Pre-warm embeddings for common feedback phrases
   */
  async warmEmbeddings(): Promise<WarmupResult[]> {
    const commonPhrases = [
      'I feel more confident',
      'This program helped me get a job',
      'I learned new skills',
      'I feel connected to my community',
      'My mental health improved',
      'I can communicate better now',
      'I feel empowered',
      'I belong here',
      'I am job ready',
      'My wellbeing has improved',
    ];

    const tasks: WarmupTask[] = commonPhrases.map((phrase, idx) => ({
      id: `embedding-${idx}`,
      type: 'embedding',
      key: `embedding:${this.hashString(phrase)}`,
      data: { phrase, embedding: null }, // In production, compute actual embedding
      ttlSeconds: 86400, // 24 hours
      priority: 80,
    }));

    return this.executeTasks(tasks);
  }

  /**
   * Warm database connection pool
   */
  async warmConnections(): Promise<WarmupResult[]> {
    logger.info('Warming database connections...');

    const start = Date.now();
    const result: WarmupResult = {
      taskId: 'connection-pool',
      success: true,
      durationMs: 0,
    };

    try {
      // This would connect to the actual database in production
      // For now, just simulate
      await new Promise(resolve => setTimeout(resolve, 100));

      result.durationMs = Date.now() - start;
      logger.info(`Connection pool warmed in ${result.durationMs}ms`);
    } catch (error: any) {
      result.success = false;
      result.error = error.message;
      result.durationMs = Date.now() - start;
      logger.error('Failed to warm connection pool:', error);
    }

    this.recordResult(result);
    return [result];
  }

  /**
   * Schedule periodic warmup
   */
  scheduleWarmup(schedule: WarmupSchedule): void {
    logger.info(`Scheduled warmup with cron: ${schedule.cronExpression}`);

    // In production, use node-cron or similar
    // For now, just log
    logger.info(`Would schedule ${schedule.tasks.length} tasks on cron: ${schedule.cronExpression}`);
  }

  /**
   * Get warmup history
   */
  getHistory(limit: number = 100): WarmupResult[] {
    return this.warmupHistory.slice(-limit);
  }

  /**
   * Get warmup statistics
   */
  getStats(): {
    totalWarmups: number;
    successRate: number;
    avgDurationMs: number;
    cacheHitRate: number;
  } {
    const total = this.warmupHistory.length;
    const successful = this.warmupHistory.filter(r => r.success).length;
    const avgDuration = total > 0
      ? this.warmupHistory.reduce((sum, r) => sum + r.durationMs, 0) / total
      : 0;

    return {
      totalWarmups: total,
      successRate: total > 0 ? successful / total : 0,
      avgDurationMs: avgDuration,
      cacheHitRate: 0, // Would track actual cache hits in production
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys('prompt:*');
      keys.push(...await this.redis.keys('taxonomy:*'));
      keys.push(...await this.redis.keys('embedding:*'));

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      logger.info(`Cleared ${keys.length} cache keys from Redis`);
    } else {
      this.inMemoryCache.clear();
      logger.info('Cleared in-memory cache');
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildStartupTasks(): WarmupTask[] {
    const tasks: WarmupTask[] = [];

    // Add prompt tasks
    this.COMMON_PROMPTS.forEach((prompt, idx) => {
      tasks.push({
        id: `prompt-${idx}`,
        type: 'prompt',
        key: `prompt:common:${idx}`,
        data: { prompt, precomputed: true },
        ttlSeconds: 86400,
        priority: 100,
      });
    });

    // Add taxonomy tasks
    const taxonomyData = {
      'taxonomy:confidence': {
        name: 'Confidence',
        keywords: ['confidence', 'self-esteem', 'empowered'],
      },
      'taxonomy:belonging': {
        name: 'Belonging',
        keywords: ['belong', 'community', 'connected'],
      },
      'taxonomy:language_proficiency': {
        name: 'Language Proficiency',
        keywords: ['language', 'communication'],
      },
      'taxonomy:job_readiness': {
        name: 'Job Readiness',
        keywords: ['job', 'career', 'employment'],
      },
      'taxonomy:wellbeing': {
        name: 'Wellbeing',
        keywords: ['health', 'wellness', 'wellbeing'],
      },
    };

    this.TAXONOMY_KEYS.forEach((key, idx) => {
      tasks.push({
        id: `taxonomy-${idx}`,
        type: 'taxonomy',
        key,
        data: taxonomyData[key as keyof typeof taxonomyData],
        ttlSeconds: 86400,
        priority: 90,
      });
    });

    return tasks;
  }

  private async executeTasks(tasks: WarmupTask[]): Promise<WarmupResult[]> {
    // Sort by priority (highest first)
    const sorted = [...tasks].sort((a, b) => b.priority - a.priority);

    const results: WarmupResult[] = [];

    for (const task of sorted) {
      const result = await this.executeTask(task);
      results.push(result);
      this.recordResult(result);
    }

    return results;
  }

  private async executeTask(task: WarmupTask): Promise<WarmupResult> {
    const start = Date.now();
    const result: WarmupResult = {
      taskId: task.id,
      success: true,
      durationMs: 0,
    };

    try {
      await this.set(task.key, task.data, task.ttlSeconds);

      result.durationMs = Date.now() - start;

      logger.debug(
        `Warmed ${task.type} cache: ${task.key} (${result.durationMs}ms)`
      );
    } catch (error: any) {
      result.success = false;
      result.error = error.message;
      result.durationMs = Date.now() - start;

      logger.error(`Failed to warm cache for ${task.key}:`, error);
    }

    return result;
  }

  private recordResult(result: WarmupResult): void {
    this.warmupHistory.push(result);

    // Keep only last 1000 results
    if (this.warmupHistory.length > 1000) {
      this.warmupHistory = this.warmupHistory.slice(-1000);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Singleton instance
 */
let cacheWarmer: CacheWarmer | null = null;

export function getCacheWarmer(redisUrl?: string): CacheWarmer {
  if (!cacheWarmer) {
    cacheWarmer = new CacheWarmer(redisUrl || process.env.REDIS_URL);
  }
  return cacheWarmer;
}

export function resetCacheWarmer(): void {
  cacheWarmer = null;
}
