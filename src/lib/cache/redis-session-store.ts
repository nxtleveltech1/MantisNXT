/**
 * Redis Session Store
 *
 * High-performance session storage with:
 * - Automatic expiration
 * - Session cleanup
 * - Atomic operations
 * - Type-safe interfaces
 */

import { getRedisClient } from './redis-client';

export interface SessionData {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
  createdAt: number;
  lastAccess: number;
  expiresAt: number;
}

export interface SessionStoreOptions {
  ttl?: number; // Time to live in seconds (default: 24 hours)
  prefix?: string; // Key prefix (default: 'session:')
  touchInterval?: number; // Minimum interval between session updates (default: 60s)
}

const DEFAULT_OPTIONS: Required<SessionStoreOptions> = {
  ttl: 24 * 60 * 60, // 24 hours
  prefix: 'session:',
  touchInterval: 60, // 60 seconds
};

export class RedisSessionStore {
  private options: Required<SessionStoreOptions>;

  constructor(options: SessionStoreOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate session key
   */
  private getKey(sessionId: string): string {
    return `${this.options.prefix}${sessionId}`;
  }

  /**
   * Create new session
   */
  async create(sessionId: string, data: Omit<SessionData, 'createdAt' | 'lastAccess' | 'expiresAt'>): Promise<void> {
    const client = await getRedisClient();
    const now = Date.now();

    const sessionData: SessionData = {
      ...data,
      createdAt: now,
      lastAccess: now,
      expiresAt: now + (this.options.ttl * 1000),
    };

    await client.setEx(
      this.getKey(sessionId),
      this.options.ttl,
      JSON.stringify(sessionData)
    );
  }

  /**
   * Get session data
   */
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const client = await getRedisClient();
      const data = await client.get(this.getKey(sessionId));

      if (!data) return null;

      const session: SessionData = JSON.parse(data);

      // Check if expired
      if (session.expiresAt < Date.now()) {
        await this.destroy(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Redis Session Store: Error getting session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async update(sessionId: string, data: Partial<SessionData>): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const existing = await this.get(sessionId);

      if (!existing) return false;

      const updated: SessionData = {
        ...existing,
        ...data,
        lastAccess: Date.now(),
      };

      await client.setEx(
        this.getKey(sessionId),
        this.options.ttl,
        JSON.stringify(updated)
      );

      return true;
    } catch (error) {
      console.error('Redis Session Store: Error updating session:', error);
      return false;
    }
  }

  /**
   * Touch session (update last access time)
   */
  async touch(sessionId: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const existing = await this.get(sessionId);

      if (!existing) return false;

      // Only update if touch interval has passed
      if (Date.now() - existing.lastAccess < this.options.touchInterval * 1000) {
        return true; // Skip update, but consider it successful
      }

      existing.lastAccess = Date.now();

      await client.setEx(
        this.getKey(sessionId),
        this.options.ttl,
        JSON.stringify(existing)
      );

      return true;
    } catch (error) {
      console.error('Redis Session Store: Error touching session:', error);
      return false;
    }
  }

  /**
   * Destroy session
   */
  async destroy(sessionId: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const result = await client.del(this.getKey(sessionId));
      return result > 0;
    } catch (error) {
      console.error('Redis Session Store: Error destroying session:', error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<{ sessionId: string; data: SessionData }[]> {
    try {
      const client = await getRedisClient();
      const pattern = `${this.options.prefix}*`;
      const keys = [];

      // Scan for matching keys
      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(key);
      }

      const sessions: { sessionId: string; data: SessionData }[] = [];

      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const session: SessionData = JSON.parse(data);
          if (session.userId === userId) {
            sessions.push({
              sessionId: key.replace(this.options.prefix, ''),
              data: session,
            });
          }
        }
      }

      return sessions;
    } catch (error) {
      console.error('Redis Session Store: Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId: string): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      const client = await getRedisClient();

      let destroyed = 0;
      for (const { sessionId } of sessions) {
        const result = await client.del(this.getKey(sessionId));
        if (result > 0) destroyed++;
      }

      return destroyed;
    } catch (error) {
      console.error('Redis Session Store: Error destroying user sessions:', error);
      return 0;
    }
  }

  /**
   * Cleanup expired sessions (maintenance task)
   */
  async cleanup(): Promise<number> {
    try {
      const client = await getRedisClient();
      const pattern = `${this.options.prefix}*`;
      const now = Date.now();
      let cleaned = 0;

      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        const data = await client.get(key);
        if (data) {
          const session: SessionData = JSON.parse(data);
          if (session.expiresAt < now) {
            await client.del(key);
            cleaned++;
          }
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Redis Session Store: Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Get session count
   */
  async count(): Promise<number> {
    try {
      const client = await getRedisClient();
      const pattern = `${this.options.prefix}*`;
      let count = 0;

      for await (const _key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        count++;
      }

      return count;
    } catch (error) {
      console.error('Redis Session Store: Error counting sessions:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const sessionStore = new RedisSessionStore();
