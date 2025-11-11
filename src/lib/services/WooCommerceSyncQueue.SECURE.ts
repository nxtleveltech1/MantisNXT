/**
 * SECURE IMPLEMENTATION: WooCommerceSyncQueue
 *
 * This file shows the secure implementation pattern for database operations.
 * Key improvements:
 * - UUID format validation on all parameters
 * - org_id validation in all queries (org isolation)
 * - No string interpolation in SQL (parameterized only)
 * - Authorization checks in methods requiring access control
 * - Immutable audit logging (append-only)
 * - Input sanitization on all user-provided data
 *
 * Author: Security Expert Agent
 * Date: 2025-11-06
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

/**
 * Helper: Validate UUID format
 * Prevents UUID enumeration and SQL injection attempts
 */
function validateUUID(uuid: string, paramName: string): void {
  if (!uuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new Error(`Invalid ${paramName} format - must be valid UUID`);
  }
}

/**
 * Helper: Validate integer range
 * Prevents DOS attacks via extreme parameter values
 */
function validateIntRange(
  value: number | undefined,
  min: number,
  max: number,
  paramName: string
): number {
  if (value === undefined) {
    return min;
  }

  const num = Math.floor(value);

  if (num < min || num > max) {
    throw new Error(
      `${paramName} must be between ${min} and ${max}, got ${value}`
    );
  }

  return num;
}

/**
 * Helper: Sanitize string input
 * Prevents injection and buffer overflow attacks
 */
