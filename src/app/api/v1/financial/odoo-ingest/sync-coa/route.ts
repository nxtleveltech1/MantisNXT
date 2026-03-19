/**
 * POST /api/v1/financial/odoo-ingest/sync-coa
 * Push odoo_accounts (without xero_account_id) to Xero Chart of Accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '../../_helpers';
import { syncCoaToXero } from '@/lib/financial/odoo-ingest';

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const result = await syncCoaToXero({ orgId, dryRun });

    return NextResponse.json({
      success: result.errors.length === 0,
      created: result.created,
      matched: result.matched,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Sync COA to Xero error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
