/**
 * WooCommerce Customer Sync API (Queue-Based)
 *
 * Production-grade customer synchronization using queue state machine pattern.
 * Based on Odoo data_queue_mixin_ept production implementation.
 *
 * Features:
 * - Queue-based processing with state tracking
 * - Batch processing with configurable size and delay
 * - Idempotent retry logic with exponential backoff
 * - Activity logging and audit trails
 * - Safe resumption of interrupted syncs
 *
 * Author: Claude Code
 * Date: 2025-11-05
 */

import { NextRequest, NextResponse } from 'next/server';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { CustomerSyncService } from '@/lib/services/CustomerSyncService';
import { WooCommerceSyncQueue } from '@/lib/services/WooCommerceSyncQueue';

interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

interface SyncRequest {
  config: WooCommerceConfig;
  org_id: string;
  user_id?: string;
  options?: {
    limit?: number;
    email?: string;
    wooCustomerId?: number;
    batchSize?: number;
    batchDelayMs?: number;
    maxRetries?: number;
    initialBackoffMs?: number;
  };
  action?: 'start' | 'status' | 'retry' | 'force-done';
  queue_id?: string;
}

/**
 * POST /api/v1/integrations/woocommerce/sync/customers
 * Start a new customer sync or manage existing sync
 */
export async function POST(request: NextRequest) {
  try {
    let body: SyncRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const { config, org_id, user_id = 'system', options = {}, action = 'start', queue_id } = body;

    // Validate config
    if (!config || !config.url || !config.consumerKey || !config.consumerSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'WooCommerce configuration is required (url, consumerKey, consumerSecret)',
        },
        { status: 400 }
      );
    }

    // Validate org_id
    if (!org_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'org_id is required',
        },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(org_id)) {
      console.error(`Invalid org_id format: "${org_id}"`);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid organization ID format. Must be a valid UUID.`,
        },
        { status: 400 }
      );
    }

    // Initialize WooCommerce service
    const wooService = new WooCommerceService(config);

    // Test connection
    const connected = await wooService.testConnection();
    if (!connected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to WooCommerce store',
        },
        { status: 500 }
      );
    }

    // Handle different actions
    if (action === 'status' && queue_id) {
      // Get status of existing queue
      const status = await CustomerSyncService.getStatus(queue_id);
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    if (action === 'retry' && queue_id) {
      // Retry failed items in queue
      const progress = await CustomerSyncService.retryFailed(
        wooService,
        queue_id,
        org_id,
        {
          batchSize: options.batchSize || 50,
          batchDelayMs: options.batchDelayMs || 2000,
          maxRetries: options.maxRetries || 3,
          initialBackoffMs: options.initialBackoffMs || 1000,
        }
      );

      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Retry processing completed',
      });
    }

    if (action === 'force-done' && queue_id) {
      // Force complete queue
      const progress = await CustomerSyncService.forceDone(queue_id);
      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Queue forced to completion',
      });
    }

    // Default: Start new sync
    if (action !== 'start') {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown action: ${action}. Valid actions are: start, status, retry, force-done`,
        },
        { status: 400 }
      );
    }

    // Start new sync
    console.log(`Starting customer sync for org ${org_id}`);

    const queueId = await CustomerSyncService.startSync(
      wooService,
      org_id,
      user_id,
      {
        batchSize: options.batchSize || 50,
        batchDelayMs: options.batchDelayMs || 2000,
        maxRetries: options.maxRetries || 3,
        backoffMultiplier: 2,
        initialBackoffMs: options.initialBackoffMs || 1000,
      },
      {
        email: options.email,
        wooCustomerId: options.wooCustomerId,
      }
    );

    // Process queue (non-blocking - fires off async task)
    // In production, this would be queued to a background job processor
    setImmediate(async () => {
      try {
        await CustomerSyncService.processQueue(wooService, queueId, org_id, {
          batchSize: options.batchSize || 50,
          batchDelayMs: options.batchDelayMs || 2000,
          maxRetries: options.maxRetries || 3,
        });

        console.log(`Sync completed for queue ${queueId}`);
      } catch (error: any) {
        console.error(`Error processing queue ${queueId}:`, error);
        // Mark queue for manual intervention
        await WooCommerceSyncQueue.logActivity(
          queueId,
          null,
          'sync_error',
          'failed',
          `Async processing error: ${error.message}`,
          { error: error.message }
        );
      }
    });

    // Return queue info for client
    const queueStatus = await CustomerSyncService.getStatus(queueId);

    return NextResponse.json({
      success: true,
      data: {
        queueId,
        ...queueStatus,
        message: 'Sync queue created and processing started',
      },
    });
  } catch (error: any) {
    console.error('Error in customer sync API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to sync customers',
      },
      { status: 500 }
    );
  }
}
