/**
 * ExtractionMonitor - Real-time monitoring and alerting for extraction pipeline
 *
 * Features:
 * - Real-time queue metrics
 * - Performance tracking
 * - Error alerting
 * - DLQ monitoring
 * - Health checks
 */

import { EventEmitter } from 'events';
import { query } from '@/lib/database';
import { extractionQueue } from './ExtractionJobQueue';
import { extractionMetrics } from './ExtractionMetrics';

export interface QueueMetrics {
  queued: number;
  active: number;
  dlq: number;
  max_concurrency: number;
  utilization_percent: number;
}

export interface PerformanceMetrics {
  jobs_last_hour: number;
  jobs_last_24h: number;
  success_rate_24h: number;
  avg_duration_ms: number;
  rows_processed_24h: number;
  throughput_rows_per_sec: number;
}

export interface ErrorMetrics {
  total_errors_24h: number;
  top_errors: Array<{ code: string; count: number }>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  queue_ok: boolean;
  performance_ok: boolean;
  dlq_ok: boolean;
  last_check: Date;
  issues: string[];
}

/**
 * Extraction pipeline monitor
 */
export class ExtractionMonitor extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private lastHealthStatus: HealthStatus | null = null;

  // Thresholds
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly MAX_DLQ_SIZE = 10;
  private readonly MIN_SUCCESS_RATE = 90; // 90%
  private readonly MAX_AVG_DURATION_MS = 60000; // 60 seconds

  constructor() {
    super();
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.monitoringInterval) {
      console.warn('Extraction monitor already running');
      return;
    }

    console.log('Starting extraction pipeline monitor');

    // Initial check
    this.performHealthCheck();

    // Periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.CHECK_INTERVAL_MS);

    // Listen to queue events
    this.attachQueueListeners();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Extraction pipeline monitor stopped');
    }
  }

  /**
   * Get current queue metrics
   */
  getQueueMetrics(): QueueMetrics {
    const stats = extractionQueue.getStats();

    return {
      ...stats,
      utilization_percent: Math.round((stats.active / stats.max_concurrency) * 100),
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const dashboard = await extractionMetrics.getDashboardMetrics();

    // Calculate throughput (rows per second)
    const throughput = dashboard.avg_duration_ms > 0
      ? Math.round((dashboard.rows_processed_24h / dashboard.jobs_last_24h) / (dashboard.avg_duration_ms / 1000))
      : 0;

    return {
      jobs_last_hour: dashboard.jobs_last_hour,
      jobs_last_24h: dashboard.jobs_last_24h,
      success_rate_24h: dashboard.success_rate_24h,
      avg_duration_ms: dashboard.avg_duration_ms,
      rows_processed_24h: dashboard.rows_processed_24h,
      throughput_rows_per_sec: throughput,
    };
  }

  /**
   * Get error metrics
   */
  async getErrorMetrics(): Promise<ErrorMetrics> {
    const dashboard = await extractionMetrics.getDashboardMetrics();

    const total_errors = dashboard.top_errors.reduce((sum, e) => sum + e.count, 0);

    return {
      total_errors_24h: total_errors,
      top_errors: dashboard.top_errors,
    };
  }

  /**
   * Get DLQ metrics
   */
  async getDLQMetrics(): Promise<{
    size: number;
    oldest_entry_age_minutes: number | null;
    entries_needing_attention: number;
  }> {
    const result = await query<{
      dlq_size: string;
      oldest_age_minutes: string | null;
      needs_attention: string;
    }>(
      `SELECT
        COUNT(*) AS dlq_size,
        EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 60 AS oldest_age_minutes,
        COUNT(*) FILTER (WHERE reprocessed_at IS NULL AND created_at > NOW() - INTERVAL '24 hours') AS needs_attention
       FROM spp.extraction_job_dlq
       WHERE reprocessed_at IS NULL`
    );

    const row = result.rows[0];

    return {
      size: parseInt(row?.dlq_size || '0'),
      oldest_entry_age_minutes: row?.oldest_age_minutes ? parseFloat(row.oldest_age_minutes) : null,
      entries_needing_attention: parseInt(row?.needs_attention || '0'),
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const issues: string[] = [];
    let queue_ok = true;
    let performance_ok = true;
    let dlq_ok = true;

    try {
      // Check queue health
      const queueMetrics = this.getQueueMetrics();
      if (queueMetrics.queued > this.MAX_QUEUE_SIZE) {
        queue_ok = false;
        issues.push(`Queue size (${queueMetrics.queued}) exceeds threshold (${this.MAX_QUEUE_SIZE})`);
      }

      if (queueMetrics.dlq > this.MAX_DLQ_SIZE) {
        dlq_ok = false;
        issues.push(`DLQ size (${queueMetrics.dlq}) exceeds threshold (${this.MAX_DLQ_SIZE})`);
      }

      // Check performance
      const perfMetrics = await this.getPerformanceMetrics();
      if (perfMetrics.success_rate_24h < this.MIN_SUCCESS_RATE && perfMetrics.jobs_last_24h > 10) {
        performance_ok = false;
        issues.push(`Success rate (${perfMetrics.success_rate_24h.toFixed(2)}%) below threshold (${this.MIN_SUCCESS_RATE}%)`);
      }

      if (perfMetrics.avg_duration_ms > this.MAX_AVG_DURATION_MS) {
        performance_ok = false;
        issues.push(`Average duration (${(perfMetrics.avg_duration_ms / 1000).toFixed(2)}s) exceeds threshold (${this.MAX_AVG_DURATION_MS / 1000}s)`);
      }

      // Check DLQ
      const dlqMetrics = await this.getDLQMetrics();
      if (dlqMetrics.entries_needing_attention > 5) {
        dlq_ok = false;
        issues.push(`${dlqMetrics.entries_needing_attention} DLQ entries need attention`);
      }

      // Determine overall status
      let status: HealthStatus['status'] = 'healthy';
      if (!queue_ok || !performance_ok || !dlq_ok) {
        status = issues.length > 2 ? 'unhealthy' : 'degraded';
      }

      const healthStatus: HealthStatus = {
        status,
        queue_ok,
        performance_ok,
        dlq_ok,
        last_check: new Date(),
        issues,
      };

      // Emit status change event
      if (!this.lastHealthStatus || this.lastHealthStatus.status !== healthStatus.status) {
        this.emit('health:status_change', healthStatus);

        if (healthStatus.status === 'unhealthy') {
          this.emit('health:critical', healthStatus);
        } else if (healthStatus.status === 'degraded') {
          this.emit('health:warning', healthStatus);
        }
      }

      this.lastHealthStatus = healthStatus;

      return healthStatus;

    } catch (error) {
      console.error('Health check failed:', error);

      const errorStatus: HealthStatus = {
        status: 'unhealthy',
        queue_ok: false,
        performance_ok: false,
        dlq_ok: false,
        last_check: new Date(),
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };

      this.emit('health:check_failed', errorStatus);

      return errorStatus;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(): Promise<{
    health: HealthStatus;
    queue: QueueMetrics;
    performance: PerformanceMetrics;
    errors: ErrorMetrics;
    dlq: Awaited<ReturnType<typeof this.getDLQMetrics>>;
  }> {
    const [health, queue, performance, errors, dlq] = await Promise.all([
      this.performHealthCheck(),
      Promise.resolve(this.getQueueMetrics()),
      this.getPerformanceMetrics(),
      this.getErrorMetrics(),
      this.getDLQMetrics(),
    ]);

    return {
      health,
      queue,
      performance,
      errors,
      dlq,
    };
  }

  /**
   * Attach queue event listeners
   */
  private attachQueueListeners(): void {
    // Queue backpressure
    extractionQueue.on('queue:backpressure', (data) => {
      this.emit('alert:backpressure', {
        severity: 'warning',
        message: `Queue at capacity: ${data.active}/${data.max} workers active, ${data.queued} jobs queued`,
        data,
      });
    });

    // DLQ alerts
    extractionQueue.on('dlq:alert', (data) => {
      this.emit('alert:dlq', {
        severity: 'critical',
        message: data.message,
        data,
      });
    });

    // Job failures
    extractionQueue.on('job:failed', (job_id, error) => {
      this.emit('alert:job_failed', {
        severity: 'error',
        message: `Job ${job_id} failed: ${error.message}`,
        job_id,
        error,
      });
    });

    // Job retries
    extractionQueue.on('job:retry', (job_id, data) => {
      this.emit('alert:job_retry', {
        severity: 'info',
        message: `Job ${job_id} retry ${data.attempt}/${data.max_attempts} after ${data.delay_ms}ms`,
        job_id,
        data,
      });
    });
  }

  /**
   * Get recent job history
   */
  async getRecentJobs(limit: number = 20): Promise<Array<{
    job_id: string;
    status: string;
    created_at: Date;
    completed_at: Date | null;
    duration_ms: number | null;
    rows_processed: number;
  }>> {
    const result = await query<{
      job_id: string;
      status: string;
      created_at: Date;
      completed_at: Date | null;
      duration_ms: number | null;
      rows_processed: number;
    }>(
      `SELECT
        j.job_id,
        j.status,
        j.created_at,
        j.completed_at,
        EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) * 1000 AS duration_ms,
        COALESCE((j.result->>'total_rows')::INTEGER, 0) AS rows_processed
       FROM spp.extraction_jobs j
       ORDER BY j.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Get hourly job statistics for the last 24 hours
   */
  async getHourlyStats(): Promise<Array<{
    hour: string;
    total: number;
    completed: number;
    failed: number;
    avg_duration_ms: number;
  }>> {
    const result = await query<{
      hour: string;
      total: string;
      completed: string;
      failed: string;
      avg_duration_ms: string;
    }>(
      `SELECT
        DATE_TRUNC('hour', created_at) AS hour,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        ROUND(AVG(duration_ms) FILTER (WHERE status = 'completed'))::INTEGER AS avg_duration_ms
       FROM spp.extraction_metrics
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY DATE_TRUNC('hour', created_at)
       ORDER BY hour DESC`
    );

    return result.rows.map(row => ({
      hour: row.hour,
      total: parseInt(row.total),
      completed: parseInt(row.completed),
      failed: parseInt(row.failed),
      avg_duration_ms: parseInt(row.avg_duration_ms || '0'),
    }));
  }
}

// Export singleton instance
export const extractionMonitor = new ExtractionMonitor();
