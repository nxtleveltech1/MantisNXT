/**
 * Xero Sync Logs API
 *
 * GET /api/xero/sync-logs
 *
 * Retrieves synchronization activity logs for the organization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/database';
import { handleApiError } from '@/lib/xero/errors';

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization selected.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const logs = await query<{
      id: string;
      entity_type: string;
      action: string;
      direction: string;
      status: string;
      records_processed: number;
      records_succeeded: number;
      records_failed: number;
      created_at: Date;
      error_message: string | null;
      duration_ms: number | null;
    }>(
      `SELECT
        id, entity_type, action, direction, status,
        records_processed, records_succeeded, records_failed,
        created_at, error_message, duration_ms
       FROM xero_sync_log
       WHERE org_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    );

    // Transform to match UI expectations
    const transformedLogs = logs.rows.map(log => ({
      id: log.id,
      entityType: log.entity_type,
      action: log.action,
      direction: log.direction,
      status: log.status,
      recordsProcessed: log.records_processed || 0,
      recordsSucceeded: log.records_succeeded || 0,
      recordsFailed: log.records_failed || 0,
      createdAt: log.created_at.toISOString(),
      errorMessage: log.error_message,
    }));

    return NextResponse.json({
      success: true,
      logs: transformedLogs,
      pagination: {
        limit,
        offset,
        hasMore: logs.rows.length === limit,
      },
    });

  } catch (error) {
    return handleApiError(error, 'Xero Sync Logs');
  }
}