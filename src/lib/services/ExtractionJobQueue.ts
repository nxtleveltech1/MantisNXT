import { EventEmitter } from 'events';
import { ExtractionWorker } from './ExtractionWorker';
import { extractionMetrics } from './ExtractionMetrics';
import { query } from '@/lib/database';
import type {
  ExtractionJob,
  JobStatus,
  JobProgress,
  ExtractionResult,
} from '@/lib/types/pricelist-extraction';

interface QueuedJob {
  job_id: string;
  upload_id: string;
  config: any;
  priority: number;
  queued_at: Date;
  org_id: string;
  retry_count: number;
}

interface JobState {
  status: JobStatus['status'];
  progress: JobProgress | null;
  error?: { code: string; message: string; details?: any };
  started_at?: Date;
  completed_at?: Date;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

/**
 * Production-grade job queue with proper async/await, backpressure, and retry logic
 */
export class ExtractionJobQueue extends EventEmitter {
  private queue: QueuedJob[] = [];
  private activeJobs: Map<string, ExtractionWorker> = new Map();
  private jobStates: Map<string, JobState> = new Map();
  private maxConcurrency: number;
  private shutdownRequested: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private deadLetterQueue: QueuedJob[] = [];

  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitter: true,
  };

  constructor(maxConcurrency: number = 3) {
    super();
    this.maxConcurrency = maxConcurrency;
    this.startProcessing();
    this.startDLQMonitoring();
  }

  /**
   * Enqueue a new extraction job with priority
   */
  async enqueue(
    job_id: string,
    upload_id: string,
    config: any,
    org_id: string,
    priority: number = 0
  ): Promise<{ position: number; estimated_wait_ms: number }> {
    const job: QueuedJob = {
      job_id,
      upload_id,
      config,
      priority,
      queued_at: new Date(),
      org_id,
      retry_count: 0,
    };

    // Priority queue insertion (higher priority = processed first)
    const insertIndex = this.queue.findIndex(q => q.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    // Initialize job state
    this.jobStates.set(job_id, {
      status: 'queued',
      progress: null,
    });

    // Update database
    await this.updateJobStatus(job_id, 'queued', null, null);

    // Emit event
    this.emit('job:queued', job_id, {
      position: this.queue.findIndex(q => q.job_id === job_id) + 1,
      estimated_wait_ms: this.estimateWaitTime(job_id),
    });

    // Trigger processing
    setImmediate(() => this.processNext());

    return {
      position: this.queue.findIndex(q => q.job_id === job_id) + 1,
      estimated_wait_ms: this.estimateWaitTime(job_id),
    };
  }

  /**
   * Get current job status
   */
  getJobStatus(job_id: string): JobState | null {
    return this.jobStates.get(job_id) || null;
  }

  /**
   * Cancel a job (queued or active)
   */
  async cancelJob(job_id: string): Promise<boolean> {
    // Check if job is in queue
    const queueIndex = this.queue.findIndex(q => q.job_id === job_id);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      await this.setJobCancelled(job_id);
      this.emit('job:cancelled', job_id, 'queued');
      return true;
    }

    // Check if job is active
    const worker = this.activeJobs.get(job_id);
    if (worker) {
      worker.cancel();
      await this.setJobCancelled(job_id);
      this.emit('job:cancelled', job_id, 'processing');
      return true;
    }

    return false;
  }

  /**
   * Process next job in queue (if capacity available)
   */
  private async processNext(): Promise<void> {
    if (this.shutdownRequested) return;

    // Check concurrency limit
    if (this.activeJobs.size >= this.maxConcurrency) {
      this.emit('queue:backpressure', {
        active: this.activeJobs.size,
        queued: this.queue.length,
        max: this.maxConcurrency,
      });
      return;
    }

    if (this.queue.length === 0) return;

    const job = this.queue.shift()!;

    // Update state to processing
    this.jobStates.set(job.job_id, {
      status: 'processing',
      progress: {
        percent_complete: 0,
        current_step: 'Initializing',
        rows_processed: 0,
        rows_total: 0,
        elapsed_ms: 0,
        estimated_remaining_ms: 0,
      },
      started_at: new Date(),
    });

    await this.updateJobStatus(job.job_id, 'processing', null, null);

    // Execute job asynchronously
    this.executeJob(job).catch(err => {
      console.error(`Uncaught error in job ${job.job_id}:`, err);
    });

    // Trigger next job processing
    setImmediate(() => this.processNext());
  }

