/**
 * PlusPortal Sync API
 *
 * POST /api/suppliers/[id]/plusportal-sync - Trigger PlusPortal automation sync
 * GET /api/suppliers/[id]/plusportal-sync - Get sync status and logs
 * PUT /api/suppliers/[id]/plusportal-sync - Configure PlusPortal credentials
 * 
 * Updated: Scrapes data from Shopping > All Products tab instead of CSV download
 */

import { query } from '@/lib/database';
import { getPlusPortalDataProcessor } from '@/lib/services/PlusPortalDataProcessor';
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

const STALE_MINUTES = parseInt(process.env.PLUSPORTAL_STALE_MINUTES || '120', 10);

function isLogStale(syncStartedAt: Date | string | null): boolean {
  if (!syncStartedAt) return false;
  const started = syncStartedAt instanceof Date ? syncStartedAt : new Date(syncStartedAt);
  if (Number.isNaN(started.getTime())) return false;
  return Date.now() - started.getTime() > STALE_MINUTES * 60 * 1000;
}

async function markSyncLogFailed(logId: string, reason: string) {
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
      JSON.stringify([reason]),
      JSON.stringify(reason),
      logId,
    ]
  );
}

async function auditStart(supplierId: string) {
  const res = await query(
    `INSERT INTO public.ai_agent_audit (supplier_id, upload_id, action, status, details)
     VALUES ($1, $2, $3, 'started', $4::jsonb)
     RETURNING id`,
    [supplierId, null, 'PlusPortal Sync', JSON.stringify({ source: 'plusportal' })]
  );
  return res.rows[0]?.id as number | undefined;
}

async function auditFinish(auditId: number, status: 'completed' | 'failed', details: Record<string, unknown>) {
  await query(
    `UPDATE public.ai_agent_audit
     SET status = $1, details = $2::jsonb, finished_at = NOW()
     WHERE id = $3`,
    [status, JSON.stringify(details ?? {}), auditId]
  );
}

