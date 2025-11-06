/**
 * Sync Activity Log API Route
 *
 * Endpoint: /api/v1/integrations/sync/activity
 *
 * GET /api/v1/integrations/sync/activity?orgId={orgId}
 *   - Fetch activity log entries for an organization
 *   - Returns array of ActivityLogEntry objects
 *   - Falls back to localStorage if API unavailable
 *
 * Authentication: Optional (falls back to localStorage if not authenticated)
 * Rate Limit: 30 requests/min per org
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: 'sync' | 'preview' | 'orchestrate' | 'cancel';
  entityType: string;
  syncType: 'woocommerce' | 'odoo';
  status: 'completed' | 'failed' | 'partial' | 'cancelled';
  recordCount: number;
  createdCount?: number;
  updatedCount?: number;
  deletedCount?: number;
  failedCount?: number;
  duration: number;
  errorMessage?: string;
}

/**
 * GET - Fetch activity log entries
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId') || 'org-default';

    // Query activity log from database
    // Handle both UUID and VARCHAR org_id formats, and both schema versions
    // Use COALESCE and NULL handling for columns that might not exist
    const sql = `
      SELECT
        id,
        org_id,
        COALESCE(action, 'sync') as action,
        COALESCE(status, 'completed') as status,
        entity_type,
        sync_id,
        COALESCE(record_count, 0) as record_count,
        duration_seconds,
        error_message,
        created_at as timestamp,
        COALESCE(details, '{}'::jsonb) as details
      FROM sync_activity_log
      WHERE org_id::text = $1
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    let result;
    try {
      result = await query<any>(sql, [orgId]);
    } catch (dbError: any) {
      // If table doesn't exist or has schema issues, return empty array
      // This allows the frontend to fall back to localStorage
      if (dbError.message?.includes('does not exist') || 
          dbError.message?.includes('column') ||
          dbError.message?.includes('relation') ||
          dbError.code === '42P01' ||
          dbError.code === '42703') {
        console.warn('[Sync Activity] Table or column not found, returning empty array:', dbError.message);
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      throw dbError;
    }

    // Transform database rows to ActivityLogEntry format
    const entries: ActivityLogEntry[] = result.rows.map((row: any) => {
      const details = row.details || {};
      
      // Extract entity type and sync type from columns or details
      const entityType = row.entity_type || details.entityType || details.entity_type || 'unknown';
      const syncType = details.syncType || details.sync_type || 
                      (row.sync_id?.includes('woocommerce') ? 'woocommerce' : 
                       row.sync_id?.includes('odoo') ? 'odoo' : 'unknown');
      
      // Map action to expected format
      let action: ActivityLogEntry['action'] = 'sync';
      if (row.action) {
        const actionStr = String(row.action).toLowerCase();
        if (actionStr.includes('preview')) action = 'preview';
        else if (actionStr.includes('orchestrate')) action = 'orchestrate';
        else if (actionStr.includes('cancel')) action = 'cancel';
        else action = 'sync';
      }

      return {
        id: String(row.id),
        timestamp: row.timestamp,
        action,
        entityType: String(entityType),
        syncType: syncType as ActivityLogEntry['syncType'],
        status: (row.status || 'completed') as ActivityLogEntry['status'],
        recordCount: row.record_count || details.recordCount || details.record_count || 0,
        createdCount: details.createdCount || details.created_count,
        updatedCount: details.updatedCount || details.updated_count,
        deletedCount: details.deletedCount || details.deleted_count,
        failedCount: details.failedCount || details.failed_count,
        duration: row.duration_seconds ? Math.round(row.duration_seconds * 1000) : (details.duration || 0),
        errorMessage: row.error_message || details.errorMessage || details.error_message,
      };
    });

    return NextResponse.json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error('[Sync Activity] Error fetching activity log:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch activity log',
      },
      { status: 500 }
    );
  }
}