  /**
   * Execute a job with proper async/await and error handling
   */
  private async executeJob(job: QueuedJob): Promise<void> {
    const startTime = Date.now();
    const worker = new ExtractionWorker();
    let rowsProcessed = 0;

    try {
      // Register worker
      this.activeJobs.set(job.job_id, worker);

      // Wire progress events
      worker.on('progress', (percent: number) => {
        const elapsed = Date.now() - startTime;
        const progress: JobProgress = {
          percent_complete: percent,
          current_step: 'Processing',
          rows_processed: rowsProcessed,
          rows_total: 0,
          elapsed_ms: elapsed,
          estimated_remaining_ms: percent > 0 ? (elapsed / percent) * (100 - percent) : 0,
        };

        this.jobStates.set(job.job_id, {
          ...this.jobStates.get(job.job_id)!,
          progress,
        });

        this.emit('job:progress', job.job_id, progress);
      });

      worker.on('status', (message: string) => {
        const state = this.jobStates.get(job.job_id);
        if (state?.progress) {
          state.progress.current_step = message;
          this.emit('job:status', job.job_id, message);
        }
      });

      worker.on('warning', (message: string) => {
        this.emit('job:warning', job.job_id, message);
      });

      // Execute extraction
      const extractionJob: ExtractionJob = {
        job_id: job.job_id,
        upload_id: job.upload_id,
        config: job.config,
        org_id: job.org_id,
      };

      const result = await worker.execute(extractionJob);
      rowsProcessed = result.stats.total_rows;

      // Mark as completed
      await this.setJobCompleted(job.job_id, result, Date.now() - startTime, rowsProcessed);

      this.emit('job:completed', job.job_id, result);

      // Record metrics
      await extractionMetrics.recordJobCompletion(
        job.job_id,
        'completed',
        Date.now() - startTime,
        rowsProcessed
      );

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Check if we should retry
      if (this.shouldRetry(job, error)) {
        await this.retryJob(job, error);
      } else {
        // Move to DLQ
        await this.moveToDeadLetterQueue(job, error);

        await this.setJobFailed(job.job_id, error, duration, rowsProcessed);

        this.emit('job:failed', job.job_id, error);

        // Record metrics
        await extractionMetrics.recordJobCompletion(
          job.job_id,
          'failed',
          duration,
          rowsProcessed,
          {
            code: error.code || 'EXTRACTION_ERROR',
            message: error.message,
          }
        );
      }
    } finally {
      // Cleanup
      this.activeJobs.delete(job.job_id);

      // Process next job
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Check if job should be retried
   */
  private shouldRetry(job: QueuedJob, error: any): boolean {
    if (job.retry_count >= this.retryConfig.maxAttempts) {
      return false;
    }

    // Don't retry certain error types
    const nonRetryableErrors = [
      'FILE_NOT_FOUND',
      'INVALID_CONFIG',
      'VALIDATION_ERROR',
      'CANCELLED',
    ];

    return !nonRetryableErrors.includes(error.code);
  }

  /**
   * Retry job with exponential backoff
   */
  private async retryJob(job: QueuedJob, error: any): Promise<void> {
    job.retry_count++;

    // Calculate backoff delay
    const delay = this.calculateBackoff(job.retry_count);

    this.emit('job:retry', job.job_id, {
      attempt: job.retry_count,
      max_attempts: this.retryConfig.maxAttempts,
      delay_ms: delay,
      error: error.message,
    });

    // Re-enqueue after delay
    setTimeout(() => {
      const insertIndex = this.queue.findIndex(q => q.priority < job.priority);
      if (insertIndex === -1) {
        this.queue.push(job);
      } else {
        this.queue.splice(insertIndex, 0, job);
      }

      setImmediate(() => this.processNext());
    }, delay);
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempt: number): number {
    const exponentialDelay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
      this.retryConfig.maxDelayMs
    );

    if (this.retryConfig.jitter) {
      // Add random jitter (0-25% of delay)
      const jitter = Math.random() * 0.25 * exponentialDelay;
      return Math.round(exponentialDelay + jitter);
    }

    return exponentialDelay;
  }

  /**
   * Move failed job to dead letter queue
   */
  private async moveToDeadLetterQueue(job: QueuedJob, error: any): Promise<void> {
    this.deadLetterQueue.push(job);

    // Store in database
    await query(
      `INSERT INTO spp.extraction_job_dlq (
        job_id, upload_id, config, org_id, retry_count,
        error_code, error_message, error_details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        job.job_id,
        job.upload_id,
        JSON.stringify(job.config),
        job.org_id,
        job.retry_count,
        error.code || 'UNKNOWN_ERROR',
        error.message,
        JSON.stringify(error.details || {}),
      ]
    );

    this.emit('job:dlq', job.job_id, {
      retry_count: job.retry_count,
      error,
    });
  }

  /**
   * Start periodic DLQ monitoring (for manual retries)
   */
  private startDLQMonitoring(): void {
    setInterval(() => {
      if (this.deadLetterQueue.length > 10) {
        this.emit('dlq:alert', {
          count: this.deadLetterQueue.length,
          message: 'Dead letter queue has accumulated failed jobs',
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    job_id: string,
    status: JobStatus['status'],
    result: ExtractionResult | null,
    error: any
  ): Promise<void> {
    await query(
      `UPDATE spp.extraction_jobs
       SET status = $1, result = $2, error = $3, updated_at = NOW()
       WHERE job_id = $4`,
      [
        status,
        result ? JSON.stringify(result) : null,
        error ? JSON.stringify(error) : null,
        job_id,
      ]
    );
  }

  /**
   * Mark job as completed
   */
  private async setJobCompleted(
    job_id: string,
    result: ExtractionResult,
    duration_ms: number,
    rows_processed: number
  ): Promise<void> {
    const state: JobState = {
      status: 'completed',
      progress: {
        percent_complete: 100,
        current_step: 'Completed',
        rows_processed,
        rows_total: rows_processed,
        elapsed_ms: duration_ms,
        estimated_remaining_ms: 0,
      },
      started_at: this.jobStates.get(job_id)?.started_at,
      completed_at: new Date(),
    };

    this.jobStates.set(job_id, state);
    await this.updateJobStatus(job_id, 'completed', result, null);
  }

  /**
   * Mark job as failed
   */
  private async setJobFailed(
    job_id: string,
    error: any,
    duration_ms: number,
    rows_processed: number
  ): Promise<void> {
    const state: JobState = {
      status: 'failed',
      progress: {
        percent_complete: 0,
        current_step: 'Failed',
        rows_processed,
        rows_total: 0,
        elapsed_ms: duration_ms,
        estimated_remaining_ms: 0,
      },
      error: {
        code: error.code || 'EXTRACTION_ERROR',
        message: error.message,
        details: error.details,
      },
      started_at: this.jobStates.get(job_id)?.started_at,
      completed_at: new Date(),
    };

    this.jobStates.set(job_id, state);
    await this.updateJobStatus(job_id, 'failed', null, state.error);
  }

  /**
   * Mark job as cancelled
   */
  private async setJobCancelled(job_id: string): Promise<void> {
    const state: JobState = {
      status: 'cancelled',
      progress: null,
      completed_at: new Date(),
    };

    this.jobStates.set(job_id, state);
    await this.updateJobStatus(job_id, 'cancelled', null, null);

    // Record metrics
    await extractionMetrics.recordJobCompletion(
      job_id,
      'cancelled',
      0,
      0
    );
  }

  /**
   * Estimate wait time based on queue position
   */
  private estimateWaitTime(job_id: string): number {
    const position = this.queue.findIndex(q => q.job_id === job_id);
    if (position === -1) return 0;

    // Average job duration (fallback to 30s)
    const avgDurationMs = 30000;

    // Calculate how many jobs are ahead considering concurrency
    const jobsAhead = Math.max(0, position - this.maxConcurrency + this.activeJobs.size);

    return jobsAhead * avgDurationMs;
  }

  /**
   * Start background processing loop
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processNext();
    }, 1000);
  }

  /**
   * Graceful shutdown with timeout
   */
  async shutdown(timeout: number = 60000): Promise<void> {
    this.shutdownRequested = true;

    // Stop accepting new jobs
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Wait for active jobs to complete
    const startTime = Date.now();
    while (this.activeJobs.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Force cancel remaining jobs
    for (const [job_id, worker] of this.activeJobs.entries()) {
      worker.cancel();
      await this.setJobCancelled(job_id);
    }

    this.emit('queue:shutdown', {
      remaining_jobs: this.queue.length,
      active_jobs: this.activeJobs.size,
      dlq_size: this.deadLetterQueue.length,
    });
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get active job count
   */
  getActiveCount(): number {
    return this.activeJobs.size;
  }

  /**
   * Get dead letter queue size
   */
  getDLQSize(): number {
    return this.deadLetterQueue.length;
  }

  /**
   * Get queue stats
   */
  getStats(): {
    queued: number;
    active: number;
    dlq: number;
    max_concurrency: number;
  } {
    return {
      queued: this.queue.length,
      active: this.activeJobs.size,
      dlq: this.deadLetterQueue.length,
      max_concurrency: this.maxConcurrency,
    };
  }
}

// Export singleton instance
export const extractionQueue = new ExtractionJobQueue(
  parseInt(process.env.EXTRACTION_MAX_CONCURRENCY || '3')
);
