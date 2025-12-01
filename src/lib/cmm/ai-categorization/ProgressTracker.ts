/**
 * Progress Tracker Service
 * Manages real-time progress tracking for AI categorization jobs
 */

import { query as dbQuery } from '@/lib/database/unified-connection';
import type { BatchProgress, ProgressMetrics } from './types';

export class ProgressTracker {
  /**
   * Create a new batch progress record
   */
  async createBatchProgress(params: {
    job_id: string;
    batch_number: number;
    batch_offset: number;
    batch_size: number;
    products_in_batch: number;
  }): Promise<string> {
    const sql = `
      INSERT INTO core.ai_categorization_progress (
        job_id, batch_number, batch_offset, batch_size, products_in_batch
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING progress_id
    `;

    const result = await dbQuery<{ progress_id: string }>(sql, [
      params.job_id,
      params.batch_number,
      params.batch_offset,
      params.batch_size,
      params.products_in_batch,
    ]);

    return result.rows[0].progress_id;
  }

  /**
   * Update batch progress with completion metrics
   */
  async completeBatchProgress(params: {
    progress_id: string;
    successful_count: number;
    failed_count: number;
    skipped_count: number;
    duration_ms: number;
    tokens_used?: number;
    provider_used?: string | null;
    error_message?: string | null;
  }): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_progress
      SET 
        successful_count = $2,
        failed_count = $3,
        skipped_count = $4,
        duration_ms = $5,
        tokens_used = $6,
        provider_used = $7,
        completed_at = NOW(),
        error_message = $8
      WHERE progress_id = $1
    `;

    await dbQuery(sql, [
      params.progress_id,
      params.successful_count,
      params.failed_count,
      params.skipped_count,
      params.duration_ms,
      params.tokens_used || null,
      params.provider_used || null,
      params.error_message || null,
    ]);
  }

  /**
   * Get progress metrics for a job
   */
  async getProgress(jobId: string): Promise<ProgressMetrics | null> {
    const sql = `
      WITH batch_stats AS (
        SELECT 
          COUNT(*) as completed_batches,
          AVG(duration_ms) as avg_batch_duration,
          SUM(tokens_used) as total_tokens
        FROM core.ai_categorization_progress
        WHERE job_id = $1 AND completed_at IS NOT NULL
      )
      SELECT 
        j.job_id,
        j.total_products,
        j.processed_products,
        j.successful_categorizations,
        j.failed_categorizations,
        j.skipped_products,
        CASE 
          WHEN j.total_products > 0 
          THEN ROUND((j.processed_products::DECIMAL / j.total_products::DECIMAL) * 100, 2)
          ELSE 0
        END as progress_percentage,
        COALESCE(j.current_batch_offset / NULLIF(j.batch_size, 0), 0) as current_batch,
        CEIL(j.total_products::DECIMAL / NULLIF(j.batch_size, 0)::DECIMAL) as total_batches,
        CASE
          WHEN j.processed_products > 0 AND bs.avg_batch_duration IS NOT NULL THEN
            ROUND(
              ((j.total_products - j.processed_products)::DECIMAL / j.batch_size::DECIMAL) 
              * (bs.avg_batch_duration / 1000.0)
            )
          ELSE NULL
        END as eta_seconds,
        bs.avg_batch_duration::BIGINT as avg_batch_duration_ms
      FROM core.ai_categorization_job j
      CROSS JOIN batch_stats bs
      WHERE j.job_id = $1
    `;

    const result = await dbQuery<ProgressMetrics>(sql, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Get recent batch progress records for a job
   */
  async getRecentBatches(jobId: string, limit: number = 10): Promise<BatchProgress[]> {
    const sql = `
      SELECT 
        progress_id,
        job_id,
        batch_number,
        batch_offset,
        batch_size,
        products_in_batch,
        successful_count,
        failed_count,
        skipped_count,
        duration_ms,
        tokens_used,
        provider_used,
        started_at,
        completed_at,
        error_message
      FROM core.ai_categorization_progress
      WHERE job_id = $1
      ORDER BY batch_number DESC
      LIMIT $2
    `;

    const result = await dbQuery<BatchProgress>(sql, [jobId, limit]);
    return result.rows;
  }

  /**
   * Update job progress counters
   */
  async updateJobProgress(params: {
    job_id: string;
    processed_products: number;
    successful_categorizations: number;
    failed_categorizations: number;
    skipped_products: number;
    current_batch_offset: number;
    tokens_used?: number;
  }): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET 
        processed_products = $2,
        successful_categorizations = $3,
        failed_categorizations = $4,
        skipped_products = $5,
        current_batch_offset = $6,
        total_tokens_used = COALESCE(total_tokens_used, 0) + COALESCE($7, 0),
        last_activity_at = NOW()
      WHERE job_id = $1
    `;

