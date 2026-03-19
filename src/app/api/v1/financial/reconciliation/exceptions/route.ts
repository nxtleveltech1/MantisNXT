/**
 * GET /api/v1/financial/reconciliation/exceptions
 * List Xero entity mappings with sync errors or state drift (platform_state != synced)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getOrgId } from '../../_helpers';

interface ExceptionRow {
  id: string;
  entity_type: string;
  nxt_entity_id: string;
  xero_entity_id: string;
  sync_status: string;
  platform_state: string | null;
  xero_state: string | null;
  error_message: string | null;
  last_synced_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgId(request);
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '100', 10), 500);

    const { rows } = await query<ExceptionRow>(
      `SELECT id, entity_type, nxt_entity_id, xero_entity_id, sync_status,
              platform_state, xero_state, error_message, last_synced_at
       FROM xero_entity_mappings
       WHERE org_id = $1
         AND (sync_status = 'error' OR platform_state = 'error' OR (platform_state IS NOT NULL AND platform_state != 'synced'))
       ORDER BY last_synced_at DESC NULLS LAST
       LIMIT $2`,
      [orgId, limit]
    );

    return NextResponse.json({
      data: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error('Reconciliation exceptions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exceptions' },
      { status: 500 }
    );
  }
}
