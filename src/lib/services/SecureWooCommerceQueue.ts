/**
 * Secure WooCommerce Sync Queue Management
 * Provides secure queue operations with tenant isolation and comprehensive logging
 */

import { secureQuery, wooCommerceQueries, wooCommerceBulkQueries } from '@/lib/database/wooCommerce-queries';
import { auditLogger, securityLogger } from '@/lib/logging/audit-logger';
import { InputValidator, SQLInjectionPrevention } from '@/lib/utils/secure-storage';
import { WooCommerceService } from '../WooCommerceService';

export interface QueueItem {
  id: string;
  orgId: string;
  entityType: string;
  externalId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface QueueStatus {
  queueId: string;
  orgId: string;
  entityType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueConfig {
  batchSize: number;
  batchDelayMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * Secure Queue Manager for WooCommerce synchronization
 */
export class SecureWooCommerceQueue {
  /**
   * Create a new sync queue with tenant isolation
   */
  static async createQueue(
    orgId: string,
    entityType: string,
    items: Array<{
      externalId: string;
      operation: 'create' | 'update' | 'delete';
      data: any;
    }>,
    config: QueueConfig,
    userId?: string,
    requestId?: string
  ): Promise<string> {
    // Input validation
    if (!InputValidator.isValidUUID(orgId)) {
      throw new Error('Invalid organization ID');
    }

    if (!InputValidator.validateEntityType(entityType)) {
      throw new Error('Invalid entity type');
    }

    if (!items || items.length === 0) {
      throw new Error('Queue items cannot be empty');
    }

    if (items.length > 10000) {
      throw new Error('Queue items cannot exceed 10,000');
    }

    // Sanitize items
    const sanitizedItems = items.map(item => ({
      externalId: InputValidator.sanitizeInput(String(item.externalId)),
      operation: item.operation,
      data: item.data
    }));

    return await secureQuery(
      `INSERT INTO woocommerce_sync_queue (
         org_id, entity_type, status, progress, total_items, processed_items, failed_items, batch_size, batch_delay_ms, max_retries, retry_delay_ms, started_at, created_at, updated_at
       ) VALUES ($1, $2, 'pending', 0, $3, 0, 0, $4, $5, $6, $7, NOW(), NOW(), NOW())
       RETURNING queue_id`,
      [
        orgId,
        entityType,
        sanitizedItems.length,
        config.batchSize,
        config.batchDelayMs,
        config.maxRetries,
        config.retryDelayMs
      ],
      { orgId, userId, requestId, action: 'CREATE_WOOCOMMERCE_QUEUE' }
    ).then(async (result) => {
      const queueId = result.rows[0]?.queue_id;

      if (!queueId) {
        throw new Error('Failed to create queue');
      }

      // Log queue creation
      await auditLogger.logSyncOperation(
        orgId,
        entityType,
        'started',
        {
          queueId,
          itemCount: sanitizedItems.length,
          config
        },
        userId,
        requestId
      );

      // Insert queue items
      await this.insertQueueItems(orgId, queueId, sanitizedItems, userId, requestId);

      return queueId;
    });
  }

  /**
   * Insert queue items with tenant isolation
   */
  private static async insertQueueItems(
    orgId: string,
    queueId: string,
    items: Array<{ externalId: string; operation: string; data: any }>,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    const values = items.map((item, index) => {
      const offset = index * 7;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, NOW(), NOW())`;
    }).join(', ');

    const params = items.flatMap(item => [
      queueId,
      orgId,
      item.externalId,
      item.operation,
      JSON.stringify(item.data),
      'pending',
      0
    ]);

    await secureQuery(
      `INSERT INTO woocommerce_sync_queue_items (
         queue_id, org_id, external_id, operation, data, status, retry_count, created_at, updated_at
       ) VALUES ${values}`,
      params,
      { orgId, userId, requestId, action: 'INSERT_QUEUE_ITEMS' }
    );
  }

  /**
   * Get queue status with tenant isolation
   */
  static async getQueueStatus(queueId: string, orgId: string, userId?: string, requestId?: string): Promise<QueueStatus | null> {
    if (!InputValidator.isValidUUID(queueId) || !InputValidator.isValidUUID(orgId)) {
      throw new Error('Invalid queue ID or organization ID');
    }

    const result = await secureQuery(
      `SELECT queue_id, org_id, entity_type, status, progress, total_items, processed_items, failed_items, started_at, completed_at, created_at, updated_at
       FROM woocommerce_sync_queue
       WHERE queue_id = $1 AND org_id = $2`,
      [queueId, orgId],
      { orgId, userId, requestId, action: 'GET_QUEUE_STATUS' }
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      queueId: row.queue_id,
      orgId: row.org_id,
      entityType: row.entity_type,
      status: row.status,
      progress: row.progress,
      totalItems: parseInt(row.total_items, 10),
      processedItems: parseInt(row.processed_items, 10),
      failedItems: parseInt(row.failed_items, 10),
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Process queue with secure batch operations
   */
  static async processQueue(
    woo: WooCommerceService,
    queueId: string,
    orgId: string,
    config: QueueConfig,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    if (!InputValidator.isValidUUID(queueId) || !InputValidator.isValidUUID(orgId)) {
      throw new Error('Invalid queue ID or organization ID');
    }

    // Update queue status to processing
    await secureQuery(
      `UPDATE woocommerce_sync_queue
       SET status = 'processing', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
       WHERE queue_id = $1 AND org_id = $2`,
      [queueId, orgId],
      { orgId, userId, requestId, action: 'START_QUEUE_PROCESSING' }
    );

    try {
      let hasMore = true;

      while (hasMore) {
        // Get next batch of items
        const items = await secureQuery(
          `SELECT id, external_id, operation, data, retry_count
           FROM woocommerce_sync_queue_items
           WHERE queue_id = $1 AND org_id = $2 AND status = 'pending'
           ORDER BY id
           LIMIT $3`,
          [queueId, orgId, config.batchSize],
          { orgId, userId, requestId, action: 'GET_QUEUE_BATCH' }
        );

        if (items.rows.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch
        await this.processBatch(woo, queueId, orgId, items.rows, config, userId, requestId);

        // Update progress
        await this.updateQueueProgress(queueId, orgId, userId, requestId);

        // Delay between batches
        if (hasMore && config.batchDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, config.batchDelayMs));
        }
      }

      // Complete queue
      await this.completeQueue(queueId, orgId, userId, requestId);

    } catch (error) {
      // Log error and mark queue as failed
      await this.failQueue(queueId, orgId, error as Error, userId, requestId);
      throw error;
    }
  }

  /**
   * Process a batch of queue items
   */
  private static async processBatch(
    woo: WooCommerceService,
    queueId: string,
    orgId: string,
    items: any[],
    config: QueueConfig,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    const updates: Array<{
      id: string;
      status: string;
      processedAt?: Date;
      lastError?: string;
      retryCount?: number;
    }> = [];

    for (const item of items) {
      try {
        await this.processQueueItem(woo, item, orgId);
        updates.push({
          id: item.id,
          status: 'completed',
          processedAt: new Date()
        });
      } catch (error) {
        const newRetryCount = (item.retry_count || 0) + 1;
        const shouldRetry = newRetryCount < config.maxRetries;

        updates.push({
          id: item.id,
          status: shouldRetry ? 'pending' : 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          retryCount: newRetryCount
        });

        if (!shouldRetry) {
          // Log failed item
          await securityLogger.logSecurityError({
            error,
            context: {
              type: 'QUEUE_ITEM_FAILED',
              queueId,
              orgId,
              externalId: item.external_id,
              operation: item.operation,
              retryCount: newRetryCount
            }
          });
        }
      }
    }

    // Update all items in batch
    await this.updateBatchItems(queueId, orgId, updates, userId, requestId);
  }

  /**
   * Process a single queue item
   */
  private static async processQueueItem(
    woo: WooCommerceService,
    item: { external_id: string; operation: string; data: any },
    orgId: string
  ): Promise<void> {
    const { external_id, operation, data } = item;

    switch (operation) {
      case 'create':
        if (data.entity_type === 'customer') {
          await woo.createCustomer(data);
        } else if (data.entity_type === 'product') {
          await woo.createProduct(data);
        } else if (data.entity_type === 'order') {
          await woo.createOrder(data);
        }
        break;

      case 'update':
        if (data.entity_type === 'customer') {
          await woo.updateCustomer(parseInt(external_id, 10), data);
        } else if (data.entity_type === 'product') {
          await woo.updateProduct(parseInt(external_id, 10), data);
        } else if (data.entity_type === 'order') {
          await woo.updateOrder(parseInt(external_id, 10), data);
        }
        break;

      case 'delete':
        if (data.entity_type === 'customer') {
          await woo.deleteCustomer(parseInt(external_id, 10));
        } else if (data.entity_type === 'product') {
          await woo.deleteProduct(parseInt(external_id, 10));
        } else if (data.entity_type === 'order') {
          await woo.deleteOrder(parseInt(external_id, 10));
        }
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Update batch items status
   */
  private static async updateBatchItems(
    queueId: string,
    orgId: string,
    updates: Array<{
      id: string;
      status: string;
      processedAt?: Date;
      lastError?: string;
      retryCount?: number;
    }>,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    const values = updates.map((update, index) => {
      const offset = index * 7;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, NOW())`;
    }).join(', ');

    const params = updates.flatMap(update => [
      queueId,
      orgId,
      update.id,
      update.status,
      update.processedAt || null,
      update.lastError || null,
      update.retryCount || 0
    ]);

    await secureQuery(
      `UPDATE woocommerce_sync_queue_items
       SET status = data.status,
           processed_at = COALESCE(data.processed_at, processed_at),
           last_error = COALESCE(data.last_error, last_error),
           retry_count = COALESCE(data.retry_count, retry_count),
           updated_at = NOW()
       FROM (VALUES ${values}) AS data(queue_id, org_id, id, status, processed_at, last_error, retry_count)
       WHERE woocommerce_sync_queue_items.id = data.id
         AND woocommerce_sync_queue_items.queue_id = data.queue_id
         AND woocommerce_sync_queue_items.org_id = data.org_id`,
      params,
      { orgId, userId, requestId, action: 'UPDATE_BATCH_ITEMS' }
    );
  }

  /**
   * Update queue progress
   */
  private static async updateQueueProgress(
    queueId: string,
    orgId: string,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    const result = await secureQuery(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM woocommerce_sync_queue_items
       WHERE queue_id = $1 AND org_id = $2`,
      [queueId, orgId],
      { orgId, userId, requestId, action: 'CALCULATE_QUEUE_PROGRESS' }
    );

    const row = result.rows[0];
    const total = parseInt(row.total, 10);
    const completed = parseInt(row.completed, 10);
    const failed = parseInt(row.failed, 10);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    await secureQuery(
      `UPDATE woocommerce_sync_queue
       SET progress = $3, processed_items = $4, failed_items = $5, updated_at = NOW()
       WHERE queue_id = $1 AND org_id = $2`,
      [queueId, orgId, progress, completed, failed],
      { orgId, userId, requestId, action: 'UPDATE_QUEUE_PROGRESS' }
    );
  }

  /**
   * Complete queue successfully
   */
  private static async completeQueue(
    queueId: string,
    orgId: string,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    const status = await this.getQueueStatus(queueId, orgId, userId, requestId);
    if (!status) return;

    await secureQuery(
      `UPDATE woocommerce_sync_queue
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE queue_id = $1 AND org_id = $2`,
      [queueId, orgId],
      { orgId, userId, requestId, action: 'COMPLETE_QUEUE' }
    );

    // Log completion
    await auditLogger.logSyncOperation(
      orgId,
      status.entityType,
      'completed',
      {
        queueId,
        totalItems: status.totalItems,
        processedItems: status.processedItems,
        failedItems: status.failedItems,
        finalStatus: 'completed'
      },
      userId,
      requestId
    );
  }

  /**
   * Mark queue as failed
   */
  private static async failQueue(
    queueId: string,
    orgId: string,
    error: Error,
    userId?: string,
    requestId?: string
  ): Promise<void> {
    await secureQuery(
      `UPDATE woocommerce_sync_queue
       SET status = 'failed', completed_at = NOW(), updated_at = NOW()
       WHERE queue_id = $1 AND org_id = $2`,
      [queueId, orgId],
      { orgId, userId, requestId, action: 'FAIL_QUEUE' }
    );

    // Log failure
    await auditLogger.logSyncOperation(
      orgId,
      'unknown',
      'failed',
      {
        queueId,
        error: error.message
      },
      userId,
      requestId
    );
  }

  /**
   * Get queue items for monitoring
   */
  static async getQueueItems(
    queueId: string,
    orgId: string,
    page: number = 1,
    pageSize: number = 50,
    userId?: string,
    requestId?: string
  ): Promise<{ items: QueueItem[]; total: number }> {
    if (!InputValidator.isValidUUID(queueId) || !InputValidator.isValidUUID(orgId)) {
      throw new Error('Invalid queue ID or organization ID');
    }

    if (!InputValidator.validatePagination(page, pageSize)) {
      throw new Error('Invalid pagination parameters');
    }

    const offset = (page - 1) * pageSize;

    const [itemsResult, countResult] = await Promise.all([
      secureQuery(
        `SELECT id, external_id, operation, data, status, retry_count, last_error, created_at, updated_at, processed_at
         FROM woocommerce_sync_queue_items
         WHERE queue_id = $1 AND org_id = $2
         ORDER BY id
         LIMIT $3 OFFSET $4`,
        [queueId, orgId, pageSize, offset],
        { orgId, userId, requestId, action: 'GET_QUEUE_ITEMS' }
      ),
      secureQuery(
        `SELECT COUNT(*) as total
         FROM woocommerce_sync_queue_items
         WHERE queue_id = $1 AND org_id = $2`,
        [queueId, orgId],
        { orgId, userId, requestId, action: 'GET_QUEUE_ITEMS_COUNT' }
      )
    ]);

    const items: QueueItem[] = itemsResult.rows.map(row => ({
      id: row.id,
      orgId,
      entityType: '', // Would need to be populated from queue
      externalId: row.external_id,
      operation: row.operation,
      data: row.data,
      status: row.status,
      retryCount: parseInt(row.retry_count, 10),
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      processedAt: row.processed_at
    }));

    const total = parseInt(countResult.rows[0].total, 10);

    return { items, total };
  }

  /**
   * Clear completed queues (cleanup utility)
   */
  static async cleanupCompletedQueues(
    orgId: string,
    maxAgeDays: number = 7,
    userId?: string,
    requestId?: string
  ): Promise<number> {
    if (!InputValidator.isValidUUID(orgId)) {
      throw new Error('Invalid organization ID');
    }

    const result = await secureQuery(
      `DELETE FROM woocommerce_sync_queue_items
       WHERE queue_id IN (
         SELECT queue_id
         FROM woocommerce_sync_queue
         WHERE org_id = $1
           AND status = 'completed'
           AND completed_at < NOW() - INTERVAL '${maxAgeDays} days'
       )`,
      [orgId],
      { orgId, userId, requestId, action: 'CLEANUP_QUEUE_ITEMS' }
    );

    const deletedItems = result.rowCount;

    await secureQuery(
      `DELETE FROM woocommerce_sync_queue
       WHERE org_id = $1
         AND status = 'completed'
         AND completed_at < NOW() - INTERVAL '${maxAgeDays} days'`,
      [orgId],
      { orgId, userId, requestId, action: 'CLEANUP_COMPLETED_QUEUES' }
    );

    const deletedQueues = result.rowCount;

    // Log cleanup
    await auditLogger.logSyncOperation(
      orgId,
      'cleanup',
      'completed',
      {
        deletedQueues,
        deletedItems,
        maxAgeDays
      },
      userId,
      requestId
    );

    return deletedQueues;
  }
}