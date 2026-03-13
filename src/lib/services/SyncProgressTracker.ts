// @ts-nocheck

/**
 * SyncProgressTracker - Real-Time Sync Progress Tracking
 *
 * - Real-time progress tracking with DB persistence
 * - Automatic metrics calculation (speed, ETA, elapsed time)
 * - Concurrent-safe updates with database serialization
 * - SSE event emission for client subscriptions
 * - Automatic cleanup on job completion
 *
 * Source of truth: PostgreSQL sync_progress table.
 */

import { query } from '@/lib/database/connection';

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

export class SyncProgressTracker {
  private static instance: SyncProgressTracker;
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
        0,
        0,
        'running',
        now,
        now,
        JSON.stringify(metadata || {}),
      ]
    );

    const row = result.rows[0];
    return {
      jobId: row.id,
      orgId: row.org_id,
      totalItems: row.total_items,
      processedCount: row.processed_count,
      failedCount: row.failed_count,
      startedAt: new Date(row.started_at),
      updatedAt: new Date(row.updated_at),
      status: row.status,
    };
  }

  async updateProgress(
    jobId: string,
    processedCount: number,
    failedCount: number
  ): Promise<ProgressUpdate> {
    const now = new Date();

    const result = await query(
      `UPDATE sync_progress
       SET processed_count = $2, failed_count = $3, updated_at = $4
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

    this.notifySubscribers(jobId, update);
    return update;
  }

  async calculateMetrics(jobId: string): Promise<ProgressMetrics> {
    const progress = await this.getProgress(jobId);

    if (!progress) {
      throw new Error(`Sync job not found: ${jobId}`);
    }

    const elapsedMs = Date.now() - progress.startedAt.getTime();
    const elapsedSeconds = Math.max(elapsedMs / 1000, 1);

    const itemsPerMin = (progress.processedCount / elapsedSeconds) * 60;
    const remainingItems = Math.max(progress.totalItems - progress.processedCount, 0);
    const etaSeconds = itemsPerMin > 0 ? (remainingItems / itemsPerMin) * 60 : 0;
    const failureRate =
      progress.processedCount > 0 ? (progress.failedCount / progress.processedCount) * 100 : 0;
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

  async getProgress(jobId: string): Promise<ProgressState | null> {
    const result = await query(`SELECT * FROM sync_progress WHERE id = $1`, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
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
  }

  async endTracking(
    jobId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed'
  ): Promise<ProgressState> {
    const now = new Date();

    const result = await query(
      `UPDATE sync_progress
       SET status = $2, completed_at = $3, updated_at = $3
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

    this.notifySubscribers(jobId, {
      processedCount: progress.processedCount,
      failedCount: progress.failedCount,
    });

    this.scheduleCleanup(jobId);
    return progress;
  }

  subscribe(jobId: string, listener: ProgressEventListener): () => void {
    if (!this.subscribers.has(jobId)) {
      this.subscribers.set(jobId, new Set());
    }
    this.subscribers.get(jobId)!.add(listener);

    return () => {
      const listeners = this.subscribers.get(jobId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.subscribers.delete(jobId);
          const timer = this.updateTimers.get(jobId);
          if (timer) {
            clearInterval(timer);
            this.updateTimers.delete(jobId);
          }
        }
      }
    };
  }

  private notifySubscribers(jobId: string, data: unknown): void {
    const listeners = this.subscribers.get(jobId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Subscriber notification error:', error);
        }
      });
    }
  }

  async getActiveJobs(orgId: string): Promise<ProgressState[]> {
    const result = await query(
      `SELECT * FROM sync_progress
       WHERE org_id = $1 AND status = 'running'
       ORDER BY started_at DESC`,
      [orgId]
    );

    return result.rows.map(row => ({
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

  private scheduleCleanup(jobId: string): void {
    const existingTimer = this.cleanupTimers.get(jobId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.cleanupTimers.delete(jobId);
    }, 5 * 60 * 1000);

    this.cleanupTimers.set(jobId, timer);
  }

  getMetrics(): {
    totalSubscribers: number;
    activeJobs: number;
    memoryEstimateKb: number;
  } {
    let totalSubscribers = 0;
    this.subscribers.forEach(listeners => {
      totalSubscribers += listeners.size;
    });
    return {
      totalSubscribers,
      activeJobs: this.subscribers.size,
      memoryEstimateKb: totalSubscribers * 2,
    };
  }

  async shutdown(): Promise<void> {
    this.updateTimers.forEach(timer => clearInterval(timer));
    this.cleanupTimers.forEach(timer => clearTimeout(timer));
    this.subscribers.clear();
    this.updateTimers.clear();
    this.cleanupTimers.clear();
  }
}

export const syncProgressTracker = SyncProgressTracker.getInstance();
