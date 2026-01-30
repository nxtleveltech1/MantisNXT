/**
 * PlusPortal Sync API
 *
 * POST /api/suppliers/[id]/plusportal-sync - Trigger PlusPortal automation sync
 * GET /api/suppliers/[id]/plusportal-sync - Get sync status and logs
 * PUT /api/suppliers/[id]/plusportal-sync - Configure PlusPortal credentials
 */

import { query } from '@/lib/database';
import { getPlusPortalCSVProcessor } from '@/lib/services/PlusPortalCSVProcessor';
import {
    getPlusPortalSyncService,
} from '@/lib/services/PlusPortalSyncService';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Increase timeout for sync operations (up to 5 minutes for Vercel Pro)
export const maxDuration = 300; // 5 minutes

/**
 * GET /api/suppliers/[id]/plusportal-sync
 * Get sync status and recent logs
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const service = getPlusPortalSyncService(supplierId);
    const status = await service.getStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[PlusPortal Sync API] GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[PlusPortal Sync API] Error stack:', errorStack);
    return NextResponse.json(
      {
        error: 'Failed to get sync status',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers/[id]/plusportal-sync
 * Trigger a manual PlusPortal sync
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const service = getPlusPortalSyncService(supplierId);

    // Get credentials from config
    const config = await service.getConfig();
    if (!config || !config.username || !config.password) {
      return NextResponse.json(
        { error: 'PlusPortal credentials not configured. Please configure username and password first.' },
        { status: 400 }
      );
    }

    // Check if a sync is already in progress
    const status = await service.getStatus();
    const inProgress = status.recentLogs.length > 0 && status.recentLogs[0].status === 'in_progress';

    if (inProgress) {
      return NextResponse.json({
        success: false,
        error: 'A sync is already in progress. Please wait for it to complete.',
        data: {
          logId: status.recentLogs[0].logId,
        },
      });
    }

    // Execute sync
    console.log(`[PlusPortal Sync API] Starting sync for supplier ${supplierId}`);
    let syncResult;
    try {
      syncResult = await service.executeSync({
        username: config.username,
        password: config.password,
      });
    } catch (syncError) {
      console.error('[PlusPortal Sync API] Sync execution error:', syncError);
      // Try to get the logId from status if available
      const status = await service.getStatus();
      const latestLog = status.recentLogs[0];
      const logId = latestLog?.logId;
      
      if (logId) {
        await query(
          `UPDATE core.plusportal_sync_log 
           SET status = 'failed',
               errors = $1::jsonb,
               sync_completed_at = NOW(),
               details = jsonb_set(
                 COALESCE(details, '{}'::jsonb),
                 '{currentStage}',
                 $2::jsonb,
                 true
               )
           WHERE log_id = $3`,
          [
            JSON.stringify([`Sync execution failed: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`]),
            JSON.stringify(`Failed: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`),
            logId,
          ]
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Sync execution failed',
          details: syncError instanceof Error ? syncError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // If CSV was downloaded, process it
    if (syncResult.csvDownloaded && syncResult.csvFilePath && syncResult.logId) {
      try {
        const csvProcessor = getPlusPortalCSVProcessor(supplierId);
        const processingResult = await csvProcessor.processCSV(syncResult.csvFilePath, syncResult.logId);

        // Update sync result with processing results
        syncResult.productsProcessed = processingResult.productsProcessed;
        syncResult.productsCreated = processingResult.productsCreated;
        syncResult.productsUpdated = processingResult.productsUpdated;
        syncResult.productsSkipped = processingResult.productsSkipped;
        syncResult.errors.push(...processingResult.errors);

        // Update supplier's last sync timestamp
        if (syncResult.success) {
          await query(
            `UPDATE core.supplier 
             SET plusportal_last_sync = NOW() 
             WHERE supplier_id = $1`,
            [supplierId]
          );
        }

        // Update sync log status
        await query(
          `UPDATE core.plusportal_sync_log 
           SET status = $1,
               sync_completed_at = NOW(),
               products_processed = $2,
               products_created = $3,
               products_updated = $4,
               products_skipped = $5,
               errors = $6::jsonb,
               details = jsonb_set(
                 jsonb_set(
                   COALESCE(details, '{}'::jsonb),
                   '{currentStage}',
                   $7::jsonb,
                   true
                 ),
                 '{progressPercent}',
                 $8::jsonb,
                 true
               )
           WHERE log_id = $9`,
          [
            syncResult.success ? 'completed' : 'failed',
            syncResult.productsProcessed || 0,
            syncResult.productsCreated || 0,
            syncResult.productsUpdated || 0,
            syncResult.productsSkipped || 0,
            JSON.stringify(syncResult.errors || []),
            JSON.stringify(syncResult.success ? 'Completed' : 'Failed'),
            syncResult.success ? 100 : 0,
            syncResult.logId,
          ]
        );
      } catch (error) {
        console.error('[PlusPortal Sync API] CSV processing error:', error);
        syncResult.errors.push(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        syncResult.success = false;

        if (syncResult.logId) {
          await query(
            `UPDATE core.plusportal_sync_log 
             SET status = 'failed',
                 errors = $1::jsonb,
                 sync_completed_at = NOW(),
                 details = jsonb_set(
                   jsonb_set(
                     COALESCE(details, '{}'::jsonb),
                     '{currentStage}',
                     $2::jsonb,
                     true
                   ),
                   '{progressPercent}',
                   '0',
                   true
                 )
             WHERE log_id = $3`,
            [
              JSON.stringify(syncResult.errors),
              JSON.stringify(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`),
              syncResult.logId,
            ]
          );
        }
      }
    } else if (syncResult.logId && !syncResult.csvDownloaded) {
      // CSV download failed - update log
      await query(
        `UPDATE core.plusportal_sync_log 
         SET status = 'failed',
             errors = $1::jsonb,
             sync_completed_at = NOW(),
             details = jsonb_set(
               COALESCE(details, '{}'::jsonb),
               '{currentStage}',
               $2::jsonb,
               true
             )
         WHERE log_id = $3`,
        [
          JSON.stringify(syncResult.errors || ['CSV download failed']),
          JSON.stringify('CSV download failed'),
          syncResult.logId,
        ]
      );
    }

    // Cleanup temporary files
    service.cleanup();

    return NextResponse.json({
      success: syncResult.success,
      data: {
        logId: syncResult.logId,
        csvDownloaded: syncResult.csvDownloaded,
        productsProcessed: syncResult.productsProcessed,
        productsCreated: syncResult.productsCreated,
        productsUpdated: syncResult.productsUpdated,
        productsSkipped: syncResult.productsSkipped,
        errors: syncResult.errors,
      },
    });
  } catch (error) {
    console.error('[PlusPortal Sync API] POST error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/suppliers/[id]/plusportal-sync
 * Update PlusPortal configuration
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { username, password, enabled, intervalMinutes } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const service = getPlusPortalSyncService(supplierId);
    
    // Check if credentials are already configured
    const existingConfig = await service.getConfig();
    const isFirstTimeSetup = !existingConfig || !existingConfig.password;
    
    // Require password on first-time setup
    if (isFirstTimeSetup && (!password || password === '')) {
      return NextResponse.json(
        { error: 'Password is required for initial configuration' },
        { status: 400 }
      );
    }

    // Update configuration - only include password if provided
    const configUpdate: {
      username: string;
      enabled: boolean;
      intervalMinutes: number;
      password?: string;
    } = {
      username,
      enabled,
      intervalMinutes,
    };
    
    // Only update password if provided (allows updating other fields without password)
    if (password !== undefined && password !== null && password !== '') {
      configUpdate.password = password; // TODO: Encrypt password before storing
    }

    await service.updateConfig(configUpdate);

    // Get updated status
    const status = await service.getStatus();

    return NextResponse.json({
      success: true,
      message: 'PlusPortal configuration updated',
      data: { status },
    });
  } catch (error) {
    console.error('[PlusPortal Sync API] PUT error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

