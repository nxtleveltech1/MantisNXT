/**
 * GET /api/v1/financial/odoo-ingest/accounts
 * List Odoo accounts (for sync status: xero_account_id present or not)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getOrgId } from '../../_helpers';

interface AccountRow {
  id: string;
  code: string;
  name: string;
  account_type: string;
  xero_account_id: string | null;
  xero_account_code: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '500', 10), 1000);
    const pendingOnly = request.nextUrl.searchParams.get('pending_only') === 'true';
    const summaryOnly = request.nextUrl.searchParams.get('summary_only') === 'true';

    const { rows: countRows } = await query<{ pending: string; synced: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE xero_account_id IS NULL) as pending,
         COUNT(*) FILTER (WHERE xero_account_id IS NOT NULL) as synced
       FROM odoo_accounts WHERE org_id = $1`,
      [orgId]
    );
    const pendingCount = parseInt(countRows[0]?.pending ?? '0', 10);
    const syncedCount = parseInt(countRows[0]?.synced ?? '0', 10);

    if (summaryOnly) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        summary: { pendingCount, syncedCount },
      });
    }

    let sql = `SELECT id, code, name, account_type, xero_account_id, xero_account_code
               FROM odoo_accounts
               WHERE org_id = $1`;
    const params: unknown[] = [orgId];

    if (pendingOnly) {
      sql += ` AND xero_account_id IS NULL`;
    }
    sql += ` ORDER BY code LIMIT $2`;
    params.push(limit);

    const { rows } = await query<AccountRow>(sql, params);

    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length,
      summary: { pendingCount, syncedCount },
    });
  } catch (error) {
    console.error('Odoo accounts list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
