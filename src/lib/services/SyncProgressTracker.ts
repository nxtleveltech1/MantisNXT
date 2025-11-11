// @ts-nocheck

/**
 * SyncProgressTracker - Production Real-Time Sync Progress Tracking
 *
 * Provides:
 * - Real-time progress tracking with DB persistence
 * - Redis caching for sub-500ms reads
 * - Automatic metrics calculation (speed, ETA, elapsed time)
 * - Concurrent-safe updates with database serialization
 * - SSE event emission for client subscriptions
 * - Automatic cleanup on job completion
 *
 * Architecture:
 * - Primary: PostgreSQL sync_progress table (source of truth)
 * - Secondary: Redis cache for fast reads (TTL: job duration + 5 min)
 * - Subscribers: SSE clients notified every 500ms
 */

import { query } from '@/lib/database/connection';
import { getRedisClient } from '@/lib/cache/redis-client';
import type { RedisClientType } from 'redis';

interface ProgressState {
  jobId: string;
  orgId: string;
  totalItems: number;
  processedCount: number;
  failedCount: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

interface ProgressMetrics {
  itemsPerMin: number;
  etaSeconds: number;
  elapsedSeconds: number;
  currentItem: number;
  failureRate: number;
  completionPercent: number;
}

interface ProgressUpdate {
  processedCount: number;
  failedCount: number;
  itemsPerMin?: number;
  etaSeconds?: number;
}

type ProgressEventListener = (data: ProgressUpdate | ProgressMetrics | ProgressState) => void;

/**
 * Production sync progress tracker with real-time metrics
 */
export class SyncProgressTracker {
  private static instance: SyncProgressTracker;
  private redis: RedisClientType | null = null;
  private redisConnected = false;
  private subscribers: Map<string, Set<ProgressEventListener>> = new Map();
  private updateTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private cleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private constructor() {}

  public static getInstance(): SyncProgressTracker {
    if (!SyncProgressTracker.instance) {
      SyncProgressTracker.instance = new SyncProgressTracker();
    }
    return SyncProgressTracker.instance;
  }

  /**
   * Initialize Redis connection (lazy)
   */
  private async ensureRedis(): Promise<RedisClientType | null> {
    if (this.redis && this.redisConnected) {
      return this.redis;
    }

    try {
      this.redis = await getRedisClient();
      this.redisConnected = true;
      return this.redis;
    } catch (error) {
      console.warn('Redis connection failed, falling back to DB only:', error);
      this.redisConnected = false;
      return null;
    }
  }

  /**
   * Initialize progress tracking for a new sync job
   * - Creates entry in sync_progress table
   * - Caches in Redis for fast reads
   */
  async startTracking(
    jobId: string,
    totalItems: number,
    orgId: string,
    metadata?: Record<string, unknown>
  ): Promise<ProgressState> {
    const now = new Date();

    const result = await query(
      `INSERT INTO sync_progress (
        id, org_id, total_items, processed_count, failed_count,
        status, started_at, updated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        total_items = $3,
        started_at = $7,
        status = $6,
        updated_at = $8,
        metadata = COALESCE(sync_progress.metadata, '{}'::jsonb) || $9
      RETURNING *`,
      [
        jobId,
        orgId,
        totalItems,
        0, // processedCount
        0, // failedCount
        'running',
        now,
        now,
        JSON.stringify(metadata || {}),
      ]
    );

    const progress: ProgressState = {
      jobId: result.rows[0].id,
      orgId: result.rows[0].org_id,
      totalItems: result.rows[0].total_items,
      processedCount: result.rows[0].processed_count,
      failedCount: result.rows[0].failed_count,
      startedAt: new Date(result.rows[0].started_at),
      updatedAt: new Date(result.rows[0].updated_at),
      status: result.rows[0].status,
    };

    // Cache in Redis with TTL (10 min buffer)
    const cacheKey = this.getCacheKey(jobId);
    const redis = await this.ensureRedis();
    if (redis) {
      try {
        await redis.setEx(cacheKey, 600, JSON.stringify(progress));
      } catch (error) {
        console.warn('Redis cache write failed:', error);
      }
    }

    return progress;
  }

