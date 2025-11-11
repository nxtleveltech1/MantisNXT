// @ts-nocheck

/**
 * WooCommerceSyncQueue - Production Queue State Machine
 * Based on Odoo's data_queue_mixin_ept pattern
 *
 * Implements:
 * - State machine (draft → processing → done/partial/failed)
 * - Batch processing with recovery
 * - Idempotent retry logic
 * - Activity logging
 * - Process count tracking (max 3 retries)
 */

import { query } from '@/lib/database';

export enum QueueState {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  PARTIAL = 'partial',
  DONE = 'done',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum LineState {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  DONE = 'done',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface QueueLineData {
  woo_customer_id: number;
  customer_data: unknown;
  external_id?: string;
}

export interface CreateQueueParams {
  org_id: string;
  queue_name: string;
  created_by: string;
  batch_size?: number;
  batch_delay_ms?: number;
  idempotency_key?: string;
}

export interface QueueLineResult {
  success: boolean;
  customerId?: string;
  wasUpdate?: boolean;
  error?: string;
}

export class WooCommerceSyncQueue {
  /**
   * Create a new sync queue
   */
  static async createQueue(params: CreateQueueParams): Promise<string> {
    const result = await query<{ id: string }>(
      `INSERT INTO woo_customer_sync_queue (
        org_id,
        queue_name,
        source_system,
        created_by,
        batch_size,
        batch_delay_ms,
        idempotency_key,
        state
      ) VALUES ($1, $2, 'woocommerce', $3, $4, $5, $6, 'draft')
      RETURNING id`,
      [
        params.org_id,
        params.queue_name,
        params.created_by,
        params.batch_size || 50,
        params.batch_delay_ms || 2000,
        params.idempotency_key || `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ]
    );

    if (!result.rows.length) {
      throw new Error('Failed to create sync queue');
    }

    return result.rows[0].id;
  }

  /**
   * Add customer to queue (idempotent)
   */
  static async addToQueue(
    queueId: string,
    orgId: string,
    wooCustomerId: number,
    customerData: unknown,
    externalId?: string
  ): Promise<string> {
    const idempotencyToken = `${queueId}-${wooCustomerId}-${Date.now()}`;

    const result = await query<{ id: string }>(
      `INSERT INTO woo_customer_sync_queue_line (
        queue_id,
        org_id,
        woo_customer_id,
        customer_data,
        external_id,
        idempotency_token,
        state
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'draft')
      ON CONFLICT (queue_id, woo_customer_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING id`,
      [queueId, orgId, wooCustomerId, JSON.stringify(customerData), externalId, idempotencyToken]
    );

    if (!result.rows.length) {
      throw new Error('Failed to add line to queue');
    }

    // Update total_count in queue
    await this.updateQueueCounts(queueId);

    return result.rows[0].id;
  }

  /**
   * Update total_count based on current lines
   */
  static async updateQueueCounts(queueId: string): Promise<void> {
    await query(
      `UPDATE woo_customer_sync_queue
       SET total_count = (SELECT COUNT(*) FROM woo_customer_sync_queue_line WHERE queue_id = $1)
       WHERE id = $1`,
      [queueId]
    );
  }

  /**
   * Get next batch of draft lines for processing
   */
  static async getNextBatch(queueId: string, batchSize: number = 50): Promise<unknown[]> {
    const result = await query(
      `SELECT id, woo_customer_id, customer_data, queue_id
       FROM woo_customer_sync_queue_line
       WHERE queue_id = $1 AND state = 'draft'
       ORDER BY created_at ASC
       LIMIT $2`,
      [queueId, batchSize]
    );

    return result.rows;
  }

  /**
   * Mark lines as processing (atomic operation)
   */
  static async markLinesProcessing(lineIds: string[]): Promise<void> {
    if (lineIds.length === 0) return;

    const placeholders = lineIds.map((_, i) => `$${i + 1}`).join(',');
    await query(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'processing', process_count = process_count + 1
       WHERE id IN (${placeholders})`,
      lineIds
    );
  }

  /**
   * Mark line as done with result
   */
  static async markLineDone(
    lineId: string,
    customerId: string | null,
    wasUpdate: boolean,
    queueId: string,
    orgId: string
  ): Promise<void> {
    await query(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'done',
           result_customer_id = $1,
           was_update = $2,
           last_process_date = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [customerId, wasUpdate, lineId]
    );

    // Log activity
    await this.logActivity(
      queueId,
      lineId,
      'customer_sync',
      'success',
      'Customer synced successfully',
      {
        customerId,
        wasUpdate,
      }
    );
  }

  /**
   * Mark line as failed with error details
   */
  static async markLineFailed(
    lineId: string,
    error: string,
    queueId: string,
    orgId: string
  ): Promise<void> {
    const result = await query<{ process_count: number }>(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'failed',
           error_message = $1,
           error_count = error_count + 1,
           last_error_timestamp = NOW(),
           last_process_date = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING process_count`,
      [error, lineId]
    );

    const processCount = result.rows[0]?.process_count || 0;

    // Log activity
    await this.logActivity(queueId, lineId, 'customer_sync', 'failed', error, {
      processCount,
      willRetry: processCount < 3,
    });
  }

  /**
   * Get queue status (counts, state, progress)
   */
  static async getQueueStatus(queueId: string): Promise<unknown> {
    const result = await query(
      `SELECT
        id,
        queue_name,
        state,
        total_count,
        draft_count,
        done_count,
        failed_count,
        cancelled_count,
        process_count,
        is_action_required,
        action_required_reason,
        last_process_date,
        created_at,
        metadata
       FROM woo_customer_sync_queue
       WHERE id = $1`,
      [queueId]
    );

    if (!result.rows.length) {
      throw new Error('Queue not found');
    }

    const queue = result.rows[0];

    // Calculate progress
    const completed = queue.done_count + queue.cancelled_count;
    const progress = queue.total_count > 0 ? Math.round((completed / queue.total_count) * 100) : 0;

    return {
      ...queue,
      progress,
      processingCount:
        queue.total_count -
        queue.draft_count -
        queue.done_count -
        queue.failed_count -
        queue.cancelled_count,
    };
  }

  /**
   * Check if queue requires action (retries exceeded)
   */
  static async checkQueueActionRequired(queueId: string): Promise<void> {
    const result = await query<{ process_count: number; id: string }>(
      `SELECT id, process_count FROM woo_customer_sync_queue WHERE id = $1`,
      [queueId]
    );

    if (!result.rows.length) return;

    const { process_count, id } = result.rows[0];

    // Mark as action required if process_count > 3 (Odoo pattern)
    if (process_count > 3) {
      await query(
        `UPDATE woo_customer_sync_queue
         SET is_action_required = true,
             action_required_reason = 'Exceeded maximum retry attempts (3). Manual intervention required.',
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
    }
  }

  /**
   * Force done (cancel remaining draft/failed lines)
   */
  static async forceDone(queueId: string): Promise<number> {
    const result = await query<{ count: number }>(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'cancelled'
       WHERE queue_id = $1 AND state IN ('draft', 'failed')
       RETURNING COUNT(*) as count`,
      [queueId]
    );

    const count = result.rows[0]?.count || 0;

    // Log the action
    await this.logActivity(
      queueId,
      null,
      'force_done',
      'completed',
      `Forced done: ${count} lines cancelled`,
      {
        cancelledCount: count,
      }
    );

    // Mark queue as done
    await query(
      `UPDATE woo_customer_sync_queue
       SET state = 'done',
           updated_at = NOW()
       WHERE id = $1`,
      [queueId]
    );

    return count;
  }

  /**
   * Log activity (audit trail)
   */
  static async logActivity(
    queueId: string,
    queueLineId: string | null,
    activityType: string,
    status: string,
    message: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const org = await query<{ org_id: string }>(
      `SELECT org_id FROM woo_customer_sync_queue WHERE id = $1`,
      [queueId]
    );

    if (!org.rows.length) return;

    const orgId = org.rows[0].org_id;

    await query(
      `INSERT INTO woo_sync_activity (queue_id, queue_line_id, org_id, activity_type, status, message, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [queueId, queueLineId, orgId, activityType, status, message, JSON.stringify(details || {})]
    );
  }

  /**
   * Get activity log for queue
   */
  static async getActivityLog(queueId: string, limit: number = 100): Promise<unknown[]> {
    const result = await query(
      `SELECT id, queue_line_id, activity_type, status, message, details, created_at
       FROM woo_sync_activity
       WHERE queue_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [queueId, limit]
    );

    return result.rows;
  }

  /**
   * Get failed lines with retry potential
   */
  static async getRetryableFailed(queueId: string, maxRetries: number = 3): Promise<unknown[]> {
    const result = await query(
      `SELECT id, woo_customer_id, customer_data, error_message, process_count
       FROM woo_customer_sync_queue_line
       WHERE queue_id = $1
         AND state = 'failed'
         AND process_count < $2
       ORDER BY last_error_timestamp ASC`,
      [queueId, maxRetries]
    );

    return result.rows;
  }

  /**
   * Increment queue process count
   */
  static async incrementQueueProcessCount(queueId: string): Promise<void> {
    await query(
      `UPDATE woo_customer_sync_queue
       SET process_count = process_count + 1,
           last_process_date = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [queueId]
    );
  }

  /**
   * Set queue as processing
   */
  static async setQueueProcessing(queueId: string, isProcessing: boolean): Promise<void> {
    await query(
      `UPDATE woo_customer_sync_queue
       SET is_processing = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [isProcessing, queueId]
    );
  }

  /**
   * Get queue by idempotency key
   */
  static async getQueueByIdempotencyKey(orgId: string, idempotencyKey: string): Promise<unknown> {
    const result = await query(
      `SELECT id, state, process_count FROM woo_customer_sync_queue
       WHERE org_id = $1 AND idempotency_key = $2`,
      [orgId, idempotencyKey]
    );

    return result.rows[0] || null;
  }

  /**
   * Clean up old completed queues (retention: 30 days)
   */
  static async cleanupOldQueues(orgId: string, retentionDays: number = 30): Promise<number> {
    const result = await query<{ count: number }>(
      `DELETE FROM woo_customer_sync_queue
       WHERE org_id = $1
         AND state IN ('done', 'failed')
         AND updated_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING COUNT(*) as count`,
      [orgId]
    );

    return result.rows[0]?.count || 0;
  }
}
