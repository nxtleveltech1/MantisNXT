/**
 * Odoo Authentication Cache
 *
 * In-memory cache for Odoo authentication tokens to prevent excessive auth requests
 * Implements TTL and automatic cleanup
 *
 * Author: Claude Code
 * Date: 2025-11-04
 */

export interface OdooCachedAuth {
  uid: number;
  timestamp: number;
  expiresAt: number;
  serverUrl: string;
  database: string;
  username: string;
}

export class OdooAuthCache {
  private cache: Map<string, OdooCachedAuth> = new Map();
  private defaultTTL: number = 60 * 60 * 1000; // 60 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttl?: number) {
    if (ttl) {
      this.defaultTTL = ttl;
    }

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Generate cache key from config
   */
  private getCacheKey(serverUrl: string, database: string, username: string): string {
    return `${serverUrl}:${database}:${username}`;
  }

  /**
   * Get cached authentication
   */
  get(serverUrl: string, database: string, username: string): OdooCachedAuth | null {
    const key = this.getCacheKey(serverUrl, database, username);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Set cached authentication
   */
  set(serverUrl: string, database: string, username: string, uid: number, ttl?: number): void {
    const key = this.getCacheKey(serverUrl, database, username);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      uid,
      timestamp: now,
      expiresAt,
      serverUrl,
      database,
      username,
    });
  }

  /**
   * Invalidate cached authentication
   */
  invalidate(serverUrl: string, database: string, username: string): void {
    const key = this.getCacheKey(serverUrl, database, username);
    this.cache.delete(key);
  }

  /**
   * Clear all cached authentications
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    // Convert entries to array first to avoid iterator issues
    const entries = Array.from(this.cache.entries());
    for (const [key, value] of entries) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[OdooAuthCache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all cached entries (for debugging)
   */
  getAll(): OdooCachedAuth[] {
    return Array.from(this.cache.values());
  }

  /**
   * Check if cache has entry
   */
  has(serverUrl: string, database: string, username: string): boolean {
    return this.get(serverUrl, database, username) !== null;
  }
}

/**
 * Global singleton instance
 */
let globalAuthCache: OdooAuthCache | null = null;

/**
 * Get global auth cache instance
 */
export function getOdooAuthCache(): OdooAuthCache {
  if (!globalAuthCache) {
    globalAuthCache = new OdooAuthCache();
  }
  return globalAuthCache;
}

/**
 * Request queue to serialize authentication calls
 */
class AuthRequestQueue {
  private queue: Map<string, Promise<number>> = new Map();

  /**
   * Execute authentication with queue serialization
   * Ensures only one auth request per unique config at a time
   */
  async execute(key: string, authFn: () => Promise<number>): Promise<number> {
    // Check if auth is already in progress for this key
    const existingPromise = this.queue.get(key);
    if (existingPromise) {
      console.log(`[AuthRequestQueue] Waiting for existing auth request: ${key}`);
      return existingPromise;
    }

    // Create new auth promise
    const authPromise = authFn().finally(() => {
      // Remove from queue when complete
      this.queue.delete(key);
    });

    this.queue.set(key, authPromise);
    return authPromise;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.clear();
  }
}

/**
 * Global auth request queue
 */
let globalAuthQueue: AuthRequestQueue | null = null;

/**
 * Get global auth request queue
 */
export function getAuthRequestQueue(): AuthRequestQueue {
  if (!globalAuthQueue) {
    globalAuthQueue = new AuthRequestQueue();
  }
  return globalAuthQueue;
}