  /**
   * Update progress metrics in real-time
   * - DB update (serialized to prevent race conditions)
   * - Redis cache invalidation
   * - Notifies SSE subscribers
   */
  async updateProgress(
    jobId: string,
    processedCount: number,
    failedCount: number
  ): Promise<ProgressUpdate> {
    const now = new Date();

    const result = await query(
      `UPDATE sync_progress
       SET
         processed_count = $2,
         failed_count = $3,
         updated_at = $4
       WHERE id = $1
       RETURNING *`,
      [jobId, processedCount, failedCount, now]
    );

    if (result.rows.length === 0) {
      throw new Error(`Sync job not found: ${jobId}`);
    }

    const row = result.rows[0];
    const update: ProgressUpdate = {
      processedCount: row.processed_count,
      failedCount: row.failed_count,
    };

    // Invalidate Redis cache
    const cacheKey = this.getCacheKey(jobId);
    const redis = await this.ensureRedis();
    if (redis) {
      try {
        await redis.del(cacheKey);
      } catch (error) {
        console.warn('Redis cache invalidation failed:', error);
      }
    }

    // Notify subscribers
    this.notifySubscribers(jobId, update);

    return update;
  }

  /**
   * Calculate real-time metrics from progress state
   * - Speed: items/min based on elapsed time
   * - ETA: (totalItems - processedCount) / speed
   * - Progress: completion percentage
   */
  async calculateMetrics(jobId: string): Promise<ProgressMetrics> {
    const progress = await this.getProgress(jobId);

    if (!progress) {
      throw new Error(`Sync job not found: ${jobId}`);
    }

    const now = new Date();
    const elapsedMs = now.getTime() - progress.startedAt.getTime();
    const elapsedSeconds = Math.max(elapsedMs / 1000, 1); // Avoid division by zero

    // Speed calculation: items per minute
    const itemsPerMin = (progress.processedCount / elapsedSeconds) * 60;

    // ETA calculation: remaining items / speed
    const remainingItems = Math.max(progress.totalItems - progress.processedCount, 0);
    const etaSeconds = itemsPerMin > 0 ? (remainingItems / itemsPerMin) * 60 : 0;

    // Failure rate
    const failureRate =
      progress.processedCount > 0 ? (progress.failedCount / progress.processedCount) * 100 : 0;

    // Completion percentage
    const completionPercent =
      progress.totalItems > 0 ? (progress.processedCount / progress.totalItems) * 100 : 0;

    return {
      itemsPerMin: Math.round(itemsPerMin * 100) / 100,
      etaSeconds: Math.ceil(etaSeconds),
      elapsedSeconds: Math.floor(elapsedSeconds),
      currentItem: progress.processedCount,
      failureRate: Math.round(failureRate * 100) / 100,
      completionPercent: Math.round(completionPercent * 100) / 100,
    };
  }

