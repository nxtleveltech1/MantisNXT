/**
 * Xero Sync Summary API
 * 
 * GET /api/xero/sync-summary
 * 
 * Returns summary of synced entities by type
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected' },
        { status: 400 }
      );
    }

    // Get sync summary by entity type
    const result = await query<{
      entity_type: string;
      total_synced: string;
      last_synced_at: Date | null;
    }>(
      `SELECT 
        entity_type,
        COUNT(*) as total_synced,
        MAX(last_synced_at) as last_synced_at
       FROM xero_entity_mappings
       WHERE org_id = $1 AND sync_status = 'synced'
       GROUP BY entity_type
       ORDER BY entity_type`,
      [orgId]
    );

    const summary = result.rows.map(row => ({
      entityType: row.entity_type,
      totalSynced: parseInt(row.total_synced, 10),
      lastSyncedAt: row.last_synced_at?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      summary,
    });

  } catch (error) {
    return handleApiError(error, 'Xero Sync Summary');
  }
}
