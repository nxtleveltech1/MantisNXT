/**
 * RateLimiter - Database-backed rate limiting service
 *
 * Features:
 * - Per-organization rate limiting
 * - Multiple preset configurations
 * - Sliding window algorithm
 * - Database persistence
 * - Retry-After header calculation
 */

import { query, withTransaction } from '@/lib/database/unified-connection';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit presets
 */
export enum RateLimitPreset {
  UPLOAD = 'upload', // 50 requests per hour
  EXTRACT = 'extract', // 20 requests per hour
  PREVIEW = 'preview', // 100 requests per hour
  IMPORT = 'import', // 10 requests per hour
  API = 'api', // 1000 requests per hour
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number;
  window: number; // in milliseconds
  key_prefix: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retry_after?: number; // in seconds
}

/**
 * Rate limit presets configuration
 */
const RATE_LIMIT_PRESETS: Record<RateLimitPreset, RateLimitConfig> = {
  [RateLimitPreset.UPLOAD]: {
    limit: 50,
    window: 60 * 60 * 1000, // 1 hour
    key_prefix: 'upload',
  },
  [RateLimitPreset.EXTRACT]: {
    limit: 20,
    window: 60 * 60 * 1000, // 1 hour
    key_prefix: 'extract',
  },
  [RateLimitPreset.PREVIEW]: {
    limit: 100,
    window: 60 * 60 * 1000, // 1 hour
    key_prefix: 'preview',
  },
  [RateLimitPreset.IMPORT]: {
    limit: 10,
    window: 60 * 60 * 1000, // 1 hour
    key_prefix: 'import',
  },
  [RateLimitPreset.API]: {
    limit: 1000,
    window: 60 * 60 * 1000, // 1 hour
    key_prefix: 'api',
  },
};

/**
 * Rate limiter service
 */
export class RateLimiter {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(
    key: string,
    preset: RateLimitPreset | RateLimitConfig
  ): Promise<RateLimitResult> {
    const config = typeof preset === 'string' ? RATE_LIMIT_PRESETS[preset] : preset;

    const fullKey = `${config.key_prefix}:${key}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.window);

    return await withTransaction(async client => {
      // Clean up old entries for this key
      await client.query(
        `DELETE FROM rate_limit_entries
         WHERE key = $1 AND timestamp < $2`,
        [fullKey, windowStart]
      );

      // Count requests in current window
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM rate_limit_entries
         WHERE key = $1 AND timestamp >= $2`,
        [fullKey, windowStart]
      );

      const count = parseInt(countResult.rows[0]?.count || '0');
      const remaining = Math.max(0, config.limit - count);
      const allowed = count < config.limit;

      if (allowed) {
        // Record this request
        await client.query(
          `INSERT INTO rate_limit_entries (key, timestamp, ip_address, user_agent)
           VALUES ($1, $2, $3, $4)`,
          [fullKey, now, null, null] // IP and user agent can be added if needed
        );
      }

      // Calculate reset time (when oldest entry expires)
      let reset = new Date(now.getTime() + config.window);
      let retry_after: number | undefined;

      if (!allowed) {
        // Get oldest entry to calculate accurate reset time
        const oldestResult = await client.query<{ timestamp: Date }>(
          `SELECT MIN(timestamp) as timestamp
           FROM rate_limit_entries
           WHERE key = $1`,
          [fullKey]
        );

        if (oldestResult.rows[0]?.timestamp) {
          reset = new Date(oldestResult.rows[0].timestamp.getTime() + config.window);
          retry_after = Math.ceil((reset.getTime() - now.getTime()) / 1000);
        }
      }

