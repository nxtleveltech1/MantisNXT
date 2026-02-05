import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getPlusPortalDataProcessor } from '@/lib/services/PlusPortalDataProcessor';
import { getPlusPortalSyncService, type ScrapedProduct } from '@/lib/services/PlusPortalSyncService';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

const STALE_MINUTES = parseInt(process.env.PLUSPORTAL_STALE_MINUTES || '120', 10);
const MAX_SUPPLIERS_PER_RUN = parseInt(process.env.PLUSPORTAL_CRON_MAX_SUPPLIERS || '10', 10);

function isAuthorized(request: NextRequest): boolean {
  return request.headers.get('x-vercel-cron') === '1';
}

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
    [JSON.stringify([reason]), JSON.stringify(reason), logId]
  );
}

async function auditStart(supplierId: string) {
  const res = await query(
    `INSERT INTO public.ai_agent_audit (supplier_id, upload_id, action, status, details)
     VALUES ($1, $2, $3, 'started', $4::jsonb)
     RETURNING id`,
    [supplierId, null, 'PlusPortal Sync', JSON.stringify({ source: 'plusportal', trigger: 'cron' })]
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

async function finalizeSyncResult(supplierId: string, syncResult: {
  success: boolean;
  logId?: string;
  dataScraped: boolean;
  scrapedProducts?: ScrapedProduct[];
  totalPages?: number;
  productsProcessed: number;
  productsCreated: number;
  productsSkipped: number;
  productsUpdated: number;
  discountRulesCreated: number;
  discountRulesUpdated: number;
  errors: string[];
}) {
  if (syncResult.dataScraped && syncResult.scrapedProducts && syncResult.scrapedProducts.length > 0 && syncResult.logId) {
    try {
      const dataProcessor = getPlusPortalDataProcessor(supplierId);
      const processingResult = await dataProcessor.processScrapedData(syncResult.scrapedProducts, syncResult.logId);

      syncResult.productsProcessed = processingResult.productsProcessed;
      syncResult.productsCreated = processingResult.productsCreated;
      syncResult.productsUpdated = processingResult.productsUpdated;
      syncResult.productsSkipped = processingResult.productsSkipped;
      syncResult.discountRulesCreated = processingResult.discountRulesCreated;
      syncResult.discountRulesUpdated = processingResult.discountRulesUpdated;
      syncResult.errors.push(...processingResult.errors);

      if (syncResult.success) {
        await query(
          `UPDATE core.supplier 
           SET plusportal_last_sync = NOW() 
           WHERE supplier_id = $1`,
          [supplierId]
        );
      }

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
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const suppliersResult = await query<{
      supplier_id: string;
      name: string;
      plusportal_interval_minutes: number | null;
      plusportal_last_sync: Date | null;
    }>(
      `SELECT 
        supplier_id,
        name,
        plusportal_interval_minutes,
        plusportal_last_sync
       FROM core.supplier
       WHERE COALESCE(plusportal_enabled, false) = true
         AND plusportal_username IS NOT NULL
         AND plusportal_password_encrypted IS NOT NULL
         AND plusportal_password_encrypted != ''
         AND (
           plusportal_last_sync IS NULL
           OR plusportal_last_sync < NOW() - (COALESCE(plusportal_interval_minutes, 1440) || ' minutes')::INTERVAL
         )
       ORDER BY plusportal_last_sync ASC NULLS FIRST
       LIMIT $1`,
      [MAX_SUPPLIERS_PER_RUN]
    );

    if (suppliersResult.rows.length === 0) {
      return NextResponse.json({ success: true, data: { processed: 0, results: [] } });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const supplier of suppliersResult.rows) {
      const service = getPlusPortalSyncService(supplier.supplier_id);
      let status = await service.getStatus();
      const latestLog = status.recentLogs[0];

      if (latestLog?.status === 'in_progress') {
        if (isLogStale(latestLog.syncStartedAt)) {
          await markSyncLogFailed(
            latestLog.logId,
            `Stale sync detected (started at ${new Date(latestLog.syncStartedAt).toISOString()})`
          );
          status = await service.getStatus();
        } else {
          results.push({
            supplierId: supplier.supplier_id,
            supplierName: supplier.name,
            skipped: true,
            reason: 'in_progress',
            logId: latestLog.logId,
          });
          continue;
        }
      }

      const config = await service.getConfig();
      if (!config || !config.username || !config.password) {
        results.push({
          supplierId: supplier.supplier_id,
          supplierName: supplier.name,
          skipped: true,
          reason: 'credentials_missing',
        });
        continue;
      }

      let auditId: number | undefined;
      try {
        auditId = await auditStart(supplier.supplier_id);
      } catch (auditError) {
        console.error('[PlusPortal Cron] Failed to start audit log:', auditError);
      }

      let syncResult;
      try {
        syncResult = await service.executeSync({
          username: config.username,
          password: config.password,
        });

        await finalizeSyncResult(supplier.supplier_id, syncResult);

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

        results.push({
          supplierId: supplier.supplier_id,
          supplierName: supplier.name,
          success: syncResult.success,
          logId: syncResult.logId,
          productsProcessed: syncResult.productsProcessed,
          productsCreated: syncResult.productsCreated,
          productsUpdated: syncResult.productsUpdated,
          productsSkipped: syncResult.productsSkipped,
          errors: syncResult.errors?.slice(0, 3),
        });
      } catch (syncError) {
        if (auditId) {
          await auditFinish(auditId, 'failed', {
            stage: 'execution',
            error: syncError instanceof Error ? syncError.message : 'Unknown error',
          });
        }
        results.push({
          supplierId: supplier.supplier_id,
          supplierName: supplier.name,
          success: false,
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
        });
      } finally {
        service.cleanup();
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        results,
      },
    });
  } catch (error) {
    console.error('[PlusPortal Cron] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