/**
 * GET /api/suppliers/[id]/plusportal-sync
 * Get sync status and recent logs
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    const service = getPlusPortalSyncService(supplierId);
    let status = await service.getStatus();

    const latestLog = status.recentLogs[0];
    if (latestLog?.status === 'in_progress' && isLogStale(latestLog.syncStartedAt)) {
      await markSyncLogFailed(
        latestLog.logId,
        `Stale sync detected (started at ${new Date(latestLog.syncStartedAt).toISOString()})`
      );
      status = await service.getStatus();
    }

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
export async function POST(_request: NextRequest, { params }: RouteParams) {
  let auditId: number | undefined;
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

    // Check if a sync is already in progress (clear stale runs first)
    let status = await service.getStatus();
    const latestLog = status.recentLogs[0];
    if (latestLog?.status === 'in_progress' && isLogStale(latestLog.syncStartedAt)) {
      await markSyncLogFailed(
        latestLog.logId,
        `Stale sync detected (started at ${new Date(latestLog.syncStartedAt).toISOString()})`
      );
      status = await service.getStatus();
    }
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

    try {
      auditId = await auditStart(supplierId);
    } catch (auditError) {
      console.error('[PlusPortal Sync API] Failed to start audit log:', auditError);
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

      if (auditId) {
        await auditFinish(auditId, 'failed', {
          stage: 'execution',
          logId,
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
        });
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

    // If data was scraped, process it
    if (syncResult.dataScraped && syncResult.scrapedProducts && syncResult.scrapedProducts.length > 0 && syncResult.logId) {
      try {
        const dataProcessor = getPlusPortalDataProcessor(supplierId);
        const processingResult = await dataProcessor.processScrapedData(syncResult.scrapedProducts, syncResult.logId);

        // Update sync result with processing results
        syncResult.productsProcessed = processingResult.productsProcessed;
        syncResult.productsCreated = processingResult.productsCreated;
        syncResult.productsUpdated = processingResult.productsUpdated;
        syncResult.productsSkipped = processingResult.productsSkipped;
        syncResult.discountRulesCreated = processingResult.discountRulesCreated;
        syncResult.discountRulesUpdated = processingResult.discountRulesUpdated;
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
               csv_downloaded = true,
               products_processed = $2,
               products_created = $3,
               products_updated = $4,
               products_skipped = $5,
               errors = $6::jsonb,
               details = jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     COALESCE(details, '{}'::jsonb),
                     '{currentStage}',
                     $7::jsonb,
                     true
                   ),
                   '{progressPercent}',
                   $8::jsonb,
                   true
                 ),
                 '{discountRules}',
                 $9::jsonb,
                 true
               )
           WHERE log_id = $10`,
          [
            syncResult.success ? 'completed' : 'failed',
            syncResult.productsProcessed || 0,
            syncResult.productsCreated || 0,
            syncResult.productsUpdated || 0,
            syncResult.productsSkipped || 0,
            JSON.stringify(syncResult.errors || []),
            JSON.stringify(syncResult.success ? 'Completed' : 'Failed'),
            syncResult.success ? 100 : 0,
            JSON.stringify({ created: syncResult.discountRulesCreated, updated: syncResult.discountRulesUpdated }),
            syncResult.logId,
          ]
        );
      } catch (error) {
        console.error('[PlusPortal Sync API] Data processing error:', error);
        syncResult.errors.push(`Data processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
              JSON.stringify(`Data processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`),
              syncResult.logId,
            ]
          );
        }
      }
    } else if (syncResult.logId && !syncResult.dataScraped) {
      // Data scraping failed - update log
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
          JSON.stringify(syncResult.errors || ['Data scraping failed']),
          JSON.stringify('Data scraping failed'),
          syncResult.logId,
        ]
      );
    }

    // Cleanup temporary files
    service.cleanup();

    if (auditId) {
      await auditFinish(auditId, syncResult.success ? 'completed' : 'failed', {
        logId: syncResult.logId,
        success: syncResult.success,
        productsProcessed: syncResult.productsProcessed,
        productsCreated: syncResult.productsCreated,
        productsUpdated: syncResult.productsUpdated,
        productsSkipped: syncResult.productsSkipped,
        discountRulesCreated: syncResult.discountRulesCreated,
        discountRulesUpdated: syncResult.discountRulesUpdated,
        errors: syncResult.errors?.slice(0, 5),
      });
    }

    return NextResponse.json({
      success: syncResult.success,
      data: {
        logId: syncResult.logId,
        dataScraped: syncResult.dataScraped,
        totalPages: syncResult.totalPages,
        productsProcessed: syncResult.productsProcessed,
        productsCreated: syncResult.productsCreated,
        productsUpdated: syncResult.productsUpdated,
        productsSkipped: syncResult.productsSkipped,
        discountRulesCreated: syncResult.discountRulesCreated,
        discountRulesUpdated: syncResult.discountRulesUpdated,
        errors: syncResult.errors,
      },
    });
  } catch (error) {
    console.error('[PlusPortal Sync API] POST error:', error);
    if (auditId) {
      await auditFinish(auditId, 'failed', {
        stage: 'unexpected',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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

    if (!username || username.trim() === '') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const service = getPlusPortalSyncService(supplierId);
    
    // Check if credentials are already configured
    const existingConfig = await service.getConfig();
    // First-time setup means no config exists OR no password is stored (null/empty)
    const hasExistingPassword = existingConfig?.password && existingConfig.password.trim() !== '';
    const isFirstTimeSetup = !existingConfig || !hasExistingPassword;
    
    console.log('[PlusPortal Sync API] Config update:', {
      supplierId,
      isFirstTimeSetup,
      hasExistingPassword,
      usernameProvided: !!username,
      passwordProvided: !!password && password !== '',
    });
    
    // Require password on first-time setup
    if (isFirstTimeSetup) {
      if (!password || password === '' || password === undefined || password.trim() === '') {
        return NextResponse.json(
          { error: 'Password is required for initial configuration' },
          { status: 400 }
        );
      }
    }

    // Update configuration - only include password if provided
    const configUpdate: {
      username: string;
      enabled: boolean;
      intervalMinutes: number;
      password?: string;
    } = {
      username: username.trim(),
      enabled: enabled ?? false,
      intervalMinutes: intervalMinutes ?? 1440,
    };
    
    // Only update password if provided (allows updating other fields without password)
    // On first-time setup, password is required and already validated above
    // On updates, if password is provided, use it; otherwise keep existing
    if (password !== undefined && password !== null && password !== '' && password.trim() !== '') {
      configUpdate.password = password.trim(); // TODO: Encrypt password before storing
    } else if (isFirstTimeSetup) {
      // This shouldn't happen due to validation above, but double-check
      return NextResponse.json(
        { error: 'Password is required for initial configuration' },
        { status: 400 }
      );
    }
    // If password not provided and not first-time setup, don't include it in update (keeps existing)

    try {
      await service.updateConfig(configUpdate);
      console.log('[PlusPortal Sync API] Config updated successfully');
    } catch (updateError) {
      console.error('[PlusPortal Sync API] Config update failed:', {
        error: updateError,
        supplierId,
        configUpdate: {
          ...configUpdate,
          password: configUpdate.password ? '***' : undefined,
        },
      });
      
      const errorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';
      const isClientError = errorMessage.includes('required') || errorMessage.includes('not found');
      
      return NextResponse.json(
        {
          success: false,
          error: isClientError ? errorMessage : 'Failed to update configuration',
          details: errorMessage,
        },
        { status: isClientError ? 400 : 500 }
      );
    }

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