      return {
        allowed,
        limit: config.limit,
        remaining,
        reset,
        retry_after,
      };
    });
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string, preset: RateLimitPreset | RateLimitConfig): Promise<void> {
    const config = typeof preset === 'string' ? RATE_LIMIT_PRESETS[preset] : preset;

    const fullKey = `${config.key_prefix}:${key}`;

    await query('DELETE FROM rate_limit_entries WHERE key = $1', [fullKey]);
  }

  /**
   * Get current usage for a key
   */
  async getUsage(
    key: string,
    preset: RateLimitPreset | RateLimitConfig
  ): Promise<{
    count: number;
    first_request: Date | null;
    last_request: Date | null;
  }> {
    const config = typeof preset === 'string' ? RATE_LIMIT_PRESETS[preset] : preset;

    const fullKey = `${config.key_prefix}:${key}`;
    const windowStart = new Date(Date.now() - config.window);

    const result = await query<{
      count: string;
      first_request: Date;
      last_request: Date;
    }>(
      `SELECT
        COUNT(*) as count,
        MIN(timestamp) as first_request,
        MAX(timestamp) as last_request
       FROM rate_limit_entries
       WHERE key = $1 AND timestamp >= $2`,
      [fullKey, windowStart]
    );

    const row = result.rows[0];
    return {
      count: parseInt(row?.count || '0'),
      first_request: row?.first_request || null,
      last_request: row?.last_request || null,
    };
  }

  /**
   * Apply rate limiting middleware
   */
  async middleware(
    request: NextRequest,
    preset: RateLimitPreset,
    keyExtractor?: (req: NextRequest) => string | null
  ): Promise<NextResponse | null> {
    // Extract key from request
    const key = keyExtractor ? keyExtractor(request) : this.extractDefaultKey(request);

    if (!key) {
      // No key available, skip rate limiting
      return null;
    }

    const result = await this.checkLimit(key, preset);

    if (!result.allowed) {
      // Rate limit exceeded
      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retry_after: result.retry_after,
            reset: result.reset,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toISOString(),
            'Retry-After': result.retry_after?.toString() || '60',
          },
        }
      );
    }

    // Rate limit not exceeded, return null to continue
    return null;
  }

  /**
   * Extract default key from request
   */
  private extractDefaultKey(request: NextRequest): string | null {
    // Try to extract organization ID from headers or auth
    const orgId = request.headers.get('x-organization-id');
    if (orgId) {
      return `org:${orgId}`;
    }

    // Try to extract user ID from headers or auth
    const userId = request.headers.get('x-user-id');
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Start periodic cleanup of old entries
   */
  private startCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      async () => {
        await this.cleanup();
      },
      60 * 60 * 1000
    );
  }

  /**
   * Clean up old rate limit entries
   */
  async cleanup(): Promise<number> {
    // Remove entries older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await query('DELETE FROM rate_limit_entries WHERE timestamp < $1', [cutoff]);

    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      console.log(`[RateLimiter] Cleaned up ${deleted} old entries`);
    }

    return deleted;
  }

  /**
   * Get statistics for all rate limits
   */
  async getStatistics(): Promise<
    Array<{
      key_prefix: string;
      unique_keys: number;
      total_requests: number;
      avg_requests_per_key: number;
    }>
  > {
    const result = await query<{
      key_prefix: string;
      unique_keys: string;
      total_requests: string;
      avg_requests: string;
    }>(
      `SELECT
        SPLIT_PART(key, ':', 1) as key_prefix,
        COUNT(DISTINCT key) as unique_keys,
        COUNT(*) as total_requests,
        COUNT(*)::numeric / NULLIF(COUNT(DISTINCT key), 0) as avg_requests
       FROM rate_limit_entries
       WHERE timestamp >= NOW() - INTERVAL '1 hour'
       GROUP BY key_prefix
       ORDER BY total_requests DESC`
    );

    return result.rows.map(row => ({
      key_prefix: row.key_prefix,
      unique_keys: parseInt(row.unique_keys),
      total_requests: parseInt(row.total_requests),
      avg_requests_per_key: parseFloat(row.avg_requests) || 0,
    }));
  }

  /**
   * Shutdown rate limiter
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Create rate limiting middleware for Next.js API routes
 */
export function createRateLimitMiddleware(
  preset: RateLimitPreset,
  keyExtractor?: (req: NextRequest) => string | null
) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    return await rateLimiter.middleware(request, preset, keyExtractor);
  };
}