    await dbQuery(sql, [
      params.job_id,
      params.processed_products,
      params.successful_categorizations,
      params.failed_categorizations,
      params.skipped_products,
      params.current_batch_offset,
      params.tokens_used || 0,
    ]);
  }

  /**
   * Calculate and update average batch duration
   */
  async updateAverageBatchDuration(jobId: string): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job j
      SET avg_batch_duration_ms = (
        SELECT AVG(duration_ms)::BIGINT
        FROM core.ai_categorization_progress
        WHERE job_id = j.job_id 
          AND completed_at IS NOT NULL
          AND duration_ms IS NOT NULL
      )
      WHERE j.job_id = $1
    `;

    await dbQuery(sql, [jobId]);
  }

  /**
   * Get error summary for a job
   */
  async getErrorSummary(
    jobId: string,
    limit: number = 20
  ): Promise<
    Array<{
      batch_number: number;
      error_message: string;
      products_in_batch: number;
      timestamp: Date;
    }>
  > {
    const sql = `
      SELECT 
        batch_number,
        error_message,
        products_in_batch,
        completed_at as timestamp
      FROM core.ai_categorization_progress
      WHERE job_id = $1 
        AND error_message IS NOT NULL
      ORDER BY batch_number DESC
      LIMIT $2
    `;

    const result = await dbQuery<{
      batch_number: number;
      error_message: string;
      products_in_batch: number;
      timestamp: Date;
    }>(sql, [jobId, limit]);

    return result.rows;
  }

  /**
   * Get performance metrics for a job
   */
  async getPerformanceMetrics(jobId: string): Promise<{
    avg_products_per_second: number;
    avg_tokens_per_product: number;
    success_rate: number;
    total_duration_ms: number;
  } | null> {
    const sql = `
      WITH batch_metrics AS (
        SELECT 
          SUM(successful_count + failed_count + skipped_count) as total_processed,
          SUM(successful_count) as total_successful,
          SUM(duration_ms) as total_duration_ms,
          SUM(tokens_used) as total_tokens
        FROM core.ai_categorization_progress
        WHERE job_id = $1 AND completed_at IS NOT NULL
      )
      SELECT 
        CASE 
          WHEN total_duration_ms > 0 
          THEN ROUND((total_processed * 1000.0) / total_duration_ms, 2)
          ELSE 0
        END as avg_products_per_second,
        CASE
          WHEN total_processed > 0
          THEN ROUND(total_tokens::DECIMAL / total_processed, 2)
          ELSE 0
        END as avg_tokens_per_product,
        CASE
          WHEN total_processed > 0
          THEN ROUND((total_successful::DECIMAL / total_processed) * 100, 2)
          ELSE 0
        END as success_rate,
        COALESCE(total_duration_ms, 0) as total_duration_ms
      FROM batch_metrics
    `;

    const result = await dbQuery<{
      avg_products_per_second: number;
      avg_tokens_per_product: number;
      success_rate: number;
      total_duration_ms: number;
    }>(sql, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Clean up old progress records (older than 30 days)
   */
  async cleanupOldProgress(daysToKeep: number = 30): Promise<number> {
    const sql = `
      DELETE FROM core.ai_categorization_progress
      WHERE completed_at < NOW() - INTERVAL '${daysToKeep} days'
      RETURNING progress_id
    `;

    const result = await dbQuery(sql);
    return result.rowCount || 0;
  }
}

// Singleton instance
export const progressTracker = new ProgressTracker();
