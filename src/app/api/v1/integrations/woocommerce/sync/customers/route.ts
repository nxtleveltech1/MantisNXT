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

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { WooCommerceService } from '@/lib/services/WooCommerceService';
import { CustomerSyncService } from '@/lib/services/CustomerSyncService';
import { WooCommerceSyncQueue } from '@/lib/services/WooCommerceSyncQueue.SECURE';
import { createErrorResponse } from '@/lib/utils/neon-error-handler';

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
    selectedIds?: number[];
  };
  action?: 'start' | 'status' | 'retry' | 'force-done' | 'start-selected' | 'start-all';
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

    const { config, org_id, user_id = org_id, options = {}, action = 'start', queue_id } = body;

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
      const status = await CustomerSyncService.getStatus(queue_id, org_id);
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    if (action === 'retry' && queue_id) {
      // Retry failed items in queue
      const progress = await CustomerSyncService.retryFailed(wooService, queue_id, org_id, {
        batchSize: options.batchSize || 50,
        batchDelayMs: options.batchDelayMs || 2000,
        maxRetries: options.maxRetries || 3,
        initialBackoffMs: options.initialBackoffMs || 1000,
      });

      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Retry processing completed',
      });
    }

    if (action === 'force-done' && queue_id) {
      // Force complete queue
      const progress = await CustomerSyncService.forceDone(queue_id, org_id, user_id);
      return NextResponse.json({
        success: true,
        data: progress,
        message: 'Queue forced to completion',
      });
    }

    if (action === 'start-all') {
      const rows = await query<any>(
        `SELECT id as connector_id, org_id, config
         FROM integration_connector
         WHERE provider = 'woocommerce' AND status::text = 'active' AND org_id = $1
         ORDER BY created_at DESC`,
        [org_id]
      );

      if (!rows.rows.length) {
        return NextResponse.json(
          { success: false, error: 'No active WooCommerce connector for org' },
          { status: 404 }
        );
      }

      const queues: any[] = [];

      for (const row of rows.rows) {
        const raw = row.config || {};
        const woo = new WooCommerceService({
          url: raw.url || raw.store_url || raw.storeUrl,
          consumerKey: raw.consumerKey || raw.consumer_key,
          consumerSecret: raw.consumerSecret || raw.consumer_secret,
          version: raw.version || 'wc/v3',
          timeout: raw.timeout || 30000,
          verifySsl: raw.verifySsl ?? raw.verify_ssl,
        });

        const ok = await wooService.testConnection();
        if (!ok) continue;

        const qid = await CustomerSyncService.startSync(
          woo,
          org_id,
          user_id,
          {
            batchSize: options.batchSize || 50,
            batchDelayMs: options.batchDelayMs || 2000,
            maxRetries: options.maxRetries || 3,
            initialBackoffMs: options.initialBackoffMs || 1000,
          },
          {
            email: options.email,
            wooCustomerId: options.wooCustomerId,
            selectedIds: options.selectedIds,
          }
        );

        setImmediate(() => {
          CustomerSyncService.processQueue(woo, qid, org_id, {
            batchSize: options.batchSize || 50,
            batchDelayMs: options.batchDelayMs || 2000,
            maxRetries: options.maxRetries || 3,
          });
        });

        const status = await CustomerSyncService.getStatus(qid, org_id);
        queues.push(status);
      }

      return NextResponse.json({ success: true, data: { queues } });
    }

    if (action === 'start-selected') {
      const sel = await query<{ config: any }>(
        `SELECT config FROM sync_selective_config WHERE org_id = $1 AND entity_type::text = 'customers' LIMIT 1`,
        [org_id]
      );
      const cfg = sel.rows[0]?.config || {};
      const selectedIds: number[] = Array.isArray(cfg?.inbound?.selectedIds)
        ? cfg.inbound.selectedIds
            .map((v: unknown) => Number(v))
            .filter((n: number) => Number.isInteger(n))
        : [];
      const useIds = selectedIds.length
        ? selectedIds
        : Array.isArray(options.selectedIds)
          ? options.selectedIds
          : [];
      if (!useIds.length) {
        return NextResponse.json({ success: false, error: 'No selected IDs' }, { status: 400 });
      }
      const wooService2 = new WooCommerceService(config);
      const connected2 = await wooService2.testConnection();
      if (!connected2)
        return NextResponse.json({ success: false, error: 'Failed to connect' }, { status: 502 });
      const qid = await CustomerSyncService.startSync(
        wooService2,
        org_id,
        user_id,
        {
          batchSize: options.batchSize || 50,
          batchDelayMs: options.batchDelayMs || 2000,
          maxRetries: options.maxRetries || 3,
          initialBackoffMs: options.initialBackoffMs || 1000,
        },
        { selectedIds: useIds }
      );
      setImmediate(async () => {
        await CustomerSyncService.processQueue(wooService2, qid, org_id, {
          batchSize: options.batchSize || 50,
          batchDelayMs: options.batchDelayMs || 2000,
          maxRetries: options.maxRetries || 3,
        });
      });
      const status = await CustomerSyncService.getStatus(qid, org_id);
      return NextResponse.json({ success: true, data: status });
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
        selectedIds: options.selectedIds,
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
      } catch (error: unknown) {
        console.error(`Error processing queue ${queueId}:`, error);
        // Mark queue for manual intervention
        await WooCommerceSyncQueue.logActivity(
          queueId,
          null,
          'sync_error',
          'failed',
          `Async processing error: ${error.message}`,
          org_id,
          user_id,
          { error: error.message }
        );
      }
    });

    // Return queue info for client
    const queueStatus = await CustomerSyncService.getStatus(queueId, org_id);

    return NextResponse.json({
      success: true,
      data: {
        ...queueStatus,
        message: 'Sync queue created and processing started',
      },
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 500);
  }
}
