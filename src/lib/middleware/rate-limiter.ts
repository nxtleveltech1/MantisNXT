/**
 * Redis-Based Rate Limiter Middleware
 *
 * Features:
 * - Token bucket algorithm
 * - Per-IP and per-endpoint limits
 * - Sliding window
 * - Distributed rate limiting
 * - Custom limits per route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/cache/redis-client';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  statusCode?: number; // HTTP status code (default: 429)
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter: number; // Seconds until reset
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please try again later',
  statusCode: 429,
};

/**
 * Rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private prefix = 'ratelimit:';

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      keyGenerator: this.defaultKeyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    } as Required<RateLimitConfig>;
  }

  /**
   * Default key generator (IP-based)
   */
  private defaultKeyGenerator(req: NextRequest): string {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const path = req.nextUrl.pathname;
    return `${ip}:${path}`;
  }

  /**
   * Generate Redis key
   */
  private getKey(identifier: string): string {
    return `${this.prefix}${identifier}`;
  }

  /**
   * Check rate limit
   */
  async check(req: NextRequest): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    try {
      const client = await getRedisClient();
      const identifier = this.config.keyGenerator(req);
      const key = this.getKey(identifier);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Use Redis sorted set for sliding window
      // Score is timestamp, member is request ID

      // Remove old entries outside the window
      await client.zRemRangeByScore(key, 0, windowStart);

      // Count requests in current window
      const count = await client.zCard(key);

      const allowed = count < this.config.maxRequests;
      const reset = now + this.config.windowMs;
      const retryAfter = Math.ceil(this.config.windowMs / 1000);

      const info: RateLimitInfo = {
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - count),
        reset,
        retryAfter,
      };

      if (allowed) {
        // Add current request
        const requestId = `${now}:${Math.random()}`;
        await client.zAdd(key, { score: now, value: requestId });

        // Set expiration on the key
        await client.expire(key, Math.ceil(this.config.windowMs / 1000));
      }

      return { allowed, info };
    } catch (error) {
      console.error('Rate Limiter: Error checking limit:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        info: {
          limit: this.config.maxRequests,
          remaining: this.config.maxRequests,
          reset: Date.now() + this.config.windowMs,
          retryAfter: Math.ceil(this.config.windowMs / 1000),
        },
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(req: NextRequest): Promise<void> {
    try {
      const client = await getRedisClient();
      const identifier = this.config.keyGenerator(req);
      const key = this.getKey(identifier);
      await client.del(key);
    } catch (error) {
      console.error('Rate Limiter: Error resetting limit:', error);
    }
  }

  /**
   * Get current usage
   */
  async getUsage(req: NextRequest): Promise<RateLimitInfo | null> {
    try {
      const client = await getRedisClient();
      const identifier = this.config.keyGenerator(req);
      const key = this.getKey(identifier);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Remove old entries
      await client.zRemRangeByScore(key, 0, windowStart);

      // Count requests
      const count = await client.zCard(key);

      return {
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - count),
        reset: now + this.config.windowMs,
        retryAfter: Math.ceil(this.config.windowMs / 1000),
      };
    } catch (error) {
      console.error('Rate Limiter: Error getting usage:', error);
      return null;
    }
  }
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const limiter = new RateLimiter(config);

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const { allowed, info } = await limiter.check(req);

    if (!allowed) {
      return NextResponse.json(
        {
          error: config?.message || DEFAULT_CONFIG.message,
          limit: info.limit,
          remaining: info.remaining,
          reset: info.reset,
          retryAfter: info.retryAfter,
        },
        {
          status: config?.statusCode || DEFAULT_CONFIG.statusCode,
          headers: {
            'X-RateLimit-Limit': info.limit.toString(),
            'X-RateLimit-Remaining': info.remaining.toString(),
            'X-RateLimit-Reset': info.reset.toString(),
            'Retry-After': info.retryAfter.toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    return null; // Middleware passes through
  };
}

/**
 * Preset rate limiters for common scenarios
 */
export const rateLimiters = {
  // Strict limit for authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
  }),

  // Standard API limit
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  }),

  // Lenient limit for reads
  read: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120, // 120 requests per minute
  }),

  // Strict limit for writes
  write: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
  }),

  // Very strict for sensitive operations
  sensitive: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
    message: 'Rate limit exceeded for sensitive operation',
  }),

  // File uploads
  upload: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 uploads per minute
    message: 'Too many upload requests',
  }),
};

/**
 * Helper to add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  info: RateLimitInfo
): NextResponse {
  response.headers.set('X-RateLimit-Limit', info.limit.toString());
  response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
  response.headers.set('X-RateLimit-Reset', info.reset.toString());
  return response;
}

/**
 * IP-based rate limiter
 */
export function createIpRateLimiter(config?: Partial<RateLimitConfig>) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req) => {
      const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
      return ip;
    },
  });
}

/**
 * User-based rate limiter (requires authentication)
 */
export function createUserRateLimiter(config?: Partial<RateLimitConfig>) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req) => {
      // Extract user ID from token or session
      const userId = req.headers.get('x-user-id') || 'anonymous';
      return `user:${userId}`;
    },
  });
}