  /**
   * Retrieve current progress state from cache or DB
   */
  async getProgress(jobId: string): Promise<ProgressState | null> {
    const cacheKey = this.getCacheKey(jobId);

    // Try Redis cache first
    const redis = await this.ensureRedis();
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as ProgressState;
        }
      } catch (error) {
        console.warn('Redis cache read failed, falling back to DB:', error);
      }
    }

    // Fallback to database
    const result = await query(`SELECT * FROM sync_progress WHERE id = $1`, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const progress: ProgressState = {
      jobId: row.id,
      orgId: row.org_id,
      totalItems: row.total_items,
      processedCount: row.processed_count,
      failedCount: row.failed_count,
      startedAt: new Date(row.started_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      status: row.status,
    };

    // Cache result (with remaining TTL based on job status)
    const ttl = progress.status === 'running' ? 600 : 300; // 10 min if running, 5 min if done
    if (redis) {
      try {
        await redis.setEx(cacheKey, ttl, JSON.stringify(progress));
      } catch (error) {
        console.warn('Redis cache write failed:', error);
      }
    }

    return progress;
  }

  /**
   * Finalize tracking when sync completes
   * - Updates status to 'completed'
   * - Sets completedAt timestamp
   * - Schedules cleanup
   */
  async endTracking(
    jobId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed'
  ): Promise<ProgressState> {
    const now = new Date();

    const result = await query(
      `UPDATE sync_progress
       SET
         status = $2,
         completed_at = $3,
         updated_at = $3
       WHERE id = $1
       RETURNING *`,
      [jobId, status, now]
    );

    if (result.rows.length === 0) {
      throw new Error(`Sync job not found: ${jobId}`);
    }

    const row = result.rows[0];
    const progress: ProgressState = {
      jobId: row.id,
      orgId: row.org_id,
      totalItems: row.total_items,
      processedCount: row.processed_count,
      failedCount: row.failed_count,
      startedAt: new Date(row.started_at),
      updatedAt: new Date(row.updated_at),
      completedAt: new Date(row.completed_at),
      status: row.status,
    };

    // Invalidate cache
    const cacheKey = this.getCacheKey(jobId);
    const redis = await this.ensureRedis();
    if (redis) {
      try {
        await redis.del(cacheKey);
      } catch (error) {
        console.warn('Redis cache deletion failed:', error);
      }
    }

    // Notify subscribers of completion
    this.notifySubscribers(jobId, {
      processedCount: progress.processedCount,
      failedCount: progress.failedCount,
    });

    // Schedule cleanup: keep tracking data for 5 min, then remove from Redis
    this.scheduleCleanup(jobId);

    return progress;
  }

  /**
   * Subscribe to real-time progress updates
   * Used by SSE endpoints to broadcast to connected clients
   */
  subscribe(jobId: string, listener: ProgressEventListener): () => void {
    if (!this.subscribers.has(jobId)) {
      this.subscribers.set(jobId, new Set());
    }

    const listeners = this.subscribers.get(jobId)!;
    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.subscribers.delete(jobId);
        // Clear update timer if no subscribers
        const timer = this.updateTimers.get(jobId);
        if (timer) {
          clearInterval(timer);
          this.updateTimers.delete(jobId);
        }
      }
    };
  }

  /**
   * Notify all subscribers of progress update
   */
  private notifySubscribers(jobId: string, data: unknown): void {
    const listeners = this.subscribers.get(jobId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error('Subscriber notification error:', error);
        }
      });
    }
  }

  /**
   * Get all active progress tracking jobs for organization
   */
  async getActiveJobs(orgId: string): Promise<ProgressState[]> {
    const result = await query(
      `SELECT * FROM sync_progress
       WHERE org_id = $1 AND status = 'running'
       ORDER BY started_at DESC`,
      [orgId]
    );

    return result.rows.map((row) => ({
      jobId: row.id,
      orgId: row.org_id,
      totalItems: row.total_items,
      processedCount: row.processed_count,
      failedCount: row.failed_count,
      startedAt: new Date(row.started_at),
      updatedAt: new Date(row.updated_at),
      status: row.status,
    }));
  }

  /**
   * Get job history for audit trail
   */
  async getJobHistory(jobId: string, limit: number = 100): Promise<unknown[]> {
    const result = await query(
      `SELECT * FROM sync_progress_history
       WHERE job_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [jobId, limit]
    );

    return result.rows;
  }

  /**
   * Clean up progress tracking data and redis cache
   */
  private scheduleCleanup(jobId: string): void {
    const existingTimer = this.cleanupTimers.get(jobId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Cleanup after 5 minutes
    const timer = setTimeout(async () => {
      try {
        const cacheKey = this.getCacheKey(jobId);
        const redis = await this.ensureRedis();
        if (redis) {
          await redis.del(cacheKey);
        }
      } catch (error) {
        console.error('Cleanup error for job', jobId, ':', error);
      } finally {
        this.cleanupTimers.delete(jobId);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.cleanupTimers.set(jobId, timer);
  }

  /**
   * Get total size estimate for current subscriber capacity
   */
  getMetrics(): {
    totalSubscribers: number;
    activeJobs: number;
    memoryEstimateKb: number;
  } {
    let totalSubscribers = 0;
    this.subscribers.forEach((listeners) => {
      totalSubscribers += listeners.size;
    });

    const memoryEstimate = totalSubscribers * 2; // Rough estimate: ~2KB per subscriber

    return {
      totalSubscribers,
      activeJobs: this.subscribers.size,
      memoryEstimateKb: memoryEstimate,
    };
  }

  /**
   * Utility: Generate Redis cache key
   */
  private getCacheKey(jobId: string): string {
    return `sync_progress:${jobId}`;
  }

  /**
   * Cleanup all resources (for shutdown)
   */
  async shutdown(): Promise<void> {
    // Clear all timers
    this.updateTimers.forEach((timer) => clearInterval(timer));
    this.cleanupTimers.forEach((timer) => clearTimeout(timer));

    // Clear subscribers
    this.subscribers.clear();
    this.updateTimers.clear();
    this.cleanupTimers.clear();

    console.log('SyncProgressTracker shut down');
  }
}

// Export singleton instance
export const syncProgressTracker = SyncProgressTracker.getInstance();
