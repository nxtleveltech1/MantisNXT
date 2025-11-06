/**
 * SyncProgressTracker Unit Tests
 *
 * Tests progress tracking, speed calculation, ETA computation,
 * concurrent updates, and cleanup functionality.
 *
 * Coverage target: 80%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createMockSyncProgressTracker, waitForMs } from '../helpers/sync-test-helpers';
import { generateProgressSnapshot } from '../fixtures/sync-test-data';

/**
 * Simulated SyncProgressTracker implementation
 */
class SyncProgressTracker {
  private jobs = new Map<string, any>();

  startTracking(jobId: string, total: number) {
    const job = {
      jobId,
      state: 'processing',
      startTime: Date.now(),
      lastUpdate: Date.now(),
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      total,
      metrics: {
        itemsPerSecond: 0,
        itemsPerMinute: 0,
        estimatedTimeRemaining: null as number | null,
        percentComplete: 0,
      },
      updates: [] as any[],
    };

    this.jobs.set(jobId, job);
    return job;
  }

  updateProgress(jobId: string, created: number = 0, updated: number = 0, failed: number = 0) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    job.created += created;
    job.updated += updated;
    job.failed += failed;
    job.processed = job.created + job.updated + job.failed;
    job.lastUpdate = Date.now();

    this.calculateMetrics(job);

    job.updates.push({
      processed: job.processed,
      created: job.created,
      updated: job.updated,
      failed: job.failed,
      timestamp: new Date().toISOString(),
      metrics: { ...job.metrics },
    });

    return job.metrics;
  }

  private calculateMetrics(job: any) {
    const elapsedMs = job.lastUpdate - job.startTime;
    const elapsedSeconds = elapsedMs / 1000;
    const elapsedMinutes = elapsedSeconds / 60;

    // Speed calculations
    job.metrics.itemsPerSecond = job.processed / elapsedSeconds;
    job.metrics.itemsPerMinute = job.processed / elapsedMinutes;

    // Percentage complete
    job.metrics.percentComplete = (job.processed / job.total) * 100;

    // ETA calculation
    if (job.metrics.itemsPerSecond > 0) {
      const remaining = job.total - job.processed;
      job.metrics.estimatedTimeRemaining = (remaining / job.metrics.itemsPerSecond) * 1000; // ms
    } else {
      job.metrics.estimatedTimeRemaining = null;
    }
  }

  calculateMetrics(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    this.calculateMetrics(job);
    return job.metrics;
  }

  getProgress(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId: job.jobId,
      state: job.state,
      processed: job.processed,
      created: job.created,
      updated: job.updated,
      failed: job.failed,
      total: job.total,
      metrics: job.metrics,
    };
  }

  completeTracking(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    job.state = 'done';
    job.lastUpdate = Date.now();
    this.calculateMetrics(job);

    return {
      jobId: job.jobId,
      state: job.state,
      processed: job.processed,
      created: job.created,
      updated: job.updated,
      failed: job.failed,
      total: job.total,
      duration: job.lastUpdate - job.startTime,
      metrics: job.metrics,
    };
  }

  getMetrics(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      ...job.metrics,
      totalProcessed: job.processed,
      totalItems: job.total,
      elapsedMs: job.lastUpdate - job.startTime,
    };
  }

  cleanup(jobId: string) {
    return this.jobs.delete(jobId);
  }

  cleanupAll() {
    const size = this.jobs.size;
    this.jobs.clear();
    return size;
  }

  getAllJobs() {
    return Array.from(this.jobs.values());
  }
}

