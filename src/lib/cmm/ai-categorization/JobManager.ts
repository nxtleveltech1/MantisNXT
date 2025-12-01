/**
 * Job Manager Service
 * Manages AI categorization jobs with chunked processing and resumability
 */

import { query as dbQuery } from '@/lib/database/unified-connection';
import { enrichProductsForCategorization } from '../sip-product-enrichment';
import { CategorizationEngine } from './CategorizationEngine';
import { ProgressTracker } from './ProgressTracker';
import type { Job, JobParams, JobStatus, JobFilters, JobStatus_Detail } from './types';
import { DEFAULT_JOB_CONFIG } from './types';

export class JobManager {
  private categorizationEngine: CategorizationEngine;
  private progressTracker: ProgressTracker;
  private activeJobs: Map<string, boolean> = new Map(); // Track running jobs

  constructor() {
    this.categorizationEngine = new CategorizationEngine(
      DEFAULT_JOB_CONFIG.default_confidence_threshold
    );
    this.progressTracker = new ProgressTracker();
  }

  /**
   * Create a new categorization job
   */
  async createJob(params: JobParams): Promise<string> {
    // Estimate total products
    const estimatedProducts = await this.estimateProducts(params.filters || {});
    const productLimit =
      typeof params.product_limit === 'number' && params.product_limit > 0
        ? Math.min(params.product_limit, estimatedProducts)
        : estimatedProducts;

    const batchSize = Math.min(
      params.batch_size || DEFAULT_JOB_CONFIG.default_batch_size,
      DEFAULT_JOB_CONFIG.max_batch_size
    );

    const sql = `
      INSERT INTO core.ai_categorization_job (
        job_type,
        total_products,
        batch_size,
        filters,
        config,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING job_id
    `;

    const result = await dbQuery<{ job_id: string }>(sql, [
      params.job_type,
      productLimit,
      batchSize,
      JSON.stringify(params.filters || {}),
      JSON.stringify(params.config || {}),
      params.created_by || 'system',
    ]);

    return result.rows[0].job_id;
  }

