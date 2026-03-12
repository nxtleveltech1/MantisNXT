import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';
import {
  getSuppliersNeedingSync,
  SupplierJsonSyncService,
} from '@/lib/services/SupplierJsonSyncService';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const CRON_TYPE = 'json-feed-sync';
const MAX_SUPPLIERS_PER_RUN = parseInt(
  process.env.JSON_FEED_CRON_MAX_SUPPLIERS || '1',
  10
);

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // No secret configured → allow (Vercel cron may not send headers)
  if (request.headers.get('x-vercel-cron') === '1') return true;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === secret) return true;
  if (request.headers.get('x-cron-secret') === secret) return true;
  return false;
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (isCronAuthorized(request)) return true;
  const { userId } = await auth();
  return !!userId;
}

async function logCronStart(): Promise<string> {
  const res = await query<{ id: string }>(
    `INSERT INTO core.cron_execution_log (cron_type, status)
     VALUES ($1, 'running')
     RETURNING id`,
    [CRON_TYPE]
  );
  return res.rows[0]!.id;
}

async function logCronComplete(
  logId: string,
  status: 'success' | 'failed',
  processedCount: number,
  details: Record<string, unknown>,
  errorMessage?: string
) {
  await query(
    `UPDATE core.cron_execution_log
     SET completed_at = NOW(), status = $1, processed_count = $2, details = $3, error_message = $4
     WHERE id = $5`,
    [status, processedCount, JSON.stringify(details), errorMessage ?? null, logId]
  );
}

async function runCron(): Promise<{ success: boolean; data?: { processed: number; results?: unknown[] }; error?: string }> {
  let cronLogId: string | null = null;
  try {
    const suppliers = await getSuppliersNeedingSync();
    const toProcess = suppliers.slice(0, MAX_SUPPLIERS_PER_RUN);

    if (toProcess.length === 0) {
      cronLogId = await logCronStart();
      await logCronComplete(cronLogId, 'success', 0, { reason: 'no_suppliers_due' });
      return { success: true, data: { processed: 0, results: [] } };
    }

    cronLogId = await logCronStart();
    const results: Array<Record<string, unknown>> = [];

    for (const supplier of toProcess) {
      try {
        const service = new SupplierJsonSyncService(supplier.supplierId);
        const result = await service.sync();
        results.push({
          supplierId: supplier.supplierId,
          supplierName: supplier.name,
          success: result.success,
          logId: result.logId,
          productsFetched: result.productsFetched,
          productsUpdated: result.productsUpdated,
          productsCreated: result.productsCreated,
          productsFailed: result.productsFailed,
          errorMessage: result.errorMessage ?? undefined,
        });
      } catch (error) {
        results.push({
          supplierId: supplier.supplierId,
          supplierName: supplier.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await logCronComplete(cronLogId, 'success', results.length, { results }, undefined);
    return { success: true, data: { processed: results.length, results } };
  } catch (error) {
    if (cronLogId) {
      await logCronComplete(
        cronLogId,
        'failed',
        0,
        {},
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // GET is used by Vercel cron and "Run" in dashboard; allow without auth so it always runs
    // (CRON_SECRET is often not sent by Vercel; see github.com/vercel/vercel/issues/11303)
    const out = await runCron();
    return NextResponse.json(out);
  } catch (error) {
    console.error('[JSON Feed Cron] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const out = await runCron();
    return NextResponse.json(out);
  } catch (error) {
    console.error('[JSON Feed Cron] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
