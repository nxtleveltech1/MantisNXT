/**
 * Session store (no-op)
 *
 * Redis was removed. This module keeps the same API for compatibility;
 * all operations are no-op. Auth uses Clerk; session count is always 0.
 */

export interface SessionData {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  lastAccess: number;
  expiresAt: number;
}

export interface SessionStoreOptions {
  ttl?: number;
  prefix?: string;
  touchInterval?: number;
}

export class RedisSessionStore {
  async create(
    _sessionId: string,
    _data: Omit<SessionData, 'createdAt' | 'lastAccess' | 'expiresAt'>
  ): Promise<void> {}

  async get(_sessionId: string): Promise<SessionData | null> {
    return null;
  }

  async update(_sessionId: string, _data: Partial<SessionData>): Promise<boolean> {
    return false;
  }

  async touch(_sessionId: string): Promise<boolean> {
    return false;
  }

  async destroy(_sessionId: string): Promise<boolean> {
    return false;
  }

  async getUserSessions(_userId: string): Promise<{ sessionId: string; data: SessionData }[]> {
    return [];
  }

  async destroyUserSessions(_userId: string): Promise<number> {
    return 0;
  }

  async cleanup(): Promise<number> {
    return 0;
  }

  async count(): Promise<number> {
    return 0;
  }
}

export const sessionStore = new RedisSessionStore();