  /**
   * Process a job with chunked, resumable processing
   */
  async processJob(jobId: string): Promise<void> {
    console.log(`\n🚀 [JobManager] ============================================`);
    console.log(`🚀 [JobManager] STARTING JOB PROCESSING: ${jobId}`);
    console.log(`🚀 [JobManager] ============================================\n`);

    // Check if job is already running
    if (this.activeJobs.get(jobId)) {
      throw new Error(`Job ${jobId} is already running`);
    }

    // Mark job as active
    this.activeJobs.set(jobId, true);
    console.log(`[JobManager] Job ${jobId} marked as active`);

    try {
      // Get job details
      console.log(`[JobManager] Fetching job details for ${jobId}`);
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      console.log(
        `[JobManager] Job details: status=${job.status}, total_products=${job.total_products}, batch_size=${job.batch_size}`
      );

      // Validate job status
      if (job.status !== 'queued' && job.status !== 'paused') {
        throw new Error(`Job ${jobId} is not in a processable state: ${job.status}`);
      }

      // Mark as running
      console.log(`[JobManager] Updating job status to 'running'`);
      await this.updateJobStatus(jobId, 'running');
      await this.updateJobStartTime(jobId);

      const config = job.config || {};
      const filters = job.filters || {};
      console.log(`[JobManager] Job config:`, config);
      console.log(`[JobManager] Job filters:`, filters);

      // Process in batches with resumability
      let currentOffset = job.current_batch_offset;
      let batchNumber = Math.floor(currentOffset / job.batch_size);

      while (currentOffset < job.total_products) {
        // Check if job should be paused/cancelled
        const currentStatus = await this.getJobStatus_Raw(jobId);
        if (currentStatus === 'cancelled' || currentStatus === 'paused') {
          console.log(`[JobManager] Job ${jobId} ${currentStatus}, stopping processing`);
          break;
        }

        try {
          console.log(
            `[JobManager] Job ${jobId} fetching batch ${batchNumber} (offset=${currentOffset}, size=${job.batch_size})`
          );

          // Fetch products for this batch
          const products = await this.fetchProductsForBatch(job.batch_size, currentOffset, filters);
          console.log(
            `[JobManager] Job ${jobId} batch ${batchNumber} fetched ${products.length} products`
          );

          if (products.length === 0) {
            console.log(`[JobManager] No more products to process for job ${jobId}`);
            break;
          }

          // Create progress record
          const progressId = await this.progressTracker.createBatchProgress({
            job_id: jobId,
            batch_number: batchNumber,
            batch_offset: currentOffset,
            batch_size: job.batch_size,
            products_in_batch: products.length,
          });
          console.log(
            `[JobManager] Job ${jobId} batch ${batchNumber} progress record ${progressId} created`
          );

          // Mark products as processing
          await this.categorizationEngine.markProductsAsProcessing(
            products.map(p => p.supplier_product_id)
          );
          console.log(
            `[JobManager] Job ${jobId} batch ${batchNumber} marked ${products.length} products as processing`
          );

          // Process batch with AI
          const batchStartTime = Date.now();
          console.log(`[JobManager] Job ${jobId} batch ${batchNumber} invoking categorizeBatch`);
          const batchResult = await this.categorizationEngine.categorizeBatch(
            products,
            config,
            (config as unknown)?.org_id || (config as unknown)?.orgId || null,
            jobId
          );
          batchResult.batch_number = batchNumber;
          console.log(
            `[JobManager] Job ${jobId} batch ${batchNumber} categorizeBatch returned: success=${batchResult.successful}, failed=${batchResult.failed}, skipped=${batchResult.skipped}, pending_review=${batchResult.pending_review}`
          );

          // Apply results to database
          const applyResult = await this.categorizationEngine.applyCategorizationResults(
            batchResult.results,
            jobId
          );
          console.log(
            `[JobManager] Job ${jobId} batch ${batchNumber} apply results -> errors=${applyResult.errors.length}`
          );

          // Complete batch progress
          await this.progressTracker.completeBatchProgress({
            progress_id: progressId,
            successful_count: batchResult.successful,
            failed_count: batchResult.failed,
            skipped_count: batchResult.skipped + batchResult.pending_review,
            duration_ms: batchResult.duration_ms,
            tokens_used: batchResult.tokens_used,
            provider_used: batchResult.results[0]?.provider ?? null,
            error_message:
              applyResult.errors.length > 0
                ? `${applyResult.errors.length} products failed to update`
                : null,
          });

          // Update job progress
          const processedSoFar = currentOffset + products.length;
          await this.progressTracker.updateJobProgress({
            job_id: jobId,
            processed_products: processedSoFar,
            successful_categorizations: job.successful_categorizations + batchResult.successful,
            failed_categorizations: job.failed_categorizations + batchResult.failed,
            skipped_products:
              job.skipped_products + batchResult.skipped + batchResult.pending_review,
            current_batch_offset: processedSoFar,
            tokens_used: batchResult.tokens_used,
          });

          // Update average batch duration
          await this.progressTracker.updateAverageBatchDuration(jobId);

          // Log batch completion
          console.log(
            `[JobManager] Job ${jobId} batch ${batchNumber}: ${batchResult.successful} succeeded, ${batchResult.failed} failed, ${batchResult.skipped} skipped, ${batchResult.pending_review} pending_review`
          );

          // Move to next batch
          currentOffset += products.length;
          batchNumber++;

          // Add delay between batches if configured
          const batchDelay = config.batch_delay_ms || DEFAULT_JOB_CONFIG.batch_delay_ms;
          if (batchDelay > 0 && currentOffset < job.total_products) {
            await new Promise(resolve => setTimeout(resolve, batchDelay));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Batch processing error';
          console.error(
            `[JobManager] ERROR processing batch ${batchNumber} for job ${jobId}:`,
            error
          );

          // Increment error count
          await this.incrementErrorCount(jobId, errorMessage);

          // Check if we should fail the job
          const maxRetries = config.max_retries || DEFAULT_JOB_CONFIG.max_retries;
          const job_updated = await this.getJob(jobId);
          if (job_updated && job_updated.error_count >= maxRetries) {
            console.error(`[JobManager] Job ${jobId} exceeded max retries, failing`);
            await this.updateJobStatus(jobId, 'failed', errorMessage);
            break;
          }

          // Continue to next batch on error
          currentOffset += job.batch_size;
          batchNumber++;
        }
      }

      // Check final status
      const finalStatus = await this.getJobStatus_Raw(jobId);
      if (finalStatus === 'running') {
        // Job completed successfully
        await this.completeJob(jobId);
        console.log(`[JobManager] Job ${jobId} completed successfully`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Job processing failed';
      console.error(`[JobManager] Fatal error processing job ${jobId}:`, error);
      await this.updateJobStatus(jobId, 'failed', errorMessage);
    } finally {
      // Mark job as no longer active
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Pause a running job
   */
  async pauseJob(jobId: string): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET 
        status = 'paused',
        paused_at = NOW()
      WHERE job_id = $1 AND status = 'running'
    `;

    await dbQuery(sql, [jobId]);
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET 
        status = 'queued',
        paused_at = NULL
      WHERE job_id = $1 AND status = 'paused'
    `;

    await dbQuery(sql, [jobId]);

    // Start processing in background (don't await)
    this.processJob(jobId).catch(err => {
      console.error(`[JobManager] Error resuming job ${jobId}:`, err);
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET 
        status = 'cancelled',
        cancelled_at = NOW()
      WHERE job_id = $1 AND status IN ('queued', 'running', 'paused')
    `;

    await dbQuery(sql, [jobId]);
  }

  /**
   * Get detailed job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus_Detail | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const progress = await this.progressTracker.getProgress(jobId);
    const errors = await this.progressTracker.getErrorSummary(jobId, 5);
    const performance = await this.progressTracker.getPerformanceMetrics(jobId);

    const totalBatches = Math.ceil(job.total_products / job.batch_size);
    const currentBatch = Math.floor(job.current_batch_offset / job.batch_size);

    return {
      job,
      progress_percentage: Number(progress?.progress_percentage || 0),
      eta_seconds: progress?.eta_seconds ? Number(progress.eta_seconds) : null,
      current_batch_number: currentBatch,
      batches_completed: currentBatch,
      batches_remaining: Math.max(0, totalBatches - currentBatch),
      recent_errors: errors.map(e => e.error_message),
      performance_metrics: {
        avg_products_per_second: Number(performance?.avg_products_per_second || 0),
        avg_tokens_per_product: Number(performance?.avg_tokens_per_product || 0),
        success_rate: Number(performance?.success_rate || 0),
      },
    };
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const sql = `
      SELECT 
        job_id,
        job_type,
        status,
        total_products,
        processed_products,
        successful_categorizations,
        failed_categorizations,
        skipped_products,
        current_batch_offset,
        batch_size,
        filters,
        config,
        created_by,
        created_at,
        started_at,
        completed_at,
        paused_at,
        cancelled_at,
        last_activity_at,
        error_message,
        error_count,
        total_duration_ms,
        avg_batch_duration_ms,
        total_tokens_used
      FROM core.ai_categorization_job
      WHERE job_id = $1
    `;

    const result = await dbQuery<Job>(sql, [jobId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      total_products: Number(row.total_products),
      processed_products: Number(row.processed_products),
      successful_categorizations: Number(row.successful_categorizations),
      failed_categorizations: Number(row.failed_categorizations),
      skipped_products: Number(row.skipped_products),
      current_batch_offset: Number(row.current_batch_offset),
      batch_size: Number(row.batch_size),
      error_count: Number(row.error_count),
      total_duration_ms: row.total_duration_ms ? Number(row.total_duration_ms) : null,
      avg_batch_duration_ms: row.avg_batch_duration_ms ? Number(row.avg_batch_duration_ms) : null,
      total_tokens_used: row.total_tokens_used ? Number(row.total_tokens_used) : 0,
      filters: row.filters || {},
      config: row.config || {},
    };
  }

  /**
   * Get recent jobs
   */
  async getRecentJobs(limit: number = 10): Promise<Job[]> {
    const sql = `
      SELECT 
        job_id,
        job_type,
        status,
        total_products,
        processed_products,
        successful_categorizations,
        failed_categorizations,
        skipped_products,
        current_batch_offset,
        batch_size,
        filters,
        config,
        created_by,
        created_at,
        started_at,
        completed_at,
        paused_at,
        cancelled_at,
        last_activity_at,
        error_message,
        error_count,
        total_duration_ms,
        avg_batch_duration_ms,
        total_tokens_used
      FROM core.ai_categorization_job
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await dbQuery<Job>(sql, [limit]);
    return result.rows.map(row => ({
      ...row,
      total_products: Number(row.total_products),
      processed_products: Number(row.processed_products),
      successful_categorizations: Number(row.successful_categorizations),
      failed_categorizations: Number(row.failed_categorizations),
      skipped_products: Number(row.skipped_products),
      current_batch_offset: Number(row.current_batch_offset),
      batch_size: Number(row.batch_size),
      error_count: Number(row.error_count),
      total_duration_ms: row.total_duration_ms ? Number(row.total_duration_ms) : null,
      avg_batch_duration_ms: row.avg_batch_duration_ms ? Number(row.avg_batch_duration_ms) : null,
      total_tokens_used: row.total_tokens_used ? Number(row.total_tokens_used) : 0,
      filters: row.filters || {},
      config: row.config || {},
    }));
  }

  /**
   * Fetch products for a batch
   */
  private async fetchProductsForBatch(
    batchSize: number,
    offset: number,
    filters: JobFilters
  ): Promise<unknown[]> {
    const productIds = await this.getProductIdsForBatch(batchSize, offset, filters);
    console.log(
      `[JobManager] fetchProductsForBatch offset=${offset} batchSize=${batchSize} -> ids=${productIds.length}`
    );
    if (productIds.length === 0) return [];

    const enriched = await enrichProductsForCategorization(productIds);
    console.log(`[JobManager] fetchProductsForBatch enriched ${enriched.length} products`);
    return enriched;
  }

  /**
   * Get product IDs for batch processing
   */
  private async getProductIdsForBatch(
    batchSize: number,
    offset: number,
    filters: JobFilters
  ): Promise<string[]> {
    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];
    let paramCounter = 1;

    if (filters.supplier_id) {
      whereClauses.push(`sp.supplier_id = $${paramCounter}`);
      queryParams.push(filters.supplier_id);
      paramCounter++;
    }

    if (filters.status && filters.status.length > 0) {
      whereClauses.push(`sp.ai_categorization_status = ANY($${paramCounter}::varchar[])`);
      queryParams.push(filters.status);
      paramCounter++;
    }

    if (filters.exclude_categorized) {
      whereClauses.push(`sp.category_id IS NULL`);
    }

    if (filters.confidence_min !== undefined) {
      whereClauses.push(`sp.ai_confidence >= $${paramCounter}`);
      queryParams.push(filters.confidence_min);
      paramCounter++;
    }

    if (filters.confidence_max !== undefined) {
      whereClauses.push(`sp.ai_confidence <= $${paramCounter}`);
      queryParams.push(filters.confidence_max);
      paramCounter++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    queryParams.push(batchSize);
    queryParams.push(offset);

    const sql = `
      SELECT supplier_product_id
      FROM core.supplier_product sp
      ${whereClause}
      ORDER BY sp.created_at ASC
      LIMIT $${paramCounter}
      OFFSET $${paramCounter + 1}
    `;

    const result = await dbQuery<{ supplier_product_id: string }>(sql, queryParams);
    const ids = result.rows.map(row => row.supplier_product_id);
    console.log(
      `[JobManager] getProductIdsForBatch offset=${offset} batchSize=${batchSize} filters=${JSON.stringify(
        filters
      )} -> ${ids.length} ids`
    );
    return ids;
  }

  /**
   * Estimate total products for filters
   */
  private async estimateProducts(filters: JobFilters): Promise<number> {
    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];
    let paramCounter = 1;

    if (filters.supplier_id) {
      whereClauses.push(`supplier_id = $${paramCounter}`);
      queryParams.push(filters.supplier_id);
      paramCounter++;
    }

    if (filters.status && filters.status.length > 0) {
      whereClauses.push(`ai_categorization_status = ANY($${paramCounter}::varchar[])`);
      queryParams.push(filters.status);
      paramCounter++;
    }

    if (filters.exclude_categorized) {
      whereClauses.push(`category_id IS NULL`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT COUNT(*) as count
      FROM core.supplier_product
      ${whereClause}
    `;

    const result = await dbQuery<{ count: string }>(sql, queryParams);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    errorMessage?: string
  ): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET 
        status = $2,
        error_message = COALESCE($3, error_message),
        last_activity_at = NOW()
      WHERE job_id = $1
    `;

    await dbQuery(sql, [jobId, status, errorMessage || null]);
  }

  /**
   * Get job status (raw)
   */
  private async getJobStatus_Raw(jobId: string): Promise<JobStatus | null> {
    const sql = `
      SELECT status
      FROM core.ai_categorization_job
      WHERE job_id = $1
    `;

    const result = await dbQuery<{ status: JobStatus }>(sql, [jobId]);
    return result.rows[0]?.status || null;
  }

  /**
   * Update job start time
   */
  private async updateJobStartTime(jobId: string): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET started_at = NOW()
      WHERE job_id = $1 AND started_at IS NULL
    `;

    await dbQuery(sql, [jobId]);
  }

  /**
   * Complete a job
   */
  private async completeJob(jobId: string): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET 
        status = 'completed',
        completed_at = NOW(),
        total_duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
      WHERE job_id = $1
    `;

    await dbQuery(sql, [jobId]);
  }

  /**
   * Increment error count
   */
  private async incrementErrorCount(jobId: string, errorMessage: string): Promise<void> {
    const sql = `
      UPDATE core.ai_categorization_job
      SET 
        error_count = error_count + 1,
        error_message = $2
      WHERE job_id = $1
    `;

    await dbQuery(sql, [jobId, errorMessage]);
  }
}

// Singleton instance
export const jobManager = new JobManager();
