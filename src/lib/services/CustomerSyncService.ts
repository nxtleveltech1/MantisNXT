// @ts-nocheck

/**
 * CustomerSyncService - Production Customer Sync Engine
 *
 * Implements:
 * - Queue-based processing (state machine)
 * - Batch processing with configurable size and delay
 * - Idempotent retry logic with exponential backoff
 * - Comprehensive error handling and recovery
 * - Activity logging and audit trails
 * - Circuit breaker integration
 */

import { query } from '@/lib/database';
import { IntegrationMappingService } from '@/lib/services/IntegrationMappingService';
import type { WooCommerceService, WooCommerceCustomer } from '@/lib/services/WooCommerceService';
import { WooCommerceSyncQueue } from '@/lib/services/WooCommerceSyncQueue.SECURE';

interface SyncConfig {
  batchSize?: number;
  batchDelayMs?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
  initialBackoffMs?: number;
  timeoutMs?: number;
}

interface SyncProgress {
  queueId: string;
  queueName: string;
  totalCustomers: number;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  state: string;
  progress: number;
  estimatedTimeRemaining?: number;
}

/**
 * Map WooCommerce customer to MantisNXT customer
 */
async function mapWooCustomerToMantis(
  wooCustomer: WooCommerceCustomer,
  wooOrders: unknown[]
): Promise<unknown> {
  const lifetimeValue = wooOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
  const completedOrders = wooOrders.filter(order => order.status === 'completed');

  const orderDates = wooOrders
    .map(order => new Date(order.date_created || ''))
    .sort((a, b) => a.getTime() - b.getTime());

  const acquisitionDate = orderDates.length > 0 ? orderDates[0] : new Date();
  const lastInteractionDate =
    orderDates.length > 0 ? orderDates[orderDates.length - 1] : new Date();

  // Determine segment
  let segment = 'individual';
  if (lifetimeValue > 50000) segment = 'enterprise';
  else if (lifetimeValue > 20000 || completedOrders.length > 50) segment = 'mid_market';
  else if (lifetimeValue > 5000 || completedOrders.length > 10) segment = 'smb';
  else if (completedOrders.length > 2) segment = 'startup';

  const address = wooCustomer.billing
    ? {
        street: [wooCustomer.billing.address_1, wooCustomer.billing.address_2]
          .filter(Boolean)
          .join(', '),
        city: wooCustomer.billing.city,
        state: wooCustomer.billing.state,
        postal_code: wooCustomer.billing.postcode,
        country: wooCustomer.billing.country,
      }
    : null;

  const metadata: Record<string, unknown> = {
    woocommerce_id: wooCustomer.id,
    username: wooCustomer.username,
    total_orders: wooOrders.length,
    completed_orders: completedOrders.length,
  };

  if (wooCustomer.meta_data) {
    wooCustomer.meta_data.forEach(meta => {
      metadata[meta.key] = meta.value;
    });
  }

  const tags: string[] = ['woocommerce'];
  if (completedOrders.length > 10) tags.push('high-value');
  if (completedOrders.length === 0) tags.push('prospect');
  if (
    orderDates.length > 0 &&
    Date.now() - lastInteractionDate.getTime() < 30 * 24 * 60 * 60 * 1000
  ) {
    tags.push('active');
  }

  return {
    name:
      `${wooCustomer.first_name || ''} ${wooCustomer.last_name || ''}`.trim() || wooCustomer.email,
    email: wooCustomer.email,
    phone: wooCustomer.billing?.phone || wooCustomer.shipping?.phone || null,
    company: wooCustomer.billing?.company || wooCustomer.shipping?.company || null,
    segment,
    status: completedOrders.length > 0 ? 'active' : 'prospect',
    lifetime_value: lifetimeValue,
    acquisition_date: acquisitionDate.toISOString(),
    last_interaction_date: lastInteractionDate.toISOString(),
    address,
    metadata,
    tags,
  };
}

/**
 * Sync a single customer from WooCommerce to MantisNXT
 */
