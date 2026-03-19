/**
 * Cron: Xero reconciliation check
 * POST /api/cron/xero-reconcile
 *
 * Counts sync exceptions per org and logs to cron_execution_log.
 * Secure with CRON_SECRET or x-vercel-cron.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const CRON_TYPE = 'xero-reconcile';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  if (request.headers.get('x-vercel-cron') === '1') return true;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7) === secret) return true;
  if (request.headers.get('x-cron-secret') === secret) return true;
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let logId: string | null = null;
  try {
    const res = await query<{ id: string }>(
      `INSERT INTO core.cron_execution_log (cron_type, status)
       VALUES ($1, 'running')
       RETURNING id`,
      [CRON_TYPE]
    );
    logId = res.rows[0]?.id ?? null;
  } catch (e) {
    console.error('[Xero Reconcile Cron] logCronStart failed:', e);
  }

  try {
    const { rows } = await query<{ org_id: string; exception_count: string }>(
      `SELECT org_id, COUNT(*)::text AS exception_count
       FROM xero_entity_mappings
       WHERE sync_status = 'error' OR platform_state = 'error' OR (platform_state IS NOT NULL AND platform_state != 'synced')
       GROUP BY org_id`
    );

    const summary = Object.fromEntries(rows.map((r) => [r.org_id, parseInt(r.exception_count, 10)]));
    const total = rows.reduce((acc, r) => acc + parseInt(r.exception_count, 10), 0);

    if (logId) {
      await query(
        `UPDATE core.cron_execution_log
         SET completed_at = NOW(), status = 'success', processed_count = $1, details = $2
         WHERE id = $3`,
        [total, JSON.stringify({ byOrg: summary }), logId]
      );
    }

    return NextResponse.json({
      success: true,
      totalExceptions: total,
      byOrg: summary,
    });
  } catch (error) {
    if (logId) {
      await query(
        `UPDATE core.cron_execution_log
         SET completed_at = NOW(), status = 'failed', error_message = $1
         WHERE id = $2`,
        [error instanceof Error ? error.message : String(error), logId]
      ).catch(() => {});
    }
    console.error('[Xero Reconcile Cron]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reconcile check failed' },
      { status: 500 }
    );
  }
}
