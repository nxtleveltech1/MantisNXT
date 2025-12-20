/**
 * Supplier JSON Feed Sync API
 *
 * POST /api/suppliers/[id]/sync - Trigger manual sync
 * GET /api/suppliers/[id]/sync - Get sync status and logs
 * PUT /api/suppliers/[id]/sync - Update feed configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SupplierJsonSyncService,
  getSupplierJsonSyncService,
} from '@/lib/services/SupplierJsonSyncService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/suppliers/[id]/sync
 * Get sync status and recent logs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const service = getSupplierJsonSyncService(supplierId);

    // Get current status
    const status = await service.getStatus();
    if (!status) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Get recent sync logs
    const logs = await service.getSyncLogs(10);

    return NextResponse.json({
      success: true,
      data: {
        status,
        logs,
      },
    });
  } catch (error) {
    console.error('[Sync API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Increase timeout for sync operations (up to 5 minutes for Vercel Pro)
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/suppliers/[id]/sync
 * Trigger a manual sync
 * Note: Optimized with batching to handle large product catalogs efficiently
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const service = getSupplierJsonSyncService(supplierId);

    // Check if feed is configured
    const config = await service.getFeedConfig();
    if (!config || !config.feedUrl) {
      return NextResponse.json(
        { error: 'No JSON feed URL configured for this supplier' },
        { status: 400 }
      );
    }

    // Check if a sync is already in progress
    const recentLogs = await service.getSyncLogs(1);
    const inProgress = recentLogs.length > 0 && recentLogs[0].status === 'in_progress';

    if (inProgress) {
      return NextResponse.json({
        success: false,
        error: 'A sync is already in progress. Please wait for it to complete.',
        data: {
          logId: recentLogs[0].logId,
        },
      });
    }

    // Perform sync (optimized with batching)
    console.log(`[Sync API] Starting sync for supplier ${supplierId}`);
    const result = await service.sync();

    return NextResponse.json({
      success: result.success,
      data: {
        logId: result.logId,
        productsFetched: result.productsFetched,
        productsUpdated: result.productsUpdated,
        productsCreated: result.productsCreated,
        productsFailed: result.productsFailed,
        errorMessage: result.errorMessage,
      },
    });
  } catch (error) {
    console.error('[Sync API] POST error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/suppliers/[id]/sync
 * Update feed configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { feedUrl, feedType, enabled, intervalMinutes } = body;

    const service = getSupplierJsonSyncService(supplierId);

    // Update configuration
    await service.updateFeedConfig({
      feedUrl,
      feedType,
      enabled,
      intervalMinutes,
    });

    // Get updated status
    const status = await service.getStatus();

    return NextResponse.json({
      success: true,
      message: 'Feed configuration updated',
      data: { status },
    });
  } catch (error) {
    console.error('[Sync API] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update feed configuration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