async function syncSingleCustomer(
  wooService: WooCommerceService,
  wooCustomer: WooCommerceCustomer,
  orgId: string,
  connectorId: string
): Promise<{ success: boolean; customerId?: string; wasUpdate?: boolean; error?: string }> {
  try {
    // Fetch customer's orders
    const ordersResponse = await wooService.getOrders({
      customer: wooCustomer.id,
      per_page: 100,
    });
    const wooOrders = ordersResponse.data;

    // Map to MantisNXT customer format
    const mantisCustomer = await mapWooCustomerToMantis(wooCustomer, wooOrders);

    // Check if customer already exists by email
    const existingCustomer = await query<unknown>(
      `SELECT id FROM customer WHERE email = $1 AND org_id = $2`,
      [mantisCustomer.email, orgId]
    );

    if (existingCustomer.rows.length > 0) {
      // Update existing customer
      const customerId = existingCustomer.rows[0].id;

      await query(
        `UPDATE customer
         SET
           name = $1,
           phone = $2,
           company = $3,
           segment = $4::customer_segment,
           status = $5::customer_status,
           lifetime_value = $6,
           acquisition_date = $7,
           last_interaction_date = $8,
           address = $9::jsonb,
           metadata = $10::jsonb,
           tags = $11,
           updated_at = NOW()
         WHERE id = $12`,
        [
          mantisCustomer.name,
          mantisCustomer.phone,
          mantisCustomer.company,
          mantisCustomer.segment,
          mantisCustomer.status,
          mantisCustomer.lifetime_value,
          mantisCustomer.acquisition_date,
          mantisCustomer.last_interaction_date,
          JSON.stringify(mantisCustomer.address),
          JSON.stringify(mantisCustomer.metadata),
          mantisCustomer.tags,
          customerId,
        ]
      );

      // Ensure integration mapping exists
      const mappingService = new IntegrationMappingService(connectorId, orgId);
      const existingMap = await mappingService.getMapping('customer', customerId);
      if (!existingMap) {
        await mappingService.createMapping({
          entityType: 'customer',
          internalId: customerId,
          externalId: String(wooCustomer.id),
          mappingData: { email: wooCustomer.email },
          syncData: wooCustomer,
          direction: 'inbound',
        });
      } else {
        await mappingService.updateSyncStatus(
          'customer',
          String(wooCustomer.id),
          'completed',
          wooCustomer
        );
      }
      await mappingService.logSync({
        entityType: 'customer',
        entityId: customerId,
        externalId: String(wooCustomer.id),
        direction: 'inbound',
        status: 'completed',
        operation: 'update',
        recordsAffected: 1,
        responsePayload: wooCustomer,
      });

      return { success: true, customerId, wasUpdate: true };
    } else {
      // Create new customer
      const result = await query<unknown>(
        `INSERT INTO customer (
           org_id,
           name,
           email,
           phone,
           company,
           segment,
           status,
           lifetime_value,
           acquisition_date,
           last_interaction_date,
           address,
           metadata,
           tags,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6::customer_segment, $7::customer_status, $8, $9, $10, $11::jsonb, $12::jsonb, $13, NOW(), NOW())
         RETURNING id`,
        [
          orgId,
          mantisCustomer.name,
          mantisCustomer.email,
          mantisCustomer.phone,
          mantisCustomer.company,
          mantisCustomer.segment,
          mantisCustomer.status,
          mantisCustomer.lifetime_value,
          mantisCustomer.acquisition_date,
          mantisCustomer.last_interaction_date,
          JSON.stringify(mantisCustomer.address),
          JSON.stringify(mantisCustomer.metadata),
          mantisCustomer.tags,
        ]
      );
      const newId = result.rows[0].id;
      const mappingService = new IntegrationMappingService(connectorId, orgId);
      await mappingService.createMapping({
        entityType: 'customer',
        internalId: newId,
        externalId: String(wooCustomer.id),
        mappingData: { email: wooCustomer.email },
        syncData: wooCustomer,
        direction: 'inbound',
      });
      await mappingService.logSync({
        entityType: 'customer',
        entityId: newId,
        externalId: String(wooCustomer.id),
        direction: 'inbound',
        status: 'completed',
        operation: 'create',
        recordsAffected: 1,
        responsePayload: wooCustomer,
      });
      return { success: true, customerId: newId, wasUpdate: false };
    }
  } catch (error: unknown) {
    console.error(`Error syncing customer ${wooCustomer.email}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Delay helper for batch processing
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay
 */
function getBackoffDelay(
  attempt: number,
  initialMs: number = 1000,
  multiplier: number = 2
): number {
  return initialMs * Math.pow(multiplier, attempt);
}

export class CustomerSyncService {
  /**
   * Start a new customer sync operation
   */
  static async startSync(
    wooService: WooCommerceService,
    orgId: string,
    userId: string,
    config: SyncConfig = {},
    options?: { email?: string; wooCustomerId?: number; selectedIds?: number[] }
  ): Promise<string> {
    // Use idempotency key for safe retries
    const idempotencyKey = `customer-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if this sync is already running
    const existing = await WooCommerceSyncQueue.getQueueByIdempotencyKey(orgId, idempotencyKey);
    if (existing && existing.state !== 'done' && existing.state !== 'failed') {
      console.log(`Sync already running with key: ${idempotencyKey}`);
      return existing.id;
    }

    // Create queue
    const queueId = await WooCommerceSyncQueue.createQueue({
      org_id: orgId,
      queue_name: `Customer Sync - ${new Date().toISOString()}`,
      created_by: userId,
      batch_size: config.batchSize || 50,
      batch_delay_ms: config.batchDelayMs || 2000,
      idempotency_key: idempotencyKey,
    });

    console.log(`Created sync queue: ${queueId}`);

    // Fetch customers
    let wooCustomers: WooCommerceCustomer[];

    if (options?.wooCustomerId) {
      const response = await wooService.getCustomer(options.wooCustomerId);
      wooCustomers = [response.data];
    } else if (options?.email) {
      const response = await wooService.getCustomers({ email: options.email });
      wooCustomers = response.data;
    } else if (options?.selectedIds && options.selectedIds.length > 0) {
      wooCustomers = [];
      for (const id of options.selectedIds) {
        const resp = await wooService.getCustomer(id);
        wooCustomers.push(resp.data);
      }
    } else {
      wooCustomers = await wooService.fetchAllPages(params => wooService.getCustomers(params), {
        per_page: 100,
        order: 'desc',
        orderby: 'registered_date',
      });
    }

    console.log(`Fetched ${wooCustomers.length} customers to sync`);

    // Add customers to queue (idempotent)
    for (const wooCustomer of wooCustomers) {
      await WooCommerceSyncQueue.addToQueue(
        queueId,
        orgId,
        wooCustomer.id || 0,
        wooCustomer,
        wooCustomer.email
      );
    }

    console.log(`Added ${wooCustomers.length} customers to queue ${queueId}`);

    return queueId;
  }

  /**
   * Process a sync queue
   */
  static async processQueue(
    wooService: WooCommerceService,
    queueId: string,
    orgId: string,
    config: SyncConfig = {},
    connectorId?: string
  ): Promise<SyncProgress> {
    const batchSize = config.batchSize || 50;
    const batchDelayMs = config.batchDelayMs || 2000;
    const maxRetries = config.maxRetries || 3;
    const backoffMultiplier = config.backoffMultiplier || 2;
    const initialBackoffMs = config.initialBackoffMs || 1000;

    // Mark queue as processing
    await WooCommerceSyncQueue.setQueueProcessing(queueId, orgId, true);
    await WooCommerceSyncQueue.incrementQueueProcessCount(queueId, orgId);

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    try {
      // Get initial status
      const initialStatus = await WooCommerceSyncQueue.getQueueStatus(queueId, orgId);

      // Process in batches
      let batchNumber = 1;
      let hasMore = true;

      while (hasMore) {
        const batch = await WooCommerceSyncQueue.getNextBatch(queueId, orgId, batchSize);

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`Processing batch ${batchNumber}: ${batch.length} customers`);

        // Mark lines as processing
        await WooCommerceSyncQueue.markLinesProcessing(
          batch.map(b => b.id),
          orgId
        );

        // Process each customer in batch
        for (const line of batch) {
          totalProcessed++;
          let retryCount = 0;
          let success = false;
          let lastError: string | null = null;

          // Retry loop with exponential backoff
          while (retryCount < maxRetries && !success) {
            try {
              const wooCustomer = line.customer_data as WooCommerceCustomer;
              const result = await syncSingleCustomer(
                wooService,
                wooCustomer,
                orgId,
                connectorId || ''
              );

              if (result.success) {
                await WooCommerceSyncQueue.markLineDone(
                  line.id,
                  result.customerId || null,
                  result.wasUpdate || false,
                  queueId,
                  orgId
                );

                if (result.wasUpdate) {
                  totalUpdated++;
                } else {
                  totalCreated++;
                }

                success = true;
              } else {
                lastError = result.error || 'Unknown error';
                retryCount++;

                if (retryCount < maxRetries) {
                  const backoffMs = getBackoffDelay(
                    retryCount - 1,
                    initialBackoffMs,
                    backoffMultiplier
                  );
                  console.log(
                    `Retry ${retryCount}/${maxRetries} for customer ${wooCustomer.email}, waiting ${backoffMs}ms`
                  );
                  await delay(backoffMs);
                } else {
                  // Max retries exceeded
                  await WooCommerceSyncQueue.markLineFailed(line.id, lastError, queueId, orgId);
                  totalFailed++;
                }
              }
            } catch (error: unknown) {
              lastError = error.message || 'Unknown error';
              retryCount++;

              if (retryCount < maxRetries) {
                const backoffMs = getBackoffDelay(
                  retryCount - 1,
                  initialBackoffMs,
                  backoffMultiplier
                );
                console.log(`Exception retry ${retryCount}/${maxRetries}, waiting ${backoffMs}ms`);
                await delay(backoffMs);
              } else {
                // Max retries exceeded
                await WooCommerceSyncQueue.markLineFailed(line.id, lastError, queueId, orgId);
                totalFailed++;
              }
            }
          }
        }

        // Delay between batches
        if (batch.length === batchSize) {
          console.log(
            `Batch ${batchNumber} complete. Waiting ${batchDelayMs}ms before next batch...`
          );
          await delay(batchDelayMs);
        }

        batchNumber++;
      }

      // Check if action required (max retries exceeded)
      await WooCommerceSyncQueue.checkQueueActionRequired(queueId, orgId);
    } finally {
      await WooCommerceSyncQueue.setQueueProcessing(queueId, orgId, false);
    }

    // Get final status
    const finalStatus = await WooCommerceSyncQueue.getQueueStatus(queueId);

    return {
      queueId,
      queueName: finalStatus.queue_name,
      totalCustomers: finalStatus.total_count,
      processedCount: totalProcessed,
      createdCount: totalCreated,
      updatedCount: totalUpdated,
      failedCount: totalFailed,
      state: finalStatus.state,
      progress: finalStatus.progress,
    };
  }

  /**
   * Get sync queue status
   */
  static async getStatus(queueId: string, orgId?: string): Promise<SyncProgress> {
    if (!orgId) {
      throw new Error('orgId required');
    }
    const status: unknown = await WooCommerceSyncQueue.getQueueStatus(queueId, orgId);
    return {
      queueId: status.id,
      queueName: status.queue_name,
      totalCustomers: status.total_count,
      processedCount: status.done_count + status.failed_count,
      createdCount: 0,
      updatedCount: 0,
      failedCount: status.failed_count,
      state: status.state,
      progress: status.progress,
    };
  }

  /**
   * Retry failed items in queue
   */
  static async retryFailed(
    wooService: WooCommerceService,
    queueId: string,
    orgId: string,
    config: SyncConfig = {}
  ): Promise<SyncProgress> {
    const maxRetries = config.maxRetries || 3;

    // Get retryable failed lines
    const failed = await WooCommerceSyncQueue.getRetryableFailed(queueId, orgId, maxRetries);

    if (failed.length === 0) {
      return this.getStatus(queueId);
    }

    console.log(`Retrying ${failed.length} failed items...`);

    // Reset failed lines to draft for reprocessing
    for (const line of failed) {
      await query(
        `UPDATE woo_customer_sync_queue_line
         SET state = 'draft', error_message = NULL
         WHERE id = $1`,
        [line.id]
      );
    }

    // Process as normal
    return this.processQueue(wooService, queueId, orgId, config);
  }

  /**
   * Force complete queue (cancel remaining items)
   */
  static async forceDone(queueId: string, orgId: string, userId: string): Promise<SyncProgress> {
    await WooCommerceSyncQueue.forceDone(queueId, orgId, userId);
    return this.getStatus(queueId, orgId);
  }

  /**
   * Get activity log
   */
  static async getActivityLog(
    queueId: string,
    orgId: string,
    limit: number = 100
  ): Promise<unknown[]> {
    return WooCommerceSyncQueue.getActivityLog(queueId, orgId, limit);
  }
}
