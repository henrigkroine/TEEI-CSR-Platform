/**
 * Memoization Helpers with LRU Cache
 *
 * Provides memoization utilities for expensive computations:
 * - Generic memoization with configurable cache
 * - Time-based cache invalidation (TTL)
 * - LRU (Least Recently Used) eviction
 * - Memory-efficient with size limits
 *
 * Use cases:
 * - SROI calculations
 * - VIS computations
 * - Data transformations
 * - API response caching
 *
 * @module lib/memoize
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when cached */
  timestamp: number;
  /** Access count (for LRU) */
  accessCount: number;
  /** Last access time (for LRU) */
  lastAccessed: number;
}

/**
 * Memoization options
 */
export interface MemoizeOptions {
  /** Maximum cache size (number of entries) */
  maxSize?: number;
  /** Time-to-live in milliseconds (0 = no expiration) */
  ttl?: number;
  /** Custom cache key generator */
  keyGenerator?: (...args: any[]) => string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * LRU Cache implementation
 */
class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly debug: boolean;

  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 100, ttl: number = 0, debug: boolean = false) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.debug = debug;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      if (this.debug) {
        console.log(`[LRU Cache] MISS: ${key}`);
      }
      return undefined;
    }

    // Check if expired
    if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      if (this.debug) {
        console.log(`[LRU Cache] EXPIRED: ${key}`);
      }
      return undefined;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.hits++;
    if (this.debug) {
      console.log(`[LRU Cache] HIT: ${key}`);
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
    });

    if (this.debug) {
      console.log(`[LRU Cache] SET: ${key} (size: ${this.cache.size}/${this.maxSize})`);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      if (this.debug) {
        console.log(`[LRU Cache] EVICTED: ${lruKey}`);
      }
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    if (this.debug) {
      console.log('[LRU Cache] CLEARED');
    }
  }

  /**
   * Delete specific entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (this.debug && deleted) {
      console.log(`[LRU Cache] DELETED: ${key}`);
    }
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate.toFixed(2)}%`,
      ttl: this.ttl,
    };
  }
}

/**
 * Default key generator (JSON.stringify args)
 */
function defaultKeyGenerator(...args: any[]): string {
  return JSON.stringify(args);
}

/**
 * Memoize a function with LRU cache
 *
 * @param fn - Function to memoize
 * @param options - Memoization options
 * @returns Memoized function
 *
 * @example
 * ```typescript
 * const expensiveCalculation = (a: number, b: number) => {
 *   // Complex computation
 *   return a * b;
 * };
 *
 * const memoized = memoize(expensiveCalculation, {
 *   maxSize: 50,
 *   ttl: 60000, // 1 minute
 * });
 *
 * // First call: cache miss, runs function
 * memoized(5, 10); // 50
 *
 * // Second call: cache hit, returns cached value
 * memoized(5, 10); // 50 (from cache)
 * ```
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: MemoizeOptions = {}
): T & { cache: LRUCache<ReturnType<T>>; clearCache: () => void } {
  const {
    maxSize = 100,
    ttl = 0,
    keyGenerator = defaultKeyGenerator,
    debug = false,
  } = options;

  const cache = new LRUCache<ReturnType<T>>(maxSize, ttl, debug);

  const memoized = function (this: any, ...args: any[]): ReturnType<T> {
    const key = keyGenerator(...args);

    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss: call function
    const result = fn.apply(this, args);

    // Store in cache
    cache.set(key, result);

    return result;
  } as T & { cache: LRUCache<ReturnType<T>>; clearCache: () => void };

  // Expose cache for manual operations
  memoized.cache = cache;
  memoized.clearCache = () => cache.clear();

  return memoized;
}

/**
 * Memoize async function
 *
 * @example
 * ```typescript
 * const fetchData = async (id: string) => {
 *   const response = await fetch(`/api/data/${id}`);
 *   return response.json();
 * };
 *
 * const memoized = memoizeAsync(fetchData, {
 *   maxSize: 20,
 *   ttl: 30000, // 30 seconds
 * });
 *
 * // First call: fetches from API
 * await memoized('123');
 *
 * // Second call: returns cached value
 * await memoized('123');
 * ```
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: MemoizeOptions = {}
): T & { cache: LRUCache<ReturnType<T>>; clearCache: () => void } {
  const {
    maxSize = 100,
    ttl = 0,
    keyGenerator = defaultKeyGenerator,
    debug = false,
  } = options;

  const cache = new LRUCache<ReturnType<T>>(maxSize, ttl, debug);
  const pendingRequests = new Map<string, Promise<any>>();

  const memoized = async function (this: any, ...args: any[]): Promise<Awaited<ReturnType<T>>> {
    const key = keyGenerator(...args);

    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Check if request is already pending (prevent duplicate requests)
    const pending = pendingRequests.get(key);
    if (pending) {
      if (debug) {
        console.log(`[Memoize Async] PENDING: ${key}`);
      }
      return pending;
    }

    // Cache miss: call function
    const promise = fn.apply(this, args);
    pendingRequests.set(key, promise);

    try {
      const result = await promise;
      cache.set(key, result);
      return result;
    } finally {
      pendingRequests.delete(key);
    }
  } as T & { cache: LRUCache<ReturnType<T>>; clearCache: () => void };

  // Expose cache for manual operations
  memoized.cache = cache;
  memoized.clearCache = () => cache.clear();

  return memoized;
}

/**
 * Create a memoized class method decorator
 *
 * @example
 * ```typescript
 * class Calculator {
 *   @Memoized({ ttl: 60000 })
 *   expensiveCalculation(a: number, b: number): number {
 *     return a * b;
 *   }
 * }
 * ```
 */
export function Memoized(options: MemoizeOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const memoizedMethod = memoize(originalMethod, options);

    descriptor.value = memoizedMethod;
    return descriptor;
  };
}

/**
 * Time-based cache with automatic expiration
 *
 * Simpler alternative to memoize when you just need time-based caching
 *
 * @example
 * ```typescript
 * const cache = new TimedCache<string>(60000); // 1 minute TTL
 *
 * cache.set('key', 'value');
 * cache.get('key'); // 'value'
 *
 * // After 1 minute
 * cache.get('key'); // undefined (expired)
 * ```
 */
export class TimedCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly ttl: number;

  constructor(ttl: number) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Example: Memoized SROI calculation
 */
export const memoizedSROI = memoize(
  (investment: number, socialValue: number) => {
    // Expensive SROI calculation
    return socialValue / investment;
  },
  {
    maxSize: 50,
    ttl: 300000, // 5 minutes
    debug: false,
  }
);

/**
 * Example: Memoized async data fetching
 */
export const memoizedFetch = memoizeAsync(
  async (url: string) => {
    const response = await fetch(url);
    return response.json();
  },
  {
    maxSize: 20,
    ttl: 60000, // 1 minute
    debug: false,
  }
);