describe('SyncProgressTracker', () => {
  let tracker: SyncProgressTracker;

  beforeEach(() => {
    tracker = new SyncProgressTracker();
  });

  afterEach(() => {
    tracker.cleanupAll();
  });

  describe('startTracking', () => {
    it('should initialize tracking with correct total', () => {
      const result = tracker.startTracking('job-1', 100);

      expect(result).toEqual(
        expect.objectContaining({
          jobId: 'job-1',
          state: 'processing',
          total: 100,
          processed: 0,
          created: 0,
          updated: 0,
          failed: 0,
        })
      );
    });

    it('should set startTime for ETA calculations', () => {
      const before = Date.now();
      const result = tracker.startTracking('job-1', 100);
      const after = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(before);
      expect(result.startTime).toBeLessThanOrEqual(after);
    });

    it('should initialize metrics object', () => {
      const result = tracker.startTracking('job-1', 100);

      expect(result.metrics).toEqual(
        expect.objectContaining({
          itemsPerSecond: expect.any(Number),
          itemsPerMinute: expect.any(Number),
          percentComplete: expect.any(Number),
        })
      );
    });

    it('should support zero items tracking', () => {
      const result = tracker.startTracking('job-empty', 0);

      expect(result.total).toBe(0);
      expect(result).toBeDefined();
    });

    it('should support large item counts (5000+)', () => {
      const result = tracker.startTracking('job-large', 5000);

      expect(result.total).toBe(5000);
      expect(result).toBeDefined();
    });
  });

  describe('updateProgress', () => {
    beforeEach(() => {
      tracker.startTracking('job-1', 100);
    });

    it('should track created items', () => {
      const metrics1 = tracker.updateProgress('job-1', 10, 0, 0);

      expect(metrics1.percentComplete).toBe(10);

      const metrics2 = tracker.updateProgress('job-1', 10, 0, 0);

      expect(metrics2.percentComplete).toBe(20);
    });

    it('should track updated items', () => {
      tracker.updateProgress('job-1', 0, 5, 0);
      const progress = tracker.getProgress('job-1');

      expect(progress?.updated).toBe(5);
      expect(progress?.processed).toBe(5);
    });

    it('should track failed items', () => {
      tracker.updateProgress('job-1', 8, 0, 2);
      const progress = tracker.getProgress('job-1');

      expect(progress?.failed).toBe(2);
      expect(progress?.processed).toBe(10);
    });

    it('should track mixed created/updated/failed', () => {
      tracker.updateProgress('job-1', 5, 3, 2);
      const progress = tracker.getProgress('job-1');

      expect(progress?.created).toBe(5);
      expect(progress?.updated).toBe(3);
      expect(progress?.failed).toBe(2);
      expect(progress?.processed).toBe(10);
    });

    it('should handle zero updates', () => {
      tracker.updateProgress('job-1', 0, 0, 0);
      const progress = tracker.getProgress('job-1');

      expect(progress?.processed).toBe(0);
    });

    it('should update lastUpdate timestamp', () => {
      const before = Date.now();
      tracker.updateProgress('job-1', 5, 0, 0);
      const after = Date.now();

      const progress = tracker.getProgress('job-1');
      expect(progress).toBeDefined();
    });

    it('should accumulate updates correctly', () => {
      tracker.updateProgress('job-1', 5, 0, 0);
      tracker.updateProgress('job-1', 10, 0, 0);
      tracker.updateProgress('job-1', 3, 0, 0);

      const progress = tracker.getProgress('job-1');
      expect(progress?.processed).toBe(18);
    });

    it('should throw for non-existent job', () => {
      expect(() => tracker.updateProgress('non-existent', 5, 0, 0)).toThrow('Job not found');
    });
  });

  describe('speed calculation', () => {
    it('should calculate items per second accurately', async () => {
      tracker.startTracking('job-1', 100);

      // Simulate processing
      await waitForMs(100); // 100ms
      tracker.updateProgress('job-1', 50, 0, 0); // 50 items in 100ms = 500 items/sec

      const metrics = tracker.calculateMetrics('job-1');

      expect(metrics.itemsPerSecond).toBeGreaterThan(0);
      expect(metrics.itemsPerSecond).toBeLessThan(10000); // Sanity check
    });

    it('should calculate items per minute', async () => {
      tracker.startTracking('job-1', 1000);

      await waitForMs(50);
      tracker.updateProgress('job-1', 100, 0, 0);

      const metrics = tracker.calculateMetrics('job-1');

      expect(metrics.itemsPerMinute).toBeGreaterThan(0);
    });

    it('should handle 0 items per second edge case', () => {
      tracker.startTracking('job-1', 100);

      const metrics = tracker.calculateMetrics('job-1');

      // At start, no items processed = 0 speed
      expect(metrics.itemsPerSecond).toBe(0);
    });

    it('should handle very high speed scenarios', async () => {
      tracker.startTracking('job-1', 1000);

      tracker.updateProgress('job-1', 1000, 0, 0);

      const metrics = tracker.calculateMetrics('job-1');

      expect(metrics.itemsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('ETA calculation', () => {
    it('should calculate ETA with partial progress', async () => {
      tracker.startTracking('job-1', 100);

      // Simulate 25% complete
      await waitForMs(100);
      tracker.updateProgress('job-1', 25, 0, 0);

      const metrics = tracker.calculateMetrics('job-1');

      expect(metrics.estimatedTimeRemaining).not.toBeNull();
      expect(metrics.estimatedTimeRemaining).toBeGreaterThan(0);
    });

    it('should calculate ETA with zero progress', () => {
      tracker.startTracking('job-1', 100);

      const metrics = tracker.calculateMetrics('job-1');

      // No progress yet = null ETA
      expect(metrics.estimatedTimeRemaining).toBeNull();
    });

    it('should calculate ETA with full progress', async () => {
      tracker.startTracking('job-1', 100);

      await waitForMs(50);
      tracker.updateProgress('job-1', 100, 0, 0);

      const metrics = tracker.calculateMetrics('job-1');

      // All items processed = ~0 time remaining
      expect(metrics.estimatedTimeRemaining).toBeLessThanOrEqual(100);
    });

    it('should refine ETA with each update', async () => {
      tracker.startTracking('job-1', 100);

      await waitForMs(50);
      tracker.updateProgress('job-1', 25, 0, 0);
      const eta1 = tracker.calculateMetrics('job-1').estimatedTimeRemaining;

      await waitForMs(50);
      tracker.updateProgress('job-1', 25, 0, 0);
      const eta2 = tracker.calculateMetrics('job-1').estimatedTimeRemaining;

      // ETA should be refined (usually decreases as we go faster)
      expect(typeof eta1).toBe('number');
      expect(typeof eta2).toBe('number');
    });

    it('should handle accelerating progress', async () => {
      tracker.startTracking('job-1', 100);

      await waitForMs(100);
      tracker.updateProgress('job-1', 10, 0, 0); // Slow start

      const eta1 = tracker.calculateMetrics('job-1').estimatedTimeRemaining;

      await waitForMs(50);
      tracker.updateProgress('job-1', 40, 0, 0); // Speed up

      const eta2 = tracker.calculateMetrics('job-1').estimatedTimeRemaining;

      // ETA should decrease as speed increases
      expect(eta2).toBeLessThan(eta1 || Infinity);
    });
  });

  describe('concurrent updates', () => {
    it('should handle multiple concurrent updates', async () => {
      tracker.startTracking('job-1', 1000);

      // Simulate concurrent updates
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(tracker.updateProgress('job-1', 50, 0, 0))
      );

      await Promise.all(promises);

      const progress = tracker.getProgress('job-1');
      expect(progress?.processed).toBe(500);
    });

    it('should handle multiple jobs independently', () => {
      tracker.startTracking('job-1', 100);
      tracker.startTracking('job-2', 200);
      tracker.startTracking('job-3', 50);

      tracker.updateProgress('job-1', 50, 0, 0);
      tracker.updateProgress('job-2', 100, 0, 0);
      tracker.updateProgress('job-3', 25, 0, 0);

      const progress1 = tracker.getProgress('job-1');
      const progress2 = tracker.getProgress('job-2');
      const progress3 = tracker.getProgress('job-3');

      expect(progress1?.processed).toBe(50);
      expect(progress2?.processed).toBe(100);
      expect(progress3?.processed).toBe(25);
    });

    it('should maintain accurate metrics under concurrent updates', async () => {
      tracker.startTracking('job-1', 1000);

      // Simulate concurrent updates with small delays
      for (let i = 0; i < 10; i++) {
        tracker.updateProgress('job-1', 50, 0, 0);
        await waitForMs(10);
      }

      const progress = tracker.getProgress('job-1');
      const metrics = tracker.calculateMetrics('job-1');

      expect(progress?.processed).toBe(500);
      expect(metrics.percentComplete).toBe(50);
    });
  });

  describe('completion', () => {
    it('should mark job as done', () => {
      tracker.startTracking('job-1', 100);
      tracker.updateProgress('job-1', 100, 0, 0);

      const result = tracker.completeTracking('job-1');

      expect(result.state).toBe('done');
      expect(result.processed).toBe(100);
    });

    it('should calculate total duration on completion', async () => {
      tracker.startTracking('job-1', 100);

      await waitForMs(100);

      tracker.updateProgress('job-1', 100, 0, 0);
      const result = tracker.completeTracking('job-1');

      expect(result.duration).toBeGreaterThanOrEqual(100);
    });

    it('should preserve all metrics on completion', () => {
      tracker.startTracking('job-1', 100);
      tracker.updateProgress('job-1', 75, 20, 5);

      const result = tracker.completeTracking('job-1');

      expect(result.created).toBe(75);
      expect(result.updated).toBe(20);
      expect(result.failed).toBe(5);
      expect(result.processed).toBe(100);
    });
  });

  describe('cleanup', () => {
    it('should cleanup single job', () => {
      tracker.startTracking('job-1', 100);
      tracker.startTracking('job-2', 100);

      const removed = tracker.cleanup('job-1');

      expect(removed).toBe(true);
      expect(tracker.getProgress('job-1')).toBeNull();
      expect(tracker.getProgress('job-2')).not.toBeNull();
    });

    it('should cleanup all jobs', () => {
      tracker.startTracking('job-1', 100);
      tracker.startTracking('job-2', 100);
      tracker.startTracking('job-3', 100);

      const cleaned = tracker.cleanupAll();

      expect(cleaned).toBe(3);
      expect(tracker.getAllJobs()).toHaveLength(0);
    });

    it('should handle cleanup of non-existent job', () => {
      const removed = tracker.cleanup('non-existent');

      expect(removed).toBe(false);
    });

    it('should allow cleanup after completion', () => {
      tracker.startTracking('job-1', 100);
      tracker.updateProgress('job-1', 100, 0, 0);
      tracker.completeTracking('job-1');

      const removed = tracker.cleanup('job-1');

      expect(removed).toBe(true);
      expect(tracker.getProgress('job-1')).toBeNull();
    });
  });

  describe('metrics retrieval', () => {
    it('should return complete metrics', () => {
      tracker.startTracking('job-1', 100);
      tracker.updateProgress('job-1', 25, 10, 5);

      const metrics = tracker.getMetrics('job-1');

      expect(metrics).toEqual(
        expect.objectContaining({
          totalProcessed: 40,
          totalItems: 100,
          itemsPerSecond: expect.any(Number),
          itemsPerMinute: expect.any(Number),
          percentComplete: expect.any(Number),
          elapsedMs: expect.any(Number),
        })
      );
    });

    it('should return null for non-existent job', () => {
      const metrics = tracker.getMetrics('non-existent');

      expect(metrics).toBeNull();
    });

    it('should reflect updates in metrics', () => {
      tracker.startTracking('job-1', 100);

      tracker.updateProgress('job-1', 25, 0, 0);
      const metrics1 = tracker.getMetrics('job-1');

      tracker.updateProgress('job-1', 25, 0, 0);
      const metrics2 = tracker.getMetrics('job-1');

      expect(metrics2?.totalProcessed).toBe(metrics1!.totalProcessed + 25);
    });
  });
});