function sanitizeString(input: string | undefined, maxLength: number = 500): string {
  if (!input) return '';

  // Truncate to prevent buffer overflow
  let sanitized = input.substring(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');

  return sanitized;
}

export class WooCommerceSyncQueue {
  /**
   * Create a new sync queue
   *
   * SECURITY:
   * - Validates all UUID inputs
   * - Sanitizes text inputs
   * - Org_id must be passed in (NOT extracted from auth in this layer)
   */
  static async createQueue(params: CreateQueueParams): Promise<string> {
    // Validate inputs
    validateUUID(params.org_id, 'org_id');
    validateUUID(params.created_by, 'created_by');

    const queueName = sanitizeString(params.queue_name, 255);
    const batchSize = validateIntRange(params.batch_size, 1, 1000, 'batch_size');
    const batchDelayMs = validateIntRange(params.batch_delay_ms, 0, 60000, 'batch_delay_ms');

    const idempotencyKey = params.idempotency_key
      ? sanitizeString(params.idempotency_key, 255)
      : `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      [params.org_id, queueName, params.created_by, batchSize, batchDelayMs, idempotencyKey]
    );

    if (!result.rows.length) {
      throw new Error('Failed to create sync queue');
    }

    return result.rows[0].id;
  }

  /**
   * Add customer to queue (idempotent)
   *
   * SECURITY:
   * - Validates UUIDs
   * - Validates wooCustomerId is positive integer
   * - Org_id isolation enforced
   */
  static async addToQueue(
    queueId: string,
    orgId: string,
    wooCustomerId: number,
    customerData: unknown,
    externalId?: string
  ): Promise<string> {
    // Validate inputs
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    if (!Number.isInteger(wooCustomerId) || wooCustomerId <= 0) {
      throw new Error('Invalid wooCustomerId - must be positive integer');
    }

    const sanitizedExternalId = externalId ? sanitizeString(externalId, 255) : null;
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
      [queueId, orgId, wooCustomerId, JSON.stringify(customerData), sanitizedExternalId, idempotencyToken]
    );

    if (!result.rows.length) {
      throw new Error('Failed to add line to queue');
    }

    // Update total_count in queue
    await this.updateQueueCounts(queueId, orgId);

    return result.rows[0].id;
  }

  /**
   * Update total_count based on current lines
   *
   * SECURITY:
   * - Org_id isolation enforced
   * - No injection possible (parameterized)
   */
  static async updateQueueCounts(queueId: string, orgId: string): Promise<void> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    await query(
      `UPDATE woo_customer_sync_queue
       SET total_count = (
         SELECT COUNT(*) FROM woo_customer_sync_queue_line
         WHERE queue_id = $1 AND org_id = $2
       )
       WHERE id = $1 AND org_id = $2`,
      [queueId, orgId]
    );
  }

  /**
   * Get next batch of draft lines for processing
   *
   * SECURITY:
   * - Org_id isolation enforced
   * - Batch size clamped to prevent DOS
   */
  static async getNextBatch(
    queueId: string,
    orgId: string,
    batchSize: number = 50
  ): Promise<unknown[]> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    const size = validateIntRange(batchSize, 1, 1000, 'batchSize');

    const result = await query(
      `SELECT id, woo_customer_id, customer_data, queue_id
       FROM woo_customer_sync_queue_line
       WHERE queue_id = $1 AND org_id = $2 AND state = 'draft'
       ORDER BY created_at ASC
       LIMIT $3`,
      [queueId, orgId, size]
    );

    return result.rows;
  }

  /**
   * Mark lines as processing (atomic operation)
   *
   * SECURITY:
   * - Validates all UUIDs
   * - Org_id isolation (could be enforced with RLS)
   */
  static async markLinesProcessing(
    lineIds: string[],
    orgId: string
  ): Promise<void> {
    if (!lineIds.length) return;

    validateUUID(orgId, 'orgId');

    // Validate all line IDs
    lineIds.forEach((id, idx) => {
      try {
        validateUUID(id, `lineIds[${idx}]`);
      } catch (error) {
        throw new Error(`Invalid line ID at index ${idx}`);
      }
    });

    const placeholders = lineIds.map((_, i) => `$${i + 1}`).join(',');

    await query(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'processing', process_count = process_count + 1
       WHERE id IN (${placeholders}) AND org_id = $${lineIds.length + 1}`,
      [...lineIds, orgId]
    );
  }

  /**
   * Mark line as done with result
   *
   * SECURITY:
   * - Validates all UUIDs
   * - Org_id isolation enforced
   * - Customer ID validation (could be UUID or null)
   */
  static async markLineDone(
    lineId: string,
    customerId: string | null,
    wasUpdate: boolean,
    queueId: string,
    orgId: string
  ): Promise<void> {
    validateUUID(lineId, 'lineId');
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    if (customerId) {
      validateUUID(customerId, 'customerId');
    }

    await query(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'done',
           result_customer_id = $1,
           was_update = $2,
           last_process_date = NOW(),
           updated_at = NOW()
       WHERE id = $3 AND org_id = $4`,
      [customerId, wasUpdate, lineId, orgId]
    );

    // Log activity
    await this.logActivity(
      queueId,
      lineId,
      'customer_sync',
      'success',
      'Customer synced successfully',
      orgId,
      null, // userId from calling context
      { customerId, wasUpdate }
    );
  }

  /**
   * Mark line as failed with error details
   *
   * SECURITY:
   * - Validates all UUIDs
   * - Sanitizes error message (truncate to prevent bloat)
   * - Org_id isolation enforced
   */
  static async markLineFailed(
    lineId: string,
    error: string,
    queueId: string,
    orgId: string
  ): Promise<void> {
    validateUUID(lineId, 'lineId');
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    const sanitizedError = sanitizeString(error, 500);

    const result = await query<{ process_count: number }>(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'failed',
           error_message = $1,
           error_count = error_count + 1,
           last_error_timestamp = NOW(),
           last_process_date = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND org_id = $3
       RETURNING process_count`,
      [sanitizedError, lineId, orgId]
    );

    const processCount = result.rows[0]?.process_count || 0;

    // Log activity
    await this.logActivity(
      queueId,
      lineId,
      'customer_sync',
      'failed',
      sanitizedError,
      orgId,
      null,
      { processCount, willRetry: processCount < 3 }
    );
  }

  /**
   * Get queue status (counts, state, progress)
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   * - Returns null if queue not found (doesn't leak existence)
   */
  static async getQueueStatus(queueId: string, orgId: string): Promise<unknown | null> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

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
       WHERE id = $1 AND org_id = $2`,
      [queueId, orgId]
    );

    if (!result.rows.length) {
      return null; // Queue not found or not authorized
    }

    const queue = result.rows[0];

    // Calculate progress
    const completed = queue.done_count + queue.cancelled_count;
    const progress = queue.total_count > 0 ? Math.round((completed / queue.total_count) * 100) : 0;

    return {
      ...queue,
      progress,
      processingCount: queue.total_count
        - queue.draft_count
        - queue.done_count
        - queue.failed_count
        - queue.cancelled_count,
    };
  }

  /**
   * Check if queue requires action (retries exceeded)
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   */
  static async checkQueueActionRequired(queueId: string, orgId: string): Promise<void> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    const result = await query<{ process_count: number; id: string }>(
      `SELECT id, process_count FROM woo_customer_sync_queue
       WHERE id = $1 AND org_id = $2`,
      [queueId, orgId]
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
         WHERE id = $1 AND org_id = $2`,
        [id, orgId]
      );
    }
  }

  /**
   * Force done (cancel remaining draft/failed lines)
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   * - User context required for audit
   */
  static async forceDone(
    queueId: string,
    orgId: string,
    userId: string
  ): Promise<number> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');
    validateUUID(userId, 'userId');

    const result = await query<{ count: number }>(
      `UPDATE woo_customer_sync_queue_line
       SET state = 'cancelled'
       WHERE queue_id = $1 AND org_id = $2 AND state IN ('draft', 'failed')
       RETURNING COUNT(*) as count`,
      [queueId, orgId]
    );

    const count = result.rows[0]?.count || 0;

    // Log the action
    await this.logActivity(
      queueId,
      null,
      'force_done',
      'completed',
      `Forced done: ${count} lines cancelled`,
      orgId,
      userId,
      { cancelledCount: count }
    );

    // Mark queue as done
    await query(
      `UPDATE woo_customer_sync_queue
       SET state = 'done',
           updated_at = NOW()
       WHERE id = $1 AND org_id = $2`,
      [queueId, orgId]
    );

    return count;
  }

  /**
   * Log activity (APPEND-ONLY audit trail)
   *
   * SECURITY:
   * - Validates all UUIDs
   * - Org_id isolation enforced
   * - Message sanitized (no injection)
   * - Only INSERT allowed (immutable audit log)
   *
   * NOTE: This replaces the old pattern which queried org_id from queue.
   * Now org_id is explicitly validated before logging.
   */
  static async logActivity(
    queueId: string,
    queueLineId: string | null,
    activityType: string,
    status: string,
    message: string,
    orgId: string,
    userId: string | null,
    details?: Record<string, unknown>
  ): Promise<void> {
    // Validate inputs
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    if (queueLineId) {
      validateUUID(queueLineId, 'queueLineId');
    }

    if (userId) {
      validateUUID(userId, 'userId');
    }

    const sanitizedMessage = sanitizeString(message, 500);
    const sanitizedActivityType = sanitizeString(activityType, 100);
    const sanitizedStatus = sanitizeString(status, 100);

    // Verify queue belongs to org (authorization check)
    const queueCheck = await query<{ id: string }>(
      `SELECT id FROM woo_customer_sync_queue
       WHERE id = $1 AND org_id = $2`,
      [queueId, orgId]
    );

    if (!queueCheck.rows.length) {
      throw new Error('Queue not found or unauthorized');
    }

    // Insert activity log (append-only)
    await query(
      `INSERT INTO woo_sync_activity
       (queue_id, queue_line_id, org_id, activity_type, status, message, details, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())`,
      [
        queueId,
        queueLineId,
        orgId,
        sanitizedActivityType,
        sanitizedStatus,
        sanitizedMessage,
        JSON.stringify(details || {}),
        userId,
      ]
    );
  }

  /**
   * Get activity log for queue
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   * - Limit enforced to prevent DOS
   */
  static async getActivityLog(
    queueId: string,
    orgId: string,
    limit: number = 100
  ): Promise<unknown[]> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    const safeLimit = validateIntRange(limit, 1, 1000, 'limit');

    const result = await query(
      `SELECT id, queue_line_id, activity_type, status, message, details, created_at, created_by
       FROM woo_sync_activity
       WHERE queue_id = $1 AND org_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [queueId, orgId, safeLimit]
    );

    return result.rows;
  }

  /**
   * Get failed lines with retry potential
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   * - Max retries clamped to prevent DOS
   */
  static async getRetryableFailed(
    queueId: string,
    orgId: string,
    maxRetries: number = 3
  ): Promise<unknown[]> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    const safeMaxRetries = validateIntRange(maxRetries, 1, 10, 'maxRetries');

    const result = await query(
      `SELECT id, woo_customer_id, customer_data, error_message, process_count
       FROM woo_customer_sync_queue_line
       WHERE queue_id = $1
         AND org_id = $2
         AND state = 'failed'
         AND process_count < $3
       ORDER BY last_error_timestamp ASC`,
      [queueId, orgId, safeMaxRetries]
    );

    return result.rows;
  }

  /**
   * Increment queue process count
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   */
  static async incrementQueueProcessCount(queueId: string, orgId: string): Promise<void> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    await query(
      `UPDATE woo_customer_sync_queue
       SET process_count = process_count + 1,
           last_process_date = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND org_id = $2`,
      [queueId, orgId]
    );
  }

  /**
   * Set queue as processing
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   */
  static async setQueueProcessing(
    queueId: string,
    orgId: string,
    isProcessing: boolean
  ): Promise<void> {
    validateUUID(queueId, 'queueId');
    validateUUID(orgId, 'orgId');

    await query(
      `UPDATE woo_customer_sync_queue
       SET is_processing = $1,
           updated_at = NOW()
       WHERE id = $2 AND org_id = $3`,
      [isProcessing, queueId, orgId]
    );
  }

  /**
   * Get queue by idempotency key
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   * - Returns null if not found (doesn't leak existence)
   */
  static async getQueueByIdempotencyKey(
    orgId: string,
    idempotencyKey: string
  ): Promise<unknown | null> {
    validateUUID(orgId, 'orgId');

    const sanitizedKey = sanitizeString(idempotencyKey, 255);

    const result = await query(
      `SELECT id, state, process_count FROM woo_customer_sync_queue
       WHERE org_id = $1 AND idempotency_key = $2`,
      [orgId, sanitizedKey]
    );

    return result.rows[0] || null;
  }

  /**
   * Clean up old completed queues (retention: 30 days)
   *
   * SECURITY:
   * - Validates UUIDs
   * - Org_id isolation enforced
   * - Retention days clamped to reasonable range (1-365)
   * - CRITICAL: Uses parameterized query, NOT string interpolation
   */
  static async cleanupOldQueues(
    orgId: string,
    retentionDays: number = 30
  ): Promise<number> {
    validateUUID(orgId, 'orgId');

    // Validate and clamp retention days (prevents any manipulation)
    const days = validateIntRange(retentionDays, 1, 365, 'retentionDays');

    // CRITICAL: Use INTERVAL '1 day' * $2 instead of string interpolation
    const result = await query<{ count: number }>(
      `DELETE FROM woo_customer_sync_queue
       WHERE org_id = $1
         AND state IN ('done', 'failed', 'cancelled')
         AND updated_at < NOW() - INTERVAL '1 day' * $2
       RETURNING COUNT(*) as count`,
      [orgId, days]
    );

    return result.rows[0]?.count || 0;
  }
}
