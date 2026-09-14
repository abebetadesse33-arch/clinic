/**
 * Performance Optimization - Caching Layer
 * Implements multi-tier caching strategy with intelligent invalidation
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items
  strategy?: "lru" | "lfu" | "fifo"; // Cache eviction strategy
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

/**
 * In-memory LRU Cache with TTL support
 */
export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTtl: number;
  private maxSize: number;
  private strategy: "lru" | "lfu" | "fifo";

  constructor(config: CacheConfig = { ttl: 3600000, maxSize: 1000 }) {
    this.defaultTtl = config.ttl;
    this.maxSize = config.maxSize || 1000;
    this.strategy = config.strategy || "lru";

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl: number = this.defaultTtl): void {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      key,
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessedAt: Date.now(),
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Invalidate keys matching pattern
   */
  invalidatePattern(pattern: RegExp | string): void {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Evict entries based on strategy
   */
  private evict(): void {
    if (this.strategy === "lru") {
      this.evictLRU();
    } else if (this.strategy === "lfu") {
      this.evictLFU();
    } else {
      this.evictFIFO();
    }
  }

  /**
   * LRU eviction - remove least recently used
   */
  private evictLRU(): void {
    let oldest: CacheEntry<T> | null = null;
    let oldestKey: string | null = null;

    this.cache.forEach((entry, key) => {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * LFU eviction - remove least frequently used
   */
  private evictLFU(): void {
    let leastUsed: CacheEntry<T> | null = null;
    let leastUsedKey: string | null = null;

    this.cache.forEach((entry, key) => {
      if (!leastUsed || entry.accessCount < leastUsed.accessCount) {
        leastUsed = entry;
        leastUsedKey = key;
      }
    });

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * FIFO eviction - remove oldest
   */
  private evictFIFO(): void {
    let oldest: CacheEntry<T> | null = null;
    let oldestKey: string | null = null;

    this.cache.forEach((entry, key) => {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = entry;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Remove expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.cache.forEach((entry, key) => {
        if (now > entry.expiresAt) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach((key) => this.cache.delete(key));
    }, 60000); // Every minute
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100,
      strategy: this.strategy,
    };
  }
}

/**
 * Query Result Cache
 */
export class QueryCache extends CacheManager<any> {
  /**
   * Generate cache key from query parameters
   */
  static generateKey(
    resource: string,
    filters?: Record<string, unknown>
  ): string {
    const filterStr = filters
      ? Object.entries(filters)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
          .join("|")
      : "";
    return `query:${resource}:${filterStr}`;
  }

  /**
   * Cache query result
   */
  cacheQuery(
    resource: string,
    result: any,
    filters?: Record<string, unknown>,
    ttl?: number
  ): void {
    const key = QueryCache.generateKey(resource, filters);
    this.set(key, result, ttl);
  }

  /**
   * Get cached query result
   */
  getQuery(
    resource: string,
    filters?: Record<string, unknown>
  ): any | undefined {
    const key = QueryCache.generateKey(resource, filters);
    return this.get(key);
  }

  /**
   * Invalidate queries for resource
   */
  invalidateResource(resource: string): void {
    this.invalidatePattern(`query:${resource}:`);
  }
}

// Global cache instances
export const globalCache = new CacheManager({ ttl: 5 * 60 * 1000, maxSize: 500 });
export const queryCache = new QueryCache({
  ttl: 10 * 60 * 1000,
  maxSize: 1000,
  strategy: "lru",
});

/**
 * Cache-aside pattern helper
 */
export async function getCachedResult<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // Try cache first
  const cached = globalCache.get(cacheKey) as T | undefined;
  if (cached !== undefined) {
    return cached;
  }

  // Fetch and cache
  const result = await fetcher();
  globalCache.set(cacheKey, result, ttl);
  return result;
}
